import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const root = process.cwd();
const zipPath = path.join(root, 'SERPForge_FINAL_REAL_WORKING.zip');

if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

const excluded = new Set([
  '.git',
  'node_modules',
  '.next',
  '.vercel',
  '.env.local',
  '.data',
  'SERPForge_FINAL_REAL_WORKING.zip'
]);

const items = fs.readdirSync(root).filter(name => !excluded.has(name));
const targetPaths = items.map(name => `'${name}'`).join(',');

const psCommand = `Compress-Archive -Path ${targetPaths} -DestinationPath 'SERPForge_FINAL_REAL_WORKING.zip' -Force`;

console.log('Packaging files:', items);
execFileSync('powershell.exe', ['-NoProfile', '-Command', psCommand], {stdio: 'inherit'});

const stats = fs.statSync(zipPath);
console.log(`Successfully created SERPForge_FINAL_REAL_WORKING.zip (${stats.size} bytes)`);
