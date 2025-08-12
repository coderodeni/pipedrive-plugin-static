import { CSS_CLASSES, UI_MESSAGES, VALIDATION_CONFIG } from '../utils/constants.js';

/**
 * Komponent walidatora licencji
 */
export class LicenseValidator {
    constructor(container, licenseService) {
        this.container = container;
        this.licenseService = licenseService;

        this.licenseInput = null;
        this.validateButton = null;
        this.statusElement = null;
        this.errorElement = null;
        this.infoElement = null;

        this.isValidating = false;
        this.isValid = false;

        // Callbacki
        this.onValidationChange = null;
    }

    /**
     * Inicjalizuje komponent walidatora licencji
     */
    async initialize() {
        this.createValidatorElement();
        this.attachEventListeners();

        // Sprawdź czy jest zapisana licencja
        await this.checkSavedLicense();
    }

    /**
     * Tworzy element HTML walidatora
     */
    createValidatorElement() {
        // Kontener główny
        const validatorContainer = document.createElement('div');
        validatorContainer.className = `${CSS_CLASSES.LICENSE_CONTAINER} mb-3`;

        // Nagłówek
        const header = document.createElement('h6');
        header.textContent = 'Licencja Plugin Pro';
        header.className = 'mb-2';

        // Grupa input + button
        const inputGroup = document.createElement('div');
        inputGroup.className = 'input-group mb-2';

        // Input licencji
        this.licenseInput = document.createElement('input');
        this.licenseInput.type = 'text';
        this.licenseInput.className = 'form-control';
        this.licenseInput.placeholder = 'Wprowadź klucz licencyjny';
        this.licenseInput.maxLength = 50;

        // Przycisk walidacji
        this.validateButton = document.createElement('button');
        this.validateButton.type = 'button';
        this.validateButton.className = 'btn btn-primary';
        this.validateButton.textContent = UI_MESSAGES.BUTTONS.VALIDATE_LICENSE;

        // Spinner dla przycisku
        const spinner = document.createElement('span');
        spinner.className = 'spinner-border spinner-border-sm';
        spinner.style.display = 'none';
        spinner.setAttribute('role', 'status');
        spinner.setAttribute('aria-hidden', 'true');
        this.validateButton.appendChild(spinner);

        // Złóż input group
        inputGroup.appendChild(this.licenseInput);
        inputGroup.appendChild(this.validateButton);

        // Element statusu
        this.statusElement = document.createElement('div');
        this.statusElement.className = 'license-status';
        this.statusElement.style.display = 'none';

        // Element błędu
        this.errorElement = document.createElement('div');
        this.errorElement.className = `alert alert-danger ${CSS_CLASSES.ERROR_MESSAGE}`;
        this.errorElement.style.display = 'none';

        // Element informacji
        this.infoElement = document.createElement('small');
        this.infoElement.className = 'form-text text-muted';
        this.infoElement.textContent = UI_MESSAGES.INFO.LICENSE_REQUIRED;

        // Złóż kontener
        validatorContainer.appendChild(header);
        validatorContainer.appendChild(inputGroup);
        validatorContainer.appendChild(this.statusElement);
        validatorContainer.appendChild(this.errorElement);
        validatorContainer.appendChild(this.infoElement);

        // Dodaj do kontenera
        this.container.appendChild(validatorContainer);
    }

    /**
     * Dodaje event listenery
     */
    attachEventListeners() {
        if (!this.validateButton || !this.licenseInput) return;

        this.validateButton.addEventListener('click', () => {
            this.handleValidateClick();
        });

        this.licenseInput.addEventListener('input', () => {
            this.handleInputChange();
        });

        this.licenseInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                this.handleValidateClick();
            }
        });
    }

    /**
     * Sprawdza zapisaną licencję
     */
    async checkSavedLicense() {
        const savedLicense = this.licenseService.getLicenseKey();

        if (savedLicense) {
            this.licenseInput.value = savedLicense;
            await this.validateLicense(savedLicense, false);
        }
    }

    /**
     * Obsługuje kliknięcie przycisku walidacji
     */
    async handleValidateClick() {
        const licenseKey = this.licenseInput.value.trim();

        if (!licenseKey) {
            this.showError('Wprowadź klucz licencyjny');
            return;
        }

        await this.validateLicense(licenseKey, true);
    }

    /**
     * Obsługuje zmianę input
     */
    handleInputChange() {
        this.hideError();
        this.hideStatus();

        const licenseKey = this.licenseInput.value.trim();

        // Podstawowa walidacja formatu
        if (licenseKey && !this.isValidLicenseFormat(licenseKey)) {
            this.licenseInput.classList.add('is-invalid');
        } else {
            this.licenseInput.classList.remove('is-invalid');
        }
    }

    /**
     * Sprawdza format klucza licencyjnego
     * @param {string} licenseKey - Klucz licencyjny
     * @returns {boolean} - true jeśli format jest prawidłowy
     */
    isValidLicenseFormat(licenseKey) {
        return licenseKey.length >= VALIDATION_CONFIG.LICENSE_KEY.MIN_LENGTH &&
            VALIDATION_CONFIG.LICENSE_KEY.PATTERN.test(licenseKey);
    }

    /**
     * Waliduje licencję
     * @param {string} licenseKey - Klucz licencyjny
     * @param {boolean} showProgress - Czy pokazywać progress
     */
    async validateLicense(licenseKey, showProgress = true) {
        if (this.isValidating) return;

        try {
            this.isValidating = true;

            if (showProgress) {
                this.setValidatingState(true);
                this.hideError();
                this.hideStatus();
            }

            // Sprawdź czy licencja jest już aktywna
            const validationResult = await this.licenseService.validateLicense(licenseKey);

            if (validationResult.success) {
                this.showValidLicense(validationResult);
            } else {
                // Spróbuj aktywować licencję
                const activationResult = await this.licenseService.activateLicense(licenseKey);

                if (activationResult.success) {
                    this.showValidLicense(activationResult);
                } else {
                    throw new Error(activationResult.message || UI_MESSAGES.ERRORS.LICENSE_INVALID);
                }
            }

        } catch (error) {
            console.error('License validation error:', error);
            this.showError(error.message);
            this.isValid = false;
            this.triggerValidationChange(false);

        } finally {
            this.isValidating = false;
            if (showProgress) {
                this.setValidatingState(false);
            }
        }
    }

    /**
     * Pokazuje informacje o ważnej licencji
     * @param {object} licenseInfo - Informacje o licencji
     */
    showValidLicense(licenseInfo) {
        this.isValid = true;
        this.licenseInput.classList.remove('is-invalid');
        this.licenseInput.classList.add('is-valid');

        // Pokaż status
        this.statusElement.className = 'alert alert-success license-status';
        this.statusElement.innerHTML = this.formatLicenseStatus(licenseInfo);
        this.statusElement.style.display = 'block';

        // Zmień przycisk
        this.validateButton.textContent = '✓ Licencja ważna';
        this.validateButton.className = 'btn btn-success';
        this.validateButton.disabled = true;

        // Ukryj info
        this.infoElement.style.display = 'none';

        this.triggerValidationChange(true);
    }

    /**
     * Formatuje status licencji
     * @param {object} licenseInfo - Informacje o licencji
     * @returns {string} - Sformatowany HTML
     */
    formatLicenseStatus(licenseInfo) {
        let html = '<strong>Licencja aktywna</strong><br>';

        if (licenseInfo.activations_used !== undefined && licenseInfo.activations_limit !== undefined) {
            html += `Aktywacje: ${licenseInfo.activations_used}/${licenseInfo.activations_limit}<br>`;
        }

        if (licenseInfo.expiry_date) {
            const expiryDate = new Date(licenseInfo.expiry_date);
            html += `Wygasa: ${expiryDate.toLocaleDateString('pl-PL')}`;
        }

        return html;
    }

    /**
     * Ustawia stan walidacji
     * @param {boolean} validating - Czy jest w trakcie walidacji
     */
    setValidatingState(validating) {
        if (!this.validateButton) return;

        const spinner = this.validateButton.querySelector('.spinner-border');

        if (validating) {
            this.validateButton.disabled = true;
            this.validateButton.textContent = 'Sprawdzanie...';
            if (spinner) {
                this.validateButton.appendChild(spinner);
                spinner.style.display = 'inline-block';
            }
        } else {
            if (!this.isValid) {
                this.validateButton.disabled = false;
                this.validateButton.textContent = UI_MESSAGES.BUTTONS.VALIDATE_LICENSE;
                this.validateButton.className = 'btn btn-primary';
            }
            if (spinner) {
                spinner.style.display = 'none';
            }
        }
    }

    /**
     * Pokazuje błąd
     * @param {string} message - Komunikat błędu
     */
    showError(message) {
        if (this.errorElement) {
            this.errorElement.textContent = message;
            this.errorElement.style.display = 'block';
        }

        if (this.licenseInput) {
            this.licenseInput.classList.add('is-invalid');
        }
    }

    /**
     * Ukrywa błąd
     */
    hideError() {
        if (this.errorElement) {
            this.errorElement.style.display = 'none';
        }
    }

    /**
     * Ukrywa status
     */
    hideStatus() {
        if (this.statusElement) {
            this.statusElement.style.display = 'none';
        }
    }

    /**
     * Sprawdza czy licencja jest ważna
     * @returns {boolean} - true jeśli licencja jest ważna
     */
    getIsValid() {
        return this.isValid;
    }

    /**
     * Pobiera klucz licencyjny
     * @returns {string|null} - Klucz licencyjny lub null
     */
    getLicenseKey() {
        return this.isValid ? this.licenseInput.value.trim() : null;
    }

    /**
     * Resetuje walidator
     */
    reset() {
        this.isValid = false;
        this.isValidating = false;

        if (this.licenseInput) {
            this.licenseInput.value = '';
            this.licenseInput.classList.remove('is-valid', 'is-invalid');
        }

        if (this.validateButton) {
            this.validateButton.textContent = UI_MESSAGES.BUTTONS.VALIDATE_LICENSE;
            this.validateButton.className = 'btn btn-primary';
            this.validateButton.disabled = false;
        }

        this.hideError();
        this.hideStatus();

        if (this.infoElement) {
            this.infoElement.style.display = 'block';
        }

        this.licenseService.clearLicense();
        this.triggerValidationChange(false);
    }

    /**
     * Wywołuje callback zmiany walidacji
     * @param {boolean} isValid - Stan walidacji
     */
    triggerValidationChange(isValid) {
        if (this.onValidationChange) {
            this.onValidationChange(isValid);
        }
    }

    /**
     * Niszczy komponent
     */
    destroy() {
        if (this.validateButton) {
            this.validateButton.removeEventListener('click', this.handleValidateClick);
        }

        if (this.licenseInput) {
            this.licenseInput.removeEventListener('input', this.handleInputChange);
            this.licenseInput.removeEventListener('keypress', this.handleValidateClick);
        }

        if (this.container && this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }
    }
}
