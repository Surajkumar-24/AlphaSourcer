import { groqRequest, createSystemMessage } from './client';
import { SearchBrief, SearchQuery } from '@/types/index';
import { nanoid } from '@/lib/utils';

const GENERATE_QUERIES_PROMPT = `Generate 6-10 diverse X-ray search queries for finding LinkedIn profiles.

SEARCH BRIEF:
{brief}

Return ONLY a JSON object with a "queries" array:

{
  "queries": [
    {"query": "site:linkedin.com/in/ \\"Senior Backend Engineer\\" Python AWS", "family": "precision", "strategyReason": "Exact title plus must-have skills"},
    {"query": "site:linkedin.com/in/ Python Django AWS microservices", "family": "skill_led", "strategyReason": "Skills as primary discovery"}
  ]
}

RULES:
- Every query MUST start with: site:linkedin.com/in/
- family must be one of: precision, alternative_title, skill_led, adjacent_role, company_led, recall_expansion
- Each query under 150 characters
- No duplicate queries
- Mix strict and broad searches; use OR for variations and quotes for exact phrases
- Generate 6-10 queries, each with a distinct sourcing angle
- Keep strategyReason under 8 words`;

export async function generateQueries(brief: SearchBrief): Promise<SearchQuery[]> {
  const briefJson = JSON.stringify(brief, null, 2);
  const prompt = GENERATE_QUERIES_PROMPT.replace('{brief}', briefJson);

  const messages = [
    {
      role: 'system' as const,
      content: createSystemMessage('Boolean search specialist and X-ray sourcing expert'),
    },
    {
      role: 'user' as const,
      content: prompt,
    },
  ];

  const response = await groqRequest<{ queries: Array<Omit<SearchQuery, 'id'>> }>(messages, {
    temperature: 0.5,
    maxTokens: 2500,
    jsonMode: true,
  });

  const queries = response?.queries ?? [];

  if (queries.length === 0) {
    throw new Error('No search queries were generated');
  }

  return queries
    .filter((q) => typeof q?.query === 'string' && q.query.includes('site:linkedin.com/in/'))
    .map((q) => ({
      ...q,
      id: nanoid(),
    }));
}
