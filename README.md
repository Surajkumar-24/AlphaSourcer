# AlphaSourcer

**AI-powered candidate sourcing agent by AlphaNom.**

Describe who you're looking for. AlphaSourcer builds the search strategy, runs intelligent X-ray searches, and ranks the most relevant candidates.

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Groq API key ([Get one](https://console.groq.com))
- Serper API key ([Get one](https://serper.dev))

### Installation

1. Clone or navigate to the project directory:

```bash
cd AlphaSourcer
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env.local
```

4. Edit `.env.local` and add your API keys:

```env
GROQ_API_KEY=your_groq_api_key
SERPER_API_KEY=your_serper_api_key
GROQ_PRIMARY_MODEL=mixtral-8x7b-32768
GROQ_EXTRACTION_MODEL=mixtral-8x7b-32768
MAX_SEARCHES_PER_DAY=50
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Running Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How It Works

### 1. **Requirement Input**

Enter a natural language hiring requirement:

> "Looking for a Senior Backend Engineer with 4–7 years of experience in Python, Django, AWS and microservices. Candidates should preferably have product startup experience. Location: Bangalore."

### 2. **AI Analysis**

Groq API analyzes the requirement and extracts:
- Primary and alternative job titles
- Must-have and good-to-have skills
- Experience range
- Location preferences
- Company and industry filters

### 3. **X-Ray Query Generation**

The system generates 6–10 diverse search queries across multiple families:
- **Precision Search** — exact title + skills + location
- **Alternative Title Search** — alternative titles + skills
- **Skill-Led Search** — skills as primary discovery
- **Adjacent Role Search** — neighboring roles
- **Company-Led Search** — preferred companies
- **Recall Expansion** — broader criteria

### 4. **LinkedIn Profile Search**

Serper API executes each query, finding individual LinkedIn profiles matching the searches.

### 5. **Candidate Information Extraction**

For each result:
- Extract name, designation, organization
- Validate extraction confidence
- Filter low-confidence results
- Deduplicate candidates

### 6. **Hybrid Relevance Scoring**

Each candidate receives two scores:

**Deterministic Score (60%)**
- Title match
- Skill match (must-have + good-to-have)
- Experience/seniority
- Location
- Company/industry
- Preferences
- Other signals

**Contextual AI Score (40%)**
- AI evaluates fit based on available evidence
- Identifies confirmed matches
- Flags uncertain requirements
- Rates overall match strength

**Final Score = (Deterministic × 0.6) + (Contextual × 0.4)**

### 7. **Ranked Results**

Candidates are sorted and grouped:
- **Excellent Match** (90–100)
- **Strong Match** (75–89)
- **Potential Match** (60–74)
- **Low Relevance** (<60)

### 8. **Selection & Export**

Select candidates and download an Excel file containing:
- Sr. No.
- Candidate Name
- Current Designation
- Current Organization
- LinkedIn Profile URL

## Project Structure

```
alphasourcer/
├── app/
│   ├── api/              # API routes
│   ├── search/[id]/      # Search results page
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Home page
│   └── globals.css       # Global styles
├── components/
│   ├── search/           # Search components
│   ├── candidates/       # Candidate components
│   └── Header.tsx        # Header component
├── lib/
│   ├── groq/            # Groq API integration
│   ├── serper/          # Serper search
│   ├── scoring/         # Scoring logic
│   ├── candidates/      # Candidate processing
│   ├── export/          # Excel export
│   ├── search/          # Search pipeline
│   └── utils.ts         # Utilities
├── config/              # Configuration
├── types/               # TypeScript types
└── package.json
```

## Configuration

### Scoring Profiles

Edit `config/scoring.ts` to adjust weights for different roles:
- Technology
- Sales
- Recruitment
- Finance
- Operations
- Marketing
- Product
- Design
- Customer Success
- Generic

### Rate Limiting

Set `MAX_SEARCHES_PER_DAY` in `.env.local` to control usage.

### Models

Change Groq models in `.env.local`:
- `GROQ_PRIMARY_MODEL` — for parsing and query generation
- `GROQ_EXTRACTION_MODEL` — for candidate extraction

## Development

### Build for production:

```bash
npm run build
npm run start
```

### Linting:

```bash
npm run lint
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Connect to Vercel
3. Add environment variables
4. Deploy

```bash
vercel
```

### Manual Deployment

The app is a standard Next.js application and can be deployed to any Node.js hosting platform.

## Limitations & Non-Goals

**MVP does NOT include:**
- Email or phone finding
- Contact enrichment
- LinkedIn login or automation
- ATS integrations
- Team collaboration
- Payment systems
- Candidate outreach
- Analytics dashboard

## Future Roadmap

**Phase 2:**
- Saved searches and candidate lists
- Improved role-specific scoring
- Company similarity discovery

**Phase 3:**
- Contact enrichment
- Email and phone finding
- ATS integrations
- Team workspaces

**Phase 4:**
- Multi-country sourcing
- Custom search engines
- Personalized ranking models

## Troubleshooting

### "No candidates found"

- Broaden location requirements
- Reduce must-have skills
- Add alternative titles
- Check API quotas

### Search hangs

- Check API key validity
- Verify network connection
- Check Groq and Serper status
- Review logs

### Scoring seems off

- Check scoring configuration in `config/scoring.ts`
- Verify role family classification
- Review candidate snippets for extraction quality

## Support

For issues or questions, refer to the AlphaNom documentation or contact support.

---

**AlphaSourcer MVP v1.0** — Built with Next.js, TypeScript, Groq, and Serper
