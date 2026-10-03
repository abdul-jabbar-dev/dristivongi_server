/**
 * Normalizes a hashtag by removing the #, trimming, and converting to lowercase.
 * Supports Unicode/Bangla characters.
 */
export const normalizeHashtag = (tag: string): string => {
  return tag
    .replace(/^#+/, '') // Remove leading #
    .trim()
    .toLowerCase(); // Note: toLowerCase works for English, Bangla doesn't have cases but it's safe
};

/**
 * Extracts hashtags from a given text.
 * Matches # followed by word characters (including Unicode/Bangla).
 * Returns an array of normalized tags.
 */
export const extractHashtags = (text: string | undefined | null): string[] => {
  if (!text) return [];
  
  // Match # followed by word characters (letters, numbers, underscores in any language)
  // \p{L} = Any letter in any language
  // \p{N} = Any number in any language
  const regex = /#([\p{L}\p{N}_]+)/gu;
  
  const matches = [...text.matchAll(regex)];
  
  const tags = matches.map(match => normalizeHashtag(match[1]));
  
  // Remove duplicates and empty tags
  return [...new Set(tags)].filter(Boolean);
};

/**
 * Removes specific hashtags from the text.
 */
export const removeHashtags = (text: string | undefined | null, tagsToRemove: string[]): string => {
  if (!text || !tagsToRemove || tagsToRemove.length === 0) return text || '';
  
  let result = text;
  tagsToRemove.forEach(tag => {
    // Only remove the tag if it's a valid hashtag (case insensitive), with word boundaries
    const regex = new RegExp(`#${tag}(?!\\p{L}|\\p{N}|_)`, 'gui');
    result = result.replace(regex, '');
  });
  
  return result;
};
