import {NextResponse} from 'next/server';
import {getRun} from '../../../../lib/runner.mjs';
export const runtime='nodejs';
export async function GET(req,{params}){
  const {id}=await params;const run=await getRun(id);if(!run)return NextResponse.json({error:'Report not found'},{status:404});
  const url=new URL(req.url);const json=url.searchParams.get('format')==='json';
  if(json)return new Response(JSON.stringify(run,null,2),{headers:{'Content-Type':'application/json; charset=utf-8','Content-Disposition':`attachment; filename="serpforge-${id}.json"`}});
  const lines=[`# SERPForge investigation ${id}`,'',`Status: ${run.status}`,`Scanned: ${run.startedAt}`,`Website: ${run.input.url}`,`Query: ${run.input.query}`,'','## Findings',...run.findings.map(x=>`- **${x.rule}** (${x.severity}) on ${x.pageUrl}: ${x.evidence}`),'','## Search observations',...run.observations.flatMap(x=>[`### ${x.engine} / ${x.hl} — ${x.status} (${x.source})`,`Observed: ${x.observedAt}`,...x.results.map(r=>`- ${r.position}. ${r.title} — ${r.link}`),...x.references.map(r=>`- AI reference: ${r.title} — ${r.link}`)]),'','## Reviewable code patch (if supported)','```diff',run.patch?.diff??'No patch generated','```','','## Source patch validation',run.verification?JSON.stringify(run.verification,null,2):'Not run','','## Limits','- Source metadata validation does not prove a successful build, deployment, improved search rankings, traffic, indexing, or AI citations.','- Results reflect sampled queries, locations and times.',...run.warnings.map(x=>`- ${x}`)];
  return new Response(lines.join('\n'),{headers:{'Content-Type':'text/markdown; charset=utf-8','Content-Disposition':`attachment; filename="serpforge-${id}.md"`}})
}
