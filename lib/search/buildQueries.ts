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

  return queries.slice(0, 10);
}
