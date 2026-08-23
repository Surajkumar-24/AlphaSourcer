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

/**
 * Alternative titles name the SAME job ("Ontologist" ~ "Taxonomist") and stand
 * on their own. Adjacent titles are neighbouring roles people move in from
 * ("Data Scientist"), which are only in scope with corroborating skills —
 * treating the two alike floods the shortlist with the wrong profession.
 */
function titleTokens(brief: SearchBrief): {
  core: Set<string>;
  alternates: Set<string>;
  feeders: Set<string>;
} {
  const core = tokenize(brief.primaryTitle || '');
  const alternates = new Set<string>();
  const feeders = new Set<string>();

  for (const title of brief.alternativeTitles) {
    tokenize(title).forEach((t) => alternates.add(t));
  }
  for (const title of brief.adjacentTitles) {
    tokenize(title).forEach((t) => {
      if (!alternates.has(t)) feeders.add(t);
    });
  }
  return { core, alternates, feeders };
}

// Cities that imply their country, so "Bangalore" in a brief still accepts a
// profile listed as "Bengaluru, Karnataka, India".
const CITY_COUNTRY: Record<string, string> = {
  bangalore: 'india', bengaluru: 'india', mumbai: 'india', bombay: 'india',
  delhi: 'india', gurgaon: 'india', gurugram: 'india', noida: 'india',
  hyderabad: 'india', chennai: 'india', pune: 'india', kolkata: 'india',
  ahmedabad: 'india', jaipur: 'india', kochi: 'india', indore: 'india',
  london: 'united kingdom', manchester: 'united kingdom',
  singapore: 'singapore', dubai: 'united arab emirates',
  berlin: 'germany', munich: 'germany', paris: 'france',
  toronto: 'canada', vancouver: 'canada', sydney: 'australia', melbourne: 'australia',
};

const CITY_ALIASES: Record<string, string[]> = {
  bangalore: ['bengaluru'], bengaluru: ['bangalore'],
  mumbai: ['bombay'], bombay: ['mumbai'],
  gurgaon: ['gurugram'], gurugram: ['gurgaon'],
};

/** Location terms the brief will accept, expanded with implied countries and aliases. */
function acceptedLocations(brief: SearchBrief): Set<string> {
  const accepted = new Set<string>();
  for (const raw of [...brief.locations, ...brief.locationVariants]) {
    const loc = normalize(raw);
    if (!loc) continue;
    accepted.add(loc);
    if (CITY_COUNTRY[loc]) accepted.add(CITY_COUNTRY[loc]);
    for (const alias of CITY_ALIASES[loc] ?? []) accepted.add(alias);
  }
  return accepted;
}

/**
 * Only rejects a location we can positively identify as elsewhere. An unknown
 * or unparseable location is never treated as a mismatch.
 */
export function locationMismatch(
  candidateLocation: string | null | undefined,
  brief: SearchBrief
): boolean {
  const accepted = acceptedLocations(brief);
  if (accepted.size === 0) return false;

  const loc = normalize(candidateLocation || '');
  if (!loc) return false;

  for (const term of accepted) {
    if (loc.includes(term)) return false;
  }

  // No direct hit. Fall back to the city the profile names, in case the brief
  // targets a country and the profile only lists a city.
  for (const part of loc.split(' ')) {
    const country = CITY_COUNTRY[part];
    if (country && accepted.has(country)) return false;
  }

  return true;
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
    location?: string | null;
    searchSnippet: string;
  },
  brief: SearchBrief
): RelevanceVerdict {
  const candidateLocation = candidate.location || null;
  const roleName = brief.primaryTitle || 'Role';
  const designation = candidate.currentDesignation || '';
  const { core, alternates, feeders } = titleTokens(brief);

  const label = (tier: string) => `${tier} - ${roleName}`;

  // Wrong geography outranks every other signal.
  if (locationMismatch(candidateLocation, brief)) {
    return {
      tier: 'excluded',
      tierLabel: 'Removed',
      reason: `Based in ${candidateLocation} - outside ${brief.locations.join('/')}`,
      keep: false,
    };
  }

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
  const feederMatches = [...feeders].filter((t) => titleSet.has(t));

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

  // A feeder role (Data Scientist for an Ontologist search) needs the target
  // skills to be visible before it counts as in scope.
  if (feederMatches.length > 0 && mustSkills.length === 0 && titleSkills.length === 0) {
    return {
      tier: 'excluded',
      tierLabel: 'Removed',
      reason: `${designation.trim()} - adjacent profession with no ${brief.mustHaveSkills.slice(0, 2).join('/')} evidence`,
      keep: false,
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
