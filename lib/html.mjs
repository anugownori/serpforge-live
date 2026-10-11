// Lightweight, dependency-free HTML extraction for bounded public-page auditing.
// Not a full HTML5 DOM parser. Malformed markup is reported conservatively.
export const decodeHtml = s => String(s??'').replace(/&(?:amp|lt|gt|quot|apos|nbsp|#(\d+)|#x([\da-f]+));/gi,(x,d,h)=>{
  if(d)return String.fromCodePoint(Math.min(1114111,Number(d)));
  if(h)return String.fromCodePoint(Math.min(1114111,parseInt(h,16)));
  return ({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&nbsp;':' '})[x.toLowerCase()]??x;
});
export const stripTags = s=>decodeHtml(String(s??'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim());
function attrs(tag){const o={};for(const m of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g))o[m[1].toLowerCase()]=decodeHtml(m[2]??m[3]??m[4]);return o}
function tagMatches(html, tag){return [...html.matchAll(new RegExp(`<${tag}\\b[^>]*>`, 'gi'))].map(m=>attrs(m[0]))}
export function extractPage(html, pageUrl){
  const title=html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i);
  const h1=[...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1\s*>/gi)];
  const metas=tagMatches(html,'meta'); const links=tagMatches(html,'link');const anchors=tagMatches(html,'a');
  const linkSet=new Set();const origin=new URL(pageUrl).origin;
  for(const a of anchors){if(!a.href)continue;try{const u=new URL(a.href,pageUrl);if(u.origin===origin&&/^https?:$/.test(u.protocol)){u.hash='';linkSet.add(u.toString())}}catch{}}
  const desc=metas.find(x=>x.name?.toLowerCase()==='description')?.content??'';
  const robots=metas.find(x=>x.name?.toLowerCase()==='robots')?.content??'';
  const canonical=links.find(x=>x.rel?.toLowerCase().split(/\s+/).includes('canonical'))?.href??'';
  return {url:pageUrl,status:200,title:stripTags(title?.[1]??''),description:desc,h1Count:h1.length,h1:h1.map(x=>stripTags(x[1])).slice(0,5),canonical,robots,links:[...linkSet],observedAt:new Date().toISOString()};
}
