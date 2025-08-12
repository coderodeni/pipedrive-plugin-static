/**
 * Stałe konfiguracyjne dla pluginu NIP Field z GUS
 */

// Konfiguracja API
export const API_CONFIG = {
    PIPEDRIVE: {
        BASE_URL: 'https://api.pipedrive.com/v1',
        ENDPOINTS: {
            ORGANIZATION_FIELDS: '/organizationFields',
            ORGANIZATIONS: '/organizations'
        }
    },
    GUS: {
        BASE_URL: 'https://regonapi.devikit.pl',
        ENDPOINTS: {
            COMPANY_DATA: '/api/gus/company-data'
        }
    },
    LICENSE: {
        PROXY_URL: 'https://proxy.devikit.pl/wp-json/devikit-license/v1/license',
        AUTH_HASH: 'pipedrive-nip-gus-2025-auth-hash',
        PRODUCT_UUID: 'pipedrive-plugin-uuid',
        PLUGIN_ID: 'pipedrive-nip-gus',
        USER_AGENT: 'NIP-Field-Pipedrive-Pro/1.0.0'
    }
};

// Nazwy pól w Pipedrive
export const FIELD_NAMES = {
    NIP: 'NIP',
    REGON: 'REGON',
    COMPANY_NAME: 'name',
    ADDRESS: 'address',
    POSTAL_CODE: 'postal_code',
    CITY: 'city'
};

// Limity API
export const RATE_LIMITS = {
    PIPEDRIVE_REQUESTS_PER_SECOND: 10,
    GUS_REQUESTS_PER_MINUTE: 10,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000 // ms
};

// Komunikaty UI
export const UI_MESSAGES = {
    BUTTONS: {
        FETCH_GUS_DATA: 'Pobierz dane z GUS',
        LOADING: 'Pobieranie...',
        VALIDATE_LICENSE: 'Sprawdź licencję',
        RETRY: 'Spróbuj ponownie'
    },
    ERRORS: {
        INVALID_NIP: 'Nieprawidłowy numer NIP. Sprawdź format i sumę kontrolną.',
        EMPTY_NIP: 'Wprowadź numer NIP przed pobraniem danych.',
        LICENSE_INVALID: 'Nieprawidłowa licencja. Skontaktuj się z dostawcą.',
        LICENSE_EXPIRED: 'Licencja wygasła. Odnów licencję aby kontynuować.',
        LICENSE_LIMIT_EXCEEDED: 'Przekroczono limit aktywacji dla tej licencji. Dokup dodatkowe aktywacje.',
        GUS_API_ERROR: 'Błąd podczas pobierania danych z GUS. Spróbuj ponownie.',
        NETWORK_ERROR: 'Błąd połączenia z serwerem. Sprawdź połączenie internetowe.',
        RATE_LIMIT_EXCEEDED: 'Przekroczono limit zapytań. Spróbuj za chwilę.',
        PIPEDRIVE_API_ERROR: 'Błąd API Pipedrive. Sprawdź uprawnienia.',
        FIELD_CREATION_ERROR: 'Nie udało się utworzyć pola NIP.',
        DATA_UPDATE_ERROR: 'Nie udało się zaktualizować danych organizacji.',
        UNKNOWN_ERROR: 'Wystąpił nieznany błąd. Spróbuj ponownie.'
    },
    SUCCESS: {
        DATA_FETCHED: 'Dane zostały pomyślnie pobrane z GUS i zapisane.',
        LICENSE_VALID: 'Licencja jest ważna i aktywna.',
        FIELD_CREATED: 'Pole NIP zostało utworzone w Pipedrive.',
        DATA_UPDATED: 'Dane organizacji zostały zaktualizowane.'
    },
    INFO: {
        NIP_FORMAT: 'Format: XXX-XXX-XX-XX lub XXXXXXXXXX',
        LICENSE_REQUIRED: 'Ten plugin wymaga ważnej licencji Pro.',
        FETCHING_DATA: 'Pobieranie danych z rejestru GUS...',
        VALIDATING_LICENSE: 'Sprawdzanie licencji...'
    }
};

// Konfiguracja walidacji
export const VALIDATION_CONFIG = {
    NIP: {
        MIN_LENGTH: 10,
        MAX_LENGTH: 10,
        PATTERN: /^\d{10}$/,
        FORMATTED_PATTERN: /^\d{3}-\d{3}-\d{2}-\d{2}$/
    },
    LICENSE_KEY: {
        MIN_LENGTH: 16,
        PATTERN: /^[A-Za-z0-9\-]+$/
    }
};

// Konfiguracja CSS
export const CSS_CLASSES = {
    CONTAINER: 'nip-gus-container',
    FIELD: 'nip-gus-field',
    BUTTON: 'nip-gus-button',
    BUTTON_LOADING: 'nip-gus-button--loading',
    BUTTON_SUCCESS: 'nip-gus-button--success',
    BUTTON_ERROR: 'nip-gus-button--error',
    ERROR_MESSAGE: 'nip-gus-error',
    SUCCESS_MESSAGE: 'nip-gus-success',
    LICENSE_CONTAINER: 'nip-gus-license',
    LOADING_SPINNER: 'nip-gus-spinner'
};

// Timeouty
export const TIMEOUTS = {
    API_REQUEST: 10000, // 10 sekund
    LICENSE_VALIDATION: 5000, // 5 sekund
    GUS_REQUEST: 15000, // 15 sekund
    DEBOUNCE_DELAY: 500 // 500ms dla walidacji w czasie rzeczywistym
};

// Storage keys
export const STORAGE_KEYS = {
    LICENSE_KEY: 'nipGusLicenseKey',
    LAST_VALIDATION: 'nipGusLastValidation',
    API_TOKEN: 'pipedriveApiToken',
    DOMAIN: 'pipedriveDomain',
    NIP_FIELD_ID: 'nipFieldId'
};
