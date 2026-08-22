# AlphaSourcer Setup Guide

## ⚡ Quick Start (5 Minutes)

### Step 1: Get API Keys

1. **Groq API Key**
   - Visit [console.groq.com](https://console.groq.com)
   - Sign up (free)
   - Copy your API key from the dashboard

2. **Serper API Key**
   - Visit [serper.dev](https://serper.dev)
   - Sign up (free tier available)
   - Copy your API key from the dashboard

### Step 2: Configure Environment

1. Copy the template:
```bash
cd AlphaSourcer
cp .env.example .env.local
```

2. Edit `.env.local` with your API keys:
```env
GROQ_API_KEY=your_groq_key_here
SERPER_API_KEY=your_serper_key_here
GROQ_PRIMARY_MODEL=mixtral-8x7b-32768
GROQ_EXTRACTION_MODEL=mixtral-8x7b-32768
MAX_SEARCHES_PER_DAY=50
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 3: Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📝 Example Workflow

### Input a Requirement

```
Looking for a Senior Backend Engineer with 4–7 years of experience in Python, Django, AWS and microservices. Candidates should preferably have product startup experience. Location: Bangalore.
```

### What Happens Automatically

1. ✅ AI analyzes the requirement
2. ✅ Generates 8 X-ray search queries
3. ✅ Searches for LinkedIn profiles
4. ✅ Extracts candidate information
5. ✅ Deduplicates results
6. ✅ Scores each candidate
7. ✅ Ranks by relevance

### Review & Export

1. See ranked candidates with match scores
2. Review why each candidate matches
3. Select the best candidates
4. Export to Excel

---

## 🔧 Configuration

### Adjust Scoring Weights

Edit `config/scoring.ts`:

```typescript
Technology: {
  titleMatch: 25,           // Prioritize technical skills
  mustHaveSkillMatch: 35,   // High weight on skills
  experienceSeniority: 15,
  location: 10,
  // ...
}
```

### Change Rate Limits

Edit `.env.local`:
```env
MAX_SEARCHES_PER_DAY=50  # Adjust as needed
```

### Switch Groq Models

Edit `.env.local`:
```env
GROQ_PRIMARY_MODEL=mixtral-8x7b-32768
# or: llama2-70b-4096, gemma-7b-it, etc.
```

---

## 🚀 Production Deployment

### Deploy to Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel
```

Then add environment variables in Vercel dashboard.

### Deploy to Other Platforms

The app is a standard Next.js application. Works with:
- Netlify
- AWS Amplify
- Railway
- Render
- DigitalOcean App Platform
- Any Node.js hosting

**Build command:**
```bash
npm run build
```

**Start command:**
```bash
npm run start
```

---

## 🐛 Troubleshooting

### "Invalid API key"
- Copy the full key from your dashboard (no extra spaces)
- Check `.env.local` has correct format
- Restart dev server after changing `.env.local`

### "No candidates found"
- Requirement might be too specific
- Try: broader location, fewer must-have skills, alternative titles
- Check API quotas at Groq and Serper dashboards

### Search hangs for >2 minutes
- Serper API might be slow
- Check Serper dashboard for status
- Try a simpler requirement

### "Module not found" errors
After changes, run:
```bash
rm -rf .next
npm run dev
```

---

## 📊 First Search Tips

### Good Requirements
```
Senior Full Stack Engineer with React + Node.js, 
5+ years in startup environment, remote, India-based or willing to relocate to Bangalore
```

### Vague Requirements (Avoid)
```
Looking for a good engineer
```

### Tips for Better Results
1. ✅ Specify years of experience (e.g., "4-7 years")
2. ✅ List key skills (e.g., "Python, AWS")
3. ✅ Mention location or remote preference
4. ✅ Note company type (startup, scale-up, etc.)
5. ✅ Highlight 3 must-haves
6. ✅ Use the Advanced Filters for structured input

---

## 📈 Understanding Scores

### Match Strength Breakdown

| Score | Label | Meaning |
|-------|-------|---------|
| 90–100 | Excellent | Strong all-around fit |
| 75–89 | Strong | Good match, minor gaps |
| 60–74 | Potential | Some relevant background |
| <60 | Low | Limited relevance |

### What the Scores Mean

- **Deterministic (60%)**: Measurable factors (title, skills, location)
- **Contextual (40%)**: AI assessment of overall fit based on evidence

---

## 🔐 Security Notes

- ✅ API keys stay server-side only
- ✅ No LinkedIn login required
- ✅ No browser automation
- ✅ No personal data stored
- ✅ No email/phone extraction

---

## ❓ FAQ

**Q: Can I source globally?**
A: Yes, but it's optimized for India first. Try country-specific terms (e.g., "Singapore", "Berlin").

**Q: How many candidates do I get per search?**
A: Typically 30–100 depending on requirement specificity. Quality over quantity.

**Q: What if the best candidates aren't in the top 20?**
A: You can scroll through all results and select manually.

**Q: Can I re-run the same search?**
A: Yes, the app doesn't save searches yet (Phase 2 feature).

**Q: How do I contact candidates?**
A: Click "View Profile" to open LinkedIn directly.

---

## 📞 Support

- Check README.md for detailed documentation
- Review the inline code comments
- Check GitHub issues (when available)

---

**Ready to source?** Open http://localhost:3000 and start searching! 🚀
