import {NextResponse} from 'next/server';
import {getRun} from '../../../../lib/runner.mjs';

export const runtime='nodejs';

export async function GET(req,{params}){
  const {id}=await params;
  const run=await getRun(id);
  if(!run)return NextResponse.json({error:'Report not found'},{status:404});

  const url=new URL(req.url);
  const json=url.searchParams.get('format')==='json';

  if(json){
    return new Response(JSON.stringify(run,null,2),{
      headers:{
        'Content-Type':'application/json; charset=utf-8',
        'Content-Disposition':`attachment; filename="serpforge-${id}.json"`
      }
    });
  }

  const lines=[
    `# SERPForge Live Investigation Report: ${id}`,
    '',
    `**Status:** ${run.status}`,
    `**Started:** ${run.startedAt}`,
    `**Updated:** ${run.updatedAt}`,
    `**Target Website:** ${run.input.url}`,
    `**Search Query:** ${run.input.query}`,
    `**Google Locales:** ${(run.input.languages||[]).join(', ').toUpperCase()}`,
    `**GitHub Repository:** ${run.input.repoUrl||'None supplied'}`,
    '',
    '## 1. Crawl Overview',
    `- Crawled pages: ${run.crawl?.pages?.length||0}`,
    `- Crawl status: ${run.crawl?.status||'unavailable'}`,
    '',
    '### Crawled URLs',
    ...(run.crawl?.pages||[]).map(p=>`- [${p.order||'•'}] \`${p.url}\` (HTTP ${p.status}) — Title: "${p.title||p.error||'—'}"`),
    '',
    '## 2. Technical SEO & AEO Findings',
    ...(run.findings?.length
      ? run.findings.map(x=>`- **[${x.severity.toUpperCase()}]** \`${x.rule}\` on ${x.pageUrl}: ${x.evidence}`)
      : ['No automated SEO issues identified on the crawled pages.']),
    '',
    '## 3. Sampled AEO (Google AI Mode) Visibility',
    `- AI Mode Status: ${run.ai?.status||'Unavailable'}`,
    `- Classification: ${run.ai?.classification||'Unavailable'}`,
    `- Brand Mentioned in Answer: ${run.ai?.mentioned ? 'Yes' : 'No'}`,
    `- Website Cited: ${run.ai?.cited ? 'Yes' : 'No'}`,
    `- Deep Page Linked: ${run.ai?.pageLinked ? 'Yes' : 'No'}`,
    `- Product/Service Recommended: ${run.ai?.recommended ? 'Yes' : 'No'}`,
    run.ai?.citedPage ? `- Cited URL: ${run.ai.citedPage}` : '',
    '',
    '## 4. Keyword Gap Radar Opportunities',
    ...(run.keywordRadar?.length
      ? run.keywordRadar.map(k=>`- **"${k.phrase}"** [${k.intent}] — Coverage: **${k.gapStatus}** (${k.source}). Recommendation: ${k.recommendation}`)
      : ['No keyword gap opportunities generated.']),
    '',
    '## 5. Live Search Observations (SerpApi)',
    ...(run.observations||[]).flatMap(x=>[
      `### ${x.engine} · Locale: ${x.hl?.toUpperCase()} (${x.status})`,
      `Query: "${x.query}" | Observed: ${x.observedAt}`,
      ...(x.results||[]).slice(0,5).map(r=>`  - Rank #${r.position}: [${r.title}](${r.link})`),
      ...(x.questions||[]).slice(0,5).map(q=>`  - Question: ${q.question}`),
      ...(x.suggestions||[]).slice(0,8).map(s=>`  - Suggestion: ${s}`),
      ...(x.references||[]).slice(0,5).map(r=>`  - AI Citation: [${r.title}](${r.link})`),
      ''
    ]),
    '## 6. Reviewable Source Code Patch',
    '```diff',
    run.patch?.diff??'No patch generated',
    '```',
    '',
    '## 7. Patch Validation Details',
    run.verification ? JSON.stringify(run.verification,null,2) : 'Not evaluated',
    '',
    '## 8. Limitations & Provenance',
    '- Source code diff is a generated proposal for owner review; it does not constitute a deployed website update.',
    '- Search rankings, citations, or traffic increases are never guaranteed and depend on continuous search engine indexing.',
    '- SerpApi observations reflect authentic real-time samples for the specified query, locale, and timestamp.',
    ...(run.warnings||[]).map(w=>`- Warning: ${w}`)
  ].filter(Boolean);

  return new Response(lines.join('\n'),{
    headers:{
      'Content-Type':'text/markdown; charset=utf-8',
      'Content-Disposition':`attachment; filename="serpforge-${id}.md"`
    }
  });
}
