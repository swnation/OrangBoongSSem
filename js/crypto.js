// js/crypto.js — API 키 암호화 (Phase 2 모듈화)

// ── API 키 암호화 저장 ──
const _KEY_STORAGE='om_keys_enc';
const _KEY_LEGACY='om_keys';
const _KEY_PIN_SALT='orangi-health-key-v9';

async function _deriveKeyPin(pin) {
  const enc=new TextEncoder();
  const km=await crypto.subtle.importKey('raw',enc.encode(pin),{name:'PBKDF2'},false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt:enc.encode(_KEY_PIN_SALT),iterations:100000,hash:'SHA-256'},
    km,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}

async function _encryptKeys(keys, pin) {
  const key=await _deriveKeyPin(pin);
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const data=new TextEncoder().encode(JSON.stringify(keys));
  const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,data);
  const combined=new Uint8Array(iv.length+ct.byteLength);
  combined.set(iv); combined.set(new Uint8Array(ct),iv.length);
  return btoa(String.fromCharCode(...combined));
}

async function _decryptKeys(encrypted, pin) {
  const key=await _deriveKeyPin(pin);
  const raw=atob(encrypted);
  const bytes=new Uint8Array(Array.from(raw,c=>c.charCodeAt(0)));
  const iv=bytes.slice(0,12);
  const ct=bytes.slice(12);
  const dec=await crypto.subtle.decrypt({name:'AES-GCM',iv},key,ct);
  return JSON.parse(new TextDecoder().decode(dec));
}

async function saveKeysEncrypted() {
  if(!S._keyPin||!Object.keys(S.keys).length) return;
  const enc=await _encryptKeys(S.keys,S._keyPin);
  localStorage.setItem(_KEY_STORAGE,enc);
  localStorage.removeItem(_KEY_LEGACY); // 평문 제거
}

async function loadKeysWithPin(pin) {
  const enc=localStorage.getItem(_KEY_STORAGE);
  if(!enc) return false;
  try {
    S.keys=await _decryptKeys(enc,pin);
    S._keyPin=pin;
    return true;
  } catch(e) { return false; }
}

function _migrateKeysIfNeeded() {
  // 평문 키가 있으면 메모리에 로드 (PIN 설정 시 암호화 저장됨)
  const legacy=localStorage.getItem(_KEY_LEGACY);
  if(legacy) {
    try { S.keys=JSON.parse(legacy); } catch(e) { S.keys={}; }
  }
}

function showPinPrompt(isSetup) {
  const title=isSetup?'🔐 API 키 보호 PIN 설정':'🔐 PIN 입력';
  const msg=isSetup?'API 키를 암호화할 4자리 이상 PIN을 설정하세요:':'API 키 잠금을 해제하세요:';
  const html=`<div style="padding:20px;text-align:center">
    <h3 style="margin-bottom:12px">${title}</h3>
    <p style="font-size:.8rem;color:var(--mu);margin-bottom:12px">${msg}</p>
    <input type="password" id="pin-input" placeholder="PIN (4자리 이상)" style="width:200px;padding:8px 12px;border:2px solid var(--bd);border-radius:8px;text-align:center;font-size:1.1rem;background:var(--sf);color:var(--ink)">
    ${isSetup?`<input type="password" id="pin-confirm" placeholder="PIN 재확인" style="width:200px;padding:8px 12px;border:2px solid var(--bd);border-radius:8px;text-align:center;font-size:1.1rem;background:var(--sf);color:var(--ink);margin-top:8px">`:''}
    <div style="margin-top:12px;display:flex;gap:8px;justify-content:center">
      <button onclick="submitPin(${isSetup})" style="padding:8px 20px;background:var(--ac);color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600">확인</button>
      ${!isSetup&&Object.keys(S.keys).length?'':'<button onclick="closeModal(\'pin-modal\')" style="padding:8px 20px;background:var(--sf2);color:var(--ink);border:1px solid var(--bd);border-radius:6px;cursor:pointer">나중에</button>'}
    </div>
  </div>`;
  openModal('pin-modal',html);
  setTimeout(()=>document.getElementById('pin-input')?.focus(),100);
}

async function submitPin(isSetup) {
  const pin=document.getElementById('pin-input')?.value||'';
  if(pin.length<4){showToast('PIN은 4자리 이상이어야 합니다.');return;}
  if(isSetup) {
    const confirm=document.getElementById('pin-confirm')?.value||'';
    if(pin!==confirm){showToast('PIN이 일치하지 않습니다.');return;}
    S._keyPin=pin;
    await saveKeysEncrypted();
    showToast('🔐 API 키가 암호화되었습니다');
  } else {
    const ok=await loadKeysWithPin(pin);
    if(!ok){showToast('❌ PIN이 틀립니다.');return;}
    showToast('🔓 API 키 잠금 해제됨');
    renderSidebarAIs();
  }
  closeModal('pin-modal');
}
