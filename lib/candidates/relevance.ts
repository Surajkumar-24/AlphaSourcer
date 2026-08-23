import { SearchBrief } from '@/types/index';

export type RelevanceTier = 'core' | 'adjacent' | 'skill' | 'excluded';

export interface RelevanceVerdict {
  tier: RelevanceTier;
  /** e.g. "Core - Ontologist" — the label shown in the export. */
  tierLabel: string;
  /** Short human explanation for the Shortlist/Removed sheets. */
  reason: string;
  keep: boolean;
}

// Seniority and filler words carry no signal about *what* the role is.
const STOPWORDS = new Set([
  'senior', 'sr', 'junior', 'jr', 'lead', 'principal', 'staff', 'chief', 'head',
  'associate', 'assistant', 'the', 'and', 'of', 'at', 'for', 'in', 'a', 'an',
  'i', 'ii', 'iii', 'iv', '1', '2', '3', '4', 'level', 'grade',
]);

/** Compound role words that Google renders inconsistently. */
const COMPOUND_FIXES: Array<[RegExp, string]> = [
  [/\bback[\s-]?end\b/g, 'backend'],
  [/\bfront[\s-]?end\b/g, 'frontend'],
  [/\bfull[\s-]?stack\b/g, 'fullstack'],
  [/\bdev[\s-]?ops\b/g, 'devops'],
  [/\bmachine[\s-]?learning\b/g, 'ml'],
  [/\bdata[\s-]?science\b/g, 'datascience'],
];

// Words that describe the same job function, so a title match should still count.
const SYNONYMS: Record<string, string> = {
  developer: 'engineer',
  programmer: 'engineer',
  dev: 'engineer',
  engineering: 'engineer',
  architect: 'engineer',
};

export function normalize(text: string): string {
  let out = ` ${(text || '').toLowerCase()} `;
  for (const [pattern, replacement] of COMPOUND_FIXES) out = out.replace(pattern, replacement);
  return out.replace(/[^a-z0-9+#.\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function tokenize(text: string): Set<string> {
  const tokens = normalize(text)
    .split(' ')
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
    .map((t) => SYNONYMS[t] ?? t);
  return new Set(tokens);
}

/** Distinctive words from the target titles — "backend", "engineer", "ontologist". */
function titleTokens(brief: SearchBrief): { core: Set<string>; alternates: Set<string> } {
  const core = tokenize(brief.primaryTitle || '');
  const alternates = new Set<string>();
  for (const title of [...brief.alternativeTitles, ...brief.adjacentTitles]) {
    tokenize(title).forEach((t) => alternates.add(t));
  }
  return { core, alternates };
}

/** Tolerates singular/plural drift: brief says "knowledge graphs", title says "knowledge graph". */
function containsSkill(text: string, skill: string): boolean {
  const s = normalize(skill);
  if (s.length < 2) return false;
  if (text.includes(s)) return true;

  const singular = s.endsWith('s') ? s.slice(0, -1) : s;
  const plural = s.endsWith('s') ? s : `${s}s`;
  return text.includes(singular) || text.includes(plural);
}

function skillHits(haystack: string, skills: string[]): string[] {
  const text = normalize(haystack);
  return skills.filter((skill) => containsSkill(text, skill));
}

/**
 * Decides whether a candidate is plausibly in scope, using only the text we
 * already have. Runs on every candidate at zero token cost, which is what makes
 * it viable as a blanket filter rather than a top-N pass.
 */
export function assessRelevance(
  candidate: {
    name: string;
    currentDesignation: string | null;
    currentOrganization: string | null;
    searchSnippet: string;
  },
  brief: SearchBrief
): RelevanceVerdict {
  const roleName = brief.primaryTitle || 'Role';
  const designation = candidate.currentDesignation || '';
  const { core, alternates } = titleTokens(brief);

  const label = (tier: string) => `${tier} - ${roleName}`;

  // A designation is required; without one there is nothing to judge against.
  if (!designation.trim()) {
    const skills = skillHits(candidate.searchSnippet, brief.mustHaveSkills);
    if (skills.length >= 2) {
      return {
        tier: 'skill',
        tierLabel: label('Skill match'),
        reason: `No title listed; profile shows ${skills.slice(0, 3).join(', ')}`,
        keep: true,
      };
    }
    return {
      tier: 'excluded',
      tierLabel: 'Removed',
      reason: 'No designation found and no matching skills',
      keep: false,
    };
  }

  const titleSet = tokenize(designation);
  const coreMatches = [...core].filter((t) => titleSet.has(t));
  const altMatches = [...alternates].filter((t) => titleSet.has(t));

  const haystack = `${designation} ${candidate.searchSnippet}`;
  const mustSkills = skillHits(haystack, brief.mustHaveSkills);
  const niceSkills = skillHits(haystack, brief.goodToHaveSkills);
  // A required skill in the job title itself is far stronger evidence than one
  // mentioned in passing in the profile blurb.
  const titleSkills = skillHits(designation, [
    ...brief.mustHaveSkills,
    ...brief.goodToHaveSkills,
  ]);

  const nameNote = candidate.name === 'Unknown' ? ' - candidate name missing in source' : '';

  // Every distinctive word of the target title is present.
  if (core.size > 0 && coreMatches.length === core.size) {
    return {
      tier: 'core',
      tierLabel: label('Core'),
      reason: `${designation.trim()}${nameNote}`,
      keep: true,
    };
  }

  // Most of the title matches, or it matches a stated alternative/adjacent role.
  const strongPartial = core.size > 1 && coreMatches.length >= core.size - 1;
  if (strongPartial || altMatches.length > 0) {
    return {
      tier: 'adjacent',
      tierLabel: label('Adjacent'),
      reason: `${designation.trim()}${nameNote}`,
      keep: true,
    };
  }

  // Title diverges, but the required skills are demonstrably present.
  if (titleSkills.length > 0 || mustSkills.length >= 2 || (mustSkills.length === 1 && coreMatches.length > 0)) {
    return {
      tier: 'skill',
      tierLabel: label('Skill match'),
      reason: `${designation.trim()} - matches ${(titleSkills.length ? titleSkills : mustSkills).slice(0, 3).join(', ')}${nameNote}`,
      keep: true,
    };
  }

  // Nothing lines up: no title overlap, no required skills.
  if (coreMatches.length === 0 && mustSkills.length === 0) {
    const detail = niceSkills.length
      ? `only peripheral skills (${niceSkills.slice(0, 2).join(', ')})`
      : 'no overlap with target title or required skills';
    return {
      tier: 'excluded',
      tierLabel: 'Removed',
      reason: `${designation.trim()} - ${detail}`,
      keep: false,
    };
  }

  // A single generic word in common ("engineer") is too weak on its own.
  return {
    tier: 'excluded',
    tierLabel: 'Removed',
    reason: `${designation.trim()} - only a generic title overlap, no required skills`,
    keep: false,
  };
}
