"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoreCase = exports.scoreOrganization = exports.scoreUser = exports.calculateFieldScore = void 0;
/**
 * Calculates string similarity / relevance score between a target text and search query
 */
const calculateFieldScore = (text, parsedQuery, weight) => {
    if (!text)
        return 0;
    const target = text.toLowerCase().normalize('NFC');
    const query = parsedQuery.normalized;
    if (target === query) {
        return 100 * weight; // Exact full match
    }
    if (target.startsWith(query)) {
        return 80 * weight; // Prefix match
    }
    if (target.includes(query)) {
        return 60 * weight; // Substring / Phrase match
    }
    // Token matching
    let matchedTokens = 0;
    for (const token of parsedQuery.tokens) {
        if (target.includes(token.toLowerCase())) {
            matchedTokens++;
        }
    }
    if (matchedTokens > 0) {
        const ratio = matchedTokens / Math.max(1, parsedQuery.tokens.length);
        return 40 * ratio * weight;
    }
    return 0;
};
exports.calculateFieldScore = calculateFieldScore;
/**
 * Scorer for User results
 */
const scoreUser = (user, parsedQuery, intent) => {
    let score = 0;
    // Field weights: name > username > bio/location
    score += (0, exports.calculateFieldScore)(user.fullName, parsedQuery, 1.0);
    score += (0, exports.calculateFieldScore)(user.userName, parsedQuery, 0.9);
    score += (0, exports.calculateFieldScore)(user.bio, parsedQuery, 0.3);
    score += (0, exports.calculateFieldScore)(user.location, parsedQuery, 0.4);
    // Intent boost
    if (intent.type === 'USER') {
        score *= 1.5;
    }
    else if (intent.type === 'ORGANIZATION' || intent.type === 'CASE') {
        score *= 0.8;
    }
    return Math.round(score);
};
exports.scoreUser = scoreUser;
/**
 * Scorer for Organization results
 */
const scoreOrganization = (org, parsedQuery, intent) => {
    let score = 0;
    // Field weights: name > slug > description > location/category
    score += (0, exports.calculateFieldScore)(org.name, parsedQuery, 1.2);
    score += (0, exports.calculateFieldScore)(org.slug, parsedQuery, 0.9);
    score += (0, exports.calculateFieldScore)(org.description, parsedQuery, 0.4);
    score += (0, exports.calculateFieldScore)(org.location, parsedQuery, 0.5);
    score += (0, exports.calculateFieldScore)(org.category, parsedQuery, 0.4);
    // Intent boost
    if (intent.type === 'ORGANIZATION') {
        score *= 1.5;
    }
    else if (intent.type === 'USER') {
        score *= 0.8;
    }
    return Math.round(score);
};
exports.scoreOrganization = scoreOrganization;
/**
 * Scorer for Case results
 */
const scoreCase = (caseItem, parsedQuery, intent) => {
    let score = 0;
    // Field weights: title > location > claims > tags
    score += (0, exports.calculateFieldScore)(caseItem.title, parsedQuery, 1.3);
    score += (0, exports.calculateFieldScore)(caseItem.location, parsedQuery, 0.8);
    if (caseItem.claims && caseItem.claims.length > 0) {
        for (const claim of caseItem.claims) {
            score += (0, exports.calculateFieldScore)(claim.title, parsedQuery, 0.7);
        }
    }
    if (caseItem.tags && caseItem.tags.length > 0) {
        for (const t of caseItem.tags) {
            score += (0, exports.calculateFieldScore)(t.tag.name, parsedQuery, 0.6);
        }
    }
    // Activity & Freshness bonus
    const now = Date.now();
    const daysSinceActivity = (now - new Date(caseItem.lastActivityAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceActivity <= 7) {
        score += 15;
    }
    else if (daysSinceActivity <= 30) {
        score += 8;
    }
    // Evidence / Content rich bonus
    const totalCivicContent = (caseItem.evidenceCount || 0) + (caseItem.sourcesCount || 0) + (caseItem.discussionsCount || 0);
    score += Math.min(20, totalCivicContent * 2);
    // Intent boost
    if (intent.type === 'CASE' || intent.type === 'LOCATION') {
        score *= 1.4;
    }
    else if (intent.type === 'USER') {
        score *= 0.85;
    }
    return Math.round(score);
};
exports.scoreCase = scoreCase;
