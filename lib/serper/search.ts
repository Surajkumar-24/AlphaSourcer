import { SearchResult } from '@/types/index';
import { SERPER_CONFIG } from '@/config/models';

export async function serperSearch(query: string, page?: number): Promise<SearchResult[]> {
  if (!SERPER_CONFIG.apiKey) {
    throw new Error('SERPER_API_KEY not configured');
  }

  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_CONFIG.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: query,
        // Free Serper accounts reject num > 10; depth comes from paging instead.
        num: 10,
        type: 'search',
        ...(page && page > 1 ? { page } : {}),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Serper API error: ${error.message || error.error || 'Unknown error'}`);
    }

    const data = await response.json();
    const results = data.organic || [];

    return results.map((result: any) => ({
      title: result.title || '',
      url: result.link || '',
      snippet: result.snippet || '',
      subtitle: result.subtitle || '',
      position: result.position || 0,
    }));
  } catch (error) {
    console.error('Serper search failed:', error);
    throw error;
  }
}

/**
 * Walks several result pages for one query. Free-tier Serper caps a single
 * response at 10 results, so paging is the only way to reach useful recall.
 */
export async function serperSearchPaged(
  query: string,
  pages: number
): Promise<SearchResult[]> {
  const collected: SearchResult[] = [];
  let firstError: unknown = null;

  for (let page = 1; page <= pages; page++) {
    try {
      const results = await serperSearch(query, page);
      if (results.length === 0) break; // exhausted this query
      collected.push(...results);
    } catch (error) {
      if (page === 1) firstError = error;
      break; // a failed page means deeper pages are not worth attempting
    }
  }

  if (collected.length === 0 && firstError) throw firstError;
  return collected;
}

export function isLinkedInProfileUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    if (!hostname.includes('linkedin.com')) {
      return false;
    }

    const pathname = urlObj.pathname.toLowerCase();

    // Check for LinkedIn profile URL pattern: /in/username
    if (pathname.match(/^\/in\/[a-z0-9\-]+\/?$/)) {
      return true;
    }

    // Reject company pages, jobs, posts, groups
    if (pathname.includes('/company/') || pathname.includes('/jobs/') || pathname.includes('/feed/') || pathname.includes('/groups/')) {
      return false;
    }

    return false;
  } catch {
    return false;
  }
}

export function normalizeLinkedInUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Remove query parameters and trailing slash
    return `${urlObj.origin}${urlObj.pathname}`.replace(/\/$/, '').toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}
