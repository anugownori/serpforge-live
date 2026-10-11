# SERPForge Live — Technical assessment guide

**Problem:** Developers can see search data and SEO issues but struggle to connect real visibility observations to reviewable source-code actions.

**What the product actually does:** Public website crawl, SerpApi searches, source evidence, issue checks, an interactive page-link Spider, real keyword suggestions, and a read-only GitHub metadata patch suggestion.

**Meaningful SerpApi role:** Google Search provides real current result observations; Google Autocomplete returns authentic suggestions; Google AI Mode supplies one sampled AI-answer observation and explicit citations where available. All are requested live for every run, with query, locale and timestamp. The product does not invent rankings, volumes, confidence percentages or citations.

**Core flow:** Public HTTPS website → bounded crawler → real Spider graph → deterministic findings → live SerpApi SEO/AEO research → public Next.js GitHub source lookup → reviewable metadata patch when safe → source validation → export.

**Build constraints:** Only public sites and read-only public GitHub files. A generated `.patch` does not mean the website has been rebuilt, deployed or re-indexed. AI visibility is observational. Unavailable external data is labeled, not simulated.

**Verification:** Run `npm test`; inspect `BUILD_STATUS.md` for independently exercised and blocked checks. Use a real site, a valid SerpApi key, and a matching public Next.js repository for an end-to-end hands-on assessment.
