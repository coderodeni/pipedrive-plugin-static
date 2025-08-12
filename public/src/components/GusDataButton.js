import { CSS_CLASSES, UI_MESSAGES, TIMEOUTS } from '../utils/constants.js';

/**
 * Komponent przycisku pobierania danych z GUS
 */
export class GusDataButton {
    constructor(container, gusService, pipedriveService) {
        this.container = container;
        this.gusService = gusService;
        this.pipedriveService = pipedriveService;

        this.button = null;
        this.spinner = null;
        this.messageElement = null;

        this.isLoading = false;
        this.lastNipValue = null;

        // Callbacki
        this.onDataFetched = null;
        this.onError = null;
    }

    /**
     * Inicjalizuje komponent przycisku
     */
    initialize() {
        this.createButtonElement();
        this.attachEventListeners();
    }

    /**
     * Tworzy element HTML przycisku
     */
    createButtonElement() {
        // Kontener główny
        const buttonContainer = document.createElement('div');
        buttonContainer.className = `${CSS_CLASSES.CONTAINER} gus-button-container`;

        // Przycisk
        this.button = document.createElement('button');
        this.button.type = 'button';
        this.button.className = `btn btn-outline-primary ${CSS_CLASSES.BUTTON}`;
        this.button.disabled = true; // Domyślnie wyłączony

        // Ikona i spinner
        const iconSpan = document.createElement('span');
        iconSpan.innerHTML = this.getButtonIcon();

        this.spinner = document.createElement('span');
        this.spinner.className = `${CSS_CLASSES.LOADING_SPINNER} spinner-border spinner-border-sm`;
        this.spinner.style.display = 'none';
        this.spinner.setAttribute('role', 'status');
        this.spinner.setAttribute('aria-hidden', 'true');

        // Tekst przycisku
        const textSpan = document.createElement('span');
        textSpan.className = 'button-text';
        textSpan.textContent = UI_MESSAGES.BUTTONS.FETCH_GUS_DATA;

        // Złóż przycisk
        this.button.appendChild(iconSpan);
        this.button.appendChild(this.spinner);
        this.button.appendChild(textSpan);

        // Element komunikatu
        this.messageElement = document.createElement('div');
        this.messageElement.className = 'gus-message mt-2';
        this.messageElement.style.display = 'none';

        // Złóż kontener
        buttonContainer.appendChild(this.button);
        buttonContainer.appendChild(this.messageElement);

        // Dodaj do kontenera
        this.container.appendChild(buttonContainer);
    }

    /**
     * Pobiera ikonę SVG dla przycisku
     * @returns {string} - HTML ikony
     */
    getButtonIcon() {
        return `
      <svg class="button-icon" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
        <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708l3-3z"/>
      </svg>
    `;
    }

    /**
     * Dodaje event listenery
     */
    attachEventListeners() {
        if (!this.button) return;

        this.button.addEventListener('click', () => {
            this.handleButtonClick();
        });
    }

    /**
     * Obsługuje kliknięcie przycisku
     */
    async handleButtonClick() {
        if (this.isLoading || !this.lastNipValue) {
            return;
        }

        try {
            this.setLoadingState(true);
            this.hideMessage();

            // Pobierz dane z GUS
            const gusData = await this.gusService.getCompanyData(this.lastNipValue);

            // Pobierz ID organizacji
            const organizationId = this.pipedriveService.getCurrentOrganizationId();

            if (!organizationId) {
                throw new Error('Nie można określić ID organizacji');
            }

            // Aktualizuj organizację danymi z GUS
            await this.pipedriveService.updateOrganizationWithGusData(organizationId, gusData);

            // Pokaż sukces
            this.showSuccessMessage(UI_MESSAGES.SUCCESS.DATA_FETCHED);
            this.setButtonState('success');

            // Wywołaj callback sukcesu
            if (this.onDataFetched) {
                this.onDataFetched(gusData);
            }

            // Reset przycisku po 3 sekundach
            setTimeout(() => {
                this.setButtonState('default');
            }, 3000);

        } catch (error) {
            console.error('Error fetching GUS data:', error);

            this.showErrorMessage(error.message);
            this.setButtonState('error');

            // Wywołaj callback błędu
            if (this.onError) {
                this.onError(error);
            }

            // Reset przycisku po 5 sekundach
            setTimeout(() => {
                this.setButtonState('default');
            }, 5000);

        } finally {
            this.setLoadingState(false);
        }
    }

    /**
     * Ustawia stan ładowania
     * @param {boolean} loading - Czy jest w stanie ładowania
     */
    setLoadingState(loading) {
        this.isLoading = loading;

        if (!this.button || !this.spinner) return;

        const textSpan = this.button.querySelector('.button-text');
        const iconSpan = this.button.querySelector('.button-icon');

        if (loading) {
            this.button.disabled = true;
            this.spinner.style.display = 'inline-block';
            if (iconSpan) iconSpan.style.display = 'none';
            if (textSpan) textSpan.textContent = UI_MESSAGES.BUTTONS.LOADING;
            this.button.classList.add(CSS_CLASSES.BUTTON_LOADING);
        } else {
            this.button.disabled = !this.lastNipValue;
            this.spinner.style.display = 'none';
            if (iconSpan) iconSpan.style.display = 'inline-block';
            if (textSpan) textSpan.textContent = UI_MESSAGES.BUTTONS.FETCH_GUS_DATA;
            this.button.classList.remove(CSS_CLASSES.BUTTON_LOADING);
        }
    }

    /**
     * Ustawia stan wizualny przycisku
     * @param {string} state - Stan: 'default', 'success', 'error'
     */
    setButtonState(state) {
        if (!this.button) return;

        // Usuń wszystkie klasy stanów
        this.button.classList.remove(
            CSS_CLASSES.BUTTON_SUCCESS,
            CSS_CLASSES.BUTTON_ERROR,
            'btn-outline-primary',
            'btn-success',
            'btn-danger'
        );

        const textSpan = this.button.querySelector('.button-text');

        switch (state) {
            case 'success':
                this.button.classList.add(CSS_CLASSES.BUTTON_SUCCESS, 'btn-success');
                if (textSpan) textSpan.textContent = 'Pobrano dane!';
                break;

            case 'error':
                this.button.classList.add(CSS_CLASSES.BUTTON_ERROR, 'btn-danger');
                if (textSpan) textSpan.textContent = UI_MESSAGES.BUTTONS.RETRY;
                break;

            default:
                this.button.classList.add('btn-outline-primary');
                if (textSpan) textSpan.textContent = UI_MESSAGES.BUTTONS.FETCH_GUS_DATA;
                break;
        }
    }

    /**
     * Pokazuje komunikat sukcesu
     * @param {string} message - Komunikat
     */
    showSuccessMessage(message) {
        if (!this.messageElement) return;

        this.messageElement.className = `gus-message mt-2 alert alert-success ${CSS_CLASSES.SUCCESS_MESSAGE}`;
        this.messageElement.textContent = message;
        this.messageElement.style.display = 'block';
    }

    /**
     * Pokazuje komunikat błędu
     * @param {string} message - Komunikat błędu
     */
    showErrorMessage(message) {
        if (!this.messageElement) return;

        this.messageElement.className = `gus-message mt-2 alert alert-danger ${CSS_CLASSES.ERROR_MESSAGE}`;
        this.messageElement.textContent = message;
        this.messageElement.style.display = 'block';
    }

    /**
     * Ukrywa komunikat
     */
    hideMessage() {
        if (this.messageElement) {
            this.messageElement.style.display = 'none';
        }
    }

    /**
     * Aktualizuje stan przycisku na podstawie walidacji NIP
     * @param {boolean} isValid - Czy NIP jest prawidłowy
     * @param {string} nipValue - Wartość NIP
     */
    updateForNipValidation(isValid, nipValue) {
        this.lastNipValue = isValid ? nipValue : null;

        if (!this.isLoading) {
            this.button.disabled = !isValid;
        }

        // Ukryj komunikaty jeśli NIP się zmienił
        if (this.lastNipValue !== nipValue) {
            this.hideMessage();
            this.setButtonState('default');
        }
    }

    /**
     * Włącza przycisk
     */
    enable() {
        if (this.button && this.lastNipValue && !this.isLoading) {
            this.button.disabled = false;
        }
    }

    /**
     * Wyłącza przycisk
     */
    disable() {
        if (this.button) {
            this.button.disabled = true;
        }
    }

    /**
     * Pokazuje informację o limitach API
     */
    showApiLimitsInfo() {
        const stats = this.gusService.getUsageStats();

        if (stats.requestsInLastMinute >= stats.maxRequestsPerMinute - 2) {
            this.showErrorMessage(`Limit zapytań: ${stats.requestsInLastMinute}/${stats.maxRequestsPerMinute} na minutę`);
        }
    }

    /**
     * Niszczy komponent
     */
    destroy() {
        if (this.button) {
            this.button.removeEventListener('click', this.handleButtonClick);
        }

        if (this.container && this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }
    }
}
