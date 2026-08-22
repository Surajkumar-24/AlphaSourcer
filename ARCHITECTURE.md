# AlphaSourcer Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INTERFACE (Next.js)                  │
│  Home → Requirement Input → Search Results → Excel Export    │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────┐
│              API ROUTES (Next.js Server)                     │
│  POST /api/search          (Initiate search)                │
│  GET /api/search?sessionId (Poll status)                    │
│  POST /api/export          (Generate Excel)                 │
└──────────────────┬───────────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
┌──────────────────────┐  ┌──────────────────────┐
│   GROQ API           │  │   SERPER API         │
│  (LLM Processing)    │  │  (Google Search)     │
│                      │  │                      │
│ • Parse requirement  │  │ • Search queries     │
│ • Generate queries   │  │ • Retrieve results   │
│ • Extract info       │  │ • Filter LinkedIn    │
│ • Evaluate relevance │  │                      │
└──────────┬───────────┘  └──────────┬───────────┘
           │                        │
           └────────────┬───────────┘
                        ▼
         ┌──────────────────────────────┐
         │   PIPELINE PROCESSOR          │
         │                              │
         │ 1. Parse → Brief             │
         │ 2. Query → Searches          │
         │ 3. Search → Results          │
         │ 4. Deduplicate → Candidates  │
         │ 5. Score → Relevance         │
         │ 6. Rank → Final List         │
         └──────────┬───────────────────┘
                    ▼
         ┌──────────────────────────────┐
         │   RESULTS STORAGE            │
         │ (Map<sessionId, session>)    │
         └──────────────────────────────┘
```

---

## Data Flow

### 1. Requirement Input

**User** → "Looking for a Senior Backend Engineer..."

**Frontend** (`app/page.tsx`):
- Captures requirement text
- Optionally captures advanced filters
- Sends to `/api/search` POST endpoint

**Backend** (`app/api/search/route.ts`):
- Validates input
- Creates SearchSession (status: "created")
- Triggers `processSearchPipeline()` in background
- Returns sessionId to frontend

---

### 2. AI Analysis Pipeline

#### Stage 1: Requirement Parsing
```
Input: Raw requirement text
↓
Groq API: parseRequirement()
↓
Output: SearchBrief (structured data)
```

**SearchBrief contains:**
- Primary title
- Alternative titles
- Adjacent titles (feeder roles)
- Role family classification
- Must-have and good-to-have skills
- Skill synonyms
- Experience range
- Locations and variants
- Company preferences
- Industry preferences
- Non-negotiables
- Candidate summary

---

#### Stage 2: X-Ray Query Generation
```
Input: SearchBrief
↓
Groq API: generateQueries()
↓
Output: Array of SearchQuery objects
```

**Query Families Generated:**
- Precision Search (exact title + skills + location)
- Alternative Title Search (alternatives + skills)
- Skill-Led Search (skills-primary discovery)
- Adjacent Role Search (neighboring roles)
- Company-Led Search (if companies provided)
- Recall Expansion (broader criteria)

**Result:** 6–10 diverse queries with reasoning

---

#### Stage 3: Serper Search
```
For each SearchQuery:
  Input: site:linkedin.com/in/ + search terms
  ↓
  Serper API: Execute Google search
  ↓
  Output: Array of SearchResult objects
  ↓
  Filter: isLinkedInProfileUrl()
```

**Result:** Valid LinkedIn profile URLs only

---

#### Stage 4: Candidate Extraction
```
For each SearchResult:
  Input: Title, Snippet, URL
  ↓
  Groq API: extractCandidate()
  ↓
  Output: Extracted name, designation, organization
  ↓
  Confidence check (skip if < 30%)
```

**Result:** Candidate objects with available information

---

#### Stage 5: Deduplication
```
Raw candidates list
  ↓
normalizeLinkedInUrl() for each
  ↓
Group by normalized URL
  ↓
Merge information from duplicates
  ↓
Secondary check: name + organization
```

**Result:** Unique candidates

---

#### Stage 6: Scoring Pipeline

##### 6a. Deterministic Scoring
```
For each Candidate:
  Score breakdown (0-100):
  - Title Match (25 points) → Role family dependent
  - Skill Match (30 points) → Must-have + good-to-have
  - Experience (15 points) → Seniority indicators
  - Location (10 points) → Geographic match
  - Company (10 points) → Preferred/excluded
  - Preferences (5 points) → Industry + misc
  - Signals (5 points) → Exclude keywords check
```

**Uses:** `calculateDeterministicScore()` with role-specific profiles

**Result:** Score 0–100

---

##### 6b. Contextual AI Evaluation
```
Input: Candidate + Brief + Deterministic Score
  ↓
Groq API: evaluateCandidate()
  ↓
Outputs:
  - Contextual score (0-100)
  - Match strength (strong/moderate/weak)
  - Confirmed matches (evidence-based)
  - Uncertain requirements
  - Mismatch flags
  - Reasoning summary
```

**Result:** Detailed evaluation with explanations

---

##### 6c. Final Score Calculation
```
Final Score = (Deterministic × 0.60) + (Contextual × 0.40)
```

**Match Strength Assignment:**
- 90–100 → Excellent
- 75–89 → Strong
- 60–74 → Potential
- <60 → Low

---

#### Stage 7: Sorting & Ranking
```
Sort by final score (descending)
  ↓
Group by match strength
  ↓
Ready for display
```

---

### 3. Results Display

**Frontend** (`app/search/[id]/page.tsx`):
- Polls `/api/search?sessionId=...` every 1 second
- Shows progress during processing
- Displays results when complete
- Allows filtering by strength
- Supports selection and sorting

---

### 4. Excel Export

**Frontend** (`components/candidates/ExportButton.tsx`):
- Collects selected candidates
- Calls `POST /api/export`
- Receives Excel file
- Downloads to user's device

**Backend** (`app/api/export/route.ts`):
- Receives candidate array
- Calls `generateExcelFile()`
- Uses ExcelJS library
- Returns file as attachment

**Excel Structure:**
- Summary sheet (search info)
- Candidates sheet (detailed list)
- Clickable LinkedIn URLs
- Formatted header row

---

## Type System

### SearchSession
```typescript
{
  id: string;
  status: 'created' | 'analyzing' | 'generating_queries' | 'searching' | 'deduplicating' | 'scoring' | 'completed' | 'failed';
  rawRequirement: string;
  searchBrief: SearchBrief | null;
  generatedQueries: SearchQuery[];
  totalResultsFound: number;
  uniqueCandidatesFound: number;
  candidates: Candidate[];
  completedAt?: string;
  error?: string;
  createdAt: string;
}
```

### SearchBrief
```typescript
{
  primaryTitle: string | null;
  alternativeTitles: string[];
  adjacentTitles: string[];
  roleFamily: string;
  mustHaveSkills: string[];
  goodToHaveSkills: string[];
  skillSynonyms: Record<string, string[]>;
  minExperience: number | null;
  maxExperience: number | null;
  locations: string[];
  locationVariants: string[];
  preferredCompanies: string[];
  excludedCompanies: string[];
  preferredIndustries: string[];
  excludedIndustries: string[];
  excludedTitles: string[];
  excludeKeywords: string[];
  nonNegotiables: string[];
  candidateSummary: string;
  searchStrategySummary: string;
}
```

### Candidate
```typescript
{
  id: string;
  name: string;
  currentDesignation: string | null;
  currentOrganization: string | null;
  linkedinUrl: string;
  searchSnippet: string;
  sourceQueries: string[];
  queryFamilies: string[];
  extractionConfidence: number;
  deterministicScore: number;
  contextualScore: number;
  finalScore: number;
  matchStrength: 'excellent' | 'strong' | 'potential' | 'low';
  confirmedMatches: string[];
  uncertainRequirements: string[];
  mismatchFlags: string[];
  reasoningSummary: string;
  selected: boolean;
}
```

---

## Component Architecture

### Pages

| Page | Path | Purpose |
|------|------|---------|
| Home | `app/page.tsx` | Search input & advanced options |
| Results | `app/search/[id]/page.tsx` | Search progress & results |

### Components

| Component | Location | Purpose |
|-----------|----------|---------|
| Header | `components/Header.tsx` | AlphaNom branding |
| RequirementInput | `components/search/RequirementInput.tsx` | Main search input |
| AdvancedFilters | `components/search/AdvancedFilters.tsx` | Structured filtering |
| SearchProgress | `components/search/SearchProgress.tsx` | Pipeline progress display |
| CandidateResults | `components/candidates/CandidateResults.tsx` | Results orchestration |
| CandidateTable | `components/candidates/CandidateTable.tsx` | Candidate list & details |
| CandidateFilters | `components/candidates/CandidateFilters.tsx` | Filtering & sorting |
| ExportButton | `components/candidates/ExportButton.tsx` | Excel download |

---

## Library Organization

### `/lib/groq/*`
Groq API integration:
- `client.ts` — HTTP client for Groq API
- `parseRequirement.ts` — Requirement → SearchBrief
- `generateQueries.ts` — SearchBrief → Queries
- `extractCandidate.ts` — Search result → Candidate info
- `evaluateCandidate.ts` — Candidate → Contextual score

### `/lib/serper/*`
Serper search integration:
- `search.ts` — Execute Google searches, URL validation

### `/lib/scoring/*`
Candidate scoring:
- `deterministic.ts` — Rule-based scoring (60% weight)

### `/lib/candidates/*`
Candidate processing:
- `deduplicate.ts` — Remove duplicate profiles

### `/lib/export/*`
Excel generation:
- `excel.ts` — ExcelJS wrapper for file generation

### `/lib/search/*`
Pipeline orchestration:
- `pipeline.ts` — Coordinates all stages

### `/lib/utils.ts`
Utilities:
- ID generation
- Color mapping
- Text formatting

---

## Configuration

### `/config/models.ts`
API endpoints and model names

### `/config/scoring.ts`
Scoring profiles and weights (role-dependent)

### `/config/limits.ts`
Rate limits and constraints

---

## Error Handling

### Groq API Errors
- Caught at each API call
- Session marked as 'failed'
- User sees: "We couldn't process the requirement"

### Serper API Errors
- Caught per-query
- Continues with successful queries
- Partial results used

### Extraction Errors
- Low-confidence extractions skipped
- Missing information handled gracefully
- No hallucination

### Scoring Errors
- Fallback to deterministic score if contextual fails
- Candidate still ranked

---

## Security

### API Keys
- Stored in `.env.local` (server-side only)
- Never exposed to client
- All API calls from Next.js server routes

### Input Validation
- Requirement length check (<5000 chars)
- LinkedIn URL validation
- Search query sanitization

### Data Privacy
- No personal data stored (except within session)
- No email/phone extraction
- No authentication required
- Stateless architecture

---

## Performance Considerations

### Search Pipeline
- **Groq API calls:** ~4–5 (parsing, queries, evaluations)
- **Serper API calls:** 6–10 (one per query)
- **Total time:** 30–60 seconds typical
- **Parallel processing:** Serper queries could be parallelized

### Candidate Evaluation
- Evaluates up to 100 candidates max
- Skips low-confidence extractions
- Stops early if enough candidates

### Memory
- Sessions stored in Map (in-memory)
- Only one session at a time per user (MVP)
- Could migrate to Redis/database for multi-user

---

## Future Extensibility

### Phase 2: Persistence
- Save searches to database
- Candidate list history
- Search templates

### Phase 3: Advanced Features
- Email/phone enrichment (external service)
- ATS integration (API connectors)
- Team collaboration (auth + sharing)

### Phase 4: Scaling
- Background job queue (Celery/BullMQ)
- Redis for session storage
- Database for permanent records
- Multi-user support

---

## Deployment Architecture

### Vercel (Recommended)
```
Frontend (Next.js) + Backend API (Serverless Functions)
  ↓
Groq API (HTTP)
Serper API (HTTP)
```

### Self-Hosted
```
Node.js Server
  ├── Next.js (Frontend + API)
  ├── In-memory storage (Map)
  └── External API calls
```

---

This architecture prioritizes:
- **Simplicity** — Single Next.js deployment
- **Relevance** — Multi-angle search + hybrid scoring
- **Transparency** — Clear scoring explanations
- **Extensibility** — Modular, configurable design
