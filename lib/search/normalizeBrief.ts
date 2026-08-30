import { SearchBrief } from '@/types/index';

const ROLE_FAMILIES = [
  'Technology', 'Sales', 'Recruitment', 'Finance', 'Operations',
  'Marketing', 'Product', 'Design', 'Customer Success', 'Generic',
] as const;

function asArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string' && v.trim() !== '');
  }
  // Models occasionally answer a list field with a single string.
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * The model returns valid JSON but not always the shape we asked for: list
 * fields come back as null, numbers as strings, enums as free text. Untreated,
 * that either throws ("locations is not iterable") or silently drops a
 * constraint, which was making roughly half of all searches unreliable.
 */
export function normalizeBrief(raw: any): SearchBrief {
  const brief = raw && typeof raw === 'object' ? raw : {};

  const family = asText(brief.roleFamily);
  const roleFamily = (ROLE_FAMILIES as readonly string[]).includes(family)
    ? (family as SearchBrief['roleFamily'])
    : 'Generic';

  const status = asText(brief.studentStatus).toLowerCase();

  let minExperience = asNumber(brief.minExperience);
  let maxExperience = asNumber(brief.maxExperience);
  // A reversed range would silently exclude everyone.
  if (minExperience !== null && maxExperience !== null && minExperience > maxExperience) {
    [minExperience, maxExperience] = [maxExperience, minExperience];
  }

  const skillSynonyms =
    brief.skillSynonyms && typeof brief.skillSynonyms === 'object' && !Array.isArray(brief.skillSynonyms)
      ? (brief.skillSynonyms as Record<string, string[]>)
      : {};

  return {
    primaryTitle: asText(brief.primaryTitle) || null,
    alternativeTitles: asArray(brief.alternativeTitles),
    adjacentTitles: asArray(brief.adjacentTitles),
    roleFamily,
    mustHaveSkills: asArray(brief.mustHaveSkills),
    goodToHaveSkills: asArray(brief.goodToHaveSkills),
    skillSynonyms,
    minExperience,
    maxExperience,
    locations: asArray(brief.locations),
    locationVariants: asArray(brief.locationVariants),
    preferredCompanies: asArray(brief.preferredCompanies),
    inferredCompanies: asArray(brief.inferredCompanies),
    excludedCompanies: asArray(brief.excludedCompanies),
    preferredIndustries: asArray(brief.preferredIndustries),
    excludedIndustries: asArray(brief.excludedIndustries),
    excludedTitles: asArray(brief.excludedTitles),
    excludeKeywords: asArray(brief.excludeKeywords),
    nonNegotiables: asArray(brief.nonNegotiables),
    educationQualifications: asArray(brief.educationQualifications),
    studentStatus: status === 'pursuing' || status === 'graduate' ? status : null,
    inferredInstitutions: asArray(brief.inferredInstitutions),
    candidateSummary: asText(brief.candidateSummary),
    searchStrategySummary: asText(brief.searchStrategySummary),
  };
}
