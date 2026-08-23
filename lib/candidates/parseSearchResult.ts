import { SearchResult } from '@/types/index';

export interface ParsedCandidate {
  name: string;
  currentDesignation: string | null;
  currentOrganization: string | null;
  location: string | null;
  extractionConfidence: number;
}

// Google renders LinkedIn subtitles as "Location · Title · Company".
const SUBTITLE_SEPARATOR = /\s*[·•]\s*/;

// A LinkedIn result title reads "Name - Headline".
const NAME_SEPARATOR = ' - ';

function clean(value: string | undefined | null): string {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function cleanName(raw: string): string {
  const name = clean(raw)
    .replace(/\s*\([^)]*\)/g, '') // drop "(Aspiring Analyst)" style asides
    .replace(/[.,|]+$/, '')
    .trim();

  // Headlines leaking into the name slot are not usable identities.
  if (!name || name.length > 60 || /[|]/.test(name)) return '';
  return name;
}

function looksLikeLocation(value: string): boolean {
  return /,/.test(value) || /\b(area|region|district|greater)\b/i.test(value);
}

/**
 * Pulls candidate fields out of a search result without calling an LLM.
 * Serper already returns this data structurally, so parsing it here keeps the
 * pipeline off the Groq token budget and out of rate-limit territory.
 */
export function parseSearchResult(result: SearchResult): ParsedCandidate {
  const title = clean(result.title);
  const subtitle = clean(result.subtitle);

  const titleParts = title.split(NAME_SEPARATOR);
  const name = cleanName(titleParts[0] || '');
  const headline = clean(titleParts.slice(1).join(NAME_SEPARATOR));

  let currentDesignation: string | null = null;
  let currentOrganization: string | null = null;
  let location: string | null = null;
  let confidence = 0;

  if (subtitle) {
    const parts = subtitle.split(SUBTITLE_SEPARATOR).map(clean).filter(Boolean);

    if (parts.length >= 3) {
      location = parts[0];
      currentDesignation = parts[1];
      currentOrganization = parts.slice(2).join(' ');
      confidence = 90;
    } else if (parts.length === 2) {
      if (looksLikeLocation(parts[0])) {
        location = parts[0];
        currentDesignation = parts[1];
      } else {
        currentDesignation = parts[0];
        currentOrganization = parts[1];
      }
      confidence = 70;
    }
  }

  // No subtitle: fall back to the headline half of the result title.
  if (!currentDesignation && headline) {
    const firstSegment = clean(headline.split(/[|•·]/)[0]);
    const atMatch = firstSegment.match(/^(.*?)\s+at\s+(.+)$/i);

    if (atMatch) {
      currentDesignation = clean(atMatch[1]) || null;
      currentOrganization = clean(atMatch[2]) || null;
      confidence = 60;
    } else {
      currentDesignation = firstSegment || null;
      confidence = 50;
    }
  }

  if (!name) confidence = Math.min(confidence, 20);

  return {
    name: name || 'Unknown',
    currentDesignation: currentDesignation || null,
    currentOrganization: currentOrganization || null,
    location,
    extractionConfidence: name ? confidence : Math.min(confidence, 20),
  };
}
