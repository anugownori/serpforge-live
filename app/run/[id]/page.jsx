'use client';
import {useEffect,useState,use,useMemo} from 'react';
import Link from 'next/link';
import Nav from '../../../components/Nav';
import SpiderGraph from '../../../components/SpiderGraph';

const short=(s,n=120)=>String(s??'').length>n?String(s).slice(0,n-2)+'…':String(s??'');

function Status({status}){
  const c=['completed','passed','done'].includes(status)?'ok':status==='failed'?'bad':status==='partial'||status==='warning'?'warn':status==='unavailable'?'muted':'loading';
  return <span className={`status ${c}`}>{status||'pending'}</span>;
}

function StepView({steps=[]}){
  return (
    <div className="timeline">
      {steps.map((s,i)=>(
        <div className="step" key={i}>
          <div className={'step-ball '+(s.status==='failed'?'step-failed':s.status==='done'?'step-done':'')}>
            {s.status==='done'?'✓':s.status==='failed'?'!':i+1}
          </div>
          <div>
            <div className="step-title">{s.tool} <Status status={s.status}/></div>
            <div className="step-sub">{s.message}</div>
            <div className="step-time">{s.at?new Date(s.at).toLocaleTimeString():''}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Evidence({run}){
  const items=run.observations||[];
  const [engineFilter,setEngineFilter]=useState('all');

  if(!items.length){
    return <div className="empty">Waiting for live SerpApi searches. Results are never preloaded or simulated.</div>;
  }

  const filtered=items.filter(o=>{
    if(engineFilter==='all')return true;
    return o.engine===engineFilter;
  });

  return (
    <div>
      <div style={{display:'flex',gap:8,marginBottom:16,alignItems:'center'}}>
        <span style={{fontSize:12,color:'#5a7282'}}>Filter Engine:</span>
        {[['all','All Searches'],['google','Google Organic'],['google_autocomplete','Autocomplete'],['google_ai_mode','Google AI Mode']].map(([id,label])=>(
          <button
            key={id}
            type="button"
            className={engineFilter===id?'primary small':'outline-btn small'}
            onClick={()=>setEngineFilter(id)}
            style={{padding:'4px 10px',fontSize:12}}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="evidence-stack">
        {filtered.map((o,i)=>(
          <div className="evidence-card" key={i}>
            <div className="evidence-title">
              <strong>
                {o.engine==='google'?'Google Search':o.engine==='google_ai_mode'?'Google AI Mode':'Google Autocomplete'} · {o.hl?.toUpperCase()}
              </strong>
              <span className="tag">{o.source} · {o.status}</span>
            </div>
            <div className="micro">
              Query: &quot;{o.query}&quot; · Market: {o.gl?.toUpperCase()} · Language: {o.hl} · {new Date(o.observedAt).toLocaleString()}
              {o.id&&<span style={{marginLeft:8,color:'#8ea2ae'}}>ID: {o.id.slice(0,18)}</span>}
            </div>

            {o.warning&&<div className="notice">{o.warning}</div>}

            {/* Google Search: Organic Results, Questions (PAA), Competitors */}
            {o.engine==='google'&&(
              <>
                {/* Competitors summary */}
                {o.competitors&&o.competitors.length>0&&(
                  <div style={{marginBottom:14,padding:'8px 12px',background:'#edf4f7',borderRadius:6}}>
                    <strong style={{fontSize:12,color:'#2c4c62',display:'block',marginBottom:4}}>Observed Ranking Competitor Domains:</strong>
                    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                      {o.competitors.map((c,idx)=>(
                        <span key={idx} style={{background:'#fff',border:'1px solid #c8d9e2',padding:'2px 8px',borderRadius:4,fontSize:11,color:'#31546c'}}>
                          #{c.position} {c.domain}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Organic Search Results */}
                <strong style={{fontSize:13,color:'#31546c',display:'block',marginBottom:8}}>Organic Results:</strong>
                <div className="results-list">
                  {(o.results||[]).map((r,j)=>(
                    <div key={j}>
                      <span className="rank">#{r.position}</span>
                      <div>
                        <a href={r.link} target="_blank" rel="noopener noreferrer">{r.title} ↗</a>
                        <p>{r.snippet}</p>
                      </div>
                    </div>
                  ))}
                  {(!o.results||o.results.length===0)&&<p className="p-muted">No organic results returned for this query.</p>}
                </div>

                {/* People Also Ask / Search Questions */}
                {o.questions&&o.questions.length>0&&(
                  <div style={{marginTop:16,paddingTop:12,borderTop:'1px solid #e1ebf0'}}>
                    <strong style={{fontSize:13,color:'#31546c',display:'block',marginBottom:8}}>Google Search Questions (People Also Ask):</strong>
                    <div style={{display:'flex',flexDirection:'column',gap:8}}>
                      {o.questions.map((q,idx)=>(
                        <div key={idx} style={{padding:8,background:'#f8fafb',border:'1px solid #e2eaee',borderRadius:4}}>
                          <strong style={{fontSize:12,color:'#184867'}}>? {q.question}</strong>
                          {q.snippet&&<p style={{margin:'4px 0 0',fontSize:12,color:'#566e7c'}}>{short(q.snippet,200)}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Google Autocomplete */}
            {o.engine==='google_autocomplete'&&(
              <div>
                <strong style={{fontSize:13,color:'#31546c',display:'block',marginBottom:8}}>Live Keyword Suggestions:</strong>
                <div className="keyword-list">
                  {(o.suggestions||[]).map((s,idx)=>(
                    <span key={idx}>{s}</span>
                  ))}
                  {(!o.suggestions||o.suggestions.length===0)&&<p className="p-muted">No suggestions returned.</p>}
                </div>
              </div>
            )}

            {/* Google AI Mode */}
            {o.engine==='google_ai_mode'&&(
              <div>
                <strong style={{fontSize:13,color:'#31546c',display:'block',marginBottom:6}}>Sampled AI Mode Answer:</strong>
                <p className="ai-answer">{o.answer||'No answer text was returned for this sample.'}</p>
                <strong style={{fontSize:12,color:'#31546c',display:'block',marginTop:12,marginBottom:6}}>Sampled Sources & Citations:</strong>
                <div style={{display:'flex',flexDirection:'column',gap:4}}>
                  {(o.references||[]).slice(0,10).map((r,j)=>(
                    <a key={j} className="ref-link" href={r.link} target="_blank" rel="noopener noreferrer">
                      ↗ {short(r.title||r.link,90)}
                    </a>
                  ))}
                  {(!o.references||o.references.length===0)&&<p className="p-muted">No citations listed in this sampled answer.</p>}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function KeywordRadarView({run}){
  const observations=run.observations||[];
  const pages=run.crawl?.pages||[];
  const query=run.input?.query||'';

  // Use pre-computed keyword radar from runner
  const items=useMemo(()=>{
    if(run.keywordRadar&&run.keywordRadar.length>0)return run.keywordRadar;
    const suggestions=(run.observations||[]).filter(x=>x.engine==='google_autocomplete'&&x.status==='observed').flatMap(x=>x.suggestions||[]);
    const questions=(run.observations||[]).filter(x=>x.engine==='google'&&x.status==='observed').flatMap(x=>x.questions||[]);
    const combined=[
      ...suggestions.map(s=>({phrase:s,source:'Google Autocomplete',intent:'informational'})),
      ...questions.map(q=>({phrase:q.question,source:'Search Questions (PAA)',intent:'informational'}))
    ];
    return combined.map(item=>({
      phrase:item.phrase,
      intent:item.intent,
      source:item.source,
      gapStatus:(run.crawl?.pages||[]).some(p=>(p.title+' '+p.description).toLowerCase().includes(item.phrase.toLowerCase().split(' ')[0]))?'Covered':'Opportunity gap',
      recommendation:'Evaluate on-page coverage for this query.',
      limitations:'Observed from live SerpApi results. No metrics fabricated.'
    }));
  },[run.keywordRadar,run.observations,run.crawl?.pages]);

  const [intentFilter,setIntentFilter]=useState('all');
  const [gapFilter,setGapFilter]=useState('all');

  if(!items.length){
    return <div className="empty">No live search suggestions or questions available to construct the Keyword Gap Radar. Verify that SerpApi returned results.</div>;
  }

  const filtered=items.filter(item=>{
    if(intentFilter!=='all'&&item.intent!==intentFilter)return false;
    if(gapFilter==='gaps'&&item.gapStatus!=='Opportunity gap')return false;
    if(gapFilter==='covered'&&item.gapStatus!=='Covered')return false;
    return true;
  });

  const gapCount=items.filter(x=>x.gapStatus==='Opportunity gap').length;
  const partialCount=items.filter(x=>x.gapStatus==='Partial coverage').length;
  const coveredCount=items.filter(x=>x.gapStatus==='Covered').length;

  return (
    <div>
      {/* Top summary stats */}
      <div className="metrics" style={{marginBottom:20}}>
        <div>
          <span>OBSERVED PHRASES</span>
          <strong>{items.length}</strong>
          <small>From Autocomplete & PAA</small>
        </div>
        <div>
          <span>OPPORTUNITY GAPS</span>
          <strong style={{color:'#bd6b28'}}>{gapCount}</strong>
          <small>Not covered on-site</small>
        </div>
        <div>
          <span>PARTIAL OVERLAP</span>
          <strong>{partialCount}</strong>
          <small>Weak or incomplete match</small>
        </div>
        <div>
          <span>COVERED TOPICS</span>
          <strong style={{color:'#34856f'}}>{coveredCount}</strong>
          <small>Addressed on crawled pages</small>
        </div>
      </div>

      {/* Filter controls */}
      <div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:16,alignItems:'center',background:'#f0f5f8',padding:'10px 14px',borderRadius:6}}>
        <div style={{display:'flex',gap:6,alignItems:'center'}}>
          <span style={{fontSize:12,fontWeight:600,color:'#31546c'}}>Intent:</span>
          {[['all','All'],['informational','Informational'],['commercial','Commercial'],['transactional','Transactional']].map(([val,lbl])=>(
            <button
              key={val}
              type="button"
              className={intentFilter===val?'primary small':'outline-btn small'}
              onClick={()=>setIntentFilter(val)}
              style={{padding:'3px 8px',fontSize:11}}
            >
              {lbl}
            </button>
          ))}
        </div>

        <div style={{display:'flex',gap:6,alignItems:'center',marginLeft:'auto'}}>
          <span style={{fontSize:12,fontWeight:600,color:'#31546c'}}>Coverage:</span>
          {[['all','All'],['gaps','Gaps Only'],['covered','Covered Only']].map(([val,lbl])=>(
            <button
              key={val}
              type="button"
              className={gapFilter===val?'primary small':'outline-btn small'}
              onClick={()=>setGapFilter(val)}
              style={{padding:'3px 8px',fontSize:11}}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Table view */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>OBSERVED QUERY / QUESTION</th>
              <th>INTENT</th>
              <th>SOURCE</th>
              <th>SITE COVERAGE</th>
              <th>RECOMMENDATION</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item,i)=>(
              <tr key={i}>
                <td>
                  <strong>{item.phrase}</strong>
                  {item.matchingPageUrl&&(
                    <div className="micro" style={{marginTop:2}}>
                      Match: <a href={item.matchingPageUrl} target="_blank" rel="noopener noreferrer">{new URL(item.matchingPageUrl).pathname} ↗</a>
                    </div>
                  )}
                </td>
                <td>
                  <span className="tag" style={{textTransform:'capitalize'}}>{item.intent}</span>
                </td>
                <td>
                  <span className="micro">{item.source} ({item.hl?.toUpperCase()})</span>
                </td>
                <td>
                  <span className={`status ${item.gapStatus==='Covered'?'ok':item.gapStatus==='Opportunity gap'?'bad':'warn'}`}>
                    {item.gapStatus}
                  </span>
                </td>
                <td style={{fontSize:12,color:'#456172',maxWidth:320}}>
                  {item.recommendation}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="safety-note" style={{marginTop:16}}>
        ℹ <strong>Evidence Provenance:</strong> All keyword suggestions and People Also Ask questions are retrieved live from SerpApi for this scan. No keyword search volumes, CPC, or ranking difficulties are fabricated.
      </div>
    </div>
  );
}

function FindingsView({findings=[],run}){
  const [severityFilter,setSeverityFilter]=useState('all');

  const filtered=findings.filter(f=>{
    if(severityFilter==='all')return true;
    return f.severity===severityFilter;
  });

  return (
    <div>
      {/* AEO Visibility Card */}
      {run?.ai&&(
        <div className="evidence-card" style={{marginBottom:24,borderLeft:'4px solid var(--blue)'}}>
          <div className="evidence-title">
            <strong>AEO — Sampled Google AI Mode Visibility</strong>
            <span className={`status ${run.ai.cited?'ok':run.ai.mentioned?'warn':'muted'}`}>
              {run.ai.classification||'Sampled'}
            </span>
          </div>
          <div className="summary-list" style={{margin:'12px 0'}}>
            <div><span>Classification</span><b>{run.ai.classification}</b></div>
            <div><span>Brand Mentioned</span><b>{run.ai.mentioned?'Yes':'No'}</b></div>
            <div><span>Website Cited</span><b>{run.ai.cited?'Yes':'No'}</b></div>
            <div><span>Deep Page Linked</span><b>{run.ai.pageLinked?'Yes':'No'}</b></div>
            <div><span>Recommended</span><b>{run.ai.recommended?'Yes':'No'}</b></div>
            {run.ai.citedPage&&<div><span>Sampled Link</span><a href={run.ai.citedPage} target="_blank" rel="noopener noreferrer">{run.ai.citedPage} ↗</a></div>}
          </div>
          <p className="micro" style={{color:'#67808f',margin:0}}>
            ℹ {run.ai.reason} Absence of citation in one sampled answer does not imply the site never appears in AI systems.
          </p>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{display:'flex',gap:8,marginBottom:16,alignItems:'center'}}>
        <span style={{fontSize:12,color:'#5a7282'}}>Severity Filter:</span>
        {[['all','All Issues'],['high','High Priority'],['medium','Medium Priority'],['low','Low Priority'],['info','Info / Warnings']].map(([val,lbl])=>(
          <button
            key={val}
            type="button"
            className={severityFilter===val?'primary small':'outline-btn small'}
            onClick={()=>setSeverityFilter(val)}
            style={{padding:'4px 10px',fontSize:12}}
          >
            {lbl}
          </button>
        ))}
      </div>

      <div className="finding-list">
        {filtered.length ? (
          filtered.map(f=>(
            <div className="finding" key={f.id}>
              <div>
                <span className={'severity '+f.severity}>{f.severity}</span>
                <strong>{f.rule.replaceAll('-',' ')}</strong>
                <div className="micro">
                  <a href={f.pageUrl} target="_blank" rel="noopener noreferrer" style={{color:'#186899'}}>
                    {f.pageUrl} ↗
                  </a>
                </div>
                <p>{f.evidence}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="empty">No SEO issues match the chosen filter.</div>
        )}
      </div>
    </div>
  );
}

function PatchPanel({run}){
  const [copied,setCopied]=useState(false);

  if(!run.patch){
    return (
      <div className="empty">
        {run.input.repoUrl
          ? 'No safe source-code patch was generated. Check warnings above or ensure the target route exports static metadata.'
          : 'Supply an authorized public Next.js GitHub repository URL on your next scan to generate a source-code patch.'}
      </div>
    );
  }

  const copyDiff=()=>{
    navigator.clipboard?.writeText(run.patch.diff);
    setCopied(true);
    setTimeout(()=>setCopied(false),2500);
  };

  return (
    <>
      <div className="patch-meta">
        <strong>{run.patch.file}</strong>
        <a href={run.patch.sourceUrl} target="_blank" rel="noopener noreferrer">
          View GitHub source file ↗
        </a>
      </div>

      <div className="proof-stats">
        <div>
          <span>TRIGGERING FINDING</span>
          <code>{run.patch.findingId}</code>
        </div>
        <div>
          <span>LIVE SOURCE REFERENCES</span>
          <strong>{run.patch.evidenceIds?.length||0}</strong>
        </div>
        <div>
          <span>PATCH VALIDATION</span>
          <Status status={run.verification?.passed?'passed':'failed'}/>
        </div>
      </div>

      <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:8}}>
        <div className="code-head" style={{marginBottom:0}}>REAL GITHUB SOURCE — GENERATED UNIFIED DIFF</div>
        <button
          type="button"
          className="outline-btn small"
          onClick={copyDiff}
          style={{marginLeft:'auto',padding:'3px 10px',fontSize:11}}
        >
          {copied?'✓ Copied!':'Copy Diff'}
        </button>
      </div>

      <pre className="code-diff">{run.patch.diff}</pre>

      <div className="report-actions" style={{marginTop:20}}>
        <button
          type="button"
          className="primary small"
          onClick={()=>{
            const blob=new Blob([run.patch.diff],{type:'text/plain; charset=utf-8'});
            const url=URL.createObjectURL(blob);
            const a=document.createElement('a');
            a.href=url;
            a.download=`serpforge-${run.id}.patch`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }}
        >
          ↓ Download .patch file
        </button>
      </div>

      <div className="safety-note" style={{marginTop:16}}>
        <strong>Validation Status:</strong> ✓ {run.verification?.reason}
        <br/><br/>
        <strong>How to apply locally:</strong>
        <code style={{display:'block',marginTop:6,background:'#e7eff3',padding:'6px 10px',borderRadius:4,fontSize:12}}>
          git apply serpforge-{run.id}.patch
        </code>
        <br/>
        The GitHub repository has not been modified automatically. Apply and review the patch locally, run your tests, deploy to your host, then run a fresh SERPForge scan to observe deployed results.
      </div>
    </>
  );
}

export default function RunPage({params}){
  const {id}=use(params);
  const [run,setRun]=useState(null);
  const [error,setError]=useState('');
  const [tab,setTab]=useState('overview');

  const downloadReport=(format)=>{
    if(!run)return;
    let content, mime, filename;
    if(format==='json'){
      content=JSON.stringify(run,null,2);
      mime='application/json';
      filename=`serpforge-${run.id}.json`;
    }else{
      const lines=[
        `# SERPForge Live Investigation Report: ${run.id}`,
        '',
        `**Status:** ${run.status}`,
        `**Started:** ${run.startedAt}`,
        `**Updated:** ${run.updatedAt}`,
        `**Target Website:** ${run.input?.url}`,
        `**Search Query:** ${run.input?.query}`,
        `**Google Locales:** ${(run.input?.languages||[]).join(', ').toUpperCase()}`,
        `**GitHub Repository:** ${run.input?.repoUrl||'None supplied'}`,
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
        '## 5. Generated Next.js Metadata Patch',
        run.patch?.diff ? `\`\`\`diff\n${run.patch.diff}\n\`\`\`` : 'No patch generated.'
      ].filter(Boolean);
      content=lines.join('\n');
      mime='text/markdown; charset=utf-8';
      filename=`serpforge-${run.id}.md`;
    }
    const blob=new Blob([content],{type:mime});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadPatch=()=>{
    if(!run?.patch?.diff)return;
    const blob=new Blob([run.patch.diff],{type:'text/plain; charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=`serpforge-${run.id}.patch`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(()=>{
    try{
      const cached=sessionStorage.getItem(`serpforge_run_${id}`);
      if(cached){
        const parsed=JSON.parse(cached);
        setRun(parsed);
        if(['completed','partial','failed'].includes(parsed.status))return;
      }
    }catch{}

    let stopped=false,timer;
    async function poll(){
      try{
        const r=await fetch(`/api/run/${encodeURIComponent(id)}`,{cache:'no-store'});
        if(!r.ok)throw new Error('Investigation not found');
        const body=await r.json();
        if(!stopped){
          setRun(body);
          if(['queued','running'].includes(body.status))timer=setTimeout(poll,2000);
        }
      }catch(e){
        if(!stopped){setError(e.message);timer=setTimeout(poll,5000);}
      }
    }
    poll();
    return()=>{stopped=true;clearTimeout(timer)};
  },[id]);

  const pages=run?.crawl?.pages||[];
  const findings=run?.findings||[];
  const live=run?.observations?.filter(o=>o.source==='live'&&o.status==='observed').length||0;

  return (
    <div className="shell">
      <Nav active="scan"/>
      <main className="content">
        <div className="topbar">
          <div className="breadcrumbs">
            <Link href="/">WORKSPACE</Link> <span>/</span> INVESTIGATION <span>/</span> {id.slice(0,12)}
          </div>
          <div className="topright">
            <span className="tiny-circle"/> OBSERVED EVIDENCE ONLY
          </div>
        </div>

        {error&&<div className="error-msg">{error}</div>}

        {!run ? (
          <div className="loading-page">Loading investigation…</div>
        ) : (
          <>
            <div className="run-header">
              <div>
                <div className="eyebrow">SEARCH + SITE INVESTIGATION</div>
                <h1>Website <em>intelligence.</em></h1>
                <p>{run.input.url} <span className="dotsep">·</span> &quot;{run.input.query}&quot;</p>
              </div>
              <Status status={run.status}/>
            </div>

            <div className="metrics">
              <div>
                <span>PAGES CRAWLED</span>
                <strong>{pages.length}</strong>
                <small>Actual public pages</small>
              </div>
              <div>
                <span>SEO FINDINGS</span>
                <strong>{findings.length}</strong>
                <small>Rules-based observations</small>
              </div>
              <div>
                <span>LIVE SEARCH SOURCES</span>
                <strong>{live}</strong>
                <small>SerpApi queries returned</small>
              </div>
              <div>
                <span>SOURCE PATCH</span>
                <strong>{run.patch?'Ready':'—'}</strong>
                <small>Never auto-deployed</small>
              </div>
            </div>

            <div className="tabs">
              {[
                ['overview','Overview'],
                ['crawl','Live Spider'],
                ['evidence','Search Evidence'],
                ['radar','Keyword Radar'],
                ['findings','SEO & AEO Findings'],
                ['proof','Code Fix']
              ].map(([key,label])=>(
                <button
                  key={key}
                  className={tab===key?'selected':''}
                  onClick={()=>setTab(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Tab 1: Overview */}
            {tab==='overview'&&(
              <div className="two-col">
                <section className="panel pad">
                  <div className="section-kicker">EXECUTION TIMELINE</div>
                  <h2>What happened</h2>
                  <StepView steps={run.steps}/>
                </section>

                <section className="panel pad">
                  <div className="section-kicker">INVESTIGATION CONTEXT</div>
                  <h2>Source details</h2>
                  <div className="summary-list">
                    <div><span>Target Website</span><strong>{run.input.url}</strong></div>
                    <div><span>Search Query</span><strong>{run.input.query}</strong></div>
                    <div><span>GitHub Repository</span><strong>{run.input.repoUrl||'Not supplied'}</strong></div>
                    <div><span>Google Locales</span><strong>{run.input.languages?.join(' · ')?.toUpperCase()}</strong></div>
                    <div><span>AI Mode Sample</span><strong>{run.ai?.status||'Pending'}</strong></div>
                    <div><span>AEO Classification</span><strong>{run.ai?.classification||'Unavailable'}</strong></div>
                  </div>

                  {run.warnings?.map((w,i)=>(
                    <div className="notice" key={i}>{w}</div>
                  ))}

                  {run.error&&<div className="error-msg">{run.error}</div>}

                  <div className="safety-note">
                    ℹ Live observations describe a sample in a particular location and time. Search rankings, traffic volumes, and AI visibility changes require future observation and cannot be guaranteed.
                  </div>
                </section>
              </div>
            )}

            {/* Tab 2: Spider View */}
            {tab==='crawl'&&(
              <section className="panel pad">
                <div className="section-kicker">LIVE SITE TRAVERSAL</div>
                <h2>Spider · Actual page connections</h2>
                <p className="p-muted">
                  The spider follows only pages actually crawled in this investigation. Pan and zoom the canvas, replay recorded traversal events, or switch to the accessible table view.
                </p>
                <SpiderGraph pages={pages} findings={findings} running={run.crawl?.status==='running'}/>
              </section>
            )}

            {/* Tab 3: Search Evidence */}
            {tab==='evidence'&&(
              <section className="panel pad">
                <div className="section-kicker">LIVE SERPAPI OBSERVATIONS</div>
                <h2>Search evidence, questions & AI answers</h2>
                <p className="p-muted">
                  All observations are fetched for this run. No cache playback, sample listings, or invented rankings.
                </p>
                <Evidence run={run}/>
              </section>
            )}

            {/* Tab 4: Keyword Radar */}
            {tab==='radar'&&(
              <section className="panel pad">
                <div className="section-kicker">SEARCH OPPORTUNITIES</div>
                <h2>Keyword Gap Radar</h2>
                <p className="p-muted">
                  Observed Google Autocomplete queries and People Also Ask questions compared with on-page text overlap. Candidate gaps are not estimates of search demand or ranking difficulty.
                </p>
                <KeywordRadarView run={run}/>
              </section>
            )}

            {/* Tab 5: Findings */}
            {tab==='findings'&&(
              <section className="panel pad">
                <div className="section-kicker">DETERMINISTIC CHECKS & AEO ANALYSIS</div>
                <h2>Technical SEO & AEO findings</h2>
                <p className="p-muted">
                  Every technical finding is linked directly to the observed page. Sampled AEO observations reflect SerpApi Google AI Mode responses.
                </p>
                <FindingsView findings={findings} run={run}/>
              </section>
            )}

            {/* Tab 6: Code Fix */}
            {tab==='proof'&&(
              <section className="panel pad">
                <div className="section-kicker">OBSERVATION → FINDING → REVIEWABLE SOURCE DIFF</div>
                <h2>Code improvements</h2>
                <p className="p-muted">
                  Changes are generated from the actual public GitHub source file. Validation checks the supported Next.js metadata transform; review before applying.
                </p>
                <PatchPanel run={run}/>
              </section>
            )}

            {/* Export Footer */}
            <div className="report-footer">
              <div>
                <span className="report-title">Export real investigation data</span>
                <small>Includes timestamps, SerpApi sources, findings, and technical limitations.</small>
              </div>
              <div className="report-actions">
                <button type="button" onClick={()=>downloadReport('md')} className="outline-btn">↓ Markdown Report</button>
                <button type="button" onClick={()=>downloadReport('json')} className="outline-btn">↓ JSON Report</button>
                {run.patch&&<button type="button" onClick={downloadPatch} className="outline-btn">↓ Unified .patch</button>}
                <Link href="/" className="primary small">New scan ↗</Link>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
