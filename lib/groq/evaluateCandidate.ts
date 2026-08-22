import { groqRequest, createSystemMessage } from './client';
import { SearchBrief } from '@/types/index';

export interface CandidateEvaluation {
  contextualScore: number;
  matchStrength: 'strong' | 'moderate' | 'weak';
  confirmedMatches: string[];
  uncertainRequirements: string[];
  mismatchFlags: string[];
  reasoningSummary: string;
}

const EVALUATE_CANDIDATE_PROMPT = `Evaluate candidate relevance to the hiring requirement.

HIRING REQUIREMENT:
{brief}

CANDIDATE INFORMATION:
- Name: {name}
- Current Title: {designation}
- Current Organization: {organization}
- Search Snippet: {snippet}
- Deterministic Score: {deterministicScore}

Based ONLY on available evidence, answer:
1. How relevant is this candidate to the requirement?
2. Which requirements are explicitly supported by available information?
3. Which requirements remain uncertain?
4. Does the current title match or represent an adjacent role?
5. How strong is the overall fit?

Return JSON:
{
  "contextualScore": 0-100,
  "matchStrength": "strong|moderate|weak",
  "confirmedMatches": ["list of confirmed requirement matches"],
  "uncertainRequirements": ["list of requirements without clear evidence"],
  "mismatchFlags": ["list of potential mismatches or concerns"],
  "reasoningSummary": "2-3 sentence explanation of scoring"
}

CRITICAL RULES:
- Score only on available evidence
- Missing information ≠ mismatch
- Be conservative with strong ratings
- Mark uncertain fields as such
- Distinguish confirmed from inferred`;

export async function evaluateCandidate(
  brief: SearchBrief,
  candidateName: string,
  designation: string | null,
  organization: string | null,
  snippet: string,
  deterministicScore: number
): Promise<CandidateEvaluation> {
  const briefJson = JSON.stringify(brief, null, 2);
  const prompt = EVALUATE_CANDIDATE_PROMPT.replace('{brief}', briefJson)
    .replace('{name}', candidateName)
    .replace('{designation}', designation || 'Unknown')
    .replace('{organization}', organization || 'Unknown')
    .replace('{snippet}', snippet)
    .replace('{deterministicScore}', deterministicScore.toString());

  const messages = [
    {
      role: 'system' as const,
      content: createSystemMessage(
        'recruitment researcher evaluating candidate-requirement fit with emphasis on evidence-based assessment'
      ),
    },
    {
      role: 'user' as const,
      content: prompt,
    },
  ];

  const result = await groqRequest<CandidateEvaluation>(messages, {
    temperature: 0.3,
    maxTokens: 1000,
    jsonMode: true,
  });

  return result;
}
