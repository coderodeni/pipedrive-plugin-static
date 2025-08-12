import { API_CONFIG, FIELD_NAMES, RATE_LIMITS, TIMEOUTS, UI_MESSAGES, STORAGE_KEYS } from '../utils/constants.js';

/**
 * Serwis do obsługi integracji z Pipedrive API przez OAuth
 */
export class PipedriveService {
  constructor(oauthService) {
    this.oauthService = oauthService;
    this.rateLimitDelay = 1000 / RATE_LIMITS.PIPEDRIVE_REQUESTS_PER_SECOND;
    this.lastRequestTime = 0;
    
    // Cache dla pól organizacji
    this.fieldsCache = null;
    this.fieldsCacheTime = 0;
    this.fieldsCacheTimeout = 5 * 60 * 1000; // 5 minut
  }

      /**
   * Sprawdza czy użytkownik jest autoryzowany
   * @returns {boolean}
   */
  isAuthorized() {
    return this.oauthService.isAuthorized();
  }

  /**
   * Rozpoczyna autoryzację OAuth
   */
  startAuthorization() {
    this.oauthService.startAuthorization();
  }

    /**
     * Sprawdza rate limiting i czeka jeśli potrzeba
     */
    async enforceRateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;

        if (timeSinceLastRequest < this.rateLimitDelay) {
            const delay = this.rateLimitDelay - timeSinceLastRequest;
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        this.lastRequestTime = Date.now();
    }

      /**
   * Wykonuje zapytanie do Pipedrive API przez OAuth proxy
   * @param {string} endpoint - Endpoint API
   * @param {object} options - Opcje zapytania
   * @returns {Promise<object>} - Odpowiedź z API
   */
  async makeRequest(endpoint, options = {}) {
    if (!this.oauthService.isAuthorized()) {
      throw new Error('Użytkownik nie jest autoryzowany. Zaloguj się ponownie.');
    }

    await this.enforceRateLimit();

    const method = options.method || 'GET';
    const data = options.body ? JSON.parse(options.body) : null;

    try {
      return await this.oauthService.makeAPIRequest(method, endpoint, data);
    } catch (error) {
      if (error.message.includes('Sesja wygasła')) {
        throw new Error('Sesja wygasła. Odśwież stronę aby się zalogować ponownie.');
      }
      throw error;
    }
  }

    /**
     * Pobiera wszystkie pola organizacji z cache lub API
     * @param {boolean} forceRefresh - Wymuś odświeżenie cache
     * @returns {Promise<Array>} - Lista pól organizacji
     */
    async getOrganizationFields(forceRefresh = false) {
        const now = Date.now();

        // Sprawdź cache
        if (!forceRefresh &&
            this.fieldsCache &&
            (now - this.fieldsCacheTime) < this.fieldsCacheTimeout) {
            return this.fieldsCache;
        }

        try {
            const response = await this.makeRequest(API_CONFIG.PIPEDRIVE.ENDPOINTS.ORGANIZATION_FIELDS);

            this.fieldsCache = response.data || [];
            this.fieldsCacheTime = now;

            return this.fieldsCache;

        } catch (error) {
            console.error('Error fetching organization fields:', error);
            throw new Error(UI_MESSAGES.ERRORS.PIPEDRIVE_API_ERROR);
        }
    }

    /**
     * Znajduje pole organizacji po nazwie
     * @param {string} fieldName - Nazwa pola
     * @returns {Promise<object|null>} - Pole organizacji lub null
     */
    async findFieldByName(fieldName) {
        const fields = await this.getOrganizationFields();
        return fields.find(field => field.name === fieldName || field.key === fieldName) || null;
    }

    /**
     * Sprawdza czy pole NIP już istnieje
     * @returns {Promise<object|null>} - Pole NIP lub null jeśli nie istnieje
     */
    async checkNipFieldExists() {
        try {
            const nipField = await this.findFieldByName(FIELD_NAMES.NIP);

            if (nipField) {
                // Zapisz ID pola w localStorage
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem(STORAGE_KEYS.NIP_FIELD_ID, nipField.id.toString());
                }
            }

            return nipField;

        } catch (error) {
            console.error('Error checking NIP field:', error);
            return null;
        }
    }

    /**
     * Tworzy nowe pole NIP w organizacji
     * @returns {Promise<object>} - Utworzone pole
     */
    async createNipField() {
        try {
            const fieldData = {
                name: FIELD_NAMES.NIP,
                field_type: 'varchar',
                add_visible_flag: true,
                options: []
            };

            const response = await this.makeRequest(
                API_CONFIG.PIPEDRIVE.ENDPOINTS.ORGANIZATION_FIELDS,
                {
                    method: 'POST',
                    body: JSON.stringify(fieldData)
                }
            );

            const createdField = response.data;

            // Zapisz ID pola w localStorage
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(STORAGE_KEYS.NIP_FIELD_ID, createdField.id.toString());
            }

            // Wyczyść cache pól
            this.fieldsCache = null;

            return createdField;

        } catch (error) {
            console.error('Error creating NIP field:', error);
            throw new Error(UI_MESSAGES.ERRORS.FIELD_CREATION_ERROR);
        }
    }

    /**
     * Zapewnia istnienie pola NIP (sprawdza czy istnieje, jeśli nie - tworzy)
     * @returns {Promise<object>} - Pole NIP
     */
    async ensureNipFieldExists() {
        let nipField = await this.checkNipFieldExists();

        if (!nipField) {
            nipField = await this.createNipField();
        }

        return nipField;
    }

    /**
     * Pobiera dane organizacji
     * @param {number} organizationId - ID organizacji
     * @returns {Promise<object>} - Dane organizacji
     */
    async getOrganization(organizationId) {
        try {
            const response = await this.makeRequest(`${API_CONFIG.PIPEDRIVE.ENDPOINTS.ORGANIZATIONS}/${organizationId}`);
            return response.data;

        } catch (error) {
            console.error('Error fetching organization:', error);
            throw new Error(UI_MESSAGES.ERRORS.PIPEDRIVE_API_ERROR);
        }
    }

    /**
     * Aktualizuje dane organizacji
     * @param {number} organizationId - ID organizacji
     * @param {object} updateData - Dane do aktualizacji
     * @returns {Promise<object>} - Zaktualizowane dane organizacji
     */
    async updateOrganization(organizationId, updateData) {
        try {
            const response = await this.makeRequest(
                `${API_CONFIG.PIPEDRIVE.ENDPOINTS.ORGANIZATIONS}/${organizationId}`,
                {
                    method: 'PUT',
                    body: JSON.stringify(updateData)
                }
            );

            return response.data;

        } catch (error) {
            console.error('Error updating organization:', error);
            throw new Error(UI_MESSAGES.ERRORS.DATA_UPDATE_ERROR);
        }
    }

    /**
     * Aktualizuje organizację danymi z GUS
     * @param {number} organizationId - ID organizacji
     * @param {object} gusData - Dane z GUS API
     * @returns {Promise<object>} - Zaktualizowane dane organizacji
     */
    async updateOrganizationWithGusData(organizationId, gusData) {
        try {
            // Przygotuj dane do aktualizacji
            const updateData = {
                name: gusData.nazwa || gusData.nazwaSkrocona,
                address: this.formatAddress(gusData),
                custom_fields: {}
            };

            // Sprawdź czy pole NIP istnieje i dodaj do custom fields
            const nipField = await this.checkNipFieldExists();
            if (nipField) {
                updateData.custom_fields[nipField.key] = gusData.nip;
            }

            // Dodaj REGON jeśli dostępny
            if (gusData.regon) {
                const regonField = await this.findFieldByName(FIELD_NAMES.REGON);
                if (regonField) {
                    updateData.custom_fields[regonField.key] = gusData.regon;
                }
            }

            return await this.updateOrganization(organizationId, updateData);

        } catch (error) {
            console.error('Error updating organization with GUS data:', error);
            throw new Error(UI_MESSAGES.ERRORS.DATA_UPDATE_ERROR);
        }
    }

    /**
     * Formatuje adres z danych GUS
     * @param {object} gusData - Dane z GUS
     * @returns {string} - Sformatowany adres
     */
    formatAddress(gusData) {
        const parts = [];

        if (gusData.adresUlica) {
            parts.push(gusData.adresUlica);
        }

        if (gusData.adresNumerNieruchomosci) {
            parts.push(gusData.adresNumerNieruchomosci);
        }

        if (gusData.adresNumerLokalu) {
            parts[parts.length - 1] += `/${gusData.adresNumerLokalu}`;
        }

        const streetAddress = parts.join(' ');
        const cityParts = [];

        if (gusData.adresKodPocztowy) {
            cityParts.push(gusData.adresKodPocztowy);
        }

        if (gusData.adresMiejscowosc) {
            cityParts.push(gusData.adresMiejscowosc);
        }

        const cityAddress = cityParts.join(' ');

        return [streetAddress, cityAddress].filter(Boolean).join(', ');
    }

      /**
   * Pobiera aktualny ID organizacji z kontekstu Pipedrive
   * @returns {number|null} - ID organizacji lub null
   */
  getCurrentOrganizationId() {
    return this.oauthService.getCurrentOrganizationId();
  }
}
