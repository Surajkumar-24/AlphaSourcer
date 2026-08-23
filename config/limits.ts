export const LIMITS = {
  maxSearchesPerDay: parseInt(process.env.MAX_SEARCHES_PER_DAY || '50', 10),
  maxQueriesPerSearch: 10,
  // Free Serper caps a response at 10 results, so depth comes from paging.
  resultPagesPerQuery: 6,
  maxResultsPerQuery: 60,
  // Every candidate is scored deterministically; only the strongest go to the
  // LLM, which is what keeps a search inside the free tokens-per-minute budget.
  maxCandidatesForEvaluation: 20,
  evaluationBatchSize: 10,
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
