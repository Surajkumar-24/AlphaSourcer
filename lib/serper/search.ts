import { SearchResult } from '@/types/index';
import { SERPER_CONFIG } from '@/config/models';

export async function serperSearch(query: string): Promise<SearchResult[]> {
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
        num: 50,
        type: 'search',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Serper API error: ${error.error || 'Unknown error'}`);
    }

    const data = await response.json();
    const results = data.organic || [];

    return results.map((result: any) => ({
      title: result.title || '',
      url: result.link || '',
      snippet: result.snippet || '',
      position: result.position || 0,
    }));
  } catch (error) {
    console.error('Serper search failed:', error);
    throw error;
  }
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
