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

// Words that identify the sector when a brief names an industry rather than
// listing every employer in it.
const INDUSTRY_TERMS: Record<string, string[]> = {
  recruitment: ['recruit', 'staffing', 'talent', 'hiring', 'headhunt', 'placement', 'manpower'],
  staffing: ['staffing', 'recruit', 'talent', 'manpower', 'workforce'],
  hrtech: ['hrtech', 'hr tech', 'hrms', 'hcm', 'people ops', 'human resource', 'hr software', 'ats'],
  saas: ['saas', 'software', 'platform', 'product'],
  fintech: ['fintech', 'payments', 'lending', 'banking'],
};

function industryTerms(industries: string[]): string[] {
  const terms = new Set<string>();
  for (const raw of industries) {
    const key = normalize(raw).replace(/\s+/g, '');
    terms.add(normalize(raw));
    for (const term of INDUSTRY_TERMS[key] ?? []) terms.add(term);
  }
  return [...terms].filter(Boolean);
}

// Words indicating someone is currently studying, which is how a student's
// profile identifies itself when it carries no job title at all.
const STUDENT_MARKERS = [
  'student', 'pursuing', 'undergraduate', 'aspiring', 'final year', 'fresher',
  'graduate 20', 'batch of', 'class of',
];

/** Seniority words, used when a brief constrains years of experience. */
const SENIOR_MARKERS = ['senior', 'sr', 'lead', 'principal', 'staff', 'head', 'director', 'vp', 'vice president', 'chief', 'manager', 'architect'];
const JUNIOR_MARKERS = ['intern', 'trainee', 'fresher', 'junior', 'jr', 'associate', 'graduate', 'entry'];

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
  const titleLower = normalize(designation);

  // A brief capped at a year or two is asking for entry level; a Director is a
  // mismatch however well the rest of the profile reads.
  const entryLevelWanted =
    brief.studentStatus === 'pursuing' ||
    (brief.maxExperience !== null && brief.maxExperience <= 2);

  if (entryLevelWanted) {
    const senior = SENIOR_MARKERS.find((m) => titleLower.includes(m));
    if (senior && !JUNIOR_MARKERS.some((j) => titleLower.includes(j))) {
      return {
        tier: 'excluded',
        tierLabel: 'Removed',
        reason: `${designation.trim()} - too senior for ${brief.studentStatus === 'pursuing' ? 'a student profile' : `under ${brief.maxExperience} year(s)`}`,
        keep: false,
      };
    }
  }

  if (brief.minExperience !== null && brief.minExperience >= 5) {
    const junior = JUNIOR_MARKERS.find((m) => titleLower.includes(m));
    if (junior) {
      return {
        tier: 'excluded',
        tierLabel: 'Removed',
        reason: `${designation.trim()} - too junior for ${brief.minExperience}+ years`,
        keep: false,
      };
    }
  }

  // Employer / sector evidence. When a brief names companies or an industry,
  // a matching job title at an unrelated employer is not what was asked for.
  const wantsCompany =
    brief.studentStatus !== 'pursuing' &&
    (brief.preferredCompanies.length > 0 || (brief.inferredCompanies ?? []).length > 0);
  const wantsIndustry =
    brief.studentStatus !== 'pursuing' && brief.preferredIndustries.length > 0;

  let employerNote = '';
  let employerUnverified = false;

  if (wantsCompany || wantsIndustry) {
    const org = normalize(candidate.currentOrganization || '');
    const context = `${org} ${normalize(candidate.searchSnippet)}`;

    const namedCompany = [
      ...brief.preferredCompanies,
      ...(brief.inferredCompanies ?? []),
    ].find((c) => {
      const n = normalize(c);
      return n.length > 2 && context.includes(n);
    });

    const sectorTerm = industryTerms(brief.preferredIndustries).find(
      (t) => t.length > 2 && context.includes(t)
    );

    if (namedCompany) {
      employerNote = ` at ${namedCompany}`;
    } else if (sectorTerm) {
      employerNote = ` - ${brief.preferredIndustries[0]} background`;
    } else if (!candidate.currentOrganization) {
      // The employer is absent from the search result, not proven different.
      // Dropping these treats missing information as a mismatch and was
      // discarding roughly half of an otherwise valid shortlist.
      employerUnverified = true;
      employerNote = ' - employer not listed in the profile';
    } else {
      return {
        tier: 'excluded',
        tierLabel: 'Removed',
        reason: `${designation.trim()} at ${candidate.currentOrganization} - not from ${
          wantsCompany ? 'a target company' : brief.preferredIndustries.join('/')
        }`,
        keep: false,
      };
    }
  }

  // Exact target title: every distinctive word of it appears in the job title.
  if (containsAllTokens(titleSet, core)) {
    return {
      tier: 'core',
      tierLabel: label('Core'),
      reason: `${designation.trim()}${employerNote}${nameNote}`,
      keep: true,
    };
  }

  // A recognised synonym for the same profession, matched in full.
  const matchedAlternate = alternates.find((alt) => containsAllTokens(titleSet, alt.tokens));
  if (matchedAlternate) {
    if (employerUnverified) {
      return {
        tier: 'skill',
        tierLabel: `Unconfirmed employer - ${roleName}`,
        reason: `${designation.trim()}${employerNote} - equivalent to ${matchedAlternate.label}${nameNote}`,
        keep: true,
      };
    }
    return {
      tier: 'adjacent',
      tierLabel: label('Close match'),
      reason: `${designation.trim()}${employerNote} - equivalent to ${matchedAlternate.label}${nameNote}`,
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
