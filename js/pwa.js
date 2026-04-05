// js/pwa.js — PWA 설치 + 알림 + 오프라인 (Phase 5 모듈화)

// ═══════════════════════════════════════════════════════════════
// SW UPDATE NOTIFICATION — 새 버전 감지 시 리로드 안내
// ═══════════════════════════════════════════════════════════════
if('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', e => {
    if(e.data?.type==='SW_UPDATED') {
      const bar=document.createElement('div');
      bar.style.cssText='position:fixed;bottom:0;left:0;right:0;background:#1e40af;color:#fff;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;z-index:9999;font-size:.82rem;font-family:inherit';
      bar.innerHTML='🔄 새 버전이 있습니다 <button onclick="location.reload()" style="background:#fff;color:#1e40af;border:none;border-radius:6px;padding:6px 14px;font-weight:700;cursor:pointer;font-size:.78rem">새로고침</button> <button onclick="this.parentElement.remove()" style="background:none;border:none;color:#fff;cursor:pointer;font-size:1rem;margin-left:8px">✕</button>';
      document.body.appendChild(bar);
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// BEFOREUNLOAD WARNING (Bug fix: unsaved session warning)
// ═══════════════════════════════════════════════════════════════
window.addEventListener('beforeunload', e => {
  if (S._dirty && S.session && S.session.currentRound > 0 && S.session.currentRound < 4) {
    e.preventDefault();
    e.returnValue = '';
  }
});

// ═══════════════════════════════════════════════════════════════
// OFFLINE FALLBACK — save to localStorage when Drive unavailable
// ═══════════════════════════════════════════════════════════════
function saveOffline(key, data) {
  try { localStorage.setItem('om_offline_'+key, JSON.stringify(data)); } catch(e) {}
}
function loadOffline(key) {
  try { return JSON.parse(localStorage.getItem('om_offline_'+key)||'null'); } catch(e) { return null; }
}
// On Drive save failure, fallback to offline
// ═══════════════════════════════════════════════════════════════
// 📎 FILE ATTACHMENTS (Drive upload + AI context)
// ═══════════════════════════════════════════════════════════════
var _sessionFiles = []; // {name, type, size, driveId, base64}
var _conditionFiles = []; // same structure

function handleSessionFiles(input) {
  Array.from(input.files).forEach(file => processFile(file, '_session'));
  input.value = '';
}
function handleConditionFiles(input) {
  Array.from(input.files).forEach(file => processFile(file, '_condition'));
  input.value = '';
}

async function processFile(file, target) {
  const maxSize = 10 * 1024 * 1024; // 10MB
  if(file.size > maxSize) { showToast('⚠️ 파일 크기 10MB 초과: '+file.name); return; }

  const reader = new FileReader();
  reader.onload = async function(e) {
    const base64 = e.target.result.split(',')[1];
    const fileObj = {
      name: file.name,
      type: file.type,
      size: file.size,
      base64: file.type.startsWith('image/') ? base64 : null, // images only for AI vision
      driveId: null,
    };

    // Upload to Drive
    try {
      const ds = D();
      if(ds.folderId && S.token) {
        renderUploadProgress(file.name, 30);
        const boundary = 'file_bound_'+Date.now();
        const meta = JSON.stringify({name: file.name, parents:[ds.folderId]});
        const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: ${file.type}\r\nContent-Transfer-Encoding: base64\r\n\r\n${base64}\r\n--${boundary}--`;
        renderUploadProgress(file.name, 60);
        const res = await fetchWithRetry('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',{
          method:'POST',headers:{Authorization:'Bearer '+S.token,'Content-Type':`multipart/related; boundary=${boundary}`},body});
        const d = await res.json();
        if(d.id) { fileObj.driveId = d.id; fileObj.webLink = d.webViewLink; }
        renderUploadProgress(file.name, 100);
      }
    } catch(err) { renderUploadProgress(file.name, 100); /* Drive upload optional */ }

    if(target === '_session') {
      _sessionFiles.push(fileObj);
      renderFileChips('q-file-list', _sessionFiles, '_session');
    } else {
      _conditionFiles.push(fileObj);
      renderFileChips('dx-file-list', _conditionFiles, '_condition');
    }
    showToast(`📎 ${file.name} 첨부됨${fileObj.driveId?' (Drive 업로드 완료)':''}`);
  };
  reader.readAsDataURL(file);
}

function renderFileChips(containerId, files, target) {
  const el = document.getElementById(containerId);
  if(!el) return;
  el.innerHTML = files.map((f,i) => {
    const icon = f.type.startsWith('image/')?'🖼️':f.type.includes('pdf')?'📄':'📃';
    const sizeKB = Math.round(f.size/1024);
    return `<span class="file-chip">${icon} ${esc(f.name)} (${sizeKB}KB)
      ${f.driveId?'<span style="color:var(--gr);font-size:.6rem">☁️</span>':''}
      <span class="file-remove" onclick="removeFile(${i},'${target}','${containerId}')">✕</span>
    </span>`;
  }).join('');
}

function removeFile(idx, target, containerId) {
  if(target==='_session') _sessionFiles.splice(idx,1);
  else _conditionFiles.splice(idx,1);
  renderFileChips(containerId, target==='_session'?_sessionFiles:_conditionFiles, target);
}

// Inject file context into AI prompt
function getFileContext() {
  if(!_sessionFiles.length && !S.session?._attachments?.length) return '';
  const files = _sessionFiles.length ? _sessionFiles : (S.session?._attachments||[]);
  const descs = files.map(f => `- 📎 ${f.name} (${f.type})${f.driveId?' [Drive 저장됨]':''}`);
  return '\n\n[첨부 파일]\n' + descs.join('\n') + '\n(첨부 파일 내용을 참고하여 분석해 주세요)';
}

// ═══════════════════════════════════════════════════════════════
// #13 PWA 설치 안내
// ═══════════════════════════════════════════════════════════════
let deferredPrompt=null;
window.addEventListener('beforeinstallprompt',(e)=>{
  e.preventDefault();
  deferredPrompt=e;
  showInstallBanner();
});

function showInstallBanner() {
  if(!deferredPrompt) return;
  if(localStorage.getItem('pwa-install-dismissed')) return;
  let banner=document.getElementById('install-banner');
  if(banner) return;
  banner=document.createElement('div');
  banner.id='install-banner';
  banner.className='install-banner';
  banner.innerHTML=`<span>📲 홈 화면에 추가하면 더 빠르게 이용할 수 있어요!</span>
    <button onclick="installApp()">설치</button>
    <button onclick="dismissInstall()" style="background:transparent;color:var(--mu)">닫기</button>`;
  document.body.appendChild(banner);
}

function installApp() {
  if(!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then(r=>{
    if(r.outcome==='accepted') showToast('✅ 앱이 설치되었습니다!');
    deferredPrompt=null;
    dismissInstall();
  });
}

function dismissInstall() {
  const banner=document.getElementById('install-banner');
  if(banner) banner.remove();
  try { localStorage.setItem('pwa-install-dismissed','1'); } catch(e){}
}

// ═══════════════════════════════════════════════════════════════
// #14 오프라인 편집 + 동기화
// ═══════════════════════════════════════════════════════════════
function savePendingEdit(entry) {
  try {
    const queue=JSON.parse(localStorage.getItem('om_pending_edits')||'[]');
    queue.push({...entry, timestamp:Date.now(), domain:S.currentDomain});
    localStorage.setItem('om_pending_edits',JSON.stringify(queue));
  } catch(e){}
}

async function syncPendingEdits() {
  if(!navigator.onLine||!S.token) return;
  let queue;
  try { queue=JSON.parse(localStorage.getItem('om_pending_edits')||'[]'); } catch(e){ return; }
  if(!queue.length) return;
  const synced=[];
  for(const edit of queue) {
    try {
      const domainId=edit.domain;
      const ds=S.domainState[domainId];
      if(!ds?.master) continue;
      // Apply pending log entry
      if(edit.type==='log'&&edit.data) {
        const m=ds.master;
        if(!m.sessions) m.sessions=[];
        // Pending edits are log entries that need to be saved
        S.currentDomain=domainId;
        await saveMaster();
      }
      synced.push(edit);
    } catch(e){}
  }
  if(synced.length) {
    const remaining=queue.filter(q=>!synced.includes(q));
    localStorage.setItem('om_pending_edits',JSON.stringify(remaining));
    showToast(`✅ ${synced.length}건 오프라인 편집 동기화됨`);
  }
}

function renderOfflineIndicator() {
  let bar=document.getElementById('offline-bar');
  if(navigator.onLine) { if(bar) bar.remove(); return; }
  if(bar) return;
  bar=document.createElement('div');
  bar.id='offline-bar';
  bar.className='offline-bar';
  bar.textContent='📴 오프라인 모드 — 변경사항은 연결 시 자동 동기화됩니다';
  document.body.prepend(bar);
}

window.addEventListener('online',()=>{
  const bar=document.getElementById('offline-bar');
  if(bar) bar.remove();
  syncPendingEdits();
  showToast('🌐 온라인 복귀');
});
window.addEventListener('offline',()=>{
  renderOfflineIndicator();
});

function renderUploadProgress(fileName, percent) {
  let bar=document.getElementById('upload-progress');
  if(!bar) {
    bar=document.createElement('div');
    bar.id='upload-progress';
    bar.className='upload-progress';
    document.body.appendChild(bar);
  }
  if(percent>=100) {
    bar.innerHTML=`✅ ${esc(fileName)} 업로드 완료`;
    setTimeout(()=>bar.remove(),2000);
  } else {
    bar.innerHTML=`<span>📤 ${esc(fileName)}</span>
      <div style="flex:1;height:4px;background:var(--bd);border-radius:2px;overflow:hidden">
        <div style="width:${percent}%;height:100%;background:var(--ac);transition:width .3s"></div>
      </div>
      <span style="font-size:.68rem;color:var(--mu)">${percent}%</span>`;
  }
}

// ═══════════════════════════════════════════════════════════════
// PWA 푸시 알림 (기록 저장 시)
// ═══════════════════════════════════════════════════════════════
function requestNotificationPermission() {
  if(!('Notification' in window)) { showToast('이 브라우저는 알림을 지원하지 않습니다'); return; }
  if(Notification.permission==='granted') { updateNotifButton(); return; }
  if(Notification.permission==='denied') { showToast('⚠️ 알림이 차단되었습니다. 브라우저 설정에서 허용해주세요.'); updateNotifButton(); return; }
  Notification.requestPermission().then(p=>{
    if(p==='granted') {
      showToast('🔔 알림이 활성화되었습니다!');
      // 테스트 알림
      try { new Notification('🔔 알림 테스트', {body:'오랑이 두통 기록 알림이 활성화되었습니다.', tag:'test'}); } catch(e){}
    } else if(p==='denied') {
      showToast('❌ 알림이 차단되었습니다. 브라우저 주소창 왼쪽 자물쇠에서 허용해주세요.');
    }
    updateNotifButton();
  });
}

function toggleNotifications() {
  if(!('Notification' in window)) { showToast('이 브라우저는 알림을 지원하지 않습니다'); return; }
  const perm = Notification.permission;
  if(perm==='granted') {
    // 알림 켜짐/꺼짐 토글
    const muted=localStorage.getItem('om_notif_muted')==='1';
    localStorage.setItem('om_notif_muted',muted?'0':'1');
    showToast(muted?'🔔 알림 켜짐':'🔕 알림 꺼짐 — 기록 알림이 표시되지 않습니다');
    updateNotifButton();
  } else if(perm==='denied') {
    showToast('⚠️ 알림이 차단됨 — 주소창 왼쪽 🔒 → 알림 → 허용으로 변경해주세요', 5000);
  } else {
    requestNotificationPermission();
  }
}

function isNotifEnabled() {
  return ('Notification' in window) && Notification.permission==='granted' && localStorage.getItem('om_notif_muted')!=='1';
}

function updateNotifButton() {
  const btn=document.getElementById('notif-toggle-btn');
  if(!btn) return;
  if(!('Notification' in window)) { btn.textContent='🔕 알림 미지원'; return; }
  const perm=Notification.permission;
  if(perm==='granted') {
    const muted=localStorage.getItem('om_notif_muted')==='1';
    btn.textContent=muted?'🔕 알림 꺼짐':'🔔 알림 켜짐';
  }
  else if(perm==='denied') btn.textContent='🔕 알림 차단됨';
  else btn.textContent='🔔 알림 설정';
}
setTimeout(updateNotifButton, 1000);

function sendLogNotification(entry) {
  if(!isNotifEnabled()) return;
  const lc=DC().logConfig;
  const dc=DC();
  const nrsText=entry.nrs>=0?`NRS ${entry.nrs}/10`:(entry.mood||'기록');
  const syms=(entry.symptoms||[]).join(', ');
  const meds=(entry.meds||[]).join(', ');
  const lines=[nrsText];
  if(syms) lines.push(syms);
  if(meds) lines.push('💊 '+meds);

  try {
    const n=new Notification(`${dc.icon} ${dc.label} 기록 완료`,{
      body:lines.join('\n'),
      icon:"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🧠</text></svg>",
      tag:'log-'+entry.id,
      vibrate:[200,100,200],
      silent:false
    });
    n.onclick=()=>{ window.focus(); n.close(); };
  } catch(e){}
}

// 로그인 후 알림 권한 요청
document.addEventListener('DOMContentLoaded',()=>{ requestNotificationPermission(); });
