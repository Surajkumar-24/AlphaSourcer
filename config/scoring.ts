export type ScoringProfile = {
  titleMatch: number;
  mustHaveSkillMatch: number;
  experienceSeniority: number;
  location: number;
  companyIndustry: number;
  preferences: number;
  otherSignals: number;
};

export const SCORING_PROFILES: Record<string, ScoringProfile> = {
  Technology: {
    titleMatch: 25,
    mustHaveSkillMatch: 35,
    experienceSeniority: 15,
    location: 10,
    companyIndustry: 10,
    preferences: 3,
    otherSignals: 2,
  },
  Sales: {
    titleMatch: 30,
    mustHaveSkillMatch: 20,
    experienceSeniority: 15,
    location: 15,
    companyIndustry: 15,
    preferences: 3,
    otherSignals: 2,
  },
  Recruitment: {
    titleMatch: 30,
    mustHaveSkillMatch: 25,
    experienceSeniority: 15,
    location: 10,
    companyIndustry: 15,
    preferences: 3,
    otherSignals: 2,
  },
  Finance: {
    titleMatch: 25,
    mustHaveSkillMatch: 30,
    experienceSeniority: 20,
    location: 10,
    companyIndustry: 10,
    preferences: 3,
    otherSignals: 2,
  },
  Operations: {
    titleMatch: 25,
    mustHaveSkillMatch: 25,
    experienceSeniority: 20,
    location: 15,
    companyIndustry: 10,
    preferences: 3,
    otherSignals: 2,
  },
  Generic: {
    titleMatch: 25,
    mustHaveSkillMatch: 30,
    experienceSeniority: 15,
    location: 10,
    companyIndustry: 10,
    preferences: 5,
    otherSignals: 5,
  },
};

export const FINAL_SCORE_WEIGHTS = {
  deterministic: 0.6,
  contextual: 0.4,
};

export const MATCH_STRENGTH_RANGES = {
  excellent: { min: 90, max: 100 },
  strong: { min: 75, max: 89 },
  potential: { min: 60, max: 74 },
  low: { min: 0, max: 59 },
};
