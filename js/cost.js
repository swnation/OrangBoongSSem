// js/cost.js — 비용 추적 (Phase 2 모듈화)

// ═══════════════════════════════════════════════════════════════
// COST TRACKING
// ═══════════════════════════════════════════════════════════════
function getPriceTable() { return {...DEFAULT_PRICE_TABLE, ...(DM()?.price_table||{})}; }
function calcCost(model,inT,outT) { const p=DEFAULT_PRICE_TABLE[model]||getPriceTable()[model]||{in:0,out:0}; return (inT/1e6)*p.in+(outT/1e6)*p.out; }
function recordUsage(aiId,model,inT,outT) {
  const m=DM(); if(!m?.usage_data) return;
  const today=kstToday();
  if(!m.usage_data[today]) m.usage_data[today]={};
  if(!m.usage_data[today][aiId]) m.usage_data[today][aiId]={in:0,out:0,cost:0,model};
  m.usage_data[today][aiId].in+=inT; m.usage_data[today][aiId].out+=outT;
  m.usage_data[today][aiId].cost+=calcCost(model,inT,outT); m.usage_data[today][aiId].model=model;
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
  const usage=DM()?.usage_data?.[today];
  if(!usage) return 0;
  return Object.values(usage).reduce((s,v)=>s+recalcCost(v),0);
}
function updateSidebarCost() {
  const cost=getSidebarCostToday();
  const el=document.getElementById('sb-today-cost');
  if(el&&cost>0) el.textContent=`$${cost.toFixed(4)}`;
  else if(el) el.textContent='';
}

// ── 간결 출력 공통 규칙 (토큰 절약 최우선) ──
const _CONCISE='서론·인사·결론·수식어 금지. 항목당 1문장. 총 4~6문장 이내. 이전 AI는 [흡수][반박][보완]만. 분석 데이터만 출력.';
