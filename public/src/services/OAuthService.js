import { API_CONFIG, TIMEOUTS, UI_MESSAGES } from '../utils/constants.js';

/**
 * Serwis do obsługi OAuth autoryzacji z Pipedrive
 */
export class OAuthService {
  constructor() {
    this.oauthServerUrl = 'https://pipedrive-oauth-server.devikit.pl';
    this.sessionId = null;
    this.companyDomain = null;

    this.initializeFromUrl();
  }

  /**
   * Inicjalizuje sesję z URL parametrów
   */
  initializeFromUrl() {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('nip_gus_session');

      if (sessionId) {
        this.sessionId = sessionId;
        this.saveSessionId(sessionId);

        // Usuń parametr z URL
        const newUrl = new URL(window.location);
        newUrl.searchParams.delete('nip_gus_session');
        window.history.replaceState({}, '', newUrl);
      } else {
        // Spróbuj załadować z localStorage
        this.sessionId = this.getStoredSessionId();
      }

      // Pobierz domenę firmy
      this.companyDomain = this.extractCompanyDomain();
    }
  }

  /**
   * Pobiera domenę firmy z URL
   * @returns {string|null}
   */
  extractCompanyDomain() {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const match = hostname.match(/^(.+)\.pipedrive\.com$/);
      return match ? match[1] : null;
    }
    return null;
  }

  /**
   * Zapisuje session ID w localStorage
   * @param {string} sessionId 
   */
  saveSessionId(sessionId) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('nip_gus_session_id', sessionId);
    }
  }

  /**
   * Pobiera session ID z localStorage
   * @returns {string|null}
   */
  getStoredSessionId() {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('nip_gus_session_id');
    }
    return null;
  }

  /**
   * Sprawdza czy użytkownik jest autoryzowany
   * @returns {boolean}
   */
  isAuthorized() {
    return !!this.sessionId;
  }

  /**
   * Rozpoczyna proces autoryzacji OAuth
   */
  startAuthorization() {
    if (!this.companyDomain) {
      throw new Error('Nie można określić domeny firmy');
    }

    const authUrl = `${this.oauthServerUrl}/auth/authorize?company_domain=${this.companyDomain}`;
    window.location.href = authUrl;
  }

  /**
   * Wykonuje zapytanie do Pipedrive API przez OAuth proxy
   * @param {string} method - Metoda HTTP
   * @param {string} endpoint - Endpoint API
   * @param {object} data - Dane do wysłania
   * @returns {Promise<object>}
   */
  async makeAPIRequest(method, endpoint, data = null) {
    if (!this.sessionId) {
      throw new Error(UI_MESSAGES.ERRORS.PIPEDRIVE_API_ERROR);
    }

    try {
      const response = await fetch(`${this.oauthServerUrl}/api/pipedrive/proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.sessionId}`
        },
        body: JSON.stringify({
          method: method,
          endpoint: endpoint,
          data: data
        }),
        signal: AbortSignal.timeout(TIMEOUTS.API_REQUEST)
      });

      if (response.status === 401) {
        // Sesja wygasła
        this.clearSession();
        throw new Error('Sesja wygasła. Zaloguj się ponownie.');
      }

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return result;

    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(UI_MESSAGES.ERRORS.NETWORK_ERROR);
      }
      throw error;
    }
  }

  /**
   * Wykonuje zapytanie do GUS API przez OAuth proxy
   * @param {string} nip - Numer NIP
   * @param {string} licenseKey - Klucz licencyjny
   * @returns {Promise<object>}
   */
  async makeGUSRequest(nip, licenseKey) {
    if (!this.sessionId) {
      throw new Error(UI_MESSAGES.ERRORS.PIPEDRIVE_API_ERROR);
    }

    try {
      const response = await fetch(`${this.oauthServerUrl}/api/gus/company-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.sessionId}`
        },
        body: JSON.stringify({
          nip: nip,
          license_key: licenseKey
        }),
        signal: AbortSignal.timeout(TIMEOUTS.GUS_REQUEST)
      });

      if (response.status === 401) {
        this.clearSession();
        throw new Error('Sesja wygasła. Zaloguj się ponownie.');
      }

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Nie znaleziono firmy o podanym numerze NIP');
        } else if (response.status === 429) {
          throw new Error(UI_MESSAGES.ERRORS.RATE_LIMIT_EXCEEDED);
        }
        throw new Error(`GUS API Error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return result;

    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(UI_MESSAGES.ERRORS.NETWORK_ERROR);
      }
      throw error;
    }
  }

  /**
   * Pobiera informacje o sesji
   * @returns {Promise<object>}
   */
  async getSessionInfo() {
    if (!this.sessionId) {
      return null;
    }

    try {
      const response = await fetch(`${this.oauthServerUrl}/api/session/info`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.sessionId}`
        }
      });

      if (response.status === 401) {
        this.clearSession();
        return null;
      }

      if (response.ok) {
        return await response.json();
      }

      return null;

    } catch (error) {
      console.warn('Nie można pobrać informacji o sesji:', error);
      return null;
    }
  }

  /**
   * Wylogowuje użytkownika
   */
  async logout() {
    if (!this.sessionId) {
      return;
    }

    try {
      await fetch(`${this.oauthServerUrl}/api/session/logout`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.sessionId}`
        }
      });
    } catch (error) {
      console.warn('Błąd podczas wylogowywania:', error);
    } finally {
      this.clearSession();
    }
  }

  /**
   * Czyści lokalną sesję
   */
  clearSession() {
    this.sessionId = null;

    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('nip_gus_session_id');
    }
  }

  /**
   * Sprawdza czy sesja jest ważna
   * @returns {Promise<boolean>}
   */
  async validateSession() {
    if (!this.sessionId) {
      return false;
    }

    const sessionInfo = await this.getSessionInfo();
    return !!sessionInfo;
  }

  /**
   * Pobiera ID organizacji z kontekstu
   * @returns {number|null}
   */
  getCurrentOrganizationId() {
    if (typeof window !== 'undefined') {
      // Pipedrive SDK
      if (window.Pipedrive && window.Pipedrive.getContext) {
        const context = window.Pipedrive.getContext();
        return context?.organization?.id || null;
      }

      // Fallback - URL parsing
      const matches = window.location.pathname.match(/\/organization\/(\d+)/);
      if (matches) {
        return parseInt(matches[1], 10);
      }
    }

    return null;
  }
}
