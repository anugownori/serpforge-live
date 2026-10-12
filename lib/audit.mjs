import {hash,safeText} from './utils.mjs';

export function inspectPages(pages){
  const findings=[];
  function add(page,rule,severity,details){
    findings.push({id:'f_'+hash([page.url,rule]),pageUrl:page.url,rule,severity,evidence:details,checkedAt:new Date().toISOString()});
  }

  // 1. Identify broken pages
  const brokenPages=pages.filter(p=>p.status&&p.status!==200||p.status===0);
  for(const broken of brokenPages){
    add(broken,'broken-page','high',broken.status?`Page returned HTTP ${broken.status}`:`Page unreachable: ${broken.error||'Network connection failed'}`);
  }

  // 2. Identify broken internal links
  const brokenUrls=new Set(brokenPages.map(p=>p.url));
  for(const page of pages){
    if(page.status!==200||!page.links)continue;
    for(const link of page.links){
      if(brokenUrls.has(link)){
        const target=brokenPages.find(p=>p.url===link);
        add(page,'broken-internal-link','high',`Page contains broken link to ${link} (HTTP ${target?.status||'unreachable'})`);
      }
    }
  }

  const titles=new Map();
  for(const page of pages){
    if(page.status!==200)continue;
    const title=(page.title||'').trim();
    if(!title||/^(home|untitled|page|welcome)$/i.test(title)){
      add(page,'weak-title','high',`Page title is ${title?`generic (${title})`:'missing'}`);
    }else if(title.length>65){
      add(page,'long-title','low',`Page title is long (${title.length} characters) and may truncate in search results: "${title.slice(0,50)}…"`);
    }

    if(!page.description?.trim()){
      add(page,'missing-description','high','Meta description is missing');
    }

    if(page.h1Count===0){
      add(page,'missing-h1','medium','No H1 heading was found on this page');
    }else if(page.h1Count>1){
      add(page,'multiple-h1','low',`Page contains ${page.h1Count} H1 headings. A single primary H1 provides clearest document hierarchy`);
    }

    if(page.canonical){
      try{
        const canonUrl=new URL(page.canonical);
        const pageUrl=new URL(page.url);
        if(canonUrl.origin!==pageUrl.origin){
          add(page,'cross-origin-canonical','medium',`Canonical URL points to a different origin: ${page.canonical}`);
        }else if(canonUrl.protocol==='http:'&&pageUrl.protocol==='https:'){
          add(page,'insecure-canonical','medium',`Canonical URL uses insecure http:// protocol on an https:// page`);
        }
      }catch{
        add(page,'invalid-canonical','medium',`Canonical tag contains an invalid URL: "${page.canonical}"`);
      }
    }

    // Structured data validation
    if(Array.isArray(page.structuredData)){
      for(const sd of page.structuredData){
        if(!sd.valid){
          add(page,'invalid-structured-data','medium',`JSON-LD structured data syntax error: ${sd.error}`);
        }
      }
    }

    if(page.robots?.toLowerCase().includes('noindex')){
      add(page,'noindex-observed','info','A noindex directive is present; may be intentional');
    }

    if(title){
      const k=title.toLowerCase();
      titles.set(k,[...(titles.get(k)||[]),page]);
    }
  }

  for(const [name,group] of titles){
    if(group.length>1){
      for(const page of group){
        add(page,'duplicate-title','medium',`Title '${name}' appears on ${group.length} crawled pages`);
      }
    }
  }

  const rank={high:0,medium:1,low:2,info:3};
  return findings.sort((a,b)=>rank[a.severity]-rank[b.severity]);
}

export function searchAlignment(observations, query){
  const words=[...new Set(String(query||'').toLowerCase().match(/[\p{L}\p{N}]{3,}/gu)||[])].slice(0,12);
  const results=(observations||[]).filter(o=>o.engine==='google'&&o.status==='observed').flatMap(o=>(o.results||[]).map(r=>({text:(r.title+' '+r.snippet).toLowerCase(),url:r.link,observationId:o.id})));
  const matched=words.filter(w=>results.some(r=>r.text.includes(w)));
  return {sampledResults:results.length,matchedQueryTerms:matched,observationIds:[...new Set(results.map(r=>r.observationId))],disclaimer:'Observed topical overlap in sampled search titles/snippets; it does not establish why a page ranks or guarantee a ranking improvement.'};
}

export function buildKeywordRadar(observations=[], pages=[], query=''){
  const candidates=[];
  const seenPhrases=new Set();

  // 1. Google Autocomplete suggestions
  for(const obs of observations){
    if(obs.engine==='google_autocomplete'&&obs.status==='observed'){
      for(const sug of (obs.suggestions||[])){
        const clean=safeText(sug,150).trim();
        if(clean&&!seenPhrases.has(clean.toLowerCase())){
          seenPhrases.add(clean.toLowerCase());
          candidates.push({phrase:clean,source:'Google Autocomplete',sourceEngine:obs.engine,hl:obs.hl,sourceQuery:obs.query,observationId:obs.id});
        }
      }
    }
  }

  // 2. Google Search questions (PAA / related_questions)
  for(const obs of observations){
    if(obs.engine==='google'&&obs.status==='observed'){
      for(const q of (obs.questions||[])){
        const clean=safeText(q.question,200).trim();
        if(clean&&!seenPhrases.has(clean.toLowerCase())){
          seenPhrases.add(clean.toLowerCase());
          candidates.push({phrase:clean,source:'Search Questions (PAA)',sourceEngine:obs.engine,hl:obs.hl,sourceQuery:obs.query,snippet:q.snippet,observationId:obs.id});
        }
      }
    }
  }

  function detectIntent(phrase){
    const lower=phrase.toLowerCase();
    if(/\b(buy|price|pricing|hire|order|cost|subscription|download|quote|near me|discount|cheap)\b/i.test(lower))return 'transactional';
    if(/\b(best|review|top|agency|services|compare|vs|software|tools|platform|features|alternative)\b/i.test(lower))return 'commercial';
    if(/\b(what|how|why|when|where|guide|tips|tutorial|learn|example|definition|explain|ideas|can|do|is)\b/i.test(lower))return 'informational';
    return 'informational';
  }

  const radarItems=candidates.map(item=>{
    const words=item.phrase.toLowerCase().split(/\s+/).filter(w=>w.length>3);
    const intent=detectIntent(item.phrase);

    // Score pages based on keyword match
    let bestPage=null, maxScore=0;
    for(const p of pages){
      if(p.status!==200)continue;
      const haystack=(p.title+' '+p.description+' '+(p.h1||[]).join(' ')+' '+new URL(p.url).pathname).toLowerCase();
      const matchCount=words.filter(w=>haystack.includes(w)).length;
      if(matchCount>maxScore){
        maxScore=matchCount;
        bestPage=p;
      }
    }

    let gapStatus='Opportunity gap';
    let recommendation='';
    if(maxScore>=2){
      gapStatus='Covered';
      recommendation=`Existing page (${new URL(bestPage.url).pathname}) addresses core terms. Verify that the on-page content provides a direct, factual answer to this user query.`;
    }else if(maxScore===1){
      gapStatus='Partial coverage';
      recommendation=`Partial topical overlap found on ${new URL(bestPage.url).pathname}. Consider expanding section headings or adding FAQ content to directly answer this query.`;
    }else{
      gapStatus='Opportunity gap';
      recommendation=`Content gap identified: no crawled page explicitly covers this search query. Consider creating dedicated content or a targeted section.`;
    }

    return {
      phrase:item.phrase,
      intent,
      source:item.source,
      sourceEngine:item.sourceEngine,
      sourceQuery:item.sourceQuery,
      hl:item.hl,
      observationId:item.observationId,
      matchingPageUrl:bestPage?bestPage.url:null,
      matchScore:maxScore,
      gapStatus,
      recommendation,
      limitations:'Observed from live SerpApi suggestions and sampled on-page text. Search volumes, CPC, and keyword difficulty are not estimated or fabricated.'
    };
  });

  return radarItems;
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
