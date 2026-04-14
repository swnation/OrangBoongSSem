// js/drive.js — Google Drive + OAuth (Phase 2 모듈화)

// ═══════════════════════════════════════════════════════════════
// GOOGLE AUTH & DRIVE
// ═══════════════════════════════════════════════════════════════
let tokenClient;
let _tokenExpiresAt = 0;
let _tokenRefreshTimer = null;

function signIn() {
  if (!window.google?.accounts?.oauth2) {
    showToast('Google 인증 스크립트 로딩 중입니다. 잠시 후 다시 눌러주세요.', 3000);
    return;
  }
  if (!tokenClient) {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID, scope: SCOPES, callback: handleToken,
    });
  }
  tokenClient.requestAccessToken();
}

function scheduleTokenRefresh(expiresInSec) {
  if (_tokenRefreshTimer) clearTimeout(_tokenRefreshTimer);
  _tokenExpiresAt = Date.now() + expiresInSec * 1000;
  // Refresh 5 minutes before expiry
  const refreshIn = Math.max((expiresInSec - 300) * 1000, 60000);
  _tokenRefreshTimer = setTimeout(() => {
    if (!tokenClient) return;
    tokenClient.requestAccessToken({prompt: ''});
  }, refreshIn);
}

function isTokenExpired() {
  return _tokenExpiresAt > 0 && Date.now() > _tokenExpiresAt;
}

let _tokenRefreshResolve = null;

async function ensureValidToken() {
  if (!S.token) return false;
  if (!isTokenExpired()) return true;
  // Token expired — try silent refresh
  if (!tokenClient) return false;
  return new Promise(resolve => {
    _tokenRefreshResolve = resolve;
    tokenClient.requestAccessToken({prompt: ''});
  });
}

function _tryAutoLogin() {
  if(S.token||!window.google?.accounts?.oauth2) return;
  if(getAppSetting('autoLogin')!=='true') return;
  try {
    if(!tokenClient) {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID, scope: SCOPES, callback: handleToken,
      });
    }
    tokenClient.requestAccessToken({prompt:''});
  } catch(e){ console.warn('Auto-login failed:', e); }
}

function checkGSI(attempts) {
  if(!attempts) attempts=0;
  if (window.google?.accounts?.oauth2) {
    const el = document.getElementById('gsi-status');
    if (el) { el.textContent = '✓ 준비됨 — 위 버튼을 눌러 로그인하세요'; el.style.color = '#2d6a4f'; }
    // 자동 로그인 시도
    _tryAutoLogin();
  } else if(attempts<20) {
    setTimeout(()=>checkGSI(attempts+1), 500);
  } else if(attempts===20) {
    // 동적 재로드 시도
    const s=document.createElement('script');
    s.src='https://accounts.google.com/gsi/client';
    s.onload=()=>setTimeout(()=>checkGSI(21),500);
    s.onerror=()=>checkGSI(30);
    document.head.appendChild(s);
  } else if(attempts<30) {
    setTimeout(()=>checkGSI(attempts+1), 500);
  } else {
    const el = document.getElementById('gsi-status');
    if (el) { el.innerHTML = '⚠️ Google 인증 로드 실패 — <a href="javascript:location.reload()" style="color:var(--ac)">새로고침</a> 또는 <a href="javascript:void(0)" onclick="checkGSI(0)" style="color:var(--ac)">재시도</a>'; el.style.color = '#c03030'; }
  }
}
checkGSI(0);

function handleToken(resp) {
  if (resp.error) {
    if (_tokenRefreshResolve) { _tokenRefreshResolve(false); _tokenRefreshResolve = null; }
    showToast('❌ 로그인 실패: ' + resp.error, 4000);
    return;
  }
  const isRefresh = !!S.token; // already had a token = this is a refresh
  S.token = resp.access_token;
  setAppSetting('autoLogin','true'); // 다음 방문 시 자동 로그인
  scheduleTokenRefresh(resp.expires_in || 3600);
  if (_tokenRefreshResolve) { _tokenRefreshResolve(true); _tokenRefreshResolve = null; return; }
  if (isRefresh) return; // silent refresh from timer — no UI reload needed
  setDriveStatus(true);
  _initAutoLoginToggle();
  const dc = document.getElementById('default-connect'); if(dc) dc.style.display='none';
  const locked = document.getElementById('sb-locked'); if(locked) locked.style.display='none';
  const unlocked = document.getElementById('sb-unlocked');
  if(unlocked) { unlocked.style.display='flex'; unlocked.style.flexDirection='column'; }
  loadDomainData(S.currentDomain).then(()=>{
    // 백그라운드에서 모든 도메인 로드 (비용 추적 + 교차도메인)
    loadAllDomainsForCost().then(()=>updateSidebarCost());
  });
}

function requireLogin() {
  if (!S.token) { showToast('🔒 Google Drive 로그인 후 사용할 수 있습니다.', 3000); return false; }
  return true;
}

function signOut() {
  if(S.token&&window.google?.accounts?.oauth2) {
    google.accounts.oauth2.revoke(S.token,()=>{});
  }
  S.token=null;
  setAppSetting('autoLogin',null);
  if(_tokenRefreshTimer)clearTimeout(_tokenRefreshTimer);
  _tokenExpiresAt=0;
  setDriveStatus(false);
  showToast('🚪 로그아웃됨',2000);
  setTimeout(()=>location.reload(),500);
}

function toggleAutoLogin(enabled) {
  setAppSetting('autoLogin',enabled?'true':null);
  showToast(enabled?'✅ 자동 로그인 켜짐':'⬜ 자동 로그인 꺼짐');
}

function _initAutoLoginToggle() {
  const cb=document.getElementById('auto-login-toggle');
  if(cb) cb.checked=getAppSetting('autoLogin')==='true';
}

function setDriveStatus(ok) {
  document.getElementById('drive-status').innerHTML = ok
    ? `<div class="drive-dot" style="background:#2d8a5a"></div><span style="font-size:.72rem;color:#5a9a6a">Drive 연결됨</span>`
    : `<div class="drive-dot" style="background:#6a4a2a"></div><span style="font-size:.72rem;color:#5a6a7e">연결 안됨</span>`;
}

function updateDriveStatusFull() {
  const dc = DC();
  document.getElementById('drive-status').innerHTML =
    `<div class="drive-dot" style="background:#2d8a5a"></div>
     <div><div style="font-size:.72rem;color:#5a9a6a">Drive 연결됨</div>
     <div style="font-size:.63rem;color:#3d5a6a;font-family:var(--mono);margin-top:1px">📁 ${dc.folder}</div></div>`;
}

async function driveSearch(name, parentId=null) {
  if (isTokenExpired()) await ensureValidToken();
  let q = `name='${name}' and trashed=false`;
  if (parentId) q += ` and '${parentId}' in parents`;
  const res = await fetchWithRetry(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,modifiedTime)`,
    {headers:{Authorization:'Bearer '+S.token}});
  const d = await res.json();
  if (d.error) throw new Error(d.error.message);
  return d.files || [];
}
async function driveRead(fileId) {
  if (isTokenExpired()) await ensureValidToken();
  const res = await fetchWithRetry(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    {headers:{Authorization:'Bearer '+S.token}});
  return res.json();
}
async function driveCreate(name, data, parentId=null) {
  if (isTokenExpired()) await ensureValidToken();
  const boundary='om_bound_x7';
  const metaObj={name,mimeType:'application/json'};
  if(parentId) metaObj.parents=[parentId];
  const meta=JSON.stringify(metaObj);
  const body=`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(data)}\r\n--${boundary}--`;
  const res = await fetchWithRetry('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',{
    method:'POST',headers:{Authorization:'Bearer '+S.token,'Content-Type':`multipart/related; boundary=${boundary}`},body});
  const d=await res.json(); if(d.error) throw new Error(d.error.message); return d.id;
}
async function driveUpdate(fileId, data) {
  if (isTokenExpired()) await ensureValidToken();
  const res = await fetchWithRetry(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,{
    method:'PATCH',headers:{Authorization:'Bearer '+S.token,'Content-Type':'application/json'},body:JSON.stringify(data)});
  const d=await res.json(); if(d.error) throw new Error(d.error.message); return d;
}
async function getOrCreateFolder(name) {
  if (isTokenExpired()) await ensureValidToken();
  const q=`name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const res=await fetchWithRetry(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`,
    {headers:{Authorization:'Bearer '+S.token}});
  const d=await res.json(); if(d.error) throw new Error(d.error.message);
  if(d.files?.length>0) return d.files[0].id;
  const cr=await fetchWithRetry('https://www.googleapis.com/drive/v3/files?fields=id',{
    method:'POST',headers:{Authorization:'Bearer '+S.token,'Content-Type':'application/json'},
    body:JSON.stringify({name,mimeType:'application/vnd.google-apps.folder'})});
  const cd=await cr.json(); if(cd.error) throw new Error(cd.error.message);
  showToast(`📁 "${name}" 폴더 생성됨`);
  return cd.id;
}

// 비용 추적용: 모든 도메인(유저 무관) 백그라운드 로드
let _loadingAllForCost=false;
async function loadAllDomainsForCost() {
  if(_loadingAllForCost) return;
  _loadingAllForCost=true;
  const unloaded=Object.entries(DOMAINS).filter(([id])=>!S.domainState[id]?.master);
  for(const [domainId,dc] of unloaded) {
    try {
      if(!S.domainState[domainId]) S.domainState[domainId]={};
      const ds=S.domainState[domainId];
      const folderId=await getOrCreateFolder(dc.folder);
      ds.folderId=folderId;
      const files=await driveSearch(dc.masterFile,folderId);
      if(files.length>0) {
        ds.masterFileId=files[0].id;
        ds.master=await driveRead(ds.masterFileId);
        const def=getDefaultMaster();
        for(const k of Object.keys(def)){if(!(k in ds.master))ds.master[k]=def[k];}
        // localStorage 비용 캐시 동기화
        if(ds.master.usage_data) {
          try{setUsageCache(domainId,ds.master.usage_data);}catch(e){}
        }
      }
    } catch(e) { /* 조용히 실패 */ }
  }
  _loadingAllForCost=false;
}

// ═══════════════════════════════════════════════════════════════
// DOMAIN DATA LOADING (per-domain Drive folders)
// ═══════════════════════════════════════════════════════════════
async function loadDomainData(domainId) {
  renderLoading(`${DOMAINS[domainId].icon} ${DOMAINS[domainId].label} 데이터 로드 중...`);
  try {
    const dc = DOMAINS[domainId];
    const folderId = await getOrCreateFolder(dc.folder);
    if (!S.domainState[domainId]) S.domainState[domainId] = {};
    const ds = S.domainState[domainId];
    ds.folderId = folderId;

    const files = await driveSearch(dc.masterFile, folderId);
    if (files.length > 0) {
      ds.masterFileId = files[0].id;
      ds.master = await driveRead(ds.masterFileId);
      // Ensure all fields exist
      const def = getDefaultMaster();
      for (const k of Object.keys(def)) { if (!(k in ds.master)) ds.master[k] = def[k]; }
      if (!ds.master.accumulated) ds.master.accumulated = def.accumulated;
      // localStorage 비용 캐시 병합 (Drive 저장 전 페이지 갱신 시 손실 복구)
      try {
        const localUsage=getUsageCache(domainId);
        if(localUsage) {
          if(!ds.master.usage_data) ds.master.usage_data={};
          Object.entries(localUsage).forEach(([date,aiMap])=>{
            if(!ds.master.usage_data[date]) ds.master.usage_data[date]={};
            Object.entries(aiMap).forEach(([aiId,data])=>{
              const d=ds.master.usage_data[date][aiId];
              if(!d||data.cost>d.cost) ds.master.usage_data[date][aiId]=data;
            });
          });
        }
      } catch(e) {}
      // Legacy: migrate old _keys_encrypted (base64, insecure) to localStorage only
      if (ds.master._keys_encrypted && Object.keys(S.keys).length === 0) {
        try {
          const saved = JSON.parse(atob(ds.master._keys_encrypted));
          if(saved.keys) Object.keys(saved.keys).forEach(id=>{if(!S.keys[id]&&saved.keys[id])S.keys[id]=saved.keys[id];});
          if(saved.models) Object.keys(saved.models).forEach(id=>{if(saved.models[id])S.models[id]=saved.models[id];});
          _storageSetJSON('om_keys',S.keys);
          setAppSetting('models',S.models);
        } catch(e) {}
        // Remove insecure key storage from Drive
        delete ds.master._keys_encrypted;
        try { await driveUpdate(ds.masterFileId, ds.master); } catch(e) {}
      }
    } else {
      ds.master = getDefaultMaster();
      ds.masterFileId = await driveCreate(dc.masterFile, ds.master, folderId);
      showToast(`✅ "${dc.folder}/${dc.masterFile}" 생성됨`);
    }
    // Init log state
    ds.logData = []; ds.logMonth = ''; ds.logFileId = null;

    updateDriveStatusFull();
    renderSidebarAIs();
    updateHistCount();
    updateSidebarCost();

    // Restore in-progress session if exists
    if (ds.master._inProgressSession && !S.session) {
      const prev = ds.master._inProgressSession;
      if (prev.currentRound > 0 && prev.currentRound < 4) {
        S.session = prev;
        S._dirty = false;
        showToast('📌 이전 진행 중 세션이 복원되었습니다.', 3500);
        document.getElementById('session-round-badge').style.display='inline';
        document.getElementById('session-round-badge').textContent=`R${prev.currentRound}`;
        switchView('session');
      } else {
        switchView('home');
      }
    } else {
      switchView('home');
    }
    checkPriceUpdate();
    migrateConditions();
    autoCodeBackup();
    requestNotificationPermission();
    ensureLogLoaded().then(()=>{migrateSiteNames();checkDailyReminder();checkWeeklyInsight();}).catch(()=>{});
    // 빠른 기록 체크 (클라우드 우선, 로컬 폴백)
    pollCloudQuickLogs().then(()=>{
      _lastQuickLogCount=getPendingQuickLogs().length;
      updateQuickLogBadge();
      if(_lastQuickLogCount>0) setTimeout(()=>showToast(`📱 오랑이 빠른 기록 ${_lastQuickLogCount}건 미반영`,4000),2000);
    });
  } catch(e) {
    // Attempt offline fallback from localStorage
    const cached = loadFromLocal(domainId);
    if (cached?.master) {
      if (!S.domainState[domainId]) S.domainState[domainId] = {};
      const ds = S.domainState[domainId];
      ds.master = cached.master;
      ds.masterFileId = null;
      ds.logData = []; ds.logMonth = ''; ds.logFileId = null;
      const cacheAge = Math.round((Date.now() - cached.timestamp) / 60000);
      setDriveStatus(false);
      document.getElementById('drive-status').innerHTML =
        `<div class="drive-dot" style="background:#e67e22"></div>
         <span style="font-size:.72rem;color:#e67e22">오프라인 모드 (${cacheAge}분 전 캐시)</span>`;
      renderSidebarAIs();
      updateHistCount();
      updateSidebarCost();
      switchView('home');
      showToast('⚠️ Drive 연결 실패 — 로컬 캐시로 동작 중', 4000);
    } else {
      renderError('Drive 로드 실패: ' + e.message + '\n\n페이지를 새로고침하고 다시 연결해 주세요.');
    }
  }
}

async function saveMaster() {
  const ds = D();
  if (!ds.masterFileId) return;
  ds.master.accumulated.last_updated = kstNow().toISOString();
  if (S.session && S.session.currentRound > 0 && S.session.currentRound < 4) {
    ds.master._inProgressSession = { ...S.session };
  } else {
    delete ds.master._inProgressSession;
  }
  // 커스텀 항목 Drive 동기화
  _syncCustomItemsToMaster();
  stampVersion(ds.master);
  await driveUpdate(ds.masterFileId, ds.master);
}

// ── 커스텀 항목 클라우드 영구 저장 ──
const _CUSTOM_KEYS=['meds','syms','tx','sites_left','sites_right','pain','triggers'];

function _syncCustomItemsToMaster() {
  const ds=D(); const dom=S.currentDomain;
  const customs={};
  _CUSTOM_KEYS.forEach(k=>{
    const val=getCustomItems(dom,k);
    if(val.length) customs[k]=val;
  });
  if(Object.keys(customs).length) ds.master._customItems=customs;
  else delete ds.master._customItems;
}

function _restoreCustomItemsFromMaster(ds, domainId) {
  const customs=ds.master?._customItems;
  if(!customs) return;
  _CUSTOM_KEYS.forEach(k=>{
    if(!customs[k]?.length) return;
    const existing=getCustomItems(domainId,k);
    const merged=[...new Set([...existing,...customs[k]])];
    setCustomItems(domainId,k,merged);
  });
}

async function manualBackup() {
  if (!requireLogin()) return;
  showToast('📦 백업 생성 중...');
  const ds = D(); const dc = DC();
  try {
    const date = kstToday();
    const name = `${dc.logPrefix}_backup_${date}.json`;
    await driveCreate(name, {...ds.master, backup_date:kstNow().toISOString()}, ds.folderId);
    ds.master.last_backup = kstNow().toISOString();
    await saveMaster();
    showToast(`📦 백업 완료: ${dc.folder}/${name}`);
  } catch(e) { showToast('⚠️ 백업 실패: '+e.message, 4000); }
}

// ═══════════════════════════════════════════════════════════════
// CODE BACKUP TO GOOGLE DRIVE
// ═══════════════════════════════════════════════════════════════
async function codeBackupToDrive() {
  if (!requireLogin()) return;
  showToast('💾 코드 백업 생성 중...');
  try {
    // 백업 전용 폴더
    const folderId = await getOrCreateFolder('Orangi Code Backups');
    const ver = APP_VERSION[0]?.v || 'unknown';
    const date = kstToday();

    // 현재 코드 파일 수집 (inline)
    const files = {};
    // index.html — 현재 실행 중인 전체 HTML
    files['index.html'] = document.documentElement.outerHTML ? null : null; // placeholder
    // style.css, quick.html 등은 fetch로 가져옴
    const filesToFetch = ['index.html','style.css','quick/index.html','sw.js','manifest.json','quick/manifest.json','CLAUDE.md'];
    for (const fname of filesToFetch) {
      try {
        const res = await fetch('./' + fname, {cache:'no-store'});
        if (res.ok) files[fname] = await res.text();
      } catch(e) {}
    }

    // 변경 로그: APP_VERSION + git 커밋 메시지 대용
    const changelog = APP_VERSION.map(v => `${v.v} (${v.date}): ${v.note}`);

    // v9.0 세션 맥락 기록
    const context = [
      '부위 구조: 미간(내측눈썹)·이마(외측이마)·눈썹부위(눈썹뼈)·관자놀이·후두부',
      'nrs 규칙: nrs>=0 유효, nrs===-1 미기록, nrs>0 사용 금지',
      'esc() 규칙: onclick에 사용자 텍스트 직접삽입 금지 → 전역변수 참조',
      '날짜 규칙: kstToday()/kstNow() 사용, new Date().toISOString() 금지',
      '알림: 카톡 불가 → PWA Notification API + 3분 폴링',
      'quick.html: 오랑이 전용 두통 입력, 클라우드(Apps Script) 주 저장소',
      'API 키: localStorage 전용, Drive 동기화 안 함',
      '백업: 최근 5개 버전 유지, 코드+맥락 함께 Drive 저장',
    ];

    const backup = {
      version: ver,
      date: date,
      createdAt: kstNow().toISOString(),
      changelog: changelog,
      context: context,
      files: files,
    };

    const fileName = `orangi_code_${ver}_${date}.json`;

    // 같은 이름 파일 있으면 덮어쓰기
    const existing = await driveSearch(fileName, folderId);
    if (existing.length > 0) {
      await driveUpdate(existing[0].id, backup);
    } else {
      await driveCreate(fileName, backup, folderId);
    }

    showToast(`💾 코드 백업 완료: ${fileName}`, 4000);
  } catch(e) {
    showToast('⚠️ 코드 백업 실패: ' + e.message, 4000);
  }
}

// 버전 업 시 자동 코드 백업
async function autoCodeBackup() {
  const ver = APP_VERSION[0]?.v;
  if (!ver) return;
  const lastBackupVer = _storageGet('om_last_code_backup');
  if (lastBackupVer === ver) return; // 이미 이 버전 백업함
  try {
    await codeBackupToDrive();
    _storageSet('om_last_code_backup', ver);
  } catch(e) {}
}

// ═══════════════════════════════════════════════════════════════
// 💾 OFFLINE FALLBACK (localStorage cache)
// ═══════════════════════════════════════════════════════════════
const OFFLINE_PREFIX = 'om_offline_';

function cacheToLocal(domainId) {
  try {
    const ds = S.domainState[domainId];
    if (!ds?.master) return;
    const key = OFFLINE_PREFIX + domainId;
    setOfflineCache(domainId, {
      master: ds.master,
      timestamp: Date.now(),
    });
  } catch(e) { /* quota exceeded etc */ }
}

function loadFromLocal(domainId) {
  try {
    const data = getOfflineCache(domainId);
    return data;
  } catch(e) { return null; }
}

// Wrap saveMaster to also cache locally
// Offline cache: save locally after each Drive save
const _origSaveMasterFn = saveMaster;
saveMaster = async function() {
  try {
    await _origSaveMasterFn();
    cacheToLocal(S.currentDomain);
  } catch(e) {
    cacheToLocal(S.currentDomain);
    showToast('⚠️ Drive 저장 실패 — 로컬 임시 저장', 3000);
    throw e;
  }
};
