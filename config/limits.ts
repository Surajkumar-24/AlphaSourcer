export const LIMITS = {
  maxSearchesPerDay: parseInt(process.env.MAX_SEARCHES_PER_DAY || '50', 10),
  maxQueriesPerSearch: 10,
  maxResultsPerQuery: 50,
  maxCandidatesForEvaluation: 100,
  requestTimeout: 30000,
  maxRequirementLength: 5000,
};

export const QUERY_LIMITS = {
  minQueriesPerSearch: 6,
  maxQueriesPerSearch: 10,
};

export const SEARCH_LIMITS = {
  minCandidatesPerSearch: 20,
  targetCandidatesPerSearch: 50,
  maxCandidatesPerSearch: 150,
};
