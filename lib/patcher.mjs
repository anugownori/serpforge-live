import fs from 'node:fs/promises';
import path from 'node:path';
import {hash} from './utils.mjs';
// A deliberately strict patcher: accepts only simple `export const metadata = { ... }` declarations.
// It declines complex/dynamic metadata rather than guessing or corrupting source code.
function objectBounds(src){
  const marker=/export\s+const\s+metadata\s*(?::\s*[\w<>|\s]+)?\s*=\s*\{/g;
  const m=marker.exec(src);if(!m)throw new Error('Only static `export const metadata = {}` is supported');
  const start=marker.lastIndex-1;let depth=0,quote=null,esc=false,comment=null;
  for(let i=start;i<src.length;i++){
    const c=src[i],n=src[i+1];if(comment==='line'){if(c==='\n')comment=null;continue}if(comment==='block'){if(c==='*'&&n==='/'){comment=null;i++}continue}
    if(quote){if(esc){esc=false;continue}if(c==='\\'){esc=true;continue}if(c===quote)quote=null;continue}
    if(c==='/'&&n==='/'){comment='line';i++;continue}if(c==='/'&&n==='*'){comment='block';i++;continue}
    if(['"',"'",'`'].includes(c)){quote=c;continue}
    if(c==='{')depth++;if(c==='}'&&--depth===0)return {start,end:i+1};
  }
  throw new Error('Metadata object has no closing brace');
}
function simpleMetadata(src,next){
  const b=objectBounds(src);let body=src.slice(b.start,b.end);
  if (body.slice(1,-1).includes('{')) throw new Error('Nested or complex metadata is not supported by this safe patcher');
  // Allow only static string fields or absence; reject any dynamic computation or nested metadata in the patch scope.
  function upsert(field,value){
    const key=new RegExp(`(^|[,\\s{])${field}\\s*:\\s*([\\x22\\x27\\x60])([^\\x22\\x27\\x60]*)\\2`,'m');
    const nonLiteral=new RegExp(`(?:^|[,\\s{])${field}\\s*:`,'m');
    if(nonLiteral.test(body)&&!key.test(body))throw new Error(`Dynamic '${field}' metadata is not supported`);
    if(key.test(body))body=body.replace(key,(_,prefix)=>`${prefix}${field}: ${JSON.stringify(value)}`);
    else {
      let prefix=body.slice(0,-1).trimEnd();
      if(prefix && !prefix.endsWith('{') && !prefix.endsWith(','))prefix+=',';
      body=prefix+`\n  ${field}: ${JSON.stringify(value)},\n}`;
    }
  }
  if(!next.title||!next.description)throw new Error('Both title and description are required');
  if(next.title.length>60||next.description.length>155)throw new Error('Proposed metadata exceeds conservative length limits');
  upsert('title',next.title);upsert('description',next.description);
  try { new Function('const metadata = '+body+';'); } catch { throw new Error('Generated metadata did not pass a JavaScript syntax check') }
  return src.slice(0,b.start)+body+src.slice(b.end);
}
export {simpleMetadata};
export async function createPatch(repoDir, relativeFile, proposed){
  const target=path.resolve(repoDir,relativeFile);if(!target.startsWith(path.resolve(repoDir)+path.sep))throw new Error('Unsafe file path');
  if(!/^app\/(?:[a-z\d\-_/]+\/)?(?:page|layout)\.[jt]sx?$/.test(relativeFile.replaceAll('\\','/')))throw new Error('Only Next.js page/layout files can be patched');
  const stat=await fs.lstat(target);if(stat.isSymbolicLink()||!stat.isFile())throw new Error('Cannot patch symlinks or non-files');
  const before=await fs.readFile(target,'utf8');const after=simpleMetadata(before,proposed);
  if(after===before)throw new Error('No patch changes were generated');
  await fs.writeFile(target,after);return {file:relativeFile,before,after,diff:unified(before,after,relativeFile),hashBefore:hash(before),hashAfter:hash(after)};
}
export function unified(before,after,file){
  const a=before.split('\n'), b=after.split('\n');let start=0;while(start<Math.min(a.length,b.length)&&a[start]===b[start])start++;
  let e1=a.length,e2=b.length;while(e1>start&&e2>start&&a[e1-1]===b[e2-1]){e1--;e2--}
  return [`--- a/${file}`,`+++ b/${file}`,`@@ -${start+1},${e1-start} +${start+1},${e2-start} @@`,...a.slice(start,e1).map(x=>'-'+x),...b.slice(start,e2).map(x=>'+'+x)].join('\n')+'\n';
}
