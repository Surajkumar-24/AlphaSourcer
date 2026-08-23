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
 * Each accepted title is kept as its own token set. Matching requires EVERY
 * token of some title to be present — flattening them into one pool let a
 * single shared word like "engineer" admit an unrelated profession.
 */
function titleMatchers(brief: SearchBrief): {
  core: Set<string>;
  alternates: Array<{ label: string; tokens: Set<string> }>;
} {
  const core = tokenize(brief.primaryTitle || '');
  const alternates = brief.alternativeTitles
    .map((label) => ({ label, tokens: tokenize(label) }))
    .filter((t) => t.tokens.size > 0);
  return { core, alternates };
}

/**
 * Same word, different ending: ontology/ontologist, taxonomy/taxonomist. A
 * shared prefix of six or more characters is specific enough to be safe —
 * "data" and "database" share only four and stay distinct.
 */
const MIN_STEM = 6;

function sameStem(a: string, b: string): boolean {
  if (a === b) return true;
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  if (shorter.length < MIN_STEM) return false;
  return longer.startsWith(shorter.slice(0, MIN_STEM)) && shorter.startsWith(shorter.slice(0, MIN_STEM));
}

function hasToken(titleSet: Set<string>, token: string): boolean {
  if (titleSet.has(token)) return true;
  for (const candidate of titleSet) {
    if (sameStem(candidate, token)) return true;
  }
  return false;
}

/** True when every distinctive word of `required` appears in `titleSet`. */
function containsAllTokens(titleSet: Set<string>, required: Set<string>): boolean {
  if (required.size === 0) return false;
  for (const token of required) {
    if (!hasToken(titleSet, token)) return false;
  }
  return true;
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

/**
 * Accepted location terms, and whether the brief is city-specific. Naming a
 * city means that city — a brief for Bangalore should not return Chennai.
 */
function acceptedLocations(brief: SearchBrief): { terms: Set<string>; cityLevel: boolean } {
  const terms = new Set<string>();
  let cityLevel = false;

  for (const raw of [...brief.locations, ...brief.locationVariants]) {
    const loc = normalize(raw);
    if (!loc) continue;
    terms.add(loc);

    if (CITY_COUNTRY[loc]) {
      // A recognised city: demand the city itself, plus its known aliases.
      cityLevel = true;
      for (const alias of CITY_ALIASES[loc] ?? []) terms.add(alias);
    } else {
      // Treat as a region/country: also accept cities known to sit inside it.
      for (const [city, country] of Object.entries(CITY_COUNTRY)) {
        if (country === loc) terms.add(city);
      }
    }
  }

  return { terms, cityLevel };
}

/**
 * Only rejects a location we can positively identify as elsewhere. An unknown
 * or unparseable location is never treated as a mismatch.
 */
export function locationMismatch(
  candidateLocation: string | null | undefined,
  brief: SearchBrief
): boolean {
  const { terms, cityLevel } = acceptedLocations(brief);
  if (terms.size === 0) return false;

  const loc = normalize(candidateLocation || '');
  if (!loc) return false;

  for (const term of terms) {
    if (loc.includes(term)) return false;
  }

  // Country-level briefs still accept a profile that names only its city.
  if (!cityLevel) {
    for (const part of loc.split(' ')) {
      const country = CITY_COUNTRY[part];
      if (country && terms.has(country)) return false;
    }
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
  const { core, alternates } = titleMatchers(brief);

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

  // Title-driven by design: without a designation there is no title to match.
  if (!designation.trim()) {
    return {
      tier: 'excluded',
      tierLabel: 'Removed',
      reason: 'No job title found in the profile',
      keep: false,
    };
  }

  const titleSet = tokenize(designation);
  const nameNote = candidate.name === 'Unknown' ? ' - candidate name missing in source' : '';

  // Exact target title: every distinctive word of it appears in the job title.
  if (containsAllTokens(titleSet, core)) {
    return {
      tier: 'core',
      tierLabel: label('Core'),
      reason: `${designation.trim()}${nameNote}`,
      keep: true,
    };
  }

  // A recognised synonym for the same profession, matched in full.
  const matchedAlternate = alternates.find((alt) => containsAllTokens(titleSet, alt.tokens));
  if (matchedAlternate) {
    return {
      tier: 'adjacent',
      tierLabel: label('Close match'),
      reason: `${designation.trim()} - equivalent to ${matchedAlternate.label}${nameNote}`,
      keep: true,
    };
  }

  // Anything else is a different job, however strong the profile may be.
  return {
    tier: 'excluded',
    tierLabel: 'Removed',
    reason: `${designation.trim()} - not ${roleName} or a recognised equivalent`,
    keep: false,
  };
}
