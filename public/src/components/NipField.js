import { validateNIP, formatNIP, cleanNIP, isPotentialNIP } from '../utils/nipValidator.js';
import { CSS_CLASSES, TIMEOUTS, UI_MESSAGES } from '../utils/constants.js';

/**
 * Komponent pola NIP z walidacją w czasie rzeczywistym
 */
export class NipField {
    constructor(container, pipedriveService) {
        this.container = container;
        this.pipedriveService = pipedriveService;

        this.field = null;
        this.errorElement = null;
        this.validationTimeout = null;
        this.nipFieldId = null;

        this.isValid = false;
        this.currentValue = '';

        // Callbacki
        this.onValidationChange = null;
        this.onValueChange = null;
    }

    /**
     * Inicjalizuje komponent pola NIP
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            // Sprawdź czy pole NIP istnieje w Pipedrive
            await this.ensureNipField();

            // Utwórz element pola
            this.createFieldElement();

            // Pobierz aktualną wartość z Pipedrive jeśli dostępna
            await this.loadCurrentValue();

            // Dodaj event listenery
            this.attachEventListeners();

        } catch (error) {
            console.error('Error initializing NIP field:', error);
            this.showError('Błąd podczas inicjalizacji pola NIP');
        }
    }

    /**
     * Zapewnia istnienie pola NIP w Pipedrive
     * @returns {Promise<void>}
     */
    async ensureNipField() {
        try {
            const nipField = await this.pipedriveService.ensureNipFieldExists();
            this.nipFieldId = nipField.id;

        } catch (error) {
            console.error('Error ensuring NIP field exists:', error);
            throw new Error(UI_MESSAGES.ERRORS.FIELD_CREATION_ERROR);
        }
    }

    /**
     * Tworzy element HTML pola NIP
     */
    createFieldElement() {
        // Kontener główny
        const fieldContainer = document.createElement('div');
        fieldContainer.className = `${CSS_CLASSES.CONTAINER} ${CSS_CLASSES.FIELD}`;

        // Label
        const label = document.createElement('label');
        label.textContent = 'NIP';
        label.setAttribute('for', 'nip-field');

        // Input field
        this.field = document.createElement('input');
        this.field.type = 'text';
        this.field.id = 'nip-field';
        this.field.name = 'nip';
        this.field.placeholder = 'XXX-XXX-XX-XX';
        this.field.maxLength = 12; // Dla formatu XXX-XXX-XX-XX
        this.field.className = 'form-control';

        // Informacja o formacie
        const formatInfo = document.createElement('small');
        formatInfo.className = 'form-text text-muted';
        formatInfo.textContent = UI_MESSAGES.INFO.NIP_FORMAT;

        // Element błędu
        this.errorElement = document.createElement('div');
        this.errorElement.className = `${CSS_CLASSES.ERROR_MESSAGE} invalid-feedback`;
        this.errorElement.style.display = 'none';

        // Złóż elementy
        fieldContainer.appendChild(label);
        fieldContainer.appendChild(this.field);
        fieldContainer.appendChild(formatInfo);
        fieldContainer.appendChild(this.errorElement);

        // Dodaj do kontenera
        this.container.appendChild(fieldContainer);
    }

    /**
     * Pobiera aktualną wartość NIP z Pipedrive
     * @returns {Promise<void>}
     */
    async loadCurrentValue() {
        try {
            const organizationId = this.pipedriveService.getCurrentOrganizationId();

            if (!organizationId) {
                return;
            }

            const organization = await this.pipedriveService.getOrganization(organizationId);

            if (organization && organization.custom_fields && this.nipFieldId) {
                const nipValue = organization.custom_fields[this.nipFieldId];

                if (nipValue) {
                    this.setValue(nipValue);
                }
            }

        } catch (error) {
            console.warn('Could not load current NIP value:', error);
            // Nie pokazuj błędu użytkownikowi - to nie jest krytyczne
        }
    }

    /**
     * Dodaje event listenery do pola
     */
    attachEventListeners() {
        if (!this.field) return;

        // Input event dla walidacji w czasie rzeczywistym
        this.field.addEventListener('input', (event) => {
            this.handleInput(event.target.value);
        });

        // Blur event dla finalnej walidacji
        this.field.addEventListener('blur', () => {
            this.validateField(this.field.value, true);
        });

        // Focus event
        this.field.addEventListener('focus', () => {
            this.hideError();
        });

        // Paste event
        this.field.addEventListener('paste', (event) => {
            setTimeout(() => {
                this.handleInput(this.field.value);
            }, 10);
        });
    }

    /**
     * Obsługuje wprowadzanie tekstu
     * @param {string} value - Wprowadzona wartość
     */
    handleInput(value) {
        // Formatuj wartość podczas pisania
        const formattedValue = this.formatInputValue(value);

        if (formattedValue !== value) {
            const cursorPosition = this.field.selectionStart;
            this.field.value = formattedValue;

            // Przywróć pozycję kursora
            this.field.setSelectionRange(cursorPosition, cursorPosition);
        }

        // Opóźniona walidacja
        this.scheduleValidation(formattedValue);

        // Wywołaj callback
        this.triggerValueChange(formattedValue);
    }

    /**
     * Formatuje wartość podczas wprowadzania
     * @param {string} value - Wartość do sformatowania
     * @returns {string} - Sformatowana wartość
     */
    formatInputValue(value) {
        // Usuń wszystkie znaki niealfanumeryczne
        const cleaned = cleanNIP(value);

        // Ogranicz długość do 10 cyfr
        const truncated = cleaned.substring(0, 10);

        // Formatuj z kreskami
        if (truncated.length > 6) {
            return `${truncated.substring(0, 3)}-${truncated.substring(3, 6)}-${truncated.substring(6, 8)}-${truncated.substring(8)}`;
        } else if (truncated.length > 3) {
            return `${truncated.substring(0, 3)}-${truncated.substring(3)}`;
        } else {
            return truncated;
        }
    }

    /**
     * Planuje walidację z opóźnieniem
     * @param {string} value - Wartość do walidacji
     */
    scheduleValidation(value) {
        // Anuluj poprzednią walidację
        if (this.validationTimeout) {
            clearTimeout(this.validationTimeout);
        }

        // Zaplanuj nową walidację
        this.validationTimeout = setTimeout(() => {
            this.validateField(value, false);
        }, TIMEOUTS.DEBOUNCE_DELAY);
    }

    /**
     * Waliduje pole NIP
     * @param {string} value - Wartość do walidacji
     * @param {boolean} showErrors - Czy pokazywać błędy
     * @returns {boolean} - true jeśli pole jest prawidłowe
     */
    validateField(value, showErrors = true) {
        const cleanedValue = cleanNIP(value);

        // Resetuj stan
        this.hideError();
        this.field.classList.remove('is-invalid', 'is-valid');

        // Sprawdź czy pole jest puste
        if (!cleanedValue) {
            this.isValid = false;
            this.currentValue = '';
            this.triggerValidationChange(false);
            return false;
        }

        // Sprawdź czy może być NIP-em
        if (!isPotentialNIP(cleanedValue)) {
            if (showErrors) {
                this.showError(UI_MESSAGES.ERRORS.INVALID_NIP);
                this.field.classList.add('is-invalid');
            }
            this.isValid = false;
            this.currentValue = cleanedValue;
            this.triggerValidationChange(false);
            return false;
        }

        // Pełna walidacja tylko dla kompletnych numerów
        if (cleanedValue.length === 10) {
            const isValid = validateNIP(cleanedValue);

            if (isValid) {
                this.field.classList.add('is-valid');
                this.isValid = true;
                this.currentValue = cleanedValue;
                this.triggerValidationChange(true);
                return true;
            } else {
                if (showErrors) {
                    this.showError(UI_MESSAGES.ERRORS.INVALID_NIP);
                    this.field.classList.add('is-invalid');
                }
                this.isValid = false;
                this.currentValue = cleanedValue;
                this.triggerValidationChange(false);
                return false;
            }
        }

        // Niekompletny numer - nie pokazuj błędu, ale oznacz jako nieprawidłowy
        this.isValid = false;
        this.currentValue = cleanedValue;
        this.triggerValidationChange(false);
        return false;
    }

    /**
     * Pokazuje błąd walidacji
     * @param {string} message - Komunikat błędu
     */
    showError(message) {
        if (this.errorElement) {
            this.errorElement.textContent = message;
            this.errorElement.style.display = 'block';
        }
    }

    /**
     * Ukrywa błąd walidacji
     */
    hideError() {
        if (this.errorElement) {
            this.errorElement.style.display = 'none';
        }
    }

    /**
     * Ustawia wartość pola
     * @param {string} value - Wartość do ustawienia
     */
    setValue(value) {
        if (this.field) {
            const formattedValue = formatNIP(value);
            this.field.value = formattedValue;
            this.validateField(formattedValue, false);
        }
    }

    /**
     * Pobiera aktualną wartość pola (czysta, bez formatowania)
     * @returns {string} - Aktualna wartość
     */
    getValue() {
        return this.currentValue;
    }

    /**
     * Sprawdza czy pole jest prawidłowe
     * @returns {boolean} - true jeśli pole jest prawidłowe
     */
    getIsValid() {
        return this.isValid;
    }

    /**
     * Ustawia focus na polu
     */
    focus() {
        if (this.field) {
            this.field.focus();
        }
    }

    /**
     * Czyści pole
     */
    clear() {
        if (this.field) {
            this.field.value = '';
            this.hideError();
            this.field.classList.remove('is-invalid', 'is-valid');
            this.isValid = false;
            this.currentValue = '';
            this.triggerValidationChange(false);
            this.triggerValueChange('');
        }
    }

    /**
     * Wyłącza pole
     */
    disable() {
        if (this.field) {
            this.field.disabled = true;
        }
    }

    /**
     * Włącza pole
     */
    enable() {
        if (this.field) {
            this.field.disabled = false;
        }
    }

    /**
     * Wywołuje callback zmiany walidacji
     * @param {boolean} isValid - Stan walidacji
     */
    triggerValidationChange(isValid) {
        if (this.onValidationChange) {
            this.onValidationChange(isValid, this.currentValue);
        }
    }

    /**
     * Wywołuje callback zmiany wartości
     * @param {string} value - Nowa wartość
     */
    triggerValueChange(value) {
        if (this.onValueChange) {
            this.onValueChange(value);
        }
    }

    /**
     * Niszczy komponent
     */
    destroy() {
        if (this.validationTimeout) {
            clearTimeout(this.validationTimeout);
        }

        if (this.field) {
            this.field.removeEventListener('input', this.handleInput);
            this.field.removeEventListener('blur', this.validateField);
            this.field.removeEventListener('focus', this.hideError);
        }

        if (this.container && this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }
    }
}
