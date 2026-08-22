import { groqRequest, createSystemMessage } from './client';
import { SearchBrief } from '@/types/index';

const PARSE_REQUIREMENT_PROMPT = `Analyze the hiring requirement and extract a structured search brief.

REQUIREMENT:
{requirement}

Return a JSON object with this exact structure:
{
  "primaryTitle": "string or null",
  "alternativeTitles": ["array of alternative titles"],
  "adjacentTitles": ["array of adjacent/feeder roles"],
  "roleFamily": "Technology|Sales|Recruitment|Finance|Operations|Marketing|Product|Design|Customer Success|Generic",
  "mustHaveSkills": ["array of must-have skills"],
  "goodToHaveSkills": ["array of good-to-have skills"],
  "skillSynonyms": {"skill": ["synonym1", "synonym2"]},
  "minExperience": number or null,
  "maxExperience": number or null,
  "locations": ["array of primary locations"],
  "locationVariants": ["array of location name variants"],
  "preferredCompanies": ["array of preferred companies"],
  "excludedCompanies": ["array of companies to exclude"],
  "preferredIndustries": ["array of preferred industries"],
  "excludedIndustries": ["array of industries to exclude"],
  "excludedTitles": ["array of titles to exclude"],
  "excludeKeywords": ["array of keywords that indicate wrong candidate"],
  "nonNegotiables": ["array of critical requirements"],
  "candidateSummary": "brief description of ideal candidate",
  "searchStrategySummary": "summary of sourcing approach"
}

IMPORTANT RULES:
- Never invent requirements not in the original requirement
- Mark inferred information with reasoning
- Use null for missing required information
- Keep arrays empty if no items apply
- Focus on precision over expansion
- Location should be normalized (e.g., "Bangalore" not "Blr")`;

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
    maxTokens: 2000,
    jsonMode: true,
  });

  return result;
}
