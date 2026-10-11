'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import Nav from '../components/Nav';

export default function Home(){
  const router=useRouter();
  const [url,setUrl]=useState('');
  const [repoUrl,setRepoUrl]=useState('');
  const [query,setQuery]=useState('');
  const [accessKey,setAccessKey]=useState('');
  const [languages,setLanguages]=useState(['en']);
  const [running,setRunning]=useState(false);
  const [error,setError]=useState('');
  const [phase,setPhase]=useState('');

  async function submit(e){
    e.preventDefault();
    setError('');
    setRunning(true);
    setPhase('Starting live investigation — crawling website…');
    try{
      // POST now waits for the full scan to complete (up to ~3 minutes).
      // Show a descriptive loading message while the server works.
      const scanMsg=[
        'Validating target and checking robots.txt…',
        'Crawling public pages via the live web…',
        'Requesting live Google Search results from SerpApi…',
        'Requesting live Google Autocomplete data…',
        'Sampling Google AI Mode answer…',
        'Analysing SEO findings…',
        'Generating code patch (if repository supplied)…',
        'Finalising investigation…',
      ];
      let msgIdx=0;
      const ticker=setInterval(()=>{msgIdx=(msgIdx+1)%scanMsg.length;setPhase(scanMsg[msgIdx])},4500);
      let run;
      try{
        const r=await fetch('/api/run',{
          method:'POST',
          headers:{'Content-Type':'application/json',...(accessKey?{'X-SERPForge-Access':accessKey}:{})},
          body:JSON.stringify({url,repoUrl,query,languages}),
        });
        clearInterval(ticker);
        const body=await r.json();
        if(!r.ok)throw new Error(body.error||'Unable to complete live investigation');
        run=body;
      }catch(fetchErr){
        clearInterval(ticker);
        throw fetchErr;
      }
      // Navigate to the results page, passing run data via sessionStorage so
      // the results page can render immediately without another network round-trip.
      try{sessionStorage.setItem(`serpforge_run_${run.id}`,JSON.stringify(run))}catch{}
      router.push(`/run/${run.id}`);
    }catch(e){
      setError(e.message);
      setRunning(false);
      setPhase('');
    }
  }

  return <div className="shell"><Nav active="overview"/><main className="content">
    <div className="topbar"><div className="breadcrumbs">WORKSPACE <span>/</span> NEW INVESTIGATION</div><div className="topright"><span className="tiny-circle"/> LIVE SEARCH + REAL WEBSITE CRAWL</div></div>
    <div className="welcome"><div><div className="eyebrow"><span className="sparkle">✦</span> EVIDENCE-FIRST SEO + AI VISIBILITY</div><h1>Discover the gaps.<br/><em>Engineer the fix.</em></h1><p>Analyze a public website, research current Google and AI Mode results, explore the actual crawl graph and generate reviewable Next.js source changes.</p></div></div>
    <section className="panel start-panel"><div className="panel-top"><div><div className="section-kicker">NEW LIVE ANALYSIS</div><h2>Investigate a website</h2><p>Every page, link, search result, and issue is collected during your scan. No preloaded products or artificial scan statistics.</p></div><span className="capsule">01 / START</span></div>
      {running
        ? <div style={{padding:'36px 0',textAlign:'center'}}>
            <div className="loading-page" style={{background:'none',border:'none'}}>
              <div style={{fontSize:32,marginBottom:16}}>🔍</div>
              <strong style={{fontSize:16,display:'block',marginBottom:12,color:'#244256'}}>Live investigation in progress…</strong>
              <p style={{color:'#6a7d88',fontSize:13,maxWidth:480,margin:'0 auto 18px'}}>{phase}</p>
              <div style={{fontSize:11,color:'#9baab2',lineHeight:1.8}}>
                The scan runs real network requests — crawling your website, fetching live Google results via SerpApi, and sampling the AI Mode answer. This typically takes <strong>60–180 seconds</strong>. Please keep this tab open.
              </div>
              <div style={{marginTop:20,height:4,background:'#e2e9ec',borderRadius:2,overflow:'hidden'}}>
                <div style={{height:'100%',background:'var(--blue)',borderRadius:2,animation:'scanprogress 3s ease-in-out infinite'}}/>
              </div>
            </div>
          </div>
        : <form onSubmit={submit}><div className="form-grid">
            <label className="field"><span>PUBLIC HTTPS WEBSITE</span><div className="field-input"><span>◎</span><input type="url" value={url} onChange={e=>setUrl(e.target.value)} required placeholder="https://your-website.com"/></div><small>Same-origin public pages only · robots policy respected · maximum 15 pages</small></label>
            <label className="field"><span>SEARCH QUERY TO INVESTIGATE</span><div className="field-input"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} required maxLength={180} placeholder="e.g. web design services Bengaluru"/></div><small>Used for genuine live Google and AI-answer research</small></label>
            <label className="field"><span>PUBLIC GITHUB REPOSITORY <span style={{fontWeight:400}}>— optional</span></span><div className="field-input"><span>⑂</span><input type="url" value={repoUrl} onChange={e=>setRepoUrl(e.target.value)} placeholder="https://github.com/owner/repository"/></div><small>Enables a downloadable, source-validated Next.js metadata patch. No repository is changed on the server.</small></label>
            <label className="field"><span>ACCESS KEY <span style={{fontWeight:400}}>— only if enabled by site owner</span></span><div className="field-input"><span>⚿</span><input type="password" autoComplete="off" value={accessKey} onChange={e=>setAccessKey(e.target.value)} placeholder="Optional site access key"/></div><small>Not saved in the browser or included in the scan report</small></label>
          </div><div className="form-bottom"><div><div className="field-name">GOOGLE SEARCH LOCALES</div><div className="checks">{[['en','English'],['hi','हिन्दी'],['kn','ಕನ್ನಡ']].map(([code,label])=><label className="check-item" key={code}><input type="checkbox" checked={languages.includes(code)} onChange={e=>setLanguages(v=>e.target.checked?[...v,code]:v.filter(x=>x!==code))}/><span>{label}</span></label>)}</div></div><button className="primary" disabled={languages.length===0}>Start live investigation <span>↗</span></button></div>
          {error&&<div className="error-msg" role="alert">{error}</div>}</form>
      }
    </section>
    <section className="howgrid"><div className="mini-card"><div className="mini-icon blue-bg">⌕</div><strong>01 · Discover</strong><p>Fresh Google Search, Autocomplete and AI Mode results from SerpApi.</p></div><div className="mini-card"><div className="mini-icon gold-bg">🕸</div><strong>02 · Crawl</strong><p>Live website pages and true hyperlink relationships, drawn as an interactive Spider.</p></div><div className="mini-card"><div className="mini-icon purple-bg">◇</div><strong>03 · Analyze</strong><p>Deterministic SEO checks, query opportunities and linked evidence.</p></div><div className="mini-card"><div className="mini-icon green-bg">↗</div><strong>04 · Improve</strong><p>Safe, source-validated Next.js metadata changes for review and download.</p></div></section>
    <div className="fineprint">Technical source validation is not a deployed website update. Search observations are not ranking, traffic or AI-citation guarantees. Your configured SerpApi API key is required.</div>
  </main></div>;
}
