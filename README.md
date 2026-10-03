# AlphaSourcer

**AI-powered candidate sourcing agent by AlphaNom.**

Describe who you're looking for. AlphaSourcer builds the search strategy, runs intelligent X-ray searches against LinkedIn via Google, scores and ranks the most relevant candidates, and exports a recruiter-ready shortlist.

## Quick Start

### Prerequisites

- Node.js 20+ and npm
- Groq API key ([Get one](https://console.groq.com))
- Serper API key ([Get one](https://serper.dev))

### Installation

```bash
git clone https://github.com/chandupatil07/AlphaSourcer.git
cd AlphaSourcer
npm install
```

### Environment Setup

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your API keys:

```env
GROQ_API_KEY=your_groq_api_key
SERPER_API_KEY=your_serper_api_key
```

For Vercel / serverless deployment, also set:

```env
UPSTASH_REDIS_REST_URL=your_upstash_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_token
```

### Running Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How It Works

### 1. Requirement Input

Enter a natural language hiring requirement:

> "Looking for a Senior Backend Engineer with 4–7 years of experience in Python, Django, AWS. Location: Bangalore only."

### 2. AI Parsing

Groq LLM parses the requirement and extracts:
- Primary and alternative job titles
- Must-have and good-to-have skills
- Experience range
- Location preferences and country
- Company and industry preferences/exclusions

### 3. X-Ray Query Generation

The system deterministically generates 6–10 diverse Boolean search queries:
- **Precision** — exact title + skills + location
- **Alternative Title** — alternative titles + skills
- **Skill-Led** — one probe per must-have skill (quoted, for provenance)
- **Company-Led** — preferred companies + title
- **Education-Led** — for fresher/student searches
- **Recall Expansion** — broader criteria for coverage

### 4. Rate-Limited LinkedIn Search

Serper API executes each query with rate limiting (~4.5 req/s) and retry on 429s, searching Google for individual LinkedIn profiles (`site:linkedin.com/in/`).

### 5. Deterministic Candidate Extraction

For each Google result, a regex-based parser extracts:
- Name, title, employer (from snippet patterns)
- Location (from snippet prose, with city/country matching)
- Years of experience (from date ranges)
- Confirmed skills (from search provenance — which query found them)

No LLM is used for extraction. Profiles are deduplicated by LinkedIn URL, keeping the richest snippet.

### 6. Scoring & Ranking

**Relevance filter** — first-pass weighted score (title 40%, employer 30%, experience 20%, domain 10%) drops candidates below threshold 55.

**Deterministic score** — role-weighted score across 7 dimensions:
| Dimension | Tech Weight | Description |
|---|---|---|
| Title match | 25 | Word overlap with primary/alternative/adjacent titles |
| Must-have skills | 35 | Confirmed via search provenance + snippet |
| Experience/seniority | 15 | Years extracted vs. brief range, title-word fallback |
| Location | 10 | City/country matching against brief |
| Company/industry | 10 | Preferred/excluded company matching |
| Preferences | 3 | Industry preferences/exclusions |
| Other signals | 2 | Exclusion keywords |

**AI review** — top 20 candidates (by deterministic score) receive a contextual LLM evaluation via Groq.

**Final score** = Deterministic (60%) + Contextual AI (40%)

**Match strength bands:**
- **Excellent** (90–100) · **Strong** (75–89) · **Potential** (60–74) · **Low** (<60)

### 7. Skill Verification

For the top 25 candidates, targeted Google queries (`site:linkedin.com/in/<slug> "Django"`) confirm individual skills — zero-cost evidence that the profile page contains the exact term.

### 8. Export

Select candidates and download an Excel file with name, title, company, location, experience, LinkedIn URL, score, match strength, confirmed skills, and brief coverage summary.

## Project Structure

```
alphasourcer/
├── app/
│   ├── api/search/         # Search pipeline API (POST + GET polling)
│   ├── api/analyze/        # Requirement clarification API
│   ├── api/export/         # Excel export API
│   ├── search/[id]/        # Search results page
│   ├── page.tsx            # Landing page
│   └── layout.tsx          # Root layout
├── components/
│   ├── search/             # RequirementInput, RefinePanel, SearchProgress
│   ├── candidates/         # CandidateResults, CandidateTable, ExportButton
│   └── Header.tsx
├── lib/
│   ├── search/             # Pipeline orchestrator, query builder, brief quality
│   ├── candidates/         # Parser, relevance filter, dedup, job-advert filter
│   ├── scoring/            # Deterministic scorer, stack detection
│   ├── groq/               # LLM client, requirement parser, candidate evaluator
│   ├── serper/             # Serper API client, rate limiter, geo params
│   ├── geo/                # City/country dictionary, location extraction
│   ├── export/             # Excel generation
│   ├── session-store.ts    # Redis (Vercel) + local file fallback
│   └── utils.ts            # Helpers (nanoid, URL normalisation, sleep)
├── config/
│   ├── scoring.ts          # Role-family weights, match strength bands
│   ├── models.ts           # Groq model fallback chain
│   └── limits.ts           # Search, eval, skill-verification limits
├── eval/                   # Offline evaluation harness (zero API cost)
│   ├── prove.ts            # Side-by-side old vs new scoring
│   ├── replay.ts           # Re-score a saved session
│   ├── accuracy.ts         # Precision/recall against human labels
│   ├── compare.ts          # Compare two sessions
│   ├── skills.ts           # Skill confirmation diagnostics
│   ├── label.ts            # Interactive labelling tool
│   ├── _baseline/          # Frozen master-branch code for comparison
│   ├── fixtures/           # Recorded sessions as test data
│   └── labels/             # Human-labelled CSVs
├── types/index.ts          # All TypeScript interfaces
├── docs/                   # Audit, experiments, changelog
└── .github/workflows/      # CI: typecheck, build, eval harness
```

## Configuration

### Model Fallback Chain

Default chain (tried in order when rate-limited):
1. `openai/gpt-oss-120b`
2. `openai/gpt-oss-20b`
3. `qwen/qwen3.8-27b`

Override via environment:
```env
GROQ_MODEL_CHAIN=openai/gpt-oss-120b,openai/gpt-oss-20b,qwen/qwen3.8-27b
GROQ_PRIMARY_MODEL=openai/gpt-oss-120b
```

### Scoring Profiles

Edit `config/scoring.ts` to adjust dimension weights per role family:
Technology, Sales, Recruitment, Finance, Operations, Generic.

### Skill Verification

```env
SKILL_VERIFICATION=on            # on/off
SKILL_VERIFY_CANDIDATES=25       # max candidates to probe
SKILL_VERIFY_PROBES=60           # hard ceiling on credits
SKILL_VERIFY_DEADLINE_MS=30000   # wall-clock deadline
```

### Rate Limiting

```env
MAX_SEARCHES_PER_DAY=50
```

## Development

### Type check:

```bash
npm run typecheck
```

### Build for production:

```bash
npm run build
npm run start
```

### Run evaluation harness (zero cost):

```bash
npx tsx eval/replay.ts b.json                    # re-score a saved session
npx tsx eval/prove.ts eval/fixtures/run1-before-fixes.json   # old vs new
npx tsx eval/accuracy.ts eval/fixtures/run5-skill-verification.json  # precision/recall
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Connect to Vercel
3. Add environment variables (`GROQ_API_KEY`, `SERPER_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`)
4. Deploy

### CI

Every push runs: TypeScript check → Production build → Evaluation harness on recorded sessions. See `.github/workflows/ci.yml`.

## Limitations & Non-Goals

**MVP does NOT include:**
- Email or phone finding / contact enrichment
- LinkedIn login or automation
- ATS integrations
- Team collaboration or payment systems
- Candidate outreach or analytics dashboard

## Troubleshooting

### "No candidates found"
- Broaden location requirements
- Reduce must-have skills
- Check API quotas (`SERPER_API_KEY`, `GROQ_API_KEY`)

### Search hangs or times out
- Check API key validity
- Verify Groq and Serper service status
- On Vercel Hobby plan, `maxDuration` is 60s — consider Pro for longer pipelines

### Scoring seems off
- Review `config/scoring.ts` for role-family weight tuning
- Check `KEEP_THRESHOLD` in `config/limits.ts` (default: 55)
- Run `npx tsx eval/replay.ts <session.json>` to inspect score breakdowns

---

**AlphaSourcer** — Built with Next.js 14, TypeScript, Groq, Serper, Upstash Redis
