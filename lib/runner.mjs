import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {DATA} from './paths.mjs';
import {writeJSON,readJSON,iso,safeText} from './utils.mjs';
import {validateTarget} from './security.mjs';
import {crawlSite} from './crawler.mjs';
import {inspectPages,suggestMetadata,buildKeywordRadar} from './audit.mjs';
import {createSearchPlan,getSearch,aiVisibility} from './serpapi.mjs';
import {parseGithubRepo,proposeGithubPatch} from './github.mjs';

// In-memory store: survives within the same function invocation, and acts as
// a read-cache when the same container handles a GET shortly after a POST.
// On Vercel, each invocation may be a fresh container, so we always persist
// to disk (tmp) as the source of truth for GET /api/run/:id.
const state=globalThis.__serpforgeRuns??(globalThis.__serpforgeRuns=new Map());
const rate=globalThis.__serpforgeRate??(globalThis.__serpforgeRate=new Map());

export async function getRun(id){
  if(!/^run_[a-f0-9]{14}$/.test(id))return null;
  return state.get(id)??await readJSON(path.join(DATA,'runs',id+'.json'));
}

async function save(run){
  run.updatedAt=iso();
  state.set(run.id,run);
  // Best-effort persist; don't throw if /tmp is full or unavailable.
  try{await writeJSON(path.join(DATA,'runs',run.id+'.json'),run)}catch{}
}

function event(run,type,status,message,data={}){
  run.steps.push({n:run.steps.length+1,tool:type,status,message,at:iso(),...data});
}

async function step(run,name,fn){
  event(run,name,'running',`Starting ${name}`);
  await save(run);
  try{
    const v=await fn();
    event(run,name,'done',`${name} completed`);
    await save(run);
    return v;
  }catch(e){
    event(run,name,'failed',safeText(e.message,220));
    await save(run);
    throw e;
  }
}

/**
 * execute() runs the full investigation synchronously and resolves when done.
 * Call it with `await` inside the HTTP request handler so the Vercel function
 * stays alive for the entire scan. Do NOT fire it with setImmediate/setTimeout.
 */
export async function execute(run){
  run.status='running';await save(run);
  try{
    const pages=[];
    run.crawl={root:run.input.url,pages,status:'running',observedAt:iso()};await save(run);
    const crawled=await step(run,'Live website crawl',()=>crawlSite(run.input.url,{maxPages:15,maxDepth:2,onPage:async page=>{
      pages.push(page);run.crawl.pages=[...pages];
      event(run,'Spider traversal','done',`Crawled ${new URL(page.url).pathname} — HTTP ${page.status}`,{pageUrl:page.url});
      await save(run);
    }}));
    run.crawl=crawled;run.findings=inspectPages(crawled.pages);await save(run);
    if(crawled.status!=='observed'){
      run.status='failed';run.error='The target could not be crawled. It may disallow this bot, time out, or block automated access.';await save(run);return run;
    }
    event(run,'SEO analysis','done',`${run.findings.length} observations from ${crawled.pages.length} page(s)`);await save(run);
    const plan=createSearchPlan(run.input.query,run.input.languages);
    for(const req of plan){
      const item=await step(run,`SerpApi ${req.engine} · ${req.hl}`,()=>getSearch(req));
      run.observations.push(item);
      if(item.status==='unavailable')run.warnings.push(`${req.engine} (${req.hl}): ${item.warning}`);
      await save(run);
    }
    run.ai=aiVisibility(run.observations.find(x=>x.engine==='google_ai_mode'),new URL(run.input.url).hostname);
    run.keywordRadar=buildKeywordRadar(run.observations,run.crawl.pages,run.input.query);
    event(run,'Keyword Gap Radar','done',`Evaluated ${run.keywordRadar.length} search variations against crawled pages`);
    await save(run);
    const fixable=run.findings.find(f=>['weak-title','missing-description','duplicate-title'].includes(f.rule));
    if(run.input.repoUrl&&fixable){
      const page=run.crawl.pages.find(p=>p.url===fixable.pageUrl);
      const proposed=suggestMetadata(page,run.input.query,run.observations);
      try{
        const patch=await step(run,'GitHub source-code patch',()=>proposeGithubPatch(run.input.repoUrl,page.url,proposed));
        run.patch={file:patch.file,diff:patch.diff,repository:patch.repository,branch:patch.branch,sourceUrl:patch.sourceUrl,evidenceIds:run.observations.filter(x=>x.status==='observed').map(x=>x.id),findingId:fixable.id,proposal:proposed,originalHash:patch.originalHash,patchedHash:patch.patchedHash};
        run.verification=patch.verification;
        event(run,'Patch validation','done','Metadata patch produced and source-checked; not built or deployed');
        await save(run);
      }catch(e){
        run.warnings.push(`Patch unavailable: ${safeText(e.message,250)}`);
        event(run,'Patch generation','warning',safeText(e.message,200));
        await save(run);
      }
    }else if(!run.input.repoUrl){
      run.warnings.push('No GitHub repository supplied. This investigation is an evidence-only audit; no source code was changed.');await save(run);
    }else{
      run.warnings.push('No supported metadata finding found. A code change would be unnecessary or unsafe.');await save(run);
    }
    run.status=run.observations.some(o=>o.status==='observed')?'completed':'partial';
    if(run.status==='partial')run.warnings.push('SerpApi returned no usable live search observations. Site crawl findings remain valid but SEO/AEO search evidence is unavailable.');
    await save(run);
  }catch(e){
    run.status='failed';run.error=safeText(e.message,350);
    event(run,'Investigation','failed',run.error);
    await save(run);
  }
  return run;
}

/**
 * startRun validates input, creates the run record, and returns the run ID.
 * Unlike the old version, it does NOT fire a background worker — the caller
 * must await execute(run) to actually perform the scan.
 */
export async function startRun(input,{client='local',accessKey=''}={}){
  if(process.env.APP_ACCESS_KEY&&accessKey!==process.env.APP_ACCESS_KEY)
    throw new Error('Access key required. Enter the site access key provided by the owner.');
  if(!process.env.SERPAPI_KEY)
    throw new Error('The administrator must set SERPAPI_KEY before live investigations can run.');
  const now=Date.now();
  for(const [ip,items] of rate)if(items.every(t=>now-t>3600000))rate.delete(ip);
  const hits=(rate.get(client)||[]).filter(t=>now-t<3600000);
  const limit=Math.max(1,Math.min(20,Number(process.env.MAX_SCANS_PER_HOUR||4)));
  if(hits.length>=limit)throw new Error(`Scan limit reached (${limit}/hour). Try again later.`);
  // Count only genuinely running scans held in local memory (same container).
  const running=[...state.values()].filter(x=>['queued','running'].includes(x.status)).length;
  if(running>=Number(process.env.MAX_CONCURRENT_SCANS||2))throw new Error('Scanner is busy. Please retry shortly.');
  const url=String(input.url||'').trim(),query=String(input.query||'').trim();
  if(query.length<3||query.length>180)throw new Error('Enter a 3–180 character search query');
  await validateTarget(url);
  const repoUrl=input.repoUrl?parseGithubRepo(String(input.repoUrl)).url:'';
  const languages=[...new Set(Array.isArray(input.languages)?input.languages:['en'])].filter(x=>['en','hi','kn'].includes(x)).slice(0,3);
  if(!languages.length)throw new Error('Select at least one search language');
  const id='run_'+randomUUID().replaceAll('-','').slice(0,14);
  const run={id,status:'queued',startedAt:iso(),updatedAt:iso(),input:{url,repoUrl,query,languages},steps:[],crawl:null,observations:[],findings:[],keywordRadar:[],patch:null,verification:null,ai:null,warnings:[],error:null};
  rate.set(client,[...hits,now]);
  await save(run);
  return run;
}
