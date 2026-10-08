import { SearchIntent } from './search.types';
import { NormalizedSearchQuery } from './search.normalizer';

const LOCATION_KEYWORDS = [
  'dhaka', 'gazipur', 'chittagong', 'chattogram', 'sylhet', 'rajshahi', 'khulna', 
  'barisal', 'rangpur', 'mymensingh', 'tongi', 'mirpur', 'uttara', 'gulshan', 
  'banani', 'dhanmondi', 'motijheel', 'savar', 'narayanganj', 'cumilla', 'comilla',
  'ঢাকা', 'গাজীপুর', 'চট্টগ্রাম', 'সিলেট', 'রাজশাহী', 'খুলনা', 'বরিশাল', 
  'রংপুর', 'ময়মনসিংহ', 'টঙ্গী', 'মিরপুর', 'উত্তরা', 'গুলশান', 'বনানী', 
  'ধানমন্ডি', 'মতিঝিল', 'সাভার', 'নারায়ণগঞ্জ', 'কুমিল্লা'
];

const ORG_KEYWORDS = [
  'watch', 'foundation', 'society', 'department', 'authority', 'trust', 'association', 
  'initiative', 'club', 'corp', 'limited', 'ltd', 'ngo', 'ministry', 'bureau', 'board',
  'উন্নয়ন', 'সংস্থা', 'ফাউন্ডেশন', 'ফোরাম', 'কমিটি', 'মন্ত্রণালয়', 'অধিদপ্তর', 
  'কর্তৃপক্ষ', 'ট্রাস্ট', 'সোসাইটি', 'পরিষদ'
];

const EVIDENCE_SOURCE_KEYWORDS = [
  'report', 'document', 'inspection', 'contract', 'tender', 'study', 'survey', 
  'audit', 'bill', 'receipt', 'photo', 'video', 'circular', 'notice', 'gazette',
  'প্রতিবেদন', 'তদন্ত', 'নথি', 'চুক্তি', 'টেন্ডার', 'দলিল', 'অডিট', 'বিল', 
  'রশিদ', 'ছবি', 'ভিডিও', 'বিজ্ঞপ্তি', 'গেজেট', 'প্রমাণ'
];

const CASE_CIVIC_KEYWORDS = [
  'road', 'project', 'bridge', 'culvert', 'construction', 'repair', 'quality', 
  'delay', 'corruption', 'drainage', 'water', 'electricity', 'waste', 'hospital', 
  'school', 'safety', 'accident', 'encroachment', 'pollution', 'bribe',
  'রাস্তা', 'প্রকল্প', 'সেতু', 'কালভার্ট', 'নির্মাণ', 'মেরামত', 'গুণমান', 
  'বিলম্ব', 'দুর্নীতি', 'ড্রেনেজ', 'পানি', 'বিদ্যুৎ', 'বর্জ্য', 'হাসপাতাল', 
  'স্কুল', 'নিরাপত্তা', 'দুর্ঘটনা', 'দখল', 'দূষণ', 'ঘুষ'
];

export const detectSearchIntent = (parsed: NormalizedSearchQuery): SearchIntent => {
  const queryLower = parsed.normalized;
  const tokensLower = parsed.tokens.map(t => t.toLowerCase());

  // 1. Check if explicitly starts with @ (Username lookup)
  if (parsed.raw.startsWith('@')) {
    return {
      type: 'USER',
      confidence: 0.95,
      detectedTokens: parsed.tokens,
    };
  }

  // 2. Check for Evidence / Source keywords
  const matchedEvidenceTokens = tokensLower.filter(t => 
    EVIDENCE_SOURCE_KEYWORDS.some(k => t.includes(k) || k.includes(t))
  );
  if (matchedEvidenceTokens.length > 0) {
    return {
      type: 'EVIDENCE_SOURCE',
      confidence: 0.85,
      detectedTokens: matchedEvidenceTokens,
    };
  }

  // 3. Check for Organization indicators
  const matchedOrgTokens = tokensLower.filter(t => 
    ORG_KEYWORDS.some(k => t.includes(k) || k.includes(t))
  );
  if (matchedOrgTokens.length > 0) {
    return {
      type: 'ORGANIZATION',
      confidence: 0.80,
      detectedTokens: matchedOrgTokens,
    };
  }

  // 4. Check for Location & Case Civic keywords
  const matchedLocations = tokensLower.filter(t => 
    LOCATION_KEYWORDS.some(k => t.includes(k) || k.includes(t))
  );
  const matchedCaseTokens = tokensLower.filter(t => 
    CASE_CIVIC_KEYWORDS.some(k => t.includes(k) || k.includes(t))
  );

  if (matchedLocations.length > 0 && matchedCaseTokens.length > 0) {
    return {
      type: 'CASE',
      confidence: 0.90,
      detectedTokens: [...matchedLocations, ...matchedCaseTokens],
      locationHint: matchedLocations[0],
    };
  }

  if (matchedCaseTokens.length > 0) {
    return {
      type: 'CASE',
      confidence: 0.75,
      detectedTokens: matchedCaseTokens,
    };
  }

  if (matchedLocations.length > 0) {
    return {
      type: 'LOCATION',
      confidence: 0.70,
      detectedTokens: matchedLocations,
      locationHint: matchedLocations[0],
    };
  }

  // 5. Check if query looks like a Person Name (e.g. 1 or 2 capitalized words, no civic keywords)
  if (parsed.tokens.length >= 1 && parsed.tokens.length <= 3 && !hasCivicKeyword(tokensLower)) {
    return {
      type: 'USER',
      confidence: 0.60,
      detectedTokens: parsed.tokens,
    };
  }

  return {
    type: 'GENERAL',
    confidence: 0.50,
    detectedTokens: parsed.tokens,
  };
};

const hasCivicKeyword = (tokens: string[]): boolean => {
  return tokens.some(t => 
    CASE_CIVIC_KEYWORDS.includes(t) || 
    EVIDENCE_SOURCE_KEYWORDS.includes(t) || 
    ORG_KEYWORDS.includes(t)
  );
};
