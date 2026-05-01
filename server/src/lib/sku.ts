// lib/sku.ts

/**
 * Generates a human-readable, collision-resistant SKU for clothing variants.
 *
 * Format: {CATEGORY}-{BRAND}-{STYLE}-{COLOR}-{SIZE}-{SEQUENCE}
 * Example: APR-NKE-SLIM-BLK-LG-00042
 *
 * Fully deterministic given the same inputs — safe to regenerate without
 * hitting the database, but the sequence suffix ensures uniqueness per style.
 */

// export type ClothingCategory =
//     | "APR"  // Apparel (generic)
//     | "TOP"  // Tops / T-shirts
//     | "BTM"  // Bottoms / Trousers
//     | "DRS"  // Dresses
//     | "JKT"  // Jackets / Outerwear
//     | "FTW"  // Footwear
//     | "ACC"  // Accessories
//     | "UND"  // Underwear / Innerwear

export interface SKUInput {
    category: string
    brand: string        // e.g. "Nike", "Zara" → normalized to 3 chars
    // styleCode: string    // Your internal style/design code e.g. "SLIM-FIT-CHINO"
    color: string        // e.g. "Black", "Navy Blue" → normalized
    size: string         // e.g. "S", "M", "L", "XL", "32x30", "EU42"
    sequence: number     // Auto-increment from DB for this product (variant index)
}

// ── Color normalization map ───────────────────────────────────────────────────
// Extend this map with your store's color catalog
// const COLOR_MAP: Record<string, string> = {
//     black: "BLK", white: "WHT", red: "RED", blue: "BLU",
//     navy: "NVY", "navy blue": "NVY", green: "GRN", yellow: "YLW",
//     orange: "ORG", pink: "PNK", purple: "PRP", grey: "GRY",
//     gray: "GRY", brown: "BRN", beige: "BGE", cream: "CRM",
//     maroon: "MRN", teal: "TEL", olive: "OLV", khaki: "KHK",
//     coral: "CRL", mint: "MNT", lavender: "LVD", gold: "GLD",
//     silver: "SLV", charcoal: "CHL", indigo: "IND", turquoise: "TRQ",
// }

// // ── Size normalization ────────────────────────────────────────────────────────
// const SIZE_MAP: Record<string, string> = {
//     "xs": "XS", "s": "SM", "m": "MD", "l": "LG", "xl": "XL",
//     "xxl": "2XL", "xxxl": "3XL", "2xl": "2XL", "3xl": "3XL",
//     // Numeric sizes (jeans, EU, UK) pass through as-is after sanitization
// }

export function generateSKU(input: SKUInput): string {
    const category = input.category.toUpperCase()

    // Brand: take first 3 alpha chars, uppercase
    const brand = input.brand
        .replace(/[^a-zA-Z]/g, "")
        .slice(0, 3)
        .toUpperCase()
        .padEnd(3, "X")

    // Style: sanitize, take first 6 chars, uppercase
    // const style = input.styleCode
    //     .replace(/[^a-zA-Z0-9]/g, "")
    //     .slice(0, 6)
    //     .toUpperCase()
    //     .padEnd(3, "X")

    // Color: normalize via map, fallback to first 3 chars
    // const colorKey = input.color.toLowerCase().trim()
    // const color = COLOR_MAP[colorKey]
    //     ?? input.color.replace(/[^a-zA-Z0-9]/g, "").slice(0, 3).toUpperCase().padEnd(3, "X")

    // Size: normalize via map, fallback to sanitized value
    // const sizeKey = input.size.toLowerCase().trim()
    // const size = SIZE_MAP[sizeKey]
    //     ?? input.size.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase()

    // Zero-padded sequence (supports up to 99,999 variants per style)
    const seq = String(input.sequence).padStart(5, "0")

    // return `${category}-${brand}-${style}-${color}-${size}-${seq}`
    return `${category}-${brand}-${input.color}-${input.size}-${seq}`

}

/**
 * Parses a SKU string back into its components for display / debugging.
 */
export function parseSKU(sku: string): Record<string, string> | null {
    const parts = sku.split("-")
    if (parts.length !== 6) return null
    const [category, brand, style, color, size, sequence] = parts
    return { category, brand, style, color, size, sequence } as Record<string, string>
}