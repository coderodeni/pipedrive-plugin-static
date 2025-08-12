/**
 * Główna aplikacja pluginu NIP Field z GUS
 * Integracja z Pipedrive
 */

import './styles/plugin.css';

// Importy serwisów
import { LicenseService } from './services/LicenseService.js';
import { OAuthService } from './services/OAuthService.js';
import { PipedriveService } from './services/PipedriveService.js';
import { GusService } from './services/GusService.js';

// Importy komponentów
import { NipField } from './components/NipField.js';
import { GusDataButton } from './components/GusDataButton.js';
import { LicenseValidator } from './components/LicenseValidator.js';

// Importy utils
import { CSS_CLASSES, UI_MESSAGES } from './utils/constants.js';

/**
 * Klasa głównej aplikacji pluginu
 */
class NipGusPlugin {
    constructor() {
        this.isInitialized = false;
        this.isLicenseValid = false;

            // Serwisy
    this.licenseService = null;
    this.oauthService = null;
    this.pipedriveService = null;
    this.gusService = null;

        // Komponenty
        this.licenseValidator = null;
        this.nipField = null;
        this.gusButton = null;

        // DOM elementy
        this.container = null;
        this.pluginContainer = null;

        // Stan aplikacji
        this.currentOrganizationId = null;
        this.nipFieldId = null;
    }

    /**
     * Inicjalizuje plugin
     */
    async initialize() {
        if (this.isInitialized) {
            console.warn('Plugin już został zainicjalizowany');
            return;
        }

        try {
            console.log('Inicjalizacja pluginu NIP Field z GUS...');

            // Sprawdź czy jesteśmy w kontekście organizacji
            if (!this.isOrganizationContext()) {
                console.log('Plugin nie jest w kontekście organizacji');
                return;
            }

            // Znajdź kontener do wstrzyknięcia pluginu
            this.findPluginContainer();

            if (!this.container) {
                console.error('Nie znaleziono kontenera dla pluginu');
                return;
            }

            // Inicjalizuj serwisy
            this.initializeServices();

            // Utwórz kontener pluginu
            this.createPluginContainer();

            // Inicjalizuj komponenty
            await this.initializeComponents();

            // Ustaw event listenery
            this.setupEventListeners();

                  // Sprawdź autoryzację OAuth
      await this.checkAuthorizationStatus();
      
      // Sprawdź stan licencji
      await this.checkInitialLicenseStatus();

            this.isInitialized = true;
            console.log('Plugin został pomyślnie zainicjalizowany');

        } catch (error) {
            console.error('Błąd podczas inicjalizacji pluginu:', error);
            this.showError('Błąd podczas inicjalizacji pluginu NIP Field z GUS');
        }
    }

    /**
     * Sprawdza czy jesteśmy w kontekście organizacji
     * @returns {boolean}
     */
    isOrganizationContext() {
        // Sprawdź URL
        if (window.location.pathname.includes('/organization/')) {
            return true;
        }

        // Sprawdź Pipedrive context API
        if (window.Pipedrive && window.Pipedrive.getContext) {
            const context = window.Pipedrive.getContext();
            return context && context.organization;
        }

        return false;
    }

    /**
     * Znajduje kontener do wstrzyknięcia pluginu
     */
    findPluginContainer() {
        // Strategia 1: Znajdź sekcję z polami organizacji
        let container = document.querySelector('.organization-fields, .custom-fields, .details-section');

        // Strategia 2: Znajdź formularz organizacji
        if (!container) {
            container = document.querySelector('form[data-organization], .organization-form, .organization-details');
        }

        // Strategia 3: Znajdź główny kontener zawartości
        if (!container) {
            container = document.querySelector('.main-content, .content-area, .organization-view');
        }

        // Strategia 4: Fallback do body
        if (!container) {
            container = document.body;
        }

        this.container = container;
    }

      /**
   * Inicjalizuje serwisy
   */
  initializeServices() {
    this.licenseService = new LicenseService();
    this.oauthService = new OAuthService();
    this.pipedriveService = new PipedriveService(this.oauthService);
    this.gusService = new GusService(this.licenseService, this.oauthService);
  }

    /**
     * Tworzy główny kontener pluginu
     */
    createPluginContainer() {
        this.pluginContainer = document.createElement('div');
        this.pluginContainer.className = `${CSS_CLASSES.CONTAINER} nip-gus-plugin`;
        this.pluginContainer.id = 'nip-gus-plugin-container';

        // Nagłówek pluginu
        const header = document.createElement('div');
        header.className = 'plugin-header mb-3';
        header.innerHTML = `
      <h5 class="mb-2">
        <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16" style="margin-right: 8px;">
          <path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.917 3.917 0 0 0-1.417.923A3.927 3.927 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.916 3.916 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.926 3.926 0 0 0-.923-1.417A3.911 3.911 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0h.003zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599.28.28.453.546.598.92.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.47 2.47 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.478 2.478 0 0 1-.92-.598 2.48 2.48 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233 0-2.136.008-2.388.046-3.231.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92.28-.28.546-.453.92-.598.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045v.002zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92zm-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217zm0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334z"/>
        </svg>
        NIP Field z GUS
      </h5>
      <p class="text-muted mb-0" style="font-size: 0.875rem;">
        Automatyczne pobieranie danych firmy z rejestru GUS
      </p>
    `;

        this.pluginContainer.appendChild(header);
        this.container.appendChild(this.pluginContainer);
    }

    /**
     * Inicjalizuje komponenty UI
     */
    async initializeComponents() {
        // Kontener dla walidatora licencji
        const licenseContainer = document.createElement('div');
        licenseContainer.className = 'license-section';
        this.pluginContainer.appendChild(licenseContainer);

        // Inicjalizuj walidator licencji
        this.licenseValidator = new LicenseValidator(licenseContainer, this.licenseService);
        await this.licenseValidator.initialize();

        // Kontener dla głównej funkcjonalności (ukryty początkowo)
        const mainContainer = document.createElement('div');
        mainContainer.className = 'main-functionality';
        mainContainer.style.display = 'none';
        this.pluginContainer.appendChild(mainContainer);

        // Kontener dla pola NIP
        const nipContainer = document.createElement('div');
        nipContainer.className = 'nip-section';
        mainContainer.appendChild(nipContainer);

        // Inicjalizuj pole NIP
        this.nipField = new NipField(nipContainer, this.pipedriveService);
        await this.nipField.initialize();

        // Kontener dla przycisku GUS
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'gus-section';
        mainContainer.appendChild(buttonContainer);

        // Inicjalizuj przycisk GUS
        this.gusButton = new GusDataButton(buttonContainer, this.gusService, this.pipedriveService);
        this.gusButton.initialize();

        // Zapisz referencje do kontenerów
        this.licenseContainer = licenseContainer;
        this.mainContainer = mainContainer;
    }

    /**
     * Ustawia event listenery
     */
    setupEventListeners() {
        // Event listener dla walidacji licencji
        if (this.licenseValidator) {
            this.licenseValidator.onValidationChange = (isValid) => {
                this.handleLicenseValidationChange(isValid);
            };
        }

        // Event listener dla walidacji NIP
        if (this.nipField) {
            this.nipField.onValidationChange = (isValid, nipValue) => {
                this.handleNipValidationChange(isValid, nipValue);
            };

            this.nipField.onValueChange = (value) => {
                this.handleNipValueChange(value);
            };
        }

        // Event listener dla przycisku GUS
        if (this.gusButton) {
            this.gusButton.onDataFetched = (gusData) => {
                this.handleGusDataFetched(gusData);
            };

            this.gusButton.onError = (error) => {
                this.handleGusError(error);
            };
        }

        // Event listener dla zmian w Pipedrive
        this.setupPipedriveEventListeners();
    }

    /**
     * Ustawia event listenery dla Pipedrive
     */
    setupPipedriveEventListeners() {
        // Słuchaj zmian organizacji
        if (window.Pipedrive && window.Pipedrive.on) {
            window.Pipedrive.on('organization.change', (data) => {
                this.handleOrganizationChange(data);
            });
        }

        // Słuchaj zmian URL
        let lastUrl = location.href;
        new MutationObserver(() => {
            const url = location.href;
            if (url !== lastUrl) {
                lastUrl = url;
                this.handleUrlChange();
            }
        }).observe(document, { subtree: true, childList: true });
    }

      /**
   * Sprawdza status autoryzacji OAuth
   */
  async checkAuthorizationStatus() {
    try {
      if (!this.oauthService.isAuthorized()) {
        this.showAuthorizationRequired();
        return;
      }

      // Waliduj sesję
      const isValid = await this.oauthService.validateSession();
      if (!isValid) {
        this.showAuthorizationRequired();
        return;
      }

      this.hideAuthorizationRequired();
    } catch (error) {
      console.warn('Nie można sprawdzić statusu autoryzacji:', error);
      this.showAuthorizationRequired();
    }
  }

  /**
   * Sprawdza początkowy stan licencji
   */
  async checkInitialLicenseStatus() {
    try {
      const hasValidLicense = await this.licenseService.hasValidLicense();
      this.handleLicenseValidationChange(hasValidLicense);
    } catch (error) {
      console.warn('Nie można sprawdzić stanu licencji:', error);
      this.handleLicenseValidationChange(false);
    }
  }

    /**
     * Obsługuje zmianę walidacji licencji
     * @param {boolean} isValid - Czy licencja jest ważna
     */
    handleLicenseValidationChange(isValid) {
        this.isLicenseValid = isValid;

        if (isValid) {
            // Pokaż główną funkcjonalność
            if (this.mainContainer) {
                this.mainContainer.style.display = 'block';
            }

            // Ukryj sekcję licencji
            if (this.licenseContainer) {
                this.licenseContainer.style.display = 'none';
            }

            console.log('Licencja jest ważna - główna funkcjonalność jest dostępna');
        } else {
            // Ukryj główną funkcjonalność
            if (this.mainContainer) {
                this.mainContainer.style.display = 'none';
            }

            // Pokaż sekcję licencji
            if (this.licenseContainer) {
                this.licenseContainer.style.display = 'block';
            }

            console.log('Licencja jest nieważna - funkcjonalność jest zablokowana');
        }
    }

    /**
     * Obsługuje zmianę walidacji NIP
     * @param {boolean} isValid - Czy NIP jest prawidłowy
     * @param {string} nipValue - Wartość NIP
     */
    handleNipValidationChange(isValid, nipValue) {
        if (this.gusButton) {
            this.gusButton.updateForNipValidation(isValid, nipValue);
        }
    }

    /**
     * Obsługuje zmianę wartości NIP
     * @param {string} value - Nowa wartość NIP
     */
    handleNipValueChange(value) {
        // Można dodać dodatkową logikę jeśli potrzeba
        console.log('NIP value changed:', value);
    }

    /**
     * Obsługuje pomyślne pobranie danych z GUS
     * @param {object} gusData - Dane z GUS
     */
    handleGusDataFetched(gusData) {
        console.log('Dane z GUS zostały pobrane:', gusData);

        // Można dodać dodatkową logikę po pobraniu danych
        // np. odświeżenie widoku organizacji
        this.refreshOrganizationView();
    }

    /**
     * Obsługuje błąd podczas pobierania danych z GUS
     * @param {Error} error - Błąd
     */
    handleGusError(error) {
        console.error('Błąd podczas pobierania danych z GUS:', error);

        // Sprawdź czy błąd jest związany z licencją
        if (error.message.includes('licencj')) {
            this.handleLicenseValidationChange(false);
        }
    }

    /**
     * Obsługuje zmianę organizacji w Pipedrive
     * @param {object} data - Dane zmiany
     */
    handleOrganizationChange(data) {
        console.log('Organization changed:', data);

        if (data && data.id !== this.currentOrganizationId) {
            this.currentOrganizationId = data.id;
            this.refreshPluginForNewOrganization();
        }
    }

    /**
     * Obsługuje zmianę URL
     */
    handleUrlChange() {
        // Sprawdź czy wciąż jesteśmy w kontekście organizacji
        if (!this.isOrganizationContext()) {
            this.hidePlugin();
        } else {
            this.showPlugin();
            this.refreshPluginForNewOrganization();
        }
    }

    /**
     * Odświeża plugin dla nowej organizacji
     */
    async refreshPluginForNewOrganization() {
        if (!this.isLicenseValid) return;

        try {
            // Pobierz nowe ID organizacji
            const newOrganizationId = this.pipedriveService.getCurrentOrganizationId();

            if (newOrganizationId && newOrganizationId !== this.currentOrganizationId) {
                this.currentOrganizationId = newOrganizationId;

                // Załaduj aktualną wartość NIP dla nowej organizacji
                if (this.nipField) {
                    await this.nipField.loadCurrentValue();
                }
            }
        } catch (error) {
            console.warn('Błąd podczas odświeżania pluginu dla nowej organizacji:', error);
        }
    }

    /**
     * Odświeża widok organizacji w Pipedrive
     */
    refreshOrganizationView() {
        // Spróbuj odświeżyć widok przez Pipedrive API
        if (window.Pipedrive && window.Pipedrive.refresh) {
            window.Pipedrive.refresh();
        } else {
            // Fallback - przeładuj stronę po 2 sekundach
            setTimeout(() => {
                if (confirm('Dane zostały zaktualizowane. Czy chcesz odświeżyć stronę aby zobaczyć zmiany?')) {
                    window.location.reload();
                }
            }, 2000);
        }
    }

    /**
     * Ukrywa plugin
     */
    hidePlugin() {
        if (this.pluginContainer) {
            this.pluginContainer.style.display = 'none';
        }
    }

    /**
     * Pokazuje plugin
     */
    showPlugin() {
        if (this.pluginContainer) {
            this.pluginContainer.style.display = 'block';
        }
    }

      /**
   * Pokazuje wymaganie autoryzacji
   */
  showAuthorizationRequired() {
    if (this.pluginContainer) {
      // Ukryj wszystkie inne sekcje
      if (this.licenseContainer) this.licenseContainer.style.display = 'none';
      if (this.mainContainer) this.mainContainer.style.display = 'none';
      
      // Utwórz lub pokaż sekcję autoryzacji
      let authContainer = this.pluginContainer.querySelector('.auth-required-section');
      if (!authContainer) {
        authContainer = document.createElement('div');
        authContainer.className = 'auth-required-section alert alert-warning';
        authContainer.innerHTML = `
          <h5>🔐 Autoryzacja wymagana</h5>
          <p>Plugin wymaga autoryzacji z Pipedrive aby uzyskać dostęp do danych organizacji.</p>
          <button class="btn btn-primary" onclick="window.NipGusPlugin.startAuthorization()">
            Autoryzuj z Pipedrive
          </button>
        `;
        this.pluginContainer.appendChild(authContainer);
      } else {
        authContainer.style.display = 'block';
      }
    }
  }

  /**
   * Ukrywa wymaganie autoryzacji
   */
  hideAuthorizationRequired() {
    if (this.pluginContainer) {
      const authContainer = this.pluginContainer.querySelector('.auth-required-section');
      if (authContainer) {
        authContainer.style.display = 'none';
      }
    }
  }

  /**
   * Rozpoczyna proces autoryzacji
   */
  startAuthorization() {
    if (this.oauthService) {
      this.oauthService.startAuthorization();
    }
  }

  /**
   * Pokazuje błąd użytkownikowi
   * @param {string} message - Komunikat błędu
   */
  showError(message) {
    console.error(message);
    
    // Można dodać toast notification lub inny sposób pokazania błędu
    if (this.pluginContainer) {
      const errorElement = document.createElement('div');
      errorElement.className = 'alert alert-danger';
      errorElement.textContent = message;
      this.pluginContainer.insertBefore(errorElement, this.pluginContainer.firstChild);
      
      // Usuń błąd po 5 sekundach
      setTimeout(() => {
        if (errorElement.parentNode) {
          errorElement.parentNode.removeChild(errorElement);
        }
      }, 5000);
    }
  }

    /**
     * Niszczy plugin i czyści zasoby
     */
    destroy() {
        // Zniszcz komponenty
        if (this.licenseValidator) {
            this.licenseValidator.destroy();
        }

        if (this.nipField) {
            this.nipField.destroy();
        }

        if (this.gusButton) {
            this.gusButton.destroy();
        }

        // Usuń kontener z DOM
        if (this.pluginContainer && this.pluginContainer.parentNode) {
            this.pluginContainer.parentNode.removeChild(this.pluginContainer);
        }

        this.isInitialized = false;
        console.log('Plugin został zniszczony');
    }
}

// Globalny obiekt pluginu
window.NipGusPlugin = null;

/**
 * Inicjalizuje plugin po załadowaniu DOM
 */
function initializePlugin() {
    if (window.NipGusPlugin && window.NipGusPlugin.isInitialized) {
        console.log('Plugin już został zainicjalizowany');
        return;
    }

    window.NipGusPlugin = new NipGusPlugin();
    window.NipGusPlugin.initialize();
}

// Inicjalizacja pluginu
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePlugin);
} else {
    // DOM już załadowany
    setTimeout(initializePlugin, 100);
}

// Eksportuj dla testów i innych modułów
export { NipGusPlugin };
