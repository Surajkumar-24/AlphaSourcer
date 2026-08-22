import { Candidate } from '@/types/index';
import { normalizeLinkedInUrl } from '@/lib/serper/search';
import { nanoid } from '@/lib/utils';

export function deduplicateCandidates(candidates: Partial<Candidate>[]): Candidate[] {
  const urlMap = new Map<string, Candidate>();
  const nameOrgMap = new Map<string, Candidate>();

  for (const candidate of candidates) {
    if (!candidate.linkedinUrl) continue;

    const normalizedUrl = normalizeLinkedInUrl(candidate.linkedinUrl);

    // Primary deduplication by URL
    if (urlMap.has(normalizedUrl)) {
      const existing = urlMap.get(normalizedUrl)!;
      // Merge if current candidate has better information
      if (candidate.name && !existing.name) {
        existing.name = candidate.name;
      }
      if (candidate.currentDesignation && !existing.currentDesignation) {
        existing.currentDesignation = candidate.currentDesignation;
      }
      if (candidate.currentOrganization && !existing.currentOrganization) {
        existing.currentOrganization = candidate.currentOrganization;
      }
      // Merge source queries
      if (candidate.sourceQueries) {
        existing.sourceQueries = [...new Set([...existing.sourceQueries, ...candidate.sourceQueries])];
      }
      if (candidate.queryFamilies) {
        existing.queryFamilies = [...new Set([...existing.queryFamilies, ...candidate.queryFamilies])];
      }
      continue;
    }

    const fullCandidate: Candidate = {
      id: nanoid(),
      name: candidate.name || 'Unknown',
      currentDesignation: candidate.currentDesignation || null,
      currentOrganization: candidate.currentOrganization || null,
      linkedinUrl: normalizedUrl,
      searchSnippet: candidate.searchSnippet || '',
      sourceQueries: candidate.sourceQueries || [],
      queryFamilies: candidate.queryFamilies || [],
      extractionConfidence: candidate.extractionConfidence || 0,
      deterministicScore: candidate.deterministicScore || 0,
      contextualScore: candidate.contextualScore || 0,
      finalScore: candidate.finalScore || 0,
      matchStrength: candidate.matchStrength || 'low',
      confirmedMatches: candidate.confirmedMatches || [],
      uncertainRequirements: candidate.uncertainRequirements || [],
      mismatchFlags: candidate.mismatchFlags || [],
      reasoningSummary: candidate.reasoningSummary || '',
      selected: false,
    };

    urlMap.set(normalizedUrl, fullCandidate);

    // Secondary deduplication by name + organization
    const key = `${fullCandidate.name}||${fullCandidate.currentOrganization || 'unknown'}`;
    if (!nameOrgMap.has(key)) {
      nameOrgMap.set(key, fullCandidate);
    }
  }

  return Array.from(urlMap.values());
}
