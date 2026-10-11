import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
export const hash = x => createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex').slice(0,20);
export const iso = () => new Date().toISOString();
export function safeText(s,max=1000){return String(s??'').replace(/[\x00-\x08\x0B-\x1F\x7F]/g,' ').slice(0,max);}
export async function writeJSON(file, value){await fs.mkdir(path.dirname(file),{recursive:true});const tmp=file+'.tmp-'+process.pid;await fs.writeFile(tmp,JSON.stringify(value,null,2));await fs.rename(tmp,file);}
export async function readJSON(file){try{return JSON.parse(await fs.readFile(file,'utf8'))}catch(e){if(e.code==='ENOENT')return null;throw e}}
export function unwrapUrl(v){try{return new URL(v)}catch{return null}}
