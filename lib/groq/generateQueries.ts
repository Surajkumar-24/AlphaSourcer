import { groqRequest, createSystemMessage } from './client';
import { SearchBrief, SearchQuery } from '@/types/index';
import { nanoid } from '@/lib/utils';

const GENERATE_QUERIES_PROMPT = `Based on the search brief, generate 6-10 diverse X-ray search queries for finding LinkedIn profiles.

SEARCH BRIEF:
{brief}

Generate queries using multiple families:
1. Precision Search - exact title + must-have skills + location
2. Alternative Title Search - alternative titles + skills
3. Skill-Led Search - skills as primary discovery mechanism
4. Adjacent Role Search - neighboring roles + skills
5. Company-Led Search - preferred companies (if provided)
6. Recall Expansion - broader criteria for discovery

Return a JSON array of query objects:
[
  {
    "query": "site:linkedin.com/in/ [search terms]",
    "family": "precision|alternative_title|skill_led|adjacent_role|company_led|recall_expansion",
    "strategyReason": "reason for this specific query"
  }
]

IMPORTANT RULES:
- All queries must start with: site:linkedin.com/in/
- Do not generate duplicate queries
- Keep queries concise (avoid query length > 150 chars)
- Mix strict and broad searches
- Use OR operators for variations strategically
- Use quotes only for exact phrase matches when beneficial
- Generate 6-10 unique queries with different strategies
- Each query should have a distinct sourcing angle
- Consider location variants if provided
- Include skill synonyms where relevant`;

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

  const queriesData = await groqRequest<Array<Omit<SearchQuery, 'id'>>>(messages, {
    temperature: 0.5,
    maxTokens: 2000,
    jsonMode: true,
  });

  return queriesData.map((q) => ({
    ...q,
    id: nanoid(),
  }));
}
