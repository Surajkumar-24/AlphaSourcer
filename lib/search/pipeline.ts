import { SearchSession, Candidate, SearchBrief } from '@/types/index';
import { parseRequirement } from '@/lib/groq/parseRequirement';
import { generateQueries } from '@/lib/groq/generateQueries';
import { serperSearchPaged, isLinkedInProfileUrl } from '@/lib/serper/search';
import { parseSearchResult } from '@/lib/candidates/parseSearchResult';
import { evaluateCandidatesBatch, EvaluationInput } from '@/lib/groq/evaluateCandidate';
import { calculateDeterministicScore } from '@/lib/scoring/deterministic';
import { deduplicateCandidates } from '@/lib/candidates/deduplicate';
import { LIMITS } from '@/config/limits';
import { MATCH_STRENGTH_RANGES, FINAL_SCORE_WEIGHTS } from '@/config/scoring';
import { nanoid } from '@/lib/utils';
import type { SessionStore } from '@/lib/session-store';
import { tokenLedger } from '@/lib/groq/client';

export async function processSearchPipeline(
  sessionId: string,
  requirement: string,
  advancedFilters: any,
  sessionStore: SessionStore
) {
  let session = await sessionStore.get(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  // Single-user local tool: one search at a time, so a module-level ledger is fine.
  tokenLedger.reset();

  try {
    // Stage 1: Parse Requirement
    session.status = 'analyzing';
    await sessionStore.set(sessionId, session);

    const searchBrief = await parseRequirement(requirement);
    session.searchBrief = searchBrief;
    session.status = 'generating_queries';
    await sessionStore.set(sessionId, session);

    // Stage 2: Generate Queries
    const queries = await generateQueries(searchBrief);
    session.generatedQueries = queries;
    session.status = 'searching';
    await sessionStore.set(sessionId, session);

    // Stage 3: Search with Serper
    // Queries run concurrently — 8 sequential paged fetches dominated total
    // runtime and would blow past a serverless function's duration limit.
    const searches = await Promise.allSettled(
      queries.map(async (query) => ({
        query,
        results: await serperSearchPaged(query.query, LIMITS.resultPagesPerQuery),
      }))
    );

    const allResults = [];
    let lastSearchError: unknown = null;
    let successfulQueries = 0;

    for (const outcome of searches) {
      if (outcome.status === 'rejected') {
        lastSearchError = outcome.reason;
        console.error('Query failed:', outcome.reason);
        continue;
      }

      successfulQueries++;
      const { query, results } = outcome.value;
      for (const result of results) {
        if (isLinkedInProfileUrl(result.url)) {
          allResults.push({ ...result, queryId: query.id, queryFamily: query.family });
        }
      }
    }

    if (successfulQueries === 0) {
      throw new Error(
        `All ${queries.length} searches failed. ${lastSearchError instanceof Error ? lastSearchError.message : ''}`
      );
    }

    session.totalResultsFound = allResults.length;
    session.status = 'deduplicating';
    await sessionStore.set(sessionId, session);

    // Stage 4: Extract Candidate Information
    // Serper returns name/title/company structurally, so this needs no LLM call
    // and therefore cannot be throttled away by the token budget.
    const rawCandidates: Partial<Candidate>[] = [];

    for (const result of allResults) {
      const parsed = parseSearchResult(result);

      rawCandidates.push({
        id: nanoid(),
        name: parsed.name,
        currentDesignation: parsed.currentDesignation,
        currentOrganization: parsed.currentOrganization,
        location: parsed.location,
        linkedinUrl: result.url,
        searchSnippet: result.snippet,
        sourceQueries: [result.queryId],
        queryFamilies: [result.queryFamily],
        extractionConfidence: parsed.extractionConfidence,
      });
    }

    // Stage 5: Deduplicate
    const deduplicatedCandidates = deduplicateCandidates(rawCandidates);
    session.uniqueCandidatesFound = deduplicatedCandidates.length;

    // Stage 6: Score Candidates
    session.status = 'scoring';
    await sessionStore.set(sessionId, session);

    // Deterministic scoring is free, so every candidate gets one.
    const ranked = deduplicatedCandidates
      .map((candidate) => ({
        candidate,
        deterministicScore: calculateDeterministicScore(candidate, searchBrief),
      }))
      .sort((a, b) => b.deterministicScore - a.deterministicScore);

    const forReview = ranked.slice(0, LIMITS.maxCandidatesForEvaluation);
    const remainder = ranked.slice(LIMITS.maxCandidatesForEvaluation);

    const scoredCandidates: Candidate[] = [];
    let evaluationFailures = 0;

    for (let i = 0; i < forReview.length; i += LIMITS.evaluationBatchSize) {
      const batch = forReview.slice(i, i + LIMITS.evaluationBatchSize);
      const inputs: EvaluationInput[] = batch.map(({ candidate, deterministicScore }) => ({
        name: candidate.name,
        designation: candidate.currentDesignation,
        organization: candidate.currentOrganization,
        location: candidate.location,
        snippet: candidate.searchSnippet,
        deterministicScore,
      }));

      let evaluations;
      try {
        evaluations = await evaluateCandidatesBatch(searchBrief, inputs);
      } catch (error) {
        console.error('Batch evaluation failed:', error);
        evaluationFailures += batch.length;
        evaluations = null;
      }

      batch.forEach(({ candidate, deterministicScore }, index) => {
        const evaluation = evaluations?.[index];
        const contextualScore = evaluation?.contextualScore ?? deterministicScore;
        const finalScore =
          deterministicScore * FINAL_SCORE_WEIGHTS.deterministic +
          contextualScore * FINAL_SCORE_WEIGHTS.contextual;

        scoredCandidates.push({
          ...candidate,
          deterministicScore,
          contextualScore,
          finalScore,
          matchStrength: getMatchStrengthFromScore(finalScore),
          confirmedMatches: evaluation?.confirmedMatches ?? [],
          uncertainRequirements: evaluation?.uncertainRequirements ?? [],
          mismatchFlags: evaluation?.mismatchFlags ?? [],
          reasoningSummary:
            evaluation?.reasoningSummary ||
            'Scored on profile signals only; AI review unavailable.',
          selected: false,
        });
      });

      session.candidates = [...scoredCandidates].sort((a, b) => b.finalScore - a.finalScore);
      await sessionStore.set(sessionId, session);
    }

    // Anyone past the review cut still ships, ranked on deterministic signals.
    for (const { candidate, deterministicScore } of remainder) {
      scoredCandidates.push({
        ...candidate,
        deterministicScore,
        contextualScore: deterministicScore,
        finalScore: deterministicScore,
        matchStrength: getMatchStrengthFromScore(deterministicScore),
        confirmedMatches: [],
        uncertainRequirements: [],
        mismatchFlags: [],
        reasoningSummary: 'Ranked on profile signals; not AI-reviewed.',
        selected: false,
      });
    }

    if (evaluationFailures > 0) {
      session.warning =
        `${evaluationFailures} candidate(s) were ranked on profile signals only — ` +
        `the AI review step hit its rate limit. Ranking is still valid, just less nuanced.`;
    }

    // Sort by final score
    scoredCandidates.sort((a, b) => b.finalScore - a.finalScore);

    session.candidates = scoredCandidates;
    session.tokensUsed = tokenLedger.total;
    session.status = 'completed';
    session.completedAt = new Date().toISOString();
    await sessionStore.set(sessionId, session);
  } catch (error) {
    console.error('Pipeline error:', error);
    session.status = 'failed';
    session.error = error instanceof Error ? error.message : 'Unknown error';
    await sessionStore.set(sessionId, session);
  }
}

function getMatchStrengthFromScore(score: number): 'excellent' | 'strong' | 'potential' | 'low' {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'strong';
  if (score >= 60) return 'potential';
  return 'low';
}
