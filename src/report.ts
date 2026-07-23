import type { AtlasGraph } from './schema.js';

export function renderHtmlReport(graph: AtlasGraph): string {
  const data = JSON.stringify(graph).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Code Atlas — ${escapeHtml(graph.project.name)}</title>
  <style>
    :root{color-scheme:dark;--bg:#070b12;--panel:#0e1520;--panel2:#121c2a;--line:#273247;--text:#edf3ff;--muted:#91a0b7;--accent:#9b6cff;--cyan:#22d3ee;--green:#34d399;--amber:#fbbf24;--red:#fb7185}
    *{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 15% 0%,#10172a 0,#070b12 42%);color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif}
    button,input{font:inherit}.app{min-height:100vh;padding:20px}.topbar{display:flex;gap:16px;align-items:flex-start;justify-content:space-between;margin-bottom:16px}.title h1{font-size:24px;margin:0 0 4px}.title p{margin:0;color:var(--muted)}
    .metrics{display:flex;gap:8px;flex-wrap:wrap}.metric{border:1px solid var(--line);background:rgba(14,21,32,.9);border-radius:10px;padding:8px 12px}.metric b{display:block;font-size:18px}.metric span{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}
    .toolbar{display:flex;gap:10px;margin-bottom:14px}.search{flex:1;background:var(--panel);border:1px solid var(--line);color:var(--text);border-radius:10px;padding:10px 12px}.select{background:var(--panel);border:1px solid var(--line);color:var(--text);border-radius:10px;padding:10px}
    .grid{display:grid;grid-template-columns:1.05fr 1.1fr 1.25fr 1.3fr 1.4fr;gap:10px;align-items:start}.panel{min-width:0;background:linear-gradient(180deg,rgba(18,28,42,.96),rgba(10,16,26,.96));border:1px solid var(--line);border-radius:12px;overflow:hidden}.panel-head{padding:12px 13px;border-bottom:1px solid var(--line)}.panel-head small{color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:.06em}.panel-head h2{font-size:14px;margin:5px 0 0}.panel-body{padding:10px;display:grid;gap:8px}
    .node{width:100%;text-align:left;background:#111a27;border:1px solid #29364d;border-radius:9px;color:var(--text);padding:10px;cursor:pointer;transition:.15s}.node:hover,.node.active{border-color:var(--accent);background:#181d32;transform:translateY(-1px)}.node strong{display:block;font-size:13px}.node span{display:block;color:var(--muted);font-size:11px;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.badge{display:inline-flex!important;width:auto!important;margin:0 0 6px!important;padding:2px 6px;border-radius:999px;background:#251b41;color:#d8c8ff!important;font-size:10px!important}
    .flow-step{position:relative;padding-left:34px}.flow-step:before{content:attr(data-index);position:absolute;left:0;top:11px;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:var(--accent);font-size:11px;font-weight:700}.flow-step:not(:last-child):after{content:"";position:absolute;left:10px;top:34px;bottom:-12px;border-left:1px dashed #536079}
    .layer{border:1px solid var(--line);border-radius:9px;padding:8px}.layer h3{font-size:11px;text-transform:uppercase;margin:0 0 7px;color:var(--cyan)}.layer.Application h3{color:#82aaff}.layer.Domain h3{color:var(--green)}.layer.Infrastructure h3{color:var(--amber)}
    .inspector pre{margin:0;background:#070b12;border:1px solid var(--line);border-radius:9px;padding:10px;font-size:11px;color:#cbd5e1;overflow:auto;max-height:320px}.details{display:grid;gap:6px;font-size:12px}.details div{display:grid;grid-template-columns:82px 1fr;gap:8px}.details b{color:var(--muted);font-weight:500}.empty{color:var(--muted);font-size:12px;padding:8px}.footer{margin-top:12px;color:var(--muted);font-size:11px}
    @media(max-width:1200px){.grid{grid-template-columns:repeat(3,1fr)}.inspector{grid-column:span 2}}@media(max-width:760px){.app{padding:12px}.topbar{display:block}.metrics{margin-top:12px}.grid{grid-template-columns:1fr}.inspector{grid-column:auto}.toolbar{display:grid}.panel{overflow:visible}}
  </style>
</head>
<body>
<div class="app">
  <header class="topbar">
    <div class="title"><h1>Code Atlas</h1><p>Dal significato di business al metodo che lo implementa — ${escapeHtml(graph.project.name)}</p></div>
    <div class="metrics" id="metrics"></div>
  </header>
  <div class="toolbar">
    <input id="search" class="search" placeholder="Cerca capability, use case, classe o metodo…" />
    <select id="flowSelect" class="select" aria-label="Seleziona flusso"></select>
  </div>
  <main class="grid">
    <section class="panel"><div class="panel-head"><small>1. Scopo</small><h2>Che cosa permette di fare?</h2></div><div class="panel-body" id="capabilities"></div></section>
    <section class="panel"><div class="panel-head"><small>2. Funzionalità</small><h2>Quali casi d’uso?</h2></div><div class="panel-body" id="usecases"></div></section>
    <section class="panel"><div class="panel-head"><small>3. Flusso</small><h2>Quale percorso segue?</h2></div><div class="panel-body" id="flow"></div></section>
    <section class="panel"><div class="panel-head"><small>4. Architettura</small><h2>Dove vivono i componenti?</h2></div><div class="panel-body" id="architecture"></div></section>
    <section class="panel inspector"><div class="panel-head"><small>5. Codice</small><h2>Chi implementa il passaggio?</h2></div><div class="panel-body" id="inspector"></div></section>
  </main>
  <div class="footer">Generato ${escapeHtml(graph.project.analyzedAt)} · Le relazioni mostrano inferenze statiche e annotazioni semantiche.</div>
</div>
<script>
const graph=${data};
const nodeMap=new Map(graph.nodes.map(n=>[n.id,n]));
const outgoing=new Map();for(const e of graph.edges){if(!outgoing.has(e.source))outgoing.set(e.source,[]);outgoing.get(e.source).push(e)}
let selectedFlow=graph.flows[0]||null;let selectedNode=selectedFlow?.steps[0]||graph.nodes.find(n=>n.kind==='Method')?.id;
const el=id=>document.getElementById(id);const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function renderMetrics(){el('metrics').innerHTML=[['File',graph.stats.files],['Nodi',graph.stats.nodes],['Relazioni',graph.stats.edges],['Call irrisolte',graph.stats.unresolvedCalls]].map(([l,v])=>'<div class="metric"><b>'+v+'</b><span>'+l+'</span></div>').join('')}
function button(n,badge){return '<button class="node '+(selectedNode===n.id?'active':'')+'" data-node="'+esc(n.id)+'">'+(badge?'<span class="badge">'+esc(badge)+'</span>':'')+'<strong>'+esc(n.name)+'</strong><span>'+esc(n.summary||n.source?.file||n.kind)+'</span></button>'}
function renderCapabilities(q=''){const nodes=graph.nodes.filter(n=>n.kind==='Capability'&&n.name.toLowerCase().includes(q));el('capabilities').innerHTML=nodes.map(n=>button(n,'Capability')).join('')||'<div class="empty">Nessuna capability trovata.</div>'}
function renderUseCases(q=''){const nodes=graph.nodes.filter(n=>n.kind==='UseCase'&&n.name.toLowerCase().includes(q));el('usecases').innerHTML=nodes.map(n=>button(n,'Use case')).join('')||'<div class="empty">Nessun use case trovato.</div>'}
function renderFlow(){if(!selectedFlow){el('flow').innerHTML='<div class="empty">Nessun flusso derivato.</div>';return}el('flow').innerHTML=selectedFlow.steps.map((id,i)=>{const n=nodeMap.get(id);return n?'<div class="flow-step" data-index="'+(i+1)+'">'+button(n,n.kind)+'</div>':''}).join('')}
function renderArchitecture(q=''){const layers=['Presentation','Application','Domain','Infrastructure','External'];el('architecture').innerHTML=layers.map(layer=>{const nodes=graph.nodes.filter(n=>n.layer===layer&&['Class','Method','Endpoint','ExternalSystem'].includes(n.kind)&&n.name.toLowerCase().includes(q)).slice(0,8);if(!nodes.length)return'';return '<div class="layer '+layer+'"><h3>'+layer+'</h3>'+nodes.map(n=>button(n,n.kind)).join('')+'</div>'}).join('')||'<div class="empty">Nessun componente trovato.</div>'}
function renderInspector(){const n=nodeMap.get(selectedNode);if(!n){el('inspector').innerHTML='<div class="empty">Seleziona un nodo.</div>';return}const relations=(outgoing.get(n.id)||[]).map(e=>e.kind+' → '+(nodeMap.get(e.target)?.name||e.target));const source=n.source?'<pre>'+esc(n.source.file+':'+n.source.line)+'\\n\\n'+esc(n.summary||'Nessun riepilogo disponibile.')+'</pre>':'';el('inspector').innerHTML=button(n,n.kind)+'<div class="details"><div><b>Layer</b><span>'+esc(n.layer||'—')+'</span></div><div><b>Linguaggio</b><span>'+esc(n.language||'—')+'</span></div><div><b>Relazioni</b><span>'+esc(relations.join('\\n')||'—').replace(/\\n/g,'<br>')+'</span></div></div>'+source}
function bind(){document.querySelectorAll('[data-node]').forEach(btn=>btn.addEventListener('click',()=>{selectedNode=btn.dataset.node;renderAll(el('search').value.toLowerCase())}))}
function renderAll(q=''){renderCapabilities(q);renderUseCases(q);renderFlow();renderArchitecture(q);renderInspector();bind()}
function initFlowSelect(){el('flowSelect').innerHTML=graph.flows.map((f,i)=>'<option value="'+i+'">'+esc(f.name)+'</option>').join('')||'<option>Nessun flusso</option>';el('flowSelect').addEventListener('change',e=>{selectedFlow=graph.flows[Number(e.target.value)]||null;selectedNode=selectedFlow?.steps[0];renderAll(el('search').value.toLowerCase())})}
el('search').addEventListener('input',e=>renderAll(e.target.value.toLowerCase()));renderMetrics();initFlowSelect();renderAll();
</script>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] ?? char));
}
