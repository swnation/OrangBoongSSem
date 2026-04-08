// js/utils.js — 유틸리티 함수 (Phase 1 모듈화)

async function fetchWithRetry(url, opts, maxRetries=2) {
  for (let i=0; i<=maxRetries; i++) {
    try {
      const res = await fetch(url, opts);
      if (res.status === 429 || res.status >= 500) {
        if (i < maxRetries) { await new Promise(r=>setTimeout(r, (i+1)*2000)); continue; }
      }
      return res;
    } catch(e) {
      if (i < maxRetries) { await new Promise(r=>setTimeout(r, (i+1)*2000)); continue; }
      throw e;
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// MODAL & TOAST & UTILS
// ═══════════════════════════════════════════════════════════════
function openModal(id){document.getElementById(id)?.classList.add('show');}
function closeModal(id){document.getElementById(id)?.classList.remove('show');}
let _confirmActions = [];
function showConfirmModal(title,body,buttons) {
  document.getElementById('confirm-title').textContent=title;
  document.getElementById('confirm-body').innerHTML=body;
  _confirmActions = buttons.map(b => b.action);
  const hasCancel=buttons.some(b=>b.label==='취소'||b.action===closeConfirmModal);
  document.getElementById('confirm-foot').innerHTML=buttons.map((b,i)=>
    `<button data-confirm-idx="${i}" class="${b.primary?'btn-save':'btn-cancel'}"${b.color?` style="background:${b.color};color:#fff;border:none"`:''}>
      ${esc(b.label)}</button>`).join('')+(hasCancel?'':'<button class="btn-cancel" data-confirm-close="1">취소</button>');
  // Event delegation for confirm modal buttons
  document.getElementById('confirm-foot').onclick = function(e) {
    const btn = e.target.closest('[data-confirm-idx]');
    const closeBtn = e.target.closest('[data-confirm-close]');
    if(btn) { const idx = parseInt(btn.dataset.confirmIdx); const action = _confirmActions[idx]; if(action) { try { if(typeof action==='function') action(); else new Function(action)(); } catch(err) { console.error('Confirm action error:', err); } } }
    if(closeBtn) closeConfirmModal();
  };
  openModal('confirm-modal');
}
function closeConfirmModal(){closeModal('confirm-modal');}

let _toastTimer;
function showToast(msg,dur=2800) {
  const el=document.getElementById('toast');el.textContent=msg;el.classList.add('show');
  clearTimeout(_toastTimer);_toastTimer=setTimeout(()=>el.classList.remove('show'),dur);
}

// #3 ESC key closes modals
document.addEventListener('keydown', e => {
  if(e.key==='Escape') {
    if(document.getElementById('confirm-modal')?.classList.contains('show')) { closeConfirmModal(); return; }
    if(document.getElementById('keys-modal')?.classList.contains('show')) { closeModal('keys-modal'); return; }
    if(document.getElementById('ctx-modal')?.classList.contains('show')) { closeModal('ctx-modal'); return; }
  }
});

// ═══════════════════════════════════════════════════════════════
// KST DATE UTILS — 모든 날짜를 한국 시간 기준으로 통일
// ═══════════════════════════════════════════════════════════════
function kstNow() { return new Date(Date.now() + 9*3600000); }
function kstToday() { return kstNow().toISOString().slice(0,10); }
function kstTime() { return kstNow().toISOString().slice(11,16); }
function kstMonth() { return kstNow().toISOString().slice(0,7); }
function kstDaysAgo(n) { return new Date(kstNow().getTime() - n*86400000).toISOString().slice(0,10); }

function esc(s) {
  if(!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
