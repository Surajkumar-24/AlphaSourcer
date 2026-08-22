import { SearchSession, Candidate, SearchBrief } from '@/types/index';
import { parseRequirement } from '@/lib/groq/parseRequirement';
import { generateQueries } from '@/lib/groq/generateQueries';
import { serperSearch, isLinkedInProfileUrl } from '@/lib/serper/search';
import { extractCandidate } from '@/lib/groq/extractCandidate';
import { evaluateCandidate } from '@/lib/groq/evaluateCandidate';
import { calculateDeterministicScore } from '@/lib/scoring/deterministic';
import { deduplicateCandidates } from '@/lib/candidates/deduplicate';
import { LIMITS } from '@/config/limits';
import { MATCH_STRENGTH_RANGES, FINAL_SCORE_WEIGHTS } from '@/config/scoring';
import { nanoid } from '@/lib/utils';

export async function processSearchPipeline(
  sessionId: string,
  requirement: string,
  advancedFilters: any,
  activeSessions: Map<string, SearchSession>
) {
  const session = activeSessions.get(sessionId)!;

  try {
    // Stage 1: Parse Requirement
    session.status = 'analyzing';
    activeSessions.set(sessionId, session);

    const searchBrief = await parseRequirement(requirement);
    session.searchBrief = searchBrief;
    session.status = 'generating_queries';
    activeSessions.set(sessionId, session);

    // Stage 2: Generate Queries
    const queries = await generateQueries(searchBrief);
    session.generatedQueries = queries;
    session.status = 'searching';
    activeSessions.set(sessionId, session);

    // Stage 3: Search with Serper
    const allResults = [];
    for (const query of queries) {
      try {
        const results = await serperSearch(query.query);
        for (const result of results) {
          if (isLinkedInProfileUrl(result.url)) {
            allResults.push({
              ...result,
              queryId: query.id,
              queryFamily: query.family,
            });
          }
        }
      } catch (error) {
        console.error(`Query ${query.id} failed:`, error);
      }
    }

    session.totalResultsFound = allResults.length;
    session.status = 'deduplicating';
    activeSessions.set(sessionId, session);

    // Stage 4: Extract Candidate Information
    const rawCandidates: Partial<Candidate>[] = [];

    for (const result of allResults) {
      try {
        const extraction = await extractCandidate(result.title, result.snippet, result.url);

        if (extraction.extractionConfidence < 30) {
          continue; // Skip low-confidence extractions
        }

        rawCandidates.push({
          name: extraction.name,
          currentDesignation: extraction.currentDesignation,
          currentOrganization: extraction.currentOrganization,
          linkedinUrl: result.url,
          searchSnippet: result.snippet,
          sourceQueries: [result.queryId],
          queryFamilies: [result.queryFamily],
          extractionConfidence: extraction.extractionConfidence,
        });
      } catch (error) {
        console.error('Extraction failed:', error);
      }
    }

    // Stage 5: Deduplicate
    const deduplicatedCandidates = deduplicateCandidates(rawCandidates);
    session.uniqueCandidatesFound = deduplicatedCandidates.length;

    // Stage 6: Score Candidates
    session.status = 'scoring';
    activeSessions.set(sessionId, session);

    const scoredCandidates: Candidate[] = [];

    for (const candidate of deduplicatedCandidates.slice(0, LIMITS.maxCandidatesForEvaluation)) {
      try {
        // Deterministic score
        const deterministicScore = calculateDeterministicScore(candidate, searchBrief!);

        // AI Contextual evaluation
        const contextualEvaluation = await evaluateCandidate(
          searchBrief!,
          candidate.name,
          candidate.currentDesignation,
          candidate.currentOrganization,
          candidate.searchSnippet,
          deterministicScore
        );

        // Final score
        const finalScore =
          deterministicScore * FINAL_SCORE_WEIGHTS.deterministic +
          contextualEvaluation.contextualScore * FINAL_SCORE_WEIGHTS.contextual;

        const matchStrength = getMatchStrengthFromScore(finalScore);

        const scoredCandidate: Candidate = {
          ...candidate,
          deterministicScore,
          contextualScore: contextualEvaluation.contextualScore,
          finalScore,
          matchStrength,
          confirmedMatches: contextualEvaluation.confirmedMatches,
          uncertainRequirements: contextualEvaluation.uncertainRequirements,
          mismatchFlags: contextualEvaluation.mismatchFlags,
          reasoningSummary: contextualEvaluation.reasoningSummary,
          selected: false,
        };

        scoredCandidates.push(scoredCandidate);
      } catch (error) {
        console.error('Scoring failed for candidate:', error);
        // Still include candidate with deterministic score only
        const deterministicScore = calculateDeterministicScore(candidate, searchBrief!);
        const matchStrength = getMatchStrengthFromScore(deterministicScore);

        scoredCandidates.push({
          ...candidate,
          deterministicScore,
          contextualScore: deterministicScore,
          finalScore: deterministicScore,
          matchStrength,
          selected: false,
        });
      }
    }

    // Sort by final score
    scoredCandidates.sort((a, b) => b.finalScore - a.finalScore);

    session.candidates = scoredCandidates;
    session.status = 'completed';
    session.completedAt = new Date().toISOString();
    activeSessions.set(sessionId, session);
  } catch (error) {
    console.error('Pipeline error:', error);
    session.status = 'failed';
    session.error = error instanceof Error ? error.message : 'Unknown error';
    activeSessions.set(sessionId, session);
  }
}

function getMatchStrengthFromScore(score: number): 'excellent' | 'strong' | 'potential' | 'low' {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'strong';
  if (score >= 60) return 'potential';
  return 'low';
}
