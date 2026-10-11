'use client';
import {useEffect,useMemo,useState} from 'react';

const label=(url)=>{try{const p=new URL(url).pathname;return p==='/'?'Homepage':decodeURIComponent(p).replace(/\/$/,'').slice(0,32)}catch{return url}};
function positions(pages){
  const n=pages.length,cols=Math.max(3,Math.ceil(Math.sqrt(n*1.55)));
  const marginX=85,marginY=72,gapX=160,gapY=135;
  return new Map(pages.map((p,i)=>[p.url,{x:marginX+(i%cols)*gapX,y:marginY+Math.floor(i/cols)*gapY}]));
}
export default function SpiderGraph({pages=[],findings=[],running=false}){
  const [selected,setSelected]=useState(null),[zoom,setZoom]=useState(1),[showEdges,setShowEdges]=useState(true);
  const shown=pages.filter(p=>p?.url);
  const coords=useMemo(()=>positions(shown),[pages]);
  const current=shown.at(-1),active=selected?shown.find(p=>p.url===selected):current;
  const severity=p=>findings.filter(f=>f.pageUrl===p.url);
  const cols=Math.max(3,Math.ceil(Math.sqrt(shown.length*1.55))),height=Math.max(250,Math.ceil(shown.length/cols)*135+80),width=Math.max(550,cols*160+10);
  const latest=coords.get(current?.url);
  useEffect(()=>{if(selected&&!shown.some(p=>p.url===selected))setSelected(null)},[selected,pages]);
  if(!shown.length)return <div className="empty">Waiting for the first actual page to be crawled. The graph will populate as links are discovered.</div>;
  return <div className="spider-shell">
    <div className="spider-toolbar"><div><span className={'scan-dot '+(running?'spinning':'')}/><strong>{running?'Crawling real links':'Observed website structure'}</strong> <span className="spider-small">{shown.length} pages · {shown.reduce((n,p)=>n+(p.links||[]).filter(l=>coords.has(l)).length,0)} actual links</span></div><div className="spider-controls"><button type="button" onClick={()=>setZoom(z=>Math.max(.55,+(z-.15).toFixed(2)))} aria-label="Zoom out">−</button><span>{Math.round(zoom*100)}%</span><button type="button" onClick={()=>setZoom(z=>Math.min(1.8,+(z+.15).toFixed(2)))} aria-label="Zoom in">+</button><button type="button" onClick={()=>{setZoom(1);setSelected(null)}}>Reset</button><button type="button" onClick={()=>setShowEdges(v=>!v)}>{showEdges?'Hide':'Show'} links</button></div></div>
    <div className="spider-main"><div className="spider-canvas" tabIndex="0" aria-label="Interactive graph of pages actually crawled"><svg viewBox={`0 0 ${width} ${height}`} width={Math.round(width*zoom)} height={Math.round(height*zoom)} role="img" aria-label="Website crawl graph with clickable page nodes">
      <defs><marker id="edge-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6" fill="none" stroke="#9cb3c4" strokeWidth="1"/></marker></defs>
      {showEdges&&shown.flatMap(p=>(p.links||[]).filter(l=>coords.has(l)&&l!==p.url).map((l,i)=>{const a=coords.get(p.url),b=coords.get(l);return <line key={p.url+l+i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#a9c3d4" strokeWidth="1.5" markerEnd="url(#edge-arrow)" opacity=".8"/>}))}
      {shown.map((p,i)=>{const pt=coords.get(p.url),issues=severity(p),bad=p.status!==200,selectedNode=active?.url===p.url,color=bad?'#8f9baa':issues.some(f=>f.severity==='high')?'#d28a52':issues.length?'#d5b461':'#4b9b84';return <g key={p.url} role="button" aria-label={`${label(p.url)}; ${issues.length} issues; HTTP ${p.status}`} tabIndex="0" onClick={()=>setSelected(p.url)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelected(p.url)}}} className="spider-node" style={{cursor:'pointer'}}>
        {selectedNode&&<circle cx={pt.x} cy={pt.y} r="38" stroke={color} strokeWidth="1.8" strokeDasharray="4 4" fill="none" opacity=".65"/>}
        <circle cx={pt.x} cy={pt.y} r="27" stroke={color} strokeWidth="2.5" fill={selectedNode?'#fefefe':'#f5fafc'}/>
        <text x={pt.x} y={pt.y+5} fontWeight="700" fontSize="13" textAnchor="middle" fill="#31546c">{i+1}</text>
        <text x={pt.x} y={pt.y+47} textAnchor="middle" fill="#516c7a" fontSize="11">{label(p.url).slice(0,22)}</text>
        <title>{p.url} · HTTP {p.status} · {issues.length} finding(s)</title>
      </g>})}
      {latest&&<g className="spider-creature" style={{transform:`translate(${latest.x}px,${latest.y-34}px)`,transition:'transform .75s ease-in-out',pointerEvents:'none'}} aria-hidden="true">
        <g stroke="#20394e" strokeWidth="2.4" strokeLinecap="round" fill="none"><path d="M-8 -1L-17 -9L-22 -7 M-9 3L-19 0L-23 5 M-8 7L-16 14L-21 13 M8 -1L17 -9L22 -7 M9 3L19 0L23 5 M8 7L16 14L21 13"/></g><circle r="13" cy="2" fill="#20394e"/><circle r="8" cy="-8" fill="#254f66"/><circle cx="-4" cy="-10" r="2" fill="#fff"/><circle cx="4" cy="-10" r="2" fill="#fff"/>
      </g>}
    </svg></div>
    <aside className="spider-details"><div className="section-kicker">SELECTED PAGE</div>{active?<><strong>{label(active.url)}</strong><a href={active.url} target="_blank" rel="noopener noreferrer" className="spider-url">{active.url} ↗</a><div className="spider-data"><span>HTTP response</span><b>{active.status||'Error'}</b></div><div className="spider-data"><span>Visit order</span><b>{active.order??'—'}</b></div><div className="spider-data"><span>Incoming from</span><b>{active.parent?label(active.parent):'Starting page'}</b></div><div className="spider-data"><span>Outgoing links</span><b>{active.links?.length||0}</b></div><div className="spider-data"><span>H1 headings</span><b>{active.h1Count??'—'}</b></div><div className="spider-data"><span>Issues</span><b>{severity(active).length}</b></div><div className="spider-findings">{severity(active).map(f=><div key={f.id}><span className={'severity '+f.severity}>{f.severity}</span>{f.rule.replaceAll('-',' ')}</div>)}{!severity(active).length&&<p>No issues detected by configured checks.</p>}</div></>:<p>No page selected.</p>}</aside></div>
    <div className="spider-key"><span><i style={{background:'#4b9b84'}}/> No recorded issue</span><span><i style={{background:'#d5b461'}}/> Review finding</span><span><i style={{background:'#d28a52'}}/> High-priority finding</span><span><i style={{background:'#8f9baa'}}/> Unavailable</span></div>
  </div>;
}
