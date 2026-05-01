// utils/normalizeProductName.ts

/**
 * Production-level product name normalizer for search queries.
 * Supports English and Bengali (Bangla) text.
 */

// ─── Bengali character ranges ────────────────────────────────────────────────
const BN_VOWELS = '\u0985-\u0994\u09E0\u09E1';
const BN_CONSONANTS = '\u0995-\u09B9\u09CE\u09DC-\u09DF';
const BN_MATRAS = '\u09BE-\u09CC\u09D7';
const BN_HALANT = '\u09CD';
const BN_NUKTA = '\u09BC';
const BN_ANUSVARA = '\u0981-\u0983';
const BN_DIGITS = '\u09E6-\u09EF';
const BN_RANGE = new RegExp(
    `[${BN_VOWELS}${BN_CONSONANTS}${BN_MATRAS}${BN_HALANT}${BN_NUKTA}${BN_ANUSVARA}${BN_DIGITS}]`,
);

// ─── Bengali numeral → ASCII digit map ───────────────────────────────────────
const BN_DIGIT_MAP: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
};

// ─── Common EN brand/unit abbreviation expansions ────────────────────────────
const EN_EXPANSIONS: [RegExp, string][] = [
    [/\bpcs?\b/gi, 'piece'],
    [/\bkgs?\b/gi, 'kg'],
    [/\blts?\b/gi, 'liter'],
    [/\bmls?\b/gi, 'ml'],
    [/\bgms?\b/gi, 'gram'],
    [/\blbs?\b/gi, 'pound'],
    [/\boz\b/gi, 'ounce'],
    [/\bdoz\b/gi, 'dozen'],
    [/&/g, 'and'],
    [/\+/g, 'plus'],
];

// ─── Common BN noise words to strip (optional, extend as needed) ──────────────
const BN_STOPWORDS = new Set([
    'এর', 'এবং', 'ও', 'দিয়ে', 'জন্য', 'থেকে', 'সহ', 'বা',
]);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function detectScript(text: string): 'bn' | 'en' | 'mixed' {
    const hasBengali = BN_RANGE.test(text);
    const hasLatin = /[a-zA-Z]/.test(text);
    if (hasBengali && hasLatin) return 'mixed';
    if (hasBengali) return 'bn';
    return 'en';
}

function normalizeEnglish(text: string): string {
    let s = text.toLowerCase().trim();

    // Expand common abbreviations
    for (const [pattern, replacement] of EN_EXPANSIONS) {
        s = s.replace(pattern, replacement);
    }

    // Remove diacritics (é → e, ü → u, etc.)
    s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Collapse hyphens/underscores to space
    s = s.replace(/[-_]+/g, ' ');

    // Strip non-alphanumeric (keep spaces)
    s = s.replace(/[^a-z0-9\s]/g, ' ');

    // Collapse whitespace
    s = s.replace(/\s+/g, ' ').trim();

    return s;
}

function normalizeBengali(text: string): string {
    let s = text.trim();

    // Convert Bengali digits → ASCII digits
    s = s.replace(/[০-৯]/g, d => BN_DIGIT_MAP[d] ?? d);

    // Normalize Unicode: NFC is standard for Indic scripts
    s = s.normalize('NFC');

    // Remove zero-width joiners / non-joiners used inconsistently
    s = s.replace(/[\u200C\u200D]/g, '');

    // Strip punctuation (keep Bengali chars, ASCII digits, spaces)
    s = s.replace(/[^\u0980-\u09FF0-9\s]/g, ' ');

    // Tokenize and remove stopwords
    const tokens = s.split(/\s+/).filter(Boolean);
    const filtered = tokens.filter(t => !BN_STOPWORDS.has(t));

    // Re-join and collapse spaces
    s = filtered.join(' ').replace(/\s+/g, ' ').trim();

    return s;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface NormalizeOptions {
    /** Force script detection override */
    locale?: 'en' | 'bn' | 'auto';
    /** Remove common stopwords (EN: the/a/an, BN: এর/ও/…) */
    removeStopwords?: boolean;
    /** Convert Bengali numerals to ASCII */
    convertBnDigits?: boolean;
    /** Max token count (truncates for search query safety) */
    maxTokens?: number;
}

const EN_STOPWORDS = new Set(['the', 'a', 'an', 'of', 'in', 'on', 'for', 'to', 'with', 'by', 'at']);

export function normalizeProductName(
    raw: string,
    options: NormalizeOptions = {},
): string {
    const {
        locale = 'auto',
        removeStopwords = true,
        convertBnDigits = true,
        maxTokens = 10,
    } = options;

    if (!raw || typeof raw !== 'string') return '';

    const script = locale === 'auto' ? detectScript(raw) : locale;

    let normalized: string;

    if (script === 'bn') {
        normalized = normalizeBengali(raw);
    } else if (script === 'mixed') {
        // Split on script boundary, normalize each part separately, rejoin
        const parts = raw.split(/(\s+)/);
        normalized = parts
            .map(part => {
                if (/\s+/.test(part)) return ' ';
                return BN_RANGE.test(part)
                    ? normalizeBengali(part)
                    : normalizeEnglish(part);
            })
            .join('')
            .replace(/\s+/g, ' ')
            .trim();
    } else {
        normalized = normalizeEnglish(raw);
    }

    // Optional EN stopword removal (post-normalization)
    if (removeStopwords && script !== 'bn') {
        const tokens = normalized.split(' ');
        normalized = tokens
            .filter(t => !EN_STOPWORDS.has(t))
            .join(' ')
            .trim();
    }

    // Token limit (guard against absurdly long inputs reaching search engines)
    if (maxTokens > 0) {
        normalized = normalized.split(' ').slice(0, maxTokens).join(' ');
    }

    return normalized;
}