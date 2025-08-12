import CryptoJS from 'crypto-js';
import { API_CONFIG, STORAGE_KEYS, TIMEOUTS, UI_MESSAGES } from '../utils/constants.js';

/**
 * Serwis do obsługi licencjonowania z DeviKit License Proxy
 */
export class LicenseService {
    constructor() {
        this.baseUrl = API_CONFIG.LICENSE.PROXY_URL;
        this.authHash = API_CONFIG.LICENSE.AUTH_HASH;
        this.productUuid = API_CONFIG.LICENSE.PRODUCT_UUID;
        this.pluginId = API_CONFIG.LICENSE.PLUGIN_ID;
        this.userAgent = API_CONFIG.LICENSE.USER_AGENT;

        // Cache dla walidacji licencji
        this.validationCache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minut
    }

    /**
     * Generuje podpis HMAC dla autoryzacji
     * @param {string} domain - Domena do podpisu
     * @param {string} authHash - Hash autoryzacyjny
     * @returns {string} - Wygenerowany podpis HMAC
     */
    generateHMAC(domain, authHash) {
        const message = domain + authHash;
        return CryptoJS.HmacSHA256(message, authHash).toString(CryptoJS.enc.Hex);
    }

    /**
     * Pobiera domenę z aktualnego URL
     * @returns {string} - Domena
     */
    getCurrentDomain() {
        if (typeof window !== 'undefined') {
            return window.location.hostname;
        }
        // Fallback dla środowiska testowego
        return 'localhost';
    }

    /**
     * Zapisuje klucz licencyjny w localStorage
     * @param {string} licenseKey - Klucz licencyjny
     */
    saveLicenseKey(licenseKey) {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(STORAGE_KEYS.LICENSE_KEY, licenseKey);
        }
    }

    /**
     * Pobiera klucz licencyjny z localStorage
     * @returns {string|null} - Klucz licencyjny lub null
     */
    getLicenseKey() {
        if (typeof localStorage !== 'undefined') {
            return localStorage.getItem(STORAGE_KEYS.LICENSE_KEY);
        }
        return null;
    }

    /**
     * Sprawdza czy licencja jest w cache i czy jest aktualna
     * @param {string} licenseKey - Klucz licencyjny
     * @param {string} domain - Domena
     * @returns {object|null} - Wynik z cache lub null
     */
    getCachedValidation(licenseKey, domain) {
        const cacheKey = `${licenseKey}_${domain}`;
        const cached = this.validationCache.get(cacheKey);

        if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
            return cached.result;
        }

        return null;
    }

    /**
     * Zapisuje wynik walidacji w cache
     * @param {string} licenseKey - Klucz licencyjny
     * @param {string} domain - Domena
     * @param {object} result - Wynik walidacji
     */
    setCachedValidation(licenseKey, domain, result) {
        const cacheKey = `${licenseKey}_${domain}`;
        this.validationCache.set(cacheKey, {
            result: result,
            timestamp: Date.now()
        });
    }

    /**
     * Waliduje licencję z DeviKit License Proxy
     * @param {string} licenseKey - Klucz licencyjny
     * @param {string} domain - Domena (opcjonalna)
     * @returns {Promise<object>} - Wynik walidacji
     */
    async validateLicense(licenseKey, domain = null) {
        if (!licenseKey) {
            throw new Error(UI_MESSAGES.ERRORS.LICENSE_INVALID);
        }

        const targetDomain = domain || this.getCurrentDomain();

        // Sprawdź cache
        const cached = this.getCachedValidation(licenseKey, targetDomain);
        if (cached) {
            return cached;
        }

        try {
            // Generuj podpis autoryzacyjny
            const authSignature = this.generateHMAC(targetDomain, this.authHash);

            const requestBody = {
                action: 'validate',
                license_key: licenseKey,
                product_id: this.productUuid,
                plugin_id: this.pluginId,
                domain: targetDomain,
                auth_signature: authSignature
            };

            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': this.userAgent
                },
                body: JSON.stringify(requestBody),
                signal: AbortSignal.timeout(TIMEOUTS.LICENSE_VALIDATION)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            // Sprawdź odpowiedź z serwera
            if (!result.success) {
                let errorMessage = UI_MESSAGES.ERRORS.LICENSE_INVALID;

                if (result.message) {
                    if (result.message.includes('expired')) {
                        errorMessage = UI_MESSAGES.ERRORS.LICENSE_EXPIRED;
                    } else if (result.message.includes('limit') || result.message.includes('activation')) {
                        errorMessage = UI_MESSAGES.ERRORS.LICENSE_LIMIT_EXCEEDED;
                    }
                }

                throw new Error(errorMessage);
            }

            // Zapisz w cache
            this.setCachedValidation(licenseKey, targetDomain, result);

            // Zapisz klucz licencyjny jeśli walidacja przeszła
            this.saveLicenseKey(licenseKey);

            return result;

        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error(UI_MESSAGES.ERRORS.NETWORK_ERROR);
            }

            // Przekaż błąd dalej jeśli to jest znany błąd
            if (error.message.includes(UI_MESSAGES.ERRORS.LICENSE_INVALID) ||
                error.message.includes(UI_MESSAGES.ERRORS.LICENSE_EXPIRED) ||
                error.message.includes(UI_MESSAGES.ERRORS.LICENSE_LIMIT_EXCEEDED)) {
                throw error;
            }

            // Inne błędy sieciowe
            throw new Error(UI_MESSAGES.ERRORS.NETWORK_ERROR);
        }
    }

    /**
     * Aktywuje licencję dla danej domeny
     * @param {string} licenseKey - Klucz licencyjny
     * @param {string} domain - Domena (opcjonalna)
     * @returns {Promise<object>} - Wynik aktywacji
     */
    async activateLicense(licenseKey, domain = null) {
        if (!licenseKey) {
            throw new Error(UI_MESSAGES.ERRORS.LICENSE_INVALID);
        }

        const targetDomain = domain || this.getCurrentDomain();

        try {
            const authSignature = this.generateHMAC(targetDomain, this.authHash);

            const requestBody = {
                action: 'activate',
                license_key: licenseKey,
                product_id: this.productUuid,
                plugin_id: this.pluginId,
                domain: targetDomain,
                auth_signature: authSignature
            };

            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': this.userAgent
                },
                body: JSON.stringify(requestBody),
                signal: AbortSignal.timeout(TIMEOUTS.LICENSE_VALIDATION)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            if (!result.success) {
                let errorMessage = UI_MESSAGES.ERRORS.LICENSE_INVALID;

                if (result.message && result.message.includes('limit')) {
                    errorMessage = UI_MESSAGES.ERRORS.LICENSE_LIMIT_EXCEEDED;
                }

                throw new Error(errorMessage);
            }

            // Wyczyść cache po aktywacji
            this.validationCache.clear();

            // Zapisz klucz licencyjny
            this.saveLicenseKey(licenseKey);

            return result;

        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error(UI_MESSAGES.ERRORS.NETWORK_ERROR);
            }

            if (error.message.includes(UI_MESSAGES.ERRORS.LICENSE_LIMIT_EXCEEDED)) {
                throw error;
            }

            throw new Error(UI_MESSAGES.ERRORS.NETWORK_ERROR);
        }
    }

    /**
     * Sprawdza czy plugin ma ważną licencję
     * @returns {Promise<boolean>} - true jeśli licencja jest ważna
     */
    async hasValidLicense() {
        const licenseKey = this.getLicenseKey();

        if (!licenseKey) {
            return false;
        }

        try {
            const result = await this.validateLicense(licenseKey);
            return result.success === true;
        } catch (error) {
            console.warn('License validation failed:', error.message);
            return false;
        }
    }

    /**
     * Wyczyść cache i zapisaną licencję
     */
    clearLicense() {
        this.validationCache.clear();
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(STORAGE_KEYS.LICENSE_KEY);
            localStorage.removeItem(STORAGE_KEYS.LAST_VALIDATION);
        }
    }

    /**
     * Pobiera informacje o licencji
     * @returns {Promise<object>} - Informacje o licencji
     */
    async getLicenseInfo() {
        const licenseKey = this.getLicenseKey();

        if (!licenseKey) {
            return null;
        }

        try {
            const result = await this.validateLicense(licenseKey);
            return {
                isValid: result.success,
                activationsUsed: result.activations_used || 0,
                activationsLimit: result.activations_limit || 0,
                expiryDate: result.expiry_date || null,
                domain: this.getCurrentDomain()
            };
        } catch (error) {
            return {
                isValid: false,
                error: error.message
            };
        }
    }
}
