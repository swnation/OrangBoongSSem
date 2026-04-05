// js/head-diagram.js — 머리 다이어그램 SVG (Phase 4 모듈화)

// ═══════════════════════════════════════════════════════════════
// 메인 사이트 머리 그림 (편두통 도메인 전용)
// ═══════════════════════════════════════════════════════════════

// SVG 영역 좌표 상수 (Gemini PR#136: 하드코딩 좌표 → 상수 추출)
const _SIDE_COLORS = {left:{rgb:'59,130,246',hex:'#3b82f6'},right:{rgb:'239,68,68',hex:'#ef4444'},both:{rgb:'168,85,247',hex:'#a855f7'}};
const _FRONT_REGIONS = [
  {id:'l-forehead', shape:'ellipse', cx:200,cy:190,rx:75,ry:45, side:'left', site:'이마', op:'.15', labels:[{x:200,y:196,fs:24,fw:700,t:'이마'}]},
  {id:'r-forehead', shape:'ellipse', cx:400,cy:190,rx:75,ry:45, side:'right', site:'이마', op:'.15', labels:[{x:400,y:196,fs:24,fw:700,t:'이마'}]},
  {id:'l-brow', shape:'ellipse', cx:220,cy:255,rx:48,ry:20, side:'left', site:'눈썹부위', op:'.15', sw:2, dash:true, labels:[{x:220,y:261,fs:19,fw:700,t:'눈썹'}]},
  {id:'r-brow', shape:'ellipse', cx:380,cy:255,rx:48,ry:20, side:'right', site:'눈썹부위', op:'.15', sw:2, dash:true, labels:[{x:380,y:261,fs:19,fw:700,t:'눈썹'}]},
  {id:'c-glabella', shape:'ellipse', cx:300,cy:270,rx:38,ry:22, side:'both', site:'미간', op:'.18', labels:[{x:300,y:276,fs:21,fw:500,t:'미간'}]},
  {id:'l-temple', shape:'rect', x:55,y:220,w:60,h:140,rx:14, side:'left', site:'관자놀이', op:'.15', labels:[{x:85,y:284,fs:19,fw:700,t:'관자'},{x:85,y:305,fs:19,fw:700,t:'놀이'}]},
  {id:'r-temple', shape:'rect', x:485,y:220,w:60,h:140,rx:14, side:'right', site:'관자놀이', op:'.15', labels:[{x:515,y:284,fs:19,fw:700,t:'관자'},{x:515,y:305,fs:19,fw:700,t:'놀이'}]},
];
const _BACK_REGIONS = [
  {id:'l-occipital', shape:'ellipse', cx:195,cy:330,rx:100,ry:95, side:'left', site:'후두부', op:'.10', labels:[{x:195,y:336,fs:24,fw:700,t:'후두부'}]},
  {id:'r-occipital', shape:'ellipse', cx:405,cy:330,rx:100,ry:95, side:'right', site:'후두부', op:'.10', labels:[{x:405,y:336,fs:24,fw:700,t:'후두부'}]},
];
const _SIDE_LABELS = {
  front:[{x:150,y:490,side:'left',t:'← 왼쪽'},{x:450,y:490,side:'right',t:'오른쪽 →'}],
  back:[{x:195,y:490,side:'left',t:'← 왼쪽'},{x:405,y:490,side:'right',t:'오른쪽 →'}],
};

function _buildRegionSVG(regions, sideLabels, prefix, toggleFn) {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const labelStroke = isDark ? 'rgba(255,255,255,.4)' : 'rgba(0,0,0,.25)';
  const parts = regions.map(r => {
    const c = _SIDE_COLORS[r.side];
    const sw = r.sw || 2.5;
    const dash = r.dash ? ' stroke-dasharray="6,3"' : '';
    let shape;
    if (r.shape === 'ellipse') {
      shape = `<ellipse id="${prefix}${r.id}" cx="${r.cx}" cy="${r.cy}" rx="${r.rx}" ry="${r.ry}" fill="rgba(${c.rgb},${r.op})" stroke="${c.hex}" stroke-width="${sw}"${dash} style="cursor:pointer" onclick="${toggleFn}('${r.side}','${r.site}')"/>`;
    } else {
      shape = `<rect id="${prefix}${r.id}" x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="${r.rx}" fill="rgba(${c.rgb},${r.op})" stroke="${c.hex}" stroke-width="${sw}"${dash} style="cursor:pointer" onclick="${toggleFn}('${r.side}','${r.site}')"/>`;
    }
    const labels = r.labels.map(l =>
      `<text x="${l.x}" y="${l.y}" text-anchor="middle" font-size="${l.fs}" font-weight="${l.fw}" fill="${c.hex}" stroke="${labelStroke}" stroke-width="3" paint-order="stroke" style="pointer-events:none">${l.t}</text>`
    ).join('\n          ');
    return `          ${shape}\n          ${labels}`;
  });
  sideLabels.forEach(sl => {
    const c = _SIDE_COLORS[sl.side];
    parts.push(`          <text x="${sl.x}" y="${sl.y}" text-anchor="middle" font-size="16" fill="${c.hex}" font-weight="600" opacity=".8">${sl.t}</text>`);
  });
  return parts.join('\n');
}

var _mainHeadView = 'front';
function getMainHeadSVG() {
  const p='mhd-';
  const showFront = _mainHeadView === 'front';
  const regions = showFront ? _FRONT_REGIONS : _BACK_REGIONS;
  const sLabels = showFront ? _SIDE_LABELS.front : _SIDE_LABELS.back;
  const imgSrc = showFront ? 'icons/head-front.png' : 'icons/head-back.png';
  const imgAlt = showFront ? '정면' : '후면';
  return `
  <div style="text-align:center;padding:8px 0">
    <div style="display:flex;justify-content:center;gap:4px;margin-bottom:6px">
      <button onclick="_mainHeadView='front';document.getElementById('main-head-diagram').innerHTML=getMainHeadSVG();syncMainHeadDiagram()" style="padding:4px 14px;border-radius:6px;border:1.5px solid ${showFront?'var(--ac)':'var(--bd)'};background:${showFront?'var(--ac)':'none'};color:${showFront?'#fff':'var(--mu)'};font-size:.7rem;font-weight:600;cursor:pointer;font-family:inherit">정면</button>
      <button onclick="_mainHeadView='back';document.getElementById('main-head-diagram').innerHTML=getMainHeadSVG();syncMainHeadDiagram()" style="padding:4px 14px;border-radius:6px;border:1.5px solid ${!showFront?'var(--ac)':'var(--bd)'};background:${!showFront?'var(--ac)':'none'};color:${!showFront?'#fff':'var(--mu)'};font-size:.7rem;font-weight:600;cursor:pointer;font-family:inherit">후면</button>
    </div>
    <div style="position:relative;display:inline-block;width:340px;max-width:85vw">
        <img src="${imgSrc}" alt="${imgAlt}" style="width:100%;border-radius:10px;pointer-events:none">
        <svg viewBox="0 0 600 500" style="position:absolute;top:0;left:0;width:100%;height:100%">
${_buildRegionSVG(regions, sLabels, p, 'toggleMainSite')}
        </svg>
    </div>
  </div>`;
}

function toggleMainSite(side, site) {
  if(side==='both') {
    ['left','right'].forEach(s=>{
      const chip=document.querySelector(`.log-chip[data-side="${s}"][data-val="${site}"]`);
      if(chip) chip.click();
    });
  } else {
    const chip=document.querySelector(`.log-chip[data-side="${side}"][data-val="${site}"]`);
    if(chip) chip.click();
  }
  if(site==='후두부' && _mainHeadView==='front') {
    _mainHeadView='back';
    document.getElementById('main-head-diagram').innerHTML=getMainHeadSVG();
  }
  syncMainHeadDiagram();
}

function syncMainHeadDiagram() {
  const p='mhd-';
  const activeL=new Set();const activeR=new Set();
  document.querySelectorAll('.log-chip.sel[data-side="left"]').forEach(c=>activeL.add(c.dataset.val));
  document.querySelectorAll('.log-chip.sel[data-side="right"]').forEach(c=>activeR.add(c.dataset.val));
  const map={'left-관자놀이':p+'l-temple','left-눈썹부위':p+'l-brow','left-이마':p+'l-forehead','left-후두부':p+'l-occipital',
    'right-관자놀이':p+'r-temple','right-눈썹부위':p+'r-brow','right-이마':p+'r-forehead','right-후두부':p+'r-occipital','both-미간':p+'c-glabella'};
  Object.entries(map).forEach(([key,id])=>{
    const el=document.getElementById(id);if(!el) return;
    const [side,site]=key.split('-');
    let active=false;
    if(side==='both') active=activeL.has(site)||activeR.has(site);
    else if(side==='left') active=activeL.has(site);
    else active=activeR.has(site);
    const c=_SIDE_COLORS[side];
    el.setAttribute('fill',active?`rgba(${c.rgb},.45)`:`rgba(${c.rgb},.10)`);
    el.setAttribute('stroke',c.hex);
    el.setAttribute('stroke-width',active?'3.5':'2.5');
    el.style.filter=active?`drop-shadow(0 0 6px ${c.hex})`:'none';
  });
}
