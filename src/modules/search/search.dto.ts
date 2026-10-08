export interface UserSearchResultDTO {
  id: string;
  fullName: string;
  userName: string | null;
  profilePicture: string | null;
  bio: string | null;
  location: string | null;
  headline?: string | null;
  organizationAffiliation?: {
    id: string;
    name: string;
    slug: string;
    role: string;
  } | null;
  url: string;
  score?: number;
}

export interface OrganizationSearchResultDTO {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  organizationType: string;
  verificationStatus: string;
  location: string | null;
  logoUrl: string | null;
  memberCount: number;
  caseCount: number;
  url: string;
  score?: number;
}

export interface CaseSearchResultDTO {
  id: string;
  title: string;
  titleHtml?: string;
  location: string;
  caseStatus: string;
  visibility: string;
  lastActivityAt: string;
  createdAt: string;
  isAnonymous: boolean;
  author: {
    id: string;
    name: string;
    userName: string | null;
    avatarUrl: string | null;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    verificationStatus?: string;
  } | null;
  stats: {
    claimsCount: number;
    evidenceCount: number;
    sourcesCount: number;
    discussionsCount: number;
    reactionsCount: number;
  };
  matchedContext?: {
    matchedClaim?: {
      id: string;
      title: string;
    } | null;
    matchedEvidence?: {
      id: string;
      title: string;
      type: string;
    } | null;
    matchedSource?: {
      id: string;
      title: string;
      publisher: string;
    } | null;
    matchedDiscussion?: {
      id: string;
      snippet: string;
    } | null;
  };
  url: string;
  score?: number;
}

export interface ClaimSearchResultDTO {
  id: string;
  title: string;
  claimType: string | null;
  claimStatus: string;
  createdAt: string;
  isAnonymous: boolean;
  parentCase: {
    id: string;
    title: string;
    location: string;
    organizationName?: string | null;
    url: string;
  };
  assessmentsCount: number;
  evidenceCount: number;
  url: string;
  score?: number;
}

export interface EvidenceSearchResultDTO {
  id: string;
  title: string;
  type: string;
  createdAt: string;
  isAnonymous: boolean;
  parentCase: {
    id: string;
    title: string;
    location: string;
    url: string;
  };
  relatedClaim?: {
    id: string;
    title: string;
  } | null;
  validationsCount: number;
  url: string;
  score?: number;
}

export interface SourceSearchResultDTO {
  id: string;
  title: string;
  publisher: string;
  sourceLocation: string;
  externalSourceType: string;
  externalLinks: string[];
  createdAt: string;
  parentCase: {
    id: string;
    title: string;
    url: string;
  };
  relatedClaim?: {
    id: string;
    title: string;
  } | null;
  url: string;
  score?: number;
}

export interface DiscussionSearchResultDTO {
  id: string;
  snippet: string;
  createdAt: string;
  isAnonymous: boolean;
  author: {
    name: string;
    avatarUrl: string | null;
  };
  parentCase: {
    id: string;
    title: string;
    url: string;
  };
  url: string;
  score?: number;
}

export interface SearchGroupResult<T> {
  items: T[];
  total: number;
  hasMore: boolean;
  nextCursor?: string | null;
}

export interface GlobalSearchResponseDTO {
  query: string;
  normalizedQuery: string;
  scope: string;
  intent: {
    type: string;
    confidence: number;
  };
  results: {
    users: SearchGroupResult<UserSearchResultDTO>;
    organizations: SearchGroupResult<OrganizationSearchResultDTO>;
    cases: SearchGroupResult<CaseSearchResultDTO>;
    claims: SearchGroupResult<ClaimSearchResultDTO>;
    evidence: SearchGroupResult<EvidenceSearchResultDTO>;
    sources: SearchGroupResult<SourceSearchResultDTO>;
    discussions: SearchGroupResult<DiscussionSearchResultDTO>;
  };
}

export interface SearchSuggestionItemDTO {
  type: 'CASE' | 'ORGANIZATION' | 'USER' | 'CLAIM' | 'TOPIC';
  id: string;
  title: string;
  subtitle: string;
  image?: string | null;
  url: string;
  extraMeta?: string;
}

export interface SearchSuggestionsResponseDTO {
  query: string;
  items: SearchSuggestionItemDTO[];
}
