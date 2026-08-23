import { groqRequest, createSystemMessage } from './client';
import { SearchBrief } from '@/types/index';

const PARSE_REQUIREMENT_PROMPT = `Analyze the hiring requirement and extract a structured search brief.

REQUIREMENT:
{requirement}

Return ONLY a valid JSON object (no markdown, no extra text) with this exact structure. Use null for missing values, empty arrays for empty lists:

{
  "primaryTitle": "primary job title or null",
  "alternativeTitles": [],
  "adjacentTitles": [],
  "roleFamily": "Technology",
  "mustHaveSkills": [],
  "goodToHaveSkills": [],
  "skillSynonyms": {},
  "minExperience": null,
  "maxExperience": null,
  "locations": [],
  "locationVariants": [],
  "preferredCompanies": [],
  "excludedCompanies": [],
  "preferredIndustries": [],
  "excludedIndustries": [],
  "excludedTitles": [],
  "excludeKeywords": [],
  "nonNegotiables": [],
  "candidateSummary": "brief description",
  "searchStrategySummary": "sourcing approach summary"
}

RULES:
- Extract ONLY information explicitly stated
- Use null for missing values (not empty strings)
- Keep arrays empty if no items found
- Location normalized (e.g., "Bangalore" not "Blr")
- roleFamily: must be one of: Technology, Sales, Recruitment, Finance, Operations, Marketing, Product, Design, Customer Success, Generic`;

export async function parseRequirement(requirement: string): Promise<SearchBrief> {
  const prompt = PARSE_REQUIREMENT_PROMPT.replace('{requirement}', requirement);

  const messages = [
    {
      role: 'system' as const,
      content: createSystemMessage('recruitment researcher and Boolean search specialist'),
    },
    {
      role: 'user' as const,
      content: prompt,
    },
  ];

  const result = await groqRequest<SearchBrief>(messages, {
    temperature: 0.3,
    maxTokens: 1600,
    jsonMode: true,
  });

  return result;
}
