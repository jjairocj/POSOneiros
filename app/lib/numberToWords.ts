/**
 * Spanish number-to-words, for the amount-in-words line a recibo de caja is
 * required to show (see docs/17). Handles 0 to 999,999,999 — comfortably
 * past anything a small retail/food business would ring up in one sale.
 */
const UNITS = ["", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"];
const TEENS = ["diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve"];
const TENS = ["", "", "veinte", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
const HUNDREDS = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"];

function twoDigits(n: number): string {
    if (n < 10) return UNITS[n];
    if (n < 20) return TEENS[n - 10];
    const tens = Math.floor(n / 10);
    const units = n % 10;
    if (n < 30) return units === 0 ? "veinte" : `veinti${UNITS[units]}`;
    return units === 0 ? TENS[tens] : `${TENS[tens]} y ${UNITS[units]}`;
}

function threeDigits(n: number): string {
    if (n === 0) return "";
    if (n === 100) return "cien";
    const hundreds = Math.floor(n / 100);
    const rest = n % 100;
    const hundredsWord = hundreds > 0 ? HUNDREDS[hundreds] : "";
    const restWord = rest > 0 ? twoDigits(rest) : "";
    return [hundredsWord, restWord].filter(Boolean).join(" ");
}

/** e.g. 37500 -> "treinta y siete mil quinientos" */
export function numberToWords(n: number): string {
    const value = Math.round(Math.abs(n));
    if (value === 0) return "cero";

    const millions = Math.floor(value / 1_000_000);
    const thousands = Math.floor((value % 1_000_000) / 1000);
    const units = value % 1000;

    const parts: string[] = [];
    if (millions > 0) {
        parts.push(millions === 1 ? "un millón" : `${threeDigits(millions)} millones`);
    }
    if (thousands > 0) {
        parts.push(thousands === 1 ? "mil" : `${threeDigits(thousands)} mil`);
    }
    if (units > 0) {
        parts.push(threeDigits(units));
    }
    return parts.join(" ");
}

/** e.g. 37500 -> "TREINTA Y SIETE MIL QUINIENTOS PESOS M/CTE" */
export function moneyInWords(n: number): string {
    return `${numberToWords(n).toUpperCase()} PESOS M/CTE`;
}
