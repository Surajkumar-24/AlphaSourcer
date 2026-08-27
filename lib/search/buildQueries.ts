import { SearchBrief, SearchQuery } from '@/types/index';
import { nanoid } from '@/lib/utils';

const CITY_ALIASES: Record<string, string[]> = {
  bangalore: ['Bengaluru'],
  bengaluru: ['Bangalore'],
  mumbai: ['Bombay'],
  bombay: ['Mumbai'],
  gurgaon: ['Gurugram'],
  gurugram: ['Gurgaon'],
  delhi: ['New Delhi', 'NCR'],
};

/** `(Bangalore OR Bengaluru)` — one clause covering every spelling in use. */
function locationClause(brief: SearchBrief): string {
  const names = new Set<string>();

  for (const raw of [...brief.locations, ...brief.locationVariants]) {
    const loc = raw.trim();
    if (!loc) continue;
    names.add(loc);
    for (const alias of CITY_ALIASES[loc.toLowerCase()] ?? []) names.add(alias);
  }

  if (names.size === 0) return '';
  const list = [...names];
  return list.length === 1 ? list[0] : `(${list.map((n) => `"${n}"`).join(' OR ')})`;
}

function quoted(title: string): string {
  const clean = title.trim().replace(/"/g, '');
  return clean.includes(' ') ? `"${clean}"` : clean;
}

/**
 * Builds X-ray queries directly from the brief instead of asking the model for
 * them. Every query is guaranteed to name an accepted job title and the
 * requested location, which is what the relevance gate later enforces — an
 * LLM-written query could satisfy neither, and cost a call to find out.
 */
export function buildQueries(brief: SearchBrief): SearchQuery[] {
  const where = locationClause(brief);
  const seen = new Set<string>();
  const queries: SearchQuery[] = [];

  const push = (
    query: string,
    family: SearchQuery['family'],
    strategyReason: string
  ) => {
    const normalized = query.replace(/\s+/g, ' ').trim();
    if (seen.has(normalized.toLowerCase())) return;
    seen.add(normalized.toLowerCase());
    queries.push({ id: nanoid(), query: normalized, family, strategyReason });
  };

  const base = 'site:linkedin.com/in/';
  const primary = brief.primaryTitle?.trim();

  // Titles the relevance gate will accept, most important first.
  const titles = [primary, ...brief.alternativeTitles]
    .filter((t): t is string => Boolean(t && t.trim()))
    .slice(0, 7);

  // Named employers are the strongest constraint a brief can carry, so search
  // them explicitly and first. Without this the company list is extracted and
  // then never used, and results come from arbitrary employers.
  // Explicit employers first; industry-derived ones fill the remaining budget.
  const named = brief.preferredCompanies.filter((c) => c.trim());
  const inferred = (brief.inferredCompanies ?? []).filter(
    (c) => c.trim() && !named.some((n) => n.toLowerCase() === c.toLowerCase())
  );
  const companies = [...named, ...inferred].slice(0, 10);
  const titleQueryBudget = 6;
  const titleAlternation =
    titles.length > 1
      ? `(${titles.slice(0, 3).map(quoted).join(' OR ')})`
      : titles.map(quoted).join('');

  // Student sourcing runs on degree and college, not employer: a BBA student's
  // headline names their course and institution, rarely a job title.
  const degrees = (brief.educationQualifications ?? []).filter((d) => d.trim()).slice(0, 4);
  const institutions = (brief.inferredInstitutions ?? []).filter((i) => i.trim()).slice(0, 5);
  const isStudentSearch = brief.studentStatus === 'pursuing';

  if (degrees.length > 0) {
    // Without a domain word these become "every BBA student in Mumbai". Fall
    // back to the distinctive part of the job title ("HR" from "HR Intern").
    const GENERIC = new Set([
      'intern', 'internship', 'trainee', 'executive', 'associate', 'assistant',
      'officer', 'specialist', 'analyst', 'manager', 'senior', 'junior',
    ]);
    const titleDomain = (primary ?? '')
      .split(/\s+/)
      .filter((w) => w && !GENERIC.has(w.toLowerCase()))
      .join(' ');

    const field = brief.preferredIndustries[0] || brief.mustHaveSkills[0] || titleDomain;

    for (const degree of degrees) {
      push(
        `${base} ${quoted(degree)} ${field ? quoted(field) : ''} ${where}`.trim(),
        'education_led',
        `${degree} students in ${brief.locations[0] ?? 'target area'}`
      );
    }

    // The exact title still matters when they already hold an internship.
    if (primary) {
      push(
        `${base} ${quoted(primary)} ${quoted(degrees[0])} ${where}`.trim(),
        'education_led',
        `${primary} with ${degrees[0]}`
      );
    }
  }

  for (const institution of institutions) {
    const domain =
      brief.preferredIndustries[0] ||
      (primary ?? '')
        .split(/\s+/)
        .filter((w) => w && !['intern', 'trainee', 'executive'].includes(w.toLowerCase()))
        .join(' ');

    push(
      `${base} ${quoted(institution)} ${domain ? quoted(domain) : quoted(degrees[0] ?? '')}`.trim(),
      'education_led',
      `Campus: ${institution}`
    );
  }

  for (const company of isStudentSearch ? [] : companies) {
    push(
      `${base} ${quoted(company)} ${titleAlternation}`.trim(),
      'company_led',
      `Target employer: ${company}`
    );
  }

  // The brief may describe a sector rather than name every employer
  // ("or any such companies selling HRTech solutions").
  for (const industry of isStudentSearch ? [] : brief.preferredIndustries.slice(0, 2)) {
    push(
      `${base} ${titleAlternation} ${quoted(industry)} ${where}`.trim(),
      'company_led',
      `Sector: ${industry}`
    );
  }

  for (const title of titles) {
    push(
      `${base} ${quoted(title)} ${where}`.trim(),
      title === primary ? 'precision' : 'alternative_title',
      title === primary ? 'Exact title in target location' : `Equivalent title: ${title}`
    );
  }

  // A couple of skill-qualified variants of the exact title, to reach profiles
  // whose headline buries the title behind other text.
  if (primary) {
    for (const skill of brief.mustHaveSkills.slice(0, 2)) {
      push(
        `${base} ${quoted(primary)} ${where} ${quoted(skill)}`.trim(),
        'skill_led',
        `Title plus ${skill}`
      );
    }
  }

  // Without a location the searches above are already broad; with one, add a
  // location-free pass so strong profiles that omit their city are still found.
  if (where && primary) {
    push(`${base} ${quoted(primary)}`.trim(), 'recall_expansion', 'Title without location');
  }

  // Company queries must not crowd out the title searches; budget for both.
  const slots = isStudentSearch ? degrees.length + institutions.length : companies.length;
  // Hard ceiling: every query costs Serper credits, which are finite.
  const cap = Math.min(slots > 0 ? slots + 2 + titleQueryBudget : 10, 15);
  return queries.slice(0, cap);
}
