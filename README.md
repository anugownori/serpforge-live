# SERPForge Live — Real SEO + AEO Website Intelligence

SERPForge is a **working-source application** that audits a real public website, retrieves fresh SerpApi Google Search, Autocomplete and AI Mode responses, maps the website's **actual crawled links**, identifies observable SEO issues, computes a **Keyword Gap Radar**, evaluates **AEO (AI Mode) visibility**, and generates a **downloadable Next.js metadata patch** from a real public GitHub repository. It does **not** ship with a sample website, hard-coded search results, simulated progress counters or fake AI citations.

---

## Intended Deployment

- **Live Production URL:** [https://serpforge-live.vercel.app](https://serpforge-live.vercel.app)
- **Health & Configuration Endpoint:** [https://serpforge-live.vercel.app/api/health](https://serpforge-live.vercel.app/api/health)

---

## Actual Capabilities

1. **Live Website Crawler:**
   - Crawls up to 15 same-origin public pages (maximum depth: 2) on real HTTPS websites.
   - Enforces fail-closed robots policy, request limits, page limits, and response-size limits (650 KB).
   - Strict SSRF protection: Pins DNS lookups, verifies IPv4/IPv6 global routability, rejects private/loopback/cloud metadata (169.254.169.254) addresses.
   - TLS SNI negotiation preserved on multi-tenant CDNs via explicit servername option.
   - Never executes scripts or submits forms on audited websites.

2. **Interactive Spider View:**
   - Visualizes actual page nodes and real parent-child hyperlinks in an interactive SVG canvas.
   - Supports **Pan (drag to pan)** and **Zoom (scroll / buttons clamp 0.5x to 2.0x)** with a Reset View button.
   - Node issue coloring: Green (200 OK, no issues), Yellow (review finding), Orange (high priority), Gray (HTTP error / unreachable).
   - **Recorded Traversal Playback:** For completed scans, replay the exact crawl traversal order step-by-step with Play / Pause / Step / Speed controls, labeled truthfully as *"Playback of recorded crawl traversal"*.
   - **Search & Filter:** Search pages by URL path or title, filter by severity level.
   - **Accessible Table Alternative:** Switch seamlessly between interactive SVG graph and a fully accessible, WCAG-compliant sortable table.
   - **Reduced Motion Support:** Respects `prefers-reduced-motion` to disable animations.

3. **Complete SerpApi Integration:**
   - **Google Organic Search:** Top ranking positions, page titles, links, snippets, and distinct competitor domains.
   - **Google Search Questions (PAA):** Normalized People Also Ask queries with snippet answers and provenance.
   - **Google Autocomplete:** Authentic real-time keyword suggestions for English (`en`), Hindi (`hi`), and Kannada (`kn`).
   - **Google AI Mode & AEO Engine:** Evaluates sampled AI answer visibility into granular categories:
     - Specific page linked
     - Website cited
     - Product or service recommended
     - Brand mentioned
     - Not observed in sampled answer
     - Result unavailable

4. **Keyword Gap Radar:**
   - Combines SerpApi Autocomplete variations and Google Search questions (PAA).
   - Classifies query intent: *informational*, *commercial*, and *transactional*.
   - Cross-analyzes queries against crawled on-page text (titles, descriptions, H1 headings, pathnames).
   - Categorizes coverage status: *Covered*, *Partial coverage*, or *Opportunity gap*.
   - Generates factual, actionable content recommendations without fabricating search volumes or CPC estimates.

5. **Deterministic SEO & AEO Audits:**
   - Detects genuine, supportable issues:
     - Missing or weak page titles, long titles (>65 chars).
     - Missing meta descriptions, short/long descriptions.
     - Duplicate titles across crawled pages.
     - Missing H1 headings or multiple H1 tags.
     - Broken internal hyperlinks and broken pages (4xx/5xx/network errors).
     - Canonical issues: missing canonicals, cross-origin canonicals, insecure HTTP canonicals.
     - Malformed JSON-LD structured data syntax.
     - Indexing directives (`noindex` / `x-robots-tag`).

6. **Source-Code Fixing & Sandboxed Rebuild Verification:**
   - Supported Next.js App Router server pages (`app/**/page.jsx`, `app/**/page.tsx`).
   - Generates minimal unified diffs that preserve all unrelated source code.
   - Refuses ambiguous paths, client components (`use client`), dynamic `generateMetadata()`, and nested metadata.
   - **Sandboxed Verification (`lib/sandbox.mjs`):** Copies trusted projects to an isolated temporary sandbox, applies the metadata patch, runs Node syntax checks and project builds, and re-scans the rendered HTML to verify `<title>` and `<meta name="description">` changes in the built output.
   - Host security guard: Declines executing untrusted remote code on public serverless instances.

7. **Export Capabilities:**
   - Download complete Markdown investigation report (`/api/report/:id?format=md`).
   - Download structured JSON report (`/api/report/:id?format=json`).
   - Download unified `.patch` file (`/api/patch/:id`).

---

## 1. Run Locally

### Prerequisites
- Node.js >= 20.11
- npm
- A valid SerpApi key (`SERPAPI_KEY`)

### Setup on Windows (Recommended)
Double-click `setup-and-run.cmd`. It:
1. Prompts privately for your `SERPAPI_KEY` (hidden input, never echoed or committed).
2. Verifies a real live Google Search request using `scripts/check-serpapi.mjs`.
3. Installs dependencies.
4. Executes 25 automated tests.
5. Verifies the production build.
6. Starts the local dev server at `http://localhost:3000`.

### Manual Local Setup
```bash
npm install
copy .env.example .env.local
# Add your SERPAPI_KEY in .env.local
npm run dev
```

---

## 2. Automated Testing & Verification

Run the built-in test suite:
```bash
npm test
```
**Results:** **25 passing tests, 0 failing, 0 skipped** across `tests/core.test.mjs` and `tests/features.test.mjs`.

Run the full verification check (tests + Next.js production build):
```bash
npm run check
```

---

## 3. Vercel Production Deployment

SERPForge is linked and deployed to:
```
https://serpforge-live.vercel.app
```

### Adding Credentials to Vercel
To enable live scans on the public deployment without committing keys to git:
```bash
npx vercel env add SERPAPI_KEY production
```
Optionally configure `APP_ACCESS_KEY` to restrict public usage and protect your SerpApi quota.

---

## 4. Security & Provenance Principles

- No simulated metrics: Zero fake traffic estimates, search volumes, or ranking guarantees.
- Fail-closed security: Strict robots parsing, SSRF prevention, and request timeout controls.
- Read-only GitHub integration: Scans and patches are read-only proposals for review; SERPForge never silently modifies or pushes to a repository.
- Full credential hygiene: Real keys are never printed, committed, or exposed in output reports.
