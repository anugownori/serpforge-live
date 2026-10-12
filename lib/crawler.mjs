import https from 'node:https';
import {validateTarget} from './security.mjs';
import {extractPage} from './html.mjs';
const MAX_BYTES=650_000;
const USER_AGENT='SERPForgeSiteAudit/2.0 (public metadata; bounded; owner-requested)';

/** HTTPS with validated, pinned DNS lookup; never connect to an unvalidated redirect IP. */
export async function safeFetch(raw,{timeout=9000}={}){
  let target=String(raw);
  for(let redirects=0;redirects<4;redirects++){
    const {url,addresses}=await validateTarget(target);
    const address=addresses.find(a=>a.family===4)||addresses[0];
    const response=await new Promise((resolve,reject)=>{
      const req=https.request(url,{
        method:'GET',timeout,servername:url.hostname,headers:{'user-agent':USER_AGENT,'accept':'text/html,application/xhtml+xml,text/plain;q=0.2','accept-encoding':'identity'},
        lookup:(_host,opts,cb)=>{
          const callback=typeof opts==='function'?opts:cb;
          if(opts&&typeof opts==='object'&&opts.all){
            return callback(null,[{address:address.address,family:address.family}]);
          }
          return callback(null,address.address,address.family);
        },
      },res=>{
        const parts=[];let bytes=0;res.on('data',chunk=>{bytes+=chunk.length;if(bytes>MAX_BYTES){req.destroy(new Error('Page exceeds 650 KB crawl limit'));return}parts.push(chunk)});
        res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(parts).toString('utf8')}));res.on('error',reject);
      });
      req.on('timeout',()=>req.destroy(new Error('Website request timed out')));req.on('error',reject);req.end();
    });
    if([301,302,303,307,308].includes(response.status)){
      if(!response.headers.location)throw new Error('Website redirected without a destination');
      target=new URL(response.headers.location,url).href;continue;
    }
    return {...response,finalUrl:url.href};
  }
  throw new Error('Too many redirects');
}

export function parseRobots(text,agent='SERPForgeSiteAudit'){
  const groups=[];let group=null;
  for(const raw of String(text||'').split(/\r?\n/)){
    const line=raw.split('#')[0].trim(),m=line.match(/^([a-z-]+)\s*:\s*(.*)$/i);if(!m)continue;
    const key=m[1].toLowerCase(),val=m[2].trim();
    if(key==='user-agent') {if(!group||group.rules.length){group={agents:[],rules:[]};groups.push(group)}group.agents.push(val.toLowerCase())}
    else if((key==='allow'||key==='disallow')&&group)group.rules.push({type:key,path:val});
  }
  const key=agent.toLowerCase();const exact=groups.filter(g=>g.agents.some(a=>a!=='*'&&key.includes(a)));
  const use=exact.length?exact:groups.filter(g=>g.agents.includes('*'));
  const rules=use.flatMap(g=>g.rules).filter(r=>r.path);
  return pathname=>{const matched=rules.filter(r=>pathname.startsWith(r.path));if(!matched.length)return true;matched.sort((a,b)=>b.path.length-a.path.length||(a.type==='allow'?-1:1));return matched[0].type==='allow'};
}
async function robotsPermission(origin){
  try{const res=await safeFetch(new URL('/robots.txt',origin).href,{timeout:4500});
    if(res.status===404||res.status===410)return ()=>true;
    if(res.status!==200)return ()=>false;
    // If robots.txt returned HTML (redirected to home page or custom error), don't parse HTML as robots rules
    if(String(res.headers?.['content-type']||'').toLowerCase().includes('text/html'))return ()=>true;
    return parseRobots(res.body);
  }catch{return ()=>false}
}
export async function crawlSite(start,{maxPages=15,maxDepth=2,onPage=()=>{}}={}){
  const root=(await validateTarget(start)).url;
  const sameOrigin=root.origin,allowedPath=await robotsPermission(sameOrigin);
  const queue=[{url:root.href,depth:0,parent:null}],seen=new Set(),pages=[];let skipped=0;
  while(queue.length&&pages.length<Math.min(Math.max(maxPages,1),25)){
    const {url,depth,parent}=queue.shift();if(seen.has(url))continue;seen.add(url);
    if(new URL(url).origin!==sameOrigin||!allowedPath(new URL(url).pathname)){skipped++;continue}
    let page;
    try{
      const result=await safeFetch(url);
      if(new URL(result.finalUrl).origin!==sameOrigin){skipped++;continue}
      if(result.status!==200)page={url,status:result.status,error:`HTTP ${result.status}`,links:[]};
      else if(!String(result.headers['content-type']||'').toLowerCase().includes('text/html')){skipped++;continue}
      else page=extractPage(result.body,result.finalUrl,result.headers);
      page={...page,parent,depth,order:pages.length+1};pages.push(page);await onPage(page);
      if(page.status===200&&depth<maxDepth)for(const link of page.links){if(!seen.has(link)&&!queue.some(x=>x.url===link))queue.push({url:link,depth:depth+1,parent:page.url})}
    }catch(e){page={url,status:0,error:String(e.message).slice(0,180),links:[],parent,depth,order:pages.length+1};pages.push(page);await onPage(page)}
  }
  return {root:root.href,pages,visited:seen.size,skipped,observedAt:new Date().toISOString(),status:pages.some(p=>p.status===200)?'observed':'unavailable'};
}
