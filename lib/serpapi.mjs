import {hash,iso,safeText} from './utils.mjs';
export function createSearchPlan(query,languages=['en']){
  const langs=[...new Set(languages)].filter(x=>['en','hi','kn'].includes(x)).slice(0,3);
  return [...langs.map(hl=>({engine:'google',q:query,hl,gl:'in',num:5})),{engine:'google_autocomplete',q:query,hl:langs[0]||'en',gl:'in'}, {engine:'google_ai_mode',q:query,hl:langs[0]||'en',gl:'in'}];
}
export async function getSearch(params){
  const apiKey=process.env.SERPAPI_KEY;
  if(!apiKey)return unavailable(params,'SERPAPI_KEY is not configured on the server');
  try{
    const url=new URL('https://serpapi.com/search.json');
    for(const [k,v] of Object.entries(params))url.searchParams.set(k,String(v));url.searchParams.set('api_key',apiKey);url.searchParams.set('no_cache','true');
    const response=await fetch(url,{signal:AbortSignal.timeout(17000),headers:{accept:'application/json'},cache:'no-store'});
    if(!response.ok)throw new Error(`SerpApi returned HTTP ${response.status}`);
    const body=await response.json();if(body.error)throw new Error(safeText(body.error,200));
    return normalize(body,params);
  }catch(e){return unavailable(params,e.message)}
}
function unavailable(p,message){return {id:'unavailable_'+hash([p,iso()]),engine:p.engine,query:p.q,hl:p.hl,gl:p.gl,source:'unavailable',status:'unavailable',observedAt:iso(),results:[],suggestions:[],references:[],questions:[],competitors:[],answer:'',warning:safeText(message,200)}}
export function normalize(raw,p){
  const organic=Array.isArray(raw.organic_results)?raw.organic_results:[];
  const suggestions=(Array.isArray(raw.suggestions)?raw.suggestions:[]).slice(0,12).map(x=>safeText(typeof x==='string'?x:(x.value||x.suggestion||x.query||''),130)).filter(Boolean);
  const results=organic.slice(0,8).map((x,i)=>({position:x.position??i+1,title:safeText(x.title,180),link:x.link||'',snippet:safeText(x.snippet,450)})).filter(x=>/^https?:\/\//.test(x.link));
  
  // Extract competitors (top distinct domains ranking for this query)
  const competitors=[];
  const seenDomains=new Set();
  for(const r of results){
    try{
      const host=new URL(r.link).hostname.toLowerCase().replace(/^www\./,'');
      if(host&&!seenDomains.has(host)){
        seenDomains.add(host);
        competitors.push({domain:host,position:r.position,title:r.title,link:r.link});
      }
    }catch{}
  }

  // Extract search questions (People Also Ask / related_questions)
  const rawQuestions=Array.isArray(raw.related_questions)?raw.related_questions:[];
  const questions=rawQuestions.slice(0,8).map(q=>({
    question:safeText(q.question,220),
    snippet:safeText(q.snippet,400),
    title:safeText(q.title,180),
    link:q.link||''
  })).filter(q=>q.question);

  const ai=raw.ai_overview??raw.ai_mode??raw;
  const sources=ai?.references??ai?.sources??raw.references??[];
  const refs=Array.isArray(sources)?sources:[];
  const references=refs.slice(0,15).map(x=>({title:safeText(x.title||x.name,180),link:x.link||x.url||x.source_url||''})).filter(x=>/^https?:\/\//.test(x.link));
  const blocks=Array.isArray(raw.text_blocks)?raw.text_blocks:[];
  const getBlock=b=>b.snippet??b.text??b.paragraph??(Array.isArray(b.list)?b.list.map(x=>x.snippet??x.text??'').join(' '):'');
  const answer=safeText(raw.reconstructed_markdown||blocks.map(getBlock).filter(Boolean).join('\n\n')||ai?.text||ai?.answer||ai?.markdown||raw.text||'',4500);
  const usable=p.engine==='google_ai_mode'?(Boolean(answer)||references.length>0):p.engine==='google_autocomplete'?Array.isArray(raw.suggestions):Array.isArray(raw.organic_results);
  return {id:String(raw.search_metadata?.id??('obs_'+hash([p,iso()]))),engine:p.engine,query:p.q,hl:p.hl,gl:p.gl,source:'live',status:usable?'observed':'unavailable',observedAt:iso(),results,suggestions,references,questions,competitors,answer,warning:usable?null:'API returned no usable results for this query'};
}
export function aiVisibility(observation,targetDomain){
  if(!observation||observation.status!=='observed'){
    return {
      status:'unavailable',
      cited:null,
      mentioned:null,
      pageLinked:null,
      recommended:null,
      classification:'Result unavailable',
      reason:observation?.warning||'No AI Mode answer available from SerpApi'
    };
  }
  const domain=targetDomain.toLowerCase().replace(/^www\./,'');
  const brandTerm=domain.split('.')[0];
  
  // Check if a specific deep page is linked
  const specificPageRef=(observation.references||[]).find(r=>{
    try{
      const u=new URL(r.link);
      const h=u.hostname.toLowerCase().replace(/^www\./,'');
      return (h===domain||h.endsWith('.'+domain))&&(u.pathname!=='/'&&u.pathname!=='');
    }catch{return false;}
  });
  const pageLinked=Boolean(specificPageRef);

  // Check if domain is cited
  const citedRef=(observation.references||[]).find(r=>{
    try{
      const h=new URL(r.link).hostname.toLowerCase().replace(/^www\./,'');
      return h===domain||h.endsWith('.'+domain);
    }catch{return false;}
  });
  const cited=Boolean(citedRef);

  const answerLower=(observation.answer||'').toLowerCase();
  const mentioned=answerLower.includes(domain)||(brandTerm.length>3&&answerLower.includes(brandTerm));

  let recommended=false;
  if(mentioned){
    const recTerms=['recommend','top','best','leading','popular','choice','trusted','rated'];
    recommended=recTerms.some(term=>answerLower.includes(term));
  }

  let classification='Not observed in the sampled answer';
  if(pageLinked) classification='Specific page linked';
  else if(cited) classification='Website cited';
  else if(recommended) classification='Product or service recommended';
  else if(mentioned) classification='Brand mentioned';

  return {
    status:'sampled',
    cited,
    mentioned,
    pageLinked,
    recommended,
    classification,
    citedPage:specificPageRef?specificPageRef.link:(citedRef?citedRef.link:null),
    reason:'Single live AI Mode answer sample; absence in this sample is not proof that the site never appears in AI systems.'
  };
}
