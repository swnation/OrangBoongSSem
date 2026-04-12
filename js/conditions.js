// js/conditions.js — 질환 관리 + 약물 검색 + 자동완성 (Phase 5 모듈화)

// ═══════════════════════════════════════════════════════════════
// 📋 SIMPLE CONDITIONS REGISTRY
// ═══════════════════════════════════════════════════════════════
// Each domain's master.conditions[] stores:
// {id, name, diagnosisDate, status:'active'|'remission'|'resolved'|'self-stopped',
//  medications:'텍스트', drugResponse:'텍스트', course:'텍스트', notes:'텍스트'}

// 시술 판별: 약물이 아닌 시술/치료 항목 (데일리 체크에서 제외, 시행 시에만 기록)
const _PROCEDURE_KEYWORDS = ['block','신경자극술','VNS','ONS','SPG','물리치료','산소요법','CBT','시술','수술','주사'];
function _isProcedure(medName) {
  const lower = medName.toLowerCase();
  return _PROCEDURE_KEYWORDS.some(kw => lower.includes(kw.toLowerCase()));
}

function renderConditionMedSelector(date) {
  const condMeds=getConditionMeds(date);
  if(!condMeds.length) return '';
  return `<div class="log-section-title">질환별 투약</div>
    <div style="margin-bottom:8px">
    ${condMeds.map(cm=>`
      <div style="margin-bottom:6px;border:1px solid var(--bd);border-radius:8px;padding:8px 10px;background:var(--sf)">
        <div style="font-size:.72rem;font-weight:600;color:var(--ink);margin-bottom:4px">${cm.icon} ${esc(cm.condition)}</div>
        <div class="log-chips" style="gap:4px">${cm.meds.map(m=>
          `<div class="log-chip" data-group="med" data-val="${esc(m)}" onclick="toggleChip(this,'sel-med')" style="padding:3px 10px;font-size:.75rem">${esc(m)}</div>`
        ).join('')}</div>
      </div>`).join('')}
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
// MEDICATION DETAIL — 약물별 주기/횟수/시간/처방 관리
// ═══════════════════════════════════════════════════════════════

const _CYCLE_OPTIONS = [
  {value:'daily',label:'매일'},
  {value:'weekly',label:'주 N회'},
  {value:'monthly',label:'월 N회'},
  {value:'prn',label:'필요 시 (PRN)'},
];
const _TIMING_OPTIONS = ['아침','점심','저녁','취침전'];
const _WEEKDAY_LABELS = ['일','월','화','수','목','금','토'];

function _getMedDetail(condition, medName) {
  if(!condition.medsDetail) condition.medsDetail={};
  return condition.medsDetail[medName] || {cycle:'daily',timesPerDay:1,timing:[],dose:'',rxDays:0,rxStartDate:'',weekDays:[],monthDay:0};
}

function _getTimesMax(detail) {
  if(detail.cycle==='prn') return 99;
  return detail.timesPerDay || 1;
}

// 오늘 이 약을 복용해야 하는 날인지 판단
function _isMedDueToday(detail, dateStr) {
  if(!detail.cycle || detail.cycle==='daily' || detail.cycle==='prn') return true;
  if(detail.cycle==='weekly') {
    const dow=new Date(dateStr+'T12:00').getDay(); // 0=일~6=토
    return (detail.weekDays||[]).includes(dow);
  }
  if(detail.cycle==='monthly') {
    const dom=new Date(dateStr+'T12:00').getDate();
    return dom===(detail.monthDay||1);
  }
  return true;
}

// 당일 해당 약물 복용 횟수 계산
function _getTodayDoseCount(date, medName) {
  const ds=D();
  let count=0;
  (ds.logData||[]).filter(l=>l.datetime?.slice(0,10)===date).forEach(l=>{
    if(l.medCheck?.[medName]) count++;
  });
  return count;
}

// 처방 소진일 계산
function _getRxEndDate(detail) {
  if(!detail.rxStartDate||!detail.rxDays) return null;
  const start=new Date(detail.rxStartDate+'T00:00:00');
  start.setDate(start.getDate()+detail.rxDays);
  return start.toISOString().slice(0,10);
}

// 약물 상세 설정 모달
function openMedDetailSettings(conditionId, medName) {
  const allConds=getAllUserConditions();
  const cond=allConds.find(c=>c.id===conditionId);
  if(!cond) return;
  const ds=S.domainState[cond._domainId];
  const origCond=ds?.master?.conditions?.find(c=>c.id===conditionId);
  if(!origCond) return;
  if(!origCond.medsDetail) origCond.medsDetail={};
  const d=origCond.medsDetail[medName]||{cycle:'daily',timesPerDay:1,timing:[],dose:'',rxDays:0,rxStartDate:'',weekDays:[],monthDay:0};

  const cycleOpts=_CYCLE_OPTIONS.map(o=>`<option value="${o.value}"${d.cycle===o.value?' selected':''}>${o.label}</option>`).join('');
  const timingChips=_TIMING_OPTIONS.map(t=>`<div class="log-chip${(d.timing||[]).includes(t)?' sel sel-sym':''}" data-group="md-timing" data-val="${t}" onclick="toggleChip(this,'sel-sym')" style="font-size:.65rem;padding:3px 8px">${t}</div>`).join('');
  const weekChips=_WEEKDAY_LABELS.map((l,i)=>`<div class="log-chip${(d.weekDays||[]).includes(i)?' sel sel-sym':''}" data-group="md-weekday" data-val="${i}" onclick="toggleChip(this,'sel-sym')" style="font-size:.65rem;padding:3px 8px;min-width:28px;text-align:center">${l}</div>`).join('');
  const rxEnd=_getRxEndDate(d);

  showConfirmModal('💊 '+esc(medName)+' — 복용 설정',
    `<div style="font-size:.72rem;display:flex;flex-direction:column;gap:8px">
      <div style="display:flex;gap:8px">
        <div><div class="dx-form-label">복용 주기</div><select id="md-cycle" class="dx-form-input" style="width:120px" onchange="_mdCycleChange()">${cycleOpts}</select></div>
        <div id="md-times-wrap"><div class="dx-form-label">하루 횟수</div><select id="md-times" class="dx-form-input" style="width:80px">
          ${[1,2,3,4].map(n=>`<option value="${n}"${(d.timesPerDay||1)===n?' selected':''}>${n}회</option>`).join('')}
        </select></div>
      </div>
      <div><div class="dx-form-label">복용 시간대</div><div class="log-chips" style="gap:3px">${timingChips}</div></div>
      <div id="md-weekdays-wrap" style="display:${d.cycle==='weekly'?'block':'none'}"><div class="dx-form-label">요일 선택</div><div class="log-chips" style="gap:3px">${weekChips}</div></div>
      <div id="md-monthday-wrap" style="display:${d.cycle==='monthly'?'block':'none'}"><div class="dx-form-label">매월</div><input type="number" id="md-monthday" class="dx-form-input" min="1" max="31" value="${d.monthDay||1}" style="width:60px"><span style="font-size:.68rem;color:var(--mu)">일</span></div>
      <div><div class="dx-form-label">용량</div><input id="md-dose" class="dx-form-input" value="${esc(d.dose||'')}" placeholder="예: 50mg" style="width:180px"></div>
      <div style="display:flex;gap:8px">
        <div><div class="dx-form-label">처방일수</div><input type="number" id="md-rx-days" class="dx-form-input" value="${d.rxDays||''}" placeholder="일" style="width:80px"></div>
        <div><div class="dx-form-label">처방 시작일</div><input type="date" id="md-rx-start" class="dx-form-input" value="${d.rxStartDate||''}" style="width:140px"></div>
      </div>
      ${rxEnd?`<div style="font-size:.65rem;color:var(--ac)">💊 소진 예정: ${rxEnd}</div>`:''}
    </div>`,
    [{label:'💾 저장',primary:true,action:async()=>{
      const timing=[];document.querySelectorAll('[data-group="md-timing"].sel').forEach(el=>timing.push(el.dataset.val));
      const weekDays=[];document.querySelectorAll('[data-group="md-weekday"].sel').forEach(el=>weekDays.push(parseInt(el.dataset.val)));
      origCond.medsDetail[medName]={
        cycle:document.getElementById('md-cycle')?.value||'daily',
        timesPerDay:parseInt(document.getElementById('md-times')?.value)||1,
        timing:timing,
        dose:(document.getElementById('md-dose')?.value||'').trim(),
        rxDays:parseInt(document.getElementById('md-rx-days')?.value)||0,
        rxStartDate:document.getElementById('md-rx-start')?.value||'',
        weekDays:weekDays,
        monthDay:parseInt(document.getElementById('md-monthday')?.value)||1,
      };
      await saveMaster();closeConfirmModal();showToast('✅ 복용 설정 저장');renderView(S.currentView);
    }},{label:'취소',action:closeConfirmModal}]);
}

function _mdCycleChange() {
  const cycle=document.getElementById('md-cycle')?.value;
  const timesWrap=document.getElementById('md-times-wrap');
  const weekWrap=document.getElementById('md-weekdays-wrap');
  const monthWrap=document.getElementById('md-monthday-wrap');
  if(timesWrap) timesWrap.style.display=(cycle==='prn')?'none':'block';
  if(weekWrap) weekWrap.style.display=(cycle==='weekly')?'block':'none';
  if(monthWrap) monthWrap.style.display=(cycle==='monthly')?'block':'none';
}

// PRN/추가복용 이유 프리셋
const _DEFAULT_MED_REASONS=['두통 악화','불안/공황','불면','통증','구역','기타'];

function _getMedReasonPresets() {
  const dm=DM();
  return dm?.settings?.medReasonPresets || _DEFAULT_MED_REASONS;
}

function _promptMedReason(medName, callback) {
  const presets=_getMedReasonPresets();
  const presetsHtml=presets.map(r=>`<button onclick="document.getElementById('med-reason-input').value='${esc(r)}'" style="font-size:.62rem;padding:2px 8px;border:1px solid var(--bd);border-radius:12px;background:var(--sf2);color:var(--ink);cursor:pointer;font-family:var(--font)">${esc(r)}</button>`).join('');

  showConfirmModal('💊 '+esc(medName)+' 복용 이유',
    `<div style="font-size:.72rem">
      <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px">${presetsHtml}</div>
      <input id="med-reason-input" class="dx-form-input" placeholder="복용 이유 입력..." style="width:100%">
      <div style="margin-top:6px;display:flex;gap:4px;align-items:center">
        <input type="text" id="med-reason-new-preset" placeholder="새 프리셋" style="flex:1;font-size:.65rem;padding:3px 6px;border:1px solid var(--bd);border-radius:4px;font-family:var(--font);color:var(--ink);background:var(--sf2)">
        <button onclick="_addMedReasonPreset()" style="font-size:.6rem;padding:2px 8px;border:1px solid var(--ac);border-radius:4px;background:none;color:var(--ac);cursor:pointer;font-family:var(--font)">+고정</button>
      </div>
    </div>`,
    [{label:'✅ 확인',primary:true,action:()=>{
      const reason=(document.getElementById('med-reason-input')?.value||'').trim();
      closeConfirmModal();
      callback(reason);
    }},{label:'취소',action:()=>{closeConfirmModal();callback(null);}}]);
}

async function _addMedReasonPreset() {
  const input=document.getElementById('med-reason-new-preset');
  const val=(input?.value||'').trim();
  if(!val) return;
  const dm=DM();if(!dm) return;
  if(!dm.settings) dm.settings={};
  if(!dm.settings.medReasonPresets) dm.settings.medReasonPresets=[..._DEFAULT_MED_REASONS];
  if(!dm.settings.medReasonPresets.includes(val)) {
    dm.settings.medReasonPresets.push(val);
    await saveMaster();
    showToast('✅ 프리셋 추가: '+val);
  }
  if(input) input.value='';
}

function renderDailyMedCheck(date) {
  const condMeds=getConditionMeds(date);
  if(!condMeds.length) return '';
  // 당일 기존 기록에서 이미 복용 체크된 약물 수집 + 횟수
  const _dayMcCount={};
  const _dayMcReasons={};
  const ds=D();
  (ds.logData||[]).filter(l=>l.datetime?.slice(0,10)===date&&l.medCheck).forEach(l=>{
    Object.entries(l.medCheck).forEach(([k,v])=>{
      if(v) _dayMcCount[k]=(_dayMcCount[k]||0)+1;
    });
    if(l.medCheckDetail){
      Object.entries(l.medCheckDetail).forEach(([k,d])=>{
        if(d.reason) _dayMcReasons[k]=d.reason;
      });
    }
  });

  // 약물별 medsDetail 조회
  const allConds=getAllUserConditions();
  const _getDetail=(medName)=>{
    for(const c of allConds){
      if(c._domainId!==S.currentDomain) continue;
      if(c.medsDetail?.[medName]) return {detail:c.medsDetail[medName],condId:c.id};
    }
    return {detail:{cycle:'daily',timesPerDay:1},condId:null};
  };

  return `<div class="log-section-title">💊 오늘 복용 체크
    <span style="margin-left:auto;display:flex;gap:4px">
      <button onclick="document.querySelectorAll('.med-check-cb:not(:disabled)').forEach(c=>c.checked=true)" style="font-size:.6rem;padding:2px 8px;border:1px solid var(--bd);border-radius:4px;background:var(--sf);color:var(--mu);cursor:pointer;font-family:var(--font)">전체 ✓</button>
      <button onclick="document.querySelectorAll('.med-check-cb:not(:disabled)').forEach(c=>c.checked=false)" style="font-size:.6rem;padding:2px 8px;border:1px solid var(--bd);border-radius:4px;background:var(--sf);color:var(--mu);cursor:pointer;font-family:var(--font)">전체 ✗</button>
    </span>
  </div>
    <div style="margin-bottom:8px">
    ${condMeds.map(cm=>{
      const procedures=cm.meds.filter(m=>_isProcedure(m));
      const nonProc=cm.meds.filter(m=>!_isProcedure(m));
      if(!nonProc.length&&!procedures.length) return '';

      const medRows=nonProc.map(m=>{
        const isPRN=m.includes('(PRN)');
        const {detail,condId}=_getDetail(m);
        const cycle=isPRN?'prn':(detail.cycle||'daily');
        const maxDose=cycle==='prn'?99:(detail.timesPerDay||1);
        const takenCount=_dayMcCount[m]||0;

        // 오늘 복용일이 아닌 약물은 축소 표시
        if(cycle!=='prn' && !_isMedDueToday(detail, date)){
          const cycleText=cycle==='weekly'?'주 '+(detail.weekDays||[]).map(d=>_WEEKDAY_LABELS[d]).join('·'):cycle==='monthly'?'매월 '+(detail.monthDay||1)+'일':'';
          return `<div style="display:flex;align-items:center;gap:6px;padding:2px 0;opacity:.4;font-size:.68rem">
            <span style="color:var(--mu)">⏭</span>
            <span style="color:var(--mu)">${esc(m)}</span>
            <span style="font-size:.5rem;color:var(--mu2)">${cycleText} — 오늘 비해당</span>
          </div>`;
        }

        const isComplete=cycle!=='prn' && takenCount>=maxDose;
        const timingText=(detail.timing||[]).length?detail.timing.join('·'):'';
        const doseText=detail.dose?' '+detail.dose:'';
        const cycleLabel=cycle==='daily'?(maxDose===1?'QD':maxDose===2?'BID':maxDose===3?'TID':'QID'):cycle==='weekly'?'주'+(detail.weekDays||[]).length+'회':cycle==='monthly'?'월1회':'PRN';

        // 처방 소진 경고
        let rxWarn='';
        if(detail.rxStartDate&&detail.rxDays){
          const endDate=_getRxEndDate(detail);
          if(endDate){
            const daysLeft=Math.ceil((new Date(endDate+'T00:00')-new Date(date+'T00:00'))/86400000);
            if(daysLeft<=3&&daysLeft>=0) rxWarn=`<span style="font-size:.5rem;color:var(--err);font-weight:600">⚠️ ${daysLeft}일 후 소진</span>`;
            else if(daysLeft<0) rxWarn=`<span style="font-size:.5rem;color:var(--err);font-weight:600">❌ 소진됨</span>`;
          }
        }

        if(cycle==='prn'){
          return `<label style="display:flex;align-items:center;gap:8px;padding:3px 0;cursor:pointer">
            <input type="checkbox" class="med-check-cb" data-med="${esc(m)}" data-freq="PRN" onchange="if(this.checked)_onPrnCheck(this,'${esc(m).replace(/'/g,"\\'")}')" style="width:16px;height:16px;accent-color:#f59e0b">
            <span style="font-size:.78rem;color:var(--ink)">${esc(m)}<span style="font-size:.58rem;color:var(--mu)">${esc(doseText)}</span></span>
            <span style="font-size:.55rem;padding:1px 4px;border-radius:3px;border:1px solid #f59e0b;color:#f59e0b">PRN</span>
            ${takenCount?'<span style="font-size:.5rem;color:var(--mu)">오늘 '+takenCount+'회</span>':''}
            ${rxWarn}
          </label>
          <input type="hidden" class="med-reason" data-med="${esc(m)}" value="">`;
        }

        if(isComplete){
          return `<label style="display:flex;align-items:center;gap:8px;padding:3px 0;cursor:pointer;opacity:.5">
            <input type="checkbox" class="med-check-cb" data-med="${esc(m)}" checked disabled style="width:16px;height:16px;accent-color:var(--ac)">
            <span style="font-size:.78rem;color:var(--ink)">${esc(m)}<span style="font-size:.58rem;color:var(--mu)">${esc(doseText)}</span></span>
            <span style="font-size:.5rem;color:var(--ok)">✓${takenCount}/${maxDose} 완료${timingText?' ('+timingText+')':''}</span>
            ${rxWarn}
            <button onclick="event.preventDefault();_onExtraDoseCheck('${esc(m).replace(/'/g,"\\'")}',${maxDose})" style="font-size:.48rem;padding:1px 5px;border:1px dashed var(--mu2);border-radius:3px;background:none;color:var(--mu);cursor:pointer;font-family:var(--font)">+추가</button>
          </label>`;
        }

        return `<label style="display:flex;align-items:center;gap:8px;padding:3px 0;cursor:pointer">
          <input type="checkbox" class="med-check-cb" data-med="${esc(m)}" style="width:16px;height:16px;accent-color:var(--ac)">
          <span style="font-size:.78rem;color:var(--ink)">${esc(m)}<span style="font-size:.58rem;color:var(--mu)">${esc(doseText)}</span></span>
          <span style="font-size:.55rem;color:var(--mu2)">${cycleLabel}${timingText?' '+timingText:''}</span>
          ${maxDose>1?'<span style="font-size:.5rem;color:var(--mu)">('+takenCount+'/'+maxDose+')</span>':''}
          ${rxWarn}
          ${condId?`<button onclick="event.preventDefault();openMedDetailSettings(${condId},'${esc(m).replace(/'/g,"\\'")}')" style="font-size:.45rem;padding:1px 4px;border:1px solid var(--bd);border-radius:3px;background:none;color:var(--mu2);cursor:pointer;font-family:var(--font)">⚙️</button>`:''}
        </label>`;
      }).join('');

      return `<div style="margin-bottom:6px;border:1px solid var(--bd);border-radius:8px;padding:8px 10px;background:var(--sf)">
        <div style="font-size:.72rem;font-weight:600;color:var(--ink);margin-bottom:6px">${cm.icon} ${esc(cm.condition)}</div>
        ${medRows}
        ${procedures.length?`<div style="margin-top:4px;padding-top:4px;border-top:1px dashed var(--bd)">
          <div style="font-size:.6rem;color:#1e40af;font-weight:600;margin-bottom:2px">💉 시술 (시행 시에만 기록)</div>
          ${procedures.map(m=>`<label style="display:flex;align-items:center;gap:8px;padding:3px 0;cursor:pointer">
            <input type="checkbox" class="med-check-cb" data-med="${esc(m)}" style="width:16px;height:16px;accent-color:#3b82f6">
            <span style="font-size:.78rem;color:#1e40af">${esc(m)}</span>
            <span style="font-size:.6rem;color:#3b82f6">시술</span>
          </label>`).join('')}
        </div>`:''}
      </div>`;
    }).join('')}
    </div>`;
}

function _onPrnCheck(cb, medName) {
  if(!cb.checked) return;
  _promptMedReason(medName, function(reason) {
    if(reason===null) { cb.checked=false; return; }
    const hidden=cb.closest('label')?.nextElementSibling;
    if(hidden&&hidden.classList.contains('med-reason')) hidden.value=reason||'';
  });
}

function _onExtraDoseCheck(medName, maxDose) {
  _promptMedReason(medName+' (추가 복용)', function(reason) {
    if(reason===null) return;
    const cbs=document.querySelectorAll('.med-check-cb[data-med="'+medName+'"]');
    cbs.forEach(cb=>{ cb.disabled=false; cb.checked=true; cb.closest('label').style.opacity='1'; });
    let hidden=document.querySelector('.med-reason[data-med="'+medName+'"]');
    if(!hidden){
      hidden=document.createElement('input');hidden.type='hidden';hidden.className='med-reason';hidden.dataset.med=medName;
      cbs[0]?.closest('label')?.after(hidden);
    }
    if(hidden) hidden.value='추가복용: '+(reason||'');
    showToast('💊 '+medName+' 추가 복용 기록');
  });
}

function getConditions() { return DM()?.conditions || []; }

// Get ALL conditions for current user across all domains
function getAllUserConditions() {
  const currentUser=DC().user;
  const result=[];
  Object.entries(S.domainState).forEach(([domainId,ds])=>{
    const dd=DOMAINS[domainId];
    if(!dd||dd.user!==currentUser||!ds.master?.conditions) return;
    ds.master.conditions.forEach((c,i)=>{
      result.push({...c,_domainId:domainId,_domainLabel:dd.label,_domainIcon:dd.icon,_domainColor:dd.color,_idx:i});
    });
  });
  return result;
}

function getUnloadedUserDomains() {
  const currentUser=DC().user;
  return Object.entries(DOMAINS).filter(([id,d])=>d.user===currentUser&&!S.domainState[id]?.master).map(([id,d])=>d);
}

// Auto-load all domains for current user (for unified meds/crosslog views)
let _loadingAllDomains=false;
async function loadAllUserDomains() {
  if(_loadingAllDomains) return;
  const currentUser=DC().user;
  const unloaded=Object.entries(DOMAINS).filter(([id,d])=>d.user===currentUser&&!S.domainState[id]?.master);
  if(!unloaded.length) return;
  _loadingAllDomains=true;
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
        _restoreCustomItemsFromMaster(ds, domainId);
      } else {
        ds.master=getDefaultMaster();
        ds.masterFileId=await driveCreate(dc.masterFile,ds.master,folderId);
      }
      ds.logData=[];ds.logMonth='';ds.logFileId=null;
    } catch(e) { console.warn('Domain load failed:', domainId, e.message); }
  }
  _loadingAllDomains=false;
  // 동적 약물 사전 로드 (클라우드 → 런타임)
  if (typeof _loadCustomDrugDicts === 'function') _loadCustomDrugDicts();
}

// Get meds from all user conditions (for log form)
// date 파라미터가 있으면 해당 날짜에 활성이었던 약물 세트 반환
function getConditionMeds(date) {
  const all=getAllUserConditions().filter(c=>c.status==='active'||c.status==='remission');
  const result=[];
  all.forEach(c=>{
    if(c._domainId !== S.currentDomain) return;
    // 날짜가 지정되고 medHistory가 있으면 해당 날짜의 약물 세트 찾기
    if(date && c.medHistory?.length) {
      const medsAtDate=getMedsAtDate(c, date);
      if(medsAtDate?.length) { result.push({condition:c.name,domain:c._domainLabel,icon:c._domainIcon,meds:medsAtDate,trackCompliance:c.trackCompliance}); return; }
    }
    if(!c.medsList?.length) return;
    result.push({condition:c.name,domain:c._domainLabel,icon:c._domainIcon,meds:c.medsList,trackCompliance:c.trackCompliance});
  });
  return result;
}

// medHistory에서 특정 날짜에 활성이었던 약물 세트 찾기
function getMedsAtDate(condition, date) {
  const hist=condition.medHistory;
  if(!hist?.length) return condition.medsList||[];
  // 날짜 순 정렬 후 해당 날짜 이전의 마지막 이력 찾기
  const sorted=[...hist].sort((a,b)=>a.date.localeCompare(b.date));
  let medsAtDate=null;
  for(const h of sorted) {
    if(h.date.localeCompare(date)>0) break;
    if(h.meds?.length) medsAtDate=h.meds;
  }
  // 이력에서 못 찾으면 현재 약물
  return medsAtDate||condition.medsList||[];
}

function renderMedsView() {
  // 7-6: 붕룩이 도메인이면 전용 대시보드 + 기존 질환 관리 축소 배치
  if (S.currentDomain==='bungruki') {
    return renderBungrukiDashboard() + renderMedsViewLegacy();
  }
  // 건강관리 도메인: 검사 아카이브 + 데일리체크 + 예방접종 + 질환 관리
  const checkupHtml = (typeof renderCheckupArchive === 'function' && S.currentDomain.endsWith('-health'))
    ? renderCheckupArchive() : '';
  const dailyHtml = (typeof renderHealthDailyCheck === 'function' && S.currentDomain.endsWith('-health'))
    ? renderHealthDailyCheck() : '';
  return checkupHtml + dailyHtml + renderVaccinationSection() + renderMedsViewLegacy();
}

function renderMedsViewLegacy() {
  const currentUser=DC().user;
  const isBungruki=S.currentDomain==='bungruki';
  const allConditions=getAllUserConditions();
  const statusLabels=isBungruki
    ?{active:'진행 중',remission:'완료',resolved:'완료',['self-stopped']:'보류'}
    :{active:'치료 중',remission:'관해',resolved:'완치',['self-stopped']:'자의 중단'};
  const statusClass={active:'active',remission:'remission',resolved:'resolved',['self-stopped']:'self-stopped'};

  // Group by domain, current domain first
  const grouped={};
  allConditions.forEach(c=>{
    if(!grouped[c._domainId]) grouped[c._domainId]={icon:c._domainIcon,label:c._domainLabel,color:c._domainColor,items:[]};
    grouped[c._domainId].items.push(c);
  });
  const domainOrder=Object.keys(grouped).sort((a,b)=>a===S.currentDomain?-1:b===S.currentDomain?1:0);

  const typeLabels={chronic:'만성',acute:'급성',preventive:'예방'};
  const typeColors={chronic:'#1d4ed8',acute:'#c2410c',preventive:'#15803d'};
  const renderCard=(c)=>{
    const dt=c.diseaseType||_DISEASE_TYPE_MAP[c.name]||'chronic';
    return `
    <div class="dx-card" style="${dt==='acute'&&c.status==='resolved'?'opacity:.6':''}">
      <div class="dx-head">
        <span class="dx-name">${esc(c.name)}</span>
        <span class="badge" style="background:${typeColors[dt]}15;color:${typeColors[dt]};font-size:.58rem;padding:1px 6px">${typeLabels[dt]||'만성'}</span>
        <span class="dx-status ${statusClass[c.status]||'active'}">${statusLabels[c.status]||c.status}</span>
        ${c.medsList?.length?`<button class="accum-del" onclick="openQuickMedChange('${esc(c._domainId)}',${c._idx})" title="약물 변경" style="color:#f59e0b">💊</button>`:''}
        ${c.drugChangeDate?`<button class="accum-del" onclick="compareDrugChange(${c._idx},'${esc(c._domainId)}')" title="변경 전후 비교" style="color:var(--ac)">📊</button>`:''}
        <button class="accum-del" onclick="editConditionUnified('${esc(c._domainId)}',${c._idx})" title="편집">✏️</button>
        <button class="accum-del" onclick="deleteConditionUnified('${esc(c._domainId)}',${c._idx})" title="삭제">🗑</button>
      </div>
      <div class="dx-body">
        ${c.diagnosisDate?`<strong>${isBungruki?'시작':'진단'}:</strong> ${esc(c.diagnosisDate)}<br>`:''}
        ${c.medsList?.length?`<div class="dx-section"><div class="dx-section-title">${isBungruki?'복용/보충제':'■ 현재 투약'}${c.drugChangeDate?` <span style="font-size:.6rem;color:var(--mu2);font-weight:400">(${esc(c.drugChangeDate)}~)</span>`:''}</div>
          <div style="display:flex;flex-wrap:wrap;gap:4px">${c.medsList.map((m,mi)=>{
            const sched = c.medSchedule?.[m];
            const schedLabel = sched ? (sched.type==='weekly'?'주'+sched.interval+'회':sched.type==='monthly'?'월'+sched.interval+'회':sched.type==='days'?sched.interval+'일마다':sched.type==='prn'?'PRN':'매일') : (m.includes('(PRN)')?'PRN':'매일');
            const schedColor = schedLabel==='매일'?'#c2410c':schedLabel==='PRN'?'#92400e':'#7c3aed';
            return `<span class="log-tag" onclick="openMedSchedule('${esc(c._domainId)}',${c._idx},'${esc(m).replace(/'/g,"\\'")}')" style="cursor:pointer;background:${m.includes('(PRN)')?'#fef3c7':'#fff7ed'};color:${schedColor};${m.includes('(PRN)')?'border:1px dashed #f59e0b':''}">${esc(m)} <span style="font-size:.5rem;opacity:.7">${schedLabel}</span></span>`;
          }).join('')}</div></div>`:''}
        ${c.medications&&!c.medsList?.length?`<div class="dx-section"><div class="dx-section-title">${isBungruki?'복용/보충제':'현재 투약'}</div>${esc(c.medications)}</div>`:''}
        ${(()=>{
          if(!c.medHistory?.length) return '';
          // 이전 약물 세트: medHistory에서 현재와 다른 약물 조합을 추출
          const prevSets=c.medHistory.filter(h=>h.meds?.length&&h.type!=='start').slice().reverse();
          const domId=c._domainId,cIdx=c._idx;
          const prevHtml=prevSets.length?`<div class="dx-section">
            <div class="dx-section-title" style="cursor:pointer;display:flex;align-items:center;gap:4px" onclick="const t=this.parentElement.querySelector('.prev-meds');t.style.display=t.style.display==='none'?'block':'none';this.querySelector('.pm-arr').textContent=t.style.display==='none'?'▸':'▾'">
              <span class="pm-arr">▾</span> 📋 이전 투약 기록 <span style="font-size:.6rem;color:var(--mu2);font-weight:400">${prevSets.length}건</span>
            </div>
            <div class="prev-meds" style="margin-top:6px">
              ${prevSets.map(h=>{
                const typeLabel={change:'변경',stop:'중단',dose:'용량 조절'}[h.type]||h.type;
                const hIdx=c.medHistory.indexOf(h);
                return `<div style="padding:6px 8px;margin-bottom:4px;border-radius:6px;background:var(--sf);border-left:3px solid var(--bd)">
                  <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
                    <span style="font-size:.72rem;font-weight:600;color:var(--ac);cursor:pointer;text-decoration:underline dotted" onclick="editMedHistDate('${esc(domId)}',${cIdx},${hIdx})" title="날짜 수정">${esc(h.date)}</span>
                    <span style="font-size:.6rem;padding:1px 6px;border-radius:8px;background:#f3f4f6;color:#6b7280">${typeLabel}</span>
                    ${h.reason?`<span style="font-size:.6rem;color:var(--mu2)">— ${esc(h.reason)}</span>`:''}
                  </div>
                  ${h.added?.length?`<div style="font-size:.68rem;margin-bottom:2px"><span style="color:#16a34a">+</span> ${h.added.map(m=>`<span style="display:inline-block;padding:1px 5px;margin:1px;border-radius:3px;background:#dcfce7;color:#15803d;font-size:.65rem">${esc(m)}</span>`).join('')}</div>`:''}
                  ${h.removed?.length?`<div style="font-size:.68rem;margin-bottom:2px"><span style="color:#dc2626">−</span> ${h.removed.map(m=>`<span style="display:inline-block;padding:1px 5px;margin:1px;border-radius:3px;background:#fef2f2;color:#b91c1c;font-size:.65rem;text-decoration:line-through">${esc(m)}</span>`).join('')}</div>`:''}
                  ${h.detail?`<div style="font-size:.68rem;color:var(--ink)">${esc(h.detail)}</div>`:''}
                  ${h.prevDrugResponse?`<div style="font-size:.65rem;color:var(--mu);margin-top:3px">💊 당시 약물 반응: ${esc(h.prevDrugResponse)}</div>`:''}
                  ${h.prevNotes?`<div style="font-size:.65rem;color:var(--mu);margin-top:2px">📝 당시 메모: ${esc(h.prevNotes)}</div>`:''}
                </div>`;
              }).join('')}
            </div>
          </div>`:'';
          // 전체 타임라인 (접힘)
          const timelineHtml=`<div class="dx-section">
            <div class="dx-section-title" style="cursor:pointer;display:flex;align-items:center;gap:4px" onclick="const t=this.parentElement.querySelector('.mh-timeline');t.style.display=t.style.display==='none'?'block':'none';this.querySelector('.mh-arr').textContent=t.style.display==='none'?'▸':'▾'">
              <span class="mh-arr">▸</span> 📜 전체 투약 이력 <span style="font-size:.6rem;color:var(--mu2);font-weight:400">${c.medHistory.length}건</span>
            </div>
            <div class="mh-timeline" style="display:none;margin-top:8px">
              ${c.medHistory.slice().reverse().map((h,i,arr)=>{
                const typeLabel={change:'변경',start:'최초 처방',stop:'중단',dose:'용량 조절'}[h.type]||h.type;
                const dotColor=h.type==='start'?'#22c55e':h.type==='stop'?'#ef4444':'var(--ac)';
                const isFirst=i===arr.length-1;
                const borderColor=isFirst?'#22c55e':h.type==='stop'?'#ef4444':'var(--ac)';
                return `<div style="border-left:3px solid ${borderColor};margin-bottom:8px;padding:8px 10px;border-radius:0 8px 8px 0;background:var(--sf)">
                  <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
                    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${dotColor};flex-shrink:0"></span>
                    <span style="font-size:.78rem;font-weight:600;color:var(--ink)">${esc(h.date)}</span>
                    <span style="font-size:.65rem;padding:1px 8px;border-radius:10px;background:color-mix(in srgb, ${dotColor}, transparent 90%);color:${dotColor};font-weight:600">${typeLabel}</span>
                  </div>
                  ${h.detail?`<div style="font-size:.75rem;color:var(--ink);margin-bottom:4px">${esc(h.detail)}</div>`:''}
                  ${h.added?.length?`<div style="font-size:.72rem;margin-bottom:2px"><span style="color:#16a34a;font-weight:600">+ 추가:</span> ${h.added.map(m=>`<span style="display:inline-block;padding:1px 6px;margin:1px;border-radius:4px;background:#dcfce7;color:#15803d;font-size:.68rem">${esc(m)}</span>`).join('')}</div>`:''}
                  ${h.removed?.length?`<div style="font-size:.72rem;margin-bottom:2px"><span style="color:#dc2626;font-weight:600">− 제거:</span> ${h.removed.map(m=>`<span style="display:inline-block;padding:1px 6px;margin:1px;border-radius:4px;background:#fef2f2;color:#b91c1c;font-size:.68rem;text-decoration:line-through">${esc(m)}</span>`).join('')}</div>`:''}
                  ${h.meds?.length?`<div style="margin-top:4px;padding-top:4px;border-top:1px dashed var(--bd)">
                    <div style="font-size:.62rem;color:var(--mu2);margin-bottom:2px">${isFirst?'처방 약물':'변경 후 약물'} (${h.meds.length}개)</div>
                    <div style="display:flex;flex-wrap:wrap;gap:3px">${h.meds.map(m=>`<span style="display:inline-block;padding:1px 6px;border-radius:4px;background:${isFirst?'#dbeafe':'#f3f4f6'};color:${isFirst?'#1e40af':'#374151'};font-size:.67rem">${esc(m)}</span>`).join('')}</div>
                  </div>`:''}
                  ${h.reason?`<div style="font-size:.68rem;color:var(--mu2);margin-top:4px">💬 ${esc(h.reason)}</div>`:''}
                  ${h.prevDrugResponse?`<div style="font-size:.65rem;color:var(--mu);margin-top:3px;padding:3px 6px;background:var(--sf2);border-radius:4px">💊 당시 반응: ${esc(h.prevDrugResponse)}</div>`:''}
                  ${h.prevNotes?`<div style="font-size:.65rem;color:var(--mu);margin-top:2px;padding:3px 6px;background:var(--sf2);border-radius:4px">📝 당시 메모: ${esc(h.prevNotes)}</div>`:''}
                </div>`;
              }).join('')}
            </div>
          </div>`;
          return prevHtml + timelineHtml;
        })()}
        ${c.drugResponse?`<div class="dx-section"><div class="dx-section-title">${isBungruki?'효과/반응':'약물 반응'}</div>${esc(c.drugResponse)}</div>`:''}
        ${c.course?`<div class="dx-section"><div class="dx-section-title">경과</div>${esc(c.course)}</div>`:''}
        ${c.notes?`<div class="dx-section"><div class="dx-section-title">메모</div>${esc(c.notes)}</div>`:''}
      </div>
    </div>`;};

  const sections=domainOrder.map(domId=>{
    const g=grouped[domId];
    const isCurrent=domId===S.currentDomain;
    return `<div style="margin-bottom:12px">
      <button onclick="toggleCtxDomain('dx-g-${domId}')" style="width:100%;display:flex;align-items:center;gap:8px;padding:8px 12px;background:${isCurrent?g.color+'15':'var(--sf2)'};border:1.5px solid ${isCurrent?g.color:'var(--bd)'};border-radius:8px;cursor:pointer;font-family:var(--font);border-bottom-left-radius:${isCurrent?'0':'8px'};border-bottom-right-radius:${isCurrent?'0':'8px'}">
        <span>${g.icon}</span>
        <span style="font-size:.82rem;font-weight:600;color:${g.color}">${g.label}</span>
        <span style="font-size:.68rem;color:var(--mu);margin-left:auto">${g.items.length}개</span>
        <span style="font-size:.65rem;color:var(--mu)" id="dx-g-${domId}-arrow">${isCurrent?'▼':'▶'}</span>
      </button>
      <div id="dx-g-${domId}" style="display:${isCurrent?'block':'none'}">
        ${g.items.map(c=>renderCard(c)).join('')}
      </div>
    </div>`;
  }).join('');

  return `
    <div class="card">
      <div class="card-title">📋 ${currentUser} — ${isBungruki?'임신 준비 관리':'통합 질환 관리'}
        <button class="btn-accum-add" style="margin-left:auto;font-size:.72rem" onclick="openConditionForm()">+ ${isBungruki?'관리 항목 추가':'질환 추가'}</button>
      </div>
      <p style="font-size:.78rem;color:var(--mu);margin-bottom:14px">
        ${isBungruki
          ?`${currentUser}의 임신 준비 과정에서 관리하는 항목들입니다. 등록된 항목은 AI 세션 시 자동으로 컨텍스트에 포함됩니다.`
          :`${currentUser}의 모든 도메인 질환을 통합 관리합니다. 등록된 질환은 AI 세션 시 자동으로 컨텍스트에 포함됩니다.`}
      </p>
      ${getUnloadedUserDomains().length?`<p style="font-size:.72rem;color:var(--r3);margin-bottom:10px">⚠️ ${getUnloadedUserDomains().map(d=>d.icon+' '+d.label).join(', ')} 도메인이 아직 로드되지 않았습니다. 해당 도메인을 한번 방문하면 질환이 표시됩니다.</p>`:''}
      <div id="dx-form" style="display:none;margin-bottom:16px;padding:16px;background:var(--sf2);border-radius:10px;border:1.5px solid var(--bd)">
        <input type="hidden" id="dx-edit-idx" value="-1">
        <input type="hidden" id="dx-edit-domain" value="">
        <div style="display:flex;gap:10px">
          <div class="dx-form-group" style="flex:2">
            <div class="dx-form-label">${isBungruki?'항목명':'질환명'} * <span style="font-size:.6rem;color:var(--mu2)">(검색하면 자동완성)</span></div>
            <input class="dx-form-input" id="dx-name" placeholder="${isBungruki?'예: 엽산 보충, 정액검사, 체중 관리':'예: 편두통, 고혈압, 당뇨'}" oninput="onDxNameInput(this.value)">
          </div>
          <div class="dx-form-group" style="flex:1">
            <div class="dx-form-label">소속 도메인</div>
            <select class="dx-form-input" id="dx-domain" style="cursor:pointer">
              ${Object.entries(DOMAINS).filter(([,d])=>d.user===currentUser).map(([id,d])=>
                `<option value="${id}" ${id===S.currentDomain?'selected':''}>${d.icon} ${d.label}</option>`).join('')}
            </select>
          </div>
        </div>
        <div id="dx-suggest" style="display:none;margin:-8px 0 12px;max-height:120px;overflow-y:auto;border:1.5px solid var(--bd);border-radius:6px;background:var(--sf)"${isBungruki?' data-brk-hide="1"':''}></div>
        <div style="display:flex;gap:10px">
          <div class="dx-form-group" style="flex:1">
            <div class="dx-form-label">${isBungruki?'시작 시기':'진단 시기'}</div>
            <input class="dx-form-input" id="dx-date" placeholder="${isBungruki?'예: 2026-03':'예: 2023년, 2025-06'}">
          </div>
          <div class="dx-form-group" style="flex:1">
            <div class="dx-form-label">${isBungruki?'관리 유형':'질환 유형'}</div>
            <select class="dx-form-input" id="dx-type" style="cursor:pointer">
              ${isBungruki?`
              <option value="preventive">예방/관리</option>
              <option value="chronic">꾸준히 관리</option>
              <option value="acute">일시적/검사</option>
              `:`
              <option value="chronic">만성 (꾸준히 관리)</option>
              <option value="acute">급성 (일시적)</option>
              <option value="preventive">예방/관리</option>
              `}
            </select>
          </div>
          <div class="dx-form-group" style="flex:1">
            <div class="dx-form-label">현재 상태</div>
            <select class="dx-form-input" id="dx-status" style="cursor:pointer">
              <option value="active">${isBungruki?'진행 중':'치료 중'}</option><option value="remission">${isBungruki?'완료':'관해'}</option>
              <option value="resolved">${isBungruki?'완료':'완치/종결'}</option><option value="self-stopped">${isBungruki?'보류':'자의 중단'}</option>
            </select>
          </div>
        </div>
        <div class="dx-form-group">
          <div class="dx-form-label">${isBungruki?'복용/보충제':'투약'} <span style="font-size:.6rem;color:var(--mu2)">(${isBungruki?'보충제/약품명':'약품명'} 입력 후 +추가)</span></div>
          <div id="dx-med-chips" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px"></div>
          <div id="dx-med-suggest" style="display:none;margin-bottom:6px;padding:4px;border:1px solid var(--bd);border-radius:6px;background:var(--sf)">
            <div style="font-size:.62rem;color:var(--mu);margin-bottom:4px">${isBungruki?'💊 관련 보충제/약품':'💊 이 질환에 주로 사용되는 약'}</div>
            <div id="dx-med-suggest-list" style="display:flex;flex-wrap:wrap;gap:4px"></div>
          </div>
          <div id="dx-med-ai-area" style="display:none;margin-bottom:6px">
            <button class="btn-export" id="dx-ai-search-btn" onclick="aiSearchMeds()" style="font-size:.72rem">🔍 AI로 최신 약물 검색</button>
            <div id="dx-ai-result" style="display:none;margin-top:6px;padding:6px;border:1px solid var(--bd);border-radius:6px;background:var(--sf);font-size:.75rem"></div>
          </div>
          <div style="display:flex;gap:6px;align-items:center">
            <input class="dx-form-input" id="dx-med-input" placeholder="약품명 검색..." style="flex:1">
            <label style="display:flex;align-items:center;gap:3px;font-size:.65rem;color:var(--mu);white-space:nowrap;cursor:pointer"><input type="checkbox" id="dx-med-prn"> PRN</label>
            <button class="btn-accum-add" onclick="addDxMed()" style="padding:6px 12px;font-size:.75rem">+추가</button>
          </div>
          <div style="margin-top:6px">
            <button onclick="document.getElementById('dx-rx-photo').click()" style="background:none;border:1.5px solid var(--bd);border-radius:6px;padding:5px 12px;font-size:.72rem;cursor:pointer;color:var(--mu)">📷 처방전/약봉투 사진으로 추가</button>
            <input type="file" id="dx-rx-photo" accept="image/*" style="display:none" onchange="processRxPhoto(this)">
          </div>
        </div>
        <div class="dx-form-group">
          <div class="dx-form-label">${isBungruki?'💊 변경 사유':'💊 투약 변경 사유'} <span style="font-size:.6rem;color:var(--mu2)">(${isBungruki?'보충제 변경 시 기록':'약 변경 시 자동 기록됨'})</span></div>
          <input class="dx-form-input" id="dx-hist-reason" placeholder="${isBungruki?'예: 제품 교체, 용량 변경':'예: 부작용으로 교체, 용량 증량, 효과 부족'}">
        </div>
        <div class="dx-form-group">
          <div class="dx-form-label">📜 과거 이력 수동 추가 <span style="font-size:.6rem;color:var(--mu2)">(이전 변경 기록)</span></div>
          <div id="dx-manual-hist" style="border:1px solid var(--bd);border-radius:8px;padding:8px;background:var(--sf)">
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">
              <input class="dx-form-input" id="dx-mh-date" type="date" style="width:140px">
              <select class="dx-form-input" id="dx-mh-type" style="width:120px;cursor:pointer">
                <option value="change">변경</option><option value="start">시작</option><option value="stop">중단</option><option value="dose">용량 조절</option>
              </select>
            </div>
            <input class="dx-form-input" id="dx-mh-detail" placeholder="변경 내용: 예) Amitriptyline 10mg → 25mg, Topiramate 추가" style="margin-bottom:6px">
            <input class="dx-form-input" id="dx-mh-meds" placeholder="당시 약물 세트 (쉼표 구분): 예) Escitalopram 10mg, Bupropion 150mg" style="margin-bottom:6px">
            <input class="dx-form-input" id="dx-mh-reason" placeholder="사유: 예) 통증 조절 불충분" style="margin-bottom:6px">
            <button class="btn-accum-add" onclick="addManualMedHistory()" style="font-size:.72rem">+ 이력 추가</button>
            <div id="dx-mh-list" style="margin-top:6px"></div>
          </div>
        </div>
        <div class="dx-form-group">
          <div class="dx-form-label">${isBungruki?'효과/반응':'약물 반응 (효과, 부작용)'}</div>
          <textarea class="dx-form-ta" id="dx-response" rows="2" placeholder="${isBungruki?'예: 3개월 복용 중, 수치 개선':'예: 혈압 130/80으로 안정, 어지러움 부작용 경미'}"></textarea>
        </div>
        <div class="dx-form-group">
          <div class="dx-form-label">경과</div>
          <textarea class="dx-form-ta" id="dx-course" rows="2" placeholder="예: 2023 진단 → 생활습관 개선 + 약물 시작 → 현재 안정"></textarea>
        </div>
        <div class="dx-form-group">
          <div class="dx-form-label">메모</div>
          <textarea class="dx-form-ta" id="dx-notes" rows="1" placeholder="기타 참고사항"></textarea>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn-accum-add" onclick="saveCondition()">💾 저장</button>
          <button class="btn-cancel" onclick="closeConditionForm()" style="font-size:.78rem">취소</button>
        </div>
      </div>
      ${allConditions.length?sections:`<div class="hint" style="padding:14px">${isBungruki?'등록된 관리 항목이 없습니다.<br>"+ 관리 항목 추가"를 눌러 첫 항목을 등록하세요.':'등록된 질환이 없습니다.<br>"+ 질환 추가"를 눌러 첫 질환을 등록하세요.'}</div>`}
    </div>`;
}

let _dxMedsList=[]; // temp med list for form
let _dxManualHistory=[]; // temp manual history entries for form

function addManualMedHistory() {
  const date=document.getElementById('dx-mh-date')?.value;
  const type=document.getElementById('dx-mh-type')?.value||'change';
  const detail=(document.getElementById('dx-mh-detail')?.value||'').trim();
  const medsRaw=(document.getElementById('dx-mh-meds')?.value||'').trim();
  const reason=(document.getElementById('dx-mh-reason')?.value||'').trim();
  if(!date){showToast('날짜를 선택하세요.');return;}
  if(!detail&&!medsRaw){showToast('변경 내용 또는 당시 약물을 입력하세요.');return;}
  const meds=medsRaw?medsRaw.split(',').map(s=>s.trim()).filter(Boolean):[];
  _dxManualHistory.push({date,type,detail,meds,reason});
  document.getElementById('dx-mh-date').value='';
  document.getElementById('dx-mh-detail').value='';
  document.getElementById('dx-mh-meds').value='';
  document.getElementById('dx-mh-reason').value='';
  renderManualHistList();
}
function removeManualHist(idx){_dxManualHistory.splice(idx,1);renderManualHistList();}
function renderManualHistList(){
  const el=document.getElementById('dx-mh-list');if(!el) return;
  const typeLabels={change:'변경',start:'시작',stop:'중단',dose:'용량 조절'};
  el.innerHTML=_dxManualHistory.map((h,i)=>`<div style="padding:6px 0;border-bottom:1px dashed var(--bd);font-size:.72rem">
    <div style="display:flex;align-items:center;gap:6px">
      <span style="color:var(--ac);font-weight:600">${esc(h.date)}</span>
      <span style="background:var(--sf2);padding:1px 6px;border-radius:4px">${typeLabels[h.type]||h.type}</span>
      <span style="flex:1">${h.detail?esc(h.detail):''}</span>
      <span style="cursor:pointer;color:var(--r3)" onclick="removeManualHist(${i})">✕</span>
    </div>
    ${h.meds?.length?`<div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:3px">${h.meds.map(m=>`<span style="padding:1px 6px;border-radius:4px;background:#f3f4f6;color:#374151;font-size:.65rem">${esc(m)}</span>`).join('')}</div>`:''}
    ${h.reason?`<div style="color:var(--mu2);margin-top:2px;font-size:.65rem">💬 ${esc(h.reason)}</div>`:''}
  </div>`).join('');
}

function onDxNameInput(val) {
  const suggest=document.getElementById('dx-suggest');
  if(!suggest||val.length<1){if(suggest)suggest.style.display='none';return;}
  // 붕룩이 도메인은 ICD-10 자동완성 비활성화
  if(suggest.dataset.brkHide==='1') return;
  const q=val.toLowerCase();
  const matches=_AC_DISEASES.filter(d=>d.toLowerCase().includes(q)).slice(0,8);
  if(!matches.length){suggest.style.display='none';return;}
  suggest.style.display='block';
  suggest.innerHTML=matches.map(m=>`<div style="padding:6px 10px;cursor:pointer;font-size:.82rem;border-bottom:1px solid var(--bd)" onmouseover="this.style.background='var(--sf2)'" onmouseout="this.style.background=''" onclick="selectDxName('${esc(m)}')">${esc(m)}</div>`).join('');
}

function selectDxName(name) {
  document.getElementById('dx-name').value=name;
  document.getElementById('dx-suggest').style.display='none';
  // Show related meds suggestion
  showDxMedSuggestions(name);
}

function showDxMedSuggestions(diseaseName) {
  const suggestArea=document.getElementById('dx-med-suggest');
  const suggestList=document.getElementById('dx-med-suggest-list');
  const aiArea=document.getElementById('dx-med-ai-area');
  if(!suggestArea||!suggestList) return;
  // 질환 유형 자동 설정
  const typeSelect=document.getElementById('dx-type');
  if(typeSelect){
    const autoType=Object.entries(_DISEASE_TYPE_MAP).find(([k])=>diseaseName.includes(k)||k.includes(diseaseName));
    if(autoType) typeSelect.value=autoType[1];
  }
  // 내장 DB에서 매칭
  let meds=[];
  Object.entries(_DISEASE_MEDS).forEach(([k,v])=>{
    if(diseaseName.includes(k)||k.includes(diseaseName)) meds=[...meds,...v];
  });
  meds=[...new Set(meds)];
  if(meds.length){
    suggestArea.style.display='block';
    suggestList.innerHTML=meds.map(m=>`<span class="log-chip" style="padding:3px 10px;font-size:.75rem;cursor:pointer" onclick="addDxMedFromSuggest('${esc(m)}')">${esc(m)}</span>`).join('');
  } else {
    suggestArea.style.display='none';
    // 내장 DB에 없으면 식약처 API로 검색 시도
    searchDrugsByDisease(diseaseName);
  }
  // AI 검색 버튼 항상 표시
  if(aiArea) aiArea.style.display='block';
}

// 식약처 API 역매핑: 질환명으로 관련 약품 검색
async function searchDrugsByDisease(diseaseName) {
  const suggestArea=document.getElementById('dx-med-suggest');
  const suggestList=document.getElementById('dx-med-suggest-list');
  if(!suggestArea||!suggestList) return;
  try {
    const url=`https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService07/getDrugPrdtPrmsnDtlInq05?serviceKey=dMhMcgCRxP9q36yRWkf%2BSvpsQGZ%2BdneSi%2BVGVqk4mpBKyOD8O7RIB3dTZvINaXbsPUqPeJ0KL3fwHmN7S4ARLQ%3D%3D&type=json&pageNo=1&numOfRows=15&efcy_qesitm=${encodeURIComponent(diseaseName)}`;
    const res=await fetchWithRetry(url);
    const data=await res.json();
    const items=data?.body?.items||[];
    if(!items.length) return;
    const meds=[...new Set(items.map(i=>i.ITEM_NAME?.split('(')[0]?.trim()).filter(Boolean))].slice(0,10);
    if(!meds.length) return;
    suggestArea.style.display='block';
    suggestList.innerHTML=`<div style="font-size:.6rem;color:var(--ac);width:100%;margin-bottom:2px">📡 식약처 API 검색 결과</div>`+
      meds.map(m=>`<span class="log-chip" style="padding:3px 10px;font-size:.75rem;cursor:pointer" onclick="addDxMedFromSuggest('${esc(m)}')">${esc(m)}</span>`).join('');
  } catch(e) { /* 식약처 API 실패시 무시 */ }
}

// AI (Perplexity) 검색
async function aiSearchMeds() {
  const name=document.getElementById('dx-name')?.value.trim();
  if(!name){showToast('질환명을 먼저 입력하세요');return;}
  if(!S.keys?.perp){showToast('Perplexity API 키가 필요합니다 (API 키 설정)');return;}
  const btn=document.getElementById('dx-ai-search-btn');
  const result=document.getElementById('dx-ai-result');
  if(btn){btn.disabled=true;btn.textContent='🔍 검색 중...';}
  if(result){result.style.display='block';result.innerHTML='<span style="color:var(--ac)">검색 중...</span>';}
  try {
    const answer=await callAI('perp',
      '한국 의료 기준으로 답변. 약품명은 반드시 영문 성분명(generic name)만 사용. 시술/치료법은 별도 구분. 출처 표기.',
      `"${name}" 질환의 현재 한국 표준 치료약물을 나열해줘.\n\n형식:\n## 약물 치료\n### 1차 치료\n- 성분명 (용량, 빈도)\n### 2차 치료\n- ...\n\n## 비약물 치료/시술\n- ...\n\n최신 한국 가이드라인 기준. 각 약물은 영문 성분명(generic name)만 사용.`
    );
    if(result){
      result.innerHTML=DOMPurify.sanitize(marked.parse(answer||'결과 없음'));
      // 약물명 추출: 영문 성분명 (대문자 시작, 소문자/하이픈 포함, 4자 이상)
      const medNames=(answer||'').match(/\b[A-Z][a-z]{2,}(?:[-\/][A-Za-z]+)*(?:\s[A-Z][a-z]+)?\b/g);
      if(medNames?.length){
        // 일반 영어 단어 제외
        const stopWords=new Set(['The','This','That','These','Those','With','From','Into','About','After','Before','During','Between','Through','However','Although','Because','Therefore','Also','Very','Most','Some','Other','Each','Every','Such','Both','Either','Neither','While','Since','Until','Unless','Where','When','Which','What','Korean','Korea','Guidelines','Treatment','Therapy','Line','First','Second','Third','Step','Oral','Intranasal','Daily','Chronic','Acute','Mild','Moderate','Severe','Standard','Recommended','Alternative','Combination','Monotherapy','Maintenance','Initial','Response','Refractory','Persistent','Intermittent','Available']);
        const unique=[...new Set(medNames)].filter(m=>m.length>3&&!stopWords.has(m)).slice(0,20);
        if(unique.length) result.innerHTML+=`<div style="margin-top:6px;border-top:1px solid var(--bd);padding-top:6px"><div style="font-size:.6rem;color:var(--mu);margin-bottom:4px">클릭하여 추가:</div><div style="display:flex;flex-wrap:wrap;gap:3px">${unique.map(m=>`<span class="log-chip" style="padding:2px 8px;font-size:.72rem;cursor:pointer" onclick="addDxMedFromSuggest('${esc(m)}')">${esc(m)}</span>`).join('')}</div></div>`;
      }
    }
  } catch(e) {
    if(result) result.innerHTML=`<span style="color:var(--re)">검색 실패: ${esc(e.message)}</span>`;
  }
  if(btn){btn.disabled=false;btn.textContent='🔍 AI로 최신 약물 검색';}
}

function addDxMedFromSuggest(med) {
  if(!_dxMedsList.includes(med)){_dxMedsList.push(med);renderDxMedChips();}
}

function addDxMed() {
  const input=document.getElementById('dx-med-input');
  let val=(input?.value||'').trim();
  if(!val) return;
  const isPrn=document.getElementById('dx-med-prn')?.checked;
  if(isPrn&&!val.includes('(PRN)')) val+=' (PRN)';
  if(!_dxMedsList.includes(val)){_dxMedsList.push(val);}
  input.value='';
  if(isPrn) document.getElementById('dx-med-prn').checked=false;
  renderDxMedChips();
}

// 📷 처방전/약봉투 사진에서 약물 자동 추출
async function processRxPhoto(input) {
  if(!input.files||!input.files[0]) return;
  const file=input.files[0];
  const aiId=S.keys?.claude?'claude':(S.keys?.gpt?'gpt':null);
  if(!aiId){showToast('⚠️ AI API 키가 필요합니다 (Claude 또는 GPT)');return;}
  showToast('📷 처방전 분석 중...',5000);
  try {
    const reader=new FileReader();
    reader.onload=async function(e){
      const base64=e.target.result.split(',')[1];
      const mediaType=file.type||'image/jpeg';
      const prompt=`이 이미지는 처방전, 약봉투, 또는 약품 사진입니다. 이미지에서 약물 정보를 추출해주세요.

반드시 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
[{"name":"약품명(성분명 포함)","dose":"용량","freq":"복용횟수","prn":false}]

규칙:
- name: 제품명이 보이면 "제품명(성분명)" 형태. 성분명만 보이면 성분명만.
- dose: "150mg", "50mg" 등 용량
- freq: "1일1회", "1일2회", "필요시" 등
- prn: 필요시 복용이면 true, 정규 복용이면 false
- 여러 약이 보이면 모두 추출`;
      let result='';
      if(aiId==='claude'){
        const resp=await fetchWithRetry('https://api.anthropic.com/v1/messages',{
          method:'POST',
          headers:{'Content-Type':'application/json','x-api-key':S.keys.claude,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
          body:JSON.stringify({model:S.models?.claude||DEFAULT_MODELS.claude,max_tokens:1000,messages:[{role:'user',content:[
            {type:'image',source:{type:'base64',media_type:mediaType,data:base64}},
            {type:'text',text:prompt}
          ]}]})
        });
        const data=await resp.json();
        result=data.content?.[0]?.text||'';
      } else {
        const resp=await fetchWithRetry('https://api.openai.com/v1/chat/completions',{
          method:'POST',
          headers:{'Content-Type':'application/json','Authorization':'Bearer '+S.keys.gpt},
          body:JSON.stringify({model:S.models?.gpt||DEFAULT_MODELS.gpt,max_tokens:1000,messages:[{role:'user',content:[
            {type:'image_url',image_url:{url:'data:'+mediaType+';base64,'+base64}},
            {type:'text',text:prompt}
          ]}]})
        });
        const data=await resp.json();
        result=data.choices?.[0]?.message?.content||'';
      }
      // Parse
      const jsonMatch=result.match(/\[[\s\S]*?\]/);
      if(!jsonMatch){showToast('⚠️ 약물을 인식하지 못했습니다',3000);return;}
      const meds=JSON.parse(jsonMatch[0]);
      if(!meds.length){showToast('⚠️ 약물을 찾지 못했습니다',3000);return;}
      // 추천 목록 표시 — 사용자가 선택
      const listHtml=meds.map((m,i)=>{
        const label=`${m.name}${m.dose?' '+m.dose:''}${m.freq?' ('+m.freq+')':''}`;
        return `<label style="display:flex;align-items:center;gap:8px;padding:4px 0;cursor:pointer">
          <input type="checkbox" checked class="rx-med-cb" data-idx="${i}" style="width:16px;height:16px;accent-color:var(--ac)">
          <span style="font-size:.78rem">${esc(label)}</span>
          ${m.prn?'<span style="font-size:.6rem;color:#f59e0b">PRN</span>':''}
        </label>`;
      }).join('');
      document.getElementById('confirm-title').textContent='📷 인식된 약물';
      document.getElementById('confirm-body').innerHTML=`
        <div style="font-size:.72rem;color:var(--mu);margin-bottom:6px">추가할 약물을 선택하세요:</div>
        ${listHtml}`;
      document.getElementById('confirm-foot').innerHTML=
        '<button class="btn-cancel" onclick="closeConfirmModal()" style="font-size:.78rem">취소</button>'+
        '<button class="btn-accum-add" onclick="applyRxPhoto()">✅ 선택 추가</button>';
      window._rxPhotoMeds=meds;
      openModal('confirm-modal');
    };
    reader.readAsDataURL(file);
  } catch(e){
    showToast('❌ 사진 분석 실패: '+e.message,4000);
  }
  input.value='';
}

function applyRxPhoto() {
  const meds=window._rxPhotoMeds||[];
  let added=0;
  document.querySelectorAll('.rx-med-cb:checked').forEach(cb=>{
    const idx=parseInt(cb.dataset.idx);
    const m=meds[idx];if(!m) return;
    let name=m.name+(m.dose?' '+m.dose:'');
    if(m.prn&&!name.includes('(PRN)')) name+=' (PRN)';
    if(!_dxMedsList.includes(name)){_dxMedsList.push(name);added++;}
  });
  renderDxMedChips();
  closeConfirmModal();
  delete window._rxPhotoMeds;
  showToast(`✅ ${added}개 약물 추가됨`);
}

function removeDxMed(idx) {
  _dxMedsList.splice(idx,1);
  renderDxMedChips();
}

let _dxTrackList=[]; // [{med, until}] — until: 'change'|'YYYY-MM-DD'

function _getTrackItem(med){return _dxTrackList.find(t=>t.med===med);}
function _isTracked(med){return !!_getTrackItem(med);}

function _toggleDxPrn(idx){
  const m=_dxMedsList[idx];if(!m)return;
  if(m.includes('(PRN)')){_dxMedsList[idx]=m.replace(/\s*\(PRN\)/,'');}
  else{_dxMedsList[idx]=m+' (PRN)';}
  renderDxMedChips();
}

function renderDxMedChips() {
  const el=document.getElementById('dx-med-chips');
  if(!el) return;
  el.innerHTML=_dxMedsList.map((m,i)=>{
    const isPrn=m.includes('(PRN)');
    const ti=_getTrackItem(m);
    const tracked=!!ti;
    const untilLabel=ti?(ti.until==='change'?'변경시까지':ti.until):'';
    return `<span class="file-chip" style="${isPrn?'border:1.5px dashed #f59e0b;background:#fff7ed':''}">${esc(m)} <span class="file-remove" onclick="removeDxMed(${i})">✕</span>
      <button onclick="_toggleDxPrn(${i})" style="font-size:.55rem;padding:1px 4px;border:1px solid ${isPrn?'#f59e0b':'var(--bd)'};border-radius:3px;background:${isPrn?'#fef3c7':'none'};color:${isPrn?'#92400e':'var(--mu)'};cursor:pointer;margin-left:2px;font-family:var(--font)" title="PRN 토글">${isPrn?'PRN':'매일'}</button>
      <button onclick="_toggleTrack(${i})" style="font-size:.55rem;padding:1px 4px;border:1px solid ${tracked?'#10b981':'var(--bd)'};border-radius:3px;background:${tracked?'#f0fdf4':'none'};color:${tracked?'#10b981':'var(--mu)'};cursor:pointer;margin-left:2px;font-family:var(--font)" title="순응도 추적">${tracked?'📊'+untilLabel:'추적'}</button></span>`;
  }).join('');
}

function _toggleTrack(idx){
  const m=_dxMedsList[idx];if(!m)return;
  const existing=_getTrackItem(m);
  if(existing){
    _dxTrackList=_dxTrackList.filter(t=>t.med!==m);
  }else{
    // 기본: 약 변경시까지. 날짜 지정 옵션 제공
    const until=prompt(m+' 추적 기간 설정:\n\n• "change" → 약 변경 시까지 (기본)\n• "YYYY-MM-DD" → 특정 날짜까지\n\n입력:','change');
    if(until===null)return;
    const val=until.trim()||'change';
    _dxTrackList.push({med:m,until:val});
  }
  renderDxMedChips();
}

function openConditionForm(domainId, idx) {
  document.getElementById('dx-form').style.display='block';
  document.getElementById('dx-edit-idx').value=idx!==undefined?idx:-1;
  document.getElementById('dx-edit-domain').value=domainId||S.currentDomain;
  if(domainId) document.getElementById('dx-domain').value=domainId;
  _conditionFiles=[];_dxMedsList=[];_dxManualHistory=[];_dxTrackList=[];
  const fileList=document.getElementById('dx-file-list');if(fileList)fileList.innerHTML='';
  if(idx!==undefined && domainId) {
    const ds=S.domainState[domainId];
    const c=ds?.master?.conditions?.[idx];
    if(!c) return;
    document.getElementById('dx-name').value=c.name||'';
    document.getElementById('dx-date').value=c.diagnosisDate||'';
    document.getElementById('dx-status').value=c.status||'active';
    const dxType=document.getElementById('dx-type');if(dxType)dxType.value=c.diseaseType||_DISEASE_TYPE_MAP[c.name]||'chronic';
    document.getElementById('dx-response').value=c.drugResponse||'';
    document.getElementById('dx-course').value=c.course||'';
    document.getElementById('dx-notes').value=c.notes||'';
    _dxMedsList=c.medsList?[...c.medsList]:(c.medications?c.medications.split(',').map(s=>s.trim()).filter(Boolean):[]);
    // 하위호환: 문자열 배열 → 객체 배열 변환
    _dxTrackList=(c.trackCompliance||[]).map(t=>typeof t==='string'?{med:t,until:'change'}:t);
    renderDxMedChips();
    showDxMedSuggestions(c.name);
  } else {
    ['dx-name','dx-date','dx-response','dx-course','dx-notes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
    document.getElementById('dx-status').value='active';
    renderDxMedChips();
    document.getElementById('dx-med-suggest').style.display='none';
  }
  renderManualHistList();
  // Setup med input autocomplete
  setTimeout(()=>setupAutocomplete('dx-med-input',_AC_MEDS,true),50);
  document.getElementById('dx-form').scrollIntoView({behavior:'smooth'});
}

function closeConditionForm(){document.getElementById('dx-form').style.display='none';}
function editConditionUnified(domainId,idx){openConditionForm(domainId,idx);}

async function saveCondition() {
  const name=document.getElementById('dx-name').value.trim();
  if(!name){showToast('질환명을 입력하세요.');return;}
  const targetDomain=document.getElementById('dx-domain').value||S.currentDomain;
  const ds=S.domainState[targetDomain];
  if(!ds?.master) {showToast('해당 도메인 데이터가 로드되지 않았습니다.');return;}
  if(!ds.master.conditions) ds.master.conditions=[];

  const data={
    id:Date.now(), name,
    diseaseType:document.getElementById('dx-type')?.value||'chronic',
    diagnosisDate:document.getElementById('dx-date').value.trim(),
    status:document.getElementById('dx-status').value,
    medsList:[..._dxMedsList],
    trackCompliance:_dxTrackList.length?[..._dxTrackList]:undefined,
    medications:_dxMedsList.join(', '),
    drugChangeDate:document.getElementById('dx-drug-change')?.value||'',
    drugResponse:document.getElementById('dx-response').value.trim(),
    course:document.getElementById('dx-course').value.trim(),
    notes:document.getElementById('dx-notes').value.trim(),
    attachments:_conditionFiles.map(f=>({name:f.name,type:f.type,driveId:f.driveId,webLink:f.webLink})),
  };

  const editDomain=document.getElementById('dx-edit-domain').value;
  const editIdx=parseInt(document.getElementById('dx-edit-idx').value);
  if(editIdx>=0 && editDomain && S.domainState[editDomain]?.master?.conditions?.[editIdx]) {
    const prev=S.domainState[editDomain].master.conditions[editIdx];
    data.id=prev.id;
    // Auto-detect medication changes → append to medHistory
    data.medHistory=prev.medHistory?[...prev.medHistory]:[];
    const oldMeds=prev.medsList||[];
    const newMeds=data.medsList||[];
    const added=newMeds.filter(m=>!oldMeds.includes(m));
    const removed=oldMeds.filter(m=>!newMeds.includes(m));
    if(added.length||removed.length) {
      const reason=document.getElementById('dx-hist-reason')?.value?.trim()||'';
      const histType=oldMeds.length===0?'start':newMeds.length===0?'stop':'change';
      const histEntry={date:kstToday(),type:histType,added,removed,meds:[...newMeds],reason};
      // 이전 약물 반응/메모를 이력에 보존
      if(prev.drugResponse) histEntry.prevDrugResponse=prev.drugResponse;
      if(prev.notes) histEntry.prevNotes=prev.notes;
      data.medHistory.push(histEntry);
      data.drugChangeDate=kstToday();
    }
    // Merge manual history entries (with optional meds snapshot)
    _dxManualHistory.forEach(h=>{
      const entry={date:h.date,type:h.type,reason:h.reason};
      if(h.detail) entry.detail=h.detail;
      if(h.meds?.length) entry.meds=[...h.meds];
      data.medHistory.push(entry);
    });
    if(data.medHistory.length) data.medHistory.sort((a,b)=>a.date.localeCompare(b.date));
    if(editDomain===targetDomain) {
      ds.master.conditions[editIdx]=data;
    } else {
      // Moved to different domain — save old domain first, rollback on failure
      const oldDs=S.domainState[editDomain];
      const oldConditions=[...oldDs.master.conditions];
      oldDs.master.conditions.splice(editIdx,1);
      try {
        if(oldDs.masterFileId) await driveUpdate(oldDs.masterFileId,oldDs.master);
      } catch(e) {
        oldDs.master.conditions=oldConditions; // rollback
        showToast('⚠️ 이전 도메인 저장 실패 — 이동 취소됨',4000);
        return;
      }
      ds.master.conditions.push(data);
    }
  } else {
    // New condition — add manual history + auto start entry
    data.medHistory=[];
    if(data.medsList?.length) {
      data.medHistory.push({date:kstToday(),type:'start',added:[...data.medsList],removed:[],meds:[...data.medsList],reason:'최초 등록'});
    }
    _dxManualHistory.forEach(h=>{
      const entry={date:h.date,type:h.type,reason:h.reason};
      if(h.detail) entry.detail=h.detail;
      if(h.meds?.length) entry.meds=[...h.meds];
      data.medHistory.push(entry);
    });
    if(data.medHistory.length) data.medHistory.sort((a,b)=>a.date.localeCompare(b.date));
    ds.master.conditions.push(data);
  }

  if(ds.masterFileId){try{await driveUpdate(ds.masterFileId,ds.master);}catch(e){}}
  _conditionFiles=[];_dxMedsList=[];_dxManualHistory=[];_dxTrackList=[];
  closeConditionForm();
  renderView('meds');
  showToast('✅ 질환 정보 저장됨');
}

async function deleteConditionUnified(domainId,idx) {
  if(!confirm('이 질환 기록을 삭제하시겠습니까?')) return;
  const ds=S.domainState[domainId];
  if(!ds?.master?.conditions) return;
  ds.master.conditions.splice(idx,1);
  if(ds.masterFileId){try{await driveUpdate(ds.masterFileId,ds.master);}catch(e){}}
  renderView('meds');
  showToast('🗑 삭제됨');
}

// Quick medication change modal — 전체 폼 없이 약물만 빠르게 변경
let _qmcDomain='',_qmcIdx=-1;
function _qmcAddMed() {
  const i=document.getElementById('qmc-new-med');
  let v=(i?.value||'').trim();if(!v)return;
  if(document.getElementById('qmc-prn')?.checked&&!v.includes('(PRN)'))v+=' (PRN)';
  const s=document.createElement('span');s.className='file-chip';
  if(v.includes('(PRN)'))s.style.cssText='border:1.5px dashed #f59e0b;background:#fff7ed';
  s.innerHTML=esc(v)+' <span class="file-remove" onclick="this.parentElement.remove()">✕</span>';
  document.getElementById('qmc-chips').appendChild(s);
  i.value='';const prn=document.getElementById('qmc-prn');if(prn)prn.checked=false;
}
function openQuickMedChange(domainId, idx) {
  const ds=S.domainState[domainId];
  const c=ds?.master?.conditions?.[idx];
  if(!c) return;
  _qmcDomain=domainId;_qmcIdx=idx;
  const oldMeds=c.medsList||[];
  const lastChange=c.drugChangeDate||c.medHistory?.slice(-1)[0]?.date||'';
  document.getElementById('confirm-title').textContent='💊 '+c.name+' — 약물 변경';
  document.getElementById('confirm-body').innerHTML=`
    <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;padding:8px 10px;margin-bottom:10px">
      <div style="font-size:.68rem;color:#92400e;font-weight:600;margin-bottom:4px">📋 변경 전 약물${lastChange?' ('+esc(lastChange)+'~)':''} → 이전 기록으로 저장됩니다</div>
      <div style="display:flex;flex-wrap:wrap;gap:3px">${oldMeds.map(m=>`<span style="display:inline-block;padding:2px 6px;border-radius:4px;background:#fff7ed;color:#c2410c;font-size:.7rem;${m.includes('(PRN)')?'border:1px dashed #f59e0b':''}">${esc(m)}</span>`).join('')}</div>
    </div>
    <div style="font-size:.72rem;color:var(--ink);font-weight:600;margin-bottom:6px">새 약물 구성 (편집):</div>
    <div id="qmc-chips" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px">
      ${oldMeds.map(m=>`<span class="file-chip" style="${m.includes('(PRN)')?'border:1.5px dashed #f59e0b;background:#fff7ed':''}">${esc(m)} <span class="file-remove" onclick="this.parentElement.remove()">✕</span></span>`).join('')}
    </div>
    <div style="display:flex;gap:6px;margin-bottom:10px">
      <input class="dx-form-input" id="qmc-new-med" placeholder="새 약물 추가..." style="flex:1">
      <label style="display:flex;align-items:center;gap:3px;font-size:.65rem;color:var(--mu);cursor:pointer"><input type="checkbox" id="qmc-prn"> PRN</label>
      <button class="btn-accum-add" onclick="_qmcAddMed()" style="padding:6px 12px">+</button>
    </div>
    <div style="font-size:.72rem;color:var(--mu);margin-bottom:4px">변경 사유:</div>
    <input class="dx-form-input" id="qmc-reason" placeholder="예: 부작용으로 교체, 용량 증량">
    <div style="font-size:.72rem;color:var(--mu);margin-bottom:4px;margin-top:8px">변경 일자:</div>
    <input class="dx-form-input" id="qmc-date" type="date" value="${kstToday()}">`;
  document.getElementById('confirm-foot').innerHTML=
    '<button class="btn-cancel" onclick="closeConfirmModal()" style="font-size:.78rem">취소</button>'+
    '<button class="btn-accum-add" onclick="saveQuickMedChange()">💾 변경 저장</button>';
  openModal('confirm-modal');
  setTimeout(()=>setupAutocomplete('qmc-new-med',_AC_MEDS,true),50);
}

async function saveQuickMedChange() {
  const ds=S.domainState[_qmcDomain];
  const c=ds?.master?.conditions?.[_qmcIdx];
  if(!c) return;
  const oldMeds=c.medsList||[];
  const newMeds=[];
  document.querySelectorAll('#qmc-chips .file-chip').forEach(el=>{
    const text=el.childNodes[0]?.textContent?.trim();
    if(text) newMeds.push(text);
  });
  const reason=(document.getElementById('qmc-reason')?.value||'').trim();
  const added=newMeds.filter(m=>!oldMeds.includes(m));
  const removed=oldMeds.filter(m=>!newMeds.includes(m));
  if(!added.length&&!removed.length){showToast('변경사항이 없습니다.');return;}
  const changeDate=document.getElementById('qmc-date')?.value||kstToday();
  // Update medsList
  c.medsList=[...newMeds];
  c.medications=newMeds.join(', ');
  // Append to medHistory
  if(!c.medHistory) c.medHistory=[];
  const histType=oldMeds.length===0?'start':newMeds.length===0?'stop':'change';
  const histEntry={date:changeDate,type:histType,added,removed,meds:[...newMeds],reason};
  // 이전 약물 반응/메모를 이력에 보존
  if(c.drugResponse) histEntry.prevDrugResponse=c.drugResponse;
  if(c.notes) histEntry.prevNotes=c.notes;
  c.medHistory.push(histEntry);
  c.medHistory.sort((a,b)=>a.date.localeCompare(b.date));
  c.drugChangeDate=changeDate;
  // Save
  if(ds.masterFileId){try{await driveUpdate(ds.masterFileId,ds.master);}catch(e){}}
  closeConfirmModal();
  renderView('meds');
  showToast(`✅ 약물 변경 저장 — +${added.length} -${removed.length}`);
}

// 투약 이력 편집 (날짜/약물/사유/메모 수정 + 삭제)
let _mheDom='',_mheCond=-1,_mheHist=-1;
function _mheAddMed() {
  const i=document.getElementById('mhe-new-med');
  let v=(i?.value||'').trim();if(!v)return;
  if(document.getElementById('mhe-prn')?.checked&&!v.includes('(PRN)'))v+=' (PRN)';
  const s=document.createElement('span');s.className='file-chip';
  if(v.includes('(PRN)'))s.style.cssText='border:1.5px dashed #f59e0b;background:#fff7ed';
  s.innerHTML=esc(v)+' <span class="file-remove" onclick="this.parentElement.remove()">✕</span>';
  document.getElementById('mhe-chips').appendChild(s);
  i.value='';const prn=document.getElementById('mhe-prn');if(prn)prn.checked=false;
}

function editMedHistDate(domainId, condIdx, histIdx) {
  const ds=S.domainState[domainId];
  const c=ds?.master?.conditions?.[condIdx];
  const h=c?.medHistory?.[histIdx];
  if(!h) return;
  _mheDom=domainId;_mheCond=condIdx;_mheHist=histIdx;
  const typeLabels={change:'변경',start:'최초 처방',stop:'중단',dose:'용량 조절'};
  document.getElementById('confirm-title').textContent='✏️ '+c.name+' — 이력 수정';
  document.getElementById('confirm-body').innerHTML=`
    <div style="display:flex;gap:8px;margin-bottom:8px">
      <div style="flex:1"><div style="font-size:.72rem;color:var(--mu);margin-bottom:4px">변경 일자</div>
        <input class="dx-form-input" id="mhe-date" type="date" value="${h.date}"></div>
      <div style="flex:1"><div style="font-size:.72rem;color:var(--mu);margin-bottom:4px">유형</div>
        <select class="dx-form-input" id="mhe-type" style="cursor:pointer">
          ${['change','start','stop','dose'].map(t=>`<option value="${t}" ${h.type===t?'selected':''}>${typeLabels[t]}</option>`).join('')}
        </select></div>
    </div>
    <div style="font-size:.72rem;color:var(--mu);margin-bottom:4px">당시 약물 세트 (편집):</div>
    <div id="mhe-chips" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px">
      ${(h.meds||[]).map(m=>`<span class="file-chip" style="${m.includes('(PRN)')?'border:1.5px dashed #f59e0b;background:#fff7ed':''}">${esc(m)} <span class="file-remove" onclick="this.parentElement.remove()">✕</span></span>`).join('')}
    </div>
    <div style="display:flex;gap:6px;margin-bottom:8px">
      <input class="dx-form-input" id="mhe-new-med" placeholder="약물 추가..." style="flex:1">
      <label style="display:flex;align-items:center;gap:3px;font-size:.65rem;color:var(--mu);cursor:pointer"><input type="checkbox" id="mhe-prn"> PRN</label>
      <button class="btn-accum-add" onclick="_mheAddMed()" style="padding:6px 10px">+</button>
    </div>
    <div style="font-size:.72rem;color:var(--mu);margin-bottom:4px">변경 사유:</div>
    <input class="dx-form-input" id="mhe-reason" value="${esc(h.reason||'')}" style="margin-bottom:6px">
    <div style="font-size:.72rem;color:var(--mu);margin-bottom:4px">당시 약물 반응:</div>
    <textarea class="dx-form-input" id="mhe-response" rows="2" style="margin-bottom:6px;resize:vertical">${esc(h.prevDrugResponse||'')}</textarea>
    <div style="font-size:.72rem;color:var(--mu);margin-bottom:4px">당시 메모:</div>
    <textarea class="dx-form-input" id="mhe-notes" rows="2" style="resize:vertical">${esc(h.prevNotes||'')}</textarea>`;
  document.getElementById('confirm-foot').innerHTML=
    `<button class="btn-cancel" onclick="deleteMedHist()" style="font-size:.78rem;color:#dc2626;border-color:#dc2626">🗑 삭제</button>`+
    '<button class="btn-cancel" onclick="closeConfirmModal()" style="font-size:.78rem">취소</button>'+
    `<button class="btn-accum-add" onclick="saveMedHistEdit()">💾 저장</button>`;
  openModal('confirm-modal');
  setTimeout(()=>setupAutocomplete('mhe-new-med',_AC_MEDS,true),50);
}

async function saveMedHistEdit() {
  const ds=S.domainState[_mheDom];
  const c=ds?.master?.conditions?.[_mheCond];
  const h=c?.medHistory?.[_mheHist];
  if(!h) return;
  const newDate=document.getElementById('mhe-date')?.value;
  if(!newDate){showToast('날짜를 선택하세요.');return;}
  const oldDate=h.date;
  // 약물 세트 수집
  const newMeds=[];
  document.querySelectorAll('#mhe-chips .file-chip').forEach(el=>{
    const text=el.childNodes[0]?.textContent?.trim();
    if(text) newMeds.push(text);
  });
  // 이력 업데이트
  h.date=newDate;
  h.type=document.getElementById('mhe-type')?.value||h.type;
  h.reason=document.getElementById('mhe-reason')?.value?.trim()||'';
  if(newMeds.length) h.meds=[...newMeds];
  const resp=document.getElementById('mhe-response')?.value?.trim()||'';
  const notes=document.getElementById('mhe-notes')?.value?.trim()||'';
  if(resp) h.prevDrugResponse=resp; else delete h.prevDrugResponse;
  if(notes) h.prevNotes=notes; else delete h.prevNotes;
  if(c.medHistory?.length) c.medHistory.sort((a,b)=>a.date.localeCompare(b.date));
  // drugChangeDate 갱신
  const lastChange=c.medHistory.filter(x=>x.type!=='start').slice(-1)[0];
  if(lastChange) c.drugChangeDate=lastChange.date;
  // 증상 기록 medCheck 업데이트 (날짜 변경 시)
  if(oldDate!==newDate) {
    const logData=ds.logData||[];
    const minD=oldDate<newDate?oldDate:newDate;
    const maxD=oldDate<newDate?newDate:oldDate;
    logData.forEach(l=>{
      const logDate=l.datetime?.slice(0,10);
      if(!logDate||!l.medCheck||logDate<minD||logDate>maxD) return;
      const activeMeds=getMedsAtDate(c, logDate);
      const newMc={};
      activeMeds.forEach(m=>{newMc[m]=l.medCheck[m]??true;});
      l.medCheck=Object.keys(newMc).length?newMc:undefined;
    });
  }
  if(ds.masterFileId){try{await driveUpdate(ds.masterFileId,ds.master);}catch(e){}}
  closeConfirmModal();
  renderView('meds');
  showToast('✅ 이력 수정 완료');
}

async function deleteMedHist() {
  if(!confirm('이 투약 이력을 삭제하시겠습니까?')) return;
  const ds=S.domainState[_mheDom];
  const c=ds?.master?.conditions?.[_mheCond];
  if(!c?.medHistory) return;
  c.medHistory.splice(_mheHist,1);
  // drugChangeDate 갱신
  const lastChange=c.medHistory.filter(x=>x.type!=='start').slice(-1)[0];
  c.drugChangeDate=lastChange?.date||'';
  if(ds.masterFileId){try{await driveUpdate(ds.masterFileId,ds.master);}catch(e){}}
  closeConfirmModal();
  renderView('meds');
  showToast('🗑 이력 삭제됨');
}

// Build conditions context for AI prompts (전체 유저 도메인 통합)
function getConditionsContext() {
  const currentUser=DC().user;
  const currentDomain=S.currentDomain;
  const statusLabels={active:'치료 중',remission:'관해',resolved:'완치',['self-stopped']:'자의 중단'};
  const sections=[];

  const _formatCondition=(c,brief)=>{
    let line=`- ${c.name} (${statusLabels[c.status]||c.status})`;
    if(c.diagnosisDate) line+=` [진단: ${c.diagnosisDate}]`;
    if(c.medications) line+=`\n  투약: ${c.medications}`;
    if(!brief){
      if(c.medHistory?.length){
        const recent=c.medHistory.slice(-3);
        line+=`\n  투약이력(최근): ${recent.map(h=>`${h.date} ${h.type}${h.added?.length?' +'+h.added.join(','):''}${h.removed?.length?' -'+h.removed.join(','):''}${h.detail||''}${h.reason?' ('+h.reason+')':''}`).join(' → ')}`;
      }
      if(c.drugResponse) line+=`\n  반응: ${c.drugResponse}`;
      if(c.course) line+=`\n  경과: ${c.course}`;
    }
    return line;
  };

  // 현재 도메인 질환 (상세)
  const currentConds=getConditions();
  if(currentConds.length){
    sections.push(`[등록된 질환]\n${currentConds.map(c=>_formatCondition(c,false)).join('\n')}`);
  }

  // 다른 도메인 질환 (요약 — 투약이력/반응/경과 생략)
  Object.entries(S.domainState).forEach(([domainId,ds])=>{
    if(domainId===currentDomain||!ds.master) return;
    const dd=DOMAINS[domainId];
    if(!dd||dd.user!==currentUser) return;
    const conds=ds.master.conditions||[];
    if(!conds.length) return;
    sections.push(`[${dd.icon} ${dd.label} 질환]\n${conds.map(c=>_formatCondition(c,true)).join('\n')}`);
  });

  return sections.length?'\n\n'+sections.join('\n\n'):'';
}

// ═══════════════════════════════════════════════════════════════
// 💰 PRICE AUTO-UPDATE (restored from v6)
// ═══════════════════════════════════════════════════════════════
async function checkPriceUpdate() {
  if (!S.keys?.perp) return;
  const m = DM(); if (!m) return;
  const daysSince = m.price_updated ? (Date.now() - new Date(m.price_updated)) / 86400000 : 8;
  if (daysSince < 7) return;
  try {
    const prompt = `Current date: ${kstToday()}. List ALL current API pricing (USD per 1M tokens, input and output) for these models. Also list any NEW models released in the last 30 days for each provider.

Providers: OpenAI (GPT-5.x, o3, o4), Anthropic (Claude Sonnet/Opus/Haiku 4.x), Google (Gemini 2.5/3.x), xAI (Grok 3/4), Perplexity (Sonar).

Reply in JSON ONLY:
{"prices":{"model-name":{"in":X,"out":X},...}, "new_models":[{"name":"...","provider":"...","note":"..."}], "price_changes":[{"model":"...","old_in":X,"new_in":X,"old_out":X,"new_out":X}]}`;
    const r = await fetch('https://api.perplexity.ai/chat/completions', {
      method:'POST', headers:{'Content-Type':'application/json',Authorization:'Bearer '+S.keys.perp},
      body:JSON.stringify({model:'sonar',max_tokens:800,messages:[{role:'user',content:prompt}]})
    });
    const d = await r.json();
    const text = d.choices?.[0]?.message?.content || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      // 가격 업데이트
      if (parsed.prices) {
        const valid = Object.values(parsed.prices).every(p => p.in >= 0.01 && p.in <= 100 && p.out >= 0.01 && p.out <= 100);
        if (valid) {
          m.price_table = {...DEFAULT_PRICE_TABLE, ...parsed.prices};
        }
      }
      // 신규 모델/가격 변동 알림
      const alerts = [];
      if (parsed.new_models?.length) {
        alerts.push('🆕 신규 모델: ' + parsed.new_models.map(m => `${m.name} (${m.provider})`).join(', '));
      }
      if (parsed.price_changes?.length) {
        const cheaper = parsed.price_changes.filter(c => c.new_in < c.old_in || c.new_out < c.old_out);
        if (cheaper.length) {
          alerts.push('💰 가격 인하: ' + cheaper.map(c => c.model).join(', '));
        }
      }
      if (alerts.length) {
        showToast(alerts.join(' | '), 6000);
        m._priceAlerts = alerts;
      }
      m.price_updated = kstNow().toISOString();
      await saveMaster();
    }
  } catch(e) {}
}


// ═══════════════════════════════════════════════════════════════
// PWA SERVICE WORKER REGISTRATION
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// DRUG NAME BILINGUAL MAPPING (한국어↔영어)
// ═══════════════════════════════════════════════════════════════
const _DRUG_NAMES = {
  // 진통·소염 (NSAIDs, 해열진통)
  '타이레놀':'Acetaminophen','아세트아미노펜':'Acetaminophen','AAP':'Acetaminophen',
  '이부프로펜':'Ibuprofen','부루펜':'Ibuprofen','애드빌':'Ibuprofen','모트린':'Ibuprofen',
  '나프록센':'Naproxen','낙센':'Naproxen','나프로신':'Naproxen',
  '아스피린':'Aspirin','바이엘':'Aspirin',
  '록소프로펜':'Loxoprofen','록소닌':'Loxoprofen',
  '셀레콕시브':'Celecoxib','셀레브렉스':'Celecoxib',
  '디클로페낙':'Diclofenac','볼타렌':'Diclofenac',
  '멜록시캄':'Meloxicam','모비코스':'Meloxicam',
  '에토리콕시브':'Etoricoxib','아코시아':'Etoricoxib',
  '케토롤락':'Ketorolac','케토락':'Ketorolac',
  '트라마돌':'Tramadol','트리돌':'Tramadol','울트라셋':'Tramadol',
  // 편두통·트립탄
  '수마트립탄':'Sumatriptan','이미그란':'Sumatriptan',
  '리자트립탄':'Rizatriptan','맥살트':'Rizatriptan',
  '졸미트립탄':'Zolmitriptan','조믹':'Zolmitriptan',
  '엘레트립탄':'Eletriptan','렐팩스':'Eletriptan',
  '에르고타민':'Ergotamine','카페르곳':'Ergotamine',
  '리메게판트':'Rimegepant','누르텍':'Rimegepant',
  '아토게판트':'Atogepant','쿨리프타':'Atogepant',
  '갈카네주맙':'Galcanezumab','엠갈리티':'Galcanezumab',
  '에레누맙':'Erenumab','아이모빅':'Erenumab',
  '프레마네주맙':'Fremanezumab','아조비':'Fremanezumab',
  // 심혈관·혈압
  '프로프라놀롤':'Propranolol','인데랄':'Propranolol',
  '아테놀롤':'Atenolol','테놀민':'Atenolol',
  '비소프롤롤':'Bisoprolol','콩코르':'Bisoprolol',
  '카르베딜롤':'Carvedilol','딜라트렌드':'Carvedilol',
  '암로디핀':'Amlodipine','노바스크':'Amlodipine',
  '니페디핀':'Nifedipine','아달라트':'Nifedipine',
  '로사르탄':'Losartan','코자':'Losartan',
  '발사르탄':'Valsartan','디오반':'Valsartan',
  '칸데사르탄':'Candesartan','아타칸드':'Candesartan',
  '텔미사르탄':'Telmisartan','미카르디스':'Telmisartan',
  '이르베사르탄':'Irbesartan','아프로벨':'Irbesartan',
  '리시노프릴':'Lisinopril','제스트릴':'Lisinopril',
  '에날라프릴':'Enalapril','레니텍':'Enalapril',
  '라미프릴':'Ramipril','트리테이스':'Ramipril',
  '하이드로클로로티아지드':'Hydrochlorothiazide','HCTZ':'Hydrochlorothiazide',
  '푸로세미드':'Furosemide','라식스':'Furosemide',
  '스피로놀락톤':'Spironolactone','알닥톤':'Spironolactone',
  // 항경련·편두통예방
  '토피라메이트':'Topiramate','토파맥스':'Topiramate',
  '발프로산':'Valproate','데파코트':'Valproate','데파킨':'Valproate',
  '가바펜틴':'Gabapentin','뉴론틴':'Gabapentin',
  '프레가발린':'Pregabalin','리리카':'Pregabalin',
  '라모트리진':'Lamotrigine','라믹탈':'Lamotrigine',
  '카르바마제핀':'Carbamazepine','테그레톨':'Carbamazepine',
  '레베티라세탐':'Levetiracetam','케프라':'Levetiracetam',
  // 항우울제
  '아미트립틸린':'Amitriptyline','에트라빌':'Amitriptyline',
  '노르트립틸린':'Nortriptyline','센시발':'Nortriptyline',
  '클로미프라민':'Clomipramine','아나프라닐':'Clomipramine',
  '에스시탈로프람':'Escitalopram','렉사프로':'Escitalopram',
  '설트랄린':'Sertraline','졸로프트':'Sertraline',
  '플루옥세틴':'Fluoxetine','프로작':'Fluoxetine',
  '파록세틴':'Paroxetine','팍실':'Paroxetine',
  '플루복사민':'Fluvoxamine','듀미록스':'Fluvoxamine',
  '시탈로프람':'Citalopram','시프라밀':'Citalopram',
  '벤라팍신':'Venlafaxine','이팩사':'Venlafaxine','Venlafaxine XR':'Venlafaxine','벤라팍신XR':'Venlafaxine',
  '데스벤라팍신':'Desvenlafaxine','프리스틱':'Desvenlafaxine','Desvenlafaxine ER':'Desvenlafaxine',
  '둘록세틴':'Duloxetine','심발타':'Duloxetine',
  '부프로피온':'Bupropion','웰부트린':'Bupropion','Bupropion XL':'Bupropion','Bupropion XR':'Bupropion','Bupropion SR':'Bupropion',
  '미르타자핀':'Mirtazapine','레메론':'Mirtazapine',
  '트라조돈':'Trazodone','트라조릴':'Trazodone',
  '보르티옥세틴':'Vortioxetine','브린텔릭스':'Vortioxetine',
  // 항불안·수면
  '하이드록시진':'Hydroxyzine','유시락스':'Hydroxyzine',
  '부스피론':'Buspirone','부스파':'Buspirone',
  '알프라졸람':'Alprazolam','자낙스':'Alprazolam',
  '로라제팜':'Lorazepam','아티반':'Lorazepam',
  '클로나제팜':'Clonazepam','리보트릴':'Clonazepam',
  '디아제팜':'Diazepam','바리움':'Diazepam',
  '졸피뎀':'Zolpidem','스틸녹스':'Zolpidem',
  '멜라토닌':'Melatonin','서카딘':'Melatonin',
  // 기분안정·항정신병
  '리튬':'Lithium','리시움':'Lithium',
  '퀘티아핀':'Quetiapine','세로퀄':'Quetiapine',
  '아리피프라졸':'Aripiprazole','아빌리파이':'Aripiprazole',
  '올란자핀':'Olanzapine','자이프렉사':'Olanzapine',
  '리스페리돈':'Risperidone','리스페달':'Risperidone',
  '지프라시돈':'Ziprasidone','젤독스':'Ziprasidone',
  '클로자핀':'Clozapine','클로자릴':'Clozapine',
  '팔리페리돈':'Paliperidone','인베가':'Paliperidone',
  // ADHD
  '아토목세틴':'Atomoxetine','스트라테라':'Atomoxetine',
  '메틸페니데이트':'Methylphenidate','콘서타':'Concerta','리탈린':'Methylphenidate',
  // 소화기
  '오메프라졸':'Omeprazole','로섹':'Omeprazole',
  '판토프라졸':'Pantoprazole','판토록':'Pantoprazole',
  '에소메프라졸':'Esomeprazole','넥시움':'Esomeprazole',
  '란소프라졸':'Lansoprazole','란스톤':'Lansoprazole',
  '라베프라졸':'Rabeprazole','파리에트':'Rabeprazole',
  '파모티딘':'Famotidine','가스터':'Famotidine',
  '라니티딘':'Ranitidine','잔탁':'Ranitidine',
  '메토클로프라미드':'Metoclopramide','맥페란':'Metoclopramide',
  '돔페리돈':'Domperidone','모틸리움':'Domperidone',
  '온단세트론':'Ondansetron','조프란':'Ondansetron',
  '수크랄페이트':'Sucralfate','아루사루민':'Sucralfate',
  '비사코딜':'Bisacodyl','둘코락스':'Bisacodyl',
  // 당뇨
  '메트포르민':'Metformin','글루코파지':'Metformin',
  '글리메피리드':'Glimepiride','아마릴':'Glimepiride',
  '시타글립틴':'Sitagliptin','자누비아':'Sitagliptin',
  '엠파글리플로진':'Empagliflozin','자디앙':'Empagliflozin',
  '다파글리플로진':'Dapagliflozin','포시가':'Dapagliflozin',
  '리나글립틴':'Linagliptin','트라젠타':'Linagliptin',
  '피오글리타존':'Pioglitazone','액토스':'Pioglitazone',
  '인슐린글라진':'Insulin Glargine','란투스':'Insulin Glargine',
  // 고지혈·통풍
  '아토르바스타틴':'Atorvastatin','리피토':'Atorvastatin',
  '로수바스타틴':'Rosuvastatin','크레스토':'Rosuvastatin',
  '에제티미브':'Ezetimibe','젤티아':'Ezetimibe',
  '페노피브레이트':'Fenofibrate','리판틸':'Fenofibrate',
  '페북소스타트':'Febuxostat','페브릭':'Febuxostat',
  '알로퓨리놀':'Allopurinol','자일로릭':'Allopurinol',
  '콜히친':'Colchicine','콜킨':'Colchicine',
  // 알레르기·호흡기
  '세티리진':'Cetirizine','지르텍':'Cetirizine',
  '펙소페나딘':'Fexofenadine','알레그라':'Fexofenadine',
  '로라타딘':'Loratadine','클라리틴':'Loratadine',
  '레보세티리진':'Levocetirizine','씽잘':'Levocetirizine',
  '몬테루카스트':'Montelukast','싱귤레어':'Montelukast',
  '플루티카손':'Fluticasone','플릭소타이드':'Fluticasone',
  '부데소니드':'Budesonide','풀미코트':'Budesonide',
  '살부타몰':'Salbutamol','벤토린':'Salbutamol',
  '포모테롤':'Formoterol','옥시스':'Formoterol',
  '티오트로피움':'Tiotropium','스피리바':'Tiotropium',
  // 항생제
  '아목시실린':'Amoxicillin','아모크라':'Amoxicillin',
  '아목시실린/클라불란산':'Augmentin','오구멘틴':'Augmentin',
  '아지스로마이신':'Azithromycin','지스로맥스':'Azithromycin',
  '세팔렉신':'Cephalexin','세포렌':'Cephalexin',
  '세푸록심':'Cefuroxime','진나트':'Cefuroxime',
  '세프포독심':'Cefpodoxime','바난':'Cefpodoxime',
  '레보플록사신':'Levofloxacin','크라비트':'Levofloxacin',
  '시프로플록사신':'Ciprofloxacin','시프로바이':'Ciprofloxacin',
  '메트로니다졸':'Metronidazole','후라시닐':'Metronidazole',
  '독시사이클린':'Doxycycline','독시콕시':'Doxycycline',
  '클린다마이신':'Clindamycin','달라신':'Clindamycin',
  // 피부·기타
  '타크로리무스':'Tacrolimus','프로토픽':'Tacrolimus',
  '하이드로코르티손':'Hydrocortisone',
  '프레드니손':'Prednisone',
  '프레드니솔론':'Prednisolone','솔론도':'Prednisolone',
  '덱사메타손':'Dexamethasone','덱사론':'Dexamethasone',
  '메틸프레드니솔론':'Methylprednisolone','메드론':'Methylprednisolone',
  // 골다공증·관절
  '알렌드로네이트':'Alendronate','포사맥스':'Alendronate',
  '리세드로네이트':'Risedronate','악토넬':'Risedronate',
  '데노수맙':'Denosumab','프롤리아':'Denosumab',
  '메토트렉세이트':'Methotrexate','유트렉세이트':'Methotrexate',
  '하이드록시클로로퀸':'Hydroxychloroquine','플라퀘닐':'Hydroxychloroquine',
  '설파살라진':'Sulfasalazine','살라조피린':'Sulfasalazine',
  '레플루노마이드':'Leflunomide','아라바':'Leflunomide',
  '아달리무맙':'Adalimumab','휴미라':'Adalimumab',
  // 영양제·보충제
  '엽산':'Folic Acid','폴산':'Folic Acid',
  '철분':'Iron','페럼':'Iron',
  '비타민D':'Vitamin D','칼시페롤':'Vitamin D',
  '비타민B12':'Vitamin B12','메코발라민':'Mecobalamin',
  '마그네슘':'Magnesium',
  '아르기닌':'Arginine',
  '코엔자임큐텐':'CoQ10','코큐텐':'CoQ10',
  '실리마린':'Silymarin','카르시밀':'Silymarin',
  '오메가3':'Omega-3','EPA/DHA':'Omega-3',
  '칼슘':'Calcium','칼시트리올':'Calcitriol',
  '아연':'Zinc','징크':'Zinc',
  '프로바이오틱스':'Probiotics','유산균':'Probiotics',
  '멜라토닌':'Melatonin',
};

// Expand autocomplete to include both names
function expandDrugSearch(query) {
  const q=query.toLowerCase();
  const extra=[];
  Object.entries(_DRUG_NAMES).forEach(([kr,en])=>{
    if(kr.toLowerCase().includes(q)||en.toLowerCase().includes(q)) {
      extra.push(kr,en);
    }
  });
  return [...new Set(extra)];
}

// DISEASE DB + CONDITION-MED MAPPING (ICD-10 based)
// ═══════════════════════════════════════════════════════════════
const _AC_DISEASES = [
  // 신경
  '편두통','만성편두통','난치성만성편두통','긴장형두통','군발두통','삼차신경통',
  '대후두신경통','약물과용두통','외상후두통','경추성두통',
  '뇌전증','파킨슨병','다발성경화증','길랭-바레증후군','말초신경병증',
  // 정신
  '주요우울장애(MDD)','기분부전장애','양극성장애','산후우울증',
  '범불안장애(GAD)','공황장애','사회불안장애','강박장애(OCD)','PTSD',
  'ADHD','불면증','수면무호흡증','하지불안증후군',
  // 심혈관
  '고혈압','저혈압','기립성저혈압','관상동맥질환','심부전','심방세동',
  '승모판탈출증','대동맥판막질환','심근병증',
  // 내분비·대사
  '제1형당뇨','제2형당뇨','갑상선기능저하증','갑상선기능항진증',
  '이상지질혈증','고요산혈증','통풍','쿠싱증후군','부신기능부전',
  // 소화기
  '위식도역류질환(GERD)','기능성소화불량','과민성장증후군(IBS)','크론병','궤양성대장염',
  '위궤양','십이지장궤양','지방간','간경변','담석증','췌장염',
  // 호흡기
  '천식','만성폐쇄성폐질환(COPD)','알레르기비염','만성부비동염','폐렴','기관지확장증',
  // 근골격
  '류마티스관절염','골관절염','강직성척추염','섬유근통','골다공증',
  '추간판탈출증','척추관협착증','회전근개파열','오십견','손목터널증후군',
  // 비뇨생식
  '과민성방광','요로감염','전립선비대증','다낭성난소증후군(PCOS)',
  '자궁내막증','자궁근종','월경전증후군(PMS)',
  // 피부
  '아토피피부염','건선','두드러기','탈모(원형)','여드름','대상포진',
  // 안과·이비인후
  '녹내장','백내장','안구건조증','메니에르병','이석증(BPPV)','돌발성난청',
  // 감염
  '결핵','B형간염','C형간염','HIV',
  // 자가면역
  '전신성홍반루푸스(SLE)','쇼그렌증후군','베체트병','혈관염',
  // 혈액·종양
  '빈혈','철결핍빈혈','혈소판감소증','림프종','백혈병',
  // 기타
  '만성피로증후군','Vasovagal syncope','레이노현상','섬유근통',
];

// 질환 → 관련 약품 매핑 (자주 사용되는 약)
// ── 질환 유형 분류 ──
const _DISEASE_TYPES = {
  chronic:'만성',acute:'급성',preventive:'예방/관리'
};
const _DISEASE_TYPE_MAP = {
  // 만성 (C)
  '편두통':'chronic','만성편두통':'chronic','난치성만성편두통':'chronic','긴장형두통':'chronic',
  '주요우울장애':'chronic','MDD':'chronic','우울장애':'chronic','기분부전장애':'chronic',
  '범불안장애':'chronic','GAD':'chronic','강박장애':'chronic','OCD':'chronic',
  '공황장애':'chronic','사회불안장애':'chronic','PTSD':'chronic',
  'ADHD':'chronic','양극성장애':'chronic','불면증':'chronic','조현병':'chronic',
  '고혈압':'chronic','이상지질혈증':'chronic','제2형당뇨':'chronic','제1형당뇨':'chronic',
  '갑상선기능저하증':'chronic','갑상선기능항진증':'chronic',
  '천식':'chronic','만성폐쇄성폐질환':'chronic','COPD':'chronic',
  '위식도역류질환':'chronic','GERD':'chronic','과민성장증후군':'chronic','IBS':'chronic',
  '크론병':'chronic','궤양성대장염':'chronic','기능성소화불량':'chronic',
  '류마티스관절염':'chronic','골관절염':'chronic','강직성척추염':'chronic','섬유근통':'chronic','골다공증':'chronic',
  '과민성방광':'chronic','전립선비대증':'chronic','다낭성난소증후군':'chronic','PCOS':'chronic',
  '알레르기비염':'chronic','아토피피부염':'chronic','건선':'chronic',
  '자율신경실조':'chronic','실신(Vasovagal)':'chronic',
  '간질환':'chronic','지방간':'chronic','간경변':'chronic','만성신장질환':'chronic','CKD':'chronic',
  '심방세동':'chronic','심부전':'chronic','관상동맥질환':'chronic',
  '파킨슨병':'chronic','알츠하이머':'chronic','간질':'chronic','뇌전증':'chronic',
  '루푸스':'chronic','쇼그렌증후군':'chronic','베체트병':'chronic',
  // 급성 (A)
  '군발두통':'acute',
  '감기':'acute','급성상기도감염':'acute','독감':'acute','인플루엔자':'acute','코로나19':'acute',
  '급성기관지염':'acute','폐렴':'acute','부비동염':'acute','급성부비동염':'acute',
  '급성위장염':'acute','장염':'acute','식중독':'acute',
  '요로감염':'acute','UTI':'acute','방광염':'acute','신우신염':'acute',
  '중이염':'acute','외이도염':'acute','결막염':'acute','다래끼':'acute',
  '대상포진':'acute','연조직염':'acute','봉와직염':'acute','농양':'acute',
  '급성통풍':'acute','통풍':'acute',
  '요추염좌':'acute','근막통증증후군':'acute','급성요통':'acute','늑골골절':'acute',
  '편도염':'acute','인두염':'acute','후두염':'acute',
  '두드러기':'acute','접촉성피부염':'acute','벌레물림':'acute',
  '치질':'acute','항문열상':'acute',
  '구내염':'acute','치수염':'acute',
  '눈다래끼':'acute','각막염':'acute',
  // 예방/관리 (P)
  '엽산보충':'preventive','철분보충':'preventive','임신준비영양':'preventive','남성가임력':'preventive',
  '예방접종':'preventive','건강검진':'preventive','영양관리':'preventive',
  '체중관리':'preventive','운동관리':'preventive','수면관리':'preventive',
};

const _DISEASE_MEDS = {
  // ── 두통 ──
  '편두통':['AAP 500mg','Loxoprofen','Naproxen','Sumatriptan','Rizatriptan','Propranolol','Topiramate','Amitriptyline','Valproate','Botox','CGRP mAb(Aimovig/Ajovy/Emgality)','Rimegepant','Atogepant'],
  '만성편두통':['Botox','CGRP mAb(Aimovig/Ajovy/Emgality)','Topiramate','Amitriptyline','Propranolol','Venlafaxine','Valproate','Atogepant','Rimegepant','GON block'],
  '난치성만성편두통':['Botox','CGRP mAb','GON block','SPG block','Propranolol','Topiramate','Venlafaxine','Atogepant','Rimegepant','신경자극술(VNS/ONS)'],
  '긴장형두통':['AAP 500mg','Ibuprofen','Naproxen','Amitriptyline','물리치료','스트레스 관리'],
  '군발두통':['산소요법(O2 15L)','Sumatriptan SC','Verapamil','Galcanezumab','Lithium','Prednisone 단기'],
  // ── 정신과 ──
  '주요우울장애':['Escitalopram','Sertraline','Fluoxetine','Venlafaxine','Duloxetine','Bupropion','Mirtazapine','Desvenlafaxine','Vortioxetine','Aripiprazole 보조','CBT'],
  'MDD':['Escitalopram','Sertraline','Fluoxetine','Venlafaxine','Duloxetine','Bupropion','Mirtazapine','Desvenlafaxine','Vortioxetine','Aripiprazole 보조','CBT'],
  '우울장애':['Escitalopram','Sertraline','Fluoxetine','Venlafaxine','Duloxetine','Bupropion','Mirtazapine','CBT'],
  '기분부전장애':['Sertraline','Escitalopram','Duloxetine','Bupropion','CBT'],
  '범불안장애':['Escitalopram','Sertraline','Venlafaxine','Duloxetine','Buspirone','Pregabalin','Hydroxyzine','CBT'],
  'GAD':['Escitalopram','Sertraline','Venlafaxine','Duloxetine','Buspirone','Pregabalin','CBT'],
  '강박장애':['Fluoxetine 고용량','Sertraline','Escitalopram','Fluvoxamine','Clomipramine','ERP치료'],
  'OCD':['Fluoxetine 고용량','Sertraline','Escitalopram','Fluvoxamine','Clomipramine','ERP치료'],
  '공황장애':['Escitalopram','Sertraline','Venlafaxine','Paroxetine','Clonazepam 단기','CBT'],
  '사회불안장애':['Escitalopram','Sertraline','Venlafaxine','Paroxetine','Pregabalin','CBT'],
  'PTSD':['Sertraline','Paroxetine','Venlafaxine','Prazosin(악몽)','CPT','EMDR'],
  'ADHD':['Methylphenidate','Concerta','Atomoxetine','Bupropion','Lisdexamfetamine','Clonidine'],
  '양극성장애':['Lithium','Valproate','Lamotrigine','Quetiapine','Aripiprazole','Olanzapine','Carbamazepine'],
  '불면증':['Zolpidem','Trazodone','Melatonin','Lemborexant','Suvorexant','CBT-I','수면위생'],
  '조현병':['Risperidone','Olanzapine','Aripiprazole','Quetiapine','Paliperidone LAI','Clozapine'],
  // ── 심혈관 ──
  '고혈압':['Amlodipine','Losartan','Candesartan','Valsartan','Lisinopril','Hydrochlorothiazide','Indapamide','Bisoprolol'],
  '이상지질혈증':['Atorvastatin','Rosuvastatin','Ezetimibe','Fenofibrate','Pitavastatin','Icosapent ethyl'],
  '심방세동':['Apixaban','Rivaroxaban','Edoxaban','Warfarin','Bisoprolol','Flecainide','Amiodarone'],
  '심부전':['Sacubitril/Valsartan','Empagliflozin','Bisoprolol','Carvedilol','Spironolactone','Furosemide'],
  '관상동맥질환':['Aspirin','Clopidogrel','Atorvastatin','Bisoprolol','ACE억제제','Nitroglycerin'],
  // ── 내분비/대사 ──
  '제2형당뇨':['Metformin','Empagliflozin','Dapagliflozin','Sitagliptin','Semaglutide','Liraglutide','Glimepiride','Insulin'],
  '제1형당뇨':['Insulin(속효성)','Insulin(지속형)','CGM','인슐린펌프'],
  '갑상선기능저하증':['Levothyroxine(Synthroid)'],
  '갑상선기능항진증':['Methimazole','PTU','방사성요오드','Propranolol'],
  '통풍':['Febuxostat','Allopurinol','Colchicine','Naproxen','Prednisolone 단기'],
  '빈혈':['철분제(Ferrous sulfate)','엽산','비타민B12','EPO'],
  // ── 소화기 ──
  '위식도역류질환':['Esomeprazole','Pantoprazole','Rabeprazole','Famotidine','Alginate(가비스콘)','생활습관교정'],
  'GERD':['Esomeprazole','Pantoprazole','Rabeprazole','Famotidine','Alginate(가비스콘)'],
  '과민성장증후군':['Trimebutine','Pinaverium','Rifaximin','Probiotics','저포드맵식이','Amitriptyline 저용량'],
  'IBS':['Trimebutine','Pinaverium','Rifaximin','Probiotics','저포드맵식이'],
  '기능성소화불량':['Mosapride','Itopride','Pantoprazole','Trimebutine'],
  '위궤양':['Esomeprazole','Pantoprazole','Sucralfate','제균치료(H.pylori)'],
  '크론병':['Mesalazine','Azathioprine','Infliximab','Adalimumab','Budesonide','Methotrexate'],
  '궤양성대장염':['Mesalazine','Prednisolone','Azathioprine','Infliximab','Vedolizumab','Tofacitinib'],
  '지방간':['체중감량','운동','Vitamin E','Pioglitazone','Semaglutide'],
  '간경변':['이뇨제(Spironolactone+Furosemide)','Lactulose','Rifaximin','Propranolol','간이식 평가'],
  '담석증':['Ursodeoxycholic acid','복강경 담낭절제술','진통제'],
  // ── 호흡기/알레르기 ──
  '천식':['Salbutamol','Fluticasone+Salmeterol','Budesonide+Formoterol','Montelukast','Tiotropium'],
  '만성폐쇄성폐질환':['Tiotropium','Umeclidinium+Vilanterol','Budesonide+Formoterol','Roflumilast','산소치료'],
  'COPD':['Tiotropium','Umeclidinium+Vilanterol','Budesonide+Formoterol','Roflumilast'],
  '알레르기비염':['Cetirizine','Fexofenadine','Loratadine','Montelukast','Fluticasone 비강스프레이','Azelastine 비강'],
  '아토피피부염':['보습제','Hydrocortisone','Tacrolimus','Pimecrolimus','Dupilumab','Cetirizine'],
  '건선':['보습제','Calcipotriol','Betamethasone','Methotrexate','Adalimumab','Secukinumab','Apremilast'],
  // ── 근골격 ──
  '골관절염':['AAP 500mg','Loxoprofen','Celecoxib','Naproxen','관절강내HA주사','Duloxetine','물리치료'],
  '골다공증':['Alendronate','Risedronate','Denosumab','칼슘+비타민D','Romosozumab'],
  '류마티스관절염':['Methotrexate','Hydroxychloroquine','Sulfasalazine','Leflunomide','Adalimumab','Tofacitinib'],
  '강직성척추염':['Celecoxib','Naproxen','Adalimumab','Secukinumab','Sulfasalazine','물리치료'],
  '섬유근통':['Duloxetine','Pregabalin','Amitriptyline','Milnacipran','운동치료'],
  '추간판탈출증':['AAP','NSAIDs','Pregabalin','근이완제','경막외주사','물리치료'],
  '오십견':['NSAIDs','관절강내스테로이드','물리치료','도수치료'],
  // ── 비뇨기/생식 ──
  '과민성방광':['Solifenacin','Mirabegron','Tolterodine','Oxybutynin'],
  '전립선비대증':['Tamsulosin','Dutasteride','Finasteride','Silodosin'],
  '다낭성난소증후군':['Metformin','경구피임약','Spironolactone','Letrozole','생활습관교정'],
  'PCOS':['Metformin','경구피임약','Spironolactone','Letrozole','생활습관교정'],
  '요로감염':['Cephalexin','Cefpodoxime','Ciprofloxacin','Nitrofurantoin','수분섭취'],
  'UTI':['Cephalexin','Cefpodoxime','Ciprofloxacin','Nitrofurantoin'],
  // ── 신경과 ──
  '뇌전증':['Levetiracetam','Valproate','Lamotrigine','Carbamazepine','Oxcarbazepine','Topiramate'],
  '파킨슨병':['Levodopa/Carbidopa','Pramipexole','Ropinirole','Rasagiline','Amantadine','Entacapone'],
  '알츠하이머':['Donepezil','Rivastigmine','Memantine','Galantamine','Lecanemab'],
  // ── 자율신경 ──
  '실신(Vasovagal)':['수분·염분 섭취','탄력스타킹','Midodrine','Fludrocortisone','기립훈련'],
  '자율신경실조':['수분·염분 섭취','Propranolol 저용량','Midodrine','Fludrocortisone','규칙 운동'],
  // ── 자가면역 ──
  '루푸스':['Hydroxychloroquine','Prednisolone','Azathioprine','Mycophenolate','Belimumab'],
  '쇼그렌증후군':['인공눈물','Pilocarpine','Hydroxychloroquine','Cyclosporine 점안'],
  '베체트병':['Colchicine','Prednisolone','Azathioprine','Apremilast','Adalimumab'],
  // ── 만성신장 ──
  '만성신장질환':['ACE억제제/ARB','SGLT2억제제','이뇨제','탄산칼슘','EPO','저단백식이'],
  'CKD':['ACE억제제/ARB','SGLT2억제제','이뇨제','탄산칼슘','EPO'],
  // ── 급성 감염 ──
  '감기':['AAP','Pseudoephedrine','Dextromethorphan','항히스타민','수분/휴식'],
  '급성상기도감염':['AAP','Ibuprofen','항히스타민','진해거담제','수분/휴식'],
  '독감':['Oseltamivir(타미플루)','AAP','수분/휴식'],
  '인플루엔자':['Oseltamivir(타미플루)','Baloxavir','AAP','수분/휴식'],
  '코로나19':['Nirmatrelvir/Ritonavir(팍스로비드)','AAP','Dexamethasone(중증)','수분/휴식'],
  '폐렴':['Amoxicillin/Clavulanate','Levofloxacin','Azithromycin','Ceftriaxone'],
  '급성기관지염':['Dextromethorphan','Ambroxol','AAP','항생제(세균성)'],
  '부비동염':['Amoxicillin/Clavulanate','비강스프레이','AAP','식염수세척'],
  '급성위장염':['수분/전해질보충','Loperamide','Probiotics','금식→경구식이'],
  '장염':['수분/전해질보충','Loperamide','Probiotics'],
  '식중독':['수분보충','정장제','항생제(필요시)'],
  '편도염':['Amoxicillin','Penicillin V','AAP','NSAIDs'],
  '중이염':['Amoxicillin','Amoxicillin/Clavulanate','AAP','경과관찰'],
  '대상포진':['Valacyclovir','Famciclovir','AAP','Pregabalin(신경통)','리도카인패치'],
  '결막염':['인공눈물','항생제점안(세균성)','항히스타민점안(알러지성)','냉찜질'],
  '두드러기':['Cetirizine','Fexofenadine','Loratadine','Prednisolone 단기','Epinephrine(아나필락시스)'],
  '접촉성피부염':['Hydrocortisone','보습제','항히스타민','원인물질 회피'],
  '구내염':['Triamcinolone 구강연고','Chlorhexidine 가글','AAP','비타민B'],
  '치질':['좌욕','Diosmin+Hesperidin','연고(리도카인)','변비예방','수술(중증)'],
  '급성요통':['AAP','NSAIDs','근이완제','물리치료','활동유지'],
  '근막통증증후군':['NSAIDs','Tizanidine','트리거포인트주사','물리치료','스트레칭'],
  // ── 예방/관리 ──
  '엽산보충':['엽산 0.4~0.8mg','활성엽산(5-MTHF)','종합비타민'],
  '철분보충':['Ferrous sulfate','Ferrous fumarate','비타민C 병용'],
  '임신준비영양':['엽산','철분','비타민D','CoQ10','오메가3 DHA','아연'],
  '남성가임력':['CoQ10','L-아르기닌','아연','셀레늄','비타민E','L-카르니틴'],
  '예방접종':['독감백신','폐렴구균','대상포진(Shingrix)','코로나19','Tdap','HPV'],
  '영양관리':['종합비타민','비타민D','오메가3','칼슘','마그네슘','Probiotics'],
  '체중관리':['식이조절','운동처방','GLP-1(Semaglutide)','Orlistat','행동치료'],
};

// ═══════════════════════════════════════════════════════════════
// AUTOCOMPLETE DATABASE (common Korean meds/symptoms/treatments)
// ═══════════════════════════════════════════════════════════════
const _AC_MEDS = [
  'AAP 500mg','AAP 325mg','타이레놀','이부프로펜','Loxoprofen','나프록센','아스피린',
  'Sumatriptan','Rizatriptan','Zolmitriptan','Ergotamine',
  'Metoclopramide','Domperidone','Ondansetron',
  'Amitriptyline','Nortriptyline','Venlafaxine','Duloxetine','Escitalopram','Sertraline','Fluoxetine','Bupropion',
  'Propranolol','Atenolol','Candesartan','Lisinopril',
  'Topiramate','Valproate','Gabapentin','Pregabalin','Lamotrigine',
  'Galcanezumab','Erenumab','Fremanezumab','Atogepant','Rimegepant',
  'Prednisone','Dexamethasone','Methylprednisolone',
  'Hydroxyzine','Lorazepam','Alprazolam','Zolpidem',
  'Lithium','Quetiapine','Aripiprazole','Olanzapine','Risperidone',
  'Atomoxetine','Methylphenidate','Concerta',
  'Desvenlafaxine','Mirtazapine','Trazodone',
  'Amlodipine','Losartan','Metformin','Febuxostat','Colchicine',
  'Omeprazole','Pantoprazole','Famotidine',
  'Cetirizine','Montelukast','Fexofenadine',
  'Amoxicillin','Augmentin','Azithromycin','Cephalexin','Levofloxacin',
  '엽산','철분','비타민D','비타민B12','아르기닌','CoQ10','실리마린','멀티비타민','마그네슘','오메가3',
];

// ICD-10 R챕터(증상/징후) + 임상 기반 확장 (~200개)
const _AC_SYMPTOMS = [
  // 두통·신경
  '두통','편두통','긴장형두통','군발두통','후두부통증','안와통','관자놀이통증',
  '경추성두통','외상후두통','약물과용두통','찌르는두통','기침두통','운동유발두통',
  '벼락두통','기립성두통','수면두통','삼차신경통','대후두신경통',
  // 소화기 (ICD-10 R10-R19)
  '구역','구토','어지러움','현기증','이명',
  '복통','상복부통','하복부통','명치통','옆구리통',
  '설사','변비','소화불량','속쓰림','역류','복부팽만','가스','식욕부진',
  '식욕증가','삼킴곤란','연하통','혈변','흑색변','점액변',
  // 감각·시각 (ICD-10 H53-H54)
  '빛과민','소리과민','냄새과민','후각과민','촉각과민',
  '시야장애','전조증상','섬광암점','복시','시력저하','눈앞번쩍임',
  '귀울림','청력저하','귀먹먹함',
  // 신경·근골격 (ICD-10 M,G)
  '손발저림','감각이상','근력약화','경직','떨림','손떨림',
  '안면마비','안면경련','근육경련','근긴장','뻣뻣함',
  '관절통','근육통','요통','경부통','어깨통','무릎통','고관절통','손목통',
  '관절부종','관절강직','골통','좌골신경통',
  // 정신·수면 (ICD-10 F,G47)
  '불안','우울감','무기력','과민','공황','강박사고','불면','과수면',
  '수면분절','조기각성','입면지연','악몽','수면마비','야경증',
  '집중력저하','기억력저하','사고지연','말막힘','언어출력지연',
  '감정불안정','무감동','해리감','비현실감','자해사고',
  '식욕변화','체중변화','체중감소','체중증가',
  // 심혈관 (ICD-10 R00-R09,I)
  '심계항진','흉통','호흡곤란','실신전조','실신',
  '빈맥','서맥','부정맥','혈압상승','혈압저하','기립성저혈압',
  '안면홍조','식은땀','야간발한','부종','하지부종','안면부종',
  // 호흡기 (ICD-10 R04-R06,J)
  '기침','가래','객혈','인후통','코막힘','콧물','재채기',
  '호흡곤란','천명','흉부압박감','코피',
  // 비뇨생식 (ICD-10 R30-R39,N)
  '빈뇨','잔뇨감','배뇨통','절박뇨','야뇨','혈뇨','요실금',
  '월경통','월경불순','질출혈','성교통','발기부전',
  // 피부 (ICD-10 R20-R23,L)
  '발진','두드러기','가려움','건조','탈모','여드름','색소침착',
  '멍','자반','상처지연','궤양',
  // 전신 (ICD-10 R50-R69)
  '발열','오한','피로','권태감','야간발열','체온저하',
  '림프절종대','체중감소','다한증','탈수','부종',
  // 눈·귀·코 (ICD-10 H)
  '안구건조','충혈','눈물흘림','눈부심','안구통',
  '귀통증','이루','현훈','균형장애',
  // 자율신경
  '동공확대','동공축소','안면창백','피부변색','사지냉감','레이노현상',
  '위배출지연','장운동저하','기립불내증',
];

// 임상 기반 치료/시술/검사 확장 (~120개)
const _AC_TREATMENTS = [
  // 신경차단·주사
  'GON block','LON block','SPG block','성상신경절 차단','경막외 주사',
  '관절강내 주사','건초내 주사','근막통증 주사','트리거포인트 주사',
  'Botox 주사','CGRP mAb 주사','PRP 주사','프롤로치료','스테로이드 주사',
  '척추 경막외 주사','미추 차단','천장관절 주사','가지신경 차단',
  '내측지 차단','고주파 열응고술','펄스 고주파','신경근 차단',
  // 물리치료·재활
  '물리치료','도수치료','운동치료','작업치료','언어치료',
  '전기자극치료(TENS)','초음파치료','레이저치료','온열치료','냉각치료',
  '견인치료','수치료','충격파치료','테이핑',
  // 정신건강
  'CBT','EMDR','DBT','ACT','명상','마음챙김','이완요법',
  '바이오피드백','뉴로피드백','정신과 상담','심리검사','MMPI',
  '인지재활','집단치료','가족치료','미술치료','음악치료',
  // 영상·검사
  'MRI','CT','PET-CT','X-ray','초음파','도플러초음파','경두개도플러(TCD)',
  '혈액검사','CBC','LFT','TFT','CRP','ESR','HbA1c','지질검사',
  '소변검사','대변검사','소변배양',
  '심전도','홀터','운동부하검사','심초음파',
  '뇌파(EEG)','근전도(EMG)','신경전도검사(NCS)','수면다원검사(PSG)',
  '폐기능검사','위내시경','대장내시경','복부초음파',
  '골밀도검사(DEXA)','갑상선초음파','유방초음파','전립선초음파',
  '정액검사','호르몬검사','알레르기검사','피부단자검사',
  // 수술·시술
  '수술','시술','내시경시술','조직검사','세침흡인검사(FNA)',
  '관절경','척추성형술','디스크제거술','감압술','유합술',
  '레이저시술','냉동치료','고주파시술',
  // 예방·건강관리
  '예방접종','독감백신','코로나백신','건강검진','암검진',
  '영양상담','운동처방','수면위생교육','금연상담','금주상담',
];

// 식약처 공공데이터 API (의약품 검색)
const _DRUG_API_KEY = 'e2e1a2277cd6d60badb822ca35b3a1147b0d13dacec0f374b8684b85af4dac78';
const _DRUG_API_URL = 'https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService07/getDrugPrdtPrmsnInq07';
let _drugSearchTimer = null;
let _drugCache = {}; // cache recent searches

async function searchDrugAPI(query) {
  if (query.length < 2) return [];
  if (_drugCache[query]) return _drugCache[query];

  // Determine if query is English or Korean
  const isEng = /^[a-zA-Z]/.test(query);
  const results = [];

  try {
    // Search by product name (한글)
    const url1 = `${_DRUG_API_URL}?serviceKey=${_DRUG_API_KEY}&item_name=${encodeURIComponent(query)}&type=json&numOfRows=10`;
    const r1 = await fetch(url1, {signal: AbortSignal.timeout(3000)});
    if (r1.ok) {
      const d1 = await r1.json();
      (d1?.body?.items || []).forEach(item => {
        if (item.ITEM_NAME) results.push(item.ITEM_NAME);
        // Learn ingredient mapping dynamically
        if (item.ITEM_NAME && item.MAIN_ITEM_INGR) {
          const ingr = item.MAIN_ITEM_INGR.split(',')[0].trim();
          if (ingr && !_DRUG_NAMES[item.ITEM_NAME.split('(')[0].trim()]) {
            _DRUG_NAMES[item.ITEM_NAME.split('(')[0].trim()] = ingr;
          }
        }
      });
    }
  } catch(e) {}

  // If English query, also search by ingredient name via bilingual mapping
  if (isEng) {
    try {
      // Find Korean product names matching this English ingredient
      const mapped = [];
      Object.entries(_DRUG_NAMES).forEach(([kr, en]) => {
        if (en.toLowerCase().includes(query.toLowerCase())) mapped.push(kr);
      });
      // Search API with first Korean match to find more products
      if (mapped.length && results.length < 5) {
        const url2 = `${_DRUG_API_URL}?serviceKey=${_DRUG_API_KEY}&item_name=${encodeURIComponent(mapped[0])}&type=json&numOfRows=5`;
        const r2 = await fetch(url2, {signal: AbortSignal.timeout(3000)});
        if (r2.ok) {
          const d2 = await r2.json();
          (d2?.body?.items || []).forEach(item => {
            if (item.ITEM_NAME) results.push(item.ITEM_NAME);
          });
        }
      }
      // Also add the English names directly
      mapped.forEach(kr => results.push(kr));
    } catch(e) {}
  }

  const unique = [...new Set(results)].slice(0, 12);
  _drugCache[query] = unique;
  return unique;
}

function setupAutocomplete(inputId, list, useAPI=false) {
  const dlId = inputId + '-dl';
  let dl = document.getElementById(dlId);
  if (!dl) {
    dl = document.createElement('datalist');
    dl.id = dlId;
    document.body.appendChild(dl);
  }
  const input = document.getElementById(inputId);
  if (input) {
    if (input._acSetup) return; // prevent duplicate listeners
    input._acSetup = true;
    input.setAttribute('list', dlId);
    input.addEventListener('input', () => {
      const q = input.value.toLowerCase().trim();
      if (q.length < 1) { dl.innerHTML = ''; return; }
      // Local matches + bilingual drug names
      const bilingualHits = useAPI ? expandDrugSearch(q) : [];
      const localMatches = [...new Set([...list.filter(item => item.toLowerCase().includes(q)), ...bilingualHits])].slice(0, 10);
      dl.innerHTML = localMatches.map(m => {
        const en=_DRUG_NAMES[m]; // show English name if available
        return `<option value="${m}"${en?' label="'+en+'"':''}>`;
      }).join('');
      // API search for meds (debounced)
      if (useAPI && q.length >= 2) {
        clearTimeout(_drugSearchTimer);
        _drugSearchTimer = setTimeout(async () => {
          const apiResults = await searchDrugAPI(q);
          if (apiResults.length) {
            const combined = [...new Set([...localMatches, ...apiResults])].slice(0, 15);
            dl.innerHTML = combined.map(m => {
              const en=_DRUG_NAMES[m]||_DRUG_NAMES[m.split('(')[0].trim()];
              return `<option value="${m}"${en?' label="'+en+'"':''}>`;
            }).join('');
          }
        }, 300);
      }
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// DATA MIGRATION (medications string → medsList array)
// ═══════════════════════════════════════════════════════════════
// v9.0 부위명 마이그레이션: 미간→이마, 눈썹위→눈썹부위
function migrateSiteNames() {
  const renames={'미간':'이마','눈썹위':'눈썹부위'};
  let count=0;
  Object.values(S.domainState).forEach(ds=>{
    (ds.logData||[]).forEach(l=>{
      if(!l.sites?.length) return;
      l.sites=l.sites.map(s=>{
        for(const [from,to] of Object.entries(renames)){
          if(s.includes(from)){count++;return s.replace(from,to);}
        }
        return s;
      });
    });
  });
  if(count) {
    showToast(`📦 ${count}건 부위명 마이그레이션 완료 (미간→이마, 눈썹위→눈썹부위)`);
    // Save
    try { saveMaster().catch(()=>{}); saveLogData().catch(()=>{}); } catch(e){}
  }
}

function migrateConditions() {
  let migrated=0;
  Object.values(S.domainState).forEach(ds=>{
    if(!ds.master?.conditions) return;
    ds.master.conditions.forEach(c=>{
      if(!c.medsList && c.medications) {
        c.medsList=c.medications.split(',').map(s=>s.trim()).filter(Boolean);
        migrated++;
      }
    });
  });
  if(migrated) showToast(`📦 ${migrated}건 약물 데이터 마이그레이션 완료`);
}

// ═══════════════════════════════════════════════════════════════
// DRUG CHANGE BEFORE/AFTER COMPARISON
// ═══════════════════════════════════════════════════════════════
function compareDrugChange(condIdx, domainId) {
  const ds=S.domainState[domainId||S.currentDomain];
  const cond=ds?.master?.conditions?.[condIdx];
  if(!cond?.drugChangeDate) {
    showToast('약물 변경 날짜가 기록되지 않았습니다.');
    return;
  }
  const changeDate=cond.drugChangeDate;
  const logs=ds.logData||[];
  const lc=DC().logConfig;

  const before=logs.filter(l=>{
    const d=l.datetime.slice(0,10);
    const diff=Math.round((new Date(changeDate)-new Date(d))/86400000);
    return diff>0&&diff<=14;
  });
  const after=logs.filter(l=>{
    const d=l.datetime.slice(0,10);
    const diff=Math.round((new Date(d)-new Date(changeDate))/86400000);
    return diff>=0&&diff<=14;
  });

  const avgNrs=(arr)=>{const v=arr.filter(l=>l.nrs>=0).map(l=>l.nrs);return v.length?(v.reduce((a,b)=>a+b,0)/v.length).toFixed(1):'-';};
  const medDays=(arr)=>new Set(arr.filter(l=>(l.meds||[]).length).map(l=>l.datetime.slice(0,10))).size;
  const maxNrs=(arr)=>{const v=arr.filter(l=>l.nrs>=0).map(l=>l.nrs);return v.length?Math.max(...v):'-';};

  const bAvg=avgNrs(before),aAvg=avgNrs(after);
  const bMax=maxNrs(before),aMax=maxNrs(after);
  const bMed=medDays(before),aMed=medDays(after);

  const arrow=(b,a)=>{if(b==='-'||a==='-')return'→';const diff=a-b;return diff>0?'↑':'↓';};
  const color=(b,a,lower)=>{if(b==='-'||a==='-')return'var(--mu)';return (lower?(a<b):(a>b))?'var(--gr)':'var(--re)';};

  showConfirmModal(`📊 ${esc(cond.name)} — 약물 변경 전후 비교`,
    `<p style="font-size:.78rem;color:var(--mu);margin-bottom:10px">변경일: ${changeDate} | 전후 14일 비교</p>
    <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:8px;text-align:center">
      <div style="font-size:.72rem;font-weight:700;color:var(--mu)">변경 전 (${before.length}건)</div>
      <div></div>
      <div style="font-size:.72rem;font-weight:700;color:var(--mu)">변경 후 (${after.length}건)</div>
      ${[['평균 NRS',bAvg,aAvg,true],['최대 NRS',bMax,aMax,true],['투약일',bMed,aMed,true]].map(([label,b,a,lower])=>`
        <div style="padding:8px;background:var(--sf2);border-radius:6px"><div style="font-size:.65rem;color:var(--mu)">${label}</div><div style="font-size:1.1rem;font-weight:700">${b}</div></div>
        <div style="display:flex;align-items:center;font-size:1.2rem;color:${color(b,a,lower)}">${arrow(b,a)}</div>
        <div style="padding:8px;background:var(--sf2);border-radius:6px"><div style="font-size:.65rem;color:var(--mu)">${label}</div><div style="font-size:1.1rem;font-weight:700">${a}</div></div>
      `).join('')}
    </div>`,
    [{label:'닫기',action:closeConfirmModal,primary:true}]
  );
}

// ═══════════════════════════════════════════════════════════════
// #6 약물 상호작용 체커
// ═══════════════════════════════════════════════════════════════
const _DRUG_INTERACTIONS = [
  // [약물A, 약물B, 위험도(high/moderate/low), 설명]
  ['Aspirin','Ibuprofen','high','위장관 출혈 위험 증가, NSAID 병용 금기'],
  ['Aspirin','Naproxen','high','위장관 출혈 위험 증가, NSAID 병용 금기'],
  ['Aspirin','Warfarin','high','출혈 위험 대폭 증가'],
  ['Ibuprofen','Naproxen','high','NSAID 중복, 위장관/신장 부작용 증가'],
  ['Warfarin','Ibuprofen','high','출혈 위험 증가'],
  ['Warfarin','Naproxen','high','출혈 위험 증가'],
  ['Warfarin','Acetaminophen','moderate','고용량 시 INR 상승 가능'],
  ['SSRI','Triptan','moderate','세로토닌 증후군 위험'],
  ['Venlafaxine','Triptan','moderate','세로토닌 증후군 위험'],
  ['Duloxetine','Triptan','moderate','세로토닌 증후군 위험'],
  ['Fluoxetine','Tramadol','high','세로토닌 증후군 위험'],
  ['Sertraline','Tramadol','high','세로토닌 증후군 위험'],
  ['Methotrexate','Ibuprofen','high','메토트렉세이트 독성 증가'],
  ['Methotrexate','Naproxen','high','메토트렉세이트 독성 증가'],
  ['ACE inhibitor','Potassium','moderate','고칼륨혈증 위험'],
  ['Lithium','Ibuprofen','high','리튬 독성 증가'],
  ['Lithium','Naproxen','high','리튬 독성 증가'],
  ['Propranolol','Rizatriptan','moderate','리자트립탄 혈중 농도 상승'],
  ['Topiramate','Valproate','moderate','암모니아 수치 상승, 저체온'],
  ['Valproate','Lamotrigine','moderate','라모트리진 혈중 농도 상승, 발진 위험'],
  ['Ergotamine','Triptan','high','혈관 수축 과다, 24시간 간격 필요'],
  ['MAO inhibitor','SSRI','high','세로토닌 증후군 위험, 병용 금기'],
  ['MAO inhibitor','Triptan','high','세로토닌 증후군 위험'],
  ['Carbamazepine','Oral contraceptive','moderate','피임 효과 감소'],
  ['Pregabalin','Opioid','high','CNS 억제 과다, 호흡 억제 위험'],
];

function _normalizeDrugName(name) {
  // 3단계 파이프라인 (Rule #37): ①사전 매칭 → ②규칙 기반 → ③AI 검증(비동기 별도)
  const upper=(name||'').trim();
  if(!upper) return '';
  // ① 사전 빠른 매칭
  if(_DRUG_NAMES[upper]) return _DRUG_NAMES[upper];
  // ② 규칙 기반: 대소문자 무시 + 제형/용량 접미사 제거
  const lower=upper.toLowerCase();
  for(const [ko,en] of Object.entries(_DRUG_NAMES)) {
    if(ko.toLowerCase()===lower||en.toLowerCase()===lower) return en;
  }
  // 제형/용량 접미사 제거 후 재시도 (XR, XL, SR, ER, 숫자mg 등)
  const stripped=upper.replace(/\s*(XR|XL|SR|ER|IR|CR|LA|qAM|qPM|qHS)\s*$/i,'').replace(/\s*\d+(\.\d+)?\s*(mg|mcg|μg|g|ml|mL)\s*$/i,'').trim();
  if(stripped!==upper){
    if(_DRUG_NAMES[stripped]) return _DRUG_NAMES[stripped];
    const sl=stripped.toLowerCase();
    for(const [ko,en] of Object.entries(_DRUG_NAMES)) {
      if(ko.toLowerCase()===sl||en.toLowerCase()===sl) return en;
    }
  }
  // 동적 사전 캐시 확인 (AI가 이전에 매핑한 항목)
  const dm=typeof DM==='function'?DM():null;
  const dynMap=dm?.settings?.customDrugMappings||{};
  if(dynMap[lower]) return dynMap[lower];
  // 매칭 실패: 원본 반환 (AI 비동기 검증은 별도 호출)
  return upper.charAt(0).toUpperCase()+upper.slice(1).toLowerCase();
}

// AI 약물명 검증 (비동기) — 미매칭 약물에 대해 호출
async function aiVerifyDrugName(drugName) {
  const aiId=S.keys?.gemini?'gemini':(S.keys?.claude?'claude':(S.keys?.gpt?'gpt':null));
  if(!aiId) return null;
  const prompt='약물명 "'+drugName+'"의 국제 일반명(INN/generic name)을 영문으로 알려주세요. JSON: {"generic":"영문일반명","korean":"한글명"} JSON만.';
  try{
    const resp=await callAI(aiId,'약물명 정규화 전문가. JSON만.',prompt);
    const m=resp.match(/\{[\s\S]*?\}/);
    if(!m) return null;
    const result=JSON.parse(m[0]);
    if(result.generic){
      // 동적 사전 확장: 클라우드에 저장
      const dm=DM();
      if(dm){
        if(!dm.settings) dm.settings={};
        if(!dm.settings.customDrugMappings) dm.settings.customDrugMappings={};
        dm.settings.customDrugMappings[drugName.toLowerCase()]=result.generic;
        if(result.korean) dm.settings.customDrugMappings[result.korean.toLowerCase()]=result.generic;
        await saveMaster();
      }
      return result.generic;
    }
  }catch(e){console.warn('AI drug name verify failed:',e);}
  return null;
}

function checkDrugInteractions() {
  // Collect active meds from all user domains
  const currentUser=DC().user;
  const activeMeds=new Set();
  Object.entries(S.domainState).forEach(([domainId,ds])=>{
    const dd=DOMAINS[domainId];
    if(!dd||dd.user!==currentUser||!ds.master) return;
    (ds.master.conditions||[]).forEach(c=>{
      if(c.status==='active'&&c.medsList?.length) {
        c.medsList.forEach(m=>activeMeds.add(_normalizeDrugName(m)));
      }
    });
  });

  const medsArr=[...activeMeds].filter(Boolean);
  if(medsArr.length<2) return [];

  const warnings=[];
  for(const [a,b,severity,desc] of _DRUG_INTERACTIONS) {
    const aLower=a.toLowerCase(), bLower=b.toLowerCase();
    const hasA=medsArr.some(m=>m.toLowerCase().includes(aLower));
    const hasB=medsArr.some(m=>m.toLowerCase().includes(bLower));
    if(hasA&&hasB) {
      warnings.push({drugA:a,drugB:b,severity,desc});
    }
  }
  return warnings;
}

function renderDrugInteractionWarning() {
  const warnings=checkDrugInteractions();
  if(!warnings.length) return '';
  const severityIcon={high:'🔴',moderate:'🟡',low:'🟢'};
  const severityLabel={high:'위험',moderate:'주의',low:'참고'};
  const items=warnings.map(w=>`
    <div class="drug-interaction-warn" style="border-left:3px solid ${w.severity==='high'?'#ef4444':'#f59e0b'}">
      <div style="display:flex;align-items:center;gap:6px">
        <span>${severityIcon[w.severity]||'⚠️'}</span>
        <span style="font-weight:600;font-size:.8rem">${esc(w.drugA)} + ${esc(w.drugB)}</span>
        <span class="badge ${w.severity==='high'?'badge-red':'badge-orange'}">${severityLabel[w.severity]}</span>
      </div>
      <div style="font-size:.75rem;color:var(--mu);margin-top:3px">${esc(w.desc)}</div>
    </div>`).join('');

  return `<div class="card" style="border-color:${warnings.some(w=>w.severity==='high')?'#ef4444':'#f59e0b'}">
    <div class="card-title">⚠️ 약물 상호작용 경고 <span class="badge badge-red">${warnings.length}건</span></div>
    ${items}
    <div style="font-size:.65rem;color:var(--mu);margin-top:8px;padding:4px 8px;background:var(--sf2);border-radius:4px">※ 참고용입니다. 실제 투약 변경은 반드시 담당 의사와 상의하세요.</div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════════
// 💉 VACCINATION TRACKING
// ═══════════════════════════════════════════════════════════════

// 질병관리청(KDCA) 성인 예방접종 가이드 2024 + 대한산부인과학회 임신 전/중 접종 기준
const _VACCINE_DB = {
  // ── 임신 관련 ──
  'MMR':{label:'MMR (홍역·풍진·유행성이하선염)',doses:2,booster:0,interval:'4주',pregnancy:true,cat:'임신',live:true,
    doseLabels:['1차','2차'],note:'풍진 항체 음성 시 필수. 생백신 → 임신 중 금기, 접종 후 4주 피임',src:'KDCA/산부인과학회'},
  'Varicella':{label:'수두',doses:2,booster:0,interval:'4-8주',pregnancy:true,cat:'임신',live:true,
    doseLabels:['1차','2차'],note:'항체 음성 시 2회. 생백신 → 임신 중 금기, 접종 후 4주 피임',src:'KDCA'},
  'Tdap':{label:'Tdap (파상풍·디프테리아·백일해)',doses:1,booster:1,interval:'매 임신 27-36주',pregnancy:true,cat:'임신',
    doseLabels:['기본'],boosterLabels:['부스터 (매 임신)'],note:'매 임신마다 1회. 신생아 백일해 수동면역',src:'KDCA/ACIP'},
  'HepB':{label:'B형간염',doses:3,booster:1,interval:'0-1-6개월',pregnancy:true,cat:'임신',
    doseLabels:['1차(0개월)','2차(1개월)','3차(6개월)'],boosterLabels:['부스터 (항체 저하 시)'],note:'HBsAg·HBsAb 음성 시 3회. 임신 중 접종 가능',src:'KDCA'},
  'Flu':{label:'인플루엔자',doses:1,booster:1,interval:'매년 10-12월',pregnancy:true,cat:'임신',
    doseLabels:['접종'],boosterLabels:['연간 재접종'],note:'매년. 불활성화 → 임신 중 안전. 비강분무형 금기',src:'KDCA/WHO'},
  'COVID19':{label:'COVID-19',doses:2,booster:2,interval:'제조사별',pregnancy:true,cat:'임신',
    doseLabels:['1차','2차'],boosterLabels:['부스터 1차','부스터 2차'],note:'mRNA 권장. 임신 중 접종 가능',src:'KDCA/WHO'},
  'HPV':{label:'HPV (인유두종바이러스)',doses:2,booster:0,interval:'6-12개월',pregnancy:true,cat:'임신',
    doseLabels:['1차','2차'],note:'26세 이하 권장. 임신 전 완료',src:'KDCA/ACIP'},
  // ── 성인 기본 ──
  'HepA':{label:'A형간염',doses:2,booster:0,interval:'6-12개월',pregnancy:false,cat:'성인기본',
    doseLabels:['1차','2차'],note:'1970년 이후 출생, 항체 음성 시 2회',src:'KDCA'},
  'Td':{label:'Td (파상풍·디프테리아)',doses:1,booster:1,interval:'10년마다',pregnancy:false,cat:'성인기본',
    doseLabels:['기본'],boosterLabels:['10년 추가접종'],note:'매 10년 추가접종. 1회는 Tdap으로 대체 권장',src:'KDCA'},
  'JapEnc_inact':{label:'일본뇌염 (불활성화)',doses:2,booster:1,interval:'7-30일',pregnancy:false,cat:'성인기본',
    doseLabels:['1차','2차'],boosterLabels:['추가접종'],note:'면역력 없는 성인. 고위험지역 거주/여행 시',src:'KDCA'},
  'JapEnc_live':{label:'일본뇌염 (생백신)',doses:1,booster:0,interval:'-',pregnancy:false,cat:'성인기본',live:true,
    doseLabels:['접종'],note:'1회 접종. 면역저하자·임산부 금기',src:'KDCA'},
  // ── 50세+ / 65세+ ──
  'Zoster_RZV':{label:'대상포진 (Shingrix, 재조합)',doses:2,booster:0,interval:'2-6개월',pregnancy:false,cat:'50세이상',
    doseLabels:['1차','2차'],note:'50세 이상 2회. 기존 생백신 접종자도 가능',src:'KDCA/ACIP'},
  'PCV20':{label:'폐렴구균 (PCV20)',doses:1,booster:0,interval:'-',pregnancy:false,cat:'65세이상',
    doseLabels:['접종'],note:'65세 이상 1회. PCV15+PPSV23 대체 가능',src:'ACIP 2023'},
  'PPSV23':{label:'폐렴구균 (PPSV23)',doses:1,booster:1,interval:'-',pregnancy:false,cat:'고위험',
    doseLabels:['접종'],boosterLabels:['재접종 (5년 후)'],note:'65세 이상 또는 만성질환/면역저하',src:'KDCA'},
  // ── 고위험군 ──
  'Meningococcal':{label:'수막구균',doses:1,booster:1,interval:'고위험 시 5년마다',pregnancy:false,cat:'고위험',
    doseLabels:['접종'],boosterLabels:['재접종 (5년)'],note:'군입대, 유행지역 여행, 무비장, 보체결핍',src:'KDCA'},
  'Hib':{label:'Hib (b형 헤모필루스)',doses:1,booster:0,interval:'-',pregnancy:false,cat:'고위험',
    doseLabels:['접종'],note:'무비장, 조혈모세포이식 등',src:'KDCA'},
};
const _VACCINE_CATS=[
  {id:'임신',label:'🤰 임신 관련',color:'#be185d'},
  {id:'성인기본',label:'👤 성인 기본',color:'#2563eb'},
  {id:'50세이상',label:'50+ 연령별',color:'#7c3aed'},
  {id:'65세이상',label:'65+ 연령별',color:'#7c3aed'},
  {id:'고위험',label:'⚠️ 고위험군',color:'#dc2626'},
];

function renderVaccinationSection(){
  const dc=DC();const domId=S.currentDomain;
  if(!domId.includes('health'))return '';
  const m=DM();if(!m)return '';
  if(!m.vaccinations)m.vaccinations=[];
  const recs=m.vaccinations;
  const who=dc.user;

  const byVax={};
  recs.forEach(r=>{if(!byVax[r.vaccine])byVax[r.vaccine]=[];byVax[r.vaccine].push(r);});

  // 카테고리별 그룹 렌더
  const catSections=_VACCINE_CATS.map(cat=>{
    const entries=Object.entries(_VACCINE_DB).filter(([k,v])=>v.cat===cat.id);
    if(!entries.length)return '';
    const catDone=entries.filter(([k,v])=>{const d=byVax[k]||[];const nr=d.some(r=>r.status==='non-responder');return !nr&&(d.length>=v.doses||d.some(r=>r.status==='antibody'||r.status==='childhood'));}).length;
    const rows=entries.map(([key,vax])=>{
      const doses=byVax[key]||[];
      const baseDoses=doses.filter(d=>!d.isBooster);
      const boosters=doses.filter(d=>d.isBooster);
      const hasAntibody=doses.some(d=>d.status==='antibody');
      const hasChildhood=doses.some(d=>d.status==='childhood');
      const hasNR=doses.some(d=>d.status==='non-responder');
      const baseComplete=!hasNR&&(baseDoses.length>=vax.doses||hasAntibody||hasChildhood);
      const statusIcon=hasNR?'⚠️':hasAntibody?'🛡️':hasChildhood?'👶':baseComplete?'✅':'⬜';
      const liveTag=vax.live?'<span style="font-size:.5rem;background:#fef2f2;color:#dc2626;padding:1px 4px;border-radius:4px">생백신</span>':'';
      const boosterTag=vax.booster?'<span style="font-size:.5rem;background:#faf5ff;color:#7c3aed;padding:1px 4px;border-radius:4px">부스터 '+(vax.booster>1?vax.booster+'회':'')+'</span>':'';
      const totalSlots=vax.doses+(vax.booster||0);
      const progress=!hasAntibody&&!hasChildhood&&totalSlots>1?`<div style="display:flex;gap:2px;margin:2px 0 0 28px">${
        Array.from({length:vax.doses},(_,i)=>`<div style="width:${Math.min(32,100/totalSlots)}px;height:4px;border-radius:2px;background:${i<baseDoses.length?'#10b981':'var(--bd)'}"></div>`).join('')
      }${vax.booster?'<div style="width:1px;height:4px;background:var(--mu2);margin:0 1px"></div>'+Array.from({length:vax.booster},(_,i)=>`<div style="width:${Math.min(32,100/totalSlots)}px;height:4px;border-radius:2px;background:${i<boosters.length?'#8b5cf6':'var(--bd)'}"></div>`).join(''):''}
      </div>`:'';
      const doseHtml=doses.map(d=>{
        const dLabel=d.status==='non-responder'?'⚠️ 항체 미형성':d.isBooster?'💪 '+(d.doseKey||'부스터'):d.status==='antibody'?'🛡️ 항체 확인':d.status==='childhood'?'👶 어릴 때 접종 (전체)':d.doseKey==='all'?'전체 완료':(d.doseKey||'접종').replace('dose-','').replace(/(\d+)/,'$1차');
        const dateStr=d.date==='미상'?'날짜 미상':d.date;
        const stColor=d.status==='non-responder'?'#dc2626':d.isBooster?'#8b5cf6':d.status==='antibody'?'#15803d':d.status==='childhood'?'#1d4ed8':'#10b981';
        return `<div style="font-size:.62rem;color:var(--mu);padding:1px 0 1px 28px;display:flex;align-items:center;gap:4px">
          <span style="color:${stColor}">●</span> ${dLabel} <span style="color:var(--mu2)">${dateStr}</span>${d.memo?' <span style="color:var(--mu2)">'+esc(d.memo)+'</span>':''}
          <button onclick="_deleteVax(${d.id})" style="font-size:.5rem;background:none;border:none;color:var(--mu2);cursor:pointer;padding:0 2px">✕</button>
        </div>`;
      }).join('');
      const countLabel=hasNR?'⚠️ 미형성':hasAntibody||hasChildhood?'완료':baseDoses.length+'/'+vax.doses+(boosters.length?' +💪'+boosters.length:'');
      return `<div style="padding:5px 0">
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:.78rem;width:22px;text-align:center">${statusIcon}</span>
          <div style="flex:1;min-width:0"><div style="font-size:.73rem;font-weight:${baseComplete?'400':'500'};color:${baseComplete?'var(--mu)':'var(--ink)'}${baseComplete?';text-decoration:line-through':''}">${vax.label} ${liveTag} ${boosterTag}</div>
          <div style="font-size:.58rem;color:var(--mu2)">${esc(vax.note)}</div></div>
          <span style="font-size:.58rem;color:var(--mu);font-family:var(--mono);white-space:nowrap">${countLabel}</span>
          <button onclick="_openVaxForm('${key}')" style="font-size:.56rem;padding:2px 6px;border:1px solid ${cat.color};border-radius:4px;background:none;color:${cat.color};cursor:pointer;font-family:var(--font);white-space:nowrap">+ 기록</button>
        </div>${progress}${doseHtml}
      </div>`;
    }).join('');
    return `<div style="margin-bottom:12px">
      <div style="display:flex;align-items:center;gap:6px;padding:6px 0;margin-bottom:2px;border-bottom:2px solid ${cat.color}20">
        <span style="font-size:.72rem;font-weight:700;color:${cat.color}">${cat.label}</span>
        <span style="font-size:.58rem;color:var(--mu);font-family:var(--mono)">${catDone}/${entries.length}</span>
      </div>${rows}
    </div>`;
  }).join('');

  // 기타 접종
  const customVax=recs.filter(r=>!_VACCINE_DB[r.vaccine]);
  const customByName={};
  customVax.forEach(r=>{if(!customByName[r.vaccine])customByName[r.vaccine]=[];customByName[r.vaccine].push(r);});
  const customHtml=Object.keys(customByName).length?`<div style="margin-bottom:8px">
    <div style="font-size:.72rem;font-weight:700;color:var(--mu);padding:4px 0;border-bottom:2px solid var(--bd)20">📋 기타 접종</div>
    ${Object.entries(customByName).map(([name,doses])=>`<div style="padding:5px 0;display:flex;align-items:center;gap:6px">
      <span style="font-size:.78rem">💉</span>
      <span style="font-size:.73rem;font-weight:500;flex:1">${esc(name)}</span>
      <span style="font-size:.58rem;color:var(--mu)">${doses.length}회</span>
      <button onclick="_openVaxForm('','${esc(name)}')" style="font-size:.56rem;padding:2px 6px;border:1px solid var(--ac);border-radius:4px;background:none;color:var(--ac);cursor:pointer;font-family:var(--font)">+ 접종</button>
    </div>
    ${doses.map((d,i)=>`<div style="font-size:.62rem;color:var(--mu);padding:1px 0 1px 28px"><span style="color:#10b981">●</span> ${d.date}${d.memo?' — '+esc(d.memo):''} <button onclick="_deleteVax(${d.id})" style="font-size:.5rem;background:none;border:none;color:var(--mu2);cursor:pointer">✕</button></div>`).join('')}
    `).join('')}</div>`:'';

  const totalVax=Object.keys(_VACCINE_DB).length;
  const doneCount=Object.entries(_VACCINE_DB).filter(([k,v])=>{const d=byVax[k]||[];const nr=d.some(r=>r.status==='non-responder');return !nr&&(d.length>=v.doses||d.some(r=>r.status==='antibody'||r.status==='childhood'));}).length;
  const pct=Math.round(doneCount/totalVax*100);

  return `<div class="card">
    <div class="card-title">💉 예방접종 — ${esc(who)}
      <span class="badge" style="background:${pct>=80?'#dcfce7':pct>=50?'#fef3c7':'#fee2e2'};color:${pct>=80?'#15803d':pct>=50?'#92400e':'#dc2626'}">${doneCount}/${totalVax} (${pct}%)</span>
    </div>
    <div style="height:6px;background:var(--bd);border-radius:3px;margin-bottom:12px;overflow:hidden">
      <div style="width:${pct}%;height:100%;background:${pct>=80?'#10b981':pct>=50?'#f59e0b':'#ef4444'};border-radius:3px;transition:width .3s"></div>
    </div>
    <div style="font-size:.6rem;color:var(--mu2);margin-bottom:10px;padding:4px 8px;background:var(--sf2);border-radius:4px">
      출처: 질병관리청(KDCA) 성인 예방접종 가이드 2024, 대한산부인과학회
    </div>
    ${catSections}${customHtml}
    <div style="display:flex;gap:6px;margin-top:8px;padding-top:8px;border-top:1px solid var(--bd)">
      <input id="vax-custom-name" list="vax-ac-list" class="dx-form-input" placeholder="기타 접종 검색/추가" style="flex:1;font-size:.78rem">
      <datalist id="vax-ac-list">${Object.values(_VACCINE_DB).map(v=>'<option value="'+esc(v.label)+'">').join('')}</datalist>
      <button onclick="_addCustomVax()" style="font-size:.72rem;padding:5px 12px;border:1.5px solid var(--ac);border-radius:6px;background:none;color:var(--ac);cursor:pointer;font-family:var(--font)">+ 추가</button>
    </div>
  </div>`;
}

function _openVaxForm(vaxKey,customName){
  const vax=_VACCINE_DB[vaxKey];
  const name=vax?vax.label:(customName||vaxKey);
  const m=DM();if(!m)return;
  const existing=(m.vaccinations||[]).filter(v=>v.vaccine===(vaxKey||customName));
  // 차수 옵션 생성
  const allLabels=[];
  if(vax){
    (vax.doseLabels||[]).forEach((l,i)=>allLabels.push({value:'dose-'+(i+1),label:'기본 '+l,type:'dose'}));
    (vax.boosterLabels||[]).forEach((l,i)=>allLabels.push({value:'booster-'+(i+1),label:'💪 '+l,type:'booster'}));
  }
  const doseOpts=allLabels.length?allLabels.map(d=>{
    const done=existing.find(e=>e.doseKey===d.value);
    return `<option value="${d.value}"${done?' disabled':''}>${d.label}${done?' (기록됨)':''}</option>`;
  }).join(''):'<option value="dose-1">접종</option>';
  showConfirmModal('💉 접종 기록 — '+esc(name),
    `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
      <div><div class="dx-form-label">상태 *</div>
        <select id="vax-status" class="dx-form-input" style="width:170px" onchange="_vaxStatusChange()">
          <option value="done">💉 접종 완료</option>
          <option value="childhood">👶 어릴 때 접종 (전체 완료)</option>
          <option value="antibody">🛡️ 항체 확인됨 (접종 불필요)</option>
          <option value="non-responder">⚠️ 항체 미형성 (non-responder)</option>
        </select>
      </div>
      <div id="vax-dose-row"><div class="dx-form-label">차수</div>
        <select id="vax-dose" class="dx-form-input" style="width:170px">${doseOpts}</select>
      </div>
    </div>
    <div id="vax-date-row">
      <div class="dx-form-label" id="vax-date-label">접종일</div>
      <div style="display:flex;gap:6px;align-items:center">
        <select id="vax-date-mode" class="dx-form-input" style="width:130px" onchange="_vaxDateModeChange()">
          <option value="exact">정확한 날짜</option>
          <option value="year">연도만 기억</option>
          <option value="unknown">날짜 모름</option>
        </select>
        <input type="date" id="vax-date" class="dx-form-input" value="${kstToday()}" style="width:150px">
        <input type="number" id="vax-year" class="dx-form-input" placeholder="예: 2020" min="1950" max="2030" style="width:90px;display:none">
      </div>
    </div>
    <div id="vax-nonresp-note" style="display:none;margin-top:4px;padding:6px 8px;background:#fef3c7;border-radius:6px;font-size:.65rem;color:#92400e">
      ⚠️ 3회 기본접종 + 1회 부스터 후에도 HBsAb 음성인 경우. 추가 3회 재접종 또는 고용량 접종 고려.
    </div>
    <div style="margin-top:6px"><div class="dx-form-label">메모</div><input type="text" id="vax-memo" class="dx-form-input" placeholder="병원, 로트번호, 항체검사일 등" style="width:100%"></div>`,
    [{label:'💾 저장',action:async()=>{
      const status=document.getElementById('vax-status')?.value||'done';
      const isAll=status==='childhood'||status==='antibody';
      const doseKey=isAll?'all':(document.getElementById('vax-dose')?.value||'dose-1');
      const dateMode=document.getElementById('vax-date-mode')?.value||'exact';
      let date='';
      if(status==='antibody'){date=dateMode==='exact'?(document.getElementById('vax-date')?.value||kstToday()):dateMode==='year'?(document.getElementById('vax-year')?.value||'')+'년':'미상';}
      else if(dateMode==='exact'){date=document.getElementById('vax-date')?.value||'';if(!date&&status==='done'){showToast('날짜를 입력하세요');return;}}
      else if(dateMode==='year'){date=(document.getElementById('vax-year')?.value||'')+'년';}
      else{date='미상';}
      const memo=document.getElementById('vax-memo')?.value?.trim()||'';
      const mm=DM();if(!mm)return;
      if(!mm.vaccinations)mm.vaccinations=[];
      const isBooster=doseKey.startsWith('booster');
      const isNR=status==='non-responder';
      mm.vaccinations.push({id:Date.now(),vaccine:vaxKey||customName,label:name,
        date:date||'미상',memo,who:DC().user,pregnancy:vax?.pregnancy||false,
        status,doseKey:isNR?'non-responder':doseKey,isBooster,complete:!isNR});
      await saveMaster();closeConfirmModal();showToast('✅ 저장됨');renderView('meds');
    },primary:true}]);
}
function _vaxStatusChange(){
  const s=document.getElementById('vax-status')?.value;
  const doseRow=document.getElementById('vax-dose-row');
  const dateLabel=document.getElementById('vax-date-label');
  const nrNote=document.getElementById('vax-nonresp-note');
  if(nrNote)nrNote.style.display=s==='non-responder'?'':'none';
  if(s==='antibody'){
    if(doseRow)doseRow.style.display='none';
    if(dateLabel)dateLabel.textContent='확인일';
  }else if(s==='childhood'){
    if(doseRow)doseRow.style.display='none';
    document.getElementById('vax-date-mode').value='unknown';_vaxDateModeChange();
  }else if(s==='non-responder'){
    if(doseRow)doseRow.style.display='none';
    if(dateLabel)dateLabel.textContent='확인일';
  }else{
    if(doseRow)doseRow.style.display='';
    if(dateLabel)dateLabel.textContent='접종일';
  }
}
function _vaxDateModeChange(){
  const mode=document.getElementById('vax-date-mode')?.value;
  const dateEl=document.getElementById('vax-date');
  const yearEl=document.getElementById('vax-year');
  if(mode==='exact'){dateEl.style.display='';yearEl.style.display='none';}
  else if(mode==='year'){dateEl.style.display='none';yearEl.style.display='';}
  else{dateEl.style.display='none';yearEl.style.display='none';}
}

// ── 검사결과 항체 → 예방접종 자동 연동 ──
// 검사 키 → 백신 매핑 (항체 양성 시 접종 완료로 기록)
const _ANTIBODY_VAX_MAP={
  'HBsAb':{vaccine:'HepB',posThreshold:10,label:'B형간염 항체'},
  'HBs Ab':{vaccine:'HepB',posThreshold:10,label:'B형간염 항체'},
  'Anti-HBs':{vaccine:'HepB',posThreshold:10,label:'B형간염 항체'},
  'HAV IgG':{vaccine:'HepA',posKeyword:'Positive',label:'A형간염 항체'},
  'HAV Ab':{vaccine:'HepA',posKeyword:'Positive',label:'A형간염 항체'},
  'Rubella IgG':{vaccine:'MMR',posThreshold:8,label:'풍진 항체'},
  'Rubella Ab':{vaccine:'MMR',posKeyword:'Positive',label:'풍진 항체'},
  'Varicella IgG':{vaccine:'Varicella',posKeyword:'Positive',label:'수두 항체'},
  'VZV IgG':{vaccine:'Varicella',posKeyword:'Positive',label:'수두 항체'},
};

function _checkAntibodyAndSyncVax(labResult,domainId){
  if(!labResult?.values)return;
  const vals=labResult.values;
  const detected=[];
  // 정규화된 키와 원본 키 모두 체크
  for(const [valKey,valRaw] of Object.entries(vals)){
    // 키에서 괄호 전 이름 추출 (예: "HBs Ab:Positive(67.69)" → "HBs Ab")
    const cleanKey=valKey.replace(/\(.*?\)/g,'').trim();
    for(const [abKey,map] of Object.entries(_ANTIBODY_VAX_MAP)){
      if(!cleanKey.toLowerCase().includes(abKey.toLowerCase())&&!valKey.toLowerCase().includes(abKey.toLowerCase()))continue;
      // 양성 판정
      let isPositive=false;
      const strVal=String(valRaw);
      if(map.posThreshold!==undefined){
        const num=parseFloat(strVal.replace(/[^0-9.]/g,''));
        if(!isNaN(num))isPositive=num>=map.posThreshold;
      }
      if(map.posKeyword){
        isPositive=isPositive||strVal.toLowerCase().includes(map.posKeyword.toLowerCase());
      }
      // Equivocal(경계)는 양성으로 처리 안 함
      if(strVal.toLowerCase().includes('equivocal')||strVal.toLowerCase().includes('경계'))isPositive=false;
      if(strVal.toLowerCase().includes('negative')||strVal.toLowerCase().includes('음성'))isPositive=false;
      if(isPositive){
        detected.push({vaccine:map.vaccine,label:map.label,value:strVal,date:labResult.date,who:labResult.who});
      }
    }
  }
  if(!detected.length)return;
  // 해당 건강관리 도메인에 접종 기록 추가
  const healthDom=labResult.who==='오랑이'?'orangi-health':'bung-health';
  const ds=S.domainState[healthDom];
  if(!ds?.master)return;
  if(!ds.master.vaccinations)ds.master.vaccinations=[];
  const added=[];
  detected.forEach(d=>{
    // 이미 항체 확인 기록 있으면 스킵
    const exists=ds.master.vaccinations.find(v=>v.vaccine===d.vaccine&&v.status==='antibody');
    if(exists)return;
    ds.master.vaccinations.push({
      id:Date.now()+Math.random()*1000|0,vaccine:d.vaccine,label:d.label+' (검사 자동)',
      date:d.date||kstToday(),memo:'🔬 검사결과 자동 연동: '+d.value,
      who:d.who||DC().user,pregnancy:_VACCINE_DB[d.vaccine]?.pregnancy||false,
      status:'antibody',doseKey:'all',complete:true
    });
    added.push(d.label);
  });
  if(added.length){
    saveMasterForDomain(healthDom);
    showToast('💉 항체 확인 → 접종 자동 기록: '+added.join(', '));
  }
}

// 특정 도메인 마스터 저장
async function saveMasterForDomain(domainId){
  const ds=S.domainState[domainId];
  if(!ds?.masterFileId||!ds.master)return;
  try{await driveUpdate(ds.masterFileId,ds.master);}catch(e){console.error('saveMasterForDomain:',e);}
}

async function _deleteVax(vaxId){
  if(!confirm('이 접종 기록을 삭제하시겠습니까?'))return;
  const m=DM();if(!m)return;
  m.vaccinations=(m.vaccinations||[]).filter(v=>v.id!==vaxId);
  await saveMaster();renderView('meds');showToast('🗑 삭제됨');
}

function _addCustomVax(){
  const input=document.getElementById('vax-custom-name');
  const name=input?.value?.trim();
  if(!name){showToast('접종명을 입력하세요');return;}
  _openVaxForm('',name);input.value='';
}

// 임신 관련 접종 — bungruki에서 호출 (양쪽 건강관리 도메인 통합)
function getPregnancyVaccinations(){
  const result=[];
  ['orangi-health','bung-health'].forEach(domId=>{
    const ds=S.domainState[domId];
    if(!ds?.master?.vaccinations)return;
    ds.master.vaccinations.filter(v=>v.pregnancy||(_VACCINE_DB[v.vaccine]?.pregnancy)).forEach(v=>{
      result.push({...v,_domain:domId,_domainLabel:DOMAINS[domId]?.label||domId});
    });
  });
  return result;
}

// ═══════════════════════════════════════════════════════════════
// 약물 복용 주기 설정 (매일/PRN/주간/월간/N일마다)
// ═══════════════════════════════════════════════════════════════
function openMedSchedule(domainId, condIdx, medName) {
  const ds = S.domainState[domainId];
  if (!ds?.master?.conditions?.[condIdx]) return;
  const c = ds.master.conditions[condIdx];
  if (!c.medSchedule) c.medSchedule = {};
  const current = c.medSchedule[medName] || { type: medName.includes('(PRN)') ? 'prn' : 'daily', interval: 1 };
  const opts = [
    { type:'daily', label:'매일' },
    { type:'prn', label:'PRN (필요 시)' },
    { type:'weekly', label:'주 N회' },
    { type:'monthly', label:'월 N회' },
    { type:'days', label:'N일마다' },
  ];
  const optsHtml = opts.map(o => {
    const sel = current.type === o.type;
    return `<button onclick="_setMedSchedType('${o.type}')" id="ms-btn-${o.type}" style="flex:1;padding:8px 4px;font-size:.72rem;border:1.5px solid ${sel?'var(--ac)':'var(--bd)'};border-radius:6px;background:${sel?'var(--ac)':'var(--sf2)'};color:${sel?'#fff':'var(--ink)'};cursor:pointer;font-family:var(--font)">${o.label}</button>`;
  }).join('');
  const needInterval = ['weekly','monthly','days'].includes(current.type);
  showConfirmModal('💊 ' + medName + ' 복용 주기',
    `<div style="font-size:.72rem">
      <div style="display:flex;gap:4px;margin-bottom:8px;flex-wrap:wrap">${optsHtml}</div>
      <div id="ms-interval-row" style="display:${needInterval?'flex':'none'};align-items:center;gap:6px">
        <span>간격:</span>
        <input type="number" id="ms-interval" value="${current.interval||1}" min="1" max="90" style="width:50px;padding:4px;font-size:.75rem;border:1px solid var(--bd);border-radius:4px;text-align:center;font-family:var(--mono)">
        <span id="ms-interval-unit">${current.type==='weekly'?'회/주':current.type==='monthly'?'회/월':'일마다'}</span>
      </div>
    </div>`,
    [{ label:'저장', primary:true, action:async()=>{
      const type = window._msType || current.type;
      const interval = parseInt(document.getElementById('ms-interval')?.value) || 1;
      c.medSchedule[medName] = { type, interval };
      if (ds.masterFileId) await driveUpdate(ds.masterFileId, ds.master);
      cacheToLocal(domainId);
      closeConfirmModal();
      showToast('✅ 주기 설정됨');
      renderView('meds');
    }}, { label:'취소', action:closeConfirmModal }]);
  window._msType = current.type;
}
function _setMedSchedType(type) {
  window._msType = type;
  const units = { weekly:'회/주', monthly:'회/월', days:'일마다' };
  const row = document.getElementById('ms-interval-row');
  const unitEl = document.getElementById('ms-interval-unit');
  if (row) row.style.display = ['weekly','monthly','days'].includes(type) ? 'flex' : 'none';
  if (unitEl) unitEl.textContent = units[type] || '';
  ['daily','prn','weekly','monthly','days'].forEach(t => {
    const btn = document.getElementById('ms-btn-' + t);
    if (btn) { const s=t===type; btn.style.borderColor=s?'var(--ac)':'var(--bd)'; btn.style.background=s?'var(--ac)':'var(--sf2)'; btn.style.color=s?'#fff':'var(--ink)'; }
  });
}
