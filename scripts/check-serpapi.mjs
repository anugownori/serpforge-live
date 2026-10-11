// Real API credential/connectivity probe. Outputs no credentials or returned snippets.
// Run from the project directory after configuring .env.local.
import fs from 'node:fs';
import path from 'node:path';

function getLocalKey() {
  const file = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(file)) throw new Error('.env.local was not found. Configure SERPAPI_KEY first.');
  const text = fs.readFileSync(file, 'utf8');
  const line = text.split(/\r?\n/).find(s => /^\s*SERPAPI_KEY\s*=/.test(s));
  if (!line) throw new Error('SERPAPI_KEY is missing from .env.local.');
  let value = line.slice(line.indexOf('=') + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
  if (!/^[0-9a-zA-Z_-]{32,160}$/.test(value)) throw new Error('SERPAPI_KEY has an invalid or empty format.');
  return value;
}

const key = getLocalKey();
const url = new URL('https://serpapi.com/search.json');
url.search = new URLSearchParams({engine: 'google', q: 'SerpApi search API', gl: 'in', hl: 'en', num: '3', api_key: key, no_cache: 'true'}).toString();
console.log('Checking live SerpApi Google Search access (consumes one search request)...');
try {
  const response = await fetch(url, {signal: AbortSignal.timeout(25000), headers: {accept: 'application/json'}, redirect: 'error'});
  if (!response.ok) throw new Error(`SerpApi HTTP ${response.status} — check account status and API permissions.`);
  const result = await response.json();
  if (result?.error) throw new Error('SerpApi returned an API error — check your key and available credits in your account dashboard.');
  if (!Array.isArray(result?.organic_results)) throw new Error('The API responded without an organic_results array. Check engine availability and account details.');
  console.log(`PASS: live SerpApi Google Search returned ${result.organic_results.length} results.`);
  if (result.search_metadata?.id) console.log(`Request ID: ${result.search_metadata.id}`);
  console.log('Your credentials were NOT written to the report, console, or project source.');
} catch (error) {
  // Deliberately do not print network errors verbatim: they can include URLs or query strings containing credentials.
  const msg = String(error?.message || 'request failed');
  if (/^SerpApi HTTP \d+/.test(msg) || msg.startsWith('SerpApi returned') || msg.startsWith('The API responded')) console.error(`FAIL: ${msg}`);
  else console.error('FAIL: Could not reach SerpApi. Check internet access, proxy/firewall and DNS.');
  process.exitCode = 1;
}
