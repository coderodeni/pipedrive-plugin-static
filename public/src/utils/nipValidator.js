/**
 * Walidator numeru NIP
 * Sprawdza format i sumę kontrolną NIP
 */

/**
 * Sprawdza czy numer NIP jest prawidłowy
 * @param {string} nip - Numer NIP do sprawdzenia
 * @returns {boolean} - true jeśli NIP jest prawidłowy
 */
export function validateNIP(nip) {
    if (!nip) return false;

    // Usuń wszystkie znaki niealfanumeryczne
    const cleanNip = nip.replace(/[^0-9]/g, '');

    // Sprawdź długość
    if (cleanNip.length !== 10) return false;

    // Sprawdź czy wszystkie cyfry nie są identyczne
    if (/^(\d)\1{9}$/.test(cleanNip)) return false;

    // Wagi dla kontroli sumy
    const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];

    // Oblicz sumę kontrolną
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(cleanNip[i]) * weights[i];
    }

    const checksum = sum % 11;
    const controlDigit = parseInt(cleanNip[9]);

    // Sprawdź sumę kontrolną
    if (checksum < 10) {
        return checksum === controlDigit;
    } else {
        return controlDigit === 0;
    }
}

/**
 * Formatuje numer NIP do standardowego formatu XXX-XXX-XX-XX
 * @param {string} nip - Numer NIP do sformatowania
 * @returns {string} - Sformatowany NIP lub pusty string jeśli nieprawidłowy
 */
export function formatNIP(nip) {
    if (!nip) return '';

    const cleanNip = nip.replace(/[^0-9]/g, '');

    if (cleanNip.length === 10) {
        return `${cleanNip.substring(0, 3)}-${cleanNip.substring(3, 6)}-${cleanNip.substring(6, 8)}-${cleanNip.substring(8, 10)}`;
    }

    return cleanNip;
}

/**
 * Czyści numer NIP z formatowania (pozostawia tylko cyfry)
 * @param {string} nip - Numer NIP do wyczyszczenia
 * @returns {string} - NIP zawierający tylko cyfry
 */
export function cleanNIP(nip) {
    if (!nip) return '';
    return nip.replace(/[^0-9]/g, '');
}

/**
 * Sprawdza czy string może być numerem NIP (podstawowa walidacja)
 * @param {string} value - Wartość do sprawdzenia
 * @returns {boolean} - true jeśli może być NIP
 */
export function isPotentialNIP(value) {
    if (!value) return false;

    const cleanValue = value.replace(/[^0-9]/g, '');
    return cleanValue.length >= 3 && cleanValue.length <= 10;
}
