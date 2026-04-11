// js/log.js — 증상 기록 시스템 (Phase 4 모듈화)

// 도메인별 점수 짧은 라벨 (NRS/기분/컨디션)
function _scoreLabel() {
  const nrsLabel = DC()?.logConfig?.nrsLabel || DC()?.nrsLabel;
  if (!nrsLabel) return 'NRS';
  if (nrsLabel.includes('통증') || nrsLabel.includes('NRS')) return 'NRS';
  if (nrsLabel.includes('기분')) return '기분';
  return '컨디션';
}

// ═══════════════════════════════════════════════════════════════
// MARKDOWN RENDERER (simple)
// ═══════════════════════════════════════════════════════════════
function renderMD(text) {
  if(!text) return '';
  if(typeof marked !== 'undefined') {
    try {
      marked.setOptions({breaks:true, gfm:true});
      return DOMPurify ? DOMPurify.sanitize(marked.parse(text)) : marked.parse(text);
    } catch(e) {}
  }
  // Fallback if marked.js not loaded
  return esc(text).replace(/\n/g,'<br>');
}

// ═══════════════════════════════════════════════════════════════
// LOG SYSTEM (domain-specific)
// ═══════════════════════════════════════════════════════════════
function getYM(){return kstMonth();}
function logFileName(ym){return `${DC().logPrefix}_${ym}.json`;}

async function ensureLogLoaded() {
  const ds=D(); const ym=getYM();
  if(ds.logMonth===ym && ds.logFileId!==undefined) return;
  ds.logMonth=ym;
  try {
    const files=await driveSearch(logFileName(ym),ds.folderId);
    if(files.length>0){ds.logFileId=files[0].id;const d=await driveRead(ds.logFileId);ds.logData=Array.isArray(d)?d:[];}
    else{ds.logData=[];ds.logFileId=null;}
  } catch(e){ds.logData=[];ds.logFileId=null;}
}
async function saveLogData() {
  const ds=D(); if(!ds.folderId) return;
  if(ds.logFileId) await driveUpdate(ds.logFileId,ds.logData);
  else ds.logFileId=await driveCreate(logFileName(ds.logMonth),ds.logData,ds.folderId);
}

function nrsColor(n){if(n<=3)return'#2d8a5a';if(n<=6)return'#e67e22';return'#c03030';}
function toggleChip(el,cls){el.classList.toggle('sel');el.classList.toggle(cls,el.classList.contains('sel'));}

async function setLogView(v){S.logView=v;await ensureLogLoaded();renderView('log');}

async function loadLogMonth(ym) {
  const ds=D();
  ds.logMonth=ym;
  try {
    const files=await driveSearch(logFileName(ym),ds.folderId);
    if(files.length>0){ds.logFileId=files[0].id;const d=await driveRead(ds.logFileId);ds.logData=Array.isArray(d)?d:[];}
    else{ds.logData=[];ds.logFileId=null;}
  } catch(e){ds.logData=[];ds.logFileId=null;}
  renderView('log');
}

async function changeLogMonth(delta) {
  const ds=D();
  const cur=ds.logMonth||kstMonth();
  const [y,m]=cur.split('-').map(Number);
  const d=new Date(y, m-1+delta, 1);
  const ym=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
  // 미래 달은 로드하지 않음
  if(ym>kstMonth()) return;
  // 이전 달 이동 시 기록 존재 여부 확인
  if(delta<0 && ds.folderId) {
    try {
      const files=await driveSearch(logFileName(ym),ds.folderId);
      if(!files.length) { showToast('📭 '+ym+' 기록 없음'); return; }
    } catch(e) { console.error('Failed to check previous month log:', e); showToast('⚠️ 기록 확인 중 오류'); return; }
  }
  await loadLogMonth(ym);
}

// ── 빠른 기록 (quick.html) 연동 ──
let _quickLogCache = null; // 클라우드+로컬 병합 캐시

function getQuickLogs() {
  if (_quickLogCache) return _quickLogCache;
  try { return JSON.parse(localStorage.getItem('om_quick_logs') || '[]').filter(l=>l._type!=='config'); } catch { return []; }
}
function getPendingQuickLogs() { return getQuickLogs().filter(l => !l.synced); }
function saveQuickLogs(logs) {
  localStorage.setItem('om_quick_logs', JSON.stringify(logs));
  _quickLogCache = logs;
  updateQuickLogBadge();
}

const _DEFAULT_SYNC_URL = 'https://script.google.com/macros/s/AKfycbzYF46qeLJRGIQsqfXbic6ITRGKr1eA9chrVJ8Fu5_gM7TDSYUFlpaWQGmSR9RdAACjzw/exec';
function getQuickSyncUrl() { return localStorage.getItem('om_quick_sync_url') || _DEFAULT_SYNC_URL; }

async function fetchQuickLogsFromCloud() {
  const url = getQuickSyncUrl();
  if (!url) return null;
  try {
    const res = await fetch(url, { redirect: 'follow' });
    const text = await res.text();
    const data = JSON.parse(text);
    return data.ok ? data.entries : null;
  } catch(e) { console.warn('Quick log cloud fetch failed:', e); return null; }
}

async function markSyncedOnCloud(ids) {
  const url = getQuickSyncUrl();
  if (!url || !ids.length) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'markSynced', ids }),
      redirect: 'follow'
    });
  } catch(e) { console.warn('markSynced failed:', e); }
}

function mergeQuickLogs(local, cloud) {
  if (!cloud) return local;
  // 클라우드가 진실: 클라우드 기반으로 병합
  const cloudMap = new Map(cloud.map(c=>[String(c.id), c]));
  const merged = [...cloud];
  // 로컬에만 있는 미전송 항목만 추가
  local.forEach(l => {
    const ce = cloudMap.get(String(l.id));
    if (!ce && !l.synced) merged.push(l);
  });
  return merged.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
}

function updateQuickLogBadge() {
  const badge = document.getElementById('quick-log-badge');
  if (!badge) return;
  if (S.currentDomain !== 'orangi-migraine') { badge.style.display = 'none'; return; }
  const count = getPendingQuickLogs().length;
  if (count > 0) {
    badge.textContent = count;
    badge.style.display = 'inline';
  } else {
    badge.style.display = 'none';
  }
}

// 주기적 체크: 로컬 + 클라우드에서 새 기록 감지
let _lastQuickLogCount = 0;
let _cloudPollTimer = null;

function checkQuickLogUpdates() {
  const pending = getPendingQuickLogs();
  const count = pending.length;
  if (count > _lastQuickLogCount && _lastQuickLogCount >= 0) {
    const newCount = count - _lastQuickLogCount;
    showToast(`📱 오랑이가 두통 ${newCount}건을 기록했습니다`, 4000);
    // 새 기록에 대해 푸시 알림
    const newEntries = pending.slice(-newCount);
    newEntries.forEach(e => sendQuickLogNotification(e));
    updateQuickLogBadge();
    if (S.currentView === 'log') renderView('log');
  }
  _lastQuickLogCount = count;
  updateQuickLogBadge();
}

function sendQuickLogNotification(entry) {
  if (!('Notification' in window)) { console.warn('Notification API not available'); return; }
  if (Notification.permission !== 'granted') { console.warn('Notification permission:', Notification.permission); return; }
  const nrsText = entry.nrs >= 0 ? `${_scoreLabel()} ${entry.nrs}/10` : '기록';
  const syms = (entry.symptoms || []).join(', ');
  const meds = (entry.meds || []).join(', ');
  const time = entry.datetime?.slice(11, 16) || '';
  const lines = [nrsText];
  if (syms) lines.push(syms);
  if (meds) lines.push('💊 ' + meds);
  try {
    const n = new Notification('🤕 오랑이가 두통을 기록했어요', {
      body: lines.join('\n') + (time ? '\n🕐 ' + time : ''),
      icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🤕</text></svg>",
      tag: 'quicklog-' + (entry.id || Date.now()),
      vibrate: [300, 100, 300],
      requireInteraction: true,
      silent: false
    });
    n.onclick = () => { window.focus(); switchView('log'); n.close(); };
  } catch (e) {}
}

async function pollCloudQuickLogs() {
  const cloud = await fetchQuickLogsFromCloud();
  if (!cloud || !cloud.length) return;
  const local = JSON.parse(localStorage.getItem('om_quick_logs') || '[]');
  const merged = mergeQuickLogs(local, cloud);
  const localIds = new Set(local.map(l=>String(l.id)));
  const newFromCloud = merged.filter(l=>!localIds.has(String(l.id)));
  // outcome 변경 감지 (rate.html에서 경과 기록 시)
  const outcomeChanged = cloud.some(ce => {
    const le = local.find(l=>String(l.id)===String(ce.id));
    return le && ce.outcome && (!le.outcome || le.outcome.rating !== ce.outcome.rating);
  });
  if (merged.length !== local.length || newFromCloud.length > 0 || outcomeChanged) {
    _quickLogCache = null; // 캐시 초기화
    localStorage.setItem('om_quick_logs', JSON.stringify(merged));
    updateQuickLogBadge();
  }
  checkQuickLogUpdates();
}

// 로컬 체크: 10초, 클라우드 체크: 3분
setInterval(checkQuickLogUpdates, 10000);
setInterval(pollCloudQuickLogs, 60000); // 1분마다 클라우드 확인
// 앱이 포그라운드로 돌아올 때 즉시 체크 + 데일리체크↔메인앱 양방향 동기화
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    pollCloudQuickLogs();
    _syncReloadCurrentMonth();
  }
});
async function _syncReloadCurrentMonth(){
  if(!S.token||!S.currentDomain) return;
  const ds=D(); if(!ds.folderId||!ds.logMonth) return;
  try{
    const files=await driveSearch(logFileName(ds.logMonth),ds.folderId);
    if(files.length>0){ds.logFileId=files[0].id;const d=await driveRead(ds.logFileId);ds.logData=Array.isArray(d)?d:[];}
    else{ds.logData=[];ds.logFileId=null;}
    if(document.querySelector('.log-month')||document.querySelector('.cal-grid')) renderView(S.currentView||'log');
  }catch(e){console.error('Sync reload:',e);}
}

function renderQuickLogBanner() {
  if (S.currentDomain !== 'orangi-migraine') return '';
  const pending = getPendingQuickLogs();
  if (!pending.length) return '';
  return '<div class="quick-log-banner">'
    +'<div class="qlb-head">'
    +'<span class="qlb-icon">📱</span>'
    +'<span class="qlb-title">빠른 기록 '+pending.length+'건 미반영</span>'
    +'<button class="qlb-btn-all" onclick="importSelectedQuickLogs()">선택 반영</button>'
    +'<button class="qlb-btn-all" onclick="discardSelectedQuickLogs()" style="background:#ef4444">선택 삭제</button>'
    +'</div>'
    +'<div style="display:flex;gap:8px;padding:4px 12px;border-bottom:1px solid var(--bd)">'
    +'<label style="font-size:.68rem;color:var(--mu);display:flex;align-items:center;gap:4px;cursor:pointer"><input type="checkbox" onchange="toggleAllQuickSelect(this.checked)"> 전체 선택</label>'
    +'<button style="font-size:.65rem;background:none;border:none;color:var(--ac);cursor:pointer;padding:0" onclick="importAllQuickLogs()">전체 반영</button>'
    +'<button style="font-size:.65rem;background:none;border:none;color:#ef4444;cursor:pointer;padding:0" onclick="discardAllQuickLogs()">전체 삭제</button>'
    +'</div>'
    +'<div class="qlb-list">'+pending.map(function(l){
      var dt=l.datetime.split('T');
      var timeStr=dt[1]==='시간미상'?'시간미상':dt[1];
      var nrsHtml=l.nrs>=0?'<span class="log-item-nrs" style="background:'+nrsColor(l.nrs)+'20;color:'+nrsColor(l.nrs)+'">'+_scoreLabel()+' '+l.nrs+'</span>':'';
      var tags=[].concat(
        (l.sites||[]).map(function(s){return '<span class="log-tag" style="background:#eff6ff;color:#1d4ed8">'+esc(s)+'</span>';}),
        (l.symptoms||[]).map(function(s){return '<span class="log-tag" style="background:#faf5ff;color:#7c3aed">'+esc(s)+'</span>';}),
        (l.meds||[]).map(function(s){return '<span class="log-tag" style="background:#fff7ed;color:#c2410c">'+esc(s)+'</span>';}),
        (l.treatments||[]).map(function(s){return '<span class="log-tag" style="background:#f0fdf4;color:#15803d">'+esc(s)+'</span>';})
      ).join('');
      return '<div class="qlb-item" id="qlb-'+l.id+'">'
        +'<div class="qlb-item-head">'
        +'<input type="checkbox" class="ql-select" data-id="'+l.id+'" style="margin-right:6px">'
        +'<span class="log-item-time">'+dt[0].slice(5)+' '+timeStr+'</span>'
        +nrsHtml
        +'</div>'
        +(tags?'<div class="log-item-tags">'+tags+'</div>':'')
        +(l.memo?'<div style="font-size:.78rem;color:var(--mu);margin-top:3px">'+esc(l.memo)+'</div>':'')
        +'<div class="qlb-actions">'
        +'<button class="qlb-btn" onclick="reviewQuickLog('+l.id+')">검토/수정</button>'
        +'<button class="qlb-btn green" onclick="importQuickLog('+l.id+')">반영</button>'
        +'<button class="qlb-btn del" onclick="discardQuickLog('+l.id+')">삭제</button>'
        +'</div></div>';
    }).join('')+'</div></div>';
}

function toggleAllQuickSelect(checked) {
  document.querySelectorAll('.ql-select').forEach(function(cb){ cb.checked=checked; });
}
function getSelectedQuickIds() {
  var ids=[];
  document.querySelectorAll('.ql-select:checked').forEach(function(cb){ ids.push(parseInt(cb.dataset.id)); });
  return ids;
}
async function importSelectedQuickLogs() {
  var ids=getSelectedQuickIds();
  if(!ids.length){showToast('선택된 항목이 없습니다');return;}
  if(!confirm(ids.length+'건을 반영할까요?'))return;
  for(var i=0;i<ids.length;i++) await importQuickLog(ids[i]);
}
async function discardSelectedQuickLogs() {
  var ids=getSelectedQuickIds();
  if(!ids.length){showToast('선택된 항목이 없습니다');return;}
  if(!confirm(ids.length+'건을 삭제할까요?'))return;
  var logs=getQuickLogs().filter(function(l){return ids.indexOf(l.id)===-1;});
  saveQuickLogs(logs);
  try{var url=getQuickSyncUrl();if(url)await fetch(url,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'replaceAll',entries:logs}),redirect:'follow'});}catch(e){}
  showToast('🗑 '+ids.length+'건 삭제됨');
  renderView('log');
}
async function discardAllQuickLogs() {
  var pending=getPendingQuickLogs();
  if(!pending.length)return;
  if(!confirm('미반영 '+pending.length+'건을 모두 삭제할까요?'))return;
  var ids=pending.map(function(l){return l.id;});
  var logs=getQuickLogs().filter(function(l){return ids.indexOf(l.id)===-1;});
  saveQuickLogs(logs);
  try{var url=getQuickSyncUrl();if(url)await fetch(url,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'replaceAll',entries:logs}),redirect:'follow'});}catch(e){}
  showToast('🗑 '+ids.length+'건 삭제됨');
  renderView('log');
}

// 개별 빠른 기록 → 편집 폼에 로드
function reviewQuickLog(id) {
  const logs = getQuickLogs();
  const entry = logs.find(l => l.id === id);
  if (!entry) return;
  // 폼 탭으로 전환
  S.logView = 'form';
  renderView('log');
  // 폼에 값 채우기
  setTimeout(() => {
    const dt = entry.datetime.split('T');
    const dateInput = document.getElementById('log-date');
    if (dateInput) dateInput.value = dt[0];
    const timeInput = document.getElementById('log-time');
    const timeUnk = document.getElementById('log-time-unknown');
    if (dt[1] === '시간미상') {
      if (timeUnk) { timeUnk.checked = true; timeUnk.dispatchEvent(new Event('change')); }
    } else if (timeInput) {
      timeInput.value = dt[1];
    }
    // NRS
    const skipNrs = document.getElementById('log-skip-nrs');
    if (entry.nrs === -1) {
      if (skipNrs) { skipNrs.checked = true; skipNrs.dispatchEvent(new Event('change')); }
    } else {
      const nrsSlider = document.getElementById('log-nrs');
      const nrsVal = document.getElementById('log-nrs-val');
      if (nrsSlider) { nrsSlider.value = entry.nrs; }
      if (nrsVal) { nrsVal.textContent = entry.nrs; }
    }
    // 칩 선택 + 매칭 안 되는 값은 직접입력 필드에 추가
    const _unmatchedSites={left:[],right:[]};
    (entry.sites || []).forEach(s => {
      const side = s.startsWith('왼쪽') ? 'left' : 'right';
      const val = s.replace(/^(왼쪽|오른쪽)\s*/, '');
      let matched=false;
      document.querySelectorAll(`.log-chip[data-side="${side}"]`).forEach(el => {
        if (el.dataset.val === val && !el.classList.contains('sel')) { toggleChip(el, 'sel-' + side); matched=true; }
      });
      if(!matched) _unmatchedSites[side].push(val);
    });
    const slo=document.getElementById('site-left-other');if(slo&&_unmatchedSites.left.length)slo.value=_unmatchedSites.left.join(', ');
    const sro=document.getElementById('site-right-other');if(sro&&_unmatchedSites.right.length)sro.value=_unmatchedSites.right.join(', ');
    // 칩 선택: 증상
    const _unmatchedSym=[];
    (entry.symptoms || []).forEach(s => {
      let matched=false;
      document.querySelectorAll('.log-chip[data-group="sym"]').forEach(el => {
        if (el.dataset.val === s && !el.classList.contains('sel')) { toggleChip(el, 'sel-sym'); matched=true; }
      });
      if(!matched) _unmatchedSym.push(s);
    });
    const so=document.getElementById('sym-other');if(so&&_unmatchedSym.length)so.value=_unmatchedSym.join(', ');
    // 칩 선택: 약물
    const _unmatchedMed=[];
    (entry.meds || []).forEach(m => {
      let matched=false;
      document.querySelectorAll('.log-chip[data-group="med"]').forEach(el => {
        if (el.dataset.val === m && !el.classList.contains('sel')) { toggleChip(el, 'sel-med'); matched=true; }
      });
      if(!matched) _unmatchedMed.push(m);
    });
    const mo=document.getElementById('med-other');if(mo&&_unmatchedMed.length)mo.value=_unmatchedMed.join(', ');
    // 칩 선택: 시술
    const _unmatchedTx=[];
    (entry.treatments || []).forEach(t => {
      let matched=false;
      document.querySelectorAll('.log-chip[data-group="tx"]').forEach(el => {
        if (el.dataset.val === t && !el.classList.contains('sel')) { toggleChip(el, 'sel-tx'); matched=true; }
      });
      if(!matched) _unmatchedTx.push(t);
    });
    const txo=document.getElementById('tx-other');if(txo&&_unmatchedTx.length)txo.value=_unmatchedTx.join(', ');
    // 메모
    const memo = document.getElementById('log-memo');
    if (memo) memo.value = entry.memo || '';
    // 빠른기록 ID를 숨김필드에 저장 (저장 시 synced 마킹용)
    let qidInput = document.getElementById('log-quick-id');
    if (!qidInput) {
      qidInput = document.createElement('input');
      qidInput.type = 'hidden'; qidInput.id = 'log-quick-id';
      document.getElementById('log-edit-idx')?.parentNode.appendChild(qidInput);
    }
    qidInput.value = id;
    showToast('📱 빠른 기록 로드됨 — 수정 후 저장하세요');
  }, 100);
}

// 개별 빠른 기록 → 바로 반영
async function importQuickLog(id) {
  const logs = getQuickLogs();
  const entry = logs.find(l => l.id === id);
  if (!entry) return;
  await ensureLogLoaded();
  const ds = D();
  const newEntry = {
    id: Date.now(),
    datetime: entry.datetime,
    nrs: entry.nrs,
    mood: '',
    sites: entry.sites || [],
    symptoms: entry.symptoms || [],
    meds: entry.meds || [],
    treatments: entry.treatments || [],
    triggers: entry.triggers || [],
    memo: entry.memo || ''
  };
  ds.logData.push(newEntry);
  ds.logData.sort((a, b) => a.datetime.localeCompare(b.datetime));
  try {
    await saveLogData();
    entry.synced = true;
    saveQuickLogs(logs);
    markSyncedOnCloud([id]);
    showToast('✅ 반영 완료');
    renderView('log');
  } catch (e) { showToast('❌ 저장 실패: ' + e.message, 4000); }
}

// 전체 반영
async function importAllQuickLogs() {
  const logs = getQuickLogs();
  const pending = logs.filter(l => !l.synced);
  if (!pending.length) return;
  if (!confirm(`빠른 기록 ${pending.length}건을 모두 반영할까요?`)) return;
  await ensureLogLoaded();
  const ds = D();
  const syncedIds = [];
  for (let i = 0; i < pending.length; i++) {
    const entry = pending[i];
    ds.logData.push({
      id: Date.now() + i,
      datetime: entry.datetime,
      nrs: entry.nrs,
      mood: '',
      sites: entry.sites || [],
      symptoms: entry.symptoms || [],
      meds: entry.meds || [],
      treatments: entry.treatments || [],
      memo: entry.memo || ''
    });
    entry.synced = true;
    syncedIds.push(entry.id);
  }
  ds.logData.sort((a, b) => a.datetime.localeCompare(b.datetime));
  try {
    await saveLogData();
    saveQuickLogs(logs);
    markSyncedOnCloud(syncedIds);
    showToast(`✅ ${pending.length}건 반영 완료`);
    renderView('log');
  } catch (e) { showToast('❌ 저장 실패: ' + e.message, 4000); }
}

// 빠른 기록 삭제 (로컬 + 클라우드)
async function discardQuickLog(id) {
  if (!confirm('이 빠른 기록을 삭제할까요?')) return;
  const logs = getQuickLogs().filter(l => l.id !== id);
  saveQuickLogs(logs);
  // 클라우드에 전체 목록 덮어쓰기 (삭제 확실 반영)
  try {
    const url = getQuickSyncUrl();
    if (url) {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'replaceAll', entries: logs }),
        redirect: 'follow'
      });
    }
  } catch (e) {}
  renderView('log');
  showToast('🗑 삭제됨');
}

function renderLog() {
  const dc=DC(); const lc=dc.logConfig;
  const now=new Date();
  const dateStr=kstToday();
  const timeStr=kstTime();
  const viewTabs=['form','list'].map(v=>
    `<button class="log-vtab ${S.logView===v?'active':''}" onclick="setLogView('${v}')">${{form:'➕ 기록',list:'📋 목록'}[v]}</button>`).join('');

  if(S.logView==='list') {
    const lc2=dc.logConfig;
    if(lc2.customFields) return `<div class="log-view-tabs">${viewTabs}</div><div class="export-bar"><button class="btn-export" onclick="exportLogCSV()">📊 CSV 내보내기</button></div>${renderJournalLogs()}`;
    return `<div class="log-view-tabs">${viewTabs}</div>${renderQuickLogBanner()}<div class="export-bar"><button class="btn-export" onclick="exportLogCSV()">📊 CSV 내보내기</button></div>${renderLogList()}`;
  }

  // ── 저널 모드 (건강관리, 붕룩이) ──
  if(lc.customFields) {
    const cats = lc.journalCategories || ['영양제','검사결과','시도/관계','병원방문','약물변경','컨디션','기타'];
    const showWho = S.currentDomain === 'bungruki';
    const brkQuickNav = showWho ? `<div style="padding:10px 14px;margin-bottom:10px;background:var(--sf2);border:1.5px solid var(--bd);border-radius:10px;display:flex;align-items:center;gap:8px">
      <span style="font-size:.78rem;color:var(--mu)">💡 영양제/운동 체크는</span>
      <button class="btn-accum-add" onclick="switchView('meds')" style="font-size:.72rem;padding:4px 10px">🍼 대시보드 → 일일체크</button>
      <span style="font-size:.78rem;color:var(--mu)">에서 더 편하게!</span>
    </div>` : '';
    return `<div class="log-view-tabs">${viewTabs}</div>
    ${brkQuickNav}
    <div class="log-form">
      <div style="display:flex;gap:12px;margin-bottom:8px">
        <div style="flex:1"><div class="log-section-title" style="margin-top:0">날짜</div>
          <input type="date" id="log-date" value="${dateStr}" class="dx-form-input"></div>
        ${showWho ? `<div style="flex:1"><div class="log-section-title" style="margin-top:0">누구</div>
          <select id="log-who" class="dx-form-input" style="cursor:pointer">
            <option value="오랑이">🧡 오랑이</option>
            <option value="붕쌤">🩵 붕쌤</option>
            <option value="함께">💑 함께</option>
          </select></div>` : '<input type="hidden" id="log-who" value="">'}
      </div>
      <div class="log-section-title">카테고리</div>
      <div class="log-chips">
        ${cats.map(s=>s==='|'
          ?'<div style="width:100%;border-top:1px dashed var(--bd);margin:4px 0"></div><div style="font-size:.58rem;color:var(--mu2);margin-bottom:2px">건강 행동</div>'
          :`<div class="log-chip" data-group="cat" data-val="${s}" onclick="toggleChip(this,'sel-sym')">${s}</div>`).join('')}
      </div>
      <div class="log-section-title">내용</div>
      <textarea class="log-memo" id="log-memo" rows="4" placeholder="자유롭게 기록하세요..."></textarea>
      <div class="log-section-title" style="margin-top:12px">${lc.nrsLabel||'컨디션 (0=최악 10=최상)'}</div>
      <div style="display:flex;align-items:center;gap:10px;margin:4px 0">
        <span style="font-size:1.3rem;font-weight:700;min-width:28px;text-align:center" id="journal-nrs-val">-</span>
        <input type="range" id="journal-nrs" min="0" max="10" value="5" disabled style="flex:1;accent-color:var(--ac);height:24px"
          oninput="document.getElementById('journal-nrs-val').textContent=this.value;document.getElementById('journal-nrs-skip').checked=false">
      </div>
      <label style="display:flex;align-items:center;gap:5px;font-size:.73rem;color:var(--mu);cursor:pointer">
        <input type="checkbox" id="journal-nrs-skip" checked onchange="const r=document.getElementById('journal-nrs');r.disabled=this.checked;document.getElementById('journal-nrs-val').textContent=this.checked?'-':r.value"> 기록 안 함
      </label>
      <div id="journal-medcheck-container" style="margin-top:12px"></div>
      <input type="hidden" id="log-edit-idx" value="-1">
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px">
        <button class="btn-cancel" id="log-cancel-edit" style="display:none;font-size:.78rem" onclick="cancelLogEdit()">편집 취소</button>
        <button class="btn-log-save" id="log-save-btn" onclick="saveJournalLog()"><div class="spin" id="log-sp"></div> 💾 <span id="log-save-label">기록 저장</span></button>
      </div>
    </div>
    <div id="recent-logs">${renderJournalLogs()}</div>`;
  }

  // ── 기본 칩 숨김 필터 ──
  const _hidden=getHiddenChips();
  const _hiddenMood=_hidden.mood||[];
  const _hiddenSym=_hidden.sym||[];
  const _hiddenMed=_hidden.med||[];

  // ── 마음관리 모드 (moodMode) ──
  const allMoodOpts=['😞 우울','😶 무감정','😐 보통','🙂 양호','😊 좋음'];
  const visMoodOpts=allMoodOpts.map((s,i)=>({s,i})).filter(({s})=>!_hiddenMood.includes(s));
  const skipNrsHtml = `<label style="display:flex;align-items:center;gap:5px;margin-top:6px;cursor:pointer;font-size:.73rem;color:var(--mu)">
    <input type="checkbox" id="log-skip-nrs" onchange="toggleNrsSkip(this.checked)"> 기록 안함
  </label>`;

  const moodHtml = lc.moodMode ? `
    <div class="log-section-title">${lc.nrsLabel} <button onclick="openChipManager('mood')" style="background:none;border:none;cursor:pointer;font-size:.62rem;color:var(--mu2);margin-left:4px">✏️관리</button></div>
    <div id="nrs-area">
      <div class="log-chips" id="mood-chips">
        ${visMoodOpts.map(({s,i})=>`<div class="log-chip" data-group="mood" data-val="${s}" onclick="selectMood(this,${i})">${s}</div>`).join('')}
      </div>
    </div>
    ${skipNrsHtml}
    <div class="log-section-title" style="margin-top:12px">컨디션 점수 (0=최악 10=최상)</div>
    <div style="display:flex;align-items:center;gap:10px;margin:4px 0">
      <span style="font-size:1.3rem;font-weight:700;min-width:28px;text-align:center" id="mood-nrs-val">-</span>
      <input type="range" id="mood-nrs" min="0" max="10" value="5" disabled style="flex:1;accent-color:var(--ac);height:24px"
        oninput="document.getElementById('mood-nrs-val').textContent=this.value;document.getElementById('mood-nrs-skip').checked=false">
    </div>
    <label style="display:flex;align-items:center;gap:5px;font-size:.73rem;color:var(--mu);cursor:pointer">
      <input type="checkbox" id="mood-nrs-skip" checked onchange="const r=document.getElementById('mood-nrs');r.disabled=this.checked;document.getElementById('mood-nrs-val').textContent=this.checked?'-':r.value"> 기록 안 함
    </label>` : `
    <div class="log-section-title">${lc.nrsLabel}</div>
    <div id="nrs-area">
      <div class="log-nrs">
        <input type="range" min="0" max="10" value="5" id="log-nrs" oninput="document.getElementById('log-nrs-val').textContent=this.value">
        <div class="log-nrs-val" id="log-nrs-val">5</div>
      </div>
    </div>
    ${skipNrsHtml}`;

  // 부위: 기본 + 커스텀
  const customSitesL = JSON.parse(localStorage.getItem('om_custom_sites_left_'+S.currentDomain) || '[]');
  const customSitesR = JSON.parse(localStorage.getItem('om_custom_sites_right_'+S.currentDomain) || '[]');

  const customPainTypes = JSON.parse(localStorage.getItem('om_custom_pain_'+S.currentDomain) || '[]');
  const painTypesHtml = lc.painTypes ? `
    <div class="log-section-title">통증 종류</div>
    <div class="log-chips">${[...lc.painTypes,...customPainTypes].map(p=>`<div class="log-chip" data-group="pain" data-val="${p}" onclick="toggleChip(this,'sel-pain')">${p}</div>`).join('')}
      <div style="display:flex;gap:4px;align-items:center">
        <input class="log-other-input" id="pain-other" placeholder="직접 입력" style="width:80px">
        <button onclick="addCustomPainType()" style="background:var(--ac);color:#fff;border:none;border-radius:5px;padding:4px 8px;font-size:.7rem;cursor:pointer">+고정</button>
      </div>
    </div>` : '';

  const sitesHtml = lc.sites ? `
    <div class="log-section-title">부위 (그림 터치 또는 아래 선택)</div>
    <div id="main-head-diagram"></div>
    <div style="margin-top:4px">
      <div style="font-size:.7rem;color:var(--mu);font-weight:600;margin-bottom:3px">왼쪽</div>
      <div class="log-chips">${[...lc.sites.left,...customSitesL].map(s=>`<div class="log-chip" data-side="left" data-val="${s}" onclick="toggleChip(this,'sel-left');syncMainHeadDiagram()">${s}</div>`).join('')}
        <div style="display:flex;gap:4px;align-items:center">
          <input class="log-other-input" id="site-left-other" placeholder="직접 입력" style="width:80px">
          <button onclick="addCustomSite('left')" style="background:var(--ac);color:#fff;border:none;border-radius:5px;padding:4px 8px;font-size:.7rem;cursor:pointer">+고정</button>
        </div>
      </div>
    </div>
    <div style="margin-top:4px">
      <div style="font-size:.7rem;color:var(--mu);font-weight:600;margin-bottom:3px">오른쪽</div>
      <div class="log-chips">${[...lc.sites.right,...customSitesR].map(s=>`<div class="log-chip" data-side="right" data-val="${s}" onclick="toggleChip(this,'sel-right');syncMainHeadDiagram()">${s}</div>`).join('')}
        <div style="display:flex;gap:4px;align-items:center">
          <input class="log-other-input" id="site-right-other" placeholder="직접 입력" style="width:80px">
          <button onclick="addCustomSite('right')" style="background:var(--ac);color:#fff;border:none;border-radius:5px;padding:4px 8px;font-size:.7rem;cursor:pointer">+고정</button>
        </div>
      </div>
    </div>` : '';

  // 투약: 기본(숨김 제외) + 커스텀
  const customMeds = JSON.parse(localStorage.getItem('om_custom_meds_'+S.currentDomain) || '[]');
  const allMeds = [...(lc.meds||[]).filter(m=>m!=='기타'&&!_hiddenMed.includes(m)), ...customMeds];

  // 증상: 기본(숨김 제외) + 커스텀
  const customSyms = JSON.parse(localStorage.getItem('om_custom_syms_'+S.currentDomain) || '[]');
  const allSyms = [...(lc.symptoms||[]).filter(s=>!_hiddenSym.includes(s)), ...customSyms];

  // 치료: 기본 + 커스텀
  const customTx = JSON.parse(localStorage.getItem('om_custom_tx_'+S.currentDomain) || '[]');
  const allTx = [...(lc.treatments||[]), ...customTx];

  const treatmentHtml = lc.treatments === null
    ? `<div class="log-section-title">치료/시술</div>
       <input class="dx-form-input" id="log-treatment" placeholder="예: 상담, CBT, 명상 등 자유 입력">
       <div style="display:flex;gap:4px;align-items:center;margin-top:4px">
         <button onclick="addCustomChip('tx')" style="background:var(--ac);color:#fff;border:none;border-radius:5px;padding:4px 8px;font-size:.7rem;cursor:pointer">+고정</button>
         <span style="font-size:.65rem;color:var(--mu2)">자주 쓰는 치료를 고정하면 칩으로 표시</span>
       </div>
       ${customTx.length?`<div class="log-chips" style="margin-top:6px">${customTx.map(s=>`<div class="log-chip" data-group="tx" data-val="${s}" onclick="toggleChip(this,'sel-tx')">${s}</div>`).join('')}</div>`:''}`
    : (allTx.length ? `<div class="log-section-title">치료/시술 <button onclick="openChipManager('tx')" style="background:none;border:none;cursor:pointer;font-size:.62rem;color:var(--mu2);margin-left:4px">✏️관리</button></div>
       <div class="log-chips">${allTx.map(s=>`<div class="log-chip" data-group="tx" data-val="${s}" onclick="toggleChip(this,'sel-tx')">${s}</div>`).join('')}
       <div style="display:flex;gap:4px;align-items:center">
         <input class="log-other-input" id="tx-other" placeholder="직접 입력" style="width:100px">
         <button onclick="addCustomChip('tx')" style="background:var(--ac);color:#fff;border:none;border-radius:5px;padding:4px 8px;font-size:.7rem;cursor:pointer">+고정</button>
       </div>
       </div>` : '');

  // 트리거 칩 (triggers가 있는 도메인만)
  let customTriggers=[];try{customTriggers=JSON.parse(localStorage.getItem('om_custom_triggers_'+S.currentDomain)||'[]');}catch(e){}
  const triggersHtml=lc.triggers?`
    <div class="log-section-title">추정 트리거 <button onclick="openChipManager('triggers')" style="background:none;border:none;cursor:pointer;font-size:.62rem;color:var(--mu2);margin-left:4px">✏️관리</button></div>
    <div class="log-chips">${[...lc.triggers,...customTriggers].map(t=>`<div class="log-chip" data-group="trigger" data-val="${t}" onclick="toggleChip(this,'sel-trigger')">${t}</div>`).join('')}
      <div style="display:flex;gap:4px;align-items:center">
        <input class="log-other-input" id="trigger-other" placeholder="직접 입력" style="width:80px">
        <button onclick="addCustomTrigger()" style="background:var(--ac);color:#fff;border:none;border-radius:5px;padding:4px 8px;font-size:.7rem;cursor:pointer">+고정</button>
      </div>
    </div>`:'';

  return `<div class="log-view-tabs">${viewTabs}</div>
  ${renderQuickLogBanner()}
  <div class="log-form">
    ${renderOutcomeCards()}
    <div style="display:flex;gap:12px;margin-bottom:2px">
      <div style="flex:1"><div class="log-section-title" style="margin-top:0">날짜</div>
        <input type="date" id="log-date" value="${dateStr}" class="dx-form-input" onchange="refreshMedCheckForDate(this.value)"></div>
      <div style="flex:1"><div class="log-section-title" style="margin-top:0">시간</div>
        <input type="time" id="log-time" value="${timeStr}" class="dx-form-input">
        <label style="display:flex;align-items:center;gap:5px;margin-top:4px;cursor:pointer;font-size:.73rem;color:var(--mu)">
          <input type="checkbox" id="log-time-unknown" onchange="const t=document.getElementById('log-time');t.disabled=this.checked;t.style.opacity=this.checked?'.3':'1'"> 시간 미상
        </label></div>
    </div>
    ${moodHtml}
    ${lc.dailyChecks?`
    <div class="log-section-title">컨디션 체크</div>
    ${lc.dailyChecks.map(item=>`
      <div style="display:flex;align-items:center;gap:6px;padding:4px 0">
        <span style="font-size:.75rem;min-width:50px;color:var(--mu)">${item}</span>
        <div class="log-chips" style="flex:1;gap:3px" id="dc-${item}">
          ${['1','2','3','4','5'].map(v=>`<div class="log-chip" data-group="dc-${item}" data-val="${v}" onclick="toggleChip(this,'sel-sym')" style="min-width:28px;text-align:center;font-size:.72rem;padding:4px 6px">${v}</div>`).join('')}
        </div>
      </div>`).join('')}`:''}
    ${sitesHtml}
    ${painTypesHtml}
    ${triggersHtml}
    ${lc.symptoms?.length||customSyms.length?`<div class="log-section-title">증상 <button onclick="openChipManager('syms')" style="background:none;border:none;cursor:pointer;font-size:.62rem;color:var(--mu2);margin-left:4px">✏️관리</button></div><div class="log-chips">${allSyms.map(s=>`<div class="log-chip" data-group="sym" data-val="${s}" onclick="toggleChip(this,'sel-sym')">${s}</div>`).join('')}
      <div style="display:flex;gap:4px;align-items:center">
        <input class="log-other-input" id="sym-other" placeholder="직접 입력" style="width:100px">
        <button onclick="addCustomChip('syms')" style="background:var(--ac);color:#fff;border:none;border-radius:5px;padding:4px 8px;font-size:.7rem;cursor:pointer">+고정</button>
      </div>
    </div>`:''}
    <div id="med-check-container">${lc.moodMode?renderDailyMedCheck(dateStr):renderConditionMedSelector(dateStr)}</div>
    ${lc.meds?.length||customMeds.length?`<div class="log-section-title">투약 (일반) <button onclick="openChipManager('meds')" style="background:none;border:none;cursor:pointer;font-size:.62rem;color:var(--mu2);margin-left:4px">✏️관리</button></div><div class="log-chips">${allMeds.map(s=>`<div class="log-chip" data-group="med" data-val="${s}" onclick="toggleChip(this,'sel-med')">${s}</div>`).join('')}
      <div style="display:flex;gap:4px;align-items:center">
        <input class="log-other-input" id="med-other" placeholder="직접 입력" style="width:100px">
        <button onclick="addCustomChip('meds')" style="background:var(--ac);color:#fff;border:none;border-radius:5px;padding:4px 8px;font-size:.7rem;cursor:pointer">+고정</button>
      </div>
    </div>`:''}
    ${treatmentHtml}
    ${_renderLogDailyExtras(dateStr)}
    <div class="log-section-title">메모</div>
    <textarea class="log-memo" id="log-memo" rows="2" placeholder="특이사항..."></textarea>
    <input type="hidden" id="log-edit-idx" value="-1">
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;align-items:center">
      <div style="flex:1;display:flex;gap:4px">
        <button style="background:none;border:1.5px solid var(--bd);border-radius:6px;padding:4px 10px;font-size:.68rem;cursor:pointer;color:var(--mu)" onclick="saveLogPreset()">⭐ 프리셋 저장</button>
        <button style="background:none;border:1.5px solid var(--bd);border-radius:6px;padding:4px 10px;font-size:.68rem;cursor:pointer;color:var(--mu)" onclick="showPresetList()">📋 불러오기</button>
      </div>
      <button class="btn-cancel" id="log-cancel-edit" style="display:none;font-size:.78rem" onclick="cancelLogEdit()">편집 취소</button>
      <button class="btn-log-save" id="log-save-btn" onclick="saveLogEntry()"><div class="spin" id="log-sp"></div> 💾 <span id="log-save-label">기록 저장</span></button>
    </div>
  </div>
  <div id="recent-logs">${renderRecentLogs()}</div>`;
}

function renderRecentLogs() {
  const ds=D();const lc=DC().logConfig;
  if(!ds.logData?.length) return '<div class="hint" style="padding:14px">오늘 기록 없음</div>';
  const today=kstToday();
  const todayLogs=ds.logData.filter(l=>l.datetime.slice(0,10)===today).reverse();
  if(!todayLogs.length) return '<div class="hint" style="padding:14px">오늘 기록 없음</div>';
  return `<div class="card"><div class="card-title">오늘 (${todayLogs.length}건)</div>`+
    todayLogs.map(l=>`<div class="log-item">
      <div class="log-item-time">${l.datetime.slice(11,16)!=='00:00'?l.datetime.slice(11,16):''}</div>
      <div class="log-item-body">
        ${l.mood?`<span class="log-item-nrs" style="background:#faf5ff;color:#7c3aed">${esc(l.mood)}</span>`:
          (l.nrs>=0?`<span class="log-item-nrs" style="background:${nrsColor(l.nrs)}20;color:${nrsColor(l.nrs)}">${_scoreLabel()} ${l.nrs}</span>`:'')}
        ${(l.sites||[]).map(s=>`<span class="log-tag" style="background:#eff6ff;color:#1d4ed8">${esc(s)}</span>`).join('')}
        <div class="log-item-tags">
          ${(l.symptoms||[]).map(s=>`<span class="log-tag" style="background:#faf5ff;color:#7c3aed">${esc(s)}</span>`).join('')}
          ${(l.meds||[]).map(s=>`<span class="log-tag" style="background:#fff7ed;color:#c2410c">${esc(s)}</span>`).join('')}
          ${(l.treatments||[]).map(s=>`<span class="log-tag" style="background:#f0fdf4;color:#15803d">${esc(s)}</span>`).join('')}
          ${l.dailyChecks?Object.entries(l.dailyChecks).map(([k,v])=>`<span class="log-tag" style="background:#f0f9ff;color:#0369a1;font-size:.6rem">${esc(k)}:${v}</span>`).join(''):''}
          ${l.medCheck?Object.entries(l.medCheck).map(([k,v])=>`<span class="log-tag" style="background:${v?'#f0fdf4':'#fef2f2'};color:${v?'#15803d':'#dc2626'};font-size:.6rem">${v?'✓':'✗'} ${esc(k)}</span>`).join(''):''}
        </div>
        ${l.memo?`<div style="font-size:.78rem;color:var(--mu);margin-top:3px">${esc(l.memo)}</div>`:''}
      </div>
      <button class="log-del" onclick="editLogEntry(${D().logData.indexOf(l)})" title="편집" style="color:var(--ac)">✏️</button>
      <button class="log-del" onclick="deleteLogEntry(${D().logData.indexOf(l)})">✕</button>
    </div>`).join('')+'</div>';
}

let _logFilter={med:'',sym:'',cat:''};
function setLogFilter(type,val){_logFilter[type]=val;renderView('log');}
function clearLogFilter(){_logFilter={med:'',sym:'',cat:''};renderView('log');}

function renderLogFilter(logs) {
  const allMeds=new Set(); const allSyms=new Set(); const allCats=new Set();
  logs.forEach(l=>{
    (l.meds||[]).forEach(m=>allMeds.add(m));
    (l.symptoms||[]).forEach(s=>allSyms.add(s));
    (l.categories||[]).forEach(c=>allCats.add(c));
  });
  const hasFilter=_logFilter.med||_logFilter.sym||_logFilter.cat;
  if(!allMeds.size&&!allSyms.size&&!allCats.size) return '';
  return `<div style="margin-bottom:10px;padding:8px 12px;background:var(--sf2);border-radius:8px;border:1px solid var(--bd)">
    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
      <span style="font-size:.68rem;font-weight:700;color:var(--mu)">🔍 필터:</span>
      ${allMeds.size?`<select onchange="setLogFilter('med',this.value)" style="font-size:.7rem;border:1px solid var(--bd);border-radius:4px;padding:2px 6px;background:var(--sf);color:var(--ink)">
        <option value="">전체 투약</option>${[...allMeds].map(m=>`<option value="${esc(m)}" ${_logFilter.med===m?'selected':''}>${esc(m)}</option>`).join('')}</select>`:''}
      ${allSyms.size?`<select onchange="setLogFilter('sym',this.value)" style="font-size:.7rem;border:1px solid var(--bd);border-radius:4px;padding:2px 6px;background:var(--sf);color:var(--ink)">
        <option value="">전체 증상</option>${[...allSyms].map(s=>`<option value="${esc(s)}" ${_logFilter.sym===s?'selected':''}>${esc(s)}</option>`).join('')}</select>`:''}
      ${allCats.size?`<select onchange="setLogFilter('cat',this.value)" style="font-size:.7rem;border:1px solid var(--bd);border-radius:4px;padding:2px 6px;background:var(--sf);color:var(--ink)">
        <option value="">전체 카테고리</option>${[...allCats].map(c=>`<option value="${esc(c)}" ${_logFilter.cat===c?'selected':''}>${esc(c)}</option>`).join('')}</select>`:''}
      ${hasFilter?`<button onclick="clearLogFilter()" style="font-size:.65rem;background:none;border:1px solid var(--bd);border-radius:4px;padding:2px 8px;cursor:pointer;color:var(--re)">✕ 초기화</button>`:''}
    </div>
  </div>`;
}

function filterLogs(logs) {
  return logs.filter(l=>{
    if(_logFilter.med&&!(l.meds||[]).includes(_logFilter.med)) return false;
    if(_logFilter.sym&&!(l.symptoms||[]).includes(_logFilter.sym)) return false;
    if(_logFilter.cat&&!(l.categories||[]).includes(_logFilter.cat)) return false;
    return true;
  });
}

const _logCollapsed={};

function renderLogList() {
  const ds=D(); const lc=DC().logConfig; if(!ds.logData?.length) return '<div class="hint">이번 달 기록 없음</div>';
  const filtered=filterLogs(ds.logData);
  const hasFilter=_logFilter.med||_logFilter.sym||_logFilter.cat;

  // 날짜별 그룹핑
  const byDate={};
  [...filtered].reverse().forEach(l=>{
    const date=l.datetime?.slice(0,10)||'unknown';
    if(!byDate[date]) byDate[date]=[];
    byDate[date].push(l);
  });

  const dayNames=['일','월','화','수','목','금','토'];
  const groupsHtml=Object.entries(byDate).map(([date,logs])=>{
    const dayOfWeek=dayNames[new Date(date+'T12:00').getDay()];
    const dateLabel=date.slice(5)+' ('+dayOfWeek+')';
    const collapsed=!!_logCollapsed[date];
    const nrsVals=logs.filter(l=>l.nrs>=0).map(l=>l.nrs);
    const avgNrs=nrsVals.length?(nrsVals.reduce((a,b)=>a+b,0)/nrsVals.length).toFixed(1):null;
    const nc=avgNrs===null?'var(--mu)':avgNrs>=7?'#ef4444':avgNrs>=4?'#f59e0b':'#10b981';

    const logsHtml=logs.map(l=>{
      const realIdx=ds.logData.indexOf(l);
      const timeStr=l.datetime.slice(11,16);
      return `<div class="log-item">
        <div class="log-item-time">${timeStr!=='00:00'?timeStr:''}</div>
        <div class="log-item-body">
          ${l.mood?`<span class="log-item-nrs" style="background:#faf5ff;color:#7c3aed">${esc(l.mood)}</span>`:
            (l.nrs>=0?`<span class="log-item-nrs" style="background:${nrsColor(l.nrs)}20;color:${nrsColor(l.nrs)}">${_scoreLabel()} ${l.nrs}</span>`:'')}
          ${(l.sites||[]).map(s=>`<span class="log-tag" style="background:#eff6ff;color:#1d4ed8">${esc(s)}</span>`).join('')}
          <div class="log-item-tags">
            ${(l.triggers||[]).map(t=>`<span class="log-tag" style="background:#fef3c7;color:#92400e">⚡${esc(t)}</span>`).join('')}
            ${(l.symptoms||[]).map(s=>`<span class="log-tag" style="background:#faf5ff;color:#7c3aed">${esc(s)}</span>`).join('')}
            ${(l.meds||[]).map(s=>`<span class="log-tag" style="background:#fff7ed;color:#c2410c">${esc(s)}</span>`).join('')}
            ${(l.treatments||[]).map(s=>`<span class="log-tag" style="background:#f0fdf4;color:#15803d">${esc(s)}</span>`).join('')}
            ${l.dailyChecks?Object.entries(l.dailyChecks).map(([k,v])=>`<span class="log-tag" style="background:#f0f9ff;color:#0369a1;font-size:.6rem">${esc(k)}:${v}</span>`).join(''):''}
            ${l.medCheck?Object.entries(l.medCheck).map(([k,v])=>`<span class="log-tag" style="background:${v?'#f0fdf4':'#fef2f2'};color:${v?'#15803d':'#dc2626'};font-size:.6rem">${v?'✓':'✗'} ${esc(k)}</span>`).join(''):''}
            ${l.outcome?`<span class="log-tag outcome-${l.outcome.rating}" onclick="editOutcome(${realIdx})" style="cursor:pointer" title="클릭하여 경과 수정">${l.outcome.rating==='better'||l.outcome.rating==='good'?'🟢호전':l.outcome.rating==='same'||l.outcome.rating==='partial'?'🟡비슷':l.outcome.rating==='unknown'?'🤷기억안남':'🔴악화'}</span>`
            :`<span class="log-tag" onclick="editOutcome(${realIdx})" style="cursor:pointer;background:#f5f3ff;color:#7c3aed;border:1px dashed #c4b5fd">+ 경과</span>`}
          </div>
          ${l.memo?`<div style="font-size:.78rem;color:var(--mu);margin-top:3px;white-space:pre-line">${esc(l.memo)}</div>`:''}
          ${l.nrsRange?`<div style="font-size:.62rem;color:var(--mu2);margin-top:2px">${_scoreLabel()} 변화: ${l.nrsRange.min}→${l.nrsRange.max}</div>`:''}
          ${l.timeline?`<div style="font-size:.62rem;color:var(--ac);margin-top:2px;cursor:pointer" onclick="event.stopPropagation();_showTimeline(${realIdx})">📊 timeline ${l.timeline.length}건 보기</div>`:''}
          ${l.weather?`<div style="font-size:.62rem;color:var(--mu2);margin-top:2px">${l.weather.condition} ${l.weather.temp}° ${l.weather.pressure}hPa</div>`:''}
        </div>
        <button class="log-del" onclick="editLogEntry(${realIdx})" title="편집" style="color:var(--ac)">✏️</button>
        <button class="log-del" onclick="deleteLogEntry(${realIdx})">✕</button>
      </div>`;
    }).join('');

    return `<div style="margin-bottom:2px">
      <div onclick="_logCollapsed['${date}']=!_logCollapsed['${date}'];document.getElementById('content').querySelector('[data-log-list]').innerHTML=renderLogListInner()" style="display:flex;align-items:center;gap:8px;padding:8px 12px;cursor:pointer;user-select:none;background:var(--sf2);border-radius:6px;border:1px solid var(--bd)">
        <span style="font-size:.7rem;color:var(--mu)">${collapsed?'▸':'▾'}</span>
        <span style="font-size:.78rem;font-weight:700;color:var(--ink)">${esc(dateLabel)}</span>
        <span style="font-size:.65rem;color:var(--mu)">${logs.length}건</span>
        ${avgNrs!==null&&!lc.moodMode?`<span style="font-size:.65rem;font-weight:600;color:${nc}">평균 ${avgNrs}</span>`:''}
        ${logs.length>=2?`<button onclick="event.stopPropagation();mergeDayEntries('${date}')" style="margin-left:auto;font-size:.58rem;padding:2px 8px;border:1px solid var(--ac);border-radius:4px;background:none;color:var(--ac);cursor:pointer;font-family:var(--font)">🔗 병합</button>`:''}
      </div>
      ${collapsed?'':`<div style="padding:0 4px">${logsHtml}</div>`}
    </div>`;
  }).join('');

  const isCurrentMonth=ds.logMonth===kstMonth();
  const monthNav=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
    <button onclick="changeLogMonth(-1)" style="font-size:.8rem;padding:4px 10px;border:1px solid var(--bd);border-radius:6px;background:var(--sf2);color:var(--ink);cursor:pointer">◀ 이전 달</button>
    <span style="flex:1;text-align:center;font-size:.85rem;font-weight:700;color:var(--ink)">${ds.logMonth}</span>
    <button onclick="changeLogMonth(1)" ${isCurrentMonth?'disabled style="font-size:.8rem;padding:4px 10px;border:1px solid var(--bd);border-radius:6px;background:var(--sf2);color:var(--mu);cursor:not-allowed;opacity:.4"':'style="font-size:.8rem;padding:4px 10px;border:1px solid var(--bd);border-radius:6px;background:var(--sf2);color:var(--ink);cursor:pointer"'}>다음 달 ▶</button>
  </div>`;

  return renderLogFilter(ds.logData)+monthNav+(typeof renderMedComplianceCalendar==='function'?renderMedComplianceCalendar(ds.logData):'')+`<div class="card"><div class="card-title" style="display:flex;align-items:center;gap:8px">📋 ${ds.logMonth} ${hasFilter?`필터 결과 (${filtered.length}/${ds.logData.length}건)`:`전체 (${ds.logData.length}건)`}
    <button onclick="toggleAllLogDates()" style="margin-left:auto;font-size:.6rem;padding:2px 8px;border:1px solid var(--bd);border-radius:4px;background:var(--sf2);color:var(--mu);cursor:pointer">전체 접기/펼치기</button>
  </div><div id="undo-redo-bar" style="display:flex;gap:4px;margin-bottom:6px"></div><div data-log-list>${groupsHtml}</div></div>`;
}

function renderLogListInner() {
  const ds=D(); const lc=DC().logConfig; if(!ds.logData?.length) return '';
  const filtered=filterLogs(ds.logData);
  const byDate={};
  [...filtered].reverse().forEach(l=>{
    const date=l.datetime?.slice(0,10)||'unknown';
    if(!byDate[date]) byDate[date]=[];
    byDate[date].push(l);
  });
  const dayNames=['일','월','화','수','목','금','토'];
  return Object.entries(byDate).map(([date,logs])=>{
    const dayOfWeek=dayNames[new Date(date+'T12:00').getDay()];
    const dateLabel=date.slice(5)+' ('+dayOfWeek+')';
    const collapsed=!!_logCollapsed[date];
    const nrsVals=logs.filter(l=>l.nrs>=0).map(l=>l.nrs);
    const avgNrs=nrsVals.length?(nrsVals.reduce((a,b)=>a+b,0)/nrsVals.length).toFixed(1):null;
    const nc=avgNrs===null?'var(--mu)':avgNrs>=7?'#ef4444':avgNrs>=4?'#f59e0b':'#10b981';
    const logsHtml=logs.map(l=>{
      const realIdx=ds.logData.indexOf(l);
      const timeStr=l.datetime.slice(11,16);
      return `<div class="log-item">
        <div class="log-item-time">${timeStr!=='00:00'?timeStr:''}</div>
        <div class="log-item-body">
          ${l.mood?`<span class="log-item-nrs" style="background:#faf5ff;color:#7c3aed">${esc(l.mood)}</span>`:
            (l.nrs>=0?`<span class="log-item-nrs" style="background:${nrsColor(l.nrs)}20;color:${nrsColor(l.nrs)}">${_scoreLabel()} ${l.nrs}</span>`:'')}
          ${(l.sites||[]).map(s=>`<span class="log-tag" style="background:#eff6ff;color:#1d4ed8">${esc(s)}</span>`).join('')}
          <div class="log-item-tags">
            ${(l.triggers||[]).map(t=>`<span class="log-tag" style="background:#fef3c7;color:#92400e">⚡${esc(t)}</span>`).join('')}
            ${(l.symptoms||[]).map(s=>`<span class="log-tag" style="background:#faf5ff;color:#7c3aed">${esc(s)}</span>`).join('')}
            ${(l.meds||[]).map(s=>`<span class="log-tag" style="background:#fff7ed;color:#c2410c">${esc(s)}</span>`).join('')}
            ${(l.treatments||[]).map(s=>`<span class="log-tag" style="background:#f0fdf4;color:#15803d">${esc(s)}</span>`).join('')}
            ${l.outcome?`<span class="log-tag outcome-${l.outcome.rating}" onclick="editOutcome(${realIdx})" style="cursor:pointer" title="클릭하여 경과 수정">${l.outcome.rating==='better'||l.outcome.rating==='good'?'🟢호전':l.outcome.rating==='same'||l.outcome.rating==='partial'?'🟡비슷':l.outcome.rating==='unknown'?'🤷기억안남':'🔴악화'}</span>`
            :`<span class="log-tag" onclick="editOutcome(${realIdx})" style="cursor:pointer;background:#f5f3ff;color:#7c3aed;border:1px dashed #c4b5fd">+ 경과</span>`}
          </div>
          ${l.memo?`<div style="font-size:.78rem;color:var(--mu);margin-top:3px;white-space:pre-line">${esc(l.memo)}</div>`:''}
          ${l.nrsRange?`<div style="font-size:.62rem;color:var(--mu2);margin-top:2px">${_scoreLabel()} 변화: ${l.nrsRange.min}→${l.nrsRange.max}</div>`:''}
          ${l.timeline?`<div style="font-size:.62rem;color:var(--ac);margin-top:2px;cursor:pointer" onclick="event.stopPropagation();_showTimeline(${realIdx})">📊 timeline ${l.timeline.length}건 보기</div>`:''}
          ${l.weather?`<div style="font-size:.62rem;color:var(--mu2);margin-top:2px">${l.weather.condition} ${l.weather.temp}° ${l.weather.pressure}hPa</div>`:''}
        </div>
        <button class="log-del" onclick="editLogEntry(${realIdx})" title="편집" style="color:var(--ac)">✏️</button>
        <button class="log-del" onclick="deleteLogEntry(${realIdx})">✕</button>
      </div>`;
    }).join('');
    return `<div style="margin-bottom:2px">
      <div onclick="_logCollapsed['${date}']=!_logCollapsed['${date}'];document.getElementById('content').querySelector('[data-log-list]').innerHTML=renderLogListInner()" style="display:flex;align-items:center;gap:8px;padding:8px 12px;cursor:pointer;user-select:none;background:var(--sf2);border-radius:6px;border:1px solid var(--bd)">
        <span style="font-size:.7rem;color:var(--mu)">${collapsed?'▸':'▾'}</span>
        <span style="font-size:.78rem;font-weight:700;color:var(--ink)">${esc(dateLabel)}</span>
        <span style="font-size:.65rem;color:var(--mu)">${logs.length}건</span>
        ${avgNrs!==null&&!lc.moodMode?`<span style="font-size:.65rem;font-weight:600;color:${nc}">평균 ${avgNrs}</span>`:''}
        ${logs.length>=2?`<button onclick="event.stopPropagation();mergeDayEntries('${date}')" style="margin-left:auto;font-size:.58rem;padding:2px 8px;border:1px solid var(--ac);border-radius:4px;background:none;color:var(--ac);cursor:pointer;font-family:var(--font)">🔗 병합</button>`:''}
      </div>
      ${collapsed?'':`<div style="padding:0 4px">${logsHtml}</div>`}
    </div>`;
  }).join('');
}

function toggleAllLogDates() {
  const ds=D(); if(!ds.logData?.length) return;
  const dates=[...new Set(ds.logData.map(l=>l.datetime?.slice(0,10)))];
  const allCollapsed=dates.every(d=>_logCollapsed[d]);
  dates.forEach(d=>{ _logCollapsed[d]=!allCollapsed; });
  const el=document.getElementById('content').querySelector('[data-log-list]');
  if(el) el.innerHTML=renderLogListInner();
}

// timeline 상세 보기
function _showTimeline(idx){
  const entry=D()?.logData?.[idx];if(!entry?.timeline)return;
  const html=entry.timeline.map(t=>{
    const parts=[`<b>${t.time||'--:--'}</b>`];
    if(t.nrs>=0)parts.push(`${_scoreLabel()}:${t.nrs}`);
    if(t.mood)parts.push(t.mood);
    if(t.sites?.length)parts.push(t.sites.join('+'));
    if(t.meds?.length)parts.push('💊'+t.meds.join(', '));
    if(t.treatments?.length)parts.push('🏥'+t.treatments.join(', '));
    if(t.outcome)parts.push(t.outcome.rating==='better'?'🟢호전':t.outcome.rating==='same'?'🟡비슷':'🔴악화');
    if(t.memo)parts.push('"'+esc(t.memo)+'"');
    return `<div style="font-size:.72rem;padding:4px 0;border-bottom:1px dotted var(--bd)">${parts.join(' · ')}</div>`;
  }).join('');
  showConfirmModal('📊 Timeline — '+entry.datetime?.slice(0,10),
    `<div style="max-height:300px;overflow-y:auto">${html}</div>`,
    [{label:'닫기',action:closeConfirmModal,primary:true}]);
}

// ═══════════════════════════════════════════════════════════════
// UNDO / REDO (logData 스냅샷 기반)
// ═══════════════════════════════════════════════════════════════
const _undoStack=[];
const _redoStack=[];
const _MAX_UNDO=10;

function _pushUndo(label){
  const ds=D();if(!ds?.logData)return;
  _undoStack.push({label,snapshot:JSON.stringify(ds.logData),domain:S.currentDomain,month:ds.logMonth});
  if(_undoStack.length>_MAX_UNDO)_undoStack.shift();
  _redoStack.length=0; // redo 초기화
  _updateUndoUI();
}

async function undoLogChange(){
  if(!_undoStack.length){showToast('되돌릴 변경이 없습니다.');return;}
  const ds=D();if(!ds)return;
  // 현재 상태를 redo에 저장
  _redoStack.push({label:'redo',snapshot:JSON.stringify(ds.logData),domain:S.currentDomain,month:ds.logMonth});
  const prev=_undoStack.pop();
  ds.logData=JSON.parse(prev.snapshot);
  try{await saveLogData();showToast('↩ 되돌림: '+prev.label);renderView('log');}
  catch(e){showToast('❌ 되돌리기 실패',3000);}
  _updateUndoUI();
}

async function redoLogChange(){
  if(!_redoStack.length){showToast('다시 실행할 변경이 없습니다.');return;}
  const ds=D();if(!ds)return;
  _undoStack.push({label:'undo',snapshot:JSON.stringify(ds.logData),domain:S.currentDomain,month:ds.logMonth});
  const next=_redoStack.pop();
  ds.logData=JSON.parse(next.snapshot);
  try{await saveLogData();showToast('↪ 다시 실행');renderView('log');}
  catch(e){showToast('❌ 다시 실행 실패',3000);}
  _updateUndoUI();
}

function _updateUndoUI(){
  const el=document.getElementById('undo-redo-bar');
  if(!el)return;
  el.innerHTML=(_undoStack.length?`<button onclick="undoLogChange()" style="font-size:.68rem;padding:3px 10px;border:1px solid var(--ac);border-radius:5px;background:none;color:var(--ac);cursor:pointer;font-family:var(--font)">↩ 되돌리기 (${_undoStack[_undoStack.length-1].label})</button>`:'')+
    (_redoStack.length?`<button onclick="redoLogChange()" style="font-size:.68rem;padding:3px 10px;border:1px solid var(--mu);border-radius:5px;background:none;color:var(--mu);cursor:pointer;font-family:var(--font);margin-left:4px">↪ 다시 실행</button>`:'');
}

// ═══════════════════════════════════════════════════════════════
// 같은 날 기록 병합 (timeline 구조 + 전후비교 + undo)
// ═══════════════════════════════════════════════════════════════
function mergeDayEntries(date) {
  const ds=D();if(!ds.logData?.length)return;
  const entries=ds.logData.filter(l=>l.datetime?.slice(0,10)===date);
  if(entries.length<2){showToast('병합할 기록이 없습니다.');return;}

  // timeline 생성 — 원본 데이터 완전 보존
  const timeline=entries.map(e=>({
    time:e.datetime?.slice(11,16)||'',
    nrs:e.nrs,
    mood:e.mood||undefined,
    sites:[...(e.sites||[])],
    symptoms:[...(e.symptoms||[])],
    meds:[...(e.meds||[])],
    treatments:[...(e.treatments||[])],
    medCheck:e.medCheck?{...e.medCheck}:undefined,
    dailyChecks:e.dailyChecks?{...e.dailyChecks}:undefined,
    outcome:e.outcome?{...e.outcome}:undefined,
    memo:e.memo||'',
    weather:e.weather?{...e.weather}:undefined,
  }));

  // 병합 엔트리 생성
  const merged={...entries[entries.length-1]};
  merged.id=merged.id||Date.now();
  merged.timeline=timeline;
  // NRS: 마지막 유효값 + 범위
  const nrsVals=entries.filter(e=>e.nrs>=0).map(e=>e.nrs);
  if(nrsVals.length){merged.nrs=nrsVals[nrsVals.length-1];merged.nrsRange={min:Math.min(...nrsVals),max:Math.max(...nrsVals)};}
  // 통합 (합집합)
  merged.sites=[...new Set(entries.flatMap(e=>e.sites||[]))];
  merged.symptoms=[...new Set(entries.flatMap(e=>e.symptoms||[]))];
  merged.meds=[...new Set(entries.flatMap(e=>e.meds||[]))];
  merged.treatments=[...new Set(entries.flatMap(e=>e.treatments||[]))];
  const mc={};entries.forEach(e=>{if(e.medCheck)Object.assign(mc,e.medCheck);});
  if(Object.keys(mc).length)merged.medCheck=mc;
  const dc={};entries.forEach(e=>{if(e.dailyChecks)Object.assign(dc,e.dailyChecks);});
  if(Object.keys(dc).length)merged.dailyChecks=dc;
  const lastMood=entries.filter(e=>e.mood).pop();
  if(lastMood)merged.mood=lastMood.mood;
  // 메모: 시간별 분리 보존
  const memos=entries.filter(e=>e.memo).map(e=>(e.datetime?.slice(11,16)||'')+' '+e.memo);
  merged.memo=memos.join('\n');

  // 전후비교 모달 표시
  const beforeHtml=entries.map(e=>{
    const t=e.datetime?.slice(11,16)||'';
    const parts=[t];
    if(e.nrs>=0)parts.push(_scoreLabel()+':'+e.nrs);
    if(e.sites?.length)parts.push(e.sites.join('+'));
    if(e.meds?.length)parts.push('💊'+e.meds.join(','));
    if(e.treatments?.length)parts.push('🏥'+e.treatments.join(','));
    if(e.outcome)parts.push(e.outcome.rating==='better'?'🟢호전':e.outcome.rating==='same'?'🟡비슷':'🔴악화');
    if(e.memo)parts.push('"'+e.memo.slice(0,30)+'"');
    return `<div style="font-size:.7rem;padding:2px 0;color:var(--mu)">${esc(parts.join(' · '))}</div>`;
  }).join('');

  const afterParts=[`${_scoreLabel()} ${merged.nrs>=0?merged.nrs:'-'}`];
  if(merged.nrsRange)afterParts[0]+=` (${merged.nrsRange.min}→${merged.nrsRange.max})`;
  if(merged.sites?.length)afterParts.push(merged.sites.join('+'));
  if(merged.meds?.length)afterParts.push('💊'+merged.meds.join(', '));
  if(merged.treatments?.length)afterParts.push('🏥'+merged.treatments.join(', '));
  afterParts.push(`timeline: ${timeline.length}건`);
  const afterHtml=`<div style="font-size:.7rem;color:var(--ink)">${esc(afterParts.join(' · '))}</div>`;

  showConfirmModal(`🔗 ${date} 병합 (${entries.length}건 → 1건)`,
    `<div style="margin-bottom:8px"><div style="font-size:.68rem;font-weight:600;color:var(--mu);margin-bottom:4px">병합 전 (${entries.length}건)</div>${beforeHtml}</div>
     <div style="border-top:1px solid var(--bd);padding-top:8px"><div style="font-size:.68rem;font-weight:600;color:var(--ac);margin-bottom:4px">병합 후 (1건 + timeline)</div>${afterHtml}
     <div style="font-size:.62rem;color:var(--mu);margin-top:4px">※ timeline에 원본 데이터가 완전 보존됩니다. 되돌리기 가능.</div></div>`,
    [{label:'병합 실행',action:()=>_executeMerge(date,merged),primary:true},{label:'취소',action:closeConfirmModal}]
  );
}

async function _executeMerge(date,merged){
  closeConfirmModal();
  _pushUndo('병합: '+date);
  const ds=D();
  ds.logData=ds.logData.filter(l=>l.datetime?.slice(0,10)!==date);
  ds.logData.push(merged);
  ds.logData.sort((a,b)=>(a.datetime||'').localeCompare(b.datetime||''));
  try{await saveLogData();showToast('✅ 병합 완료 (되돌리기 가능)');renderView('log');}
  catch(e){showToast('❌ 병합 저장 실패: '+e.message,4000);}
}

// ── ntfy 푸시 알림 ──
async function testNtfy() {
  const bung=(document.getElementById('key-ntfy-bung')?.value||'').trim();
  const orangi=(document.getElementById('key-ntfy-orangi')?.value||'').trim();
  if(!bung&&!orangi){showToast('토픽을 먼저 입력하세요');return;}
  var sent=0;
  if(bung){
    try{
      const r=await fetch('https://ntfy.sh/'+encodeURIComponent(bung),{method:'POST',body:'🔔 테스트 알림 — 붕쌤 토픽 정상 작동!'});
      if(r.ok){sent++;}else{showToast('❌ 붕쌤 토픽 실패: HTTP '+r.status,4000);return;}
    }catch(e){showToast('❌ 네트워크 오류: '+e.message,4000);return;}
  }
  if(orangi){
    try{
      const r=await fetch('https://ntfy.sh/'+encodeURIComponent(orangi),{method:'POST',body:'🔔 테스트 알림 — 오랑이 토픽 정상 작동!'});
      if(r.ok){sent++;}else{showToast('❌ 오랑이 토픽 실패: HTTP '+r.status,4000);return;}
    }catch(e){showToast('❌ 네트워크 오류: '+e.message,4000);return;}
  }
  showToast('✅ 테스트 알림 '+sent+'건 전송 완료! ntfy 앱을 확인하세요.');
}

async function sendNtfyBung(entry) {
  const topic=localStorage.getItem('om_ntfy_bung');
  if(!topic||S.currentDomain!=='orangi-migraine') return;
  const nrs=entry.nrs>=0?`${_scoreLabel()} ${entry.nrs}`:'';
  const sites=(entry.sites||[]).join(', ');
  const meds=(entry.meds||[]).join(', ');
  const tx=(entry.treatments||[]).join(', ');
  const body=`🤕 오랑이 두통 기록\n${entry.datetime.slice(11,16)} ${nrs} ${sites}\n${meds?'💊 '+meds:''}${tx?' 🩺 '+tx:''}`.trim();
  try{await fetch('https://ntfy.sh/'+encodeURIComponent(topic),{method:'POST',body:body});}catch(e){console.warn('ntfy bung:',e);}
}

async function sendNtfyFollowup(entry) {
  const topic=localStorage.getItem('om_ntfy_orangi');
  if(!topic||S.currentDomain!=='orangi-migraine') return;
  const nrs=entry.nrs>=0?`${_scoreLabel()} ${entry.nrs}`:'';
  const tx=[...(entry.meds||[]),...(entry.treatments||[])].join(', ');
  const body=`🤕 두통 경과 확인\n${entry.datetime.slice(11,16)} ${nrs} ${tx} → 지금 어때요?`;
  // ntfy 예약 발송 (At: 2h) — 서버측 타이머, 앱 꺼도 동작
  try{await fetch('https://ntfy.sh/'+encodeURIComponent(topic),{method:'POST',headers:{'At':'2h'},body:body});}catch(e){console.warn('ntfy followup:',e);}
}

// ── 날씨 자동 수집 (OpenWeatherMap) ──
const _WEATHER_LAT=37.5326;const _WEATHER_LON=127.1378;
async function fetchWeather() {
  const key=localStorage.getItem('om_weather_key')||'';
  if(!key) return null;
  try {
    const url=`https://api.openweathermap.org/data/2.5/weather?lat=${_WEATHER_LAT}&lon=${_WEATHER_LON}&appid=${key}&units=metric&lang=kr`;
    const res=await fetchWithRetry(url,{},1);
    if(!res.ok) return null;
    const d=await res.json();
    return {temp:Math.round(d.main.temp*10)/10,humidity:d.main.humidity,pressure:d.main.pressure,condition:d.weather?.[0]?.description||'',windSpeed:d.wind?.speed||0,fetchedAt:kstNow().toISOString()};
  } catch(e){console.warn('Weather fetch failed:',e);return null;}
}

// ── 처치 효과 미평가 기록 찾기 ──
function getUnratedLogs() {
  if(S.currentDomain!=='orangi-migraine') return [];
  const ds=D();if(!ds.logData?.length) return [];
  const now=kstNow();
  return ds.logData.filter(l=>{
    const hasTreatment=(l.meds?.length>0)||(l.treatments?.length>0);
    const noOutcome=!l.outcome||!l.outcome.rating;
    const withinDays=(now-new Date(l.datetime))<=3*86400000;
    return hasTreatment&&noOutcome&&withinDays;
  });
}

function renderOutcomeCards() {
  const unrated=getUnratedLogs();
  if(!unrated.length) return '';
  return unrated.map(l=>{
    const date=l.datetime.slice(5,10);
    const time=l.datetime.slice(11,16);
    const nrs=l.nrs>=0?`${_scoreLabel()} ${l.nrs}`:'';
    const tx=[...(l.meds||[]),...(l.treatments||[])].join(', ');
    const idx=D().logData.indexOf(l);
    return `<div class="outcome-card" id="outcome-card-${idx}" style="padding:10px 14px;margin-bottom:8px;background:var(--sf2);border:1.5px solid var(--bd);border-radius:10px;border-left:3px solid var(--ac)">
      <div style="font-size:.75rem;color:var(--mu);margin-bottom:6px">📋 ${date} ${time} ${nrs} — <strong>${esc(tx)}</strong> 경과는?</div>
      <div style="display:flex;gap:8px">
        <button onclick="rateOutcome(${idx},'better')" style="flex:1;padding:8px;border:2px solid #10b981;border-radius:8px;background:#10b98120;color:#10b981;font-size:.82rem;font-weight:700;cursor:pointer">🟢 호전</button>
        <button onclick="rateOutcome(${idx},'same')" style="flex:1;padding:8px;border:2px solid #f59e0b;border-radius:8px;background:#f59e0b20;color:#b45309;font-size:.82rem;font-weight:700;cursor:pointer">🟡 비슷</button>
        <button onclick="rateOutcome(${idx},'worse')" style="flex:1;padding:8px;border:2px solid #ef4444;border-radius:8px;background:#ef444420;color:#ef4444;font-size:.82rem;font-weight:700;cursor:pointer">🔴 악화</button>
      </div>
      <div style="margin-top:6px"><button onclick="rateOutcome(${idx},'unknown')" style="background:none;border:1px solid var(--bd);border-radius:6px;padding:3px 10px;font-size:.68rem;color:var(--mu);cursor:pointer">🤷 기억 안남</button></div>
    </div>`;
  }).join('');
}

async function rateOutcome(logIdx,rating) {
  const ds=D();const entry=ds.logData[logIdx];if(!entry) return;
  entry.outcome={rating,ratedAt:kstNow().toISOString()};
  const card=document.getElementById('outcome-card-'+logIdx);
  if(card){
    const labels={better:'🟢 호전',same:'🟡 비슷',worse:'🔴 악화'};
    card.innerHTML=`<div style="font-size:.78rem;color:var(--mu);text-align:center;padding:4px;font-weight:600">${labels[rating]} 기록됨</div>`;
    setTimeout(()=>{card.style.display='none';},1500);
  }
  try{await saveLogData();showToast('📝 경과 기록됨');}
  catch(e){showToast('⚠️ 저장 실패: '+e.message);}
}

function editOutcome(logIdx) {
  const ds=D();const entry=ds.logData[logIdx];if(!entry) return;
  const date=entry.datetime.slice(5,10);const time=entry.datetime.slice(11,16);
  const nrs=entry.nrs>=0?`${_scoreLabel()} ${entry.nrs}`:'';
  const tx=[...(entry.meds||[]),...(entry.treatments||[])].join(', ');
  showConfirmModal('📋 경과 수정',
    `<div style="text-align:center;margin-bottom:12px"><div style="font-size:.8rem;color:var(--mu)">${date} ${time} ${nrs} — ${esc(tx)}</div></div>
    <div style="display:flex;gap:8px">
      <button onclick="updateOutcome(${logIdx},'better');closeConfirmModal()" style="flex:1;padding:10px;border:2px solid #10b981;border-radius:8px;background:#10b98120;color:#10b981;font-size:.85rem;font-weight:700;cursor:pointer">🟢 호전</button>
      <button onclick="updateOutcome(${logIdx},'same');closeConfirmModal()" style="flex:1;padding:10px;border:2px solid #f59e0b;border-radius:8px;background:#f59e0b20;color:#b45309;font-size:.85rem;font-weight:700;cursor:pointer">🟡 비슷</button>
      <button onclick="updateOutcome(${logIdx},'worse');closeConfirmModal()" style="flex:1;padding:10px;border:2px solid #ef4444;border-radius:8px;background:#ef444420;color:#ef4444;font-size:.85rem;font-weight:700;cursor:pointer">🔴 악화</button>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
      <button onclick="updateOutcome(${logIdx},'unknown');closeConfirmModal()" style="font-size:.72rem;color:#6b7280;background:none;border:1px solid var(--bd);border-radius:6px;padding:4px 10px;cursor:pointer">🤷 기억 안남</button>
      <button onclick="updateOutcome(${logIdx},null);closeConfirmModal()" style="font-size:.7rem;color:var(--mu);background:none;border:none;cursor:pointer;text-decoration:underline">경과 삭제</button>
    </div>`,
    []);
}

async function updateOutcome(logIdx,rating) {
  const ds=D();const entry=ds.logData[logIdx];if(!entry) return;
  if(rating) entry.outcome={rating,ratedAt:kstNow().toISOString()};
  else delete entry.outcome;
  try{await saveLogData();renderView('log');showToast(rating?'📝 경과 수정됨':'🗑 경과 삭제됨');}
  catch(e){showToast('⚠️ 저장 실패: '+e.message);}
}

// ── 커스텀 트리거 추가 ──
function addCustomTrigger() {
  const el=document.getElementById('trigger-other');
  const val=(el?.value||'').trim();if(!val) return;
  const key='om_custom_triggers_'+S.currentDomain;
  let list=[];try{list=JSON.parse(localStorage.getItem(key)||'[]');}catch(e){}
  if(!list.includes(val)){list.push(val);localStorage.setItem(key,JSON.stringify(list));}
  el.value='';
  _syncCustomItemsToMaster();saveMaster();
  const saved=_saveLogFormState();renderView('log');_restoreLogFormState(saved);
  showToast(`✅ "${val}" 고정됨`);
}

async function saveLogEntry() {
  const btn=document.getElementById('log-save-btn');const sp=document.getElementById('log-sp');
  if(btn)btn.disabled=true;if(sp)sp.style.display='block';
  const lc=DC().logConfig;
  const date=document.getElementById('log-date').value;
  const timeUnknown=document.getElementById('log-time-unknown')?.checked;
  const time=timeUnknown?'시간미상':(document.getElementById('log-time')?.value||'00:00');

  // NRS or mood (-1 = 기록 안함)
  let nrs=-1; let mood='';
  if(document.getElementById('log-skip-nrs')?.checked) {
    nrs=-1; mood='';
  } else if(lc.moodMode) {
    const sel=document.querySelector('#mood-chips .log-chip.sel');
    mood=sel?.dataset.val||'';
    // moodMode 컨디션 점수 (별도 슬라이더)
    const moodNrsSkip=document.getElementById('mood-nrs-skip')?.checked;
    nrs=moodNrsSkip?-1:parseInt(document.getElementById('mood-nrs')?.value??-1);
  } else {
    nrs=parseInt(document.getElementById('log-nrs')?.value??-1);
  }

  const sites=[];
  document.querySelectorAll('.log-chip.sel[data-side]').forEach(el=>sites.push((el.dataset.side==='left'?'왼쪽':'오른쪽')+' '+el.dataset.val));
  const siteLeftOther=document.getElementById('site-left-other')?.value.trim();if(siteLeftOther)sites.push('왼쪽 '+siteLeftOther);
  const siteRightOther=document.getElementById('site-right-other')?.value.trim();if(siteRightOther)sites.push('오른쪽 '+siteRightOther);
  const painType=[];document.querySelectorAll('.log-chip.sel[data-group="pain"]').forEach(el=>painType.push(el.dataset.val));
  const triggers=[];document.querySelectorAll('.log-chip.sel[data-group="trigger"]').forEach(el=>triggers.push(el.dataset.val));
  const triggerOther=document.getElementById('trigger-other')?.value.trim();if(triggerOther)triggers.push(triggerOther);
  // 7-7: 생리주기 교차 태그 자동 추가
  if (S.currentDomain === 'orangi-migraine') {
    const mTag = getMenstrualTag();
    if (mTag && !triggers.includes(mTag)) {
      triggers.push(mTag);
    }
  }
  const symptoms=[];document.querySelectorAll('.log-chip.sel[data-group="sym"]').forEach(el=>symptoms.push(el.dataset.val));
  const symOther=document.getElementById('sym-other')?.value.trim();if(symOther)symptoms.push(symOther);
  const meds=[];document.querySelectorAll('.log-chip.sel[data-group="med"]').forEach(el=>meds.push(el.dataset.val));
  const medOther=document.getElementById('med-other')?.value.trim();if(medOther)meds.push(medOther);
  const treatments=[];
  document.querySelectorAll('.log-chip.sel[data-group="tx"]').forEach(el=>treatments.push(el.dataset.val));
  const txInput=document.getElementById('log-treatment');
  if(txInput&&txInput.value.trim()) treatments.push(txInput.value.trim());
  const txOther=document.getElementById('tx-other')?.value.trim();if(txOther)treatments.push(txOther);
  const memo=document.getElementById('log-memo')?.value.trim();
  // Daily condition checks
  const dailyChecks={};
  if(lc.dailyChecks){
    lc.dailyChecks.forEach(item=>{
      const sel=document.querySelector(`#dc-${item} .log-chip.sel`);
      if(sel) dailyChecks[item]=parseInt(sel.dataset.val);
    });
  }
  // Daily med check (moodMode)
  const medCheck={};
  document.querySelectorAll('.med-check-cb').forEach(cb=>{
    medCheck[cb.dataset.med]=cb.checked;
  });
  const editIdx=parseInt(document.getElementById('log-edit-idx')?.value ?? -1);
  const entry={id:editIdx>=0?(D().logData[editIdx]?.id||Date.now()):Date.now(),datetime:`${date}T${time}`,nrs,mood,sites,painType,triggers,symptoms,meds,treatments,memo,dailyChecks:Object.keys(dailyChecks).length?dailyChecks:undefined,medCheck:Object.keys(medCheck).length?medCheck:undefined};
  // 날씨 자동 첨부 (편두통 도메인, 2초 타임아웃)
  if(S.currentDomain==='orangi-migraine'&&editIdx<0){
    try{const w=await Promise.race([fetchWeather(),new Promise(r=>setTimeout(()=>r(null),2000))]);if(w)entry.weather=w;}catch(e){console.warn('Weather attachment failed:',e);}
  }
  await ensureLogLoaded();
  const ds=D();
  // 빠른 기록 연동: 저장 성공 시 synced 마킹
  const quickId=document.getElementById('log-quick-id')?.value;
  const _markQuickSynced=()=>{
    if(!quickId)return;
    const ql=getQuickLogs();const qi=ql.find(l=>String(l.id)===quickId);
    if(qi){qi.synced=true;saveQuickLogs(ql);markSyncedOnCloud([parseInt(quickId)]);}
  };
  if(editIdx>=0 && ds.logData[editIdx]) {
    ds.logData[editIdx]=entry;
    ds.logData.sort((a,b)=>a.datetime.localeCompare(b.datetime));
    try{await saveLogData();_markQuickSynced();sendLogNotification(entry);showToast('✅ 기록 수정됨');S.logEditMode=false;renderView('log');}
    catch(e){showToast('❌ 저장 실패: '+e.message,4000);}
  } else {
    ds.logData.push(entry);ds.logData.sort((a,b)=>a.datetime.localeCompare(b.datetime));
    try{await saveLogData();_markQuickSynced();sendLogNotification(entry);showToast('✅ 기록 저장됨');_clearLogAutoSave();renderView('log');}
    catch(e){showToast('❌ 저장 실패: '+e.message,4000);}
  }
  if(btn)btn.disabled=false;if(sp)sp.style.display='none';
}

async function deleteLogEntry(idx) {
  if(!confirm('삭제할까요?'))return;
  _pushUndo('삭제');
  const ds=D();ds.logData.splice(idx,1);
  try{await saveLogData();showToast('🗑 삭제됨 (되돌리기 가능)');renderView('log');}
  catch(e){showToast('삭제 실패',3000);}
}

function editLogEntry(idx) {
  const ds=D(); const entry=ds.logData[idx]; if(!entry) return;
  S.logView='form'; S.logEditMode=true;
  renderView('log');
  // Pre-populate form after render
  setTimeout(()=>{
    const lc=DC().logConfig;
    document.getElementById('log-edit-idx').value=idx;
    document.getElementById('log-date').value=entry.datetime.slice(0,10);
    const cancelBtn=document.getElementById('log-cancel-edit');
    if(cancelBtn) cancelBtn.style.display='inline';
    const saveLabel=document.getElementById('log-save-label');
    if(saveLabel) saveLabel.textContent='수정 저장';
    // Time
    const timeVal=entry.datetime.slice(11,16);
    const timeEl=document.getElementById('log-time');
    const timeUnk=document.getElementById('log-time-unknown');
    if(timeVal.startsWith('시간') || timeVal==='00:00') {
      if(timeUnk){timeUnk.checked=true;if(timeEl){timeEl.disabled=true;timeEl.style.opacity='.3';}}
    } else if(timeEl) { timeEl.value=timeVal; }
    // NRS or mood — handle skip (-1)
    const isSkipped=entry.nrs<0 && !entry.mood;
    if(isSkipped) {
      const skip=document.getElementById('log-skip-nrs');
      if(skip){skip.checked=true;toggleNrsSkip(true);}
    } else if(lc.moodMode && entry.mood) {
      document.querySelectorAll('#mood-chips .log-chip').forEach(c=>{
        if(c.dataset.val===entry.mood){c.classList.add('sel','sel-sym');c.dataset.level=Math.round(Math.max(0,entry.nrs||0)/2.5);}
      });
    } else if(!lc.moodMode && entry.nrs>=0) {
      const nrsEl=document.getElementById('log-nrs');
      const nrsVal=document.getElementById('log-nrs-val');
      if(nrsEl){nrsEl.value=entry.nrs;}
      if(nrsVal){nrsVal.textContent=entry.nrs;}
    }
    // Sites
    (entry.sites||[]).forEach(s=>{
      const side=s.startsWith('왼쪽')?'left':'right';
      const val=s.replace(/^(왼쪽|오른쪽)\s*/,'');
      document.querySelectorAll(`.log-chip[data-side="${side}"]`).forEach(c=>{
        if(c.dataset.val===val) c.classList.add('sel','sel-'+side);
      });
    });
    // Triggers
    (entry.triggers||[]).forEach(s=>{
      document.querySelectorAll('.log-chip[data-group="trigger"]').forEach(c=>{
        if(c.dataset.val===s) c.classList.add('sel','sel-trigger');
      });
    });
    // Symptoms
    (entry.symptoms||[]).forEach(s=>{
      document.querySelectorAll('.log-chip[data-group="sym"]').forEach(c=>{
        if(c.dataset.val===s) c.classList.add('sel','sel-sym');
      });
    });
    // Meds
    (entry.meds||[]).forEach(s=>{
      document.querySelectorAll('.log-chip[data-group="med"]').forEach(c=>{
        if(c.dataset.val===s) c.classList.add('sel','sel-med');
      });
    });
    // Treatments — chip 매칭 + 나머지는 free-text에 합침
    const txFreeTexts=[];
    (entry.treatments||[]).forEach(s=>{
      let matched=false;
      document.querySelectorAll('.log-chip[data-group="tx"]').forEach(c=>{
        if(c.dataset.val===s){c.classList.add('sel','sel-tx');matched=true;}
      });
      if(!matched) txFreeTexts.push(s);
    });
    const txInput=document.getElementById('log-treatment');
    if(txInput && txFreeTexts.length) txInput.value=txFreeTexts.join(', ');
    // Memo
    const memoEl=document.getElementById('log-memo');
    if(memoEl) memoEl.value=entry.memo||'';
    // MedCheck restore
    if(entry.medCheck){
      document.querySelectorAll('.med-check-cb').forEach(cb=>{
        const med=cb.dataset.med;
        if(med in entry.medCheck) cb.checked=entry.medCheck[med];
      });
    }
    // Scroll to form
    document.querySelector('.log-form')?.scrollIntoView({behavior:'smooth'});
  },50);
}

function cancelLogEdit() {
  S.logEditMode=false;
  renderView('log');
}

// ── 날짜 변경 시 medCheck 새로고침 ──
function refreshMedCheckForDate(date) {
  const lc=DC().logConfig;
  const container=document.getElementById('med-check-container');
  if(!container) return;
  container.innerHTML=lc.moodMode?renderDailyMedCheck(date):renderConditionMedSelector(date);
}

// ── Mood selector (마음관리용) ──
function toggleNrsSkip(checked) {
  const area=document.getElementById('nrs-area');
  if(area){area.style.opacity=checked?'.3':'1';area.style.pointerEvents=checked?'none':'auto';}
  if(checked) {
    // Deselect any mood chips
    document.querySelectorAll('#mood-chips .log-chip').forEach(c=>c.classList.remove('sel','sel-sym'));
  }
}

function selectMood(el, level) {
  // Uncheck "기록 안함" if selecting mood
  const skip=document.getElementById('log-skip-nrs');
  if(skip?.checked){skip.checked=false;toggleNrsSkip(false);}
  document.querySelectorAll('#mood-chips .log-chip').forEach(c=>c.classList.remove('sel','sel-sym'));
  el.classList.add('sel','sel-sym');
  el.dataset.level = level;
}

// ── Custom chips (meds & symptoms) ──
// ── 기본 칩 숨김 관리 ──
function getHiddenChips() {
  try { return JSON.parse(localStorage.getItem('om_hidden_chips_'+S.currentDomain)||'{}'); } catch(e) { return {}; }
}
function _hideDefaultChip(group, val) {
  const h=getHiddenChips();
  if(!h[group]) h[group]=[];
  if(!h[group].includes(val)) h[group].push(val);
  localStorage.setItem('om_hidden_chips_'+S.currentDomain, JSON.stringify(h));
  showToast(`"${val}" 숨김 처리됨`);
  closeConfirmModal();
  renderView('log');
}
function _restoreDefaultChip(group, val) {
  const h=getHiddenChips();
  if(h[group]) h[group]=h[group].filter(v=>v!==val);
  localStorage.setItem('om_hidden_chips_'+S.currentDomain, JSON.stringify(h));
  showToast(`"${val}" 복원됨`);
  closeConfirmModal();
  renderView('log');
}

function _saveLogFormState() {
  const state={};
  state.date=document.getElementById('log-date')?.value||'';
  state.time=document.getElementById('log-time')?.value||'';
  state.timeUnknown=document.getElementById('log-time-unknown')?.checked||false;
  state.nrs=document.getElementById('log-nrs')?.value||'5';
  state.skipNrs=document.getElementById('log-skip-nrs')?.checked||false;
  state.memo=document.getElementById('log-memo')?.value||'';
  state.editIdx=document.getElementById('log-edit-idx')?.value||'-1';
  state.quickId=document.getElementById('log-quick-id')?.value||'';
  state.treatment=document.getElementById('log-treatment')?.value||'';
  // Selected chips
  state.chips=[];
  document.querySelectorAll('.log-chip.sel').forEach(c=>{
    state.chips.push({side:c.dataset.side||'',group:c.dataset.group||'',val:c.dataset.val||'',cls:[...c.classList]});
  });
  // Mood
  const moodSel=document.querySelector('#mood-chips .log-chip.sel');
  state.mood=moodSel?{val:moodSel.dataset.val,level:moodSel.dataset.level}:null;
  // DailyChecks
  state.dailyChecks={};
  document.querySelectorAll('[id^="dc-"] .log-chip.sel').forEach(c=>{
    const group=c.dataset.group;
    if(group?.startsWith('dc-')) state.dailyChecks[group.slice(3)]=c.dataset.val;
  });
  // MedCheck
  state.medCheck={};
  document.querySelectorAll('.med-check-cb').forEach(cb=>{
    state.medCheck[cb.dataset.med]=cb.checked;
  });
  return state;
}

function _restoreLogFormState(state) {
  if(!state) return;
  setTimeout(()=>{
    const d=document.getElementById('log-date');if(d&&state.date)d.value=state.date;
    const t=document.getElementById('log-time');if(t&&state.time)t.value=state.time;
    const tu=document.getElementById('log-time-unknown');if(tu){tu.checked=state.timeUnknown;if(state.timeUnknown&&t){t.disabled=true;t.style.opacity='.3';}}
    const nrs=document.getElementById('log-nrs');const nrsV=document.getElementById('log-nrs-val');
    if(nrs){nrs.value=state.nrs;}if(nrsV){nrsV.textContent=state.nrs;}
    const skip=document.getElementById('log-skip-nrs');if(skip&&state.skipNrs){skip.checked=true;toggleNrsSkip(true);}
    const memo=document.getElementById('log-memo');if(memo)memo.value=state.memo;
    const editIdx=document.getElementById('log-edit-idx');if(editIdx)editIdx.value=state.editIdx;
    if(state.quickId){let qid=document.getElementById('log-quick-id');if(!qid){qid=document.createElement('input');qid.type='hidden';qid.id='log-quick-id';editIdx?.parentNode?.appendChild(qid);}qid.value=state.quickId;}
    const tx=document.getElementById('log-treatment');if(tx)tx.value=state.treatment;
    // Restore chip selections
    state.chips.forEach(ch=>{
      const sel=ch.side?`[data-side="${ch.side}"][data-val="${ch.val}"]`:ch.group?`[data-group="${ch.group}"][data-val="${ch.val}"]`:'';
      if(!sel)return;
      const el=document.querySelector('.log-chip'+sel);
      if(el) ch.cls.filter(c=>c.startsWith('sel')||c==='sel').forEach(c=>el.classList.add(c));
    });
    // Restore mood
    if(state.mood){
      document.querySelectorAll('#mood-chips .log-chip').forEach(c=>{
        if(c.dataset.val===state.mood.val){c.classList.add('sel','sel-sym');c.dataset.level=state.mood.level;}
      });
    }
    // Restore dailyChecks
    if(state.dailyChecks){
      Object.entries(state.dailyChecks).forEach(([item, val])=>{
        const chip=document.querySelector(`#dc-${item} .log-chip[data-val="${val}"]`);
        if(chip){chip.classList.add('sel','sel-sym');}
      });
    }
    // Restore medCheck
    if(state.medCheck){
      document.querySelectorAll('.med-check-cb').forEach(cb=>{
        const med=cb.dataset.med;
        if(med in state.medCheck) cb.checked=state.medCheck[med];
      });
    }
  },10);
}

function addCustomChip(type) {
  const inputMap={meds:'med-other',syms:'sym-other',tx:'tx-other'};
  let inputId=inputMap[type];
  if(type==='tx'&&!document.getElementById(inputId)){inputId='log-treatment';}
  const el=document.getElementById(inputId);
  const val=(el?.value||'').trim();
  if(!val) return;
  const key=`om_custom_${type}_`+S.currentDomain;
  const list=JSON.parse(localStorage.getItem(key)||'[]');
  if(!list.includes(val)){list.push(val);localStorage.setItem(key,JSON.stringify(list));}
  el.value='';
  _syncCustomItemsToMaster();saveMaster();
  const saved=_saveLogFormState();
  renderView('log');
  _restoreLogFormState(saved);
  showToast(`✅ "${val}" 고정됨`);
}

function addCustomSite(side) {
  const el=document.getElementById('site-'+side+'-other');
  const val=(el?.value||'').trim();
  if(!val) return;
  const key='om_custom_sites_'+side+'_'+S.currentDomain;
  const list=JSON.parse(localStorage.getItem(key)||'[]');
  if(!list.includes(val)){list.push(val);localStorage.setItem(key,JSON.stringify(list));}
  el.value='';
  _syncCustomItemsToMaster();saveMaster();
  const saved=_saveLogFormState();
  renderView('log');
  _restoreLogFormState(saved);
  showToast(`✅ "${val}" 고정됨`);
}

function addCustomPainType() {
  const el=document.getElementById('pain-other');
  const val=(el?.value||'').trim();
  if(!val) return;
  const key='om_custom_pain_'+S.currentDomain;
  const list=JSON.parse(localStorage.getItem(key)||'[]');
  if(!list.includes(val)){list.push(val);localStorage.setItem(key,JSON.stringify(list));}
  el.value='';
  _syncCustomItemsToMaster();saveMaster();
  const saved=_saveLogFormState();
  renderView('log');
  _restoreLogFormState(saved);
  showToast(`✅ "${val}" 고정됨`);
}

function openChipManager(type) {
  const lc=DC().logConfig;
  // 기분 모드 처리
  if(type==='mood') {
    const allMoodOpts=['😞 우울','😶 무감정','😐 보통','🙂 양호','😊 좋음'];
    const hidden=getHiddenChips(); const hiddenMood=hidden.mood||[];
    const rows=allMoodOpts.map(item=>{
      const isHidden=hiddenMood.includes(item);
      return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--bd)">
        <span style="flex:1;font-size:.85rem;${isHidden?'color:var(--mu2);text-decoration:line-through':''}">${esc(item)}</span>
        <span style="font-size:.65rem;color:var(--mu2);margin-right:2px">${isHidden?'숨김':'기본'}</span>
        ${isHidden
          ?`<button onclick="_restoreDefaultChip('mood','${item.replace(/'/g,"\\'")}')" style="background:none;border:1px solid var(--bd);border-radius:4px;padding:2px 8px;font-size:.72rem;cursor:pointer;color:var(--gr)">↺ 복원</button>`
          :`<button onclick="_hideDefaultChip('mood','${item.replace(/'/g,"\\'")}')" style="background:none;border:1px solid var(--bd);border-radius:4px;padding:2px 8px;font-size:.72rem;cursor:pointer;color:var(--re)">✕ 숨김</button>`}
      </div>`;
    }).join('');
    showConfirmModal('✏️ 기분 항목 관리',
      `<div style="font-size:.78rem;color:var(--mu);margin-bottom:8px">항목을 숨기거나 복원할 수 있어요.</div>`+rows,
      [{label:'닫기',action:closeConfirmModal,primary:true}]
    );
    return;
  }
  const customKey=`om_custom_${type}_`+S.currentDomain;
  const customList=JSON.parse(localStorage.getItem(customKey)||'[]');
  const hidden=getHiddenChips();
  const group=type==='meds'?'med':type==='tx'?'tx':'sym';
  const hiddenList=hidden[group]||[];
  const defaultList=type==='meds'?(lc.meds||[]).filter(m=>m!=='기타'):type==='tx'?(lc.treatments||[]):(lc.symptoms||[]);
  const label=type==='meds'?'투약':type==='tx'?'치료/시술':'증상';
  const defaultRows=defaultList.map(item=>{
    const isHidden=hiddenList.includes(item);
    return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--bd)">
      <span style="flex:1;font-size:.85rem;${isHidden?'color:var(--mu2);text-decoration:line-through':''}">${esc(item)}</span>
      <span style="font-size:.65rem;color:var(--mu2);margin-right:2px">${isHidden?'숨김':'기본'}</span>
      ${isHidden
        ?`<button onclick="_restoreDefaultChip('${group}','${item.replace(/'/g,"\\'")}')" style="background:none;border:1px solid var(--bd);border-radius:4px;padding:2px 8px;font-size:.72rem;cursor:pointer;color:var(--gr)">↺ 복원</button>`
        :`<button onclick="_hideDefaultChip('${group}','${item.replace(/'/g,"\\'")}')" style="background:none;border:1px solid var(--bd);border-radius:4px;padding:2px 8px;font-size:.72rem;cursor:pointer;color:var(--re)">✕ 숨김</button>`}
    </div>`;
  }).join('');
  const customRows=customList.map((item,i)=>`<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--bd)">
    <span style="flex:1;font-size:.85rem">${esc(item)}</span>
    <span style="font-size:.65rem;color:var(--mu2);margin-right:2px">추가</span>
    <button onclick="_removeCustomChip('${type}',${i})" style="background:none;border:1px solid var(--bd);border-radius:4px;padding:2px 8px;font-size:.72rem;cursor:pointer;color:var(--re)">✕ 삭제</button>
  </div>`).join('');
  showConfirmModal(`✏️ ${label} 항목 관리`,
    `<div style="font-size:.78rem;color:var(--mu);margin-bottom:8px">기본 항목은 숨기거나 복원할 수 있고, 추가 항목은 삭제할 수 있어요.</div>`
    + (defaultRows||'') + (customRows||'')
    + (!defaultList.length&&!customList.length?'<div style="color:var(--mu);font-size:.82rem;padding:8px 0">항목이 없습니다.</div>':''),
    [{label:'닫기',action:closeConfirmModal,primary:true}]
  );
}

function _removeCustomChip(type,idx) {
  const key=`om_custom_${type}_`+S.currentDomain;
  const list=JSON.parse(localStorage.getItem(key)||'[]');
  const removed=list.splice(idx,1)[0];
  localStorage.setItem(key,JSON.stringify(list));
  showToast(`🗑 "${removed}" 삭제됨`);
  closeConfirmModal();
  renderView('log');
}

// ── Journal log (건강관리 / 붕룩이) ──
async function saveJournalLog() {
  const btn=document.getElementById('log-save-btn');const sp=document.getElementById('log-sp');
  if(btn)btn.disabled=true;if(sp)sp.style.display='block';
  const date=document.getElementById('log-date').value;
  const who=document.getElementById('log-who')?.value||'';
  const cats=[];document.querySelectorAll('.log-chip.sel[data-group="cat"]').forEach(el=>cats.push(el.dataset.val));
  const memo=document.getElementById('log-memo')?.value.trim();
  if(!memo){showToast('내용을 입력해 주세요.');if(btn)btn.disabled=false;if(sp)sp.style.display='none';return;}
  const editIdx=parseInt(document.getElementById('log-edit-idx')?.value ?? -1);
  const jNrsSkip=document.getElementById('journal-nrs-skip')?.checked;
  const jNrs=jNrsSkip?-1:parseInt(document.getElementById('journal-nrs')?.value||'5');
  // medCheck 수집 (저널 모드에서도 복용 체크 포함)
  const jMedCheck={};
  document.querySelectorAll('.med-check-cb').forEach(cb=>{jMedCheck[cb.dataset.med]=cb.checked;});
  const entry={id:editIdx>=0?(D().logData[editIdx]?.id||Date.now()):Date.now(),datetime:`${date}T00:00`,who,categories:cats,memo,nrs:jNrs,
    medCheck:Object.keys(jMedCheck).length?jMedCheck:undefined,
    sites:[],symptoms:[],meds:[],treatments:[]};
  await ensureLogLoaded();
  const ds=D();
  if(editIdx>=0 && ds.logData[editIdx]) {
    ds.logData[editIdx]=entry;
    ds.logData.sort((a,b)=>a.datetime.localeCompare(b.datetime));
    try{await saveLogData();showToast('✅ 기록 수정됨');S.logEditMode=false;renderView('log');}
    catch(e){showToast('❌ 저장 실패: '+e.message,4000);}
  } else {
    ds.logData.push(entry);ds.logData.sort((a,b)=>a.datetime.localeCompare(b.datetime));
    try{await saveLogData();showToast('✅ 기록 저장됨');_clearLogAutoSave();renderView('log');}
    catch(e){showToast('❌ 저장 실패: '+e.message,4000);}
  }
  if(btn)btn.disabled=false;if(sp)sp.style.display='none';
}

function editJournalEntry(idx) {
  const ds=D(); const entry=ds.logData[idx]; if(!entry) return;
  S.logView='form'; S.logEditMode=true;
  renderView('log');
  setTimeout(()=>{
    document.getElementById('log-edit-idx').value=idx;
    document.getElementById('log-date').value=entry.datetime.slice(0,10);
    const cancelBtn=document.getElementById('log-cancel-edit');
    if(cancelBtn) cancelBtn.style.display='inline';
    const saveLabel=document.getElementById('log-save-label');
    if(saveLabel) saveLabel.textContent='수정 저장';
    // Who selector
    const whoEl=document.getElementById('log-who');
    if(whoEl && entry.who) whoEl.value=entry.who;
    // Categories
    (entry.categories||[]).forEach(c=>{
      document.querySelectorAll('.log-chip[data-group="cat"]').forEach(el=>{
        if(el.dataset.val===c) el.classList.add('sel','sel-sym');
      });
    });
    // Memo
    const memoEl=document.getElementById('log-memo');
    if(memoEl) memoEl.value=entry.memo||'';
    document.querySelector('.log-form')?.scrollIntoView({behavior:'smooth'});
  },50);
}

function renderJournalLogs() {
  const ds=D();if(!ds.logData?.length) return '<div class="hint" style="padding:14px">아직 기록이 없어요</div>';
  const whoColors={오랑이:'#ec4899',붕쌤:'#06b6d4',함께:'#8b5cf6'};
  const whoEmoji={오랑이:'🧡',붕쌤:'🩵',함께:'💑'};
  return `<div class="card"><div class="card-title">📋 기록 (${ds.logData.length}건)</div>`+
    [...ds.logData].reverse().map((l,ri)=>{
      const realIdx=ds.logData.length-1-ri;
      const who=l.who||'';
      return `<div class="log-item">
        <div class="log-item-time">${l.datetime.slice(5,10)}${who?'<br><span style="color:'+(whoColors[who]||'var(--mu)')+'">'+((whoEmoji[who]||'')+' '+who)+'</span>':''}</div>
        <div class="log-item-body">
          ${(l.categories||[]).map(c=>`<span class="log-tag" style="background:#eff6ff;color:#1d4ed8">${esc(c)}</span>`).join('')}
          <div style="font-size:.82rem;margin-top:4px;line-height:1.65">${esc(l.memo||'')}</div>
        </div>
        <button class="log-del" onclick="editJournalEntry(${realIdx})" title="편집" style="color:var(--ac)">✏️</button>
        <button class="log-del" onclick="deleteLogEntry(${realIdx})">✕</button>
      </div>`;
    }).join('')+'</div>';
}

// ═══════════════════════════════════════════════════════════════
// 🔗 CROSS-DOMAIN CONTEXT (같은 유저의 다른 도메인 요약 자동 포함)
// ═══════════════════════════════════════════════════════════════
function getCrossDomainContext() {
  const currentUser = DC().user;
  const currentDomain = S.currentDomain;
  const lines = [];

  Object.entries(S.domainState).forEach(([domainId, ds]) => {
    if (domainId === currentDomain || !ds.master) return;
    const domDef = DOMAINS[domainId];
    if (!domDef || domDef.user !== currentUser) return;

    // 질환은 getConditionsContext()에서 통합 처리 — 여기서는 생략

    // Include recent medCheck compliance from sibling domains
    const sibLogs = ds.logData || [];
    const recentMc = sibLogs.filter(l=>l.medCheck&&Object.keys(l.medCheck).length).slice(-7);
    if (recentMc.length) {
      const mcStats={};
      recentMc.forEach(l=>Object.entries(l.medCheck).forEach(([k,v])=>{
        if(!mcStats[k])mcStats[k]={t:0,y:0};mcStats[k].t++;if(v)mcStats[k].y++;
      }));
      const mcLine=Object.entries(mcStats).map(([k,v])=>`${k}:${Math.round(v.y/v.t*100)}%`).join(', ');
      lines.push(`  복용순응(최근${recentMc.length}건): ${mcLine}`);
    }

    // Include brief SSOT excerpt (first 3 lines of context)
    const ctx = ds.master.patient_context || '';
    const firstLines = ctx.split('\n').filter(l=>l.trim().startsWith('-')).slice(0,3);
    if (firstLines.length && !(ds.master.conditions||[]).length) {
      lines.push(`[${domDef.icon} ${domDef.label} 참조]`);
      firstLines.forEach(l => lines.push(l));
    }
  });

  return lines.length ? '\n\n[타 도메인 참조 — ' + currentUser + ']\n' + lines.join('\n') : '';
}

function getRecentLogSummary() {
  const ds=D();if(!ds.logData?.length) return '';
  const now=new Date();
  const week=ds.logData.filter(l=>(now-new Date(l.datetime))<=7*86400000);
  if(!week.length) return '';
  const lc=DC().logConfig;

  // Journal mode (건강관리, 붕룩이)
  if(lc.customFields) {
    const lines=week.map(l=>{
      const cats=(l.categories||[]).join(',');
      const who=l.who?`[${l.who}]`:'';
      return `${l.datetime.slice(5,10)} ${who} ${cats?'{'+cats+'}':''} ${(l.memo||'').substring(0,80)}`;
    }).join('\n');
    return `[최근 7일 기록]\n${lines}`;
  }

  // Mood mode (마음관리)
  if(lc.moodMode) {
    const lines=week.map(l=>{
      const mood=l.mood||'';
      const syms=(l.symptoms||[]).join(',');
      const meds=(l.meds||[]).length?'💊'+(l.meds||[]).join('+'):'';
      const tx=(l.treatments||[]).length?'🩺'+(l.treatments||[]).join('+'):'';
      const dc=l.dailyChecks?Object.entries(l.dailyChecks).map(([k,v])=>k+':'+v).join(','):'';
      const mc=l.medCheck?Object.entries(l.medCheck).map(([k,v])=>(v?'✓':'✗')+k).join(','):'';
      return `${l.datetime.slice(5,16)} ${mood} ${syms} ${meds} ${tx}${dc?' [컨디션:'+dc+']':''}${mc?' [복용:'+mc+']':''}`.trim();
    }).join('\n');
    return `[최근 7일 기분/증상 기록]\n${lines}`;
  }

  // Standard mode (편두통)
  const outcomeLabel={better:'→호전',same:'→비슷',worse:'→악화',good:'→호전',partial:'→비슷',none:'→악화'};
  const _sl=_scoreLabel();
  const lines=week.map(l=>`${l.datetime.slice(5,16)} ${(l.sites||[]).join('+')||'-'}${l.nrs>=0?' '+_sl+l.nrs:''}${l.triggers?.length?' ⚡'+l.triggers.join('+'):''}`+(l.meds?.length?' 💊'+l.meds.join('+'):'')+(l.outcome?.rating?' '+outcomeLabel[l.outcome.rating]:'')).join('\n');
  const nrsVals=week.map(l=>l.nrs).filter(n=>n>=0);
  const avg=nrsVals.length?(nrsVals.reduce((a,b)=>a+b,0)/nrsVals.length).toFixed(1):'-';
  // 경과 요약
  const rated=week.filter(l=>l.outcome?.rating);
  let outcomeSummary='';
  if(rated.length) {
    const better=rated.filter(l=>l.outcome.rating==='better'||l.outcome.rating==='good').length;
    const same=rated.filter(l=>l.outcome.rating==='same'||l.outcome.rating==='partial').length;
    const worse=rated.filter(l=>l.outcome.rating==='worse'||l.outcome.rating==='none').length;
    outcomeSummary=`\n경과평가: ${rated.length}건 중 호전${better} 비슷${same} 악화${worse}`;
  }
  // 날씨 정보 포함
  const wLines=week.filter(l=>l.weather&&l.nrs>=0).map(l=>`${l.datetime.slice(5,10)} ${_sl}${l.nrs} ${l.weather.condition} ${l.weather.temp}° ${l.weather.pressure}hPa ${l.weather.humidity}%`);
  const weatherCtx=wLines.length?`\n[날씨-두통 데이터]\n${wLines.join('\n')}`:'';
  // 트리거 상관분석
  const triggerCtx=getTriggerCorrelation(week);
  return `[최근 7일 기록]\n${lines}\n평균NRS: ${avg}${outcomeSummary}${weatherCtx}${triggerCtx}`;
}

function getTriggerCorrelation(logs) {
  const withNrs=logs.filter(l=>l.nrs>=0);
  if(withNrs.length<3) return '';
  const triggerStats={};
  const avgAll=withNrs.reduce((s,l)=>s+l.nrs,0)/withNrs.length;
  withNrs.forEach(l=>{
    (l.triggers||[]).forEach(t=>{
      if(!triggerStats[t]) triggerStats[t]={count:0,nrsSum:0};
      triggerStats[t].count++;
      triggerStats[t].nrsSum+=l.nrs;
    });
    // 날씨 트리거 (기압 1010 이하 = 저기압)
    if(l.weather?.pressure&&l.weather.pressure<1010){
      const k='저기압(<1010hPa)';
      if(!triggerStats[k]) triggerStats[k]={count:0,nrsSum:0};
      triggerStats[k].count++;
      triggerStats[k].nrsSum+=l.nrs;
    }
  });
  const lines=Object.entries(triggerStats)
    .filter(([,v])=>v.count>=2)
    .sort(([,a],[,b])=>b.count-a.count)
    .map(([t,v])=>{const avg=(v.nrsSum/v.count).toFixed(1);const pct=Math.round(v.count/withNrs.length*100);return `${t}: ${v.count}회(${pct}%) 평균NRS${avg} (전체평균${avgAll.toFixed(1)})`;});
  return lines.length?`\n[트리거 상관분석]\n${lines.join('\n')}`:'';
}

// ═══════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════
function downloadFile(filename,content,type='text/plain') {
  const blob=new Blob([content],{type});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=filename;
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportSessionsMD() {
  const sessions=DM()?.sessions||[];
  const dc=DC();
  let md=`# ${dc.user} ${dc.label} — 세션 기록\n\n`;
  sessions.forEach(s=>{
    md+=`## ${s.date}\n**질문:** ${s.question}\n\n`;
    (s.rounds||[]).forEach(r=>{
      md+=`### Round ${r.round}\n`;
      Object.entries(r.answers||{}).forEach(([id,ans])=>{
        md+=`#### ${AI_DEFS[id]?.name||id}\n${ans}\n\n`;
      });
    });
    if(s.summary) md+=`### 요약\n${s.summary.session_summary||''}\n\n---\n\n`;
  });
  downloadFile(`${dc.folder}_sessions.md`,md);
  showToast('📄 MD 내보내기 완료');
}

function exportLogCSV() {
  const ds=D();
  if(!ds.logData?.length){showToast('내보낼 데이터 없음');return;}
  const lc=DC().logConfig;
  let csv;

  if(lc.customFields) {
    csv='날짜,누구,카테고리,내용\n';
    ds.logData.forEach(l=>{
      csv+=`${l.datetime.slice(0,10)},"${l.who||''}","${(l.categories||[]).join(';')}","${(l.memo||'').replace(/"/g,'""')}"\n`;
    });
  } else if(lc.moodMode) {
    csv='날짜,시간,기분,증상,투약,치료,컨디션체크,복용체크,메모\n';
    ds.logData.forEach(l=>{
      const dc=l.dailyChecks?Object.entries(l.dailyChecks).map(([k,v])=>k+':'+v).join(';'):'';
      const mc=l.medCheck?Object.entries(l.medCheck).map(([k,v])=>k+':'+(v?'O':'X')).join(';'):'';
      csv+=`${l.datetime.slice(0,10)},${l.datetime.slice(11,16)},"${l.mood||''}","${(l.symptoms||[]).join(';')}","${(l.meds||[]).join(';')}","${(l.treatments||[]).join(';')}","${dc}","${mc}","${(l.memo||'').replace(/"/g,'""')}"\n`;
    });
  } else {
    csv='날짜,시간,'+_scoreLabel()+',부위,트리거,증상,투약,치료,효과,메모\n';
    ds.logData.forEach(l=>{
      csv+=`${l.datetime.slice(0,10)},${l.datetime.slice(11,16)},${l.nrs>=0?l.nrs:''},"${(l.sites||[]).join(';')}","${(l.triggers||[]).join(';')}","${(l.symptoms||[]).join(';')}","${(l.meds||[]).join(';')}","${(l.treatments||[]).join(';')}","${l.outcome?.rating||''}","${(l.memo||'').replace(/"/g,'""')}"\n`;
    });
  }
  downloadFile(`${DC().logPrefix}_${ds.logMonth}.csv`,'\uFEFF'+csv,'text/csv;charset=utf-8');
  showToast('📊 CSV 내보내기 완료');
}

// ═══════════════════════════════════════════════════════════════
// LOG PRESET (프리셋 — 자주 쓰는 칩 조합 원탭 입력)
// ═══════════════════════════════════════════════════════════════
function _getPresetKey() { return `om_presets_${S.currentDomain}`; }
function _loadPresets() { try { return JSON.parse(localStorage.getItem(_getPresetKey())||'[]'); } catch(e) { return []; } }
function _savePresets(list) { localStorage.setItem(_getPresetKey(), JSON.stringify(list)); }

function saveLogPreset() {
  const chips=[];
  document.querySelectorAll('.log-chip.sel').forEach(c=>{
    chips.push({side:c.dataset.side||'',group:c.dataset.group||'',val:c.dataset.val||''});
  });
  if(!chips.length){showToast('선택된 항목이 없어요');return;}
  const label=chips.map(c=>c.val).join(' · ');
  const name=prompt('프리셋 이름:',label);
  if(!name||!name.trim()) return;
  const presets=_loadPresets();
  presets.push({name:name.trim(),chips,createdAt:kstToday()});
  _savePresets(presets);
  showToast('⭐ 프리셋 저장됨');
}

function showPresetList() {
  const presets=_loadPresets();
  if(!presets.length){showToast('저장된 프리셋이 없어요');return;}
  const body=presets.map((p,i)=>`<div style="display:flex;align-items:center;gap:8px;padding:8px 0;${i<presets.length-1?'border-bottom:1px solid var(--bd)':''}">
    <span style="flex:1;font-size:.82rem;cursor:pointer" onclick="applyPreset(${i});closeConfirmModal()">${esc(p.name)}</span>
    <span style="font-size:.65rem;color:var(--mu2)">${p.chips.length}개</span>
    <button style="background:none;border:none;cursor:pointer;font-size:.75rem" onclick="deletePreset(${i})">🗑</button>
  </div>`).join('');
  showConfirmModal('⭐ 프리셋 불러오기',body,[]);
}

function applyPreset(idx) {
  const presets=_loadPresets();
  const p=presets[idx]; if(!p) return;
  // 기존 선택 해제
  document.querySelectorAll('.log-chip.sel').forEach(c=>{c.classList.remove(...Array.from(c.classList).filter(cls=>cls.startsWith('sel')));});
  // 프리셋 칩 선택
  p.chips.forEach(chip=>{
    const selector=chip.side
      ? `.log-chip[data-side="${chip.side}"][data-val="${chip.val}"]`
      : `.log-chip[data-group="${chip.group}"][data-val="${chip.val}"]`;
    const el=document.querySelector(selector);
    if(el) { el.click(); }
  });
  showToast('⭐ 프리셋 적용');
}

function deletePreset(idx) {
  const presets=_loadPresets();
  presets.splice(idx,1);
  _savePresets(presets);
  showPresetList();
  showToast('🗑 프리셋 삭제');
}

// ═══════════════════════════════════════════════════════════════
// LOG FORM AUTO-SAVE — 작성 중 실수로 닫아도 복원
// ═══════════════════════════════════════════════════════════════
const _AUTOSAVE_KEY='om_log_autosave';
function _autoSaveLogForm() {
  try {
    const state=_saveLogFormState();
    if(state) sessionStorage.setItem(_AUTOSAVE_KEY, JSON.stringify({domain:S.currentDomain,state,ts:Date.now()}));
  } catch(e){}
}
function _tryRestoreLogForm() {
  try {
    const raw=sessionStorage.getItem(_AUTOSAVE_KEY);
    if(!raw) return;
    const parsed=JSON.parse(raw);
    if(!parsed||typeof parsed!=='object'||!parsed.state||!parsed.domain) { sessionStorage.removeItem(_AUTOSAVE_KEY); return; }
    const {domain,state,ts}=parsed;
    if(domain!==S.currentDomain) return;
    if(Date.now()-ts>3600000) { sessionStorage.removeItem(_AUTOSAVE_KEY); return; }
    if(!Array.isArray(state.chips)||(!state.chips.length&&!state.memo)) return;
    _restoreLogFormState(state);
    showToast('📝 이전 작성 내용 복원됨');
    sessionStorage.removeItem(_AUTOSAVE_KEY);
  } catch(e){ sessionStorage.removeItem(_AUTOSAVE_KEY); }
}
function _clearLogAutoSave() { sessionStorage.removeItem(_AUTOSAVE_KEY); }
// 500ms 디바운스 자동저장
let _autoSaveTimer;
function _scheduleAutoSave() { clearTimeout(_autoSaveTimer); _autoSaveTimer=setTimeout(_autoSaveLogForm,500); }
// 로그 폼 변경 감지 (이벤트 위임)
document.addEventListener('click', e => { if(e.target.closest('.log-chip')) _scheduleAutoSave(); });
document.addEventListener('input', e => { if(e.target.closest('#log-memo,#log-nrs,#log-time,#log-treatment')) _scheduleAutoSave(); });

// ═══════════════════════════════════════════════════════════════
// medCheck 마이그레이션 — 기존 meds 배열 → medCheck 객체 역산
// ═══════════════════════════════════════════════════════════════
async function migrateMedCheck() {
  const ds = D();
  if (!ds.logData?.length) { showToast('로그 데이터 없음'); return; }
  const condMeds = typeof getConditionMeds === 'function' ? null : null; // 질환별 약물은 날짜별로 조회
  let migrated = 0;
  ds.logData.forEach(l => {
    if (l.medCheck && Object.keys(l.medCheck).length) return; // 이미 있으면 스킵
    const meds = l.meds || [];
    if (!meds.length) return;
    // meds 배열에 있는 약물은 복용한 것으로 간주
    l.medCheck = {};
    meds.forEach(m => { l.medCheck[m] = true; });
    migrated++;
  });
  if (!migrated) { showToast('마이그레이션 대상 없음'); return; }
  await saveMaster();
  showToast('✅ medCheck 마이그레이션 완료: ' + migrated + '건');
}

// ═══════════════════════════════════════════════════════════════
// 증상 기록 폼 — 운동/영양제/체중/음주 (건강관리 도메인용)
// ═══════════════════════════════════════════════════════════════
function _renderLogDailyExtras(dateStr) {
  if (!S.currentDomain?.endsWith('-health')) return '';
  const brkDs = S.domainState['bungruki'];
  if (!brkDs?.master) return '';
  const m = brkDs.master;
  if (!m.dailyChecks) m.dailyChecks = {};
  if (!m.dailyChecks[dateStr]) m.dailyChecks[dateStr] = {};
  const who = DC()?.user === '붕쌤' ? 'bung' : 'orangi';
  if (!m.dailyChecks[dateStr][who]) m.dailyChecks[dateStr][who] = {};
  const dayData = m.dailyChecks[dateStr][who];

  // 영양제
  const oKeys = typeof BRK_SUPPL_ORANGI !== 'undefined' ? BRK_SUPPL_ORANGI : [];
  const bKeys = typeof BRK_SUPPL_BUNG !== 'undefined' ? BRK_SUPPL_BUNG : [];
  const supplLabels = {folicAcid:'엽산',iron:'철분',vitaminD:'비타민D',multivitamin:'멀티비타민',magnesium:'마그네슘',arginine:'아르기닌',coq10:'CoQ10',silymarin:'실리마린'};
  let supplKeys = who === 'orangi' ? [...oKeys] : [...bKeys];
  if (m.customSuppl?.[who]) m.customSuppl[who].forEach(c => { if (!supplKeys.includes(c.key)) { supplKeys.push(c.key); supplLabels[c.key] = c.label; } });
  const hidden = m.hiddenSuppl?.[who] || [];
  supplKeys = supplKeys.filter(k => !hidden.includes(k));

  const supplHtml = supplKeys.map(k => {
    const checked = dayData[k] || false;
    return `<div class="log-chip ${checked?'sel-med':''}" data-log-suppl="${k}" onclick="this.classList.toggle('sel-med');_saveLogSuppl('${dateStr}')">${checked?'✅':'⬜'} ${esc(supplLabels[k]||k)}</div>`;
  }).join('');

  // 운동 요약
  const exercises = dayData.exercises || [];
  const exSummary = exercises.length
    ? exercises.map(e => esc(e.name) + '(' + ({light:'약',moderate:'중',intense:'강'}[e.intensity]||'중') + (e.amount ? ' ' + e.amount + ({min:'분',sec:'초',reps:'회',sets:'세트',km:'km',m:'m'}[e.unit]||'분') : '') + ')').join(', ')
    : '없음';

  // 체중/음주
  const weight = dayData.weight || '';
  const alcohol = dayData.alcohol || false;

  return `<div style="margin-top:8px;padding:10px;background:var(--sf2);border:1.5px solid var(--domain-color,var(--bd));border-radius:8px">
    <div style="font-size:.72rem;font-weight:700;color:var(--domain-color,var(--ac));margin-bottom:6px">🏃 데일리체크</div>
    <div class="log-section-title" style="margin-top:0">💊 영양제</div>
    <div class="log-chips">${supplHtml}</div>
    <div class="log-section-title">🏃 운동: <span style="font-weight:400;font-size:.68rem">${exSummary}</span>
      <button onclick="if(typeof _addExerciseCustom==='function')_addExerciseCustom()" style="background:none;border:1px dashed var(--ac);border-radius:4px;padding:1px 6px;font-size:.58rem;color:var(--ac);cursor:pointer;margin-left:4px">+ 추가</button>
    </div>
    <div style="display:flex;gap:8px;align-items:center;margin-top:4px">
      <span style="font-size:.65rem;color:var(--mu)">⚖️</span>
      <input type="number" step="0.1" id="log-weight" value="${weight}" placeholder="kg" onchange="_saveLogWeight('${dateStr}',this.value)"
        style="width:55px;padding:3px 4px;font-size:.68rem;border:1px solid var(--bd);border-radius:4px;text-align:center;font-family:var(--mono);color:var(--ink);background:var(--sf)">
      <span style="font-size:.55rem;color:var(--mu2)">kg</span>
      ${who === 'bung' ? `<label style="margin-left:auto;display:flex;align-items:center;gap:4px;font-size:.65rem;color:var(--mu);cursor:pointer">
        <input type="checkbox" ${alcohol?'checked':''} onchange="_saveLogAlcohol('${dateStr}',this.checked)" style="accent-color:#dc2626"> 🍺 음주
      </label>` : ''}
    </div>
  </div>`;
}

function _saveLogSuppl(dateStr) {
  const brkDs = S.domainState['bungruki']; if (!brkDs?.master) return;
  const who = DC()?.user === '붕쌤' ? 'bung' : 'orangi';
  const d = brkDs.master.dailyChecks[dateStr][who];
  document.querySelectorAll('[data-log-suppl]').forEach(el => {
    d[el.dataset.logSuppl] = el.classList.contains('sel-med');
  });
  saveBrkMaster();
}
function _saveLogWeight(dateStr, val) {
  const brkDs = S.domainState['bungruki']; if (!brkDs?.master) return;
  const who = DC()?.user === '붕쌤' ? 'bung' : 'orangi';
  brkDs.master.dailyChecks[dateStr][who].weight = val ? parseFloat(val) : null;
  saveBrkMaster();
}
function _saveLogAlcohol(dateStr, checked) {
  const brkDs = S.domainState['bungruki']; if (!brkDs?.master) return;
  brkDs.master.dailyChecks['bung'] && (brkDs.master.dailyChecks[dateStr].bung.alcohol = checked);
  saveBrkMaster();
}
