'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import Nav from '../components/Nav';
export default function Home(){
  const router=useRouter();
  const [url,setUrl]=useState(''),[repoUrl,setRepoUrl]=useState(''),[query,setQuery]=useState(''),[accessKey,setAccessKey]=useState('');
  const [languages,setLanguages]=useState(['en']),[running,setRunning]=useState(false),[error,setError]=useState('');
  async function submit(e){
    e.preventDefault();setError('');setRunning(true);
    try{
      const r=await fetch('/api/run',{method:'POST',headers:{'Content-Type':'application/json',...(accessKey?{'X-SERPForge-Access':accessKey}:{})},body:JSON.stringify({url,repoUrl,query,languages})});
      const body=await r.json();if(!r.ok)throw new Error(body.error||'Unable to begin live investigation');router.push(`/run/${body.runId}`);
    }catch(e){setError(e.message);setRunning(false)}
  }
  return <div className="shell"><Nav active="overview"/><main className="content">
    <div className="topbar"><div className="breadcrumbs">WORKSPACE <span>/</span> NEW INVESTIGATION</div><div className="topright"><span className="tiny-circle"/> LIVE SEARCH + REAL WEBSITE CRAWL</div></div>
    <div className="welcome"><div><div className="eyebrow"><span className="sparkle">✦</span> EVIDENCE-FIRST SEO + AI VISIBILITY</div><h1>Discover the gaps.<br/><em>Engineer the fix.</em></h1><p>Analyze a public website, research current Google and AI Mode results, explore the actual crawl graph and generate reviewable Next.js source changes.</p></div></div>
    <section className="panel start-panel"><div className="panel-top"><div><div className="section-kicker">NEW LIVE ANALYSIS</div><h2>Investigate a website</h2><p>Every page, link, search result, and issue is collected during your scan. No preloaded products or artificial scan statistics.</p></div><span className="capsule">01 / START</span></div>
      <form onSubmit={submit}><div className="form-grid">
        <label className="field"><span>PUBLIC HTTPS WEBSITE</span><div className="field-input"><span>◎</span><input type="url" value={url} onChange={e=>setUrl(e.target.value)} required placeholder="https://your-website.com"/></div><small>Same-origin public pages only · robots policy respected · maximum 15 pages</small></label>
        <label className="field"><span>SEARCH QUERY TO INVESTIGATE</span><div className="field-input"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} required maxLength={180} placeholder="e.g. web design services Bengaluru"/></div><small>Used for genuine live Google and AI-answer research</small></label>
        <label className="field"><span>PUBLIC GITHUB REPOSITORY <span style={{fontWeight:400}}>— optional</span></span><div className="field-input"><span>⑂</span><input type="url" value={repoUrl} onChange={e=>setRepoUrl(e.target.value)} placeholder="https://github.com/owner/repository"/></div><small>Enables a downloadable, source-validated Next.js metadata patch. No repository is changed on the server.</small></label>
        <label className="field"><span>ACCESS KEY <span style={{fontWeight:400}}>— only if enabled by site owner</span></span><div className="field-input"><span>⚿</span><input type="password" autoComplete="off" value={accessKey} onChange={e=>setAccessKey(e.target.value)} placeholder="Optional site access key"/></div><small>Not saved in the browser or included in the scan report</small></label>
      </div><div className="form-bottom"><div><div className="field-name">GOOGLE SEARCH LOCALES</div><div className="checks">{[['en','English'],['hi','हिन्दी'],['kn','ಕನ್ನಡ']].map(([code,label])=><label className="check-item" key={code}><input type="checkbox" checked={languages.includes(code)} onChange={e=>setLanguages(v=>e.target.checked?[...v,code]:v.filter(x=>x!==code))}/><span>{label}</span></label>)}</div></div><button className="primary" disabled={running||languages.length===0}>{running?'Launching live crawl…':'Start live investigation'} <span>↗</span></button></div>
      {error&&<div className="error-msg" role="alert">{error}</div>}</form>
    </section>
    <section className="howgrid"><div className="mini-card"><div className="mini-icon blue-bg">⌕</div><strong>01 · Discover</strong><p>Fresh Google Search, Autocomplete and AI Mode results from SerpApi.</p></div><div className="mini-card"><div className="mini-icon gold-bg">🕸</div><strong>02 · Crawl</strong><p>Live website pages and true hyperlink relationships, drawn as an interactive Spider.</p></div><div className="mini-card"><div className="mini-icon purple-bg">◇</div><strong>03 · Analyze</strong><p>Deterministic SEO checks, query opportunities and linked evidence.</p></div><div className="mini-card"><div className="mini-icon green-bg">↗</div><strong>04 · Improve</strong><p>Safe, source-validated Next.js metadata changes for review and download.</p></div></section>
    <div className="fineprint">Technical source validation is not a deployed website update. Search observations are not ranking, traffic or AI-citation guarantees. Your configured SerpApi API key is required.</div>
  </main></div>;
}
