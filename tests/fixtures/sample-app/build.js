import fs from 'node:fs';
import path from 'node:path';

// Minimal mock builder: reads app/page.js metadata and updates out/index.html
const pageSrc = fs.readFileSync(path.join(process.cwd(), 'app', 'page.js'), 'utf8');
const titleMatch = pageSrc.match(/title:\s*["']([^"']+)["']/);
const descMatch = pageSrc.match(/description:\s*["']([^"']+)["']/);

const title = titleMatch ? titleMatch[1] : 'Default';
const desc = descMatch ? descMatch[1] : 'Default';

fs.mkdirSync(path.join(process.cwd(), 'out'), {recursive: true});
fs.writeFileSync(
  path.join(process.cwd(), 'out', 'index.html'),
  `<!DOCTYPE html><html><head><title>${title}</title><meta name="description" content="${desc}"></head><body><h1>Built Page</h1></body></html>`,
  'utf8'
);

console.log('Sample build output produced successfully in out/index.html');
