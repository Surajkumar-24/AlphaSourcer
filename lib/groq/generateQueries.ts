import { groqRequest, createSystemMessage } from './client';
import { SearchBrief, SearchQuery } from '@/types/index';
import { nanoid } from '@/lib/utils';

const GENERATE_QUERIES_PROMPT = `GENERATE LINKEDIN X-RAY SEARCH QUERIES.

JOB BRIEF: {brief}

EXAMPLE OUTPUT:
{"queries":[{"query":"site:linkedin.com/in/ \"Ontologist\" India","family":"precision","strategyReason":"exact title"},{"query":"site:linkedin.com/in/ Ontologist taxonomy","family":"skill_led","strategyReason":"title plus skill"}]}

RECALL IS THE PRIORITY. Over-constrained queries return almost nothing.

HARD RULES:
1. Every query starts with: site:linkedin.com/in/
2. AT MOST ONE quoted phrase per query — normally the job title. Never stack
   several quoted phrases together; "A" "B" "C" matches virtually no profiles.
3. AT MOST 3 terms after the site: prefix, counting the location.
4. Include at least 2 deliberately broad queries: just the title plus location,
   or a single alternative title plus location.
5. Use alternative titles (same profession) freely. Use adjacent/feeder titles
   in AT MOST ONE query — they are a different profession and mostly get
   filtered out later.
6. Repeat the location in most queries when the brief names one.
7. Generate 8 queries, each a distinct angle, no duplicates.
8. strategyReason: under 8 words.

Return ONLY the JSON object.`;

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
