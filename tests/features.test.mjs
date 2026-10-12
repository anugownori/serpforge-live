import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {extractPage} from '../lib/html.mjs';
import {inspectPages,buildKeywordRadar} from '../lib/audit.mjs';
import {normalize,aiVisibility} from '../lib/serpapi.mjs';
import {verifyTrustedProjectPatch} from '../lib/sandbox.mjs';

test('HTML extractor parses JSON-LD structured data and x-robots-tag headers',()=>{
  const html=`<html><head>
    <title>Structured Page</title>
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"Acme"}</script>
    <script type="application/ld+json">{invalid json here</script>
  </head><body><h1>Heading</h1></body></html>`;
  const page=extractPage(html,'https://example.com/',{'x-robots-tag':'noindex, nofollow'});
  assert.equal(page.robots,'noindex, nofollow');
  assert.equal(page.structuredData.length,2);
  assert.equal(page.structuredData[0].valid,true);
  assert.deepEqual(page.structuredData[0].types,['Organization']);
  assert.equal(page.structuredData[1].valid,false);
});

test('inspectPages flags broken pages and broken internal links',()=>{
  const pages=[
    {url:'https://example.com/',status:200,title:'Home',description:'Desc',h1Count:1,links:['https://example.com/broken','https://example.com/about']},
    {url:'https://example.com/about',status:200,title:'About',description:'Desc',h1Count:1,links:[]},
    {url:'https://example.com/broken',status:404,error:'HTTP 404',links:[]}
  ];
  const findings=inspectPages(pages);
  const brokenPageFinding=findings.find(f=>f.rule==='broken-page');
  const brokenLinkFinding=findings.find(f=>f.rule==='broken-internal-link');
  assert.ok(brokenPageFinding,'Should detect broken page');
  assert.equal(brokenPageFinding.pageUrl,'https://example.com/broken');
  assert.ok(brokenLinkFinding,'Should detect broken internal link on home page');
  assert.equal(brokenLinkFinding.pageUrl,'https://example.com/');
});

test('inspectPages flags multiple H1 tags, cross-origin canonical, and invalid structured data',()=>{
  const page={
    url:'https://example.com/item',
    status:200,
    title:'Good Title',
    description:'Good description for testing',
    h1Count:3,
    canonical:'https://other-domain.com/item',
    structuredData:[{valid:false,error:'Unexpected token'}]
  };
  const findings=inspectPages([page]);
  const rules=findings.map(f=>f.rule);
  assert.ok(rules.includes('multiple-h1'));
  assert.ok(rules.includes('cross-origin-canonical'));
  assert.ok(rules.includes('invalid-structured-data'));
});

test('SerpApi normalizer extracts People Also Ask questions and competitors',()=>{
  const raw={
    organic_results:[
      {position:1,title:'Acme Co',link:'https://acme.com/services',snippet:'Acme services'},
      {position:2,title:'Competitor One',link:'https://competitor.com/best',snippet:'Top competitor'}
    ],
    related_questions:[
      {question:'What are the best SEO tools?',snippet:'Top tools include...'},
      {question:'How to audit a website?',snippet:'To audit a site...'}
    ]
  };
  const norm=normalize(raw,{engine:'google',q:'best tools',hl:'en',gl:'in'});
  assert.equal(norm.questions.length,2);
  assert.equal(norm.questions[0].question,'What are the best SEO tools?');
  assert.equal(norm.competitors.length,2);
  assert.equal(norm.competitors[1].domain,'competitor.com');
});

test('aiVisibility distinguishes specific page linked, cited, mentioned, and recommended',()=>{
  const observation={
    status:'observed',
    references:[
      {title:'Home',link:'https://example.com/'},
      {title:'Deep Guide',link:'https://example.com/guides/seo'}
    ],
    answer:'We recommend example.com as a leading platform for search audits.'
  };
  const vis=aiVisibility(observation,'example.com');
  assert.equal(vis.status,'sampled');
  assert.equal(vis.pageLinked,true);
  assert.equal(vis.cited,true);
  assert.equal(vis.mentioned,true);
  assert.equal(vis.recommended,true);
  assert.equal(vis.classification,'Specific page linked');
});

test('Keyword Gap Radar classifies intent and identifies coverage gaps accurately',()=>{
  const observations=[
    {
      engine:'google_autocomplete',
      status:'observed',
      query:'coffee beans',
      hl:'en',
      id:'obs_1',
      suggestions:['buy coffee beans online','best coffee roasters','how to grind coffee']
    },
    {
      engine:'google',
      status:'observed',
      query:'coffee beans',
      hl:'en',
      id:'obs_2',
      questions:[
        {question:'What is the best way to brew espresso?',snippet:'Espresso brewing tips'}
      ]
    }
  ];
  const pages=[
    {url:'https://shop.com/',status:200,title:'Coffee Shop Homepage',description:'Finest roasted beans',h1:['Coffee Beans'],h1Count:1},
    {url:'https://shop.com/grind',status:200,title:'Grind Coffee Guide',description:'How to grind coffee beans',h1:['Grinding beans'],h1Count:1}
  ];
  const radar=buildKeywordRadar(observations,pages,'coffee beans');
  assert.equal(radar.length,4);
  const buyItem=radar.find(r=>r.phrase.includes('buy'));
  assert.equal(buyItem.intent,'transactional');
  const howItem=radar.find(r=>r.phrase.includes('grind'));
  assert.equal(howItem.gapStatus,'Covered');
  const brewItem=radar.find(r=>r.phrase.includes('brew espresso'));
  assert.equal(brewItem.gapStatus,'Opportunity gap');
});

test('verifyTrustedProjectPatch applies patch, builds sandbox, and verifies output HTML',async()=>{
  const fixtureDir=path.resolve(process.cwd(),'tests','fixtures','sample-app');
  const proposed={
    title:'Optimized New Title',
    description:'Optimized new description that passes validation limits'
  };
  const result=await verifyTrustedProjectPatch(fixtureDir,'app/page.js',proposed);
  assert.equal(result.verified,true);
  assert.equal(result.buildStatus,'passed');
  assert.equal(result.reScanStatus,'verified');
  assert.equal(result.reScanObserved?.title,'Optimized New Title');
  assert.equal(result.reScanObserved?.description,'Optimized new description that passes validation limits');
});
