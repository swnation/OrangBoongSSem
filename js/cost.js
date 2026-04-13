// js/cost.js — 비용 추적 (Phase 2 모듈화)

// ═══════════════════════════════════════════════════════════════
// COST TRACKING
// ═══════════════════════════════════════════════════════════════
function getPriceTable() { return {...DEFAULT_PRICE_TABLE, ...(DM()?.price_table||{})}; }
function calcCost(model,inT,outT) { const p=DEFAULT_PRICE_TABLE[model]||getPriceTable()[model]||{in:0,out:0}; return (inT/1e6)*p.in+(outT/1e6)*p.out; }
function recordUsage(aiId,model,inT,outT,source) {
  const m=DM(); if(!m?.usage_data) return;
  const today=kstToday();
  if(!m.usage_data[today]) m.usage_data[today]={};
  if(!m.usage_data[today][aiId]) m.usage_data[today][aiId]={in:0,out:0,cost:0,model,calls:[]};
  const callCost=calcCost(model,inT,outT);
  m.usage_data[today][aiId].in+=inT; m.usage_data[today][aiId].out+=outT;
  m.usage_data[today][aiId].cost+=callCost; m.usage_data[today][aiId].model=model;
  // 개별 호출 기록 (모델별/시간대별 추적)
  if(!m.usage_data[today][aiId].calls) m.usage_data[today][aiId].calls=[];
  m.usage_data[today][aiId].calls.push({time:kstTime().slice(0,5),model,in:inT,out:outT,cost:callCost,source:source||''});
  try { localStorage.setItem('om_usage_'+S.currentDomain, JSON.stringify(m.usage_data)); } catch(e) {}
}
// 저장된 cost가 0이지만 토큰이 있으면 재계산
function recalcCost(data) {
  if(data.cost>0) return data.cost;
  if((data.in||0)>0||(data.out||0)>0) return calcCost(data.model||'',data.in||0,data.out||0);
  return 0;
}
function getSidebarCostToday() {
  const today=kstToday();
  let total=0;
  // 1) 로드된 도메인의 비용 합산
  const loadedDomains=new Set();
  Object.entries(S.domainState).forEach(([domId,ds])=>{
    const usage=ds.master?.usage_data?.[today];
    if(usage) { total+=Object.values(usage).reduce((s,v)=>s+recalcCost(v),0); loadedDomains.add(domId); }
  });
  // 2) 미로드 도메인은 localStorage 캐시에서 읽기
  Object.keys(DOMAINS).forEach(domId=>{
    if(loadedDomains.has(domId)) return;
    try {
      const cached=localStorage.getItem('om_usage_'+domId);
      if(!cached) return;
      const usageData=JSON.parse(cached);
      const usage=usageData?.[today];
      if(usage) total+=Object.values(usage).reduce((s,v)=>s+recalcCost(v),0);
    } catch(e){}
  });
  return total;
}
function updateSidebarCost() {
  const cost=getSidebarCostToday();
  const el=document.getElementById('sb-today-cost');
  if(el&&cost>0) el.textContent=`$${cost.toFixed(4)}`;
  else if(el) el.textContent='';
}

// ── 간결 출력 공통 규칙 (토큰 절약 최우선) ──
const _CONCISE='서론·인사·결론·수식어 금지. 항목당 1문장. 총 4~6문장 이내. 이전 AI는 [흡수][반박][보완]만. 분석 데이터만 출력.';
