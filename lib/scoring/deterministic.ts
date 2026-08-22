import { Candidate, SearchBrief } from '@/types/index';
import { SCORING_PROFILES } from '@/config/scoring';

export function calculateDeterministicScore(
  candidate: {
    name: string;
    currentDesignation: string | null;
    currentOrganization: string | null;
    searchSnippet: string;
  },
  brief: SearchBrief
): number {
  const profile = SCORING_PROFILES[brief.roleFamily] || SCORING_PROFILES.Generic;
  let score = 0;

  // Title Match (25-35%)
  const titleScore = calculateTitleScore(
    candidate.currentDesignation,
    brief.primaryTitle,
    brief.alternativeTitles,
    brief.adjacentTitles,
    brief.excludedTitles
  );
  score += (titleScore / 100) * profile.titleMatch;

  // Must-Have Skills Match (30-35%)
  const skillScore = calculateSkillScore(
    candidate.currentDesignation,
    candidate.searchSnippet,
    brief.mustHaveSkills,
    brief.goodToHaveSkills
  );
  score += (skillScore / 100) * profile.mustHaveSkillMatch;

  // Experience/Seniority (15-20%)
  const experienceScore = calculateExperienceScore(
    candidate.currentDesignation,
    brief.minExperience,
    brief.maxExperience
  );
  score += (experienceScore / 100) * profile.experienceSeniority;

  // Location (10-15%)
  const locationScore = calculateLocationScore(
    candidate.searchSnippet,
    brief.locations
  );
  score += (locationScore / 100) * profile.location;

  // Company/Industry (10-15%)
  const companyScore = calculateCompanyScore(
    candidate.currentOrganization,
    brief.preferredCompanies,
    brief.excludedCompanies
  );
  score += (companyScore / 100) * profile.companyIndustry;

  // Preferences (3-5%)
  const preferenceScore = calculatePreferenceScore(
    candidate.searchSnippet,
    brief.preferredIndustries,
    brief.excludedIndustries
  );
  score += (preferenceScore / 100) * profile.preferences;

  // Other signals (2-5%)
  const signalScore = calculateSignalScore(
    candidate.searchSnippet,
    brief.excludeKeywords
  );
  score += (signalScore / 100) * profile.otherSignals;

  return Math.min(100, Math.max(0, score));
}

function calculateTitleScore(
  currentTitle: string | null,
  primaryTitle: string | null,
  alternativeTitles: string[],
  adjacentTitles: string[],
  excludedTitles: string[]
): number {
  if (!currentTitle) return 0;

  const titleLower = currentTitle.toLowerCase();

  // Check excluded titles first
  if (excludedTitles.some((t) => titleLower.includes(t.toLowerCase()))) {
    return 0;
  }

  // Exact or close match with primary title
  if (primaryTitle && titleLower.includes(primaryTitle.toLowerCase())) {
    return 100;
  }

  // Match with alternative titles
  if (alternativeTitles.some((t) => titleLower.includes(t.toLowerCase()))) {
    return 85;
  }

  // Match with adjacent titles
  if (adjacentTitles.some((t) => titleLower.includes(t.toLowerCase()))) {
    return 60;
  }

  // Partial relevance for generic terms
  const relevanceKeywords = ['engineer', 'developer', 'manager', 'lead', 'director', 'specialist'];
  if (relevanceKeywords.some((k) => titleLower.includes(k))) {
    return 30;
  }

  return 10;
}

function calculateSkillScore(
  currentTitle: string | null,
  snippet: string,
  mustHaveSkills: string[],
  goodToHaveSkills: string[]
): number {
  const content = `${currentTitle || ''} ${snippet}`.toLowerCase();

  let matchCount = 0;
  let totalRequired = mustHaveSkills.length;

  for (const skill of mustHaveSkills) {
    if (content.includes(skill.toLowerCase())) {
      matchCount++;
    }
  }

  if (totalRequired === 0) return 50;

  const mustHavePercentage = (matchCount / totalRequired) * 100;

  // Bonus for good-to-have skills
  let goodToHaveMatches = 0;
  for (const skill of goodToHaveSkills) {
    if (content.includes(skill.toLowerCase())) {
      goodToHaveMatches++;
    }
  }

  const goodToHaveBonus = goodToHaveSkills.length > 0 ? (goodToHaveMatches / goodToHaveSkills.length) * 20 : 0;

  return Math.min(100, mustHavePercentage + goodToHaveBonus);
}

function calculateExperienceScore(
  currentTitle: string | null,
  minExperience: number | null,
  maxExperience: number | null
): number {
  if (!currentTitle) return 30;

  const titleLower = currentTitle.toLowerCase();

  // Senior/Lead roles
  if (titleLower.includes('senior') || titleLower.includes('lead') || titleLower.includes('principal')) {
    return maxExperience && maxExperience < 5 ? 60 : 90;
  }

  // Mid-level
  if (titleLower.includes('mid') || titleLower.includes('engineer ii') || titleLower.includes('manager')) {
    return 70;
  }

  // Junior roles
  if (titleLower.includes('junior') || titleLower.includes('associate') || titleLower.includes('analyst')) {
    return 40;
  }

  return 50;
}

function calculateLocationScore(snippet: string, locations: string[]): number {
  if (locations.length === 0) return 50;

  const snippetLower = snippet.toLowerCase();

  for (const location of locations) {
    if (snippetLower.includes(location.toLowerCase())) {
      return 100;
    }
  }

  // Partial credit if location is mentioned but not exact match
  if (locations[0] && snippet.includes(locations[0][0])) {
    return 50;
  }

  return 20;
}

function calculateCompanyScore(
  currentOrganization: string | null,
  preferredCompanies: string[],
  excludedCompanies: string[]
): number {
  if (!currentOrganization) return 40;

  const orgLower = currentOrganization.toLowerCase();

  // Check excluded companies
  if (excludedCompanies.some((c) => orgLower.includes(c.toLowerCase()))) {
    return 0;
  }

  // Check preferred companies
  if (preferredCompanies.some((c) => orgLower.includes(c.toLowerCase()))) {
    return 100;
  }

  return 50;
}

function calculatePreferenceScore(
  snippet: string,
  preferredIndustries: string[],
  excludedIndustries: string[]
): number {
  if (preferredIndustries.length === 0) return 50;

  const snippetLower = snippet.toLowerCase();

  // Check excluded industries
  for (const industry of excludedIndustries) {
    if (snippetLower.includes(industry.toLowerCase())) {
      return 10;
    }
  }

  // Check preferred industries
  for (const industry of preferredIndustries) {
    if (snippetLower.includes(industry.toLowerCase())) {
      return 80;
    }
  }

  return 30;
}

function calculateSignalScore(snippet: string, excludeKeywords: string[]): number {
  if (excludeKeywords.length === 0) return 50;

  const snippetLower = snippet.toLowerCase();

  // Check for negative keywords
  for (const keyword of excludeKeywords) {
    if (snippetLower.includes(keyword.toLowerCase())) {
      return 10;
    }
  }

  return 70;
}
