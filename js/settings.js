// js/settings.js — API 키 관리 + 컨텍스트 편집 (Phase 5 모듈화)

// ═══════════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════════
function renderSidebarAIs() {
  const list=document.getElementById('sb-ai-list');if(!list)return;
  const dc=DC();
  if(!S.aiEnabled) S.aiEnabled={gpt:true,claude:true,gemini:true,grok:true,perp:true};
  list.innerHTML=Object.entries(AI_DEFS).map(([id,def])=>{
    const hasKey=!!S.keys[id];
    const enabled=S.aiEnabled[id]!==false;
    return `<div style="display:flex;align-items:center;gap:7px;padding:5px 18px">
      <label class="ai-toggle-check" title="세션에서 이 AI 사용"><input type="checkbox" ${enabled?'checked':''} onchange="toggleAIEnabled('${id}',this.checked)"></label>
      <div style="width:6px;height:6px;border-radius:50%;background:${def.color};opacity:${enabled?1:.3}"></div>
      <span style="font-size:.75rem;color:${hasKey&&enabled?'#8fa0b5':'#3d4f63'}">${def.name}</span>
      <span style="font-size:.6rem;color:#4a5a6a;font-family:var(--mono);margin-left:auto">${dc.aiRoles[id]||''}</span>
    </div>`;
  }).join('');
}

function maskKey(k){return k&&k.length>8?k.substring(0,4)+'...'+k.substring(k.length-4):k;}

function openKeys() {
  if(!requireLogin())return;
  document.getElementById('keys-body').innerHTML=Object.entries(KEY_INFO).map(([id,info])=>{
    const def=AI_DEFS[id];const hasKey=!!S.keys[id];
    const curModel=S.models[id]||DEFAULT_MODELS[id];
    const modelOpts=(MODEL_OPTIONS[id]||[]).map(m=>{
      const p=DEFAULT_PRICE_TABLE[m.value];
      const priceTag=p?` [$${p.in}/${p.out}]`:'';
      return `<option value="${m.value}" ${curModel===m.value?'selected':''}>${m.label}${priceTag}</option>`;
    }).join('');
    return `<div class="key-group">
      <div class="key-row">
        <div class="key-label"><div class="ai-dot" style="background:${def?.color}"></div>${info.label}
          ${hasKey?`<span class="key-masked">${maskKey(S.keys[id])}</span>`:`<span style="font-size:.68rem;color:#8a5a2d">미설정</span>`}
        </div><a class="key-link" href="${info.link}" target="_blank">발급 →</a>
      </div>
      <div class="key-input-row">
        <input class="key-input ${hasKey?'set':''}" type="password" id="key-${id}" value="${hasKey?S.keys[id]:''}" placeholder="API 키 입력...">
        <button class="btn-vis" onclick="toggleVis('key-${id}',this)">표시</button>
      </div>
      <div style="margin-top:7px;display:flex;align-items:center;gap:8px">
        <span style="font-size:.7rem;color:var(--mu);white-space:nowrap;font-weight:600">모델:</span>
        <select id="model-${id}" style="flex:1;border:1.5px solid var(--bd);border-radius:6px;padding:5px 8px;font-family:var(--font);font-size:.78rem;background:var(--sf2);color:var(--ink);outline:none">${modelOpts}</select>
      </div>
      <div class="key-note">💡 ${info.note}</div>
    </div><hr style="border:none;border-top:1px solid var(--bd);margin:4px 0">`;
  }).join('') + `<div class="key-group">
    <div class="key-row">
      <div class="key-label">📱 빠른 기록 동기화 URL
        ${localStorage.getItem('om_quick_sync_url')?`<span class="key-masked">설정됨</span>`:`<span style="font-size:.68rem;color:#8a5a2d">미설정</span>`}
      </div>
    </div>
    <div class="key-input-row">
      <input class="key-input ${localStorage.getItem('om_quick_sync_url')?'set':''}" type="url" id="key-sync-url" value="${localStorage.getItem('om_quick_sync_url')||''}" placeholder="Google Apps Script 배포 URL">
    </div>
    <div class="key-note">💡 오랑이 빠른 기록(quick.html)을 다른 기기에서도 받아볼 수 있습니다. gas-quicklog.js를 Apps Script에 배포 후 URL을 입력하세요.</div>
  </div><hr style="border:none;border-top:1px solid var(--bd);margin:4px 0">
  <div class="key-group">
    <div class="key-row">
      <div class="key-label">🌤️ 날씨 API 키 (OpenWeatherMap)
        ${localStorage.getItem('om_weather_key')?`<span class="key-masked">설정됨</span>`:`<span style="font-size:.68rem;color:#8a5a2d">미설정</span>`}
      </div><a class="key-link" href="https://openweathermap.org/api" target="_blank">발급 →</a>
    </div>
    <div class="key-input-row">
      <input class="key-input ${localStorage.getItem('om_weather_key')?'set':''}" type="password" id="key-weather" value="${localStorage.getItem('om_weather_key')||''}" placeholder="OpenWeatherMap API 키">
      <button class="btn-vis" onclick="toggleVis('key-weather',this)">표시</button>
    </div>
    <div class="key-note">💡 무료 (1000회/일). 기록 시 날씨가 자동 첨부됩니다 (서울 강동구).</div>
  </div><hr style="border:none;border-top:1px solid var(--bd);margin:4px 0">
  <div class="key-group">
    <div class="key-row">
      <div class="key-label">🔔 ntfy 토픽 — 오랑이 경과 알림
        ${localStorage.getItem('om_ntfy_orangi')?`<span class="key-masked">설정됨</span>`:`<span style="font-size:.68rem;color:#8a5a2d">미설정</span>`}
      </div>
    </div>
    <div class="key-input-row">
      <input class="key-input ${localStorage.getItem('om_ntfy_orangi')?'set':''}" type="text" id="key-ntfy-orangi" value="${localStorage.getItem('om_ntfy_orangi')||''}" placeholder="예: orangi-ha-7x9k2m">
    </div>
    <div class="key-note">💡 두통 기록 2시간 후 경과 확인 알림 (호전/비슷/악화). 오랑이 폰 ntfy 앱에서 같은 토픽 구독 필요.</div>
  </div><hr style="border:none;border-top:1px solid var(--bd);margin:4px 0">
  <div class="key-group">
    <div class="key-row">
      <div class="key-label">🔔 ntfy 토픽 — 붕쌤 즉시 알림
        ${localStorage.getItem('om_ntfy_bung')?`<span class="key-masked">설정됨</span>`:`<span style="font-size:.68rem;color:#8a5a2d">미설정</span>`}
      </div>
    </div>
    <div class="key-input-row">
      <input class="key-input ${localStorage.getItem('om_ntfy_bung')?'set':''}" type="text" id="key-ntfy-bung" value="${localStorage.getItem('om_ntfy_bung')||''}" placeholder="예: bung-notify-3k8m">
    </div>
    <div class="key-note">💡 오랑이 두통 기록 시 붕쌤에게 즉시 알림. 붕쌤 폰 ntfy 앱에서 같은 토픽 구독 필요.</div>
    <button class="btn-cancel" onclick="testNtfy()" style="font-size:.68rem;margin-top:8px">🔔 ntfy 테스트 알림 보내기</button>
  </div>`;
  openModal('keys-modal');
  // #19 키 갱신 알림
  const warnHtml=renderKeyAgeWarnings();
  if(warnHtml) {
    const warnDiv=document.createElement('div');
    warnDiv.innerHTML=warnHtml;
    document.getElementById('keys-body').prepend(warnDiv);
  }
}

async function saveKeys() {
  Object.keys(KEY_INFO).forEach(id=>{
    const v=(document.getElementById('key-'+id)?.value||'').trim();
    if(v) S.keys[id]=v; else delete S.keys[id];
    const m=document.getElementById('model-'+id)?.value;
    if(m) S.models[id]=m;
  });
  // #19 키 설정 시간 기록
  if(!S.keysSetAt) try { S.keysSetAt=JSON.parse(localStorage.getItem('keysSetAt'))||{}; } catch(e){ S.keysSetAt={}; }
  Object.keys(KEY_INFO).forEach(id=>{
    if(S.keys[id]&&!S.keysSetAt[id]) S.keysSetAt[id]=Date.now();
    if(!S.keys[id]) delete S.keysSetAt[id];
  });
  localStorage.setItem('keysSetAt',JSON.stringify(S.keysSetAt));
  localStorage.setItem('om_models',JSON.stringify(S.models));
  const syncUrl=(document.getElementById('key-sync-url')?.value||'').trim();
  if(syncUrl) localStorage.setItem('om_quick_sync_url',syncUrl);
  else localStorage.removeItem('om_quick_sync_url');
  const weatherKey=(document.getElementById('key-weather')?.value||'').trim();
  if(weatherKey) localStorage.setItem('om_weather_key',weatherKey);
  else localStorage.removeItem('om_weather_key');
  const ntfyOrangi=(document.getElementById('key-ntfy-orangi')?.value||'').trim();
  if(ntfyOrangi) localStorage.setItem('om_ntfy_orangi',ntfyOrangi);
  else localStorage.removeItem('om_ntfy_orangi');
  const ntfyBung=(document.getElementById('key-ntfy-bung')?.value||'').trim();
  if(ntfyBung) localStorage.setItem('om_ntfy_bung',ntfyBung);
  else localStorage.removeItem('om_ntfy_bung');
  // 키 암호화 저장
  if(S._keyPin) {
    await saveKeysEncrypted();
  } else {
    // PIN 미설정 시 설정 유도
    localStorage.setItem('om_keys',JSON.stringify(S.keys)); // 임시 평문
  }
  renderSidebarAIs();
  closeModal('keys-modal');
  // PIN 미설정이고 키가 있으면 PIN 설정 유도
  if(!S._keyPin&&Object.keys(S.keys).length) {
    showToast('✅ 키 저장됨 — PIN을 설정하면 암호화됩니다',3000);
    setTimeout(()=>showPinPrompt(true),500);
  } else {
    showToast('✅ API 키 암호화 저장됨 🔐');
  }
}

// Encrypted key export/import using AES-GCM
async function _deriveKey(passphrase) {
  const enc=new TextEncoder();
  const keyMaterial=await crypto.subtle.importKey('raw',enc.encode(passphrase),{name:'PBKDF2'},false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt:enc.encode('orangi-health-v7'),iterations:100000,hash:'SHA-256'},
    keyMaterial,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}

async function exportKeysEncrypted() {
  if(!Object.keys(S.keys).length){showToast('내보낼 키가 없습니다.');return;}
  const pass=prompt('암호를 설정하세요 (키 복원 시 필요, 8자 이상):');
  if(!pass||pass.length<8){showToast('보안을 위해 암호는 8자 이상이어야 합니다.');return;}
  try {
    const key=await _deriveKey(pass);
    const iv=crypto.getRandomValues(new Uint8Array(12));
    const data=new TextEncoder().encode(JSON.stringify(_getSettingsPayload()));
    const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,data);
    const payload=btoa(String.fromCharCode(...iv)+String.fromCharCode(...new Uint8Array(encrypted)));
    const blob=new Blob([payload],{type:'text/plain'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download='orangi_keys_backup.enc';
    document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
    showToast('🔐 키 백업 파일 저장됨');
  } catch(e){showToast('❌ 내보내기 실패: '+e.message,4000);}
}

function _getSettingsPayload() {
  return {keys:S.keys,models:S.models,
    ntfyOrangi:localStorage.getItem('om_ntfy_orangi')||'',
    ntfyBung:localStorage.getItem('om_ntfy_bung')||'',
    weatherKey:localStorage.getItem('om_weather_key')||'',
    syncUrl:localStorage.getItem('om_quick_sync_url')||''};
}
function _restoreSettings(parsed) {
  if(parsed.keys) Object.assign(S.keys,parsed.keys);
  if(parsed.models) Object.assign(S.models,parsed.models);
  if(parsed.ntfyOrangi) localStorage.setItem('om_ntfy_orangi',parsed.ntfyOrangi);
  if(parsed.ntfyBung) localStorage.setItem('om_ntfy_bung',parsed.ntfyBung);
  if(parsed.weatherKey) localStorage.setItem('om_weather_key',parsed.weatherKey);
  if(parsed.syncUrl) localStorage.setItem('om_quick_sync_url',parsed.syncUrl);
}

// API 키 Google Drive 백업/복원
const _KEYS_DRIVE_NAME='orangi_keys_backup.enc';
async function exportKeysToDrive() {
  if(!requireLogin())return;
  if(!Object.keys(S.keys).length){showToast('내보낼 키가 없습니다.');return;}
  const pass=prompt('Drive 백업용 암호를 설정하세요 (복원 시 필요, 8자 이상):');
  if(!pass||pass.length<8){showToast('보안을 위해 암호는 8자 이상이어야 합니다.');return;}
  try {
    const key=await _deriveKey(pass);
    const iv=crypto.getRandomValues(new Uint8Array(12));
    const data=new TextEncoder().encode(JSON.stringify(_getSettingsPayload()));
    const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,data);
    const payload=btoa(String.fromCharCode(...iv)+String.fromCharCode(...new Uint8Array(encrypted)));
    const folderId=await getOrCreateFolder('Orangi Settings');
    const existing=await driveSearch(_KEYS_DRIVE_NAME,folderId);
    if(existing.length) await driveUpdate(existing[0].id,{payload,updated:kstNow().toISOString()});
    else await driveCreate(_KEYS_DRIVE_NAME,{payload,updated:kstNow().toISOString()},folderId);
    showToast('☁️ API 키 Drive 백업 완료');
  } catch(e){showToast('❌ Drive 백업 실패: '+e.message,4000);}
}

async function importKeysFromDrive() {
  if(!requireLogin())return;
  try {
    const folderId=await getOrCreateFolder('Orangi Settings');
    const files=await driveSearch(_KEYS_DRIVE_NAME,folderId);
    if(!files.length){showToast('📭 Drive에 키 백업이 없습니다.');return;}
    const stored=await driveRead(files[0].id);
    if(!stored?.payload){showToast('❌ 백업 데이터가 비어있습니다.');return;}
    const pass=prompt('Drive 백업 암호를 입력하세요:');
    if(!pass){showToast('암호가 필요합니다.');return;}
    const raw=atob(stored.payload);
    const iv=new Uint8Array(Array.from(raw.slice(0,12),c=>c.charCodeAt(0)));
    const encrypted=new Uint8Array(Array.from(raw.slice(12),c=>c.charCodeAt(0)));
    const key=await _deriveKey(pass);
    const decrypted=await crypto.subtle.decrypt({name:'AES-GCM',iv},key,encrypted);
    const parsed=JSON.parse(new TextDecoder().decode(decrypted));
    _restoreSettings(parsed);
    if(S._keyPin) await saveKeysEncrypted();
    else localStorage.setItem('om_keys',JSON.stringify(S.keys));
    localStorage.setItem('om_models',JSON.stringify(S.models));
    renderSidebarAIs();
    closeModal('keys-modal');openKeys();
    showToast('☁️ Drive에서 설정 복원 완료!');
  } catch(e){showToast('❌ Drive 복원 실패 — 암호가 틀리거나 데이터가 손상됨',4000);}
}

async function importKeysEncrypted() {
  const input=document.createElement('input');input.type='file';input.accept='.enc';
  input.onchange=async()=>{
    const file=input.files[0];if(!file)return;
    const pass=prompt('백업 파일의 암호를 입력하세요:');
    if(!pass){showToast('암호가 필요합니다.');return;}
    try {
      const text=await file.text();
      const raw=atob(text);
      const iv=new Uint8Array(Array.from(raw.slice(0,12),c=>c.charCodeAt(0)));
      const encrypted=new Uint8Array(Array.from(raw.slice(12),c=>c.charCodeAt(0)));
      const key=await _deriveKey(pass);
      const decrypted=await crypto.subtle.decrypt({name:'AES-GCM',iv},key,encrypted);
      const parsed=JSON.parse(new TextDecoder().decode(decrypted));
      _restoreSettings(parsed);
      localStorage.setItem('om_keys',JSON.stringify(S.keys));
      localStorage.setItem('om_models',JSON.stringify(S.models));
      renderSidebarAIs();
      closeModal('keys-modal');openKeys();
      showToast('🔐 키 복원 완료!');
    } catch(e){showToast('❌ 복원 실패 — 암호가 틀리거나 파일이 손상되었습니다.',4000);}
  };
  input.click();
}

async function testKey(aiId) {
  // Simple test omitted for brevity — same as v6
}

function toggleVis(inputId,btn) {
  const el=document.getElementById(inputId);if(!el)return;
  el.type=el.type==='password'?'text':'password';
  btn.textContent=el.type==='password'?'표시':'숨기기';
}

function openCtx() {
  if(!requireLogin())return;
  const body=document.getElementById('ctx-body');
  const currentUser=DC().user;
  // Build unified context view — all domains for current user, current domain first
  const domainIds=Object.keys(DOMAINS).filter(id=>DOMAINS[id].user===currentUser);
  // Put current domain first
  domainIds.sort((a,b)=>a===S.currentDomain?-1:b===S.currentDomain?1:0);

  body.innerHTML=domainIds.map(id=>{
    const dd=DOMAINS[id];
    const ds=S.domainState[id];
    const ctx=ds?.master?.patient_context||dd.defaultContext;
    const isCurrent=id===S.currentDomain;
    return `<div style="margin-bottom:10px;border:1.5px solid ${isCurrent?dd.color:'var(--bd)'};border-radius:10px;overflow:hidden">
      <button onclick="toggleCtxDomain('ctx-d-${id}')" style="width:100%;display:flex;align-items:center;gap:8px;padding:10px 14px;background:${isCurrent?dd.color+'15':'var(--sf2)'};border:none;cursor:pointer;text-align:left;font-family:var(--font)">
        <span style="font-size:1rem">${dd.icon}</span>
        <span style="font-size:.82rem;font-weight:600;color:${dd.color}">${dd.user} · ${dd.label}</span>
        ${isCurrent?'<span class="badge badge-blue" style="font-size:.55rem">현재</span>':''}
        <span style="font-size:.65rem;color:var(--mu);margin-left:auto" id="ctx-d-${id}-arrow">${isCurrent?'▼':'▶'}</span>
      </button>
      <div id="ctx-d-${id}" style="display:${isCurrent?'block':'none'};padding:8px 12px;border-top:1px solid var(--bd)">
        <textarea id="ctx-ta-${id}" style="width:100%;min-height:${isCurrent?'300px':'200px'};border:1.5px solid var(--bd);border-radius:8px;padding:10px;font-family:var(--mono);font-size:.74rem;line-height:1.65;resize:vertical;color:var(--ink);outline:none;background:var(--sf2)">${esc(ctx)}</textarea>
      </div>
    </div>`;
  }).join('');
  openModal('ctx-modal');
}

function toggleCtxDomain(id) {
  const el=document.getElementById(id);
  const arrow=document.getElementById(id+'-arrow');
  if(!el)return;
  const open=el.style.display!=='none';
  el.style.display=open?'none':'block';
  if(arrow)arrow.textContent=open?'▶':'▼';
}

async function saveAllCtx() {
  const currentUser=DC().user;
  const domainIds=Object.keys(DOMAINS).filter(id=>DOMAINS[id].user===currentUser);
  let saved=0;
  // 변경된 컨텍스트 수집
  const changes={};
  for(const id of domainIds) {
    const ta=document.getElementById('ctx-ta-'+id);
    if(!ta) continue;
    const ds=S.domainState[id];
    if(!ds?.master) continue;
    const newVal=ta.value;
    changes[id]=newVal;
    if(newVal!==ds.master.patient_context) {
      ds.master.patient_context=newVal;
      if(ds.masterFileId) {
        try{await driveUpdate(ds.masterFileId,ds.master);saved++;}catch(e){}
      }
    }
  }
  // Drive에 SSOT 스냅샷 백업 (최근 5개 유지)
  try { await backupCtxSnapshot(currentUser,changes); } catch(e){ console.error('SSOT backup failed:',e); }
  closeModal('ctx-modal');
  showToast(`✅ ${saved||'모든'} 컨텍스트 저장 & Drive 동기화`);
}

const _CTX_BACKUP_PREFIX='ssot_backup_';
const _CTX_BACKUP_MAX=5;
async function backupCtxSnapshot(user,ctxData) {
  const folderId=await getOrCreateFolder('Orangi SSOT Backups');
  const fileName=_CTX_BACKUP_PREFIX+user+'_'+kstNow().toISOString().replace(/[:.]/g,'-')+'.json';
  await driveCreate(fileName,{user,timestamp:kstNow().toISOString(),contexts:ctxData},folderId);
  // 오래된 백업 정리: 해당 유저 백업만 조회 후 5개 초과분 삭제
  const allFiles=await driveSearch(_CTX_BACKUP_PREFIX+user,folderId);
  if(allFiles.length>_CTX_BACKUP_MAX) {
    // 이름순 정렬 (타임스탬프 포함이라 시간순 = 이름순)
    allFiles.sort((a,b)=>b.name.localeCompare(a.name));
    const toDelete=allFiles.slice(_CTX_BACKUP_MAX);
    for(const f of toDelete) {
      try { await fetchWithRetry(`https://www.googleapis.com/drive/v3/files/${f.id}`,{method:'DELETE',headers:{Authorization:'Bearer '+S.token}}); }
      catch(e){}
    }
  }
}

async function listCtxBackups() {
  if(!requireLogin())return;
  try {
    const currentUser=DC().user;
    const folderId=await getOrCreateFolder('Orangi SSOT Backups');
    const files=await driveSearch(_CTX_BACKUP_PREFIX+currentUser,folderId);
    if(!files.length){showToast('📭 Drive에 SSOT 백업이 없습니다.');return;}
    files.sort((a,b)=>b.name.localeCompare(a.name));
    const items=files.slice(0,_CTX_BACKUP_MAX).map((f,i)=>{
      const ts=f.name.replace(_CTX_BACKUP_PREFIX+currentUser+'_','').replace('.json','').replace(/-/g,':').replace('T',' ').substring(0,19);
      return `<div style="display:flex;align-items:center;gap:8px;padding:8px 0;${i<files.length-1?'border-bottom:1px solid var(--bd)':''}">
        <span style="font-size:.75rem;font-family:var(--mono);color:var(--ink)">${ts}</span>
        <button onclick="restoreCtxFromDrive('${f.id}')" style="margin-left:auto;font-size:.68rem;padding:3px 10px;border:1.5px solid var(--ac);border-radius:5px;background:none;color:var(--ac);cursor:pointer;font-weight:600">복원</button>
      </div>`;
    }).join('');
    showConfirmModal('☁️ SSOT 백업 목록',`<div style="max-height:300px;overflow-y:auto">${items}</div><p style="font-size:.68rem;color:var(--mu);margin-top:8px">최근 ${_CTX_BACKUP_MAX}개 유지 · 전체 저장 시 자동 백업</p>`,[]);
  } catch(e){showToast('❌ 백업 목록 조회 실패: '+e.message,4000);}
}

async function restoreCtxFromDrive(fileId) {
  try {
    const data=await driveRead(fileId);
    if(!data?.contexts){showToast('❌ 백업 데이터가 비어있습니다.');return;}
    const currentUser=DC().user;
    const domainIds=Object.keys(DOMAINS).filter(id=>DOMAINS[id].user===currentUser);
    let restored=0;
    for(const id of domainIds) {
      if(typeof data.contexts[id]==='string') {
        const ds=S.domainState[id];
        if(ds?.master) {
          ds.master.patient_context=data.contexts[id];
          if(ds.masterFileId) { try{await driveUpdate(ds.masterFileId,ds.master);restored++;}catch(e){} }
        }
      }
    }
    closeConfirmModal();closeModal('ctx-modal');
    showToast(`✅ SSOT 복원 완료 (${restored}개 도메인 Drive 동기화)`);
  } catch(e){showToast('❌ 복원 실패: '+e.message,4000);}
}

async function reorganizeCtx() {
  const currentUser=DC().user;
  const domainIds=Object.keys(DOMAINS).filter(id=>DOMAINS[id].user===currentUser);
  if(domainIds.length<2){showToast('도메인이 2개 이상이어야 통합 정리가 가능합니다.');return;}
  const aiId=['claude','gpt','gemini','grok','perp'].find(id=>S.keys[id]);
  if(!aiId){showToast('❌ API 키가 없습니다.');return;}

  // 현재 textarea 값 수집 (편집 중인 내용 반영)
  const ctxMap={};
  domainIds.forEach(id=>{
    const ta=document.getElementById('ctx-ta-'+id);
    const dd=DOMAINS[id];
    ctxMap[id]={label:`${dd.user} · ${dd.label}`,text:ta?ta.value:(S.domainState[id]?.master?.patient_context||dd.defaultContext)};
  });

  if(!confirm(`${AI_DEFS[aiId].name}로 ${domainIds.length}개 도메인 컨텍스트를 통합 정리합니다.\n\n- 도메인 간 중복 정보 제거\n- 공통 사항은 각 도메인에 간결하게 유지\n- 도메인별 전문 정보만 남기기\n- 오래된/불필요한 내용 정리`)) return;

  if(S.generating){showToast('다른 AI 작업이 진행 중입니다.');return;}

  // 백업 저장 (되돌리기용)
  _ctxBackup={timestamp:kstNow().toISOString(),data:{}};
  domainIds.forEach(id=>{ _ctxBackup.data[id]=ctxMap[id].text; });

  S.generating=true;
  const progress=document.getElementById('ctx-progress');
  const progressText=document.getElementById('ctx-progress-text');
  if(progress) progress.style.display='';
  if(progressText) progressText.textContent=`${AI_DEFS[aiId].name} 분석 중...`;

  const ac=new AbortController();if(!S._abortControllers)S._abortControllers={};S._abortControllers[aiId]=ac;
  try {
    const system=`당신은 의료 SSOT 데이터 정리 전문가입니다. 여러 도메인의 환자 컨텍스트를 받아 효율적으로 정리합니다.

규칙:
1. 모든 도메인에 반복되는 공통 정보(환자 기본, 기저질환 등)는 각 도메인에 간결하게 유지하되 표현을 통일
2. 각 도메인 전문 영역의 정보만 해당 도메인에 남기기 (편두통 도메인에 정신건강 상세 불필요)
3. 오래된 날짜 참조는 최신화, 불필요한 중복 삭제
4. SSOT 원칙, 금지 표현 등 중요 규칙은 반드시 유지
5. 각 도메인의 기존 구조(■ 섹션)를 유지하되 간결하게
6. 원본의 의미와 핵심 정보를 절대 삭제하지 말 것

반드시 아래 JSON만 출력. 다른 텍스트 금지.
{${domainIds.map(id=>`"${id}":"정리된 컨텍스트 텍스트"`).join(',')}}`;

    const user=domainIds.map(id=>`=== [${ctxMap[id].label}] (${id}) ===\n${ctxMap[id].text}`).join('\n\n');
    let chunkLen=0;
    const raw=await callAIStream(aiId,system,user,(chunk)=>{
      chunkLen=chunk.length;
      if(progressText) progressText.textContent=`${AI_DEFS[aiId].name} 생성 중... ${chunkLen}자`;
    },ac.signal);

    if(progressText) progressText.textContent='결과 파싱 중...';
    const jsonMatch=raw.match(/\{[\s\S]*\}/);
    if(!jsonMatch) throw new Error('AI 응답에서 유효한 JSON을 찾을 수 없습니다.');
    const parsed=JSON.parse(jsonMatch[0]);

    // 결과 미리보기 — 각 도메인 글자수 비교
    const preview=domainIds.map(id=>{
      const dd=DOMAINS[id];
      const oldLen=ctxMap[id].text.length;
      const newLen=(parsed[id]||'').length;
      return `${dd.icon} ${dd.label}: ${oldLen}자 → ${newLen}자`;
    }).join('\n');

    if(!confirm(`통합 정리 결과:\n\n${preview}\n\n각 도메인 텍스트 영역에 적용합니다.\n(저장은 "전체 저장" 버튼을 눌러야 반영됩니다)\n\n※ "↩ 되돌리기" 버튼으로 원래 내용 복원 가능`)) return;

    // textarea에 결과 적용 (아직 Drive 저장 안 함)
    domainIds.forEach(id=>{
      const ta=document.getElementById('ctx-ta-'+id);
      if(ta&&typeof parsed[id]==='string') ta.value=parsed[id];
    });
    // 되돌리기 버튼 활성화
    const restoreBtn=document.getElementById('ctx-restore-btn');
    if(restoreBtn) restoreBtn.disabled=false;
    showToast('✅ 통합 정리 완료 — "전체 저장"을 눌러 Drive에 반영하세요');
  } catch(e){
    if(e.name==='AbortError') showToast('⏹ 정리 중단됨');
    else showToast('❌ 통합 정리 실패: '+e.message,4000);
  } finally {
    delete S._abortControllers?.[aiId];
    S.generating=false;
    if(progress) progress.style.display='none';
  }
}

async function upgradeCtxFromRecent() {
  const currentUser=DC().user;
  const domainIds=Object.keys(DOMAINS).filter(id=>DOMAINS[id].user===currentUser);
  const aiId=['claude','gpt','gemini','grok','perp'].find(id=>S.keys[id]);
  if(!aiId){showToast('❌ API 키가 없습니다.');return;}
  if(S.generating){showToast('다른 AI 작업이 진행 중입니다.');return;}

  // 각 도메인의 최근 세션 + 누적 지식 + 로그 수집
  const domainData={};
  for(const id of domainIds) {
    const ds=S.domainState[id];
    if(!ds?.master) continue;
    const dd=DOMAINS[id];
    const ta=document.getElementById('ctx-ta-'+id);
    const currentCtx=ta?ta.value:(ds.master.patient_context||dd.defaultContext);
    const sessions=(ds.master.sessions||[]).slice(0,5);
    const accum=ds.master.accumulated||{};
    const sessionSummaries=sessions.map(s=>`[${s.date}] ${s.question||''} → ${s.summary?.session_summary||''} / 권고: ${s.summary?.final_recommendation||''}`).join('\n');
    const accumSummary=[
      accum.established_consensus?.length?'합의: '+accum.established_consensus.slice(-5).join('; '):'',
      accum.unresolved_issues?.length?'쟁점: '+accum.unresolved_issues.slice(-5).join('; '):'',
    ].filter(Boolean).join('\n');
    domainData[id]={label:`${dd.user} · ${dd.label}`,currentCtx,sessionSummaries,accumSummary};
  }

  const processedIds=Object.keys(domainData);
  const hasData=processedIds.some(d=>domainData[d].sessionSummaries||domainData[d].accumSummary);
  if(!hasData){showToast('반영할 최근 기록이 없습니다.');return;}
  if(!confirm(`${AI_DEFS[aiId].name}로 최근 세션·누적 지식을 분석하여 SSOT를 업그레이드합니다.\n\n- 새로 확인된 사실 반영\n- 치료 반응 업데이트\n- 오래된 정보 최신화\n- 날짜 기준 갱신`)) return;

  // 백업
  _ctxBackup={timestamp:kstNow().toISOString(),data:{}};
  domainIds.forEach(id=>{
    const ta=document.getElementById('ctx-ta-'+id);
    const ds=S.domainState[id];
    _ctxBackup.data[id]=ta?ta.value:(ds?.master?.patient_context||DOMAINS[id].defaultContext);
  });

  S.generating=true;
  const progress=document.getElementById('ctx-progress');
  const progressText=document.getElementById('ctx-progress-text');
  if(progress) progress.style.display='';
  if(progressText) progressText.textContent=`${AI_DEFS[aiId].name} 분석 중...`;

  const ac=new AbortController();if(!S._abortControllers)S._abortControllers={};S._abortControllers[aiId]=ac;
  try {
    const system=`당신은 의료 SSOT 업데이트 전문가입니다. 각 도메인의 현재 컨텍스트와 최근 세션/누적 지식을 비교하여 컨텍스트를 업그레이드합니다.

규칙:
1. 새로 확인된 사실(치료 반응, 진단 변화, 약물 변경 등)을 반영
2. 기존 정보와 모순되는 내용은 최신 정보로 갱신
3. 날짜 기준을 오늘(${kstToday()})로 업데이트
4. 기존 구조(■ 섹션)와 SSOT 원칙/금지 표현은 반드시 유지
5. 추가된 내용에는 [${kstToday()} 반영] 태그 표시
6. 원본 핵심 정보는 절대 삭제하지 말 것 — 추가/수정만

반드시 아래 JSON만 출력. 다른 텍스트 금지.
{${processedIds.map(id=>`"${id}":"업그레이드된 컨텍스트"`).join(',')}}`;

    const userParts=processedIds.map(id=>{
      const d=domainData[id];
      return `=== [${d.label}] (${id}) ===\n[현재 SSOT]\n${d.currentCtx}\n\n[최근 세션 요약]\n${d.sessionSummaries||'(없음)'}\n\n[누적 지식]\n${d.accumSummary||'(없음)'}`;
    }).join('\n\n');

    let chunkLen=0;
    const raw=await callAIStream(aiId,system,userParts,(chunk)=>{
      chunkLen=chunk.length;
      if(progressText) progressText.textContent=`${AI_DEFS[aiId].name} 생성 중... ${chunkLen}자`;
    },ac.signal);

    if(progressText) progressText.textContent='결과 파싱 중...';
    const jsonMatch=raw.match(/\{[\s\S]*\}/);
    if(!jsonMatch) throw new Error('AI 응답에서 유효한 JSON을 찾을 수 없습니다.');
    const parsed=JSON.parse(jsonMatch[0]);

    const preview=processedIds.map(id=>{
      const dd=DOMAINS[id];
      const oldLen=domainData[id].currentCtx.length;
      const newLen=(parsed[id]||'').length;
      const diff=newLen-oldLen;
      return `${dd.icon} ${dd.label}: ${oldLen}자 → ${newLen}자 (${diff>=0?'+':''}${diff})`;
    }).join('\n');

    if(!confirm(`업그레이드 결과:\n\n${preview}\n\n적용 후 "전체 저장"으로 Drive에 반영하세요.\n"↩ 되돌리기"로 원래 내용 복원 가능`)) return;

    processedIds.forEach(id=>{
      const ta=document.getElementById('ctx-ta-'+id);
      if(ta&&typeof parsed[id]==='string') ta.value=parsed[id];
    });
    const restoreBtn=document.getElementById('ctx-restore-btn');
    if(restoreBtn) restoreBtn.disabled=false;
    showToast('✅ SSOT 업그레이드 완료 — "전체 저장"을 눌러 반영하세요');
  } catch(e){
    if(e.name==='AbortError') showToast('⏹ 업그레이드 중단됨');
    else showToast('❌ 업그레이드 실패: '+e.message,4000);
  } finally {
    delete S._abortControllers?.[aiId];
    S.generating=false;
    if(progress) progress.style.display='none';
  }
}

let _ctxBackup=null;
function restoreCtxBackup() {
  if(!_ctxBackup){showToast('복원할 백업이 없습니다.');return;}
  if(!confirm(`${_ctxBackup.timestamp} 시점으로 되돌립니다.\n\n현재 편집 내용이 덮어씌워집니다.`)) return;
  Object.entries(_ctxBackup.data).forEach(([id,text])=>{
    const ta=document.getElementById('ctx-ta-'+id);
    if(ta) ta.value=text;
  });
  const restoreBtn=document.getElementById('ctx-restore-btn');
  if(restoreBtn) restoreBtn.disabled=true;
  showToast('↩ 컨텍스트 복원됨 — "전체 저장"을 눌러 Drive에 반영하세요');
}

function changeAIModel(aiId,newModel) {
  S.models[aiId]=newModel;
  localStorage.setItem('om_models',JSON.stringify(S.models));
  showToast(`${AI_DEFS[aiId].name} → ${newModel}`);
}


// ═══════════════════════════════════════════════════════════════
// #19 API 키 갱신 알림 (from PWA section, belongs to settings)
// ═══════════════════════════════════════════════════════════════
function checkKeyAge() {
  if(!S.keysSetAt) {
    try { S.keysSetAt=JSON.parse(localStorage.getItem('keysSetAt'))||{}; } catch(e){ S.keysSetAt={}; }
  }
  const now=Date.now();
  const warns=[];
  Object.keys(S.keys).forEach(id=>{
    if(!S.keys[id]) return;
    const setAt=S.keysSetAt[id];
    if(!setAt) { S.keysSetAt[id]=now; return; }
    const days=Math.floor((now-setAt)/(1000*60*60*24));
    if(days>=90) warns.push({id,days});
  });
  try { localStorage.setItem('keysSetAt',JSON.stringify(S.keysSetAt)); } catch(e){}
  return warns;
}

function renderKeyAgeWarnings() {
  const warns=checkKeyAge();
  if(!warns.length) return '';
  return warns.map(w=>`<div class="key-age-warn">⚠️ ${AI_DEFS[w.id]?.name||w.id} API 키가 ${w.days}일 전에 설정되었습니다. 보안을 위해 갱신을 권장합니다.</div>`).join('');
}
