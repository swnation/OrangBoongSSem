// js/views.js — 뷰 렌더링 (Phase 6 모듈화)

// ═══════════════════════════════════════════════════════════════
// THEME
// ═══════════════════════════════════════════════════════════════
function initTheme() {
  const t = localStorage.getItem('om_theme') || 'light';
  if (t === 'dark') document.documentElement.setAttribute('data-theme','dark');
  updateThemeBtn();
}
function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  if (isDark) document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme','dark');
  localStorage.setItem('om_theme', isDark ? 'light' : 'dark');
  updateThemeBtn();
}
function updateThemeBtn() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const icon = document.getElementById('theme-icon');
  const label = document.getElementById('theme-label');
  if (icon) icon.textContent = isDark ? '☀️' : '🌙';
  if (label) label.textContent = isDark ? '라이트 모드' : '다크 모드';
}
initTheme();

// ═══════════════════════════════════════════════════════════════
// MOBILE SIDEBAR
// ═══════════════════════════════════════════════════════════════
function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebar-overlay');
  sb.classList.toggle('open');
  ov.classList.toggle('show');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('show');
}

// ═══════════════════════════════════════════════════════════════
// DOMAIN SWITCHING
// ═══════════════════════════════════════════════════════════════
function renderDomainDropdown() {
  const dd = document.getElementById('domain-dropdown');
  dd.innerHTML = Object.entries(DOMAINS).map(([id, d]) =>
    `<button class="domain-opt ${id===S.currentDomain?'active':''}" onclick="switchDomain('${id}')">
      <span style="font-size:1rem">${d.icon}</span>
      <span style="flex:1">${d.label}</span>
      <span class="d-user">${d.user}</span>
    </button>`
  ).join('');
}
function toggleDomainDropdown() {
  document.getElementById('domain-dropdown').classList.toggle('show');
}
function updateDomainUI() {
  const dc = DC();
  document.getElementById('domain-icon').textContent = dc.icon;
  document.getElementById('domain-label').textContent = `${dc.user} · ${dc.label}`;
  document.documentElement.style.setProperty('--domain-color', dc.color);
  const tb = document.getElementById('topbar-domain');
  if (tb) { tb.textContent = `${dc.icon} ${dc.user} · ${dc.label}`; tb.style.display = 'inline'; }
  // 붕룩이: 사이드바 라벨 변경
  const navMeds = document.getElementById('nav-meds');
  if (navMeds) navMeds.textContent = S.currentDomain === 'bungruki' ? '🍼 임신 준비 대시보드' : '📋 질환 관리';
  const navLog = document.getElementById('nav-log');
  if (navLog) navLog.innerHTML = S.currentDomain === 'bungruki'
    ? '📝 일지 기록'
    : '📊 증상 기록<span class="sb-badge quick-log-badge" id="quick-log-badge" style="display:none;background:#c96442;color:#fff">0</span>';
  const navStats = document.getElementById('nav-stats');
  if (navStats) navStats.textContent = S.currentDomain === 'bungruki' ? '📈 임신 준비 통계' : '📈 통계 대시보드';
}
async function switchDomain(domainId) {
  if (S.generating) { showToast('AI 생성 중에는 도메인을 전환할 수 없습니다.'); return; }
  if (S._dirty && S.session) {
    if (!confirm('진행 중인 세션이 있습니다. 전환하시겠습니까?')) return;
  }
  S.currentDomain = domainId;
  S.session = null;
  S._dirty = false;
  S.viewingHistIdx = null;
  S.logView = 'form';
  localStorage.setItem('om_domain', domainId);
  document.getElementById('domain-dropdown').classList.remove('show');
  updateDomainUI();
  renderDomainDropdown();

  if (S.token) {
    if (!S.domainState[domainId]?.master) {
      await loadDomainData(domainId);
    }
    renderSidebarAIs();
    updateHistCount();
    updateSidebarCost();
    switchView('home');
    checkPriceUpdate(); // background price update
  }
}
renderDomainDropdown();
updateDomainUI();

// ═══════════════════════════════════════════════════════════════
// VIEWS
// ═══════════════════════════════════════════════════════════════
function switchView(view, btn) {
  if(view!=='drive-connect' && !requireLogin()) return;
  S.currentView=view;
  document.querySelectorAll('.sb-btn').forEach(b=>b.classList.remove('active'));
  const navBtn=document.getElementById('nav-'+view); if(navBtn) navBtn.classList.add('active');
  const isBrk=S.currentDomain==='bungruki';
  const medsTitle=isBrk?'🍼 임신 준비 대시보드':'📋 질환 관리';
  const logTitle=isBrk?'📝 일지 기록':'📊 증상 기록';
  const statsTitle=isBrk?'📈 임신 준비 통계':'📈 통계 대시보드';
  const titles={home:'홈 — 누적 기록',session:'현재 세션',log:logTitle,history:'세션 기록',templates:'질문 템플릿',meds:medsTitle,stats:statsTitle,timeline:'📅 타임라인',crosslog:'🔗 교차 분석',usage:'💰 비용 추적'};
  document.getElementById('topbar-title').textContent=titles[view]||'AI 협진';
  renderView(view);
  closeSidebar();
}
function renderView(view) {
  // 세션 뷰를 벗어날 때 타이머 정리
  if(view!=='session') { Object.keys(_aiTimers).forEach(id=>stopAITimer(id)); }
  const area=document.getElementById('content');
  if(view==='home') area.innerHTML=renderHome();
  else if(view==='session') area.innerHTML=renderSession();
  else if(view==='log') { try{area.innerHTML=renderLog();}catch(e){area.innerHTML=`<div style="color:red;padding:20px">❌ 로그 오류: ${e.message}<br><pre style="font-size:.7rem;overflow:auto">${e.stack}</pre></div>`;} }
  else if(view==='history') area.innerHTML=renderHistory();
  else if(view==='templates') area.innerHTML=renderTemplates();
  else if(view==='meds') { const _renderMedsSafe=()=>{try{area.innerHTML=renderMedsView();}catch(e){area.innerHTML=`<div style="color:red;padding:20px">❌ 투약 오류: ${e.message}<br><pre style="font-size:.7rem;overflow:auto">${e.stack}</pre></div>`;}}; _renderMedsSafe(); loadAllUserDomains().then(()=>{if(S.currentView==='meds')_renderMedsSafe();}); }
  else if(view==='stats') area.innerHTML=renderStatsView();
  else if(view==='timeline') { try{area.innerHTML=renderTimelineView();}catch(e){area.innerHTML=`<div style="color:red;padding:20px">❌ 타임라인 오류: ${e.message}<br><pre style="font-size:.7rem;overflow:auto">${e.stack}</pre></div>`;} loadAllUserDomains().then(()=>{if(S.currentView==='timeline'){try{area.innerHTML=renderTimelineView();}catch(e){area.innerHTML=`<div style="color:red;padding:20px">❌ 타임라인 오류: ${e.message}<br><pre style="font-size:.7rem;overflow:auto">${e.stack}</pre></div>`;}};}); }
  else if(view==='crosslog') { area.innerHTML=renderCrossLogView(); loadAllUserDomains().then(()=>{if(S.currentView==='crosslog')area.innerHTML=renderCrossLogView();}); }
  else if(view==='usage') { area.innerHTML=renderUsageView(); loadAllUserDomains().then(()=>{if(S.currentView==='usage')area.innerHTML=renderUsageView();}); }
  else area.innerHTML='<div class="hint">뷰를 선택하세요.</div>';
}


function renderLoading(msg) {
  document.getElementById('content').innerHTML=`<div class="loading-screen"><div class="loading-spin"></div><p>${esc(msg)}</p></div>`;
}
function renderError(msg) {
  document.getElementById('content').innerHTML=`<div style="padding:40px"><div class="err-box" style="white-space:pre-wrap">${esc(msg)}</div></div>`;
}

// HOME VIEW
// ═══════════════════════════════════════════════════════════════
// 편두통 일기예보 — 과거 패턴 기반 오늘 위험도 예측
// ═══════════════════════════════════════════════════════════════
function renderMigraineForecast() {
  if(S.currentDomain!=='orangi-migraine') return '';
  const ds=D(); const logs=ds.logData||[];
  const nrsLogs=logs.filter(l=>l.nrs>=0&&l.datetime);
  if(nrsLogs.length<14) return ''; // 최소 2주 데이터

  const today=kstToday();
  const dow=kstNow().getUTCDay(); // 요일 (0=일)
  const factors=[];
  let riskScore=0; // 0~100

  // 1) 요일 패턴 — 같은 요일의 평균 NRS
  const sameDow=nrsLogs.filter(l=>{const d=new Date(l.datetime.slice(0,10)+'T00:00:00Z');return d.getUTCDay()===dow;});
  if(sameDow.length>=3) {
    const avg=sameDow.reduce((s,l)=>s+l.nrs,0)/sameDow.length;
    const allAvg=nrsLogs.reduce((s,l)=>s+l.nrs,0)/nrsLogs.length;
    if(avg>allAvg+1) { riskScore+=20; factors.push(`📅 ${['일','월','화','수','목','금','토'][dow]}요일 평균 ${_scoreLabel()} ${avg.toFixed(1)} (전체 ${allAvg.toFixed(1)})`); }
    else if(avg>allAvg) { riskScore+=8; }
  }

  // 2) 최근 3일 패턴 — 연속 고통 후 반동 또는 지속
  const recent3=nrsLogs.filter(l=>{
    const d=l.datetime.slice(0,10);const diff=Math.round((new Date(today+'T00:00:00')-new Date(d+'T00:00:00'))/86400000);
    return diff>=0&&diff<=3;
  });
  if(recent3.length) {
    const avg3=recent3.reduce((s,l)=>s+l.nrs,0)/recent3.length;
    if(avg3>=6) { riskScore+=25; factors.push(`🔥 최근 3일 평균 ${_scoreLabel()} ${avg3.toFixed(1)} — 고통 지속 중`); }
    else if(avg3>=4) { riskScore+=12; factors.push(`⚠️ 최근 3일 평균 ${_scoreLabel()} ${avg3.toFixed(1)}`); }
  }

  // 3) 최근 기록의 트리거 활성 여부
  const recent7=nrsLogs.filter(l=>{
    const d=l.datetime.slice(0,10);const diff=Math.round((new Date(today+'T00:00:00')-new Date(d+'T00:00:00'))/86400000);
    return diff>=0&&diff<=7;
  });
  const activeTriggers=new Set(recent7.flatMap(l=>l.triggers||[]));
  const highRiskTriggers=['수면부족','수면분절','스트레스','생리전후','피로'];
  const activeHigh=highRiskTriggers.filter(t=>activeTriggers.has(t));
  if(activeHigh.length>=2) { riskScore+=20; factors.push(`⚡ 고위험 트리거 활성: ${activeHigh.join(', ')}`); }
  else if(activeHigh.length===1) { riskScore+=10; factors.push(`⚡ 트리거 활성: ${activeHigh[0]}`); }

  // 4) 날씨 (저기압) — 캐시 + 실시간 비동기 업데이트
  const withWeather=[...nrsLogs].reverse().find(l=>l.weather?.pressure);
  const cachedP=withWeather?.weather?.pressure;
  if(cachedP) {
    if(cachedP<1005) { riskScore+=20; factors.push(`🌧 저기압 ${cachedP}hPa (기압 민감)`); }
    else if(cachedP<1010) { riskScore+=10; factors.push(`☁️ 기압 ${cachedP}hPa (약간 낮음)`); }
  }
  // 실시간 날씨 비동기 업데이트 (forecast 카드 렌더 후 갱신)
  if(typeof fetchWeather==='function') {
    if(window._forecastWeatherTimer) clearTimeout(window._forecastWeatherTimer);
    window._forecastWeatherTimer=setTimeout(async()=>{
      try {
        const w=await Promise.race([fetchWeather(),new Promise(r=>setTimeout(()=>r(null),3000))]);
        if(!w?.pressure) return;
        const el=document.getElementById('forecast-weather');
        if(el) el.innerHTML=`🌡 현재 ${w.temp}° ${w.condition} ${w.pressure}hPa ${w.humidity}%`;
      } catch(e){}
    },100);
  }

  // 5) 생리주기 트리거 (getMenstrualTag 활용)
  if(typeof getMenstrualTag==='function') {
    const tag=getMenstrualTag(today);
    if(tag&&(tag.includes('생리')||tag.includes('D-'))) {
      riskScore+=15; factors.push(`🩸 ${tag} — 호르몬 변동기`);
    }
  }

  // 점수 정규화 (0~100)
  riskScore=Math.min(100,riskScore);

  // 위험도 레벨
  let level,emoji,color,bg;
  if(riskScore>=60) { level='높음'; emoji='🌩️'; color='#ef4444'; bg='linear-gradient(135deg,#fef2f2,#fee2e2)'; }
  else if(riskScore>=35) { level='보통'; emoji='⛅'; color='#f59e0b'; bg='linear-gradient(135deg,#fffbeb,#fef3c7)'; }
  else { level='낮음'; emoji='☀️'; color='#10b981'; bg='linear-gradient(135deg,#f0fdf4,#dcfce7)'; }

  const factorHtml=factors.length?factors.map(f=>`<div style="font-size:.7rem;color:var(--mu);padding:2px 0">• ${f}</div>`).join(''):'<div style="font-size:.7rem;color:var(--mu2)">특별한 위험 요인 없음</div>';

  // 게이지 바
  const gauge=`<div style="position:relative;height:8px;background:var(--bd);border-radius:4px;overflow:hidden;margin:8px 0">
    <div style="width:${riskScore}%;height:100%;background:${color};border-radius:4px;transition:width .5s"></div>
  </div>`;

  return `<div class="card" style="background:${bg};border:1.5px solid ${color}30">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
      <span style="font-size:1.8rem">${emoji}</span>
      <div>
        <div style="font-size:.82rem;font-weight:700;color:${color}">오늘의 편두통 일기예보</div>
        <div style="font-size:.68rem;color:var(--mu)">위험도 <b>${riskScore}점</b> · ${level}</div>
      </div>
    </div>
    ${gauge}
    ${factorHtml}
    <div id="forecast-weather" style="font-size:.65rem;color:var(--mu2);margin-top:6px"></div>
  </div>`;
}

// 홈 대시보드 카드 커스텀
const _HOME_CARDS=[
  {id:'sessions',label:'💬 세션 버튼',default:true},
  {id:'forecast',label:'🌤 편두통 예보',default:true},
  {id:'warnings',label:'⚠️ 패턴 경고',default:true},
  {id:'drugWarn',label:'💊 약물 상호작용',default:true},
  {id:'aiSuggestions',label:'🤖 AI 질문 추천',default:true},
  {id:'insight',label:'💡 인사이트',default:true},
  {id:'weeklySummary',label:'📊 주간 요약',default:true},
  {id:'brkDailySync',label:'🍼 임신준비 데일리체크',default:true},
  {id:'brkTimeline',label:'🍼 붕룩이 타임라인',default:true},
  {id:'knowledge',label:'🧠 누적 협진 지식',default:true},
  {id:'recentSessions',label:'📅 최근 세션',default:true},
];
function _getHomeCards(){
  // 클라우드(마스터) 우선, localStorage 폴백
  const master=DM();
  const cloud=master?.settings?.homeCards;
  if(cloud)return cloud;
  return JSON.parse(localStorage.getItem('om_home_cards')||'{}');
}
function _homeCardVisible(id){
  const saved=_getHomeCards();
  if(id in saved)return saved[id];
  return (_HOME_CARDS.find(c=>c.id===id)||{}).default!==false;
}
function _toggleHomeCard(id){
  const saved=_getHomeCards();
  saved[id]=!_homeCardVisible(id);
  // 클라우드 + localStorage 양쪽 저장
  localStorage.setItem('om_home_cards',JSON.stringify(saved));
  const master=DM();
  if(master){if(!master.settings)master.settings={};master.settings.homeCards=saved;saveMaster();}
  renderView('home');
}
function _renderHomeSettings(){
  const order = _getHomeCardOrder();
  const sorted = order.map(id => _HOME_CARDS.find(c => c.id === id)).filter(Boolean);
  // 새로 추가된 카드는 뒤에
  _HOME_CARDS.forEach(c => { if (!order.includes(c.id)) sorted.push(c); });
  return `<div style="margin-bottom:10px;padding:10px;background:var(--sf2);border:1px solid var(--bd);border-radius:8px">
    <div style="font-size:.72rem;font-weight:600;color:var(--mu);margin-bottom:6px">📌 대시보드 카드 설정 (순서 변경 가능)</div>
    ${sorted.map((c, i) => `<div style="display:flex;align-items:center;gap:4px;padding:3px 0;font-size:.72rem">
      <div style="display:flex;flex-direction:column;gap:1px">
        <button onclick="_moveHomeCard('${c.id}',-1)" style="background:none;border:none;font-size:.5rem;cursor:pointer;color:var(--mu);padding:0;line-height:1" ${i===0?'disabled':''}>▲</button>
        <button onclick="_moveHomeCard('${c.id}',1)" style="background:none;border:none;font-size:.5rem;cursor:pointer;color:var(--mu);padding:0;line-height:1" ${i===sorted.length-1?'disabled':''}>▼</button>
      </div>
      <label style="display:flex;align-items:center;gap:6px;flex:1;cursor:pointer">
        <input type="checkbox" ${_homeCardVisible(c.id)?'checked':''} onchange="_toggleHomeCard('${c.id}')" style="accent-color:var(--ac)"> ${c.label}
      </label>
    </div>`).join('')}
  </div>`;
}
function _getHomeCardOrder() {
  const m = DM();
  return m?.settings?.homeCardOrder || JSON.parse(localStorage.getItem('om_home_card_order') || '[]');
}
function _moveHomeCard(id, dir) {
  const order = _getHomeCardOrder();
  // 현재 순서가 없으면 기본 순서로 초기화
  if (!order.length) _HOME_CARDS.forEach(c => order.push(c.id));
  const idx = order.indexOf(id);
  if (idx < 0) return;
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= order.length) return;
  [order[idx], order[newIdx]] = [order[newIdx], order[idx]];
  localStorage.setItem('om_home_card_order', JSON.stringify(order));
  const m = DM();
  if (m) { if (!m.settings) m.settings = {}; m.settings.homeCardOrder = order; saveMaster(); }
  renderView('home');
}
var _homeSettingsOpen=false;

function renderHome() {
  const m=DM(); if(!m) return '<div class="hint">데이터 로딩 중...</div>';
  const accum=m.accumulated; const sessions=m.sessions||[];
  const mkList=(arr,cls,icon,field)=> arr?.length
    ? arr.map((x,i)=>`<div class="accum-item ${cls}"><span class="accum-text">${icon} ${esc(x)}</span><button class="accum-del" onclick="deleteAccum('${field}',${i})">✕</button></div>`).join('')
    : '<div class="accum-empty">아직 없음</div>';

  const recentSessions = sessions.slice(0,3).map((s,i)=>`
    <div class="session-hist-item" onclick="viewSession(${i})">
      <div class="hist-date">${s.date} · R${s.rounds?.length||0}</div>
      <div class="hist-q">${esc((s.question||'').substring(0,80))}</div>
    </div>`).join('');

  const _v=id=>_homeCardVisible(id);
  // 카드 렌더러 맵 (순서 제어 가능)
  const _cardRenderers = {
    sessions: () => `<button class="btn-new-session" onclick="startNewSession()">💬 새 세션 시작</button>
      <button class="btn-new-session" onclick="startSessionFromLogs()" style="background:var(--ac);margin-top:-8px">📊 최근 증상 기록으로 세션 시작</button>
      <button onclick="startLightMode()" style="display:flex;align-items:center;gap:8px;padding:12px 20px;background:linear-gradient(135deg,#f0fdf4,#eff6ff);border:1.5px solid var(--bd);border-radius:12px;cursor:pointer;font-size:.88rem;width:100%;margin-bottom:12px;margin-top:-8px">
        <span style="font-size:1.2rem">⚡</span>
        <div style="text-align:left"><div style="font-weight:600;color:var(--ink)">빠른 체크</div><div style="font-size:.68rem;color:var(--mu)">AI 1개 · 최근 기록 기반 빠른 요약</div></div>
      </button>`,
    forecast: renderMigraineForecast,
    warnings: renderPatternWarnings,
    drugWarn: renderDrugInteractionWarning,
    aiSuggestions: () => { _aiSuggestions=generateAIQuestionSuggestions(); return renderAIQuestionSuggestions(); },
    insight: renderInsightCard,
    weeklySummary: renderWeeklySummaryCard,
    brkDailySync: typeof renderBrkDailySyncCard==='function' ? renderBrkDailySyncCard : ()=>'',
    brkTimeline: typeof renderBungrukiTimeline==='function' ? renderBungrukiTimeline : ()=>'',
    knowledge: () => `<div class="card">
      <div class="card-title">🧠 누적 협진 지식 <span class="badge badge-green">Drive 동기화</span>
        <button onclick="cleanupAccumulated()" style="margin-left:auto;font-size:.65rem;padding:3px 10px;border:1.5px solid var(--ac);border-radius:5px;background:none;color:var(--ac);cursor:pointer;font-weight:600">🤖 AI 정리</button>
      </div>
      <div class="accum-section">
        <div class="accum-label">확립된 합의 (${accum?.established_consensus?.length||0})</div>
        <div class="accum-list">${mkList(accum?.established_consensus,'consensus','✅','established_consensus')}</div>
        <div class="accum-add-row"><input class="accum-add-input" id="add-consensus" placeholder="새 합의 추가...">
          <button class="btn-accum-add" onclick="addAccum('established_consensus','add-consensus')">+ 추가</button></div>
      </div><div class="divider"></div>
      <div class="accum-section">
        <div class="accum-label">미해결 쟁점 (${accum?.unresolved_issues?.length||0})</div>
        <div class="accum-list">${mkList(accum?.unresolved_issues,'unresolved','🔍','unresolved_issues')}</div>
        <div class="accum-add-row"><input class="accum-add-input" id="add-issues" placeholder="새 쟁점 추가...">
          <button class="btn-accum-add" onclick="addAccum('unresolved_issues','add-issues')">+ 추가</button></div>
      </div><div class="divider"></div>
      <div class="accum-section">
        <div class="accum-label">폐기된 가설 (${accum?.discarded_hypotheses?.length||0})</div>
        <div class="accum-list">${mkList(accum?.discarded_hypotheses,'discarded','❌','discarded_hypotheses')}</div>
        <div class="accum-add-row"><input class="accum-add-input" id="add-discarded" placeholder="새 폐기 가설 추가...">
          <button class="btn-accum-add" onclick="addAccum('discarded_hypotheses','add-discarded')">+ 추가</button></div>
      </div>
    </div>`,
    recentSessions: () => sessions.length ? `<div class="card"><div class="card-title">📅 최근 세션</div>${recentSessions}
      ${sessions.length>3?`<div style="text-align:center;margin-top:8px"><button class="btn-cancel" onclick="switchView('history')" style="font-size:.78rem">전체 ${sessions.length}개 보기</button></div>`:''}</div>` : '',
  };
  // 카드 순서 적용
  const order = _getHomeCardOrder();
  const orderedIds = order.length ? order : _HOME_CARDS.map(c => c.id);
  // 새로 추가된 카드도 포함
  _HOME_CARDS.forEach(c => { if (!orderedIds.includes(c.id)) orderedIds.push(c.id); });
  const cardsHtml = orderedIds.map(id => _v(id) && _cardRenderers[id] ? _cardRenderers[id]() : '').join('');

  return `
    <div style="display:flex;align-items:center;margin-bottom:8px">
      <button onclick="_homeSettingsOpen=!_homeSettingsOpen;renderView('home')" style="margin-left:auto;font-size:.65rem;padding:3px 10px;border:1px solid var(--bd);border-radius:6px;background:var(--sf);color:var(--mu);cursor:pointer;font-family:var(--font)">⚙️ 카드 설정</button>
    </div>
    ${_homeSettingsOpen?_renderHomeSettings():''}
    ${cardsHtml}`;
}

// SESSION VIEW
function getDebateRole(aiId,reversed) {
  const teams=S.session?.debateTeams;
  if(teams){
    const labels={pro:'찬성 측',con:'반대 측',neutral:'중도',judge:'심판',fact:'정보수집'};
    return labels[teams[aiId]]||'';
  }
  const roles=reversed
    ?{gpt:'반대 측',gemini:'찬성 측',grok:'중도',claude:'심판',perp:'팩트체크'}
    :{gpt:'찬성 측',gemini:'반대 측',grok:'중도',claude:'심판',perp:'팩트체크'};
  return roles[aiId]||'';
}
function getDebateJudgeId(){
  const teams=S.session?.debateTeams;
  if(!teams) return 'claude';
  return Object.keys(teams).find(k=>teams[k]==='judge')||'claude';
}
function getDebateRoleColor(aiId) {
  const colors={gpt:'#10a37f',gemini:'#4285f4',grok:'#1DA1F2',claude:'#c96442',perp:'#20808d'};
  return colors[aiId]||'var(--mu)';
}

function renderSession() {
  if(!S.session) return `<div class="hint">홈에서 "새 세션 시작"을 눌러 주세요.</div>`;
  const sess=S.session; const curRound=sess.currentRound;
  const dc=DC();
  const mode=sess.mode||'normal';

  // Mode selector (only at R0)
  const modeSelector = curRound===0 ? `<div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap">
    ${[['basic','🌱 기본 협진'],['normal','⚡ 심층 협진'],['debate','⚔️ 디베이트'],['multi-grok','🤖 Grok Multi-Agent'],['quick','💬 빠른 질문']].map(([m,label])=>
      `<button class="log-vtab ${mode===m?'active':''}" onclick="S.session.mode='${m}';renderView('session')">${label}</button>`).join('')}
  </div>` : '';

  // Grok Multi-Agent 에이전트 수 선택
  const grokAgentSelector = mode==='multi-grok'&&curRound===0 ? `<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding:8px 12px;background:var(--sf2);border-radius:8px;border:1px solid var(--bd)">
    <span style="font-size:.72rem;color:var(--mu)">에이전트 수:</span>
    ${[4,8,16].map(n=>`<button class="log-vtab ${(sess.grokAgentLevel||4)===n?'active':''}" onclick="S.session.grokAgentLevel=${n};renderView('session')" style="font-size:.72rem;padding:4px 12px">${n}${n===4?' (빠름)':n===8?' (균형)':' (심층)'}</button>`).join('')}
  </div>` : '';

  // Basic mode description
  const basicDesc = mode==='basic'&&curRound===0 ? `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:10px;padding:10px 12px;background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0">
    <span style="font-size:.72rem;color:#15803d">🌱 <b>기본 모드</b>: GPT(데이터분석) + Perplexity(근거검색) 병렬 → Claude(최종판단) 순차</span>
    <span style="font-size:.65rem;color:#16a34a;margin-left:auto">3개 AI · 비용↓ · 일상 진료 최적</span>
  </div>` : '';

  // Debate team assignment UI
  const debateToggle = mode==='debate'&&curRound===0 ? (function(){
    const t=sess.debateTeams||{gpt:'pro',gemini:'con',grok:'neutral',claude:'judge',perp:'fact'};
    const roleLabels={pro:'찬성',con:'반대',neutral:'중도',judge:'심판',fact:'정보수집'};
    const roleColors={pro:'#16a34a',con:'#dc2626',neutral:'#1DA1F2',judge:'#c96442',fact:'#20808d'};
    const assignable=['gpt','gemini','grok','claude']; // perp는 정보수집 고정
    const roles=['pro','con','neutral','judge'];
    var rows=assignable.map(function(aiId){
      var btns=roles.map(function(r){
        var sel=t[aiId]===r;
        return `<button onclick="S.session.debateTeams.${aiId}='${r}';renderView('session')" style="flex:1;padding:4px 2px;font-size:.65rem;border:1.5px solid ${sel?roleColors[r]:'var(--bd)'};background:${sel?roleColors[r]+'20':'transparent'};color:${sel?roleColors[r]:'var(--mu)'};border-radius:5px;cursor:pointer;font-weight:${sel?'700':'400'};font-family:var(--font)">${roleLabels[r]}</button>`;
      }).join('');
      return `<div style="display:flex;align-items:center;gap:4px"><span style="font-size:.7rem;font-weight:600;color:${AI_DEFS[aiId].color};min-width:52px">${AI_DEFS[aiId].name}</span><div style="display:flex;gap:3px;flex:1">${btns}</div></div>`;
    }).join('');
    return `<div style="margin-bottom:10px;padding:10px 12px;background:var(--sf2);border-radius:8px;border:1px solid var(--bd)">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
        <span style="font-size:.72rem;font-weight:600;color:var(--tx)">⚔️ 역할 배정</span>
        <span style="font-size:.62rem;color:var(--mu);margin-left:auto">Perplexity = 정보수집 (고정)</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:5px">${rows}</div>
      <button class="btn-cancel" onclick="S.session.debateTeams={gpt:'pro',gemini:'con',grok:'neutral',claude:'judge',perp:'fact'};renderView('session')" style="font-size:.62rem;padding:3px 8px;margin-top:8px">↩ 기본 배정 복원</button>
    </div>`;
  })() : '';

  const aiCards=Object.entries(AI_DEFS).map(([id,def])=>{
    // Basic mode: GPT, Perplexity, Claude만 표시
    if(mode==='basic'&&id!=='gpt'&&id!=='perp'&&id!=='claude') return '';
    // Grok Multi-Agent: Grok 카드만 표시
    if(mode==='multi-grok'&&id!=='grok') return '';
    const ans=curRound>0?(sess.rounds[curRound-1]?.answers?.[id]||''):'';
    const isError=!!(sess.rounds[curRound-1]?.errors?.[id]);
    const curModel=S.models[id]||DEFAULT_MODELS[id];
    const modelOpts=(MODEL_OPTIONS[id]||[]).map(m=>
      `<option value="${m.value}" ${curModel===m.value?'selected':''}>${m.label}</option>`).join('');
    const debateLabel=mode==='debate'?`<span style="font-size:.6rem;padding:1px 6px;border-radius:3px;background:${getDebateRoleColor(id)}20;color:${getDebateRoleColor(id)};font-weight:700;margin-left:4px">${getDebateRole(id,sess.debateReversed)}</span>`:'';
    const quickSelected=mode==='quick'&&curRound===0?S.session._quickSelectedAI:null;
    const quickCls=mode==='quick'&&curRound===0?(quickSelected?(quickSelected===id?'quick-selected':'quick-dimmed'):'quick-idle'):'';
    return `
    <div class="ai-card ${isError?'error':''} ${quickCls}" data-ai="${id}">
      <div class="ai-head">
        <div class="ai-dot" style="background:${def.color}"></div>
        <span class="ai-name" style="color:${def.color}">${def.name}</span>
        <span class="ai-role">${mode==='debate'?'':dc.aiRoles[id]||''}</span>${debateLabel}
        <span id="chip-${id}" class="ai-chip"></span>
        <span id="timer-${id}" style="display:none;font-size:.62rem;font-weight:600;font-variant-numeric:tabular-nums;color:var(--mu)"></span>
        <span id="slow-${id}" style="display:none;cursor:help;font-size:.8rem" title="응답이 느립니다 — 중단 후 재시도 권장">⚠️</span>
        <button id="stop-${id}" onclick="stopAI('${id}')" style="display:none;margin-left:auto;font-size:.65rem;padding:2px 8px;border:1.5px solid #f59e0b;border-radius:4px;background:none;color:#f59e0b;cursor:pointer;font-weight:600;white-space:nowrap">⏹ 중단</button>
        ${curRound>0?`<button class="btn-copy" onclick="copyAIResponse('${id}')" style="${S._abortControllers?.[id]?'':'margin-left:auto'}">📋</button>
        <button class="ai-regen" id="regen-${id}" onclick="regenOne('${id}')">↺ 재생성</button>`:''}
      </div>
      <div style="padding:4px 13px;display:flex;align-items:center;gap:6px;border-bottom:1px solid var(--bd);background:var(--sf2)">
        <select onchange="changeAIModel('${id}',this.value)" style="flex:1;border:1px solid var(--bd);border-radius:4px;padding:2px 5px;font-size:.68rem;background:var(--sf);color:var(--ink);cursor:pointer">${modelOpts}</select>
        ${isError?`<button onclick="regenOne('${id}')" style="font-size:.65rem;padding:2px 8px;border:1.5px solid #ef4444;border-radius:4px;background:none;color:#ef4444;cursor:pointer;font-weight:600;white-space:nowrap">▶ 재실행</button>`:''}
      </div>
      <div class="ai-body">
        <textarea id="ans-${id}" class="${ans?(isError?'gen':''):'gen'}"
          placeholder="${curRound===0?'라운드 시작 시 자동 생성...':'생성 중...'}">${esc(ans)}</textarea>
      </div>
      ${curRound>0&&curRound<5?`<div class="ai-rating" data-ai-rate="${id}">
        <button onclick="rateAIResponse('${id}',1,this)" class="${getRating(id)===1?'rated-up':''}">👍</button>
        <button onclick="rateAIResponse('${id}',-1,this)" class="${getRating(id)===-1?'rated-down':''}">👎</button>
      </div>`:''}
    </div>`;
  }).join('');

  const maxRound=Math.max(3,sess.rounds.length+1);
  const roundDots=Array.from({length:Math.min(maxRound,6)},(_,i)=>i+1).map(n=>{
    const colors={1:'var(--r1)',2:'var(--r2)',3:'var(--r3)',4:'#8b5cf6',5:'#ec4899',6:'#06b6d4'};
    const state=curRound>n?'done':curRound===n?'active':'waiting';
    const c=colors[n]||'var(--ac)';
    const style=state==='active'?`background:${c};color:#fff;border-color:${c}`:state==='done'?`border-color:${c};color:${c}`:`border-color:#3a4a5a;color:#3a4a5a`;
    return `<span class="round-pill ${state}" style="${style}">R${n}${state==='done'?' ✓':''}</span>`;
  }).join('');

  const templates=DM()?.templates||[];
  const tmplHtml=templates.length&&curRound===0?`
    <div style="margin-bottom:6px"><div class="q-label" style="margin-bottom:6px">📌 템플릿 <span style="font-size:.6rem;color:var(--mu)">(여러 개 선택 가능)</span></div>
    <div class="tmpl-list">${templates.map((t,i)=>`<div class="tmpl-chip" data-tidx="${i}" onclick="toggleTemplateSelect(this,${i})">${esc(t.substring(0,40)+(t.length>40?'…':''))}</div>`).join('')}</div></div>`:'';

  return `
    ${modeSelector}
    <div class="q-bar">
      <div class="q-label" style="color:var(--domain-color)">● ${mode==='debate'?'쟁점':mode==='quick'?'빠른 질문':'오늘의 질문'}</div>
      ${tmplHtml}
      <textarea id="q-input" rows="4" placeholder="${mode==='debate'?'쟁점을 입력하세요 (예: Venlafaxine 중단 유지해도 되는가?)':mode==='quick'?'질문을 입력하세요...':'질문을 입력하세요...'}"
        ${curRound>=4?'readonly style="color:var(--mu)"':''}
        oninput="if(S.session){S.session.question=this.value;S._dirty=true;}updateModeSuggestion(this.value)">${esc(sess.question||'')}</textarea>
      <div id="tmpl-suggest-area"></div>
      <div id="mode-suggest" style="font-size:.65rem;color:var(--r3);margin-top:2px"></div>
      ${curRound>0&&curRound<4?'<div style="font-size:.65rem;color:var(--r3);margin-top:2px">💡 질문을 수정하면 다음 라운드에 반영됩니다</div>':''}
      ${curRound===0?`
      <div class="file-upload-area" onclick="document.getElementById('q-file-input').click()">
        <span style="font-size:1rem">📎</span>
        <span class="file-upload-label">검사 자료 첨부 (이미지, PDF, 문서)</span>
        <input type="file" id="q-file-input" multiple accept="image/*,.pdf,.doc,.docx,.txt" onchange="handleSessionFiles(this)">
      </div>
      <div id="q-file-list" style="margin-top:6px;display:flex;flex-wrap:wrap;gap:4px"></div>
      <div style="margin-top:8px;text-align:right"><button class="btn-accum-add" style="font-size:.72rem;padding:4px 12px" onclick="saveAsTemplate()">📌 템플릿 저장</button></div>
      `:curRound<4&&sess._attachments?.length?`<div style="margin-top:6px;font-size:.72rem;color:var(--mu)">📎 첨부 ${sess._attachments.length}건</div>`:''}
    </div>
    ${basicDesc}
    ${debateToggle}
    ${grokAgentSelector||''}
    ${mode!=='quick'?`<div class="round-bar">
      <span style="font-size:.72rem;color:#5a7a95;font-family:var(--mono)">${mode==='debate'?'⚔️ 디베이트':mode==='basic'?'🌱 기본':'진행'}:</span>
      ${roundDots}
      <span style="font-size:.72rem;color:#3a5a6a;margin-left:auto;font-family:var(--mono)">${curRound===0?'시작 전':curRound===4?'완료':`R${curRound} 완료`}</span>
    </div>`:''}
    <div id="autosave-bar" class="autosave-bar"></div>
    <div id="action-bar">${renderActionBar(curRound)}</div>
    <div id="stop-all-bar" style="display:none;margin-bottom:8px;justify-content:center;gap:8px">
      <button onclick="stopAllAI()" style="padding:8px 28px;font-size:.82rem;font-weight:700;border:2px solid #ef4444;border-radius:8px;background:#ef444415;color:#ef4444;cursor:pointer">⏹ 전체 중단</button>
      <button onclick="resetAndNewSession()" style="padding:8px 20px;font-size:.82rem;font-weight:600;border:2px solid var(--bd);border-radius:8px;background:var(--sf2);color:var(--ink);cursor:pointer">🔄 새 질문</button>
    </div>
    <div class="ai-grid${mode==='quick'||mode==='multi-grok'?' single-card':''}">${aiCards}</div>
    <div id="summary-area">${sess.summary?renderSummaryResult(sess.summary):''}</div>`;
}

// R1 의견 충돌 감지: AI 답변에서 반대/불일치 키워드 탐색
function _detectConflict() {
  const rd=S.session?.rounds?.[0];
  if(!rd?.answers) return '';
  const answers=Object.values(rd.answers).filter(a=>a&&!a.startsWith('⚠️'));
  if(answers.length<2) return '';
  const conflictWords=['반박','불일치','동의하지','반대','다르게','오류','재고','의문'];
  let conflicts=0;
  answers.forEach(a=>{ if(conflictWords.some(w=>a.includes(w))) conflicts++; });
  if(conflicts>=2) return '⚡ AI 의견 충돌 감지 — R2 크로스체크 권장';
  return '';
}

function renderActionBar(curRound) {
  const mode=S.session?.mode||'normal';

  // Quick question mode
  if(mode==='quick') {
    if(curRound>=4) return `<div class="round-action-bar" style="border-color:#10b98155;background:#f0fdf4"><span style="color:var(--gr);font-size:.85rem;font-weight:600">✅ 빠른 질문 완료</span><button class="btn-run-round green" onclick="startNewSession()" style="margin-left:auto">새 세션</button></div>`;
    const selAI=S.session._quickSelectedAI||'';
    return `<div class="round-action-bar ${selAI?'selection-active':''}" style="flex-wrap:wrap;gap:6px;align-items:center">
      <span style="font-size:.75rem;color:var(--mu)">AI 선택:</span>
      ${Object.entries(AI_DEFS).map(([id,def])=>`<button class="btn-run-round quick-ai-btn ${selAI===id?'selected':''}" onclick="selectQuickAI('${id}')" style="--ai-color:${def.color}">${def.name}</button>`).join('')}
      ${selAI?`<button class="btn-run-round quick-start-btn" onclick="runQuickQuestion('${selAI}')">▶ 시작</button>`:''}
    </div>`;
  }

  // Completed
  if(curRound===4) {
    return `<div class="round-action-bar" style="border-color:#10b98155;background:#f0fdf4">
      <span style="color:var(--gr);font-size:.85rem;font-weight:600">✅ 세션 완료</span>
      <button class="btn-run-round" onclick="continueSession()" style="background:var(--ac);margin-left:auto">🔄 이어서 질문</button>
      <button class="btn-run-round green" onclick="startNewSession()">새 세션</button>
    </div>`;
  }

  // R3 done (first time, not after continueSession)
  if(curRound===3 && !S.session._continued) {
    const hasErr=Object.keys(AI_DEFS).some(id=>S.session.rounds[2]?.errors?.[id]);
    return `<div class="round-action-bar">
      <button class="btn-run-round green" id="final-btn" onclick="runFinalSummary()"><div class="spin" id="final-sp"></div>✅ 세션 종료 & 저장</button>
      ${hasErr?`<button class="btn-run-round" onclick="runRound(3,true)" style="background:#5a5a7a">🔁 R3 오류만 재실행</button>`:''}
      <button class="btn-run-round" onclick="resetAndNewSession()" style="background:var(--sf2);color:var(--ink);border:1.5px solid var(--bd)">🔄 새 질문</button>
      <span class="run-note">각 AI 카드에서 개별 재생성도 가능합니다</span>
    </div>`;
  }

  // R1+ done — next round + early summary option
  if(curRound>0) {
    const next=curRound+1;
    const labels={2:'🔄 R2 크로스체크',3:'🔄 R3 최종 수렴'};
    const nextLabel=labels[next]||`🔄 R${next} 추가 분석`;
    const hasErr=Object.keys(AI_DEFS).some(id=>S.session.rounds[curRound-1]?.errors?.[id]);
    // R1 후 의견 충돌 감지
    const conflictHint=curRound===1?_detectConflict():'';
    return `<div class="round-action-bar" style="flex-wrap:wrap">
      <button class="btn-run-round" id="run-btn" onclick="runRound(${next})">${nextLabel}</button>
      <button class="btn-run-round green" onclick="runFinalSummary()" style="font-size:.78rem;padding:8px 14px">✅ 여기서 요약 & 종료</button>
      ${hasErr?`<button class="btn-run-round" onclick="runRound(${curRound},true)" style="background:#5a5a7a">🔁 R${curRound} 오류만 재실행</button>`:''}
      <button class="btn-undo" onclick="undoSession()" ${_sessionHistory.length?'':'disabled'} title="이전 라운드로 되돌리기">↩ Undo</button>
      <button class="btn-run-round" onclick="resetAndNewSession()" style="background:var(--sf2);color:var(--ink);border:1.5px solid var(--bd)">🔄 새 질문</button>
      <span class="run-note">${conflictHint||( mode==='debate'?'또는 심판 판정으로 종료':'AI들이 서로의 답변을 분석합니다')}</span>
    </div>`;
  }

  // R0 start
  // Basic mode
  if(mode==='basic') {
    if(curRound>=4) return `<div class="round-action-bar" style="border-color:#10b98155;background:#f0fdf4"><span style="color:var(--gr);font-size:.85rem;font-weight:600">✅ 기본 협진 완료</span><button class="btn-run-round green" onclick="startNewSession()">새 세션</button><button class="btn-run-round" onclick="continueSession()" style="background:var(--ac)">🔄 이어서 질문</button></div>`;
    if(curRound>0) {
      return `<div class="round-action-bar" style="flex-wrap:wrap">
        <button class="btn-run-round green" onclick="runFinalSummary()" style="font-size:.78rem;padding:8px 14px">✅ 요약 & 종료</button>
        <button class="btn-run-round" onclick="S.session.mode='normal';runRound(${curRound+1})">⚡ 심층 모드로 전환</button>
        <button class="btn-undo" onclick="undoSession()" ${_sessionHistory.length?'':'disabled'}>↩ Undo</button>
        <button class="btn-run-round" onclick="resetAndNewSession()" style="background:var(--sf2);color:var(--ink);border:1.5px solid var(--bd)">🔄 새 질문</button>
      </div>`;
    }
    return `<div class="round-action-bar"><button class="btn-run-round" id="run-btn" onclick="runBasicMode()">🌱 기본 협진 시작 — GPT+Perplexity→Claude</button><span class="run-note">데이터분석+근거검색 → 최종판단</span></div>`;
  }

  if(mode==='multi-grok') {
    return `<div class="round-action-bar"><button class="btn-run-round" id="run-btn" onclick="runGrokMultiAgent()" style="background:#1DA1F2">🤖 Grok Multi-Agent 시작 (${S.session?.grokAgentLevel||4} 에이전트)</button><span class="run-note">Grok 내부 토론 → Claude 형식 요약</span></div>`;
  }
  const startLabel=mode==='debate'?'⚔️ R1 시작 — 5역할 디베이트':'⚡ R1 시작 — 5개 AI 심층 협진';
  return `<div class="round-action-bar"><button class="btn-run-round" id="run-btn" onclick="runRound(1)">${startLabel}</button><span class="run-note">${mode==='debate'?'디베이트 시작':'5개 AI 독립 분석 시작'}</span></div>`;
}

// Mode suggestion UI update
function updateModeSuggestion(q) {
  renderTemplateSuggestions(q);
  const el=document.getElementById('mode-suggest');
  if(!el||S.session?.currentRound>0) return;
  const suggest=suggestSessionMode(q);
  if(suggest==='debate'&&S.session?.mode!=='debate') {
    el.innerHTML='💡 이 질문은 <a href="#" onclick="S.session.mode=\'debate\';renderView(\'session\');return false" style="color:var(--ac);text-decoration:underline">⚔️ 디베이트 모드</a>가 효과적일 수 있어요';
  } else if(suggest==='quick'&&S.session?.mode!=='quick') {
    el.innerHTML='💡 <a href="#" onclick="S.session.mode=\'quick\';renderView(\'session\');return false" style="color:var(--ac);text-decoration:underline">💬 빠른 질문</a>으로도 충분할 수 있어요';
  } else {
    el.innerHTML='';
  }
}

// HISTORY VIEW
let _histSearch='';
let _histDateFrom='';
let _histDateTo='';
function filterSessions(sessions) {
  let filtered=sessions;
  if(_histSearch) {
    const q=_histSearch.toLowerCase();
    filtered=filtered.filter(s=>(s.question||'').toLowerCase().includes(q)||(s.summary?.session_summary||'').toLowerCase().includes(q));
  }
  if(_histDateFrom) filtered=filtered.filter(s=>s.date>=_histDateFrom);
  if(_histDateTo) filtered=filtered.filter(s=>s.date<=_histDateTo);
  return filtered;
}
let _histSearchTimer;
function onHistSearch(){
  const el=document.getElementById('hist-search');
  const pos=el?.selectionStart||0;
  _histSearch=el?.value||'';
  clearTimeout(_histSearchTimer);
  _histSearchTimer=setTimeout(()=>{
    renderView('history');
    setTimeout(()=>{const el2=document.getElementById('hist-search');if(el2){el2.focus();el2.selectionStart=el2.selectionEnd=pos;}},0);
  },300);
}
function onHistDateFilter(){_histDateFrom=document.getElementById('hist-from')?.value||'';_histDateTo=document.getElementById('hist-to')?.value||'';renderView('history');}
function clearHistFilter(){_histSearch='';_histDateFrom='';_histDateTo='';renderView('history');}

function renderHistory() {
  const allSessions=DM()?.sessions||[];
  if(!allSessions.length) return `<div class="hint">저장된 세션이 없어요.<br><button class="btn-new-session" onclick="startNewSession()" style="margin-top:14px;width:auto;padding:10px 24px">💬 새 세션 시작</button></div>`;
  if(S.viewingHistIdx!==null && allSessions[S.viewingHistIdx]) return renderHistDetail(allSessions[S.viewingHistIdx],S.viewingHistIdx);

  const sessions=filterSessions(allSessions);
  const hasFilter=_histSearch||_histDateFrom||_histDateTo;

  return `<button class="btn-new-session" onclick="startNewSession()">💬 새 세션 시작</button>
  <div class="export-bar" style="flex-wrap:wrap;gap:8px">
    <input class="accum-add-input" id="hist-search" value="${esc(_histSearch)}" placeholder="🔍 질문/요약 검색..." oninput="onHistSearch()" style="flex:2;min-width:160px">
    <input type="date" id="hist-from" value="${_histDateFrom}" class="dx-form-input" onchange="onHistDateFilter()" style="width:130px;font-size:.72rem">
    <span style="font-size:.72rem;color:var(--mu)">~</span>
    <input type="date" id="hist-to" value="${_histDateTo}" class="dx-form-input" onchange="onHistDateFilter()" style="width:130px;font-size:.72rem">
    ${hasFilter?`<button class="btn-cancel" onclick="clearHistFilter()" style="font-size:.7rem;padding:4px 10px">✕ 초기화</button>`:''}
    <button class="btn-export" onclick="exportSessionsMD()">📄 MD 내보내기</button>
    <button class="btn-export" onclick="exportPDF()">📑 PDF 리포트</button>
    <span style="font-size:.78rem;color:var(--mu)">${hasFilter?`${sessions.length}/${allSessions.length}건`:`총 ${allSessions.length}개`}</span>
  </div>` +
  sessions.map(s=>{
    const realIdx=allSessions.indexOf(s);
    return `<div class="session-hist-item" onclick="viewSession(${realIdx})">
      <button class="hist-del" onclick="event.stopPropagation();deleteSession(${realIdx})">🗑</button>
      <div class="hist-date">${s.date} · R${s.rounds?.length||0}</div>
      <div class="hist-q">${esc((s.question||'').substring(0,100))}</div>
      ${s.summary?`<div class="hist-meta">${esc((s.summary.session_summary||'').substring(0,80))}</div>`:''}
    </div>`;}).join('');
}
function viewSession(idx) { S.viewingHistIdx=idx; switchView('history'); }

function renderHistDetail(s,idx) {
  const rounds=(s.rounds||[]).map(r=>`
    <div class="card"><div class="card-title">Round ${r.round}</div>
      ${Object.entries(AI_DEFS).map(([id,def])=>{
        const ans=r.answers?.[id]||'(없음)';
        const safeId=`hist-${idx}-r${r.round}-${id}`;
        return `<div style="margin-bottom:7px;border:1.5px solid var(--bd);border-radius:8px;overflow:hidden">
          <button onclick="toggleHistAI('${safeId}')" style="width:100%;display:flex;align-items:center;gap:8px;padding:9px 13px;background:var(--sf2);border:none;cursor:pointer;text-align:left">
            <div style="width:8px;height:8px;border-radius:50%;background:${def.color}"></div>
            <span style="font-size:.75rem;font-weight:700;color:${def.color}">${def.name}</span>
            <span style="font-size:.7rem;color:var(--mu2);margin-left:auto" id="${safeId}-arrow">▶</span>
          </button>
          <div id="${safeId}" style="display:none;padding:11px 13px;font-size:.83rem;line-height:1.72;border-top:1px solid var(--bd)"><div class="ai-md">${renderMD(ans)}</div></div>
        </div>`;
      }).join('')}
    </div>`).join('');

  const summary=s.summary;
  return `
    <div style="margin-bottom:14px;display:flex;align-items:center;gap:10px">
      <button class="btn-cancel" onclick="S.viewingHistIdx=null;renderView('history')">← 목록</button>
      <button class="btn-accum-add" onclick="continueFromHistory(${S.viewingHistIdx})" style="font-size:.75rem">🔄 이어서 질문</button>
      <span style="font-size:.87rem;font-weight:600">${s.date}</span>
    </div>
    <div class="card"><div class="card-title">질문</div><div style="font-size:.87rem;line-height:1.7">${esc(s.question||'')}</div></div>
    ${rounds}
    ${summary?`<div class="final-card"><h3>✅ 요약</h3><div class="fcontent"><p>${esc(summary.session_summary||'')}</p></div></div>`:''}`;
}
function toggleHistAI(id) {
  const el=document.getElementById(id);const arrow=document.getElementById(id+'-arrow');if(!el)return;
  const isOpen=el.style.display!=='none';
  el.style.display=isOpen?'none':'block';
  if(arrow) arrow.textContent=isOpen?'▶':'▼';
}

async function deleteSession(idx) {
  if(!confirm('이 세션을 삭제하시겠습니까?')) return;
  DM().sessions.splice(idx,1);
  await saveMaster();
  updateHistCount();
  renderView('history');
  showToast('🗑 세션 삭제됨');
}

function updateHistCount() {
  const el=document.getElementById('history-count');
  if(el) el.textContent=DM()?.sessions?.length||0;
}

// ACCUM EDIT
async function deleteAccum(field,idx) {
  if(!confirm('삭제하시겠습니까?')) return;
  DM().accumulated[field].splice(idx,1);
  await saveMaster(); renderView('home'); showToast('🗑 삭제됨');
}
async function addAccum(field,inputId) {
  const el=document.getElementById(inputId);const val=(el?.value||'').trim();
  if(!val) return;
  DM().accumulated[field].push(val);
  await saveMaster(); el.value=''; renderView('home'); showToast('✅ 추가됨');
}

// ACCUMULATED KNOWLEDGE CLEANUP (AI)
// 진행률 바 헬퍼
function _showProgress(step,totalSteps,label) {
  let bar=document.getElementById('cleanup-progress');
  if(!bar) {
    bar=document.createElement('div');
    bar.id='cleanup-progress';
    bar.style.cssText='position:fixed;bottom:0;left:0;right:0;background:var(--sf);border-top:2px solid var(--ac);padding:10px 16px;z-index:9999;font-size:.78rem;font-family:inherit';
    document.body.appendChild(bar);
    bar._startTime=Date.now();
  }
  const pct=Math.round(step/totalSteps*100);
  const elapsed=Math.round((Date.now()-bar._startTime)/1000);
  const estTotal=step>0?Math.round(elapsed/step*totalSteps):0;
  const remaining=Math.max(0,estTotal-elapsed);
  bar.innerHTML=`<div style="display:flex;align-items:center;gap:10px">
    <span style="font-weight:600;color:var(--ac)">🤖 ${label}</span>
    <div style="flex:1;height:8px;background:var(--bd);border-radius:4px;overflow:hidden">
      <div style="width:${pct}%;height:100%;background:var(--ac);border-radius:4px;transition:width .3s"></div>
    </div>
    <span style="min-width:45px;text-align:right;color:var(--mu)">${pct}%</span>
    <span style="font-size:.65rem;color:var(--mu2)">${elapsed}초${remaining>0?' / ~'+remaining+'초 남음':''}</span>
  </div>`;
}
function _hideProgress() {
  const bar=document.getElementById('cleanup-progress');
  if(bar) bar.remove();
}

async function cleanupAccumulated() {
  const m=DM(); const accum=m.accumulated;
  const categories=[
    {key:'established_consensus',label:'확립된 합의'},
    {key:'discarded_hypotheses',label:'폐기된 가설'},
    {key:'unresolved_issues',label:'미해결 쟁점'},
    {key:'clinical_protocols',label:'임상 프로토콜'},
  ];
  const total=categories.reduce((s,c)=>(s+(accum[c.key]?.length||0)),0);
  if(total<3){showToast('정리할 항목이 충분하지 않습니다.');return;}
  const aiId=['claude','gpt','gemini','grok','perp'].find(id=>S.keys[id]);
  if(!aiId){showToast('❌ API 키가 없습니다.');return;}
  // 비어있지 않은 카테고리만 처리
  const batches=categories.filter(c=>(accum[c.key]?.length||0)>0);
  if(!confirm(`누적 지식 ${total}건을 ${AI_DEFS[aiId].name}로 정리합니다.\n${batches.length}단계로 카테고리별 처리합니다.\n중복 제거, 병합 등을 수행합니다.`)) return;
  if(S.generating){showToast('다른 AI 작업이 진행 중입니다.');return;}
  S.generating=true;
  const ac=new AbortController();if(!S._abortControllers)S._abortControllers={};S._abortControllers[aiId]=ac;
  const result={established_consensus:[],discarded_hypotheses:[],unresolved_issues:[],clinical_protocols:[]};
  try {
    for(let i=0;i<batches.length;i++) {
      const cat=batches[i];
      const items=accum[cat.key]||[];
      _showProgress(i,batches.length,`${cat.label} 정리 중 (${items.length}건)...`);
      const system=`의료 데이터 정리 전문가. 아래 "${cat.label}" 항목들을 정리:
1. 중복/유사 항목 병합 (핵심 정보 보존)
2. 해결된 쟁점은 "합의"로, 모순 합의는 "쟁점"으로, 무관한 것은 "폐기"로 재분류
⚠️ 약물명·용량·날짜·조건·근거 등 임상 세부사항 반드시 보존. 의미 변경 축약 금지.
반드시 JSON만 출력:
{"consensus":["합의 항목"],"discarded":["폐기 항목"],"issues":["쟁점 항목"],"protocols":["프로토콜 항목"]}`;
      const user=`[${cat.label}] ${items.length}건:\n${items.map((x,j)=>(j+1)+'. '+x).join('\n')}`;
      const raw=await callAIStream(aiId,system,user,()=>{},ac.signal);
      let clean=raw.replace(/```json|```/g,'').trim();
      const jsonMatch=clean.match(/\{[\s\S]*\}/);
      if(jsonMatch) clean=jsonMatch[0];
      let parsed;
      try { parsed=JSON.parse(clean); }
      catch(jsonErr) {
        let fixed=clean;
        const lastQuote=fixed.lastIndexOf('"');
        if(lastQuote>0) {
          fixed=fixed.substring(0,lastQuote+1);
          const opens=(fixed.match(/\[/g)||[]).length-(fixed.match(/\]/g)||[]).length;
          const braces=(fixed.match(/\{/g)||[]).length-(fixed.match(/\}/g)||[]).length;
          for(let k=0;k<opens;k++) fixed+=']';
          for(let k=0;k<braces;k++) fixed+='}';
        }
        try { parsed=JSON.parse(fixed); }
        catch(e2) { throw new Error(`${cat.label} 정리 실패: JSON 파싱 오류`); }
      }
      // 결과 합산
      (parsed.consensus||[]).forEach(x=>{if(x)result.established_consensus.push(x);});
      (parsed.discarded||[]).forEach(x=>{if(x)result.discarded_hypotheses.push(x);});
      (parsed.issues||[]).forEach(x=>{if(x)result.unresolved_issues.push(x);});
      (parsed.protocols||[]).forEach(x=>{if(x)result.clinical_protocols.push(x);});
    }
    _showProgress(batches.length,batches.length,'완료!');
    const newTotal=result.established_consensus.length+result.discarded_hypotheses.length+result.unresolved_issues.length+result.clinical_protocols.length;
    _hideProgress();
    if(!confirm(`정리 결과: ${total}건 → ${newTotal}건\n합의 ${result.established_consensus.length} / 폐기 ${result.discarded_hypotheses.length} / 쟁점 ${result.unresolved_issues.length} / 프로토콜 ${result.clinical_protocols.length}\n\n적용하시겠습니까?`)) return;
    accum.established_consensus=result.established_consensus;
    accum.discarded_hypotheses=result.discarded_hypotheses;
    accum.unresolved_issues=result.unresolved_issues;
    accum.clinical_protocols=result.clinical_protocols;
    await saveMaster(); renderView('home');
    showToast(`✅ 누적 지식 정리 완료: ${total}건 → ${newTotal}건`);
  } catch(e){
    _hideProgress();
    if(e.name==='AbortError') showToast('⏹ 정리 중단됨');
    else showToast('❌ '+e.message,4000);
  } finally {
    delete S._abortControllers?.[aiId];
    S.generating=false;
  }
}

// TEMPLATES
let _selectedTemplates=new Set();
function toggleTemplateSelect(el,idx) {
  if(_selectedTemplates.has(idx)) { _selectedTemplates.delete(idx); el.classList.remove('sel'); el.style.background=''; el.style.color=''; }
  else { _selectedTemplates.add(idx); el.classList.add('sel'); el.style.background='var(--ac)'; el.style.color='#fff'; }
  // 선택된 템플릿들을 질문창에 합침
  const templates=DM()?.templates||[];
  const selected=[..._selectedTemplates].sort().map(i=>templates[i]).filter(Boolean);
  const el2=document.getElementById('q-input');
  if(el2) el2.value=selected.length===1?selected[0]:selected.map((t,i)=>(i+1)+'. '+t).join('\n');
}
function loadTemplate(idx) { const t=DM()?.templates?.[idx]; if(t){const el=document.getElementById('q-input');if(el)el.value=t;} }
async function saveAsTemplate() {
  const q=(document.getElementById('q-input')?.value||'').trim();
  if(!q){showToast('❌ 질문 입력 필요');return;}
  const m=DM(); if(!m.templates) m.templates=[];
  if(m.templates.includes(q)){showToast('이미 저장됨');return;}
  m.templates.push(q); await saveMaster(); renderView('session'); showToast('📌 템플릿 저장');
}
function renderTemplates() {
  const templates=DM()?.templates||[];
  const dc=DC();
  const defaultTmpls=dc.templates||[];
  // AI 추천 템플릿 (도메인 기본 중 사용자가 아직 추가하지 않은 것)
  const suggestions=defaultTmpls.filter(t=>!templates.includes(t));
  const list=templates.length
    ? templates.map((t,i)=>`<div style="background:var(--sf);border:1.5px solid var(--bd);border-radius:10px;padding:10px 14px;margin-bottom:6px;display:flex;align-items:center;gap:8px">
        <span style="font-size:.85rem;flex:1;cursor:text" id="tmpl-text-${i}" onclick="editTemplate(${i})">${esc(t)}</span>
        <button class="btn-accum-add" style="background:var(--ac);padding:4px 10px;font-size:.72rem" onclick="useTemplateInSession(${i})">사용</button>
        <button class="accum-del" onclick="editTemplate(${i})" title="수정">✏️</button>
        <button class="accum-del" onclick="deleteTemplate(${i})">🗑</button>
      </div>`).join('')
    : '<div class="hint">저장된 템플릿이 없어요.</div>';
  const suggestHtml=suggestions.length?`<div style="margin-top:16px;padding:12px;background:var(--sf2);border:1.5px solid var(--bd);border-radius:10px">
    <div style="font-size:.75rem;font-weight:600;color:var(--mu);margin-bottom:8px">💡 추천 템플릿 (${dc.label})</div>
    ${suggestions.map((t,i)=>`<div style="display:flex;align-items:center;gap:8px;padding:6px 0;${i<suggestions.length-1?'border-bottom:1px solid var(--bd)':''}">
      <span style="font-size:.8rem;flex:1;color:var(--mu)">${esc(t)}</span>
      <button class="btn-accum-add" style="font-size:.68rem;padding:3px 10px" onclick="addSuggestedTemplate(${i})">+ 추가</button>
    </div>`).join('')}
  </div>`:'';
  return `<div class="card"><div class="card-title">📌 질문 템플릿</div>${list}
    <div class="accum-add-row" style="margin-top:12px"><input class="accum-add-input" id="new-tmpl-input" placeholder="새 템플릿...">
    <button class="btn-accum-add" onclick="addTemplateDirectly()">+ 추가</button></div>${suggestHtml}</div>`;
}
async function deleteTemplate(idx) { DM().templates.splice(idx,1); await saveMaster(); renderView('templates'); }
function editTemplate(idx) {
  const t=DM()?.templates?.[idx]; if(!t) return;
  const newVal=prompt('템플릿 수정:',t);
  if(newVal!==null&&newVal.trim()) { DM().templates[idx]=newVal.trim(); saveMaster(); renderView('templates'); showToast('✏️ 수정됨'); }
}
async function addSuggestedTemplate(idx) {
  const dc=DC(); const templates=DM()?.templates||[];
  const suggestions=(dc.templates||[]).filter(t=>!templates.includes(t));
  if(!suggestions[idx]) return;
  if(!DM().templates) DM().templates=[];
  DM().templates.push(suggestions[idx]); await saveMaster(); renderView('templates'); showToast('📌 추가됨');
}
async function addTemplateDirectly() {
  const el=document.getElementById('new-tmpl-input');const val=(el?.value||'').trim();if(!val)return;
  if(!DM().templates) DM().templates=[];
  DM().templates.push(val); await saveMaster(); el.value=''; renderView('templates'); showToast('📌 추가됨');
}
function useTemplateInSession(idx) {
  const t=DM()?.templates?.[idx]; if(!t) return;
  if(!S.session) startNewSession(); else switchView('session');
  setTimeout(()=>{const el=document.getElementById('q-input');if(el)el.value=t;},50);
}

// ═══════════════════════════════════════════════════════════════
// STATS DASHBOARD (#3)
// ── 통계 차트: 약물 효과율 (직접 평가 기반) ──
function renderOutcomeStats(logs) {
  const rated=logs.filter(l=>l.outcome?.rating);
  if(rated.length<3) return '';
  const rMap={good:'better',partial:'same',none:'worse'};
  const normR=r=>rMap[r]||r;
  const medStats={};
  rated.forEach(l=>{
    const norm=normR(l.outcome.rating);
    [...(l.meds||[]),...(l.treatments||[])].forEach(item=>{
      if(!medStats[item]) medStats[item]={better:0,same:0,worse:0,total:0};
      medStats[item][norm]++;medStats[item].total++;
    });
  });
  const noMed=rated.filter(l=>!(l.meds?.length)&&!(l.treatments?.length));
  const naturalStats=noMed.length>=2?{better:0,same:0,worse:0,total:noMed.length}:null;
  if(naturalStats) noMed.forEach(l=>naturalStats[normR(l.outcome.rating)]++);
  const results=Object.entries(medStats).filter(([,s])=>s.total>=2).sort((a,b)=>b[1].total-a[1].total);
  if(!results.length&&!naturalStats) return '';
  const renderBar=([label,s])=>{
    const bPct=Math.round(s.better/s.total*100);const sPct=Math.round(s.same/s.total*100);const wPct=100-bPct-sPct;
    return `<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:.78rem;margin-bottom:3px"><span>${esc(label)}</span><span style="color:var(--mu)">${s.total}회 (호전 ${bPct}%)</span></div>
      <div style="display:flex;height:18px;border-radius:4px;overflow:hidden;background:var(--bd)">
        ${bPct?`<div style="width:${bPct}%;background:#10b981"></div>`:''}${sPct?`<div style="width:${sPct}%;background:#f59e0b"></div>`:''}${wPct?`<div style="width:${wPct}%;background:#ef4444"></div>`:''}
      </div></div>`;
  };
  const rows=results.map(renderBar).join('');
  const naturalRow=naturalStats?renderBar(['💤 약/시술 없이 자연경과',naturalStats]):'';
  const allBetter=rated.filter(l=>normR(l.outcome.rating)==='better').length;
  const summaryPct=Math.round(allBetter/rated.length*100);
  return `<div class="card"><div class="card-title">📊 경과 통계 (직접 평가 ${rated.length}건)</div>
    <div style="text-align:center;margin-bottom:10px"><span style="font-size:1.2rem;font-weight:700;color:#10b981">${summaryPct}%</span><span style="font-size:.75rem;color:var(--mu)"> 호전율 (전체)</span></div>
    <div style="display:flex;gap:12px;justify-content:center;margin-bottom:10px;flex-wrap:wrap"><span style="font-size:.65rem;color:var(--mu)">🟢 호전</span><span style="font-size:.65rem;color:var(--mu)">🟡 비슷</span><span style="font-size:.65rem;color:var(--mu)">🔴 악화</span></div>
    ${rows}${naturalRow}</div>`;
}

// ── 통계 차트: 트리거별 평균 NRS ──
function renderTriggerNrsChart(logs) {
  const triggerLogs=logs.filter(l=>l.triggers?.length&&l.nrs>=0);
  if(triggerLogs.length<5) return '';
  const stats={};
  triggerLogs.forEach(l=>{(l.triggers||[]).forEach(t=>{
    if(!stats[t]) stats[t]={sum:0,count:0};stats[t].sum+=l.nrs;stats[t].count++;
  });});
  const results=Object.entries(stats).filter(([,s])=>s.count>=2).map(([t,s])=>({trigger:t,avg:s.sum/s.count,count:s.count})).sort((a,b)=>b.avg-a.avg).slice(0,8);
  if(!results.length) return '';
  const maxAvg=Math.max(...results.map(r=>r.avg),10);
  const bars=results.map(r=>{
    const pct=Math.round(r.avg/maxAvg*100);const color=r.avg>=7?'#ef4444':r.avg>=4?'#f59e0b':'#10b981';
    return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span style="min-width:80px;font-size:.72rem;text-align:right;color:var(--ink)">${esc(r.trigger)}</span>
      <div style="flex:1;height:18px;background:var(--bd);border-radius:4px;overflow:hidden"><div style="width:${pct}%;height:100%;background:${color};border-radius:4px"></div></div>
      <span style="min-width:50px;font-size:.68rem;color:var(--mu)">${r.avg.toFixed(1)} (${r.count}회)</span></div>`;
  }).join('');
  return `<div class="card"><div class="card-title">⚡ 트리거별 평균 ${_scoreLabel()}</div>${bars}<div style="font-size:.62rem;color:var(--mu2);text-align:center;margin-top:6px">최소 2회 이상 기록된 트리거만 표시.</div></div>`;
}

// ── 통계 차트: 기압-NRS 산점도 ──
function renderPressureChart(logs) {
  const wLogs=logs.filter(l=>l.weather?.pressure&&l.nrs>=0);
  if(wLogs.length<5) return '';
  const W=320,H=180,pad=40;
  const pressures=wLogs.map(l=>l.weather.pressure);
  const pMin=Math.min(...pressures)-5,pMax=Math.max(...pressures)+5;
  const dots=wLogs.map(l=>{
    const x=pad+(l.weather.pressure-pMin)/(pMax-pMin)*(W-pad*2);
    const y=H-pad-(l.nrs/10)*(H-pad*2);
    const color=l.nrs>=7?'#ef4444':l.nrs>=4?'#f59e0b':'#10b981';
    return `<circle cx="${x}" cy="${y}" r="4" fill="${color}" opacity=".7"/>`;
  }).join('');
  return `<div class="card"><div class="card-title">🌡️ 기압 vs ${_scoreLabel()} 상관</div>
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:400px;display:block;margin:0 auto">
      <line x1="${pad}" y1="${H-pad}" x2="${W-pad}" y2="${H-pad}" stroke="var(--bd)" stroke-width="1"/>
      <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${H-pad}" stroke="var(--bd)" stroke-width="1"/>
      <text x="${W/2}" y="${H-5}" text-anchor="middle" font-size="10" fill="var(--mu)">기압 (hPa)</text>
      <text x="12" y="${H/2}" text-anchor="middle" font-size="10" fill="var(--mu)" transform="rotate(-90,12,${H/2})">${_scoreLabel()}</text>
      <text x="${pad}" y="${H-pad+14}" text-anchor="middle" font-size="9" fill="var(--mu2)">${pMin}</text>
      <text x="${W-pad}" y="${H-pad+14}" text-anchor="middle" font-size="9" fill="var(--mu2)">${pMax}</text>
      ${dots}
    </svg>
    <div style="font-size:.62rem;color:var(--mu2);text-align:center;margin-top:6px">${wLogs.length}건 데이터. 날씨 기록이 쌓일수록 정확해집니다.</div></div>`;
}

// ═══════════════════════════════════════════════════════════════
function renderStatsView() {
  const ds=D(); const lc=DC().logConfig; const dc=DC();
  const logs=ds.logData||[];

  // 붕룩이 도메인: 임신준비 전용 통계
  if(S.currentDomain==='bungruki'){
    return _renderBungrukiStats();
  }

  if(!logs.length) return `<div class="hint">📈 통계를 보려면 먼저 기록을 쌓아주세요.<br><button class="btn-cancel" onclick="switchView('log')" style="margin-top:10px">📊 기록하러 가기</button></div>`;

  const now=new Date();
  const last30=logs.filter(l=>(now-new Date(l.datetime))<=30*86400000);
  const last7=logs.filter(l=>(now-new Date(l.datetime))<=7*86400000);

  // NRS/Mood trend (last 30 days)
  const byDate={};
  last30.forEach(l=>{
    const d=l.datetime.slice(0,10);
    if(!byDate[d]) byDate[d]={nrs:[],count:0,symptoms:{},meds:{},mood:{}};
    byDate[d].count++;
    if(lc.moodMode&&l.mood) { byDate[d].mood[l.mood]=(byDate[d].mood[l.mood]||0)+1; }
    else if(l.nrs>=0) byDate[d].nrs.push(l.nrs);
    (l.symptoms||[]).forEach(s=>{byDate[d].symptoms[s]=(byDate[d].symptoms[s]||0)+1;});
    (l.meds||[]).forEach(m=>{byDate[d].meds[m]=(byDate[d].meds[m]||0)+1;});
  });

  // 30-day chart
  const dates=[];
  for(let i=29;i>=0;i--){dates.push(kstDaysAgo(i));}
  const maxNrs=10;
  const barHtml=dates.map(d=>{
    const data=byDate[d];
    const avgNrs=data?.nrs?.length?data.nrs.reduce((a,b)=>a+b,0)/data.nrs.length:0;
    const h=Math.max(2,Math.round((avgNrs/maxNrs)*60));
    const isToday=d===kstToday();
    const dayName=['일','월','화','수','목','금','토'][new Date(d+'T12:00').getDay()];
    const color=avgNrs>0?nrsColor(avgNrs):'var(--bd)';
    const label=d.slice(8);
    return `<div style="display:flex;flex-direction:column;align-items:center;gap:1px;flex:1;min-width:0" title="${d}: ${avgNrs>0?_scoreLabel()+' '+avgNrs.toFixed(1):'기록없음'}${data?.count?' ('+data.count+'건)':''}">
      <div style="font-size:.5rem;color:var(--mu2)">${avgNrs>0?avgNrs.toFixed(1):''}</div>
      <div style="width:100%;max-width:14px;height:${h}px;background:${color};border-radius:2px"></div>
      <div style="font-size:.5rem;color:${isToday?'var(--ac)':'var(--mu2)'};font-weight:${isToday?'700':'400'}">${label}</div>
      <div style="font-size:.45rem;color:var(--mu2)">${dayName}</div>
    </div>`;
  }).join('');

  // Symptom frequency
  const symFreq={};
  last30.forEach(l=>(l.symptoms||[]).forEach(s=>{symFreq[s]=(symFreq[s]||0)+1;}));
  const topSyms=Object.entries(symFreq).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const maxSymF=topSyms[0]?.[1]||1;
  const symHtml=topSyms.map(([s,c])=>`
    <div style="display:flex;align-items:center;gap:8px;padding:3px 0">
      <span style="font-size:.78rem;min-width:90px;text-align:right">${esc(s)}</span>
      <div style="flex:1;height:8px;background:var(--bd);border-radius:4px;overflow:hidden">
        <div style="width:${Math.round(c/maxSymF*100)}%;height:100%;background:#8b5cf6;border-radius:4px"></div>
      </div>
      <span style="font-size:.68rem;font-family:var(--mono);color:var(--mu);min-width:24px">${c}</span>
    </div>`).join('');

  // Med frequency
  const medFreq={};
  last30.forEach(l=>(l.meds||[]).forEach(m=>{medFreq[m]=(medFreq[m]||0)+1;}));
  const topMeds=Object.entries(medFreq).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const maxMedF=topMeds[0]?.[1]||1;
  const medHtml=topMeds.map(([m,c])=>`
    <div style="display:flex;align-items:center;gap:8px;padding:3px 0">
      <span style="font-size:.78rem;min-width:90px;text-align:right">${esc(m)}</span>
      <div style="flex:1;height:8px;background:var(--bd);border-radius:4px;overflow:hidden">
        <div style="width:${Math.round(c/maxMedF*100)}%;height:100%;background:#f59e0b;border-radius:4px"></div>
      </div>
      <span style="font-size:.68rem;font-family:var(--mono);color:var(--mu);min-width:24px">${c}</span>
    </div>`).join('');

  // Summary stats
  const nrsAll=last30.flatMap(l=>lc.moodMode?[]:(l.nrs>=0?[l.nrs]:[]));
  const avgAll=nrsAll.length?(nrsAll.reduce((a,b)=>a+b,0)/nrsAll.length).toFixed(1):'-';
  const nrs7=last7.flatMap(l=>lc.moodMode?[]:(l.nrs>=0?[l.nrs]:[]));
  const avg7=nrs7.length?(nrs7.reduce((a,b)=>a+b,0)/nrs7.length).toFixed(1):'-';
  const medDays30=new Set(last30.filter(l=>(l.meds||[]).length>0).map(l=>l.datetime.slice(0,10))).size;

  return `
  <div class="card">
    <div class="card-title">📈 ${dc.icon} ${dc.label} — 30일 요약</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px">
      ${[['기록 수',last30.length+'건'],['7일 평균',lc.moodMode?'-':avg7],['30일 평균',lc.moodMode?'-':avgAll],['투약일',medDays30+'일']].map(([l,v])=>`
        <div style="background:var(--sf2);border:1.5px solid var(--bd);border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:.62rem;color:var(--mu);margin-bottom:3px">${l}</div>
          <div style="font-size:1rem;font-weight:700">${v}</div>
        </div>`).join('')}
    </div>
  </div>
  <div class="card">
    <div class="card-title">${lc.moodMode?'기분':_scoreLabel()} 추세 (30일)</div>
    <div style="display:flex;align-items:flex-end;gap:1px;padding:8px 0">${barHtml}</div>
  </div>
  ${topSyms.length?`<div class="card"><div class="card-title">증상 빈도 (30일)</div>${symHtml}</div>`:''}
  ${topMeds.length?`<div class="card"><div class="card-title">투약 빈도 (30일)</div>${medHtml}</div>`:''}
  ${lc.moodMode?renderMedComplianceStats(last30)+renderDailyCheckTrend(last30,lc):renderCalendarHeatmap(logs,lc)}
  ${renderMedComplianceCalendar(logs)}
  ${renderTrendChart(logs, 90)}
  ${renderCorrelationAnalysis(logs)}
  ${renderMedEffectAnalysis(logs)}
  ${renderMedSummaryReport(logs)}
  ${renderOutcomeStats(last30)}
  ${renderTriggerNrsChart(last30)}
  ${renderPressureChart(last30)}
  ${renderTreatmentTracker()}
  <div class="card">
    <div class="card-title">🤖 AI 인사이트</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn-export" onclick="_aiDailySummary()" style="flex:1">📅 오늘 AI 요약</button>
      <button class="btn-export" onclick="_aiMonthlyInsight()" style="flex:1;background:#fff;color:#7c3aed;border:2px solid #7c3aed;font-weight:600">📊 월간 패턴 분석</button>
    </div>
    <div id="ai-insight-result" style="margin-top:8px"></div>
  </div>
  <div style="text-align:center;margin-top:8px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
    <button class="btn-export" onclick="exportPDF()">📑 기본 리포트</button>
    <button class="btn-export" onclick="exportMonthlyPDF()" style="background:#fff;color:#1e40af;border:2px solid #1e40af;font-weight:700">📋 월간 리포트 (병원용)</button>
  </div>`;
}

// ═══════════════════════════════════════════════════════════════
// 💊 MED COMPLIANCE & DAILY CHECK STATS (moodMode)
// ═══════════════════════════════════════════════════════════════
function renderMedComplianceStats(logs) {
  const withMc=logs.filter(l=>l.medCheck&&Object.keys(l.medCheck).length);
  if(!withMc.length) return '';
  // Per-med compliance
  const medStats={};
  withMc.forEach(l=>{
    Object.entries(l.medCheck).forEach(([med,taken])=>{
      if(!medStats[med]) medStats[med]={taken:0,total:0};
      medStats[med].total++;
      if(taken) medStats[med].taken++;
    });
  });
  const rows=Object.entries(medStats).sort((a,b)=>b[1].total-a[1].total).map(([med,s])=>{
    const pct=Math.round(s.taken/s.total*100);
    const color=pct>=90?'#10b981':pct>=70?'#f59e0b':'#ef4444';
    return `<div style="display:flex;align-items:center;gap:8px;padding:4px 0">
      <span style="font-size:.78rem;min-width:120px;text-align:right">${esc(med)}</span>
      <div style="flex:1;height:10px;background:var(--bd);border-radius:5px;overflow:hidden">
        <div style="width:${pct}%;height:100%;background:${color};border-radius:5px"></div>
      </div>
      <span style="font-size:.72rem;font-weight:600;color:${color};min-width:40px">${pct}%</span>
      <span style="font-size:.6rem;color:var(--mu)">${s.taken}/${s.total}</span>
    </div>`;
  }).join('');
  return `<div class="card"><div class="card-title">💊 복용 순응률 (30일)</div>${rows}</div>`;
}

function renderDailyCheckTrend(logs, lc) {
  if(!lc.dailyChecks?.length) return '';
  const withDc=logs.filter(l=>l.dailyChecks&&Object.keys(l.dailyChecks).length);
  if(!withDc.length) return '';
  // Average per check item
  const itemStats={};
  lc.dailyChecks.forEach(item=>{itemStats[item]={sum:0,count:0};});
  withDc.forEach(l=>{
    Object.entries(l.dailyChecks).forEach(([k,v])=>{
      if(itemStats[k]){itemStats[k].sum+=v;itemStats[k].count++;}
    });
  });
  const rows=lc.dailyChecks.map(item=>{
    const s=itemStats[item];
    const avg=s.count?(s.sum/s.count).toFixed(1):'-';
    const pct=s.count?Math.round(s.sum/s.count/5*100):0;
    const color=avg>=4?'#10b981':avg>=3?'#3b82f6':avg>=2?'#f59e0b':'#ef4444';
    return `<div style="display:flex;align-items:center;gap:8px;padding:4px 0">
      <span style="font-size:.78rem;min-width:60px;text-align:right">${esc(item)}</span>
      <div style="flex:1;height:10px;background:var(--bd);border-radius:5px;overflow:hidden">
        <div style="width:${pct}%;height:100%;background:${color};border-radius:5px"></div>
      </div>
      <span style="font-size:.72rem;font-weight:600;color:${color};min-width:30px">${avg}</span>
      <span style="font-size:.6rem;color:var(--mu)">/5</span>
    </div>`;
  }).join('');
  return `<div class="card"><div class="card-title">📊 컨디션 평균 (30일)</div>${rows}
    <div style="font-size:.6rem;color:var(--mu2);margin-top:6px;text-align:center">${withDc.length}일 기록 기준</div></div>`;
}

// ═══════════════════════════════════════════════════════════════
// CROSS-DOMAIN LOG ANALYSIS (#6)
// ═══════════════════════════════════════════════════════════════
function renderCrossLogView() {
  const currentUser=DC().user;
  const allLogs=[]; // {date, domain, domainLabel, icon, nrs, mood, symptoms, meds, memo}

  Object.entries(S.domainState).forEach(([domainId, ds])=>{
    const domDef=DOMAINS[domainId];
    if(!domDef||domDef.user!==currentUser||!ds.logData?.length) return;
    ds.logData.forEach(l=>{
      allLogs.push({
        date:l.datetime.slice(0,10), time:l.datetime.slice(11,16),
        domain:domainId, label:domDef.label, icon:domDef.icon, color:domDef.color,
        nrs:l.nrs??-1, mood:l.mood||'',
        symptoms:l.symptoms||[], meds:l.meds||[],
        categories:l.categories||[], memo:l.memo||'',
      });
    });
  });

  if(!allLogs.length) return `<div class="hint">🔗 교차 분석을 위해 2개 이상의 도메인에서 기록을 쌓아주세요.</div>`;

  // Group by date
  const byDate={};
  allLogs.forEach(l=>{
    if(!byDate[l.date]) byDate[l.date]=[];
    byDate[l.date].push(l);
  });

  const sortedDates=Object.keys(byDate).sort().reverse().slice(0,30);

  const rows=sortedDates.map(date=>{
    const dayLogs=byDate[date];
    const dayName=['일','월','화','수','목','금','토'][new Date(date+'T12:00').getDay()];
    const domainGroups={};
    dayLogs.forEach(l=>{
      if(!domainGroups[l.domain]) domainGroups[l.domain]={icon:l.icon,label:l.label,color:l.color,items:[]};
      domainGroups[l.domain].items.push(l);
    });

    const groupHtml=Object.values(domainGroups).map(g=>{
      const items=g.items.map(l=>{
        const tags=[
          l.mood?`<span class="log-tag" style="background:#faf5ff;color:#7c3aed">${esc(l.mood)}</span>`:'',
          l.nrs>=0?`<span class="log-tag" style="background:${nrsColor(l.nrs)}20;color:${nrsColor(l.nrs)}">${_scoreLabel()}${l.nrs}</span>`:'',
          ...l.symptoms.map(s=>`<span class="log-tag" style="background:#faf5ff;color:#7c3aed">${esc(s)}</span>`),
          ...l.meds.map(m=>`<span class="log-tag" style="background:#fff7ed;color:#c2410c">${esc(m)}</span>`),
          ...l.categories.map(c=>`<span class="log-tag" style="background:#eff6ff;color:#1d4ed8">${esc(c)}</span>`),
        ].filter(Boolean).join('');
        return `<div style="display:flex;align-items:flex-start;gap:6px;padding:2px 0">
          ${l.time&&l.time!=='00:00'?`<span style="font-size:.65rem;font-family:var(--mono);color:var(--mu2);min-width:36px">${l.time}</span>`:''}
          <div>${tags}${l.memo?`<span style="font-size:.72rem;color:var(--mu);margin-left:4px">${esc(l.memo.substring(0,60))}</span>`:''}</div>
        </div>`;
      }).join('');
      return `<div style="margin-bottom:6px"><div style="font-size:.68rem;font-weight:600;color:${g.color};margin-bottom:2px">${g.icon} ${g.label} (${g.items.length})</div>${items}</div>`;
    }).join('');

    return `<div class="card" style="padding:12px 14px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <span style="font-family:var(--mono);font-size:.78rem;font-weight:600">${date}</span>
        <span style="font-size:.65rem;color:var(--mu2)">${dayName}</span>
        <span style="font-size:.65rem;color:var(--mu);margin-left:auto">${dayLogs.length}건</span>
      </div>
      ${groupHtml}
    </div>`;
  }).join('');

  // Correlation hint
  const domains=Object.keys(S.domainState).filter(id=>DOMAINS[id]?.user===currentUser&&S.domainState[id]?.logData?.length);
  return `
  <div class="card">
    <div class="card-title">🔗 ${currentUser} — 교차 도메인 타임라인</div>
    <p style="font-size:.78rem;color:var(--mu);margin-bottom:6px">
      여러 도메인의 기록을 날짜별로 합쳐서 보여줍니다.<br>
      예: 편두통 통증이 높았던 날 수면/기분/식사가 어땠는지 한눈에 비교할 수 있습니다.
    </p>
    <p style="font-size:.72rem;color:var(--mu2);margin-bottom:10px">
      ${domains.map(id=>`<span style="color:${DOMAINS[id].color};font-weight:600">${DOMAINS[id].icon} ${DOMAINS[id].label}</span>`).join(' · ')}
      ${domains.length<2?' — 2개 이상 도메인에서 기록하면 교차 비교가 가능합니다':' — 최근 30일'}
    </p>
  </div>
  ${rows}
  ${!sortedDates.length?'<div class="hint">기록이 없습니다.</div>':''}`;
}

// USAGE VIEW
function renderUsageView() {
  const todayStr=kstToday();
  const monthStr=kstMonth();
  const now=new Date();
  const krw=usd=>`$${usd.toFixed(4)} (≈${Math.round(usd*1450).toLocaleString()}원)`;
  const krwShort=usd=>usd>0?`$${usd.toFixed(4)}`:'—';

  // ── Collect from ALL domains ──
  const domainCosts = {};
  let totalToday=0, totalMonth=0, totalAll=0;
  const allUsageByDate = {}; // {date: {cost, byAI:{gpt:x,...}}}
  const processedDomains=new Set();

  // 1) 로드된 도메인
  Object.entries(S.domainState).forEach(([domainId, ds])=>{
    if(!ds.master?.usage_data) return;
    processedDomains.add(domainId);
    const dd = DOMAINS[domainId];
    let dToday=0, dMonth=0, dAll=0;
    Object.entries(ds.master.usage_data).forEach(([date,aiMap])=>{
      let dayCost=0;
      Object.entries(aiMap).forEach(([aiId,data])=>{
        const cost=recalcCost(data);
        dayCost+=cost;
        if(!allUsageByDate[date]) allUsageByDate[date]={cost:0,byAI:{}};
        allUsageByDate[date].cost+=cost;
        allUsageByDate[date].byAI[aiId]=(allUsageByDate[date].byAI[aiId]||0)+cost;
      });
      if(date===todayStr){dToday+=dayCost;totalToday+=dayCost;}
      if(date.startsWith(monthStr)){dMonth+=dayCost;totalMonth+=dayCost;}
      dAll+=dayCost; totalAll+=dayCost;
    });
    const dByAI={};
    Object.entries(ds.master.usage_data).forEach(([date,aiMap])=>{
      Object.entries(aiMap).forEach(([aiId,data])=>{
        if(!dByAI[aiId]) dByAI[aiId]={today:0,month:0,all:0};
        const cost=recalcCost(data);
        if(date===todayStr) dByAI[aiId].today+=cost;
        if(date.startsWith(monthStr)) dByAI[aiId].month+=cost;
        dByAI[aiId].all+=cost;
      });
    });
    if(dToday>0||dMonth>0||dAll>0) domainCosts[domainId]={label:`${dd.icon} ${dd.user}·${dd.label}`,today:dToday,month:dMonth,all:dAll,byAI:dByAI};
  });

  // 2) 미로드 도메인은 localStorage 캐시에서 읽기
  Object.entries(DOMAINS).forEach(([domainId,dd])=>{
    if(processedDomains.has(domainId)) return;
    try {
      const cached=localStorage.getItem('om_usage_'+domainId);
      if(!cached) return;
      const usageData=JSON.parse(cached);
      let dToday=0, dMonth=0, dAll=0;
      const dByAI={};
      Object.entries(usageData).forEach(([date,aiMap])=>{
        let dayCost=0;
        Object.entries(aiMap).forEach(([aiId,data])=>{
          const cost=recalcCost(data);
          dayCost+=cost;
          if(!allUsageByDate[date]) allUsageByDate[date]={cost:0,byAI:{}};
          allUsageByDate[date].cost+=cost;
          allUsageByDate[date].byAI[aiId]=(allUsageByDate[date].byAI[aiId]||0)+cost;
          if(!dByAI[aiId]) dByAI[aiId]={today:0,month:0,all:0};
          if(date===todayStr) dByAI[aiId].today+=cost;
          if(date.startsWith(monthStr)) dByAI[aiId].month+=cost;
          dByAI[aiId].all+=cost;
        });
        if(date===todayStr){dToday+=dayCost;totalToday+=dayCost;}
        if(date.startsWith(monthStr)){dMonth+=dayCost;totalMonth+=dayCost;}
        dAll+=dayCost; totalAll+=dayCost;
      });
      if(dToday>0||dMonth>0||dAll>0) domainCosts[domainId]={label:`${dd.icon} ${dd.user}·${dd.label}`,today:dToday,month:dMonth,all:dAll,byAI:dByAI};
    } catch(e){}
  });

  // ── 최근 14일 일별 차트 ──
  const last14=[];
  for(let i=13;i>=0;i--){
    const d=kstDaysAgo(i);
    const data=allUsageByDate[d]||{cost:0,byAI:{}};
    last14.push({date:d,cost:data.cost,byAI:data.byAI});
  }
  const maxDayCost=Math.max(...last14.map(d=>d.cost),0.001);

  const dailyBars=last14.map(({date,cost,byAI})=>{
    const h=Math.max(2,Math.round((cost/maxDayCost)*60));
    const label=date.slice(5);
    const isToday=date===todayStr;
    const dayName=['일','월','화','수','목','금','토'][new Date(date+'T12:00').getDay()];
    // Stacked bar by AI
    const totalC=cost||0.001;
    const segments=Object.entries(AI_DEFS).map(([id,def])=>{
      const pct=Math.round(((byAI[id]||0)/totalC)*100);
      return pct>0?`<div style="width:100%;height:${Math.max(1,Math.round(h*pct/100))}px;background:${def.color};border-radius:1px" title="${def.name}: $${(byAI[id]||0).toFixed(4)}"></div>`:'';
    }).join('');
    const aiDetail=cost>0?Object.entries(AI_DEFS).filter(([id])=>(byAI[id]||0)>0).map(([id,def])=>`<div style="font-size:.55rem;color:${def.color}">${def.name}: $${(byAI[id]||0).toFixed(4)}</div>`).join(''):'';
    const detailId='dcost-'+date.replace(/-/g,'');
    return `<div style="display:flex;flex-direction:column;align-items:center;gap:1px;flex:1;min-width:0;${cost>0?'cursor:pointer':''}" title="${date}: $${cost.toFixed(4)}" ${cost>0?`onclick="const d=document.getElementById('${detailId}');if(d)d.style.display=d.style.display==='none'?'block':'none'"`:''}>
      <div style="font-size:.55rem;color:var(--mu2)">${cost>0?'$'+cost.toFixed(4):''}</div>
      <div style="width:100%;max-width:20px;display:flex;flex-direction:column;justify-content:flex-end;height:60px">${cost>0?segments:`<div style="height:2px;background:var(--bd);border-radius:1px"></div>`}</div>
      <div style="font-size:.58rem;color:${isToday?'var(--ac)':'var(--mu2)'};font-weight:${isToday?'700':'400'}">${label}</div>
      <div style="font-size:.5rem;color:var(--mu2)">${dayName}</div>
      <div id="${detailId}" style="display:none">${aiDetail}</div>
    </div>`;
  }).join('');

  // ── 월별 집계 ──
  const monthlyData={};
  Object.entries(allUsageByDate).forEach(([date,data])=>{
    const ym=date.slice(0,7);
    if(!monthlyData[ym]) monthlyData[ym]={cost:0,days:new Set()};
    monthlyData[ym].cost+=data.cost;
    if(data.cost>0) monthlyData[ym].days.add(date);
  });
  const monthlyRows=Object.entries(monthlyData).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,6).map(([ym,data])=>`
    <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--bd);font-size:.82rem">
      <span style="min-width:70px;font-family:var(--mono);color:${ym===monthStr?'var(--ac)':'var(--mu)'};font-weight:${ym===monthStr?'600':'400'}">${ym}</span>
      <span style="min-width:40px;font-size:.72rem;color:var(--mu2)">${data.days.size}일</span>
      <span style="flex:1;text-align:right;font-family:var(--mono)">${krw(data.cost)}</span>
    </div>`).join('');

  // ── 도메인별 ──
  const domainRows=Object.entries(domainCosts).map(([id,d])=>{
    const aiDetail=Object.entries(AI_DEFS).map(([aiId,def])=>{
      const a=d.byAI?.[aiId];
      if(!a) return '';
      return `<div style="display:flex;align-items:center;gap:4px;padding:3px 0 3px 14px;font-size:.68rem">
        <div style="width:5px;height:5px;border-radius:50%;background:${def.color};flex-shrink:0"></div>
        <span style="flex:2;color:var(--mu)">${def.name}</span>
        <span style="font-family:var(--mono);color:var(--mu);flex:1;text-align:right">${krwShort(a.today)}</span>
        <span style="font-family:var(--mono);flex:1;text-align:right">${krwShort(a.month)}</span>
        <span style="font-family:var(--mono);flex:1;text-align:right">${krwShort(a.all)}</span>
      </div>`;
    }).filter(Boolean).join('');
    return `<div>
      <div style="display:flex;align-items:center;gap:4px;padding:6px 0;border-bottom:1px solid var(--bd);font-size:.78rem;cursor:pointer" onclick="const det=this.nextElementSibling;det.style.display=det.style.display==='none'?'block':'none';this.querySelector('.dc-arrow').textContent=det.style.display==='none'?'▸':'▾'">
        <span style="flex:2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><span class="dc-arrow" style="font-size:.6rem;color:var(--mu2);margin-right:2px">▸</span>${d.label}</span>
        <span style="font-family:var(--mono);color:var(--mu);flex:1;text-align:right;font-size:.72rem">${krwShort(d.today)}</span>
        <span style="font-family:var(--mono);flex:1;text-align:right;font-size:.72rem">${krwShort(d.month)}</span>
        <span style="font-family:var(--mono);flex:1;text-align:right;font-size:.72rem">${krwShort(d.all)}</span>
      </div>
      <div style="display:none;background:var(--sf2);border-radius:6px;margin:2px 0 4px;padding:4px 0">${aiDetail}</div>
    </div>`;
  }).join('');

  // ── 전체 도메인 통합 AI별 이번 달 ──
  const allByAI={};
  Object.values(S.domainState).forEach(ds=>{
    if(!ds.master?.usage_data) return;
    Object.entries(ds.master.usage_data).forEach(([date,aiMap])=>{
      if(!date.startsWith(monthStr)) return;
      Object.entries(aiMap).forEach(([aiId,data])=>{
        if(!allByAI[aiId]) allByAI[aiId]={cost:0,inT:0,outT:0};
        const cost=recalcCost(data);
        allByAI[aiId].cost+=cost;
        allByAI[aiId].inT+=(data.in||0);
        allByAI[aiId].outT+=(data.out||0);
      });
    });
  });
  const aiRows=Object.entries(AI_DEFS).map(([id,def])=>{
    const d=allByAI[id];
    return d?`<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--bd)">
      <div style="width:8px;height:8px;border-radius:50%;background:${def.color}"></div>
      <span style="font-size:.78rem;min-width:70px">${def.name}</span>
      <span style="font-size:.7rem;font-family:var(--mono);color:var(--mu)">${Math.round(d.inT/1000)}K in / ${Math.round(d.outT/1000)}K out</span>
      <span style="font-size:.78rem;font-family:var(--mono);margin-left:auto">${krw(d.cost)}</span>
    </div>`:'';
  }).filter(Boolean).join('');

  // 가격 업데이트 알림
  const priceAlerts=DM()?._priceAlerts||[];
  const alertHtml=priceAlerts.length?`<div class="card" style="background:linear-gradient(135deg,#eff6ff,#f0fdf4);border:1.5px solid #3b82f630">
    <div style="font-size:.78rem;font-weight:600;margin-bottom:6px">📢 가격/모델 업데이트</div>
    ${priceAlerts.map(a=>`<div style="font-size:.72rem;color:var(--mu);padding:2px 0">• ${a}</div>`).join('')}
    <div style="font-size:.6rem;color:var(--mu2);margin-top:4px">마지막 확인: ${DM()?.price_updated?.slice(0,10)||'—'}</div>
  </div>`:'';
  const lastCheck=DM()?.price_updated?`<div style="font-size:.6rem;color:var(--mu2);text-align:right;margin-top:-8px;margin-bottom:8px">가격 마지막 확인: ${DM().price_updated.slice(0,10)}</div>`:'';

  return `
  ${alertHtml}
  <div class="card">
    <div class="card-title">💰 비용 요약</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">
      ${[['오늘',totalToday],['이번 달',totalMonth],['전체 누적',totalAll]].map(([l,c])=>`<div style="background:var(--sf2);border:1.5px solid var(--bd);border-radius:8px;padding:12px;text-align:center">
        <div style="font-size:.68rem;color:var(--mu);margin-bottom:4px">${l}</div>
        <div style="font-size:1rem;font-weight:700">$${c.toFixed(4)}</div>
        <div style="font-size:.68rem;color:var(--mu)">≈${Math.round(c*1450).toLocaleString()}원</div>
      </div>`).join('')}
    </div>
  </div>

  <div class="card">
    <div class="card-title">📊 최근 14일 일별 비용</div>
    <div style="display:flex;align-items:flex-end;gap:2px;padding:8px 0">
      ${dailyBars}
    </div>
    <div style="display:flex;gap:12px;justify-content:center;margin-top:6px;flex-wrap:wrap">
      ${Object.entries(AI_DEFS).map(([id,def])=>`<div style="display:flex;align-items:center;gap:4px;font-size:.62rem;color:var(--mu)">
        <div style="width:8px;height:8px;border-radius:2px;background:${def.color}"></div>${def.name}
      </div>`).join('')}
    </div>
  </div>

  ${monthlyRows?`<div class="card">
    <div class="card-title">📅 월별 비용</div>
    ${monthlyRows}
  </div>`:''}

  ${Object.keys(domainCosts).length>1?`<div class="card">
    <div class="card-title">🔗 시스템별 비용</div>
    <div style="display:flex;align-items:center;gap:4px;padding:4px 0;font-size:.58rem;color:var(--mu2)">
      <span style="flex:2">시스템</span><span style="flex:1;text-align:right">오늘</span><span style="flex:1;text-align:right">이번달</span><span style="flex:1;text-align:right">누적</span>
    </div>
    ${domainRows}
  </div>`:''}

  <div class="card">
    <div class="card-title">🤖 AI별 이번 달 (전체 통합)</div>
    ${aiRows||'<div class="hint" style="padding:8px">이번 달 사용 내역 없음</div>'}
  </div>`;
}





// ═══════════════════════════════════════════════════════════════
// PDF REPORT EXPORT
// ═══════════════════════════════════════════════════════════════
function exportPDF() {
  const dc=DC(); const ds=D(); const m=DM();
  if(!m){showToast('데이터 없음');return;}
  const logs=ds.logData||[];
  const sessions=m.sessions||[];
  const conditions=m.conditions||[];
  const lc=dc.logConfig;

  // Build report HTML
  let html=`<html><head><meta charset="utf-8"><title>${dc.user} ${dc.label} 리포트</title>
  <style>body{font-family:'맑은 고딕',sans-serif;font-size:11px;padding:20px;color:#333}
  h1{font-size:18px;border-bottom:2px solid #2c5f8a;padding-bottom:6px;color:#2c5f8a}
  h2{font-size:14px;color:#555;margin-top:16px}h3{font-size:12px;color:#777}
  table{width:100%;border-collapse:collapse;margin:8px 0}th,td{border:1px solid #ddd;padding:4px 8px;text-align:left;font-size:10px}
  th{background:#f5f5f5}.tag{display:inline-block;padding:1px 6px;border-radius:3px;font-size:9px;margin:1px}
  .nrs{font-weight:bold}.footer{margin-top:20px;font-size:9px;color:#999;text-align:center}</style></head><body>`;

  html+=`<h1>${dc.icon} ${dc.user} · ${dc.label} — 의료 리포트</h1>`;
  html+=`<p>생성일: ${kstToday()} | 기간: 최근 30일</p>`;

  // Conditions
  if(conditions.length) {
    html+=`<h2>등록 질환</h2><table><tr><th>질환</th><th>상태</th><th>투약</th></tr>`;
    conditions.forEach(c=>{
      const statusL={active:'치료 중',remission:'관해',resolved:'완치','self-stopped':'자의 중단'};
      html+=`<tr><td>${esc(c.name)}</td><td>${statusL[c.status]||c.status}</td><td>${(c.medsList||[]).map(m=>esc(m)).join(', ')||c.medications||'-'}</td></tr>`;
    });
    html+=`</table>`;
  }

  // Log summary
  const last30=logs.filter(l=>(Date.now()-new Date(l.datetime))<=30*86400000);
  if(last30.length) {
    html+=`<h2>증상 기록 (${last30.length}건)</h2><table><tr><th>날짜</th><th>시간</th>`;
    html+=lc.moodMode?'<th>기분</th>':'<th>${_scoreLabel()}</th>';
    html+=`<th>증상</th><th>투약</th><th>메모</th></tr>`;
    last30.forEach(l=>{
      html+=`<tr><td>${l.datetime.slice(0,10)}</td><td>${l.datetime.slice(11,16)}</td>`;
      html+=lc.moodMode?`<td>${l.mood||'-'}</td>`:`<td>${l.nrs>=0?l.nrs:'-'}</td>`;
      html+=`<td>${(l.symptoms||[]).map(s=>esc(s)).join(', ')||'-'}</td><td>${(l.meds||[]).map(m=>esc(m)).join(', ')||'-'}</td><td>${esc(l.memo||'-')}</td></tr>`;
    });
    html+=`</table>`;
  }

  // Recent sessions
  const recentSess=sessions.slice(0,5);
  if(recentSess.length) {
    html+=`<h2>최근 세션 요약</h2>`;
    recentSess.forEach(s=>{
      html+=`<h3>${s.date} — ${(s.question||'').substring(0,80)}</h3>`;
      if(s.summary) html+=`<p>${s.summary.session_summary||''}</p><p><strong>권고:</strong> ${s.summary.final_recommendation||''}</p>`;
    });
  }

  html+=`<div class="footer">※ 이 리포트는 AI 협진 시스템에서 자동 생성되었습니다. 의료적 결정은 반드시 전문의와 상담하세요.<br>Orangi Health AI v8.3 | ${kstToday()}</div>`;
  html+=`</body></html>`;

  const w=window.open('','_blank');
  if(!w){showToast('⚠️ 팝업이 차단되었습니다. 팝업을 허용해 주세요.',4000);return;}
  w.document.write(html);
  w.document.close();
  setTimeout(()=>{w.print();},500);
}

// ═══════════════════════════════════════════════════════════════
// NRS CALENDAR HEATMAP (stats view enhancement)
// ═══════════════════════════════════════════════════════════════
function renderCalendarHeatmap(logs,lc) {
  if(!logs.length) return '';
  const byDate={};
  logs.forEach(l=>{
    const d=l.datetime.slice(0,10);
    if(!byDate[d]) byDate[d]={nrs:[],count:0};
    byDate[d].count++;
    if(l.nrs>=0) byDate[d].nrs.push(l.nrs);
  });

  // Last 90 days
  const cells=[];
  for(let i=89;i>=0;i--){
    const d=kstDaysAgo(i);
    const data=byDate[d];
    let color='var(--bd)';let title=d+': 기록없음';
    if(data?.nrs?.length) {
      const avg=data.nrs.reduce((a,b)=>a+b,0)/data.nrs.length;
      color=avg<=2?'#2d8a5a':avg<=4?'#4ade80':avg<=6?'#fbbf24':avg<=8?'#f97316':'#ef4444';
      title=`${d}: ${_scoreLabel()} ${avg.toFixed(1)} (${data.count}건)`;
    } else if(data?.count) {
      color='#93c5fd'; title=`${d}: ${data.count}건 (${_scoreLabel()} 미기록)`;
    }
    cells.push(`<div style="width:10px;height:10px;border-radius:2px;background:${color}" title="${title}"></div>`);
  }

  return `<div class="card">
    <div class="card-title">📅 90일 캘린더 히트맵</div>
    <div style="display:flex;flex-wrap:wrap;gap:2px;padding:4px">${cells.join('')}</div>
    <div style="display:flex;gap:8px;justify-content:center;margin-top:6px;font-size:.6rem;color:var(--mu)">
      <span>⬜ 없음</span><span style="color:#2d8a5a">🟩 0-2</span><span style="color:#4ade80">🟢 3-4</span>
      <span style="color:#fbbf24">🟡 5-6</span><span style="color:#f97316">🟠 7-8</span><span style="color:#ef4444">🔴 9-10</span>
    </div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════════
// 💊 MED COMPLIANCE CALENDAR (30일 약물 복용 캘린더 — 데일리체크 동일 수준)
// ═══════════════════════════════════════════════════════════════
function renderMedComplianceCalendar(logs) {
  const condMeds=typeof getConditionMeds==='function'?getConditionMeds():[];
  // trackCompliance 필터 (객체 배열 [{med,until}] 또는 문자열 배열 하위호환)
  const _isTrackActive=(t,date)=>{
    if(typeof t==='string')return true; // 하위호환
    if(!t.until||t.until==='change')return true; // 약 변경시까지 = 항상 활성
    return date?date<=t.until:true; // 날짜 비교
  };
  const expectedMeds=condMeds.flatMap(g=>{
    const track=g.trackCompliance;
    if(track?.length) return g.meds.filter(m=>{
      const t=track.find(x=>(typeof x==='string'?x:x.med)===m);
      return t&&_isTrackActive(t,kstToday());
    });
    return g.meds.filter(m=>!m.includes('(PRN)')&&!m.includes('PRN'));
  });
  const withMc=logs.filter(l=>l.medCheck&&Object.keys(l.medCheck).length);
  const withMeds=logs.filter(l=>(l.meds||[]).length>0);
  if(!withMc.length&&!withMeds.length&&!expectedMeds.length) return '';

  const byDate={};
  logs.forEach(l=>{
    const d=l.datetime?.slice(0,10);if(!d)return;
    if(!byDate[d]) byDate[d]={total:0,taken:0,meds:{},hasRecord:false,entries:[]};
    byDate[d].entries.push(l);
    if(l.medCheck&&Object.keys(l.medCheck).length){
      byDate[d].hasRecord=true;
      Object.entries(l.medCheck).forEach(([med,taken])=>{
        if(!byDate[d].meds[med]){byDate[d].total++;if(taken)byDate[d].taken++;byDate[d].meds[med]=taken;}
      });
    }
    if(!l.medCheck&&(l.meds||[]).length){
      byDate[d].hasRecord=true;
      l.meds.forEach(m=>{if(!byDate[d].meds[m]){byDate[d].total++;byDate[d].taken++;byDate[d].meds[m]=true;}});
    }
  });
  window._mcCalData=byDate;

  const today=kstToday();
  const cells=[];
  for(let i=29;i>=0;i--){
    const date=kstDaysAgo(i);const data=byDate[date];
    const d=new Date(date+'T00:00:00');const dayNum=d.getDate();
    let dotColor='var(--bd)';
    if(data?.hasRecord){
      const rate=data.total>0?Math.round(data.taken/data.total*100):100;
      dotColor=rate>=90?'#10b981':rate>=50?'#f59e0b':'#ef4444';
    }
    const isT=date===today;
    cells.push(`<div style="text-align:center;padding:4px 2px;border-radius:4px;font-size:.65rem;cursor:pointer${isT?';border:1px solid var(--ac)':''}" onclick="_showMcDetail('${date}')">
      <div>${dayNum}</div>
      <div style="width:7px;height:7px;border-radius:50%;background:${dotColor};margin:2px auto 0"></div>
    </div>`);
  }

  const recorded=Object.values(byDate).filter(d=>d.hasRecord);
  const overall=recorded.length?Math.round(recorded.reduce((s,d)=>s+(d.total>0?d.taken/d.total*100:0),0)/recorded.length):0;
  const oc=recorded.length?(overall>=90?'#10b981':overall>=70?'#f59e0b':'#ef4444'):'var(--mu2)';
  const unmapped=logs.filter(l=>!l.medCheck&&(l.meds||[]).length).length;

  return `<div class="card">
    <div class="card-title">💊 약물 복용 캘린더 (30일)</div>
    <div style="text-align:center;margin-bottom:8px">
      ${recorded.length?`<span style="font-size:1.5rem;font-weight:700;color:${oc}">${overall}%</span><span style="font-size:.7rem;color:var(--mu)"> 순응도 (${recorded.length}일 기록)</span>`
        :`<span style="font-size:.8rem;color:var(--mu2)">등록 약물 ${expectedMeds.length}개 · 기록을 시작하세요</span>`}
    </div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px">${cells.join('')}</div>
    <div style="display:flex;gap:8px;justify-content:center;margin-top:6px;font-size:.6rem;color:var(--mu)">
      <span>🟢 90%+</span><span>🟡 50-89%</span><span>🔴 &lt;50%</span><span>⬜ 미기록</span>
    </div>
    ${unmapped?`<div style="margin-top:8px;text-align:center"><button onclick="_syncMedsToMedCheck()" style="font-size:.68rem;padding:5px 14px;border:1.5px solid var(--ac);border-radius:6px;background:none;color:var(--ac);cursor:pointer;font-family:var(--font)">🔄 기존 투약 기록 ${unmapped}건 → 캘린더 반영</button></div>`:''}
    <div style="margin-top:4px;text-align:center"><button onclick="_normalizeMedCheckKeys()" style="font-size:.62rem;padding:3px 10px;border:1px solid var(--bd);border-radius:6px;background:none;color:var(--mu);cursor:pointer;font-family:var(--font)">🔧 medCheck 키 정규화</button></div>
    <div id="mc-cal-detail"></div>
  </div>`;
}

function _showMcDetail(date){
  const el=document.getElementById('mc-cal-detail');if(!el)return;
  const data=window._mcCalData?.[date];
  let html=`<div style="border-top:1px solid var(--bd);margin-top:8px;padding-top:8px"><div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
    <span style="font-size:.78rem;font-weight:600">${date}</span>`;
  if(data?.hasRecord){
    const rate=data.total>0?Math.round(data.taken/data.total*100):0;
    html+=`<span style="font-size:.68rem;font-weight:600;color:${rate>=90?'#10b981':rate>=50?'#f59e0b':'#ef4444'}">${rate}%</span>`;
  }else{html+=`<span style="font-size:.68rem;color:var(--mu2)">기록 없음</span>`;}
  html+=`</div>`;
  if(data?.meds&&Object.keys(data.meds).length){
    html+=Object.entries(data.meds).map(([m,t])=>`<div style="font-size:.72rem;padding:1px 0 1px 8px">${t?'✅':'❌'} ${esc(m)}</div>`).join('');
  }
  if(data?.entries?.length){
    data.entries.forEach(e=>{
      const parts=[];
      if(e.nrs>=0)parts.push('컨디션:'+e.nrs);
      if(e.mood)parts.push(e.mood);
      if(e.symptoms?.length)parts.push('증상:'+e.symptoms.join(','));
      if(e.memo)parts.push(esc(e.memo.slice(0,40)));
      if(parts.length)html+=`<div style="font-size:.65rem;color:var(--mu);padding:2px 0 2px 8px;border-top:1px dotted var(--bd);margin-top:3px">${e.datetime?.slice(11,16)||''} ${parts.join(' · ')}</div>`;
    });
  }
  html+=`</div>`;el.innerHTML=html;
}

async function _syncMedsToMedCheck(){
  if(!confirm('투약(meds) 기록 → medCheck 자동 변환합니다.\n조건 약물 중 투약에 없는 것은 미복용으로 표시됩니다.'))return;
  const ds=D();if(!ds.logData)return;
  let count=0;
  ds.logData.forEach(l=>{
    if(l.medCheck||!(l.meds||[]).length)return;
    const mc={};
    l.meds.forEach(m=>{mc[m]=true;});
    if(typeof getConditionMeds==='function'){
      const cm=getConditionMeds(l.datetime?.slice(0,10));
      cm.forEach(g=>g.meds.forEach(m=>{if(!(m in mc)&&!m.includes('(PRN)')&&!m.includes('PRN'))mc[m]=false;}));
    }
    if(Object.keys(mc).length){l.medCheck=mc;count++;}
  });
  if(!count){showToast('변환할 기록이 없습니다.');return;}
  try{await saveLogData();showToast('✅ '+count+'건 캘린더 반영');renderView(S.currentView);}
  catch(e){showToast('❌ 저장 실패: '+e.message,4000);}
}


// medCheck 키 정규화 — 약물 변경이력에 따라 키를 현재 기준으로 매핑
async function _normalizeMedCheckKeys(){
  if(!confirm('medCheck 키를 약물 변경이력 기준으로 정규화합니다.\n불일치 키가 현재 약물명으로 매핑됩니다.'))return;
  const ds=D();if(!ds.logData?.length)return showToast('기록 없음');
  const conditions=(ds.master?.conditions||[]).filter(c=>c.status==='active'||c.status==='remission');
  if(!conditions.length)return showToast('활성 질환 없음');
  let count=0;
  ds.logData.forEach(l=>{
    if(!l.medCheck||!Object.keys(l.medCheck).length)return;
    const date=l.datetime?.slice(0,10)||ds.logMonth+'-01';
    const expectedMeds=new Set();
    conditions.forEach(c=>(typeof getMedsAtDate==='function'?getMedsAtDate(c,date):c.medsList||[]).forEach(m=>expectedMeds.add(m)));
    const oldKeys=Object.keys(l.medCheck);
    const orphans=oldKeys.filter(k=>!expectedMeds.has(k));
    if(!orphans.length)return;
    const newMc={...l.medCheck};let changed=false;
    orphans.forEach(k=>{
      // 유사도 매칭: 공백/대소문자 무시, 부분 포함
      const norm=k.replace(/\s+/g,'').toLowerCase();
      const match=[...expectedMeds].find(m=>{
        const mn=m.replace(/\s+/g,'').toLowerCase();
        return mn===norm||mn.includes(norm)||norm.includes(mn);
      });
      if(match&&!(match in newMc)){newMc[match]=newMc[k];delete newMc[k];changed=true;}
    });
    if(changed){l.medCheck=newMc;count++;}
  });
  if(!count)return showToast('정규화 대상 없음');
  try{await saveLogData();showToast('✅ '+count+'건 medCheck 키 정규화 완료');renderView(S.currentView);}
  catch(e){showToast('❌ 저장 실패: '+e.message,4000);}
}

// ═══════════════════════════════════════════════════════════════
// AI DAILY SUMMARY & MONTHLY INSIGHT
// ═══════════════════════════════════════════════════════════════
async function _aiDailySummary(){
  const el=document.getElementById('ai-insight-result');if(!el)return;
  const ds=D();const logs=ds.logData||[];
  const today=kstToday();
  const todayLogs=logs.filter(l=>l.datetime?.slice(0,10)===today);
  if(!todayLogs.length){el.innerHTML='<div style="font-size:.72rem;color:var(--mu)">오늘 기록이 없습니다.</div>';return;}
  el.innerHTML='<div style="font-size:.72rem;color:var(--ac)">🔄 AI 요약 생성 중...</div>';
  const dc=DC();
  const data=todayLogs.map(l=>{
    const parts=[l.datetime?.slice(11,16)];
    if(l.nrs>=0)parts.push(_scoreLabel()+':'+l.nrs);
    if(l.mood)parts.push('기분:'+l.mood);
    if(l.symptoms?.length)parts.push('증상:'+l.symptoms.join(','));
    if(l.meds?.length)parts.push('약물:'+l.meds.join(','));
    if(l.treatments?.length)parts.push('처치:'+l.treatments.join(','));
    if(l.medCheck)parts.push('복용:'+Object.entries(l.medCheck).map(([k,v])=>k+'='+(v?'O':'X')).join(','));
    if(l.memo)parts.push('메모:'+l.memo.slice(0,100));
    if(l.outcome?.rating)parts.push('경과:'+l.outcome.rating);
    return parts.join(' | ');
  }).join('\n');
  const system=`당신은 ${dc.icon} ${dc.label} 건강 기록 요약 도우미입니다. 오늘 하루 기록을 환자 관점에서 간결하게 요약하세요. 2-3문장. 위험 신호가 있으면 알려주세요. 한국어로 답변.`;
  try{
    const aiId=S.keys.claude?'claude':S.keys.gpt?'gpt':S.keys.gemini?'gemini':null;
    if(!aiId){el.innerHTML='<div style="color:var(--re)">AI API 키를 설정하세요.</div>';return;}
    const result=await callAI(aiId,system,'오늘('+today+') 기록:\n'+data);
    el.innerHTML='<div style="font-size:.75rem;padding:10px;background:var(--sf2);border-radius:8px;border:1px solid var(--bd);line-height:1.5">'+renderMD(result)+'</div>';
  }catch(e){el.innerHTML='<div style="color:var(--re);font-size:.72rem">AI 오류: '+esc(e.message)+'</div>';}
}
async function _aiMonthlyInsight(){
  const el=document.getElementById('ai-insight-result');if(!el)return;
  const ds=D();const logs=ds.logData||[];const lc=DC().logConfig;const dc=DC();
  if(logs.length<3){el.innerHTML='<div style="font-size:.72rem;color:var(--mu)">분석하려면 최소 3건 이상의 기록이 필요합니다.</div>';return;}
  el.innerHTML='<div style="font-size:.72rem;color:var(--ac)">🔄 월간 패턴 분석 중...</div>';
  // 데이터 요약 구성
  const byDate={};
  logs.forEach(l=>{
    const d=l.datetime?.slice(0,10);if(!d)return;
    if(!byDate[d])byDate[d]={nrs:[],symptoms:[],meds:[],treatments:[],outcomes:[]};
    if(l.nrs>=0)byDate[d].nrs.push(l.nrs);
    (l.symptoms||[]).forEach(s=>byDate[d].symptoms.push(s));
    (l.meds||[]).forEach(m=>byDate[d].meds.push(m));
    if(l.outcome?.rating)byDate[d].outcomes.push(l.outcome.rating);
  });
  const summary=Object.entries(byDate).sort(([a],[b])=>a.localeCompare(b)).map(([d,v])=>{
    const parts=[d];
    if(v.nrs.length)parts.push(_scoreLabel()+':'+Math.round(v.nrs.reduce((a,b)=>a+b,0)/v.nrs.length*10)/10);
    if(v.symptoms.length)parts.push('증상:'+[...new Set(v.symptoms)].join(','));
    if(v.meds.length)parts.push('약물:'+[...new Set(v.meds)].join(','));
    if(v.outcomes.length)parts.push('경과:'+v.outcomes.join(','));
    return parts.join(' | ');
  }).join('\n');
  const system=`당신은 ${dc.icon} ${dc.label} 건강 데이터 분석가입니다.
월간 기록을 분석하여 다음을 한국어로 답변하세요:
1. **주요 패턴**: 반복되는 증상/시간대/요일 패턴
2. **약물 효과**: 약물-증상 상관관계
3. **주의점**: 악화 경향이나 우려 사항
4. **제안**: 데이터 기반 관리 제안
과도한 해석을 피하고 데이터에 근거한 관찰만 기술하세요. 간결하게.`;
  try{
    const aiId=S.keys.claude?'claude':S.keys.gpt?'gpt':S.keys.gemini?'gemini':null;
    if(!aiId){el.innerHTML='<div style="color:var(--re)">AI API 키를 설정하세요.</div>';return;}
    const result=await callAI(aiId,system,ds.logMonth+' 월간 기록 ('+logs.length+'건):\n'+summary);
    el.innerHTML='<div style="font-size:.75rem;padding:10px;background:var(--sf2);border-radius:8px;border:1px solid var(--bd);line-height:1.5">'+renderMD(result)+'</div>';
  }catch(e){el.innerHTML='<div style="color:var(--re);font-size:.72rem">AI 오류: '+esc(e.message)+'</div>';}
}

// ═══════════════════════════════════════════════════════════════
// TREATMENT CYCLE TRACKING
// ═══════════════════════════════════════════════════════════════
function getTreatmentHistory() {
  const ds=D();
  if(!ds.logData?.length) return [];
  const txMap={};
  ds.logData.forEach(l=>{
    (l.treatments||[]).forEach(tx=>{
      if(!txMap[tx]) txMap[tx]={name:tx,dates:[],count:0};
      txMap[tx].dates.push(l.datetime.slice(0,10));
      txMap[tx].count++;
    });
  });
  return Object.values(txMap).filter(t=>t.count>=2).sort((a,b)=>b.count-a.count);
}

function renderTreatmentTracker() {
  const txHistory=getTreatmentHistory();
  if(!txHistory.length) return '';

  const rows=txHistory.map(tx=>{
    const sortedDates=tx.dates.sort();
    const lastDate=sortedDates[sortedDates.length-1];
    const daysSinceLast=Math.round((new Date(kstToday()+'T00:00:00')-new Date(lastDate+'T00:00:00'))/86400000);
    // Calculate average interval
    let avgInterval=0;
    if(sortedDates.length>=2) {
      const intervals=[];
      for(let i=1;i<sortedDates.length;i++){
        intervals.push(Math.round((new Date(sortedDates[i])-new Date(sortedDates[i-1]))/86400000));
      }
      avgInterval=Math.round(intervals.reduce((a,b)=>a+b,0)/intervals.length);
    }
    const nextEstimate=avgInterval>0?avgInterval-daysSinceLast:0;
    const isOverdue=nextEstimate<0;

    return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--bd)">
      <div style="flex:1">
        <div style="font-size:.82rem;font-weight:600">${esc(tx.name)}</div>
        <div style="font-size:.68rem;color:var(--mu)">총 ${tx.count}회 | 마지막: ${lastDate} (${daysSinceLast}일 전)</div>
      </div>
      ${avgInterval>0?`<div style="text-align:right">
        <div style="font-size:.72rem;color:var(--mu)">평균 주기: ${avgInterval}일</div>
        <div style="font-size:.75rem;font-weight:600;color:${isOverdue?'var(--re)':'var(--gr)'}">
          ${isOverdue?`⚠️ ${-nextEstimate}일 초과`:`다음 예상: ${nextEstimate}일 후`}
        </div>
      </div>`:''}</div>`;
  }).join('');

  return `<div class="card">
    <div class="card-title">🔄 반복 시술 추적</div>
    ${rows}
  </div>`;
}

// ═══════════════════════════════════════════════════════════════
// DAILY LOG REMINDER (check on load)
// ═══════════════════════════════════════════════════════════════
function checkDailyReminder() {
  const ds=D(); if(!ds.logData?.length) return;
  const today=kstToday();
  const hasToday=ds.logData.some(l=>l.datetime.slice(0,10)===today);
  if(!hasToday) {
    const lastLog=ds.logData[ds.logData.length-1];
    const lastDate=lastLog?.datetime?.slice(0,10)||'';
    const daysSince=lastDate?Math.round((new Date(today+'T00:00:00')-new Date(lastDate+'T00:00:00'))/86400000):0;
    if(daysSince>=1) {
      setTimeout(()=>showToast(`📝 오늘 아직 기록이 없어요 (마지막: ${daysSince}일 전)`,4000),2000);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// TIME-SERIES INSIGHT (주 1회 자동 패턴 감지)
// ═══════════════════════════════════════════════════════════════
async function checkWeeklyInsight() {
  const m=DM(); if(!m||!S.keys?.claude) return;
  const lastCheck=m.lastInsightDate||'';
  const daysSince=lastCheck?Math.round((new Date(kstToday()+'T00:00:00')-new Date(lastCheck+'T00:00:00'))/86400000):8;
  if(daysSince<7) return;

  const logSummary=getRecentLogSummary();
  if(!logSummary) return;

  try {
    const result=await callAI('claude',
      '당신은 의료 데이터 패턴 분석 전문가입니다. 3줄 이내로 핵심만.',
      `최근 14일 기록:\n${logSummary}\n\n특이 패턴, 추세 변화, 주의 사항이 있으면 3줄 이내로 알려주세요. 없으면 "특이사항 없음"만.`
    );
    m.lastInsight=result;
    m.lastInsightDate=kstToday();
    await saveMaster();
  } catch(e) {}
}

function renderInsightCard() {
  const m=DM();
  if(!m?.lastInsight||m.lastInsight.includes('특이사항 없음')) return '';
  return `<div class="card" style="border-color:var(--r3);background:#fffbeb">
    <div class="card-title">💡 주간 인사이트 <span class="badge badge-orange">${m.lastInsightDate||''}</span>
      <button class="accum-del" onclick="DM().lastInsight=null;renderView('home')" style="margin-left:auto">✕</button>
    </div>
    <div style="font-size:.84rem;line-height:1.7">${esc(m.lastInsight)}</div>
    <div style="margin-top:8px"><button class="btn-accum-add" onclick="startNewSession(DM().lastInsight)" style="font-size:.72rem">💬 이 주제로 세션 시작</button></div>
  </div>`;
}



// ═══════════════════════════════════════════════════════════════
// #1 AI 응답 복사 버튼
// ═══════════════════════════════════════════════════════════════
function copyCardText(btn) {
  const card=btn.closest('.final-card');
  if(!card) return;
  const content=card.querySelector('.fcontent');
  if(!content) return;
  const text=content.innerText||content.textContent;
  navigator.clipboard.writeText(text).then(()=>{
    btn.textContent='✅ 복사됨';
    setTimeout(()=>{btn.textContent='📋 복사';},1500);
  }).catch(()=>showToast('❌ 복사 실패'));
}

function copyAIResponse(aiId) {
  const ta=document.getElementById('ans-'+aiId);
  if(!ta||!ta.value) { showToast('복사할 내용이 없습니다.'); return; }
  navigator.clipboard.writeText(ta.value).then(()=>{
    showToast('📋 '+AI_DEFS[aiId].name+' 응답 복사됨');
  }).catch(()=>showToast('❌ 복사 실패'));
}

// ═══════════════════════════════════════════════════════════════
// #7 세션 Undo
// ═══════════════════════════════════════════════════════════════
let _sessionHistory=[];

function saveSessionSnapshot() {
  if(!S.session) return;
  try {
    _sessionHistory.push(JSON.parse(JSON.stringify(S.session)));
    if(_sessionHistory.length>10) _sessionHistory.shift();
  } catch(e){}
}

function undoSession() {
  if(!_sessionHistory.length) { showToast('되돌릴 기록이 없습니다.'); return; }
  S.session=_sessionHistory.pop();
  S._dirty=true;
  renderView('session');
  showToast('↩ 이전 상태로 복원됨');
}

// ═══════════════════════════════════════════════════════════════
// #8 AI 응답 평가
// ═══════════════════════════════════════════════════════════════
function rateAIResponse(aiId, rating, btn) {
  if(!S.session) return;
  if(!S.session.ratings) S.session.ratings={};
  const cur=S.session.ratings[aiId];
  if(cur===rating) { delete S.session.ratings[aiId]; } // toggle off
  else { S.session.ratings[aiId]=rating; }
  S._dirty=true;
  // Update UI
  const container=btn.closest('.ai-rating');
  if(container) {
    const btns=container.querySelectorAll('button');
    btns[0].className=S.session.ratings[aiId]===1?'rated-up':'';
    btns[1].className=S.session.ratings[aiId]===-1?'rated-down':'';
  }
  saveMaster().catch(()=>{});
}

function getRating(aiId) {
  return S.session?.ratings?.[aiId]||0;
}

// ═══════════════════════════════════════════════════════════════
// #9 AI 선택 토글
// ═══════════════════════════════════════════════════════════════
function toggleAIEnabled(aiId, checked) {
  if(!S.aiEnabled) S.aiEnabled={gpt:true,claude:true,gemini:true,grok:true,perp:true};
  S.aiEnabled[aiId]=checked;
  try { localStorage.setItem('aiEnabled',JSON.stringify(S.aiEnabled)); } catch(e){}
  renderSidebarAIs();
}

function getEnabledAIs() {
  if(!S.aiEnabled) S.aiEnabled={gpt:true,claude:true,gemini:true,grok:true,perp:true};
  return Object.keys(AI_DEFS).filter(id=>S.aiEnabled[id]!==false);
}

// ═══════════════════════════════════════════════════════════════
// #10 환자 타임라인 뷰
// ═══════════════════════════════════════════════════════════════
function renderTimelineView() {
  const currentUser=DC().user;
  const events=[];

  // Collect logs and sessions from all loaded domains
  Object.entries(S.domainState).forEach(([domainId,ds])=>{
    const dd=DOMAINS[domainId];
    if(!dd||dd.user!==currentUser||!ds.master) return;
    const icon=dd.icon;const label=dd.label;const color=dd.color;
    const lc=dd.logConfig;

    // Log entries
    (ds.logData||[]).forEach(log=>{
      const date=log.datetime?.slice(0,10)||'';
      if(!date) return;
      let text='';
      if(lc.moodMode) {
        text=log.mood||'기분 기록';
        if(log.symptoms?.length) text+=' — '+log.symptoms.join(', ');
      } else if(lc.customFields) {
        text=(log.categories||[]).join(', ')||'기록';
        if(log.memo) text+=' — '+log.memo.substring(0,40);
      } else if(log.nrs>=0) {
        text=`${_scoreLabel()} ${log.nrs} — ${(log.symptoms||[]).join(', ')||'기록'}`;
      } else { return; }
      events.push({date,type:'log',domain:label,icon,color,text,
        detail:(log.meds||[]).join(', ')});
    });
    // Sessions
    (ds.master?.sessions||[]).forEach(sess=>{
      events.push({date:sess.date,type:'session',domain:label,icon,color,
        text:sess.question?(sess.question.substring(0,60)+'...'):'세션',
        detail:`R${sess.rounds?.length||0} · ${Object.keys(sess.rounds?.[0]?.answers||{}).length}개 AI`});
    });
  });

  if(!events.length) return '<div class="hint">데이터를 로딩 중입니다... 잠시만 기다려 주세요.</div>';

  events.sort((a,b)=>(b.date||'').localeCompare(a.date||''));

  const items=events.slice(0,50).map(e=>{
    const typeIcon=e.type==='log'?'📊':'💬';
    return `<div class="timeline-card">
      <div class="timeline-event" style="border-left:3px solid ${e.color}">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
          <span style="font-size:.68rem;color:var(--mu);font-family:var(--mono)">${e.date}</span>
          <span style="font-size:.72rem">${typeIcon} ${e.icon} ${esc(e.domain)}</span>
        </div>
        <div style="font-size:.82rem;font-weight:500;color:var(--ink)">${esc(e.text)}</div>
        ${e.detail?`<div style="font-size:.7rem;color:var(--mu);margin-top:2px">${esc(e.detail)}</div>`:''}
      </div>
    </div>`;
  }).join('');

  return `<div class="card">
    <div class="card-title">📅 전체 타임라인 <span class="badge badge-blue">${events.length}건</span></div>
    ${items}
    ${events.length>50?`<div style="text-align:center;padding:8px;font-size:.72rem;color:var(--mu)">최근 50건만 표시됩니다.</div>`:''}
  </div>`;
}


// ═══════════════════════════════════════════════════════════════
// #19 API 키 갱신 알림
// ═══════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════
// #16 주간 요약
// ═══════════════════════════════════════════════════════════════
function generateWeeklySummary() {
  const m=DM(); if(!m) return null;
  const ds=D();
  const logs=ds.logData||[];
  const sessions=m.sessions||[];
  const today=kstToday();
  const weekAgo=kstDaysAgo(7);

  const weekLogs=logs.filter(l=>l.datetime?.slice(0,10)>=weekAgo&&l.datetime?.slice(0,10)<=today);
  const weekSessions=sessions.filter(s=>s.date>=weekAgo&&s.date<=today);

  if(!weekLogs.length&&!weekSessions.length) return null;

  // Group by date
  const byDate={};
  for(let i=0;i<=7;i++){
    const d=kstDaysAgo(i);
    byDate[d]={date:d, logs:[], nrs:[], meds:[], treatments:[], symptoms:[], painType:[]};
  }
  weekLogs.forEach(l=>{
    const d=l.datetime?.slice(0,10);
    if(!byDate[d]) byDate[d]={date:d, logs:[], nrs:[], meds:[], treatments:[], symptoms:[], painType:[]};
    byDate[d].logs.push(l);
    if(l.nrs>=0) byDate[d].nrs.push(l.nrs);
    (l.meds||l.medications||[]).forEach(m=>{ if(!byDate[d].meds.includes(m)) byDate[d].meds.push(m); });
    (l.treatments||[]).forEach(t=>{ if(!byDate[d].treatments.includes(t)) byDate[d].treatments.push(t); });
    (l.symptoms||[]).forEach(s=>{ if(!byDate[d].symptoms.includes(s)) byDate[d].symptoms.push(s); });
    (l.painType||[]).forEach(p=>{ if(!byDate[d].painType.includes(p)) byDate[d].painType.push(p); });
  });

  const dates=Object.keys(byDate).sort().reverse();
  const allNrs=weekLogs.filter(l=>l.nrs>=0).map(l=>l.nrs);
  const avgNrs=allNrs.length?(allNrs.reduce((a,b)=>a+b,0)/allNrs.length).toFixed(1):null;
  const allMeds=weekLogs.flatMap(l=>l.medications||l.meds||[]);
  const medCounts={};allMeds.forEach(m2=>{medCounts[m2]=(medCounts[m2]||0)+1;});
  const topMeds=Object.entries(medCounts).sort((a,b)=>b[1]-a[1]).slice(0,5);

  return { period:`${weekAgo} ~ ${today}`, logCount:weekLogs.length, sessionCount:weekSessions.length, avgNrs, dates, byDate, topMeds };
}

function _renderWeeklyNrsChart(logs, dates) {
  if(!logs.length) return '';
  var w=320, h=80, padL=24, padR=8, padT=12, padB=16;
  var plotW=w-padL-padR, plotH=h-padT-padB;
  // X: time index, Y: NRS 0-10
  var grid='';
  for(var n=0;n<=10;n+=5){
    var y=padT+(1-n/10)*plotH;
    grid+='<line x1="'+padL+'" y1="'+y+'" x2="'+(w-padR)+'" y2="'+y+'" stroke="var(--bd)" stroke-width="0.5"/>';
    grid+='<text x="'+(padL-3)+'" y="'+(y+3)+'" text-anchor="end" font-size="7" fill="var(--mu)">'+n+'</text>';
  }
  // Date separators
  var dateSet=[...new Set(logs.map(function(l){return l.date;}))].sort();
  var dayLabels='';
  dateSet.forEach(function(d,i){
    var firstIdx=logs.findIndex(function(l){return l.date===d;});
    var x=padL+(firstIdx/(logs.length-1||1))*plotW;
    if(i>0) dayLabels+='<line x1="'+x+'" y1="'+padT+'" x2="'+x+'" y2="'+(h-padB)+'" stroke="var(--bd)" stroke-width="0.5" stroke-dasharray="2"/>';
    dayLabels+='<text x="'+x+'" y="'+(h-2)+'" font-size="7" fill="var(--mu)">'+d.slice(5)+'</text>';
  });
  // Points and line
  var pts=logs.map(function(l,i){
    var x=padL+(i/(logs.length-1||1))*plotW;
    var y=padT+(1-l.nrs/10)*plotH;
    return {x:x,y:y,nrs:l.nrs,time:l.time,meds:l.meds,tx:l.treatments};
  });
  var pathD=pts.map(function(p,i){return (i===0?'M':'L')+p.x.toFixed(1)+','+p.y.toFixed(1);}).join(' ');
  var areaD=pathD+' L'+pts[pts.length-1].x.toFixed(1)+','+(h-padB)+' L'+pts[0].x.toFixed(1)+','+(h-padB)+' Z';
  var dots=pts.map(function(p){
    var c=p.nrs>=7?'#ef4444':p.nrs>=4?'#f59e0b':'#10b981';
    var hasTx=p.tx&&p.tx.length&&p.tx.some(function(t){return t.toLowerCase().includes('block');});
    var r=hasTx?4:2.5;
    var stroke=hasTx?'stroke="#1e40af" stroke-width="2"':'stroke="var(--sf)" stroke-width="1"';
    return '<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="'+r+'" fill="'+c+'" '+stroke+'>'
      +'<title>'+p.time+' NRS '+p.nrs+(p.meds.length?' | '+p.meds.join(', '):'')+(p.tx&&p.tx.length?' | '+p.tx.join(', '):'')+'</title></circle>';
  }).join('');
  // Med/tx markers
  var markers=pts.map(function(p){
    var items=[];
    if(p.meds&&p.meds.length) items.push('💊');
    if(p.tx&&p.tx.length&&p.tx.some(function(t){return t.toLowerCase().includes('block');})) items.push('💉');
    if(!items.length) return '';
    return '<text x="'+p.x.toFixed(1)+'" y="'+(p.y-6)+'" text-anchor="middle" font-size="7">'+items.join('')+'</text>';
  }).join('');

  return '<div style="margin:8px 0"><svg viewBox="0 0 '+w+' '+h+'" style="width:100%;height:auto;max-height:100px">'
    +grid+dayLabels
    +'<path d="'+areaD+'" fill="var(--ac)" opacity="0.06"/>'
    +'<path d="'+pathD+'" fill="none" stroke="var(--ac)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'
    +dots+markers
    +'</svg></div>';
}

function _renderNrsCell(avg,color,barW) {
  if(avg===null) return '<div style="font-size:.7rem;color:var(--mu)">-</div>';
  const v=typeof avg==='number'?avg.toFixed(1):avg;
  return '<div style="font-size:.9rem;font-weight:700;color:'+color+'">'+v+'</div>'
    +'<div style="width:100%;height:4px;background:var(--bd);border-radius:2px;overflow:hidden">'
    +'<div style="width:'+barW+'%;height:100%;background:'+color+';border-radius:2px"></div></div>';
}

function renderWeeklySummaryCard() {
  const summary=generateWeeklySummary();
  if(!summary) return '';

  const dayNames=['일','월','화','수','목','금','토'];

  // NRS 타임라인 SVG (시간대별 점)
  const allLogs=[];
  summary.dates.forEach(d=>{
    const dd=summary.byDate[d];
    dd.logs.forEach(l=>{ if(l.nrs>=0) allLogs.push({date:d,time:l.datetime?.slice(11,16)||'00:00',nrs:l.nrs,meds:l.meds||[],treatments:l.treatments||[]}); });
  });
  allLogs.sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  const svgChart=_renderWeeklyNrsChart(allLogs,summary.dates);

  // 일별 상세 (탭하면 펼치기)
  const daysHtml=summary.dates.map(d=>{
    const dd=summary.byDate[d];
    if(!dd.logs.length) return '';
    const dayOfWeek=dayNames[new Date(d+'T12:00').getDay()];
    const dateLabel=d.slice(5)+' ('+dayOfWeek+')';
    const isBlock=t=>t.toLowerCase().includes('block');
    const dayId='wk-'+d.replace(/-/g,'');

    // 요약 한줄 (접힌 상태)
    const firstLog=dd.logs.sort((a,b)=>(a.datetime||'').localeCompare(b.datetime||''))[0];
    const nrsVals=dd.logs.filter(l=>l.nrs>=0).map(l=>l.nrs);
    const nrsRange=nrsVals.length?_scoreLabel()+' '+(nrsVals.length>1?Math.min(...nrsVals)+'~'+Math.max(...nrsVals):nrsVals[0]):'';
    const allMeds=[...new Set(dd.logs.flatMap(l=>l.meds||[]))];
    const previewMeds=allMeds.slice(0,2).map(m=>'<span style="font-size:.58rem;padding:1px 4px;border-radius:3px;background:#fef3c7;color:#92400e">'+esc(m)+'</span>').join(' ');
    const allSites=[...new Set(dd.logs.flatMap(l=>l.sites||[]))];
    const previewSites=allSites.length?'<span style="font-size:.58rem;color:var(--mu)">'+allSites.slice(0,3).map(s=>esc(s)).join(', ')+'</span>':'';

    // 상세 (펼친 상태)
    const logsHtml=dd.logs.sort((a,b)=>(a.datetime||'').localeCompare(b.datetime||'')).map(l=>{
      const time=l.datetime?.slice(11,16)||'';
      const nrs=l.nrs>=0?l.nrs:null;
      const nc=nrs===null?'var(--mu)':nrs>=7?'#ef4444':nrs>=4?'#f59e0b':'#10b981';
      const barW=nrs!==null?Math.max(5,nrs*10):0;
      const meds=(l.meds||[]).map(m=>'<span style="font-size:.6rem;padding:1px 5px;border-radius:3px;background:#fef3c7;color:#92400e">'+esc(m)+'</span>').join(' ');
      const tx=(l.treatments||[]).map(t=>{
        if(isBlock(t)) return '<span style="font-size:.6rem;padding:1px 6px;border-radius:4px;background:#dbeafe;color:#1e40af;font-weight:700;border:1.5px solid #93c5fd">💉 '+esc(t)+'</span>';
        return '<span style="font-size:.6rem;padding:1px 5px;border-radius:3px;background:#d1fae5;color:#065f46">'+esc(t)+'</span>';
      }).join(' ');
      const pain=(l.painType||[]).length?'<span style="font-size:.58rem;color:#ec4899">'+(l.painType||[]).map(p=>esc(p)).join('·')+'</span>':'';
      const sites=(l.sites||[]).length?'<span style="font-size:.58rem;color:var(--mu)">'+(l.sites||[]).map(s=>esc(s)).join(', ')+'</span>':'';
      const symptoms=(l.symptoms||[]).length?'<span style="font-size:.58rem;color:#8b5cf6">'+(l.symptoms||[]).map(s=>esc(s)).join(', ')+'</span>':'';
      const memo=l.memo?'<div style="font-size:.6rem;color:var(--mu);margin-top:2px;padding-left:38px">📝 '+esc(l.memo)+'</div>':'';

      return '<div style="padding:3px 0;border-bottom:1px solid var(--bd)">'
        +'<div style="display:flex;gap:6px;align-items:center">'
        +'<span style="font-size:.65rem;font-family:var(--mono);color:var(--mu);min-width:32px">'+esc(time)+'</span>'
        +(nrs!==null?'<span style="font-size:.75rem;font-weight:700;color:'+nc+';min-width:22px;text-align:center">'+nrs+'</span>'
          +'<div style="width:50px;height:3px;background:var(--bd);border-radius:2px;overflow:hidden"><div style="width:'+barW+'%;height:100%;background:'+nc+'"></div></div>'
          :'<span style="font-size:.65rem;color:var(--mu);min-width:22px;text-align:center">-</span><div style="width:50px"></div>')
        +'<div style="flex:1;display:flex;flex-wrap:wrap;gap:2px;align-items:center">'+pain+sites+symptoms+meds+tx+'</div>'
        +'</div>'+memo+'</div>';
    }).join('');

    return '<div style="padding:6px 0;border-bottom:1.5px solid var(--bd)">'
      +'<div onclick="document.getElementById(\''+dayId+'\').style.display=document.getElementById(\''+dayId+'\').style.display===\'none\'?\'block\':\'none\';this.querySelector(\'.wk-arrow\').textContent=document.getElementById(\''+dayId+'\').style.display===\'none\'?\'▸\':\'▾\'" style="display:flex;align-items:center;gap:6px;cursor:pointer;user-select:none">'
      +'<span class="wk-arrow" style="font-size:.7rem;color:var(--mu);min-width:10px">▸</span>'
      +'<span style="font-size:.72rem;font-weight:700;color:var(--ink)">'+esc(dateLabel)+'</span>'
      +'<span style="font-size:.6rem;font-weight:400;color:var(--mu)">'+dd.logs.length+'건</span>'
      +(nrsRange?'<span style="font-size:.6rem;font-weight:600;color:'+(nrsVals[0]>=7?'#ef4444':nrsVals[0]>=4?'#f59e0b':'#10b981')+'">'+nrsRange+'</span>':'')
      +previewSites+previewMeds
      +'</div>'
      +'<div id="'+dayId+'" style="display:none;margin-top:4px;padding-left:16px">'+logsHtml+'</div>'
      +'</div>';
  }).join('');

  const medsTotal=summary.topMeds.map(function(e){return '<span style="font-size:.7rem;background:var(--sf2);padding:2px 8px;border-radius:4px">'+esc(e[0])+' ×'+e[1]+'</span>';}).join(' ');

  const avgColor=summary.avgNrs===null?'var(--mu)':summary.avgNrs>=7?'#ef4444':summary.avgNrs>=4?'#f59e0b':'#10b981';

  return '<div class="weekly-summary-card">'
    +'<div class="card-title">📊 주간 요약 <span class="badge badge-blue">'+summary.period+'</span></div>'
    +'<div style="display:flex;gap:16px;flex-wrap:wrap;margin:8px 0">'
    +'<div style="text-align:center"><div style="font-size:1.4rem;font-weight:700;color:var(--ac)">'+summary.logCount+'</div><div style="font-size:.65rem;color:var(--mu)">기록</div></div>'
    +'<div style="text-align:center"><div style="font-size:1.4rem;font-weight:700;color:var(--r3)">'+summary.sessionCount+'</div><div style="font-size:.65rem;color:var(--mu)">세션</div></div>'
    +(summary.avgNrs!==null?'<div style="text-align:center"><div style="font-size:1.4rem;font-weight:700;color:'+avgColor+'">'+summary.avgNrs+'</div><div style="font-size:.65rem;color:var(--mu)">평균 '+_scoreLabel()+'</div></div>':'')
    +'</div>'
    +svgChart
    +daysHtml
    +(medsTotal?'<div style="margin-top:8px"><span style="font-size:.68rem;color:var(--mu)">주간 합계:</span> '+medsTotal+'</div>':'')
    +'</div>';
}

// ═══════════════════════════════════════════════════════════════
// #17 템플릿 추천
// ═══════════════════════════════════════════════════════════════
function getSuggestedTemplates(question) {
  if(!question||question.length<2) return [];
  const templates=DM()?.templates||[];
  if(!templates.length) return [];
  const q=question.toLowerCase();
  const keywords=q.split(/\s+/).filter(w=>w.length>=2);
  if(!keywords.length) return [];
  return templates.filter(t=>{
    const tl=t.toLowerCase();
    return keywords.some(k=>tl.includes(k));
  }).slice(0,3);
}

let _suggestedTemplates=[];
function renderTemplateSuggestions(question) {
  const el=document.getElementById('tmpl-suggest-area');
  if(!el) return;
  _suggestedTemplates=getSuggestedTemplates(question);
  if(!_suggestedTemplates.length) { el.innerHTML=''; return; }
  el.innerHTML=`<div class="tmpl-suggest"><span style="font-size:.68rem;color:var(--mu)">💡 관련 템플릿:</span> ${
    _suggestedTemplates.map((t,i)=>`<span class="tmpl-chip" onclick="applySuggestedTemplate(${i})" style="font-size:.68rem;cursor:pointer">${esc(t.substring(0,35))}${t.length>35?'…':''}</span>`).join('')
  }</div>`;
}
function applySuggestedTemplate(idx) {
  const t=_suggestedTemplates[idx]; if(!t) return;
  const input=document.getElementById('q-input'); if(input) input.value=t;
  if(S.session) S.session.question=t;
}

// ═══════════════════════════════════════════════════════════════
// #18 세션 공유
// ═══════════════════════════════════════════════════════════════
function shareSession() {
  if(!S.session) { showToast('공유할 세션이 없습니다.'); return; }
  const shareData={
    question:S.session.question,
    rounds:S.session.rounds,
    summary:S.session.summary,
    date:S.session.date,
    mode:S.session.mode
  };
  try {
    const json=JSON.stringify(shareData);
    const encoded=btoa(unescape(encodeURIComponent(json)));
    const url=location.origin+location.pathname+'?shared='+encoded;
    if(url.length>8000) {
      // Too long for URL, copy JSON directly
      navigator.clipboard.writeText(json).then(()=>{
        showToast('📋 세션 JSON이 클립보드에 복사되었습니다 (URL 길이 초과)');
      });
      return;
    }
    navigator.clipboard.writeText(url).then(()=>{
      showToast('🔗 세션 공유 URL이 복사되었습니다!');
    }).catch(()=>showToast('❌ 복사 실패'));
  } catch(e) { showToast('❌ 공유 실패: '+e.message); }
}

function loadSharedSession() {
  const params=new URLSearchParams(location.search);
  const shared=params.get('shared');
  if(!shared) return false;
  try {
    const json=decodeURIComponent(escape(atob(shared)));
    const data=JSON.parse(json);
    if(!data.question) return false;
    S.session={
      question:data.question,
      rounds:data.rounds||[],
      summary:data.summary||null,
      date:data.date||kstToday(),
      mode:data.mode||'normal',
      currentRound:data.rounds?.length||0,
      _shared:true
    };
    // Clean URL
    history.replaceState(null,'',location.pathname);
    showToast('📥 공유된 세션을 불러왔습니다');
    switchView('session');
    return true;
  } catch(e) { return false; }
}

// ═══════════════════════════════════════════════════════════════
// #20 파일 첨부 UX 강화
// ═══════════════════════════════════════════════════════════════



// ═══════════════════════════════════════════════════════════════
// #11 데이터 암호화
// ═══════════════════════════════════════════════════════════════
async function encryptData(data, password) {
  const enc=new TextEncoder();
  const keyMaterial=await crypto.subtle.importKey('raw',enc.encode(password),{name:'PBKDF2'},false,['deriveKey']);
  const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:enc.encode('orangi-health-encrypt-v9'),iterations:100000,hash:'SHA-256'},
    keyMaterial,{name:'AES-GCM',length:256},false,['encrypt']);
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const plaintext=enc.encode(JSON.stringify(data));
  const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,plaintext);
  // Pack iv + ciphertext as base64
  const combined=new Uint8Array(iv.length+ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext),iv.length);
  return btoa(String.fromCharCode(...combined));
}

async function decryptData(encrypted, password) {
  const enc=new TextEncoder();
  const keyMaterial=await crypto.subtle.importKey('raw',enc.encode(password),{name:'PBKDF2'},false,['deriveKey']);
  const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:enc.encode('orangi-health-encrypt-v9'),iterations:100000,hash:'SHA-256'},
    keyMaterial,{name:'AES-GCM',length:256},false,['decrypt']);
  const raw=atob(encrypted);
  const bytes=new Uint8Array(Array.from(raw,c=>c.charCodeAt(0)));
  const iv=bytes.slice(0,12);
  const ciphertext=bytes.slice(12);
  const decrypted=await crypto.subtle.decrypt({name:'AES-GCM',iv},key,ciphertext);
  return JSON.parse(new TextDecoder().decode(decrypted));
}

function isEncryptionEnabled() {
  return localStorage.getItem('om_encrypt_enabled')==='true';
}

function getEncryptionPassword() {
  return S._encryptPass||null;
}

function toggleEncryption(enabled) {
  if(enabled) {
    const pass=prompt('데이터 암호화 비밀번호를 설정하세요 (잊으면 데이터 복구 불가):');
    if(!pass||pass.length<4) { showToast('비밀번호는 4자 이상이어야 합니다.'); return; }
    const confirm=prompt('비밀번호를 다시 입력하세요:');
    if(pass!==confirm) { showToast('비밀번호가 일치하지 않습니다.'); return; }
    S._encryptPass=pass;
    localStorage.setItem('om_encrypt_enabled','true');
    showToast('🔐 데이터 암호화가 활성화되었습니다');
  } else {
    S._encryptPass=null;
    localStorage.removeItem('om_encrypt_enabled');
    showToast('🔓 데이터 암호화가 비활성화되었습니다');
  }
}

function promptEncryptionPassword() {
  if(!isEncryptionEnabled()) return true;
  if(S._encryptPass) return true;
  const pass=prompt('데이터 암호화 비밀번호를 입력하세요:');
  if(!pass) { showToast('비밀번호가 필요합니다.'); return false; }
  S._encryptPass=pass;
  return true;
}

// ═══════════════════════════════════════════════════════════════
// #12 멀티기기 충돌 해결
// ═══════════════════════════════════════════════════════════════
function stampVersion(master) {
  if(!master._version) master._version=1;
  else master._version++;
  master._lastModified=kstNow().toISOString();
  master._deviceId=getDeviceId();
  return master;
}

function getDeviceId() {
  let id=localStorage.getItem('om_device_id');
  if(!id) { id='dev_'+Math.random().toString(36).slice(2,10); localStorage.setItem('om_device_id',id); }
  return id;
}

function detectConflict(local, remote) {
  if(!local?._version||!remote?._version) return false;
  // Conflict: different devices modified the same version
  if(local._version===remote._version&&local._deviceId!==remote._deviceId&&local._lastModified!==remote._lastModified) return true;
  // Remote is ahead
  if(remote._version>local._version) return 'remote_ahead';
  return false;
}

let _conflictDomainId=null;
function showConflictModal(local, remote, domainId) {
  _conflictDomainId=domainId;
  const localDate=local._lastModified?new Date(local._lastModified).toLocaleString('ko-KR'):'알 수 없음';
  const remoteDate=remote._lastModified?new Date(remote._lastModified).toLocaleString('ko-KR'):'알 수 없음';
  const localSessions=local.sessions?.length||0;
  const remoteSessions=remote.sessions?.length||0;

  const html=`<div style="padding:16px">
    <h3 style="margin:0 0 12px;color:var(--ink)">⚠️ 데이터 충돌 감지</h3>
    <p style="font-size:.8rem;color:var(--mu)">다른 기기에서 수정된 데이터가 감지되었습니다.</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0">
      <div style="padding:12px;border:2px solid var(--ac);border-radius:8px;background:var(--sf2)">
        <div style="font-weight:600;font-size:.82rem;margin-bottom:6px">📱 현재 기기</div>
        <div style="font-size:.72rem;color:var(--mu)">수정: ${localDate}</div>
        <div style="font-size:.72rem;color:var(--mu)">버전: v${local._version||'?'}</div>
        <div style="font-size:.72rem;color:var(--mu)">세션: ${localSessions}개</div>
      </div>
      <div style="padding:12px;border:2px solid #f59e0b;border-radius:8px;background:var(--sf2)">
        <div style="font-weight:600;font-size:.82rem;margin-bottom:6px">☁️ 클라우드</div>
        <div style="font-size:.72rem;color:var(--mu)">수정: ${remoteDate}</div>
        <div style="font-size:.72rem;color:var(--mu)">버전: v${remote._version||'?'}</div>
        <div style="font-size:.72rem;color:var(--mu)">세션: ${remoteSessions}개</div>
      </div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn-save" onclick="resolveConflict('local',_conflictDomainId)" style="flex:1">📱 현재 기기 유지</button>
      <button class="btn-save" onclick="resolveConflict('remote',_conflictDomainId)" style="flex:1;background:#f59e0b">☁️ 클라우드 사용</button>
      <button class="btn-save" onclick="resolveConflict('merge',_conflictDomainId)" style="flex:1;background:#8b5cf6">🔀 병합 시도</button>
    </div>
    <button class="btn-cancel" onclick="closeModal('conflict-modal')" style="width:100%;margin-top:8px">나중에 결정</button>
  </div>`;

  let modal=document.getElementById('conflict-modal');
  if(!modal) {
    modal=document.createElement('div');
    modal.id='conflict-modal';
    modal.className='modal';
    modal.innerHTML=`<div class="modal-content" style="max-width:420px"><div id="conflict-body"></div></div>`;
    document.body.appendChild(modal);
  }
  document.getElementById('conflict-body').innerHTML=html;
  modal.style.display='flex';
}

async function resolveConflict(strategy, domainId) {
  const ds=S.domainState[domainId];
  if(!ds) return;
  try {
    if(strategy==='local') {
      // Keep local, overwrite remote
      stampVersion(ds.master);
      await driveUpdate(ds.masterFileId, ds.master);
      showToast('📱 현재 기기 데이터로 저장됨');
    } else if(strategy==='remote') {
      // Use remote
      ds.master=await driveRead(ds.masterFileId);
      _restoreCustomItemsFromMaster(ds, domainId);
      cacheToLocal(domainId);
      showToast('☁️ 클라우드 데이터로 복원됨');
    } else if(strategy==='merge') {
      // Simple merge: take more sessions, combine conditions
      const remote=await driveRead(ds.masterFileId);
      const local=ds.master;
      // Merge sessions (union by date+question)
      const sessionKeys=new Set((local.sessions||[]).map(s=>s.date+'|'+s.question));
      (remote.sessions||[]).forEach(s=>{
        const key=s.date+'|'+s.question;
        if(!sessionKeys.has(key)) { local.sessions.push(s); sessionKeys.add(key); }
      });
      // Merge conditions (union by name)
      const condNames=new Set((local.conditions||[]).map(c=>c.name));
      (remote.conditions||[]).forEach(c=>{
        if(!condNames.has(c.name)) { local.conditions.push(c); condNames.add(c.name); }
      });
      // Merge accumulated
      ['established_consensus','unresolved_issues','discarded_hypotheses'].forEach(field=>{
        const existing=new Set(local.accumulated?.[field]||[]);
        (remote.accumulated?.[field]||[]).forEach(item=>{
          if(!existing.has(item)) { local.accumulated[field].push(item); }
        });
      });
      stampVersion(local);
      await driveUpdate(ds.masterFileId, local);
      cacheToLocal(domainId);
      showToast('🔀 데이터 병합 완료');
    }
  } catch(e) { showToast('❌ 충돌 해결 실패: '+e.message); }

  const modal=document.getElementById('conflict-modal');
  if(modal) modal.style.display='none';
  renderView(S.currentView);
}

// ═══════════════════════════════════════════════════════════════
// #15 통계 강화 (90일 추세 차트 + 상관분석)
// ═══════════════════════════════════════════════════════════════
function renderTrendChart(logs, days) {
  const lc=DC().logConfig;
  if(lc.moodMode) return ''; // Mood mode doesn't have NRS

  const dates=[];
  for(let i=days-1;i>=0;i--) dates.push(kstDaysAgo(i));

  const byDate={};
  logs.forEach(l=>{
    const d=l.datetime.slice(0,10);
    if(!byDate[d]) byDate[d]=[];
    if(l.nrs>=0) byDate[d].push(l.nrs);
  });

  // Build SVG line chart
  const width=600, height=120, padX=30, padY=15;
  const plotW=width-padX*2, plotH=height-padY*2;
  const points=[];
  dates.forEach((d,i)=>{
    const vals=byDate[d];
    if(vals?.length) {
      const avg=vals.reduce((a,b)=>a+b,0)/vals.length;
      const x=padX+(i/(dates.length-1))*plotW;
      const y=padY+(1-avg/10)*plotH;
      points.push({x,y,avg,date:d});
    }
  });

  if(points.length<2) return '';

  const pathD=points.map((p,i)=>`${i===0?'M':'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaD=pathD+` L${points[points.length-1].x.toFixed(1)},${height-padY} L${points[0].x.toFixed(1)},${height-padY} Z`;

  // Grid lines
  const gridLines=[0,2,4,6,8,10].map(n=>{
    const y=padY+(1-n/10)*plotH;
    return `<line x1="${padX}" y1="${y}" x2="${width-padX}" y2="${y}" stroke="var(--bd)" stroke-width="0.5" stroke-dasharray="3"/>
      <text x="${padX-4}" y="${y+3}" text-anchor="end" font-size="8" fill="var(--mu)">${n}</text>`;
  }).join('');

  // Month labels
  const monthLabels=[];
  let lastMonth='';
  dates.forEach((d,i)=>{
    const m=d.slice(5,7);
    if(m!==lastMonth) {
      const x=padX+(i/(dates.length-1))*plotW;
      monthLabels.push(`<text x="${x}" y="${height-2}" font-size="8" fill="var(--mu)">${d.slice(5,10)}</text>`);
      lastMonth=m;
    }
  });

  const dots=points.map(p=>{
    const color=nrsColor(p.avg);
    return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.5" fill="${color}" stroke="var(--sf)" stroke-width="1">
      <title>${p.date}: ${_scoreLabel()} ${p.avg.toFixed(1)}</title></circle>`;
  }).join('');

  return `<div class="card">
    <div class="card-title">📈 ${_scoreLabel()} ${days}일 추세</div>
    <svg viewBox="0 0 ${width} ${height}" style="width:100%;height:auto;max-height:150px">
      ${gridLines}
      <path d="${areaD}" fill="var(--ac)" opacity="0.08"/>
      <path d="${pathD}" fill="none" stroke="var(--ac)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      ${dots}
      ${monthLabels.join('')}
    </svg>
  </div>`;
}

function renderCorrelationAnalysis(logs) {
  const lc=DC().logConfig;
  if(lc.moodMode) return '';

  const nrsLogs=logs.filter(l=>l.nrs>=0);
  if(nrsLogs.length<10) return '';

  // Medication-NRS correlation
  const medStats={};
  nrsLogs.forEach(l=>{
    const meds=l.meds||l.medications||[];
    if(meds.length) {
      meds.forEach(m=>{
        if(!medStats[m]) medStats[m]={withNrs:[],count:0};
        medStats[m].withNrs.push(l.nrs);
        medStats[m].count++;
      });
    }
  });

  const globalAvg=nrsLogs.reduce((a,l)=>a+l.nrs,0)/nrsLogs.length;
  const correlations=Object.entries(medStats)
    .filter(([,s])=>s.count>=3)
    .map(([med,s])=>{
      const avg=s.withNrs.reduce((a,b)=>a+b,0)/s.withNrs.length;
      const diff=avg-globalAvg;
      return {med,avg:avg.toFixed(1),count:s.count,diff:diff.toFixed(1),direction:diff<0?'lower':'higher'};
    })
    .sort((a,b)=>Math.abs(b.diff)-Math.abs(a.diff))
    .slice(0,6);

  if(!correlations.length) return '';

  const rows=correlations.map(c=>{
    const color=c.direction==='lower'?'#10b981':'#ef4444';
    const icon=c.direction==='lower'?'↓':'↑';
    const barW=Math.min(100,Math.abs(c.diff)*15);
    return `<div style="display:flex;align-items:center;gap:8px;padding:4px 0">
      <span style="font-size:.78rem;min-width:80px;text-align:right">${esc(c.med)}</span>
      <div style="flex:1;display:flex;align-items:center;gap:4px">
        <div style="width:${barW}%;height:6px;background:${color};border-radius:3px;opacity:.7"></div>
        <span style="font-size:.68rem;color:${color};font-weight:600">${icon} ${c.diff}</span>
      </div>
      <span style="font-size:.65rem;color:var(--mu);font-family:var(--mono)">avg ${c.avg} (${c.count}회)</span>
    </div>`;
  }).join('');

  return `<div class="card">
    <div class="card-title">🔬 약물-${_scoreLabel()} 상관분석 <span class="badge badge-blue">vs 전체 평균 ${globalAvg.toFixed(1)}</span></div>
    <div style="font-size:.68rem;color:var(--mu);margin-bottom:6px">투약 시 ${_scoreLabel()}가 전체 평균 대비 어떻게 변했는지 보여줍니다.</div>
    ${rows}
    <div style="font-size:.6rem;color:var(--mu);margin-top:8px">※ 상관관계는 인과관계를 의미하지 않습니다. 최소 3회 이상 투약 데이터 기준.</div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════════
// 약물 효과 추적 — 복용 후 NRS 변화 분석
// ═══════════════════════════════════════════════════════════════
function renderMedEffectAnalysis(logs) {
  const lc=DC().logConfig;
  if(lc.moodMode||lc.customFields) return '';

  // Group logs by date with time info
  const nrsLogs=logs.filter(l=>l.nrs>=0).sort((a,b)=>a.datetime.localeCompare(b.datetime));
  if(nrsLogs.length<5) return '';

  // For each medication, find "before" and "after" NRS patterns
  const medEffects={};
  const byDate={};
  nrsLogs.forEach(l=>{
    const d=l.datetime.slice(0,10);
    if(!byDate[d]) byDate[d]=[];
    byDate[d].push(l);
  });

  const dates=Object.keys(byDate).sort();
  dates.forEach((d,di)=>{
    const dayLogs=byDate[d];
    const dayMeds=new Set(dayLogs.flatMap(l=>l.meds||[]));
    if(!dayMeds.size) return;

    // Get NRS for this day and next day
    const todayNrs=dayLogs.filter(l=>l.nrs>=0).map(l=>l.nrs);
    const nextDate=dates[di+1];
    const nextNrs=nextDate?byDate[nextDate].filter(l=>l.nrs>=0).map(l=>l.nrs):[];

    const todayAvg=todayNrs.length?todayNrs.reduce((a,b)=>a+b,0)/todayNrs.length:null;
    const nextAvg=nextNrs.length?nextNrs.reduce((a,b)=>a+b,0)/nextNrs.length:null;

    dayMeds.forEach(med=>{
      if(!medEffects[med]) medEffects[med]={dayOfNrs:[],nextDayNrs:[],count:0};
      if(todayAvg!==null) medEffects[med].dayOfNrs.push(todayAvg);
      if(nextAvg!==null) medEffects[med].nextDayNrs.push(nextAvg);
      medEffects[med].count++;
    });
  });

  const results=Object.entries(medEffects)
    .filter(([,e])=>e.count>=3&&e.dayOfNrs.length>=3&&e.nextDayNrs.length>=2)
    .map(([med,e])=>{
      const dayAvg=e.dayOfNrs.reduce((a,b)=>a+b,0)/e.dayOfNrs.length;
      const nextAvg=e.nextDayNrs.reduce((a,b)=>a+b,0)/e.nextDayNrs.length;
      const change=nextAvg-dayAvg;
      return {med,dayAvg:dayAvg.toFixed(1),nextAvg:nextAvg.toFixed(1),change:change.toFixed(1),count:e.count,improved:change<0};
    })
    .sort((a,b)=>parseFloat(a.change)-parseFloat(b.change))
    .slice(0,6);

  if(!results.length) return '';

  const rows=results.map(r=>{
    const arrow=r.improved?'↓':'↑';
    const color=r.improved?'#10b981':'#ef4444';
    return `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--bd)">
      <span style="font-size:.78rem;min-width:80px;font-weight:500">${esc(r.med)}</span>
      <div style="flex:1;display:flex;align-items:center;gap:6px">
        <span style="font-size:.72rem;color:var(--mu)">복용일 ${r.dayAvg}</span>
        <span style="color:${color};font-weight:700;font-size:.8rem">${arrow}</span>
        <span style="font-size:.72rem;color:${color};font-weight:600">다음날 ${r.nextAvg}</span>
      </div>
      <span style="font-size:.62rem;color:var(--mu);font-family:var(--mono)">${r.count}회</span>
    </div>`;
  }).join('');

  return `<div class="card">
    <div class="card-title">💊 약물 효과 추적 <span class="badge badge-green">복용→다음날 ${_scoreLabel()} 변화</span></div>
    <div style="font-size:.68rem;color:var(--mu);margin-bottom:8px">약물 복용일과 다음날의 평균 ${_scoreLabel()} 변화를 비교합니다.</div>
    ${rows}
    <div style="font-size:.6rem;color:var(--mu);margin-top:8px">※ 최소 3회 이상 복용 데이터 기준. 다른 요인이 영향을 줄 수 있습니다.</div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════════
// 약물 종합 효과 리포트 — NRS 변화 + 경과 평가 + 사용빈도 통합
// ═══════════════════════════════════════════════════════════════
function renderMedSummaryReport(logs) {
  const lc=DC().logConfig;
  if(lc.moodMode||lc.customFields) return '';
  const nrsLogs=logs.filter(l=>l.nrs>=0).sort((a,b)=>a.datetime.localeCompare(b.datetime));
  if(nrsLogs.length<7) return '';

  // 약물/치료별 통계 수집
  const stats={};
  const byDate={};
  nrsLogs.forEach(l=>{const d=l.datetime.slice(0,10);if(!byDate[d])byDate[d]=[];byDate[d].push(l);});
  const dates=Object.keys(byDate).sort();
  const allNrsAvg=nrsLogs.reduce((s,l)=>s+l.nrs,0)/nrsLogs.length;

  // 날짜별 약물 사용 + NRS 수집
  dates.forEach((d,di)=>{
    const dayLogs=byDate[d];
    const items=new Set(dayLogs.flatMap(l=>[...(l.meds||[]),...(l.treatments||[])]));
    const dayNrs=dayLogs.filter(l=>l.nrs>=0).map(l=>l.nrs);
    const dayAvg=dayNrs.length?dayNrs.reduce((a,b)=>a+b,0)/dayNrs.length:null;
    const nextDate=dates[di+1];
    const nextLogs=nextDate?byDate[nextDate]:[];
    const nextNrs=nextLogs.filter(l=>l.nrs>=0).map(l=>l.nrs);
    const nextAvg=nextNrs.length?nextNrs.reduce((a,b)=>a+b,0)/nextNrs.length:null;

    items.forEach(item=>{
      if(!stats[item]) stats[item]={days:0,dayNrs:[],nextNrs:[],better:0,same:0,worse:0,rated:0};
      stats[item].days++;
      if(dayAvg!==null) stats[item].dayNrs.push(dayAvg);
      if(nextAvg!==null) stats[item].nextNrs.push(nextAvg);
    });

    // 경과 평가 반영
    dayLogs.forEach(l=>{
      if(!l.outcome?.rating) return;
      const r={good:'better',partial:'same',none:'worse'}[l.outcome.rating]||l.outcome.rating;
      [...(l.meds||[]),...(l.treatments||[])].forEach(item=>{
        if(!stats[item]) return;
        stats[item][r]++;stats[item].rated++;
      });
    });
  });

  // 비사용일 평균 NRS
  const noMedDates=dates.filter(d=>!byDate[d].some(l=>(l.meds?.length||l.treatments?.length)));
  const noMedNrs=noMedDates.flatMap(d=>byDate[d].filter(l=>l.nrs>=0).map(l=>l.nrs));
  const noMedAvg=noMedNrs.length?noMedNrs.reduce((a,b)=>a+b,0)/noMedNrs.length:null;

  // 랭킹: 효과 점수 = (호전율×0.5 + NRS감소점수×0.5) — 최소 3일 데이터
  const ranked=Object.entries(stats)
    .filter(([,s])=>s.days>=3)
    .map(([item,s])=>{
      const dayAvg=s.dayNrs.length?s.dayNrs.reduce((a,b)=>a+b,0)/s.dayNrs.length:null;
      const nxtAvg=s.nextNrs.length?s.nextNrs.reduce((a,b)=>a+b,0)/s.nextNrs.length:null;
      const nrsChange=nxtAvg!==null&&dayAvg!==null?nxtAvg-dayAvg:null;
      const betterPct=s.rated?Math.round(s.better/s.rated*100):null;
      // Score: lower is better — 정규화하여 NRS(-1~1)와 호전율(-1~1) 균등 반영
      const nrsScore=nrsChange!==null?nrsChange/10:0;
      const outcomeScore=betterPct!==null?(50-betterPct)/50:0;
      const score=nrsScore+outcomeScore;
      return {item,days:s.days,dayAvg,nxtAvg,nrsChange,betterPct,rated:s.rated,score};
    })
    .sort((a,b)=>a.score-b.score)
    .slice(0,8);

  if(!ranked.length) return '';

  const medal=['🥇','🥈','🥉'];
  const rows=ranked.map((r,i)=>{
    const nrsStr=r.nrsChange!==null?`<span style="color:${r.nrsChange<0?'#10b981':'#ef4444'};font-weight:600">${r.nrsChange<0?'↓':'↑'}${Math.abs(r.nrsChange).toFixed(1)}</span>`:'<span style="color:var(--mu2)">—</span>';
    const outcomeStr=r.betterPct!==null?`<span style="color:${r.betterPct>=50?'#10b981':'#f59e0b'}">${r.betterPct}%</span>`:'<span style="color:var(--mu2)">—</span>';
    return `<div style="display:flex;align-items:center;gap:6px;padding:6px 0;${i<ranked.length-1?'border-bottom:1px solid var(--bd)':''}">
      <span style="font-size:.85rem;width:22px;text-align:center">${medal[i]||''}</span>
      <span style="font-size:.8rem;font-weight:600;min-width:80px;flex:1">${esc(r.item)}</span>
      <div style="text-align:center;min-width:55px"><div style="font-size:.72rem">${nrsStr}</div><div style="font-size:.55rem;color:var(--mu2)">${_scoreLabel()}변화</div></div>
      <div style="text-align:center;min-width:45px"><div style="font-size:.72rem">${outcomeStr}</div><div style="font-size:.55rem;color:var(--mu2)">호전율</div></div>
      <div style="text-align:center;min-width:35px"><div style="font-size:.72rem;font-family:var(--mono)">${r.days}</div><div style="font-size:.55rem;color:var(--mu2)">일</div></div>
    </div>`;
  }).join('');

  const baseline=noMedAvg!==null?`<div style="font-size:.68rem;color:var(--mu);margin-top:8px;padding:6px 8px;background:var(--sf2);border-radius:6px">📊 비교 기준: 약/시술 없는 날 평균 ${_scoreLabel()} <b>${noMedAvg.toFixed(1)}</b> | 전체 평균 <b>${allNrsAvg.toFixed(1)}</b></div>`:'';

  return `<div class="card">
    <div class="card-title">📋 약물 종합 효과 리포트 <span class="badge badge-green">${_scoreLabel()} + 경과 통합</span></div>
    <div style="font-size:.68rem;color:var(--mu);margin-bottom:8px">${_scoreLabel()} 변화와 경과 평가를 종합하여 효과 순으로 정렬합니다.</div>
    ${rows}${baseline}
    <div style="font-size:.58rem;color:var(--mu2);margin-top:6px">※ 최소 3일 이상 사용 기준. 다른 요인(날씨·수면·트리거)이 영향을 줄 수 있습니다.</div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════════
// 패턴 감지 경고 — 위험 패턴 자동 감지
// ═══════════════════════════════════════════════════════════════
function detectDangerousPatterns() {
  const ds=D(); const lc=DC().logConfig;
  if(lc.moodMode||lc.customFields) return [];
  const logs=ds.logData||[];
  if(!logs.length) return [];

  const warnings=[];
  const today=kstToday();
  const recentLogs=logs.filter(l=>{
    const d=l.datetime.slice(0,10);
    const diff=Math.round((new Date(today+'T00:00:00')-new Date(d+'T00:00:00'))/86400000);
    return diff>=0&&diff<=14;
  }).sort((a,b)=>a.datetime.localeCompare(b.datetime));

  if(!recentLogs.length) return [];

  // 1. 연속 고통 감지: 3일 연속 NRS 7+
  const byDate={};
  recentLogs.forEach(l=>{
    const d=l.datetime.slice(0,10);
    if(!byDate[d]) byDate[d]=[];
    if(l.nrs>=0) byDate[d].push(l.nrs);
  });
  const dates=Object.keys(byDate).sort();
  let consecHigh=0; let maxConsec=0;
  dates.forEach(d=>{
    const avg=byDate[d].reduce((a,b)=>a+b,0)/byDate[d].length;
    if(avg>=7) { consecHigh++; maxConsec=Math.max(maxConsec,consecHigh); }
    else { consecHigh=0; }
  });
  if(maxConsec>=3) {
    warnings.push({level:'high',icon:'🔴',text:`${maxConsec}일 연속 ${_scoreLabel()} 7 이상 — 전문의 상담을 권장합니다`});
  }

  // 2. 투약 빈도 과다: 7일 중 5일 이상 진통제 사용
  const last7=recentLogs.filter(l=>{
    const diff=Math.round((new Date(today+'T00:00:00')-new Date(l.datetime.slice(0,10)+'T00:00:00'))/86400000);
    return diff>=0&&diff<=7;
  });
  const medDays=new Set(last7.filter(l=>(l.meds||[]).length>0).map(l=>l.datetime.slice(0,10)));
  if(medDays.size>=5) {
    warnings.push({level:'moderate',icon:'🟡',text:`최근 7일 중 ${medDays.size}일 투약 — 약물 과용 두통(MOH) 주의`});
  }

  // 3. ${_scoreLabel()} 악화 추세: 최근 7일 평균 > 이전 7일 평균
  const prev7=logs.filter(l=>{
    const diff=Math.round((new Date(today+'T00:00:00')-new Date(l.datetime.slice(0,10)+'T00:00:00'))/86400000);
    return diff>7&&diff<=14;
  });
  const cur7Nrs=last7.filter(l=>l.nrs>=0).map(l=>l.nrs);
  const prev7Nrs=prev7.filter(l=>l.nrs>=0).map(l=>l.nrs);
  if(cur7Nrs.length>=3&&prev7Nrs.length>=3) {
    const curAvg=cur7Nrs.reduce((a,b)=>a+b,0)/cur7Nrs.length;
    const prevAvg=prev7Nrs.reduce((a,b)=>a+b,0)/prev7Nrs.length;
    if(curAvg-prevAvg>=2) {
      warnings.push({level:'moderate',icon:'📈',text:`${_scoreLabel()} 악화 추세: 이전 주 평균 ${prevAvg.toFixed(1)} → 이번 주 ${curAvg.toFixed(1)} (+${(curAvg-prevAvg).toFixed(1)})`});
    }
  }

  // 4. 기록 공백: 3일 이상 기록 없음
  if(recentLogs.length) {
    const lastLog=recentLogs[recentLogs.length-1];
    const lastDate=lastLog.datetime.slice(0,10);
    const gap=Math.round((new Date(today+'T00:00:00')-new Date(lastDate+'T00:00:00'))/86400000);
    if(gap>=3) {
      warnings.push({level:'low',icon:'📝',text:`${gap}일 동안 기록 없음 — 꾸준한 기록이 패턴 분석에 도움됩니다`});
    }
  }

  return warnings;
}

function renderPatternWarnings() {
  const warnings=detectDangerousPatterns();
  if(!warnings.length) return '';
  const levelBorder={high:'#ef4444',moderate:'#f59e0b',low:'var(--ac)'};
  const items=warnings.map(w=>`
    <div style="display:flex;align-items:flex-start;gap:8px;padding:8px 10px;border-left:3px solid ${levelBorder[w.level]};margin-bottom:6px;background:var(--sf2);border-radius:0 6px 6px 0">
      <span style="font-size:1rem">${w.icon}</span>
      <span style="font-size:.78rem;color:var(--ink)">${esc(w.text)}</span>
    </div>`).join('');
  return `<div class="card" style="border-color:${warnings[0].level==='high'?'#ef4444':'#f59e0b'}">
    <div class="card-title">⚠️ 패턴 감지 경고 <span class="badge badge-orange">${warnings.length}건</span></div>
    ${items}
  </div>`;
}

// ═══════════════════════════════════════════════════════════════
// 월간 PDF 리포트 — 병원 방문용
// ═══════════════════════════════════════════════════════════════
function exportMonthlyPDF() {
  const dc=DC(); const ds=D(); const m=DM();
  if(!m){showToast('데이터 없음');return;}
  const logs=ds.logData||[];
  const sessions=m.sessions||[];
  const conditions=m.conditions||[];
  const lc=dc.logConfig;
  const today=kstToday();
  const monthAgo=kstDaysAgo(30);

  const last30=logs.filter(l=>l.datetime?.slice(0,10)>=monthAgo&&l.datetime?.slice(0,10)<=today).sort((a,b)=>a.datetime.localeCompare(b.datetime));
  const nrsVals=last30.filter(l=>l.nrs>=0).map(l=>l.nrs);
  const avgNrs=nrsVals.length?(nrsVals.reduce((a,b)=>a+b,0)/nrsVals.length).toFixed(1):'-';
  const maxNrs=nrsVals.length?Math.max(...nrsVals):'-';
  const minNrs=nrsVals.length?Math.min(...nrsVals):'-';
  const attackDays=new Set(last30.filter(l=>l.nrs>=4).map(l=>l.datetime.slice(0,10))).size;
  const medDays=new Set(last30.filter(l=>(l.meds||[]).length).map(l=>l.datetime.slice(0,10))).size;

  // Symptom frequency
  const symFreq={};
  last30.forEach(l=>(l.symptoms||[]).forEach(s=>{symFreq[s]=(symFreq[s]||0)+1;}));
  const topSyms=Object.entries(symFreq).sort((a,b)=>b[1]-a[1]).slice(0,5);

  // Med frequency
  const medFreq={};
  last30.forEach(l=>(l.meds||[]).forEach(m2=>{medFreq[m2]=(medFreq[m2]||0)+1;}));
  const topMeds=Object.entries(medFreq).sort((a,b)=>b[1]-a[1]).slice(0,5);

  // Weekly breakdown
  const weeks=[[],[],[],[],[]];
  last30.forEach(l=>{
    const diff=Math.round((new Date(today+'T00:00:00')-new Date(l.datetime.slice(0,10)+'T00:00:00'))/86400000);
    const wi=Math.min(4,Math.floor(diff/7));
    weeks[wi].push(l);
  });

  let html=`<html><head><meta charset="utf-8"><title>${dc.user} ${dc.label} 월간 리포트</title>
  <style>
    body{font-family:'맑은 고딕','Apple SD Gothic Neo',sans-serif;font-size:11px;padding:24px;color:#333;max-width:800px;margin:0 auto}
    h1{font-size:20px;border-bottom:3px solid #2c5f8a;padding-bottom:8px;color:#2c5f8a;margin-bottom:4px}
    .subtitle{font-size:11px;color:#777;margin-bottom:16px}
    h2{font-size:14px;color:#2c5f8a;margin-top:20px;border-left:4px solid #2c5f8a;padding-left:8px}
    .stat-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin:12px 0}
    .stat-box{background:#f8f9fa;border:1px solid #ddd;border-radius:6px;padding:10px;text-align:center}
    .stat-val{font-size:18px;font-weight:700;color:#2c5f8a}.stat-label{font-size:9px;color:#777;margin-top:2px}
    table{width:100%;border-collapse:collapse;margin:8px 0;font-size:10px}
    th{background:#e8f0fe;padding:5px 8px;text-align:left;font-weight:600;border:1px solid #ddd}
    td{border:1px solid #ddd;padding:4px 8px}
    .nrs-high{background:#fee2e2;color:#991b1b}.nrs-med{background:#fef3c7;color:#92400e}.nrs-low{background:#d1fae5;color:#065f46}
    .freq-bar{display:inline-block;height:8px;border-radius:4px;margin-right:6px;vertical-align:middle}
    .section{margin-bottom:16px;page-break-inside:avoid}
    .footer{margin-top:24px;padding-top:12px;border-top:1px solid #ddd;font-size:9px;color:#999;text-align:center}
    .week-row{display:flex;gap:12px;margin:6px 0;padding:6px 10px;background:#f8f9fa;border-radius:4px;font-size:10px}
    @media print{body{padding:12px}h1{font-size:16px}.stat-grid{grid-template-columns:repeat(5,1fr)}}
  </style></head><body>`;

  html+=`<h1>${dc.icon} ${dc.label} — 월간 의료 리포트</h1>`;
  html+=`<div class="subtitle">환자: ${dc.user} | 기간: ${monthAgo} ~ ${today} | 생성일: ${today}</div>`;

  // Summary stats
  html+=`<div class="stat-grid">
    <div class="stat-box"><div class="stat-val">${last30.length}</div><div class="stat-label">총 기록 수</div></div>
    <div class="stat-box"><div class="stat-val">${avgNrs}</div><div class="stat-label">평균 _scoreLabel()+'</div>'</div>
    <div class="stat-box"><div class="stat-val">${maxNrs}</div><div class="stat-label">최대 _scoreLabel()+'</div>'</div>
    <div class="stat-box"><div class="stat-val">${attackDays}일</div><div class="stat-label">발작일(${_scoreLabel()}4+)</div></div>
    <div class="stat-box"><div class="stat-val">${medDays}일</div><div class="stat-label">투약일</div></div>
  </div>`;

  // Conditions
  if(conditions.length) {
    const statusL={active:'치료 중',remission:'관해',resolved:'완치','self-stopped':'자의 중단'};
    html+=`<div class="section"><h2>등록 질환</h2><table><tr><th>질환명</th><th>상태</th><th>현재 투약</th></tr>`;
    conditions.filter(c=>c.status==='active'||c.status==='remission').forEach(c=>{
      html+=`<tr><td>${esc(c.name)}</td><td>${statusL[c.status]||c.status}</td><td>${(c.medsList||[]).map(m=>esc(m)).join(', ')||'-'}</td></tr>`;
    });
    html+=`</table></div>`;
  }

  // Top symptoms & meds
  if(topSyms.length||topMeds.length) {
    html+=`<div class="section"><h2>주요 증상 및 투약 빈도</h2><table><tr><th>증상</th><th>횟수</th><th>투약</th><th>횟수</th></tr>`;
    const maxRows=Math.max(topSyms.length,topMeds.length);
    for(let i=0;i<maxRows;i++){
      html+=`<tr><td>${topSyms[i]?esc(topSyms[i][0]):''}</td><td>${topSyms[i]?topSyms[i][1]:''}</td>
        <td>${topMeds[i]?esc(topMeds[i][0]):''}</td><td>${topMeds[i]?topMeds[i][1]:''}</td></tr>`;
    }
    html+=`</table></div>`;
  }

  // Weekly breakdown
  html+=`<div class="section"><h2>주간 추이</h2>`;
  const weekLabels=['이번 주','1주 전','2주 전','3주 전','4주 전'];
  weeks.forEach((w,wi)=>{
    if(!w.length) return;
    const wNrs=w.filter(l=>l.nrs>=0).map(l=>l.nrs);
    const wAvg=wNrs.length?(wNrs.reduce((a,b)=>a+b,0)/wNrs.length).toFixed(1):'-';
    const wMax=wNrs.length?Math.max(...wNrs):'-';
    const wMeds=new Set(w.filter(l=>(l.meds||[]).length).map(l=>l.datetime.slice(0,10))).size;
    html+=`<div class="week-row">
      <strong style="min-width:50px">${weekLabels[wi]}</strong>
      <span>기록 ${w.length}건</span>
      <span>평균 ${_scoreLabel()}: ${wAvg}</span>
      <span>최대: ${wMax}</span>
      <span>투약: ${wMeds}일</span>
    </div>`;
  });
  html+=`</div>`;

  // Detailed log table
  if(last30.length) {
    html+=`<div class="section"><h2>상세 기록</h2><table><tr><th>날짜</th><th>시간</th><th>${_scoreLabel()}</th><th>증상</th><th>투약</th><th>메모</th></tr>`;
    last30.forEach(l=>{
      const nrsCls=l.nrs>=7?'nrs-high':l.nrs>=4?'nrs-med':'nrs-low';
      html+=`<tr><td>${l.datetime.slice(0,10)}</td><td>${l.datetime.slice(11,16)}</td>
        <td class="${l.nrs>=0?nrsCls:''}">${l.nrs>=0?l.nrs:'-'}</td>
        <td>${(l.symptoms||[]).map(s=>esc(s)).join(', ')||'-'}</td><td>${(l.meds||[]).map(m=>esc(m)).join(', ')||'-'}</td>
        <td>${esc(l.memo||'-')}</td></tr>`;
    });
    html+=`</table></div>`;
  }

  // Drug interaction warnings
  const interactions=checkDrugInteractions();
  if(interactions.length) {
    html+=`<div class="section"><h2>⚠️ 약물 상호작용 경고</h2><table><tr><th>약물 조합</th><th>위험도</th><th>설명</th></tr>`;
    interactions.forEach(w=>{
      html+=`<tr><td>${w.drugA} + ${w.drugB}</td><td>${w.severity==='high'?'위험':'주의'}</td><td>${w.desc}</td></tr>`;
    });
    html+=`</table></div>`;
  }

  html+=`<div class="footer">이 리포트는 Orangi Health AI 협진 시스템에서 자동 생성되었습니다.<br>의료적 결정은 반드시 담당 전문의와 상담 후 진행하세요.<br>생성: ${today} | Orangi Health v9.0</div>`;
  html+=`</body></html>`;

  const w=window.open('','_blank');
  if(!w){showToast('⚠️ 팝업이 차단되었습니다. 팝업을 허용해 주세요.',4000);return;}
  w.document.write(html);
  w.document.close();
  setTimeout(()=>{w.print();},500);
}

// ═══════════════════════════════════════════════════════════════
// AI 질문 자동 추천 — 최근 패턴 기반
// ═══════════════════════════════════════════════════════════════
function generateAIQuestionSuggestions() {
  const ds=D(); const lc=DC().logConfig; const dc=DC();
  if(lc.customFields) return [];
  const logs=ds.logData||[];
  const suggestions=[];
  const today=kstToday();

  const recent=logs.filter(l=>{
    const diff=Math.round((new Date(today+'T00:00:00')-new Date(l.datetime.slice(0,10)+'T00:00:00'))/86400000);
    return diff>=0&&diff<=14;
  });

  if(recent.length<3) return [];

  // Pattern 1: High NRS frequency
  const highNrs=recent.filter(l=>l.nrs>=7);
  if(highNrs.length>=3) {
    suggestions.push(`최근 2주간 ${_scoreLabel()} 7 이상이 ${highNrs.length}회 발생했습니다. 예방약 조정이 필요한지 검토해 주세요.`);
  }

  // Pattern 2: Same symptom recurring
  const symFreq={};
  recent.forEach(l=>(l.symptoms||[]).forEach(s=>{symFreq[s]=(symFreq[s]||0)+1;}));
  const topSym=Object.entries(symFreq).sort((a,b)=>b[1]-a[1])[0];
  if(topSym&&topSym[1]>=4) {
    suggestions.push(`"${topSym[0]}" 증상이 ${topSym[1]}회 반복됩니다. 이 증상의 원인과 대처법을 분석해 주세요.`);
  }

  // Pattern 3: Medication overuse
  const medDays=new Set(recent.filter(l=>(l.meds||[]).length).map(l=>l.datetime.slice(0,10))).size;
  if(medDays>=8) {
    suggestions.push(`14일 중 ${medDays}일 약물 복용 — 약물 과용 두통(MOH) 가능성을 평가하고 대안을 제시해 주세요.`);
  }

  // Pattern 4: NRS worsening trend
  const first7=recent.filter(l=>{
    const diff=Math.round((new Date(today+'T00:00:00')-new Date(l.datetime.slice(0,10)+'T00:00:00'))/86400000);
    return diff>7;
  }).filter(l=>l.nrs>=0);
  const last7=recent.filter(l=>{
    const diff=Math.round((new Date(today+'T00:00:00')-new Date(l.datetime.slice(0,10)+'T00:00:00'))/86400000);
    return diff<=7;
  }).filter(l=>l.nrs>=0);
  if(first7.length>=2&&last7.length>=2) {
    const prev=first7.reduce((a,l)=>a+l.nrs,0)/first7.length;
    const cur=last7.reduce((a,l)=>a+l.nrs,0)/last7.length;
    if(cur-prev>=1.5) {
      suggestions.push(`${_scoreLabel()}가 악화 추세입니다 (${prev.toFixed(1)}→${cur.toFixed(1)}). 악화 원인과 치료 전략 변경을 논의해 주세요.`);
    }
  }

  // Pattern 5: New symptom appeared
  const older=logs.filter(l=>{
    const diff=Math.round((new Date(today+'T00:00:00')-new Date(l.datetime.slice(0,10)+'T00:00:00'))/86400000);
    return diff>14&&diff<=60;
  });
  const olderSyms=new Set(older.flatMap(l=>l.symptoms||[]));
  const newSyms=[...new Set(recent.flatMap(l=>l.symptoms||[]))].filter(s=>!olderSyms.has(s));
  if(newSyms.length) {
    suggestions.push(`새로 나타난 증상: ${newSyms.join(', ')} — 이 증상의 의미와 추가 검사 필요 여부를 평가해 주세요.`);
  }

  return suggestions.slice(0,3);
}

function renderAIQuestionSuggestions() {
  if(!_aiSuggestions.length) return '';
  return `<div class="card" style="border-color:var(--ac)">
    <div class="card-title">🤖 AI 질문 추천 <span class="badge badge-blue">패턴 기반</span></div>
    <div style="font-size:.68rem;color:var(--mu);margin-bottom:8px">최근 기록 패턴을 분석하여 세션에서 다룰 질문을 추천합니다.</div>
    ${_aiSuggestions.map((s,i)=>`
      <div style="display:flex;align-items:flex-start;gap:8px;padding:8px 10px;margin-bottom:6px;background:var(--sf2);border-radius:8px;cursor:pointer"
        onclick="startNewSession(_aiSuggestions[${i}])">
        <span style="font-size:.8rem">💬</span>
        <span style="font-size:.78rem;color:var(--ink);line-height:1.5">${esc(s)}</span>
      </div>`).join('')}
  </div>`;
}
let _aiSuggestions=[];

// ═══════════════════════════════════════════════════════════════
// 🍼 BUNGRUKI STATS (임신준비 전용 통계)
// ═══════════════════════════════════════════════════════════════
function _renderBungrukiStats(){
  const m=typeof getBrkMaster==='function'?getBrkMaster():null;
  if(!m) return '<div class="hint">데이터 로딩 중...</div>';

  // 임신확률 카드
  const rateHtml=typeof _renderConceptionCard==='function'?_renderConceptionCard(m):'';

  // 영양제 순응도 (30일)
  const today=kstToday();
  let supplDays=0,supplTotal=0;
  for(let i=0;i<30;i++){
    const d=kstDaysAgo(i);
    const dc=m.dailyChecks?.[d];
    if(!dc)continue;
    const o=dc.orangi||{},b=dc.bung||{};
    const oKeys=typeof BRK_SUPPL_ORANGI!=='undefined'?BRK_SUPPL_ORANGI:[];
    const bKeys=typeof BRK_SUPPL_BUNG!=='undefined'?BRK_SUPPL_BUNG:[];
    const oCount=oKeys.filter(k=>o[k]).length;
    const bCount=bKeys.filter(k=>b[k]).length;
    if(oCount||bCount){supplDays++;supplTotal+=oCount+bCount;}
  }

  // 주기 통계
  const cycles=(m.menstrualCycles||[]).sort((a,b)=>b.startDate.localeCompare(a.startDate));
  const lens=[];
  const sorted=[...cycles].sort((a,b)=>a.startDate.localeCompare(b.startDate));
  for(let i=0;i<sorted.length-1;i++){
    const d=Math.round((new Date(sorted[i+1].startDate+'T00:00:00')-new Date(sorted[i].startDate+'T00:00:00'))/86400000);
    if(d>0&&d<60)lens.push(d);
  }
  const avgCycle=lens.length?Math.round(lens.reduce((a,b)=>a+b,0)/lens.length):'-';
  const cycleStd=lens.length>=3?Math.round(Math.sqrt(lens.reduce((s,v)=>s+Math.pow(v-avgCycle,2),0)/lens.length)*10)/10:'-';

  // 검사 결과 요약
  const labs=m.labResults||[];
  const semen=labs.filter(l=>l.type==='semen'&&l.values).sort((a,b)=>b.date.localeCompare(a.date));
  const hormone=labs.filter(l=>l.type==='hormone'&&l.values).sort((a,b)=>b.date.localeCompare(a.date));
  let semenSummary='미검사';
  if(semen.length){
    const g=typeof _semenGrade==='function'?_semenGrade(semen[0].values):{grade:'-',norm:{}};
    const n=g.norm||{};
    semenSummary=`<span style="color:${g.color};font-weight:600">${g.grade}</span> Vol:${n.volume||'-'} Count:${n.count||'-'} Mot:${n.motility||'-'}% Morph:${n.morphology||'-'}%`;
  }

  // 마일스톤 진행률
  const milestones=m.milestones||[];
  const done=milestones.filter(x=>x.done).length;
  const total=milestones.length;
  const milePct=total?Math.round(done/total*100):0;

  return `
    ${rateHtml}
    <div class="card">
      <div class="card-title">🍼 임신 준비 — 30일 요약</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div style="text-align:center;padding:12px;background:var(--sf2);border-radius:8px;border:1px solid var(--bd)">
          <div style="font-size:.68rem;color:var(--mu)">영양제 복용일</div>
          <div style="font-size:1.2rem;font-weight:700;color:#16a34a">${supplDays}/30일</div>
        </div>
        <div style="text-align:center;padding:12px;background:var(--sf2);border-radius:8px;border:1px solid var(--bd)">
          <div style="font-size:.68rem;color:var(--mu)">마일스톤</div>
          <div style="font-size:1.2rem;font-weight:700;color:${milePct>=80?'#10b981':milePct>=50?'#f59e0b':'#ef4444'}">${done}/${total} (${milePct}%)</div>
        </div>
        <div style="text-align:center;padding:12px;background:var(--sf2);border-radius:8px;border:1px solid var(--bd)">
          <div style="font-size:.68rem;color:var(--mu)">평균 주기</div>
          <div style="font-size:1.2rem;font-weight:700;color:var(--ink)">${avgCycle}일 <span style="font-size:.7rem;color:var(--mu)">±${cycleStd}</span></div>
        </div>
        <div style="text-align:center;padding:12px;background:var(--sf2);border-radius:8px;border:1px solid var(--bd)">
          <div style="font-size:.68rem;color:var(--mu)">기록 주기 수</div>
          <div style="font-size:1.2rem;font-weight:700;color:var(--ink)">${cycles.length}회</div>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-title">🔬 최신 검사 결과</div>
      <div style="font-size:.78rem;margin-bottom:6px">정액검사: ${semenSummary}</div>
      ${semen.length?`<div style="font-size:.65rem;color:var(--mu)">검사일: ${semen[0].date}</div>`:''}
      ${hormone.length?`<div style="font-size:.78rem;margin-top:6px">호르몬: ${Object.entries(hormone[0].values).map(([k,v])=>k+':'+v).join(' · ')}</div>`:''}
      <button onclick="switchView('meds')" style="margin-top:8px;font-size:.72rem;padding:5px 14px;border:1.5px solid var(--ac);border-radius:6px;background:none;color:var(--ac);cursor:pointer;font-family:var(--font)">📋 검사 결과 관리 →</button>
    </div>
    ${_renderIntimacyStats(m)}`;
}

// ── 관계 빈도 통계 + 가임기 적중률 ──
function _renderIntimacyStats(m) {
  const dc = m.dailyChecks || {};
  const cycles = (m.menstrualCycles || []).sort((a, b) => a.startDate.localeCompare(b.startDate));
  const avgLen = typeof getAvgCycleLength === 'function' ? getAvgCycleLength(cycles) : 28;

  // 관계 기록 수집 (최근 180일)
  const today = kstToday();
  const records = [];
  for (let i = 0; i < 180; i++) {
    const d = kstDaysAgo(i);
    if (dc[d]?.intimacy) records.push({ date: d, ...dc[d].intimacy });
  }
  if (!records.length) return '';
  records.reverse(); // 오래된 순

  // 월별 빈도
  const byMonth = {};
  records.forEach(r => { const m2 = r.date.slice(0, 7); byMonth[m2] = (byMonth[m2] || 0) + 1; });
  const monthKeys = Object.keys(byMonth).sort();
  const avgPerMonth = records.length && monthKeys.length ? Math.round(records.length / monthKeys.length * 10) / 10 : 0;

  // 주별 빈도 (최근 12주)
  const weekCounts = [];
  for (let w = 0; w < 12; w++) {
    let cnt = 0;
    for (let d = 0; d < 7; d++) {
      const dt = kstDaysAgo(w * 7 + d);
      if (dc[dt]?.intimacy) cnt++;
    }
    weekCounts.push(cnt);
  }
  weekCounts.reverse();
  const maxWeek = Math.max(...weekCounts, 1);

  // 주별 바 차트
  const weekBars = weekCounts.map((c, i) => {
    const h = Math.round(c / maxWeek * 40);
    const label = i === weekCounts.length - 1 ? '이번주' : (weekCounts.length - 1 - i) + '주전';
    return `<div style="display:flex;flex-direction:column;align-items:center;flex:1;min-width:0">
      <div style="font-size:.5rem;color:var(--mu);margin-bottom:2px">${c}</div>
      <div style="width:100%;max-width:18px;height:${h}px;background:${c ? '#ec4899' : 'var(--bd)'};border-radius:3px 3px 0 0"></div>
      <div style="font-size:.42rem;color:var(--mu2);margin-top:2px">${i % 2 === 0 ? label : ''}</div>
    </div>`;
  }).join('');

  // 가임기 적중률 계산
  let fertileCount = 0, ovDayCount = 0, nonFertileCount = 0;
  const ovDayDiffs = []; // 배란일 기준 차이 수집 (히스토그램용)
  records.forEach(r => {
    if (typeof _getFertileStatus !== 'function') return;
    const fs = _getFertileStatus(m, r.date);
    if (fs.status === 'ovulation') { ovDayCount++; fertileCount++; }
    else if (fs.status === 'fertile') fertileCount++;
    else nonFertileCount++;
    if (fs.daysToOv !== null && Math.abs(fs.daysToOv) <= 7) ovDayDiffs.push(fs.daysToOv);
  });
  const totalWithStatus = fertileCount + nonFertileCount;
  const fertileRate = totalWithStatus ? Math.round(fertileCount / totalWithStatus * 100) : 0;

  // 배란일 기준 타이밍 히스토그램 (-7 ~ +7)
  const histogram = {};
  for (let d = -7; d <= 7; d++) histogram[d] = 0;
  ovDayDiffs.forEach(d => { if (histogram[d] !== undefined) histogram[d]++; });
  const maxHist = Math.max(...Object.values(histogram), 1);
  const histBars = [];
  for (let d = -7; d <= 7; d++) {
    const c = histogram[d];
    const h = Math.round(c / maxHist * 50);
    const isFertile = d >= -3 && d <= 3;
    const isOv = d === 0;
    const color = isOv ? '#8b5cf6' : isFertile ? '#ec4899' : 'var(--bd2)';
    const bg = c ? color : 'var(--bd)';
    histBars.push(`<div style="display:flex;flex-direction:column;align-items:center;flex:1;min-width:0">
      <div style="font-size:.48rem;color:${c ? color : 'var(--mu2)'};margin-bottom:1px">${c || ''}</div>
      <div style="width:100%;max-width:14px;height:${h || 2}px;background:${bg};border-radius:2px 2px 0 0"></div>
      <div style="font-size:.45rem;color:${isOv ? '#8b5cf6' : 'var(--mu2)'};margin-top:1px;font-weight:${isOv ? '700' : '400'}">${d > 0 ? '+' + d : d}</div>
    </div>`);
  }

  return `<div class="card">
    <div class="card-title">❤️ 관계 빈도 통계</div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:10px">
      <div style="text-align:center;padding:10px;background:var(--sf2);border-radius:8px;border:1px solid var(--bd)">
        <div style="font-size:.68rem;color:var(--mu)">총 기록</div>
        <div style="font-size:1.2rem;font-weight:700;color:#ec4899">${records.length}회</div>
      </div>
      <div style="text-align:center;padding:10px;background:var(--sf2);border-radius:8px;border:1px solid var(--bd)">
        <div style="font-size:.68rem;color:var(--mu)">월 평균</div>
        <div style="font-size:1.2rem;font-weight:700;color:var(--ink)">${avgPerMonth}회</div>
      </div>
      <div style="text-align:center;padding:10px;background:var(--sf2);border-radius:8px;border:1px solid var(--bd)">
        <div style="font-size:.68rem;color:var(--mu)">가임기 비율</div>
        <div style="font-size:1.2rem;font-weight:700;color:${fertileRate >= 50 ? '#10b981' : fertileRate >= 30 ? '#f59e0b' : '#ef4444'}">${fertileRate}%</div>
      </div>
    </div>
    <div style="font-size:.68rem;font-weight:600;color:var(--mu);margin-bottom:4px">📊 주간 빈도 (12주)</div>
    <div style="display:flex;gap:2px;align-items:flex-end;height:60px;padding:0 4px;margin-bottom:12px">${weekBars}</div>
    ${monthKeys.length ? `<div style="font-size:.62rem;color:var(--mu);margin-bottom:8px">월별: ${monthKeys.slice(-4).map(k => k.slice(5) + '월 ' + byMonth[k] + '회').join(' · ')}</div>` : ''}
  </div>
  ${ovDayDiffs.length ? `<div class="card">
    <div class="card-title">🎯 가임기 적중률</div>
    <div style="display:flex;gap:8px;margin-bottom:10px">
      <div style="flex:1;text-align:center;padding:8px;background:#fdf2f8;border:1px solid #fbcfe8;border-radius:8px">
        <div style="font-size:.62rem;color:#be185d">가임기 내</div>
        <div style="font-size:1.1rem;font-weight:700;color:#ec4899">${fertileCount}회</div>
      </div>
      <div style="flex:1;text-align:center;padding:8px;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px">
        <div style="font-size:.62rem;color:#6d28d9">배란 추정일</div>
        <div style="font-size:1.1rem;font-weight:700;color:#8b5cf6">${ovDayCount}회</div>
      </div>
      <div style="flex:1;text-align:center;padding:8px;background:var(--sf2);border:1px solid var(--bd);border-radius:8px">
        <div style="font-size:.62rem;color:var(--mu)">비가임기</div>
        <div style="font-size:1.1rem;font-weight:700;color:var(--mu)">${nonFertileCount}회</div>
      </div>
    </div>
    <div style="font-size:.68rem;font-weight:600;color:var(--mu);margin-bottom:4px">📈 배란일 기준 타이밍 (D-7 ~ D+7)</div>
    <div style="display:flex;gap:1px;align-items:flex-end;height:65px;padding:0 2px;margin-bottom:4px">${histBars.join('')}</div>
    <div style="display:flex;justify-content:center;gap:12px;font-size:.55rem;color:var(--mu)">
      <span style="color:#ec4899">● 가임기 (D-3~D+3)</span>
      <span style="color:#8b5cf6">● 배란 추정일 (D0)</span>
    </div>
    <div style="font-size:.62rem;color:var(--mu2);margin-top:6px;text-align:center">
      💡 D-2~D0 타이밍이 임신 확률 가장 높음 (배란 2일 전~당일)
    </div>
  </div>` : ''}`;
}
