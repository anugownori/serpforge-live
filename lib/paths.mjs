import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const DATA=path.resolve(process.env.DATA_DIR||(process.env.VERCEL ? path.join(os.tmpdir(),'serpforge') : path.join(ROOT,'.data')));
