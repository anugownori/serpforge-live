# Build and verification status — SERPForge Live 2.0

**Implemented in this source package**

- Public HTTPS URL validation, public-only DNS checks and pinned HTTPS page fetching.
- Bounded crawler with fail-closed robots handling, page-by-page progress, real internal links and page metadata extraction.
- Live SerpApi Google Search, Google Autocomplete and Google AI Mode adapters. No fake/cached response fallback; missing SerpApi credentials prevent a scan.
- Interactive React/SVG Spider using observed page data; zoom, node inspection, issue colors and a spider following newly observed pages.
- Deterministic SEO issue rules, query suggestion table, source references and JSON/Markdown reports.
- Read-only GitHub public source retrieval and syntax-checked metadata patch generation; patch download endpoint.
- Persistent Node deployment templates: Dockerfile, Compose, health route, .env.example, Windows script.

**What was verified in the authoring environment**

- Node built-in test suite: **18 of 18 passing**, with local unit/integration-shaped mocked inputs.
- All `.mjs` and `.js` modules parsed using Node syntax checks where applicable.
- React JSX source parsed using the TypeScript syntax parser without parse diagnostics.
- ZIP file archive integrity is verified after packaging.

**What could NOT be independently validated here**

- `npm install` / `next build` / full browser interaction: npm registry unavailable from this environment.
- A real SerpApi request: no user-provided `SERPAPI_KEY` configured in this workspace.
- An actual live crawl of a publicly hosted site and real GitHub source retrieval: container outbound access is restricted.
- Deployment to a production server: host credentials and deployment environment are not provided.

**Limits**

- Metadata diff is **source-validated**, not build/deploy/re-scan verified on an external website.
- GitHub repositories are read-only; changes are exported as a patch for owner approval.
- Some Next.js configurations and bot-protected sites will not be automatically patchable/auditable.
- Back-end assumes one persistent long-running server, not stateless serverless execution.

**Status:** Source implementation with passing offline tests. **Not certified as live-deployed or end-to-end verified** until owner runs build and a real authorized scan.


## Local secure-start assistant (added 2026-10-11)

- `setup-and-run.cmd` + `scripts/configure-windows.ps1`: private local SerpApi key entry (no key embedded in archive), live connection check, dependency installation, tests, build, then dev-server start.
- `scripts/check-serpapi.mjs`: one real Google Search request on the owner's machine; prints only status, result count and a request ID, never the API key or raw URL. It consumes one live request.
- The new scripts were syntax-reviewed and the Node script was checked with `node --check`. They cannot be run end-to-end on the Linux authoring environment (Windows PowerShell unavailable; external DNS unavailable).
- This package does not contain anyone's SerpApi key. Live authentication, Next.js dependency installation, and production build remain unverified until executed on an internet-connected host.
