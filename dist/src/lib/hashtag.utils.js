"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeHashtags = exports.extractHashtags = exports.normalizeHashtag = void 0;
/**
 * Normalizes a hashtag by removing the #, trimming, and converting to lowercase.
 * Supports Unicode/Bangla characters.
 */
const normalizeHashtag = (tag) => {
    return tag
        .replace(/^#+/, '') // Remove leading #
        .trim()
        .toLowerCase(); // Note: toLowerCase works for English, Bangla doesn't have cases but it's safe
};
exports.normalizeHashtag = normalizeHashtag;
/**
 * Extracts hashtags from a given text.
 * Matches # followed by word characters (including Unicode/Bangla).
 * Returns an array of normalized tags.
 */
const extractHashtags = (text) => {
    if (!text)
        return [];
    // Match # followed by word characters (letters, numbers, underscores in any language)
    // \p{L} = Any letter in any language
    // \p{N} = Any number in any language
    const regex = /#([\p{L}\p{N}_]+)/gu;
    const matches = [...text.matchAll(regex)];
    const tags = matches.map(match => (0, exports.normalizeHashtag)(match[1]));
    // Remove duplicates and empty tags
    return [...new Set(tags)].filter(Boolean);
};
exports.extractHashtags = extractHashtags;
/**
 * Removes specific hashtags from the text.
 */
const removeHashtags = (text, tagsToRemove) => {
    if (!text || !tagsToRemove || tagsToRemove.length === 0)
        return text || '';
    let result = text;
    tagsToRemove.forEach(tag => {
        // Only remove the tag if it's a valid hashtag (case insensitive), with word boundaries
        const regex = new RegExp(`#${tag}(?!\\p{L}|\\p{N}|_)`, 'gui');
        result = result.replace(regex, '');
    });
    return result;
};
exports.removeHashtags = removeHashtags;
