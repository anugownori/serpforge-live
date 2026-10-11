import {hash} from './utils.mjs';
export function inspectPages(pages){const findings=[];
  function add(page,rule,severity,details){findings.push({id:'f_'+hash([page.url,rule]),pageUrl:page.url,rule,severity,evidence:details,checkedAt:new Date().toISOString()})}
  const titles=new Map();for(const page of pages){if(page.status!==200)continue;
    const title=(page.title||'').trim();
    if(!title||/^(home|untitled|page|welcome)$/i.test(title))add(page,'weak-title','high',`Page title is ${title?`generic (${title})`:'missing'}`);
    if(!page.description?.trim())add(page,'missing-description','high','Meta description is missing');
    if(page.h1Count===0)add(page,'missing-h1','medium','No H1 heading was found on this page');
    if(page.robots?.toLowerCase().includes('noindex'))add(page,'noindex-observed','info','A noindex directive is present; may be intentional');
    if(title){const k=title.toLowerCase();titles.set(k,[...(titles.get(k)||[]),page]);}
  }
  for(const [name,group] of titles)if(group.length>1)for(const page of group)add(page,'duplicate-title','medium',`Title '${name}' appears on ${group.length} crawled pages`);
  const rank={high:0,medium:1,low:2,info:3};return findings.sort((a,b)=>rank[a.severity]-rank[b.severity]);
}
export function searchAlignment(observations, query){
  const words=[...new Set(String(query||'').toLowerCase().match(/[\p{L}\p{N}]{3,}/gu)||[])].slice(0,12);
  const results=(observations||[]).filter(o=>o.engine==='google'&&o.status==='observed').flatMap(o=>(o.results||[]).map(r=>({text:(r.title+' '+r.snippet).toLowerCase(),url:r.link,observationId:o.id})));
  const matched=words.filter(w=>results.some(r=>r.text.includes(w)));
  return {sampledResults:results.length,matchedQueryTerms:matched,observationIds:[...new Set(results.map(r=>r.observationId))],disclaimer:'Observed topical overlap in sampled search titles/snippets; it does not establish why a page ranks or guarantee a ranking improvement.'};
}
export function suggestMetadata(page, query, observations=[]){
  // Ground suggestions in the user's search topic and actual observed page/domain.
  // This is a draft for owner review; SERP results alone cannot verify new business claims.
  const alignment=searchAlignment(observations,query);
  const topic=String(query||'').replace(/[^\p{L}\p{N} ,.-]/gu,'').replace(/\s+/g,' ').trim();
  const siteName=(page.h1?.[0]||page.title||new URL(page.url).hostname).replace(/\s+/g,' ').trim();
  const pathName=new URL(page.url).pathname.split('/').filter(Boolean).at(-1)||'';
  const headline=/^(home|welcome|page|untitled)$/i.test(siteName)?new URL(page.url).hostname:siteName;
  const title=page.title?.trim() && !/^(home|untitled|page|welcome)$/i.test(page.title.trim()) ? page.title.trim().slice(0,60) : (pathName?`${topic} | ${pathName.replace(/-/g,' ')}`:`${topic} | ${headline}`).slice(0,60);
  const description=page.description?.trim()||`Find information about ${topic} on ${new URL(page.url).hostname}. Review the website for current details.`.slice(0,155);
  return {title,description,rationale:alignment.sampledResults?`Draft reflects the chosen query and existing page metadata. ${alignment.matchedQueryTerms.length} query terms also appear in ${alignment.sampledResults} Google result snippets. This is context, not a verified ranking advantage.`:'Draft uses the submitted query and observed website content. Live ranking evidence was unavailable. Review the language and relevance before applying.',source:alignment.sampledResults?'search-informed-draft':'site-informed-draft',alignment};
}
