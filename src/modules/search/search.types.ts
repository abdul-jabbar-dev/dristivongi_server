export type SearchScope = 
  | 'all' 
  | 'cases' 
  | 'organizations' 
  | 'users' 
  | 'claims' 
  | 'evidence' 
  | 'sources' 
  | 'discussions';

export type SearchSortBy = 
  | 'relevance' 
  | 'recent' 
  | 'most_active' 
  | 'most_members';

export interface SearchFilterParams {
  q: string;
  scope?: SearchScope;
  location?: string;
  category?: string;
  status?: string;
  organizationId?: string;
  organizationType?: string;
  evidenceType?: string;
  sourceType?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: SearchSortBy;
  limit?: number;
  page?: number;
  cursor?: string;
}

export type SearchIntentType = 
  | 'USER' 
  | 'ORGANIZATION' 
  | 'CASE' 
  | 'EVIDENCE_SOURCE' 
  | 'LOCATION' 
  | 'GENERAL';

export interface SearchIntent {
  type: SearchIntentType;
  confidence: number; // 0.0 to 1.0
  detectedTokens: string[];
  locationHint?: string;
}
