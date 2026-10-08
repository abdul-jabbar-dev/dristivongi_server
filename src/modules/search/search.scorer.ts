import { SearchIntent } from './search.types';
import { NormalizedSearchQuery } from './search.normalizer';

/**
 * Calculates string similarity / relevance score between a target text and search query
 */
export const calculateFieldScore = (
  text: string | null | undefined,
  parsedQuery: NormalizedSearchQuery,
  weight: number
): number => {
  if (!text) return 0;
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

/**
 * Scorer for User results
 */
export const scoreUser = (
  user: {
    fullName: string;
    userName: string | null;
    bio?: string | null;
    location?: string | null;
  },
  parsedQuery: NormalizedSearchQuery,
  intent: SearchIntent
): number => {
  let score = 0;
  // Field weights: name > username > bio/location
  score += calculateFieldScore(user.fullName, parsedQuery, 1.0);
  score += calculateFieldScore(user.userName, parsedQuery, 0.9);
  score += calculateFieldScore(user.bio, parsedQuery, 0.3);
  score += calculateFieldScore(user.location, parsedQuery, 0.4);

  // Intent boost
  if (intent.type === 'USER') {
    score *= 1.5;
  } else if (intent.type === 'ORGANIZATION' || intent.type === 'CASE') {
    score *= 0.8;
  }

  return Math.round(score);
};

/**
 * Scorer for Organization results
 */
export const scoreOrganization = (
  org: {
    name: string;
    slug: string;
    description: string | null;
    location: string | null;
    category?: string | null;
  },
  parsedQuery: NormalizedSearchQuery,
  intent: SearchIntent
): number => {
  let score = 0;
  // Field weights: name > slug > description > location/category
  score += calculateFieldScore(org.name, parsedQuery, 1.2);
  score += calculateFieldScore(org.slug, parsedQuery, 0.9);
  score += calculateFieldScore(org.description, parsedQuery, 0.4);
  score += calculateFieldScore(org.location, parsedQuery, 0.5);
  score += calculateFieldScore(org.category, parsedQuery, 0.4);

  // Intent boost
  if (intent.type === 'ORGANIZATION') {
    score *= 1.5;
  } else if (intent.type === 'USER') {
    score *= 0.8;
  }

  return Math.round(score);
};

/**
 * Scorer for Case results
 */
export const scoreCase = (
  caseItem: {
    title: string;
    location: string;
    createdAt: Date;
    lastActivityAt: Date;
    claims?: { title: string }[];
    tags?: { tag: { name: string } }[];
    evidenceCount?: number;
    sourcesCount?: number;
    discussionsCount?: number;
  },
  parsedQuery: NormalizedSearchQuery,
  intent: SearchIntent
): number => {
  let score = 0;
  // Field weights: title > location > claims > tags
  score += calculateFieldScore(caseItem.title, parsedQuery, 1.3);
  score += calculateFieldScore(caseItem.location, parsedQuery, 0.8);

  if (caseItem.claims && caseItem.claims.length > 0) {
    for (const claim of caseItem.claims) {
      score += calculateFieldScore(claim.title, parsedQuery, 0.7);
    }
  }

  if (caseItem.tags && caseItem.tags.length > 0) {
    for (const t of caseItem.tags) {
      score += calculateFieldScore(t.tag.name, parsedQuery, 0.6);
    }
  }

  // Activity & Freshness bonus
  const now = Date.now();
  const daysSinceActivity = (now - new Date(caseItem.lastActivityAt).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceActivity <= 7) {
    score += 15;
  } else if (daysSinceActivity <= 30) {
    score += 8;
  }

  // Evidence / Content rich bonus
  const totalCivicContent = (caseItem.evidenceCount || 0) + (caseItem.sourcesCount || 0) + (caseItem.discussionsCount || 0);
  score += Math.min(20, totalCivicContent * 2);

  // Intent boost
  if (intent.type === 'CASE' || intent.type === 'LOCATION') {
    score *= 1.4;
  } else if (intent.type === 'USER') {
    score *= 0.85;
  }

  return Math.round(score);
};
