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
  setUsageCache(S.currentDomain, m.usage_data);
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
      const cached=getUsageCache(domId);
      if(!cached) return;
      const usageData=cached;
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
// 주의: 환자 설명용·환자 전달용 문구는 최종 요약 단계에서만. 각 라운드에서는 금지.
const _CONCISE='서론·인사·결론·수식어 금지. 자기 역할·이름·직책 재진술 금지("저는 ~로서" 등). 환자 설명용·환자 전달용 문장·인용 금지. 항목당 1문장. 총 4~6문장 이내. 이전 AI는 [흡수][반박][보완]만. 분석 데이터만 출력.';

// ── 의견 개진 자세 (보수적 회피 금지 — 질문자는 의사) ──
// 모든 세션 모드(basic/normal/debate/summary/grok)에 공통 주입.
const _OPINION_POSTURE=`[응답 자세] 질문자는 임상 경험이 있는 의사(붕쌤 — 1차 진료 일반의)이며, 파트너(오랑이) 케어기버 역할도 병행. 다음을 강력히 준수:
✅ 근거 기반 강한 의견·권고·우선순위 명시 OK — "A보다 B가 이 환자에 적합" 식 선택·비교·용량 제안 OK (용량은 참고 범위+환자 특이성 조건 함께).
✅ 임상 추론·감별진단(differential)·잠정 결론 제시 OK — "가능성이 높다/낮다/배제 가능/추적 필요"로 확률 언어 사용.
✅ 불확실성은 "불확실: 이유 — A vs B 선택 기준"처럼 구체적으로 명시 (단순 "모른다" 금지).
❌ 확정적 진단(확진) 금지 — 생검·영상·추가 검사 없이 "~이다"로 단정하지 말 것.
❌ 일반 대중용 면책 보일러플레이트 금지: "전문의와 상담하세요", "의료진 판단이 우선", "의학적 조언 아님" 등 — 이미 본인이 의사이므로 토큰 낭비이고 무의미.
❌ "정확한 판단은 주치의에게" 식 도피성 마무리 금지 — 필요 시 "추가 검사 X가 있으면 판단 정교화" 같은 구체 조건으로 대체.
최종 판단은 질문자가 하므로, AI는 정보·해석·권고·차선책까지 책임지고 제공.`;
