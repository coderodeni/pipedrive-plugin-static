import { API_CONFIG, RATE_LIMITS, TIMEOUTS, UI_MESSAGES } from '../utils/constants.js';
import { validateNIP, cleanNIP } from '../utils/nipValidator.js';

/**
 * Serwis do obsługi integracji z GUS API Backend przez OAuth
 */
export class GusService {
  constructor(licenseService, oauthService) {
    this.licenseService = licenseService;
    this.oauthService = oauthService;
    this.userAgent = API_CONFIG.LICENSE.USER_AGENT;

        // Rate limiting dla GUS API
        this.requestTimes = [];
        this.maxRequestsPerMinute = RATE_LIMITS.GUS_REQUESTS_PER_MINUTE;

        // Cache dla danych GUS (krótki cache aby uniknąć duplikowania zapytań)
        this.dataCache = new Map();
        this.cacheTimeout = 2 * 60 * 1000; // 2 minuty
    }

    /**
     * Sprawdza rate limiting dla GUS API
     * @returns {boolean} - true jeśli można wykonać zapytanie
     */
    checkRateLimit() {
        const now = Date.now();
        const oneMinuteAgo = now - 60 * 1000;

        // Usuń stare zapytania
        this.requestTimes = this.requestTimes.filter(time => time > oneMinuteAgo);

        return this.requestTimes.length < this.maxRequestsPerMinute;
    }

    /**
     * Rejestruje wykonanie zapytania
     */
    recordRequest() {
        this.requestTimes.push(Date.now());
    }

    /**
     * Pobiera dane z cache jeśli dostępne
     * @param {string} nip - Numer NIP
     * @returns {object|null} - Dane z cache lub null
     */
    getCachedData(nip) {
        const cached = this.dataCache.get(nip);

        if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
            return cached.data;
        }

        return null;
    }

    /**
     * Zapisuje dane w cache
     * @param {string} nip - Numer NIP
     * @param {object} data - Dane do zapisania
     */
    setCachedData(nip, data) {
        this.dataCache.set(nip, {
            data: data,
            timestamp: Date.now()
        });
    }

    /**
     * Pobiera domenę dla nagłówka X-Domain
     * @returns {string} - Domena
     */
    getCurrentDomain() {
        if (typeof window !== 'undefined') {
            return window.location.hostname;
        }
        return 'localhost';
    }

    /**
     * Pobiera dane firmy z GUS API Backend
     * @param {string} nip - Numer NIP
     * @returns {Promise<object>} - Dane firmy z GUS
     */
    async getCompanyData(nip) {
        // Walidacja NIP
        if (!nip) {
            throw new Error(UI_MESSAGES.ERRORS.EMPTY_NIP);
        }

        const cleanedNip = cleanNIP(nip);

        if (!validateNIP(cleanedNip)) {
            throw new Error(UI_MESSAGES.ERRORS.INVALID_NIP);
        }

        // Sprawdź cache
        const cached = this.getCachedData(cleanedNip);
        if (cached) {
            return cached;
        }

        // Sprawdź rate limiting
        if (!this.checkRateLimit()) {
            throw new Error(UI_MESSAGES.ERRORS.RATE_LIMIT_EXCEEDED);
        }

        // Pobierz klucz licencyjny
        const licenseKey = this.licenseService.getLicenseKey();
        if (!licenseKey) {
            throw new Error(UI_MESSAGES.ERRORS.LICENSE_INVALID);
        }

            try {
      this.recordRequest();

      const result = await this.oauthService.makeGUSRequest(cleanedNip, licenseKey);

            if (!result.success) {
                throw new Error(result.message || UI_MESSAGES.ERRORS.GUS_API_ERROR);
            }

            const companyData = result.data;

            // Waliduj otrzymane dane
            if (!companyData || !companyData.nip) {
                throw new Error('Otrzymano nieprawidłowe dane z GUS API');
            }

            // Zapisz w cache
            this.setCachedData(cleanedNip, companyData);

            return companyData;

        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error(UI_MESSAGES.ERRORS.NETWORK_ERROR);
            }

            // Przekaż znane błędy dalej
            if (error.message.includes('licencj') ||
                error.message.includes('NIP') ||
                error.message.includes('limit') ||
                error.message.includes('znaleziono')) {
                throw error;
            }

            // Loguj nieznane błędy
            console.error('GUS API error:', error);
            throw new Error(UI_MESSAGES.ERRORS.GUS_API_ERROR);
        }
    }

    /**
     * Formatuje dane firmy do wyświetlenia
     * @param {object} companyData - Dane firmy z GUS
     * @returns {object} - Sformatowane dane
     */
    formatCompanyData(companyData) {
        return {
            nip: companyData.nip,
            regon: companyData.regon,
            nazwa: companyData.nazwa || companyData.nazwaSkrocona,
            nazwaSkrocona: companyData.nazwaSkrocona,
            adres: {
                ulica: companyData.adresUlica,
                numer: companyData.adresNumerNieruchomosci,
                lokal: companyData.adresNumerLokalu,
                kodPocztowy: companyData.adresKodPocztowy,
                miejscowosc: companyData.adresMiejscowosc,
                poczta: companyData.adresPoczta,
                gmina: companyData.adresGmina,
                powiat: companyData.adresPowiat,
                wojewodztwo: companyData.adresWojewodztwo
            },
            status: companyData.statusNip,
            dataRejestracjiDzialalnosci: companyData.dataRejestracjiDzialalnosci,
            dataZakonczeniaDzialalnosci: companyData.dataZakonczeniaDzialalnosci,
            rodzajRejestracji: companyData.rodzajRejestracji,
            formaFinansowania: companyData.formaFinansowania,
            formaWlasnosci: companyData.formaWlasnosci,
            formaFinansowania: companyData.formaFinansowania,
            dzialalnosci: companyData.dzialalnosci || []
        };
    }

    /**
     * Sprawdza status NIP w rejestrze VAT
     * @param {string} nip - Numer NIP
     * @returns {Promise<object>} - Status NIP
     */
    async checkNipStatus(nip) {
        try {
            const companyData = await this.getCompanyData(nip);

            return {
                isActive: companyData.statusNip === 'Czynny',
                status: companyData.statusNip,
                registrationDate: companyData.dataRejestracjiDzialalnosci,
                endDate: companyData.dataZakonczeniaDzialalnosci
            };

        } catch (error) {
            console.error('Error checking NIP status:', error);
            throw error;
        }
    }

    /**
     * Pobiera listę działalności firmy
     * @param {string} nip - Numer NIP
     * @returns {Promise<Array>} - Lista działalności
     */
    async getCompanyActivities(nip) {
        try {
            const companyData = await this.getCompanyData(nip);
            return companyData.dzialalnosci || [];

        } catch (error) {
            console.error('Error fetching company activities:', error);
            throw error;
        }
    }

    /**
     * Wyczyść cache danych
     */
    clearCache() {
        this.dataCache.clear();
    }

    /**
     * Pobiera statystyki użycia API
     * @returns {object} - Statystyki
     */
    getUsageStats() {
        const now = Date.now();
        const oneMinuteAgo = now - 60 * 1000;
        const recentRequests = this.requestTimes.filter(time => time > oneMinuteAgo);

        return {
            requestsInLastMinute: recentRequests.length,
            maxRequestsPerMinute: this.maxRequestsPerMinute,
            canMakeRequest: this.checkRateLimit(),
            cacheSize: this.dataCache.size
        };
    }
}
