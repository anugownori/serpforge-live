# SERPForge Live — Real SEO + AEO Website Intelligence

SERPForge is a **working-source application** that audits a real public website, retrieves fresh SerpApi Google Search, Autocomplete and AI Mode responses, maps the website's **actual crawled links**, identifies observable SEO issues and optionally generates a **downloadable Next.js metadata patch** from a real public GitHub repository. It does **not** ship with a sample website, hard-coded search results, simulated progress counters or fake AI citations.

## Actual capabilities

- Accept a real **public HTTPS website**, query and selected Google Search locales (English / Hindi / Kannada). Changing `hl` is a locale setting, **not** an automatic translation of the query.
- Crawl up to 15 pages, same-origin only, depth up to 2; respect `robots.txt`, timeouts and response-size limits. Sites that block bots may be unavailable.
- Visualize observed page nodes and true hyperlinks in the **interactive Spider** view with page selection, issue coloring, zoom, real traversal progress and a crawler position indicator.
- Fetch **fresh search API responses** with SerpApi. Google Search returns organic results, Autocomplete supplies real suggestions and AI Mode gives sampled answer/citation data where available.
- Run deterministic metadata, heading and duplicate-title checks. Export reports with the time, queries, URLs and evidence limitations.
- Optionally read source from a **public GitHub Next.js App Router repository**, propose a minimal title/description edit and download a `.patch`. The tool **does not edit the repository, open a PR, rebuild arbitrary source, or deploy the patch**.

## 1. Run locally

Requirements: Node.js >=20.11, npm, working internet, a SerpApi account with access to the needed APIs.

```bash
npm install
cp .env.example .env.local
# Edit .env.local and enter the real SERPAPI_KEY
npm run dev
```

**Windows (recommended):** Double-click `setup-and-run.cmd`. It collects the API key privately on your own laptop (hidden input), performs one real SerpApi Google Search request, installs dependencies, runs unit tests, checks the production build, and starts the site. The key is never embedded in the downloaded ZIP. The real API check consumes one SerpApi request. Alternatively run `start-windows.cmd` after manually configuring `.env.local`. Open `http://localhost:3000`.

**Input:** public site URL, real search query, optional `https://github.com/owner/repository`, selected locales. Results are always retrieved for this run; there is **no stored response replay or pretend fallback**. SerpApi itself can have upstream caching; the app sends `no_cache=true` to request fresh engine results.

The optional GitHub source integration uses the GitHub REST API. It supports simple static `export const metadata` exports, and adding metadata to supported Next.js App Router server pages. Dynamic metadata, client components, unsupported routes and complex nested objects are refused rather than modified speculatively.

**Time and cost:** one scan makes up to **five** live SerpApi requests (up to three Google Search locale requests, one Autocomplete, and one AI Mode). Check your account's actual per-engine usage and quotas. Public GitHub API rate limits also apply.

If you already have `.env.local`, run `node scripts/check-serpapi.mjs` to confirm real SerpApi account connectivity; a successful `/api/health` check alone only proves the environment variable is set, **not** that the key is accepted by SerpApi. Never upload `.env.local`.

## 2. Deploy as a persistent Node.js service

**Recommended:** Docker-capable VPS or managed container host with persistent storage and HTTPS reverse proxy. This application runs ongoing background investigations and writes report files; do not deploy these routes unchanged to a stateless/short-lived serverless function environment.

```bash
cp .env.example .env.local
# Set SERPAPI_KEY and APP_ACCESS_KEY in .env.local
# Change DATA_DIR in .env.local? Docker compose overrides it to /app/data.
docker compose up --build -d
```

Open `http://localhost:3000` for local Docker, or route your host's HTTPS domain to port 3000 using a trusted reverse proxy. The named Docker volume stores run data persistently. Deploy a **single worker instance**, because rate limits and running-job coordination are in memory. Configure host-level inbound rate limiting and TLS. If `APP_ACCESS_KEY` is set, reviewers must enter it into the start form; the key is sent only to the server with the scan request and is never included in reports.

**For judges or reviewers:** a remote installation must already have the owner's server-side SerpApi key configured and an unrestricted outbound HTTPS internet connection. Without it, scans deliberately refuse to start rather than fabricate results. You may share a private access key to limit API-credit abuse.

## 3. Correctness and security

- Pages are never submitted by the crawler using POST; no forms or scripts are executed.
- Only public HTTPS hosts: DNS addresses are checked and pinned per request, including redirects, to limit SSRF and rebinding risk. Rejects local/private/reserved addresses.
- `robots.txt` failures block the crawl rather than guessing permission. The bot can still be blocked by site security controls.
- Server-side API credentials are never returned. The app optionally accepts an access key for scan initiation. Run IDs are unguessable but not a substitute for enterprise authentication or tenant isolation.
- `GITHUB_TOKEN` is **optional and read-only in application behavior**. The application does not create branches or write files to GitHub. The user must confirm that the provided public repository corresponds to the scanned site.
- Generated metadata is a **proposed source change**. Syntax/source validation does not prove a successful Next.js production build, actual deployment, ranking increase, improved indexing, search traffic or future AI citations.
- AI Mode citation/mention results describe **one observed answer sample**, not the entire search landscape.
- Keyword Radar uses Autocomplete suggestions and approximate on-page term coverage; it does not invent search volumes or SEO scores.

## 4. Tests and verification

```bash
npm test
npm run build
npm run start
```

Use `/api/health` to see whether the service is running and whether SerpApi is configured. To verify live functionality, provide a real site with a publicly accessible page and a valid SerpApi key, then inspect Search Evidence and Spider. To verify source patching, supply a public Next.js repository with a supported page that has an SEO metadata issue.

See `BUILD_STATUS.md` for the actual test status of the distributed ZIP. **No guarantee of deployment/build validation is implied by the source ZIP.**

## 5. Data contracts and endpoints

- `POST /api/run` — starts a new rate-limited investigation. When configured, send `X-SERPForge-Access` header.
- `GET /api/run/:id` — poll results, crawl events, findings and sources.
- `GET /api/report/:id?format=json|md` — download a report.
- `GET /api/patch/:id` — download generated source patch, if available.
- `GET /api/health` — health and SerpApi configuration status.

Only run scans for sites you are authorized to assess. Large crawls, login areas, and private repositories are not supported.
