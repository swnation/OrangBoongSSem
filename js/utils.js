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
    if(btn) { const idx = parseInt(btn.dataset.confirmIdx); const action = _confirmActions[idx]; if(typeof action==='function') { try { action(); } catch(err) { console.error('Confirm action error:', err); } } }
    if(closeBtn) closeConfirmModal();
  };
  openModal('confirm-modal');
}
function closeConfirmModal(){closeModal('confirm-modal');}

let _toastTimer;
const _toastLog = [];
const _TOAST_LOG_MAX = 100;

function showToast(msg,dur=2800) {
  const el=document.getElementById('toast');el.textContent=msg;el.classList.add('show');
  clearTimeout(_toastTimer);_toastTimer=setTimeout(()=>el.classList.remove('show'),dur);
  // Log it
  const now=new Date();
  const time=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0')+':'+String(now.getSeconds()).padStart(2,'0');
  _toastLog.unshift({time,msg});
  if(_toastLog.length>_TOAST_LOG_MAX) _toastLog.length=_TOAST_LOG_MAX;
  // Update badge
  const badge=document.getElementById('toast-log-badge');
  if(badge){badge.textContent=_toastLog.length;badge.style.display='inline';}
}

function showToastLog() {
  if(!_toastLog.length){showToast('알림 없음');return;}
  const rows=_toastLog.map(function(t){
    const isErr=t.msg.includes('❌')||t.msg.includes('⚠️')||t.msg.includes('실패');
    const isOk=t.msg.includes('✅')||t.msg.includes('완료')||t.msg.includes('저장');
    const color=isErr?'var(--err)':isOk?'var(--ok)':'var(--ink)';
    return '<div style="display:flex;gap:8px;padding:4px 0;border-bottom:1px solid var(--bd);font-size:.72rem">'
      +'<span style="font-family:var(--mono);color:var(--mu);min-width:52px;flex-shrink:0">'+t.time+'</span>'
      +'<span style="color:'+color+'">'+esc(t.msg)+'</span></div>';
  }).join('');
  showConfirmModal('📋 알림 로그 (최근 '+_toastLog.length+'건)',
    '<div style="max-height:400px;overflow-y:auto">'+rows+'</div>',
    [{label:'🗑 비우기',action:function(){_toastLog.length=0;closeConfirmModal();showToast('알림 로그 비움');}},
     {label:'닫기',action:closeConfirmModal,primary:true}]);
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
