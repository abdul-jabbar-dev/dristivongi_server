"use strict";
/**
 * Search Query Normalizer for CivicLens
 * Supports English, Bengali (বাংলা), and mixed queries without corrupting Unicode characters.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.escapeIlike = exports.normalizeSearchQuery = void 0;
const normalizeSearchQuery = (rawQuery) => {
    if (!rawQuery) {
        return {
            raw: '',
            normalized: '',
            tokens: [],
            isBengali: false,
            isMixed: false,
            cleanQuery: '',
        };
    }
    // 1. Unicode NFC Normalization (crucial for Bengali combining characters)
    let normalized = rawQuery.normalize('NFC').trim();
    // 2. Detect Bengali characters (U+0980 to U+09FF)
    const bengaliRegex = /[\u0980-\u09FF]/;
    const englishRegex = /[a-zA-Z]/;
    const hasBengali = bengaliRegex.test(normalized);
    const hasEnglish = englishRegex.test(normalized);
    // 3. Clean up multiple spaces, weird symbols (preserve alphanumeric, bengali chars, and hashtags/at-signs)
    // Replace repeated whitespace with single space
    const cleanQuery = normalized.replace(/\s+/g, ' ');
    // 4. Tokenize
    // Split on whitespace or common punctuation that is not part of words
    const rawTokens = cleanQuery
        .split(/[\s,.;:!?|/\-—–()[\]{}<>"'`~+*_\\#@]+/)
        .filter(t => t.trim().length > 0);
    // 5. Build token list
    const tokens = Array.from(new Set(rawTokens.map(t => t.trim())));
    return {
        raw: rawQuery,
        normalized: cleanQuery.toLowerCase(),
        tokens,
        isBengali: hasBengali && !hasEnglish,
        isMixed: hasBengali && hasEnglish,
        cleanQuery,
    };
};
exports.normalizeSearchQuery = normalizeSearchQuery;
/**
 * Escapes characters for PostgreSQL ILIKE search pattern
 */
const escapeIlike = (str) => {
    return str.replace(/[%_\\]/g, '\\$&');
};
exports.escapeIlike = escapeIlike;
