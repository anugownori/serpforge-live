import {simpleMetadata} from './patcher.mjs';

export function makeSupportedSourcePatch(before,proposed){
  if (/^[\s\uFEFF]*[\"\']use client[\"\'];?/m.test(before.split(/\r?\n/).slice(0,6).join("\n")))throw new Error("Client components cannot export Next.js metadata");
  if (/export\s+(?:async\s+)?function\s+generateMetadata|export\s+const\s+generateMetadata/.test(before))throw new Error("Dynamic metadata cannot be safely overwritten");
  if (/export\s+const\s+metadata/.test(before))return simpleMetadata(before,proposed);
  if (!/export\s+default\s+(?:async\s+)?(?:function|class|\()/m.test(before) && !/export\s+default\s+[A-Za-z_]/.test(before))throw new Error("Unsupported page component structure");
  const next={title:proposed.title,description:proposed.description};
  if(!next.title||!next.description||next.title.length>60||next.description.length>155)throw new Error("Invalid proposed metadata");
  return `export const metadata = ${JSON.stringify(next,null,2)};\n\n`+before;
}

import {hash,safeText} from './utils.mjs';

export function parseGithubRepo(raw){
  if(!raw)return null;
  let url;try{url=new URL(raw)}catch{throw new Error('GitHub repository must be a full https://github.com/owner/repo URL')}
  if(url.protocol!=='https:'||url.hostname!=='github.com'||url.username||url.password||url.port)throw new Error('Only public github.com repositories are supported');
  const segments=url.pathname.split('/').filter(Boolean);
  if(segments.length!==2||!segments.every(s=>/^[a-zA-Z0-9_.-]{1,100}$/.test(s)))throw new Error('Expected a GitHub repository URL (owner/repo)');
  const [owner,repoRaw]=segments;const repo=repoRaw.replace(/\.git$/i,'');
  return {owner,repo,url:`https://github.com/${owner}/${repo}`};
}
async function githubApi(apiPath){
  const token=process.env.GITHUB_TOKEN;
  const response=await fetch('https://api.github.com'+apiPath,{
    signal:AbortSignal.timeout(10000),cache:'no-store',headers:{Accept:'application/vnd.github+json','User-Agent':'SERPForge-ReadOnly-Auditor','X-GitHub-Api-Version':'2022-11-28',...(token?{Authorization:`Bearer ${token}`}:{})}
  });
  if(response.status===404)return null;
  if(!response.ok)throw new Error(`GitHub source request failed (HTTP ${response.status}). Check repository access or GitHub API limits.`);
  return response.json();
}
export function candidatePaths(pageUrl){
  const route=new URL(pageUrl).pathname.split('/').filter(Boolean).map(decodeURIComponent);
  if(route.some(s=>!/^[\w-]{1,80}$/.test(s)))throw new Error('Unsupported Next.js route structure');
  const sub=route.join('/');const names=[...['app','src/app'].flatMap(prefix=>{
    const stem=prefix+'/'+(sub?sub+'/':'');return [stem+'page.tsx',stem+'page.jsx',stem+'page.ts',stem+'page.js'];
  })];return names;
}
export async function proposeGithubPatch(repoInput,pageUrl,proposal){
  const repo=parseGithubRepo(repoInput);if(!repo)throw new Error('A public GitHub URL is needed for a code patch');
  const info=await githubApi(`/repos/${repo.owner}/${repo.repo}`);
  if(!info||info.private)throw new Error('GitHub repository not accessible as public source');
  const branch=info.default_branch;
  for(const file of candidatePaths(pageUrl)){
    const enc=file.split('/').map(encodeURIComponent).join('/');
    const record=await githubApi(`/repos/${repo.owner}/${repo.repo}/contents/${enc}?ref=${encodeURIComponent(branch)}`);
    if(!record||record.type!=='file'||record.size>250000||!record.content)continue;
    const before=Buffer.from(record.content.replace(/\s/g,''),'base64').toString('utf8');
    try{
      const after=makeSupportedSourcePatch(before,proposal);
      if(after===before)continue;
      const {unified}=await import('./patcher.mjs');
      return {file,before,after,diff:unified(before,after,file),sha:record.sha,commitSha:info.default_branch,repository:repo.url,branch,sourceUrl:`https://github.com/${repo.owner}/${repo.repo}/blob/${encodeURIComponent(branch)}/${file}`,originalHash:hash(before),patchedHash:hash(after),verification:{passed:true,checks:{sourceFileFetched:true,patchApplied:true,onlySupportedMetadataFieldsChanged:true},reason:'Source-level validation only. Build, deployment and live re-scan have NOT run; download and review this patch before applying.'}};
    }catch(e){if(!/Dynamic|static|closing brace|length|metadata/.test(e.message))throw e}
  }
  throw new Error('No safely patchable static metadata export found for this URL in the repository. Supported: app/**/page.tsx/jsx and src/app/**/page.tsx/jsx.');
}
