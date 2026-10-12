'use client';
import {useEffect,useMemo,useState,useRef} from 'react';

const label=(url)=>{
  try{
    const p=new URL(url).pathname;
    return p==='/'?'Homepage':decodeURIComponent(p).replace(/\/$/,'').slice(0,32);
  }catch{return url}
};

function positions(pages){
  const n=pages.length,cols=Math.max(3,Math.ceil(Math.sqrt(n*1.55)));
  const marginX=85,marginY=72,gapX=160,gapY=135;
  return new Map(pages.map((p,i)=>[p.url,{x:marginX+(i%cols)*gapX,y:marginY+Math.floor(i/cols)*gapY}]));
}

export default function SpiderGraph({pages=[],findings=[],running=false}){
  const [selected,setSelected]=useState(null);
  const [zoom,setZoom]=useState(1);
  const [pan,setPan]=useState({x:0,y:0});
  const [isPanning,setIsPanning]=useState(false);
  const [startPan,setStartPan]=useState({x:0,y:0});
  const [showEdges,setShowEdges]=useState(true);
  const [searchFilter,setSearchFilter]=useState('');
  const [severityFilter,setSeverityFilter]=useState('all');
  const [viewMode,setViewMode]=useState('graph'); // 'graph' | 'table'

  // Traversal playback
  const [playbackStep,setPlaybackStep]=useState(pages.length>0?pages.length-1:0);
  const [isPlaying,setIsPlaying]=useState(false);
  const [playbackSpeed,setPlaybackSpeed]=useState(1000); // ms per step
  const [prefersReducedMotion,setPrefersReducedMotion]=useState(false);

  const containerRef=useRef(null);

  // Check user motion preferences
  useEffect(()=>{
    if(typeof window!=='undefined'){
      const mq=window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mq.matches);
      const handler=e=>setPrefersReducedMotion(e.matches);
      mq.addEventListener?.('change',handler);
      return ()=>mq.removeEventListener?.('change',handler);
    }
  },[]);

  // Update playback step when pages grow or scan completes
  useEffect(()=>{
    if(running){
      setPlaybackStep(Math.max(0,pages.length-1));
    }
  },[pages.length,running]);

  // Traversal playback ticker
  useEffect(()=>{
    if(!isPlaying||running||pages.length<=1)return;
    const timer=setInterval(()=>{
      setPlaybackStep(curr=>{
        if(curr>=pages.length-1){
          setIsPlaying(false);
          return curr;
        }
        return curr+1;
      });
    },playbackSpeed);
    return ()=>clearInterval(timer);
  },[isPlaying,running,pages.length,playbackSpeed]);

  const allShown=pages.filter(p=>p?.url);
  const coords=useMemo(()=>positions(allShown),[allShown]);
  
  // Filter pages for view
  const severity=p=>findings.filter(f=>f.pageUrl===p.url);

  const filteredPages=useMemo(()=>{
    return allShown.filter(p=>{
      if(searchFilter){
        const q=searchFilter.toLowerCase();
        const matchUrl=p.url.toLowerCase().includes(q);
        const matchTitle=(p.title||'').toLowerCase().includes(q);
        if(!matchUrl&&!matchTitle)return false;
      }
      if(severityFilter==='high'){
        return severity(p).some(f=>f.severity==='high');
      }
      if(severityFilter==='issues'){
        return severity(p).length>0;
      }
      if(severityFilter==='clean'){
        return severity(p).length===0&&p.status===200;
      }
      return true;
    });
  },[allShown,searchFilter,severityFilter,findings]);

  // Current active node for info panel
  const activePage=selected?allShown.find(p=>p.url===selected):(allShown[playbackStep]||allShown.at(-1));

  // Node position of spider creature
  const spiderPage=running?allShown.at(-1):(allShown[playbackStep]||allShown.at(-1));
  const spiderPos=coords.get(spiderPage?.url);

  const cols=Math.max(3,Math.ceil(Math.sqrt(allShown.length*1.55)));
  const height=Math.max(260,Math.ceil(allShown.length/cols)*135+80);
  const width=Math.max(560,cols*160+10);

  // Pan handlers
  const handleMouseDown=(e)=>{
    if(e.button!==0)return;
    setIsPanning(true);
    setStartPan({x:e.clientX-pan.x,y:e.clientY-pan.y});
  };

  const handleMouseMove=(e)=>{
    if(!isPanning)return;
    setPan({x:e.clientX-startPan.x,y:e.clientY-startPan.y});
  };

  const handleMouseUp=()=>setIsPanning(false);

  const handleWheel=(e)=>{
    e.preventDefault();
    const delta=e.deltaY<0?0.1:-0.1;
    setZoom(z=>Math.max(0.5,Math.min(2.0,+(z+delta).toFixed(2))));
  };

  const resetView=()=>{
    setZoom(1);
    setPan({x:0,y:0});
    setSelected(null);
  };

  if(!allShown.length){
    return <div className="empty">Waiting for the first actual page to be crawled. The graph will populate as links are discovered.</div>;
  }

  return (
    <div className="spider-shell">
      {/* Top toolbar */}
      <div className="spider-toolbar">
        <div>
          <span className={'scan-dot '+(running?'spinning':'')}/>
          <strong>
            {running
              ? 'Live crawl traversal in progress'
              : isPlaying
              ? `Playback of recorded crawl traversal (step ${playbackStep+1} of ${allShown.length})`
              : 'Observed crawl graph'}
          </strong>
          <span className="spider-small">
            {allShown.length} pages · {allShown.reduce((n,p)=>n+(p.links||[]).filter(l=>coords.has(l)).length,0)} actual links
          </span>
        </div>

        <div className="spider-controls">
          <button type="button" onClick={()=>setViewMode(v=>v==='graph'?'table':'graph')}>
            {viewMode==='graph'?'Accessible Table View':'Graph View'}
          </button>
          {viewMode==='graph'&&<>
            <button type="button" onClick={()=>setZoom(z=>Math.max(0.5,+(z-0.15).toFixed(2)))} aria-label="Zoom out">−</button>
            <span>{Math.round(zoom*100)}%</span>
            <button type="button" onClick={()=>setZoom(z=>Math.min(2.0,+(z+0.15).toFixed(2)))} aria-label="Zoom in">+</button>
            <button type="button" onClick={resetView}>Reset View</button>
            <button type="button" onClick={()=>setShowEdges(v=>!v)}>{showEdges?'Hide':'Show'} links</button>
          </>}
        </div>
      </div>

      {/* Filter and playback control bar */}
      <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'center',padding:'8px 12px',background:'#f0f5f8',borderBottom:'1px solid #d5e2e8',fontSize:12}}>
        <div style={{display:'flex',gap:6,alignItems:'center'}}>
          <span>Filter:</span>
          <input
            type="text"
            placeholder="Search page URL or title…"
            value={searchFilter}
            onChange={e=>setSearchFilter(e.target.value)}
            style={{padding:'4px 8px',fontSize:12,border:'1px solid #c2d3dd',borderRadius:4,width:180}}
          />
        </div>

        <div style={{display:'flex',gap:6,alignItems:'center'}}>
          <span>Issues:</span>
          <select
            value={severityFilter}
            onChange={e=>setSeverityFilter(e.target.value)}
            style={{padding:'4px 8px',fontSize:12,border:'1px solid #c2d3dd',borderRadius:4}}
          >
            <option value="all">All pages ({allShown.length})</option>
            <option value="high">High priority findings</option>
            <option value="issues">Any findings</option>
            <option value="clean">Clean pages (200 OK)</option>
          </select>
        </div>

        {!running&&allShown.length>1&&viewMode==='graph'&&(
          <div style={{display:'flex',gap:6,alignItems:'center',marginLeft:'auto'}}>
            <span style={{color:'#5a7282'}}>Traversal playback:</span>
            <button
              type="button"
              className="outline-btn small"
              onClick={()=>setIsPlaying(p=>!p)}
              style={{padding:'3px 8px',fontSize:11}}
            >
              {isPlaying?'❚❚ Pause':'▶ Replay crawl'}
            </button>
            <button
              type="button"
              className="outline-btn small"
              disabled={playbackStep<=0}
              onClick={()=>setPlaybackStep(s=>Math.max(0,s-1))}
              style={{padding:'3px 6px',fontSize:11}}
            >
              ⏮
            </button>
            <span style={{fontSize:11,fontWeight:600}}>{playbackStep+1}/{allShown.length}</span>
            <button
              type="button"
              className="outline-btn small"
              disabled={playbackStep>=allShown.length-1}
              onClick={()=>setPlaybackStep(s=>Math.min(allShown.length-1,s+1))}
              style={{padding:'3px 6px',fontSize:11}}
            >
              ⏭
            </button>
            <button
              type="button"
              className="outline-btn small"
              onClick={()=>setPlaybackSpeed(s=>s===1000?500:1000)}
              style={{padding:'3px 6px',fontSize:11}}
            >
              {playbackSpeed===500?'2x':'1x'}
            </button>
          </div>
        )}
      </div>

      {viewMode==='table' ? (
        /* Accessible Table Alternative */
        <div style={{padding:16,background:'#fff',maxHeight:520,overflowY:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <thead>
              <tr style={{textAlign:'left',borderBottom:'2px solid #d8e4ea',color:'#456172'}}>
                <th style={{padding:8}}>Order</th>
                <th style={{padding:8}}>URL</th>
                <th style={{padding:8}}>HTTP Status</th>
                <th style={{padding:8}}>Page Title</th>
                <th style={{padding:8}}>H1 Count</th>
                <th style={{padding:8}}>Findings</th>
                <th style={{padding:8}}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredPages.map((p,i)=>{
                const issues=severity(p);
                return (
                  <tr key={p.url} style={{borderBottom:'1px solid #edf2f5'}}>
                    <td style={{padding:8,fontWeight:600}}>{p.order||i+1}</td>
                    <td style={{padding:8}}>
                      <a href={p.url} target="_blank" rel="noopener noreferrer" style={{color:'#186899',textDecoration:'none'}}>
                        {new URL(p.url).pathname} ↗
                      </a>
                    </td>
                    <td style={{padding:8}}>
                      <span className={`status ${p.status===200?'ok':'bad'}`}>{p.status||'Error'}</span>
                    </td>
                    <td style={{padding:8}}>{p.title||p.error||'—'}</td>
                    <td style={{padding:8}}>{p.h1Count??'—'}</td>
                    <td style={{padding:8}}>
                      <span className={`status ${issues.some(f=>f.severity==='high')?'bad':issues.length?'warn':'ok'}`}>
                        {issues.length} {issues.length===1?'issue':'issues'}
                      </span>
                    </td>
                    <td style={{padding:8}}>
                      <button
                        type="button"
                        className="outline-btn small"
                        onClick={()=>{setSelected(p.url);setViewMode('graph');}}
                        style={{padding:'2px 8px',fontSize:11}}
                      >
                        Inspect in Graph
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Interactive SVG Graph View with Pan and Zoom */
        <div className="spider-main" ref={containerRef}>
          <div
            className="spider-canvas"
            tabIndex="0"
            aria-label="Interactive graph of pages actually crawled"
            style={{cursor:isPanning?'grabbing':'grab',userSelect:'none'}}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            <svg
              viewBox={`0 0 ${width} ${height}`}
              width={Math.round(width*zoom)}
              height={Math.round(height*zoom)}
              style={{
                transform:`translate(${pan.x}px, ${pan.y}px)`,
                transition:prefersReducedMotion||isPanning?'none':'transform 0.05s ease-out'
              }}
              role="img"
              aria-label="Website crawl graph with clickable page nodes"
            >
              <defs>
                <marker id="edge-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0 0 L6 3 L0 6" fill="none" stroke="#9cb3c4" strokeWidth="1"/>
                </marker>
              </defs>

              {/* Render edges */}
              {showEdges && allShown.flatMap(p=>(p.links||[]).filter(l=>coords.has(l)&&l!==p.url).map((l,i)=>{
                const a=coords.get(p.url),b=coords.get(l);
                const isHighlight=activePage?.url===p.url||activePage?.url===l;
                return (
                  <line
                    key={p.url+l+i}
                    x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                    stroke={isHighlight?'#1c79b6':'#a9c3d4'}
                    strokeWidth={isHighlight?'2.2':'1.4'}
                    markerEnd="url(#edge-arrow)"
                    opacity={isHighlight?'0.95':'0.75'}
                  />
                );
              }))}

              {/* Render page nodes */}
              {allShown.map((p,i)=>{
                const pt=coords.get(p.url);
                const issues=severity(p);
                const bad=p.status!==200;
                const isSelected=activePage?.url===p.url;
                const isCurrentStep=spiderPage?.url===p.url;
                const isFilteredOut=filteredPages.length>0&&!filteredPages.some(fp=>fp.url===p.url);

                const color=bad
                  ? '#8f9baa'
                  : issues.some(f=>f.severity==='high')
                  ? '#d28a52'
                  : issues.length
                  ? '#d5b461'
                  : '#4b9b84';

                return (
                  <g
                    key={p.url}
                    role="button"
                    aria-label={`${label(p.url)}; ${issues.length} issues; HTTP ${p.status}`}
                    tabIndex="0"
                    onClick={(e)=>{e.stopPropagation();setSelected(p.url);}}
                    onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelected(p.url);}}}
                    className="spider-node"
                    style={{cursor:'pointer',opacity:isFilteredOut?0.25:1}}
                  >
                    {isSelected&&(
                      <circle cx={pt.x} cy={pt.y} r="38" stroke={color} strokeWidth="2" strokeDasharray="4 4" fill="none" opacity=".8"/>
                    )}
                    {isCurrentStep&&(
                      <circle cx={pt.x} cy={pt.y} r="32" stroke="#254f66" strokeWidth="1.5" strokeDasharray="2 2" fill="none"/>
                    )}
                    <circle cx={pt.x} cy={pt.y} r="27" stroke={color} strokeWidth="2.5" fill={isSelected?'#fefefe':'#f5fafc'}/>
                    <text x={pt.x} y={pt.y+5} fontWeight="700" fontSize="13" textAnchor="middle" fill="#31546c">{p.order||i+1}</text>
                    <text x={pt.x} y={pt.y+47} textAnchor="middle" fill="#516c7a" fontSize="11">{label(p.url).slice(0,22)}</text>
                    <title>{p.url} · HTTP {p.status} · {issues.length} finding(s)</title>
                  </g>
                );
              })}

              {/* Animated spider creature traveling along actual connections */}
              {spiderPos && (
                <g
                  className="spider-creature"
                  style={{
                    transform:`translate(${spiderPos.x}px,${spiderPos.y-34}px)`,
                    transition:prefersReducedMotion?'none':'transform .75s ease-in-out',
                    pointerEvents:'none'
                  }}
                  aria-hidden="true"
                >
                  <g stroke="#20394e" strokeWidth="2.4" strokeLinecap="round" fill="none">
                    <path d="M-8 -1L-17 -9L-22 -7 M-9 3L-19 0L-23 5 M-8 7L-16 14L-21 13 M8 -1L17 -9L22 -7 M9 3L19 0L23 5 M8 7L16 14L21 13"/>
                  </g>
                  <circle r="13" cy="2" fill="#20394e"/>
                  <circle r="8" cy="-8" fill="#254f66"/>
                  <circle cx="-4" cy="-10" r="2" fill="#fff"/>
                  <circle cx="4" cy="-10" r="2" fill="#fff"/>
                </g>
              )}
            </svg>
          </div>

          {/* Right sidebar: Detailed inspected page panel */}
          <aside className="spider-details">
            <div className="section-kicker">SELECTED PAGE DETAILS</div>
            {activePage ? (
              <>
                <strong>{label(activePage.url)}</strong>
                <a href={activePage.url} target="_blank" rel="noopener noreferrer" className="spider-url">
                  {activePage.url} ↗
                </a>
                <div className="spider-data">
                  <span>HTTP Response</span>
                  <b className={`status ${activePage.status===200?'ok':'bad'}`}>{activePage.status||'Error'}</b>
                </div>
                <div className="spider-data">
                  <span>Visit Sequence</span>
                  <b>Step #{activePage.order??'—'}</b>
                </div>
                <div className="spider-data">
                  <span>Incoming Parent</span>
                  <b>{activePage.parent ? label(activePage.parent) : 'Starting URL (Root)'}</b>
                </div>
                <div className="spider-data">
                  <span>Outgoing Links</span>
                  <b>{activePage.links?.length||0} same-origin links</b>
                </div>
                <div className="spider-data">
                  <span>H1 Headings</span>
                  <b>{activePage.h1Count??'—'}</b>
                </div>
                <div className="spider-data">
                  <span>Canonical URL</span>
                  <b style={{fontSize:11,wordBreak:'break-all'}}>{activePage.canonical||'None declared'}</b>
                </div>
                <div className="spider-data">
                  <span>Robots Directive</span>
                  <b>{activePage.robots||'None (indexable)'}</b>
                </div>
                <div className="spider-data">
                  <span>Detected Issues</span>
                  <b>{severity(activePage).length}</b>
                </div>

                <div className="spider-findings">
                  {severity(activePage).map(f=>(
                    <div key={f.id} style={{marginBottom:8,paddingBottom:6,borderBottom:'1px solid #e8eef2'}}>
                      <span className={'severity '+f.severity}>{f.severity}</span>
                      <strong style={{display:'block',margin:'4px 0 2px',fontSize:12}}>{f.rule.replaceAll('-',' ')}</strong>
                      <p style={{margin:0,fontSize:11,color:'#57707e'}}>{f.evidence}</p>
                    </div>
                  ))}
                  {!severity(activePage).length&&(
                    <p style={{color:'#3f8570',fontWeight:500}}>✓ No technical SEO issues detected on this page.</p>
                  )}
                </div>
              </>
            ) : (
              <p>Click a node in the graph to inspect observed page details.</p>
            )}
          </aside>
        </div>
      )}

      {/* Readable legend */}
      <div className="spider-key">
        <span><i style={{background:'#4b9b84'}}/> 200 OK · No issues</span>
        <span><i style={{background:'#d5b461'}}/> Review finding</span>
        <span><i style={{background:'#d28a52'}}/> High-priority finding</span>
        <span><i style={{background:'#8f9baa'}}/> HTTP Error / Broken</span>
        <span style={{marginLeft:'auto',color:'#6b8291',fontSize:11}}>
          Drag canvas to pan · Scroll to zoom
        </span>
      </div>
    </div>
  );
}
