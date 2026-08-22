import { groqRequest, createSystemMessage } from './client';

export interface CandidateExtractionResult {
  name: string;
  currentDesignation: string | null;
  currentOrganization: string | null;
  extractionConfidence: number;
  evidence: string[];
}

const EXTRACT_CANDIDATE_PROMPT = `Extract candidate information from the search result.

SEARCH TITLE: {title}
SEARCH SNIPPET: {snippet}
LINKEDIN URL: {url}

Return a JSON object:
{
  "name": "candidate name or 'Unknown' if not found",
  "currentDesignation": "job title or null if not found",
  "currentOrganization": "company name or null if not found",
  "extractionConfidence": 0-100,
  "evidence": ["list of evidence snippets"]
}

RULES:
- Extract ONLY from the provided title and snippet
- Never fabricate company names, designations, or identities
- Confidence: 100 if all fields are clear, 50-70 if partial, 0-40 if ambiguous
- If information is unclear, use null
- Confidence < 60 should mark fields as null
- Evidence should list the exact text that supports each field`;

export async function extractCandidate(
  title: string,
  snippet: string,
  url: string
): Promise<CandidateExtractionResult> {
  const prompt = EXTRACT_CANDIDATE_PROMPT.replace('{title}', title)
    .replace('{snippet}', snippet)
    .replace('{url}', url);

  const messages = [
    {
      role: 'system' as const,
      content: createSystemMessage(
        'data extraction specialist focused on accuracy and avoiding hallucination'
      ),
    },
    {
      role: 'user' as const,
      content: prompt,
    },
  ];

  const result = await groqRequest<CandidateExtractionResult>(messages, {
    temperature: 0.1,
    maxTokens: 500,
    jsonMode: true,
  });

  return result;
}
