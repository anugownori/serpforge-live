# SERPForge AI — Owner setup

This is the existing live-data SERPForge app, with a private Windows setup assistant.

**On Windows:** extract this ZIP, enter the project folder, and **double-click `setup-and-run.cmd`**. The first run prompts privately for your SerpApi API key, checks a real search call (1 credit/request), installs the Next.js dependencies, runs 18 tests, checks a production build, then starts `http://localhost:3000`.

The API key is saved only as `.env.local` on your laptop. The ZIP does **not** contain a key or any stored search results; never upload `.env.local` or publish its contents. You should rotate any key previously pasted into chat. For public hosting, configure `SERPAPI_KEY` and a separate `APP_ACCESS_KEY` as hosting service secrets, and **deploy only after the local checks succeed**.

A public website URL and query are required to start a live investigation. A public GitHub repository URL is optional and enables a downloadable, reviewable metadata patch when source patterns are supported. The app will not merge changes or deploy websites for you.

### Actual verification before delivery

- 18 automated tests: passed.
- Syntax of Node-based live API check: passed.
- ZIP integrity and absence of `.env.local`: checked.
- Live SerpApi authentication: **not tested in this environment** because outbound DNS/network is unavailable.
- `npm install` / `next build`: **not tested in this environment** because the npm registry is unreachable.
- Cloud deployment: **not performed**; no deployment repository was specified.

If a check fails, the installer stops and does not pretend the application is deployed.
