import { GS1_COMPANY_PREFIX } from "@/config"

/**
 * Generates a GS1-compliant EAN-13 barcode number for retail products.
 *
 * Structure: [GS1 Company Prefix (7)] + [Product Reference (5)] + [Check Digit (1)]
 *
 * For a real deployment, your GS1 company prefix is assigned by GS1 org.
 * During dev/staging, prefix 200-299 is reserved for internal/store use.
 *
 * @param sequentialId - Up to 5-digit product reference, zero-padded
 * @returns              - 13-digit EAN-13 string
 * 
 * @example
 * generateEAN13(12345) // "2001012345678"
 */

export function generateEAN13(sequentialId: number): string {
    if (!Number.isInteger(sequentialId) || sequentialId < 1 || sequentialId > 99999999) {
        throw new Error("Sequential ID must be an integer between 1 and 99999999")
    }

    const base = `${GS1_COMPANY_PREFIX}${String(sequentialId).padStart(8, "0")}`
    const checkDigit = computeEAN13CheckDigit(base)
    return `${base}${checkDigit}`
}

export function validateEAN13(barcode: string): boolean {
    if (!/^\d{13}$/.test(barcode)) return false
    const base = barcode.slice(0, 12)
    const providedCheck = parseInt(barcode[12]!, 10)
    return computeEAN13CheckDigit(base) === providedCheck
}

function computeEAN13CheckDigit(twelveDigits: string): number {
    const digits = twelveDigits.split("").map(Number)
    const sum = digits.reduce((acc, digit, i) => {
        return acc + digit * (i % 2 === 0 ? 1 : 3)
    }, 0)
    const remainder = sum % 10
    return remainder === 0 ? 0 : 10 - remainder
}