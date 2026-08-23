export type SearchBrief = {
  primaryTitle: string | null;
  alternativeTitles: string[];
  adjacentTitles: string[];
  roleFamily: 'Technology' | 'Sales' | 'Recruitment' | 'Finance' | 'Operations' | 'Marketing' | 'Product' | 'Design' | 'Customer Success' | 'Generic';
  mustHaveSkills: string[];
  goodToHaveSkills: string[];
  skillSynonyms: Record<string, string[]>;
  minExperience: number | null;
  maxExperience: number | null;
  locations: string[];
  locationVariants: string[];
  preferredCompanies: string[];
  excludedCompanies: string[];
  preferredIndustries: string[];
  excludedIndustries: string[];
  excludedTitles: string[];
  excludeKeywords: string[];
  nonNegotiables: string[];
  candidateSummary: string;
  searchStrategySummary: string;
};

export type SearchQuery = {
  id: string;
  query: string;
  family: 'precision' | 'alternative_title' | 'skill_led' | 'adjacent_role' | 'company_led' | 'recall_expansion';
  strategyReason: string;
};

export type Candidate = {
  id: string;
  name: string;
  currentDesignation: string | null;
  currentOrganization: string | null;
  location: string | null;
  linkedinUrl: string;
  searchSnippet: string;
  sourceQueries: string[];
  queryFamilies: string[];
  extractionConfidence: number;
  deterministicScore: number;
  contextualScore: number;
  finalScore: number;
  matchStrength: 'excellent' | 'strong' | 'potential' | 'low';
  confirmedMatches: string[];
  uncertainRequirements: string[];
  mismatchFlags: string[];
  reasoningSummary: string;
  selected: boolean;
};

export type SearchSession = {
  id: string;
  status: 'created' | 'analyzing' | 'generating_queries' | 'searching' | 'deduplicating' | 'scoring' | 'completed' | 'failed';
  rawRequirement: string;
  searchBrief: SearchBrief | null;
  generatedQueries: SearchQuery[];
  totalResultsFound: number;
  uniqueCandidatesFound: number;
  candidates: Candidate[];
  completedAt?: string;
  error?: string;
  warning?: string;
  tokensUsed?: number;
  createdAt: string;
};

export type SearchResult = {
  title: string;
  url: string;
  snippet: string;
  position: number;
  // Google renders LinkedIn results with a "Location - Title - Company" subtitle.
  subtitle?: string;
};
