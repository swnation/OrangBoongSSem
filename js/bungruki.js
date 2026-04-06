// js/bungruki.js — 붕룩이 임신 준비 대시보드 (Phase 5 모듈화)

// ── 로컬 날짜 포맷 (UTC 변환 방지) ──
function _localDateStr(d) {
  const y=d.getFullYear();const m=String(d.getMonth()+1).padStart(2,'0');const day=String(d.getDate()).padStart(2,'0');
  return y+'-'+m+'-'+day;
}

// ── 붕룩이 전용 대시보드 (기능 7) ──

// 3소스 임신 약물 안전성 DB: fda(FDA등급), pllr(PLLR 요약), kfda(한국 식약처)
const _PREGNANCY_SAFETY = {
  // ── 진통제/NSAID ──
  'Acetaminophen': { fda:'B', pllr:'전 기간 사용 가능, 장기 고용량 시 태아 간 영향 보고', kfda:'안전', note:'1차 선택 진통제' },
  'Ibuprofen': { fda:'C→D', pllr:'20주 이후 태아동맥관 조기폐쇄·양수과소증 위험', kfda:'2등급', note:'1-2분기 단기만, 3분기 금기' },
  'Naproxen': { fda:'C→D', pllr:'20주 이후 동맥관폐쇄·신장 영향', kfda:'2등급', note:'3분기 금기, NSAID 공통' },
  'Loxoprofen': { fda:'X(3rd)', pllr:'동물실험 태자독성, 3분기 금기', kfda:'금기', note:'가급적 회피' },
  'Diclofenac': { fda:'C→D', pllr:'3분기 동맥관폐쇄 위험', kfda:'2등급', note:'3분기 금기' },
  'Celecoxib': { fda:'C→D', pllr:'3분기 금기, 동맥관폐쇄', kfda:'2등급', note:'COX-2 선택적이나 3분기 회피' },
  'Aspirin': { fda:'C→D', pllr:'저용량(≤150mg) 전자간증 예방 사용, 고용량 금기', kfda:'2등급', note:'저용량은 예방 목적 사용 가능' },
  // ── 편두통 ──
  'Sumatriptan': { fda:'C', pllr:'임신 레지스트리 데이터 기형 증가 미관찰, 제한적', kfda:'2등급', note:'필요 시 단기 사용' },
  'Rizatriptan': { fda:'C', pllr:'동물실험 고용량 기형, 인체 데이터 부족', kfda:'2등급', note:'수마트립탄 우선' },
  'Zolmitriptan': { fda:'C', pllr:'동물실험 배아독성, 인체 데이터 제한적', kfda:'2등급', note:'가급적 회피' },
  'Ergotamine': { fda:'X', pllr:'자궁수축 유발, 태반혈류 감소', kfda:'금기', note:'절대 금기' },
  // ── CGRP 항체 ──
  'Erenumab': { fda:'N/A', pllr:'동물실험 유해 없음, 인체 데이터 없음', kfda:'정보없음', note:'임상 데이터 없음, 비권장' },
  'Fremanezumab': { fda:'N/A', pllr:'동물실험 유해 없음, 인체 데이터 없음', kfda:'정보없음', note:'임신 계획 시 중단 권장' },
  'Galcanezumab': { fda:'N/A', pllr:'동물실험 유해 없음, 인체 데이터 없음', kfda:'정보없음', note:'반감기 길어 사전 중단' },
  // ── 항우울제 ──
  'Escitalopram': { fda:'C', pllr:'3분기 PPHN·신생아 적응증후군 위험', kfda:'2등급', note:'위험-편익 평가 필요' },
  'Sertraline': { fda:'C', pllr:'SSRI 중 임신 데이터 가장 많음, 3분기 PPHN', kfda:'2등급', note:'SSRI 중 상대적 안전' },
  'Fluoxetine': { fda:'C', pllr:'1분기 심장기형 일부 보고, 3분기 PPHN', kfda:'2등급', note:'장기 반감기 주의' },
  'Paroxetine': { fda:'D', pllr:'1분기 심장기형(ASD/VSD) 위험 증가', kfda:'금기', note:'임신 중 금기' },
  'Venlafaxine': { fda:'C', pllr:'신생아 적응 증후군 위험', kfda:'2등급', note:'위험-편익 평가' },
  'Desvenlafaxine': { fda:'C', pllr:'Venlafaxine 활성대사체, 유사 위험', kfda:'2등급', note:'위험-편익 평가' },
  'Duloxetine': { fda:'C', pllr:'3분기 신생아 금단증상', kfda:'2등급', note:'가급적 회피' },
  'Bupropion': { fda:'C', pllr:'심장기형 위험 미증가, 비교적 안전', kfda:'2등급', note:'금연 목적 데이터 있음' },
  'Mirtazapine': { fda:'C', pllr:'제한적 데이터, 조산 위험 일부 보고', kfda:'2등급', note:'SSRI 불가 시 대안' },
  'Amitriptyline': { fda:'C', pllr:'오랜 사용 경험, 대규모 기형 증가 미보고', kfda:'2등급', note:'편두통 예방 목적 저용량 사용' },
  'Nortriptyline': { fda:'C', pllr:'TCA 중 데이터 양호', kfda:'2등급', note:'편두통 예방 대안' },
  // ── 항불안/수면 ──
  'Lorazepam': { fda:'D', pllr:'1분기 구순열 위험 보고(논쟁), 신생아 금단', kfda:'금기', note:'임신 중 회피' },
  'Alprazolam': { fda:'D', pllr:'신생아 금단증후군, 근긴장저하', kfda:'금기', note:'임신 중 회피' },
  'Zolpidem': { fda:'C', pllr:'제한적 데이터, 조산 위험 일부 보고', kfda:'2등급', note:'단기 사용만' },
  'Hydroxyzine': { fda:'C', pllr:'1분기 구개열 보고(구 데이터), 단기 사용', kfda:'2등급', note:'항히스타민계, 필요 시' },
  // ── 기분안정제 ──
  'Lithium': { fda:'D', pllr:'Ebstein anomaly 위험(절대위험 낮음), 임신 시 용량 조절', kfda:'금기', note:'중단 또는 최소 용량' },
  'Valproate': { fda:'X', pllr:'신경관결손(6-10%), IQ 저하, 절대 금기', kfda:'금기', note:'절대 금기' },
  'Carbamazepine': { fda:'D', pllr:'신경관결손 0.5-1%, 엽산 고용량 병용', kfda:'금기', note:'가급적 회피' },
  'Lamotrigine': { fda:'C', pllr:'기분안정제 중 가장 안전, 구순열 미미한 증가', kfda:'2등급', note:'임신 중 용량 모니터링 필수' },
  'Topiramate': { fda:'D', pllr:'구개열 위험 2-3배 증가, 저체중아', kfda:'금기', note:'임신 중 금기' },
  // ── ADHD ──
  'Concerta': { fda:'C', pllr:'Methylphenidate, 대규모 연구 기형 미증가', kfda:'2등급', note:'가급적 회피, 필요 시 상담' },
  'Atomoxetine': { fda:'C', pllr:'동물실험 데이터만', kfda:'2등급', note:'가급적 회피' },
  // ── 항정신병 ──
  'Quetiapine': { fda:'C', pllr:'임신 레지스트리 데이터 축적 중, 체중 증가 주의', kfda:'2등급', note:'비정형 중 비교적 안전' },
  'Olanzapine': { fda:'C', pllr:'임신성 당뇨 위험 증가, 거대아', kfda:'2등급', note:'대사 부작용 주의' },
  'Aripiprazole': { fda:'C', pllr:'제한적 데이터, 동물실험 안전', kfda:'2등급', note:'필요 시 사용' },
  'Haloperidol': { fda:'C', pllr:'오랜 사용 경험, 1분기 사지기형 일부 보고(논쟁)', kfda:'2등급', note:'급성기 필요 시' },
  // ── 소화기 ──
  'Metoclopramide': { fda:'B', pllr:'임신 오심에 광범위 사용, 안전 데이터 풍부', kfda:'안전', note:'입덧 1차 약제' },
  'Ondansetron': { fda:'B', pllr:'1분기 구개열 일부 보고(논쟁), 대체로 안전', kfda:'2등급', note:'심한 입덧 시' },
  'Omeprazole': { fda:'C', pllr:'동물실험 고용량 영향, 인체 대규모 연구 안전', kfda:'2등급', note:'필요 시 사용 가능' },
  'Ranitidine': { fda:'B', pllr:'안전 데이터 풍부(현재 NDMA 이슈로 시판 중단)', kfda:'안전', note:'시판 중단, 파모티딘 대체' },
  'Famotidine': { fda:'B', pllr:'안전 데이터 양호', kfda:'안전', note:'H2차단제 중 1차 선택' },
  // ── 심혈관 ──
  'Propranolol': { fda:'C', pllr:'IUGR 위험, 신생아 저혈당/서맥', kfda:'2등급', note:'편두통 예방, 모니터링 필요' },
  'Labetalol': { fda:'C', pllr:'임신성 고혈압 1차 약제, 광범위 사용', kfda:'안전', note:'임신 고혈압 1차 선택' },
  'Nifedipine': { fda:'C', pllr:'임신성 고혈압/자궁수축억제 사용', kfda:'2등급', note:'고혈압 2차 선택' },
  'Methyldopa': { fda:'B', pllr:'임신 고혈압 가장 오래된 데이터, 안전', kfda:'안전', note:'임신 고혈압 1차' },
  'Amlodipine': { fda:'C', pllr:'동물실험 데이터, 인체 제한적', kfda:'2등급', note:'니페디핀 우선' },
  'Losartan': { fda:'D', pllr:'2-3분기 태아 신부전·양수과소증·두개골 저형성', kfda:'금기', note:'임신 확인 즉시 중단' },
  'Enalapril': { fda:'D', pllr:'ARB와 동일 — 태아 신장/두개골 독성', kfda:'금기', note:'임신 확인 즉시 중단' },
  // ── 내분비 ──
  'Metformin': { fda:'B', pllr:'PCOS/GDM 사용 데이터 풍부, 태반 통과', kfda:'안전', note:'임신성 당뇨 인슐린 대안' },
  'Insulin': { fda:'B', pllr:'태반 미통과, 임신 당뇨 1차', kfda:'안전', note:'혈당 관리 1차' },
  'Levothyroxine': { fda:'A', pllr:'갑상선 기능 유지 필수, 용량 증가 필요', kfda:'안전', note:'임신 중 필수' },
  'PTU': { fda:'D', pllr:'1분기 항갑상선 1차(간독성 주의), 2분기부터 MMI 전환', kfda:'2등급', note:'1분기만 사용' },
  'Methimazole': { fda:'D', pllr:'1분기 두피결손·식도폐쇄증 위험, 2분기부터 사용', kfda:'금기(1분기)', note:'2-3분기 항갑상선' },
  // ── 항생제 ──
  'Amoxicillin': { fda:'B', pllr:'페니실린계, 안전', kfda:'안전', note:'1차 항생제' },
  'Azithromycin': { fda:'B', pllr:'안전 데이터 양호', kfda:'안전', note:'마크로라이드 중 안전' },
  'Cephalexin': { fda:'B', pllr:'세팔로스포린계, 안전', kfda:'안전', note:'요로감염 등' },
  'Doxycycline': { fda:'D', pllr:'치아 착색, 뼈 성장 영향', kfda:'금기', note:'임신 중 금기' },
  'Ciprofloxacin': { fda:'C', pllr:'연골 독성 동물실험, 인체 데이터 부족', kfda:'2등급', note:'대안 없을 때만' },
  'Metronidazole': { fda:'B', pllr:'1분기 안전성 논쟁 있으나 대규모 연구 안전', kfda:'2등급', note:'2-3분기 안전' },
  // ── 알레르기 ──
  'Cetirizine': { fda:'B', pllr:'2세대 항히스타민, 안전', kfda:'안전', note:'임신 중 사용 가능' },
  'Loratadine': { fda:'B', pllr:'안전 데이터 양호', kfda:'안전', note:'알레르기 1차' },
  'Chlorpheniramine': { fda:'B', pllr:'1세대, 오랜 사용 경험', kfda:'안전', note:'졸음 부작용' },
  // ── 보충제 ──
  'Folic Acid': { fda:'A', pllr:'신경관결손 예방, 0.4-5mg 권장', kfda:'안전', note:'필수 보충제' },
  'Iron': { fda:'A', pllr:'빈혈 예방, 적정 용량 안전', kfda:'안전', note:'필요 시 보충' },
  'Vitamin D': { fda:'A', pllr:'적정 용량(1000-4000IU) 안전', kfda:'안전', note:'칼슘 흡수 필수' },
  'Calcium': { fda:'A', pllr:'1000mg/일 안전, 전자간증 예방 효과', kfda:'안전', note:'유제품 섭취 보충' },
  'DHA': { fda:'B', pllr:'태아 뇌발달, 200-300mg 권장', kfda:'안전', note:'오메가3, 수은 프리 제품' },
  'CoQ10': { fda:'B', pllr:'제한적 데이터, 일반적으로 안전', kfda:'정보없음', note:'난자 질 개선 목적' },
  'Arginine': { fda:'C', pllr:'고용량 데이터 부족', kfda:'정보없음', note:'정자 운동성 목적' },
  'Silymarin': { fda:'C', pllr:'데이터 제한적', kfda:'정보없음', note:'간보호 목적' },
  'Zinc': { fda:'A', pllr:'적정 용량(11mg) 안전, 면역·정자 기능', kfda:'안전', note:'보충제' },
  // ── 기타 ──
  'Febuxostat': { fda:'C', pllr:'임신 중 사용 데이터 제한적', kfda:'2등급', note:'회피 권장' },
  'Colchicine': { fda:'C', pllr:'동물실험 기형, 인체 데이터 제한적', kfda:'2등급', note:'가급적 회피' },
  'Prednisone': { fda:'C', pllr:'1분기 구개열 미미한 증가(0.3→0.5%)', kfda:'2등급', note:'최소 용량 단기' },
  'Magnesium': { fda:'A', pllr:'안전, 전자간증 예방/치료', kfda:'안전', note:'편두통 예방에도 사용' },
};

const _DEFAULT_MILESTONES = [
  { id: 1, who: '오랑이', label: '산부인과 preconception visit', done: false, doneDate: null },
  { id: 2, who: '오랑이', label: '풍진 항체 확인', done: false, doneDate: null },
  { id: 3, who: '오랑이', label: '갑상선 기능 검사', done: false, doneDate: null },
  { id: 4, who: '오랑이', label: '정신과 약물 정리 확인 (주치의)', done: false, doneDate: null },
  { id: 5, who: '오랑이', label: '편두통 약물 임신 중 사용 목록 확정', done: false, doneDate: null },
  { id: 6, who: '오랑이', label: '체중 목표 도달 (45kg+)', done: false, doneDate: null },
  { id: 7, who: '오랑이', label: '치과 검진', done: false, doneDate: null },
  { id: 8, who: '붕쌤', label: '정액검사', done: true, doneDate: '2026-03-09' },
  { id: 9, who: '붕쌤', label: '임신준비 영양제 시작', done: true, doneDate: '2026-03-18' },
  { id: 10, who: '붕쌤', label: 'Lithium 기형유발성 검토 (주치의)', done: false, doneDate: null },
  { id: 11, who: '붕쌤', label: 'ATX 감량 → 가임력 영향 평가', done: false, doneDate: null },
  { id: 12, who: '붕쌤', label: '금주 시작', done: false, doneDate: null },
  { id: 13, who: '공통', label: '유전 상담 (필요시)', done: false, doneDate: null },
  { id: 14, who: '공통', label: '보험/출산 준비 계획', done: false, doneDate: null },
];

let _brkDashTab = 'cycle'; // cycle | daily | lab | milestone | safety
let _brkDailyCat = 'suppl'; // suppl | exercise | treatment | memo

function getBrkMaster() {
  var ds = S.domainState['bungruki'];
  if (!ds || !ds.master) return null;
  var m = ds.master;
  if (!m.menstrualCycles) m.menstrualCycles = [];
  if (!m.dailyChecks) m.dailyChecks = {};
  if (!m.labResults) m.labResults = [];
  if (!m.milestones) m.milestones = JSON.parse(JSON.stringify(_DEFAULT_MILESTONES));
  return m;
}

async function saveBrkMaster() {
  var ds = S.domainState['bungruki'];
  if (!ds) return;
  if (ds.masterFileId) {
    await driveUpdate(ds.masterFileId, ds.master);
  }
  cacheToLocal('bungruki');
}

// ── 7-1: 생리주기 트래커 ──

function getAvgCycleLength(cycles) {
  if (!cycles || cycles.length < 2) return 28;
  var sorted = cycles.slice().sort(function(a,b){return a.startDate.localeCompare(b.startDate);});
  var lengths = [];
  for (var i = 1; i < sorted.length && i <= 3; i++) {
    var diff = Math.round((new Date(sorted[sorted.length-i].startDate+'T00:00:00') - new Date(sorted[sorted.length-i-1].startDate+'T00:00:00')) / 86400000);
    if (diff > 0 && diff < 60) lengths.push(diff);
  }
  if (!lengths.length) return 28;
  return Math.round(lengths.reduce(function(a,b){return a+b;},0) / lengths.length);
}

function getOvulationDate(lmpDate, cycleLen) {
  var d = new Date(lmpDate + 'T00:00:00');
  d.setDate(d.getDate() + cycleLen - 14);
  return _localDateStr(d);
}

function isFertileWindow(dateStr, ovDate) {
  var d = new Date(dateStr+'T00:00:00');
  var ov = new Date(ovDate+'T00:00:00');
  var diff = Math.round((d - ov) / 86400000);
  return diff >= -3 && diff <= 3;
}

function buildCycleCalendarCells(calMonth, today, periodDays, fertileDays, ovDays, dailyChecks) {
  var year = parseInt(calMonth.slice(0,4));
  var month = parseInt(calMonth.slice(5,7));
  var firstDay = new Date(year, month-1, 1).getDay();
  var daysInMonth = new Date(year, month, 0).getDate();
  var dayNames = ['일','월','화','수','목','금','토'];
  var cells = dayNames.map(function(d){return '<div style="text-align:center;font-size:.65rem;color:var(--mu);font-weight:600">'+d+'</div>';}).join('');
  for (var blank = 0; blank < firstDay; blank++) cells += '<div></div>';
  for (var day = 1; day <= daysInMonth; day++) {
    var ds = calMonth+'-'+(day<10?'0':'')+day;
    var isPeriod = periodDays[ds];
    var isFertile = fertileDays[ds];
    var isOv = ovDays[ds];
    var isToday = ds === today;
    var bg = 'transparent';
    var border = 'none';
    var color = 'var(--tx)';
    if (isPeriod === true) { bg = '#fee2e2'; color = '#dc2626'; }
    else if (isPeriod === 'predicted') { bg = '#fef2f2'; color = '#f87171'; border = '1px dashed #fca5a5'; }
    else if (isOv === true) { bg = '#ede9fe'; color = '#7c3aed'; }
    else if (isOv === 'predicted') { bg = '#f5f3ff'; color = '#a78bfa'; border = '1px dashed #c4b5fd'; }
    else if (isFertile === true) { bg = '#ede9fe'; color = '#8b5cf6'; }
    else if (isFertile === 'predicted') { bg = '#f5f3ff'; color = '#a78bfa'; }
    if (isToday) border = '2px solid var(--ac)';
    // 일일 기록 아이콘
    var dayIcons = '';
    var dc = dailyChecks && dailyChecks[ds];
    if (dc) {
      var ic = [];
      var allKeys = BRK_SUPPL_ORANGI.concat(BRK_SUPPL_BUNG);
      var hasSuppl = allKeys.some(function(k){return (dc.orangi && dc.orangi[k]) || (dc.bung && dc.bung[k]);});
      if (hasSuppl) ic.push('💊');
      if ((dc.orangi && dc.orangi.exercise) || (dc.bung && dc.bung.exercise)) ic.push('🏃');
      if ((dc.orangi && dc.orangi.treatment) || (dc.bung && dc.bung.treatment)) ic.push('🏥');
      if ((dc.orangi && dc.orangi.memo) || (dc.bung && dc.bung.memo)) ic.push('📝');
      if (ic.length) dayIcons = '<div style="font-size:.4rem;line-height:1;margin-top:1px">'+ic.join('')+'</div>';
    }
    var ovIcon = isOv ? '<div style="font-size:.5rem">🟣</div>' : '';
    cells += '<div onclick="brkTogglePeriodDay(\''+ds+'\')" style="text-align:center;padding:2px 0;font-size:.78rem;border-radius:6px;cursor:pointer;background:'+bg+';color:'+color+';border:'+border+';font-weight:'+(isToday?'700':'400')+'">'+day+ovIcon+dayIcons+'</div>';
  }
  return cells;
}

function renderNextCycleInfo(today, lastCycle, avgLen) {
  if (!lastCycle) return '';
  var daysSinceLMP = Math.round((new Date(today+'T00:00:00') - new Date(lastCycle.startDate+'T00:00:00')) / 86400000);
  var daysUntilNext = avgLen - daysSinceLMP;
  var nextOvDate = getOvulationDate(lastCycle.startDate, avgLen);
  return '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">'
    + '<span class="log-tag" style="background:#fee2e2;color:#dc2626">D+'+daysSinceLMP+'</span>'
    + '<span class="log-tag" style="background:#ede9fe;color:#7c3aed">배란 추정 '+nextOvDate.slice(5)+'</span>'
    + '<span class="log-tag" style="background:#f0f9ff;color:#0284c7">다음 생리 '+(daysUntilNext>0?daysUntilNext+'일 후':'예정일 지남')+'</span>'
    + '<span class="log-tag" style="background:#f5f5f5;color:var(--mu)">평균 '+avgLen+'일</span>'
    + '</div>';
}

let _brkShowAllCycles=false;
function toggleShowAllCycles(){_brkShowAllCycles=!_brkShowAllCycles;renderView('meds');}

function renderRecentCycles(cycles, avgLen) {
  if(!cycles.length) return '';
  const show=_brkShowAllCycles?cycles:cycles.slice(0,5);

  // 실제 주기 계산 (다음 시작일 - 현재 시작일)
  const sorted=[...cycles].sort((a,b)=>a.startDate.localeCompare(b.startDate));
  const realLengths={};
  for(let i=0;i<sorted.length-1;i++){
    const diff=Math.round((new Date(sorted[i+1].startDate+'T00:00:00')-new Date(sorted[i].startDate+'T00:00:00'))/86400000);
    if(diff>0&&diff<60) realLengths[sorted[i].startDate]=diff;
  }
  const validLengths=Object.values(realLengths);
  const calcAvg=arr=>arr.length?(arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(1):'-';
  const calcStd=arr=>{if(arr.length<2)return'-';const m=arr.reduce((a,b)=>a+b,0)/arr.length;return Math.sqrt(arr.reduce((s,v)=>s+Math.pow(v-m,2),0)/arr.length).toFixed(1);};

  // 전체 통계
  const avg=calcAvg(validLengths);
  const shortest=validLengths.length?Math.min(...validLengths):'-';
  const longest=validLengths.length?Math.max(...validLengths):'-';
  const variance=calcStd(validLengths);

  // 최근 3주기 / 6주기 추이
  const recent3=validLengths.slice(-3);
  const recent6=validLengths.slice(-6);
  const avg3=calcAvg(recent3);
  const avg6=calcAvg(recent6);
  const std3=calcStd(recent3);

  // 규칙성 판정
  const regularity=variance!=='-'?(parseFloat(variance)<=2?'매우 규칙적':parseFloat(variance)<=4?'규칙적':parseFloat(variance)<=7?'약간 불규칙':'불규칙'):'—';
  const regColor=variance!=='-'?(parseFloat(variance)<=2?'#10b981':parseFloat(variance)<=4?'#3b82f6':parseFloat(variance)<=7?'#f59e0b':'#dc2626'):'var(--mu)';

  // 최근 주기로부터 오늘까지 D+N
  const today=kstToday();
  const lastStart=cycles[0]?.startDate;
  const dPlus=lastStart?Math.round((new Date(today+'T00:00:00')-new Date(lastStart+'T00:00:00'))/86400000):'';

  // 평균 생리 기간
  const durations=cycles.filter(c=>c.endDate).map(c=>Math.round((new Date(c.endDate+'T00:00:00')-new Date(c.startDate+'T00:00:00'))/86400000+1)).filter(d=>d>0&&d<15);
  const avgDuration=calcAvg(durations);

  const pains=cycles.filter(c=>c.pain>=0).map(c=>c.pain);
  const avgPain=pains.length?(pains.reduce((a,b)=>a+b,0)/pains.length).toFixed(1):'-';

  // 통계 카드 (전체)
  const statsHtml=`<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-bottom:4px">
    ${[['전체 평균',avg+'일'],['최단',shortest+'일'],['최장',longest+'일'],['변동성','±'+variance+'일']].map(([l,v])=>
      `<div style="background:var(--sf2);border:1px solid var(--bd);border-radius:6px;padding:6px;text-align:center">
        <div style="font-size:.55rem;color:var(--mu)">${l}</div>
        <div style="font-size:.82rem;font-weight:700">${v}</div>
      </div>`).join('')}
  </div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-bottom:6px">
    ${[['최근3주기',avg3+'일'],['최근6주기',avg6+'일'],['평균 기간',avgDuration!=='-'?avgDuration+'일':'-'],['규칙성','']].map(([l,v],idx)=>
      idx===3
      ?`<div style="background:${regColor}10;border:1px solid ${regColor}40;border-radius:6px;padding:6px;text-align:center">
          <div style="font-size:.55rem;color:var(--mu)">${l}</div>
          <div style="font-size:.72rem;font-weight:700;color:${regColor}">${regularity}</div>
        </div>`
      :`<div style="background:var(--sf2);border:1px solid var(--bd);border-radius:6px;padding:6px;text-align:center">
          <div style="font-size:.55rem;color:var(--mu)">${l}</div>
          <div style="font-size:.82rem;font-weight:700">${v}</div>
        </div>`).join('')}
  </div>
  ${avgPain!=='-'?`<div style="font-size:.65rem;color:var(--mu);margin-bottom:6px">평균 통증: ${avgPain}/10 · 기록 ${pains.length}회${dPlus?` · 현재 D+${dPlus}`:''}</div>`
    :(dPlus?`<div style="font-size:.65rem;color:var(--mu);margin-bottom:6px">현재 D+${dPlus}</div>`:'')}`;

  // 기록 목록
  const rowsHtml=show.map(function(c,i){
    const cycleLen=realLengths[c.startDate];
    const duration=c.endDate?Math.round((new Date(c.endDate+'T00:00:00')-new Date(c.startDate+'T00:00:00'))/86400000+1)+'일간':'';
    const lenDiff=cycleLen?(cycleLen-avg):0;
    const lenColor=cycleLen?(Math.abs(lenDiff)>5?'#dc2626':Math.abs(lenDiff)>3?'#f59e0b':'#10b981'):'var(--mu)';
    // 최근(마지막) 기록은 D+N 표시
    const isLatest=i===0&&!cycleLen;
    return '<div style="display:flex;align-items:center;gap:5px;padding:5px 0;border-bottom:1px solid var(--bd);font-size:.75rem">'
      + '<input type="checkbox" class="brk-cyc-sel" data-id="'+c.id+'" style="width:14px;height:14px;accent-color:var(--ac);flex-shrink:0">'
      + '<span style="color:#dc2626;font-weight:600;min-width:68px;font-size:.72rem">'+esc(c.startDate)+'</span>'
      + (c.endDate?'<span style="color:var(--mu);font-size:.65rem">~'+esc(c.endDate.slice(5))+'</span>':'')
      + (duration?'<span style="font-size:.58rem;color:var(--mu2)">'+duration+'</span>':'')
      + (cycleLen?'<span class="log-tag" style="background:#fef3c7;color:'+lenColor+';font-weight:600;font-size:.65rem">'+cycleLen+'일</span>'
        :(isLatest&&dPlus?'<span class="log-tag" style="background:#dbeafe;color:#1d4ed8;font-size:.65rem">D+'+dPlus+'</span>':''))
      + (c.flow?'<span class="log-tag" style="background:#fce7f3;color:#be185d;font-size:.62rem">'+(c.flow==='heavy'?'많음':c.flow==='light'?'적음':'보통')+'</span>':'')
      + (c.pain>=0?'<span class="log-tag" style="background:#fee2e2;color:#dc2626;font-size:.62rem">통증'+c.pain+'</span>':'')
      + (c.memo?'<span style="font-size:.55rem;color:var(--mu2)" title="'+esc(c.memo)+'">📝</span>':'')
      + '<button class="accum-del" onclick="brkEditCycle('+i+')" style="margin-left:auto;font-size:.6rem;color:var(--ac)" title="수정">✏️</button>'
      + '</div>';
  }).join('');

  const selectBar=`<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
    <label style="display:flex;align-items:center;gap:4px;font-size:.65rem;color:var(--mu);cursor:pointer">
      <input type="checkbox" onchange="document.querySelectorAll('.brk-cyc-sel').forEach(c=>c.checked=this.checked)" style="accent-color:var(--ac)"> 전체선택
    </label>
    <button onclick="brkDeleteSelected()" style="background:none;border:1px solid #dc2626;border-radius:5px;padding:2px 8px;font-size:.65rem;cursor:pointer;color:#dc2626;margin-left:auto">🗑 선택 삭제</button>
  </div>`;

  const toggleBtn=cycles.length>5
    ?`<button onclick="toggleShowAllCycles()" style="width:100%;background:none;border:1px solid var(--bd);border-radius:6px;padding:5px;font-size:.72rem;cursor:pointer;color:var(--mu);margin-top:4px">${_brkShowAllCycles?'▲ 접기':'▼ 전체 '+cycles.length+'건 보기'}</button>`:'';

  return statsHtml+selectBar+rowsHtml+toggleBtn;
}

// 생리주기 기록 수정
function brkEditCycle(displayIdx) {
  const m=getBrkMaster();if(!m) return;
  const sorted=m.menstrualCycles.slice().sort((a,b)=>b.startDate.localeCompare(a.startDate));
  const show=_brkShowAllCycles?sorted:sorted.slice(0,5);
  const c=show[displayIdx];if(!c) return;
  document.getElementById('confirm-title').textContent='✏️ 생리 기록 수정';
  document.getElementById('confirm-body').innerHTML=`
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
      <div><div class="dx-form-label">시작일</div><input type="date" id="brk-edit-start" class="dx-form-input" style="width:140px" value="${c.startDate}"></div>
      <div><div class="dx-form-label">종료일</div><input type="date" id="brk-edit-end" class="dx-form-input" style="width:140px" value="${c.endDate||''}"></div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
      <div><div class="dx-form-label">양</div><select id="brk-edit-flow" class="dx-form-input" style="width:100px">
        <option value="" ${!c.flow?'selected':''}>기록 안함</option>
        <option value="light" ${c.flow==='light'?'selected':''}>적음</option>
        <option value="moderate" ${c.flow==='moderate'?'selected':''}>보통</option>
        <option value="heavy" ${c.flow==='heavy'?'selected':''}>많음</option>
      </select></div>
      <div><div class="dx-form-label">통증 (0-10)</div><input type="number" id="brk-edit-pain" class="dx-form-input" style="width:80px" min="-1" max="10" value="${c.pain>=0?c.pain:'-1'}"></div>
    </div>
    <div class="dx-form-label">메모</div>
    <input type="text" id="brk-edit-memo" class="dx-form-input" value="${esc(c.memo||'')}">`;
  document.getElementById('confirm-foot').innerHTML=
    `<button class="btn-cancel" onclick="closeConfirmModal()" style="font-size:.78rem">취소</button>`+
    `<button class="btn-accum-add" onclick="brkSaveEditCycle(${c.id})">💾 저장</button>`;
  openModal('confirm-modal');
}

async function brkSaveEditCycle(id) {
  const m=getBrkMaster();if(!m) return;
  const c=m.menstrualCycles.find(x=>x.id===id);if(!c) return;
  c.startDate=document.getElementById('brk-edit-start')?.value||c.startDate;
  c.endDate=document.getElementById('brk-edit-end')?.value||'';
  c.flow=document.getElementById('brk-edit-flow')?.value||null;
  const pain=parseInt(document.getElementById('brk-edit-pain')?.value);
  c.pain=pain>=0?pain:-1;
  c.memo=document.getElementById('brk-edit-memo')?.value||'';
  await saveBrkMaster();
  closeConfirmModal();
  renderView('meds');
  showToast('✅ 수정됨');
}

async function brkDeleteSelected() {
  const ids=[];
  document.querySelectorAll('.brk-cyc-sel:checked').forEach(cb=>ids.push(parseInt(cb.dataset.id)));
  if(!ids.length){showToast('삭제할 기록을 선택하세요.');return;}
  if(!confirm(ids.length+'건의 생리 기록을 삭제하시겠습니까?')) return;
  const m=getBrkMaster();if(!m) return;
  m.menstrualCycles=m.menstrualCycles.filter(c=>!ids.includes(c.id));
  await saveBrkMaster();
  renderView('meds');
  showToast(`🗑 ${ids.length}건 삭제됨`);
}

function renderCycleTracker() {
  var m = getBrkMaster();
  if (!m) return '<div class="hint">데이터를 불러오는 중...</div>';
  var cycles = m.menstrualCycles.slice().sort(function(a,b){return b.startDate.localeCompare(a.startDate);});
  var avgLen = getAvgCycleLength(cycles);
  var lastCycle = cycles[0] || null;
  var today = kstToday();
  var calMonth = S._brkCalMonth || today.slice(0,7);
  var year = parseInt(calMonth.slice(0,4));
  var month = parseInt(calMonth.slice(5,7));

  // Build period/fertile/ovulation maps
  var periodDays = {}, fertileDays = {}, ovDays = {};
  cycles.forEach(function(c) {
    var s = new Date(c.startDate+'T00:00:00');
    var e = c.endDate ? new Date(c.endDate+'T00:00:00') : new Date(s.getTime() + 4*86400000);
    for (var d = new Date(s); d <= e; d.setDate(d.getDate()+1)) periodDays[_localDateStr(d)] = true;
    var ovD = getOvulationDate(c.startDate, c.length || avgLen);
    ovDays[ovD] = true;
    for (var i = -3; i <= 3; i++) { var fd = new Date(ovD+'T00:00:00'); fd.setDate(fd.getDate()+i); fertileDays[_localDateStr(fd)] = true; }
  });
  if (lastCycle) {
    var nextStart = new Date(lastCycle.startDate+'T00:00:00');
    nextStart.setDate(nextStart.getDate() + avgLen);
    for (var pd = 0; pd < 5; pd++) { var pdate = new Date(nextStart.getTime() + pd*86400000); var pstr = _localDateStr(pdate); if (!periodDays[pstr]) periodDays[pstr] = 'predicted'; }
    var nextOv = getOvulationDate(_localDateStr(nextStart), avgLen);
    if (!ovDays[nextOv]) ovDays[nextOv] = 'predicted';
    for (var fi = -3; fi <= 3; fi++) { var fdd = new Date(nextOv+'T00:00:00'); fdd.setDate(fdd.getDate()+fi); var fstr = _localDateStr(fdd); if (!fertileDays[fstr]) fertileDays[fstr] = 'predicted'; }
  }

  var calCells = buildCycleCalendarCells(calMonth, today, periodDays, fertileDays, ovDays, m.dailyChecks);
  var nextInfo = renderNextCycleInfo(today, lastCycle, avgLen);
  var recentHtml = renderRecentCycles(cycles, avgLen);

  return '<div>'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'
    + '<button class="btn-export" onclick="brkCalNav(-1)" style="padding:4px 10px">◀</button>'
    + '<strong style="font-size:.88rem">'+year+'년 '+month+'월</strong>'
    + '<button class="btn-export" onclick="brkCalNav(1)" style="padding:4px 10px">▶</button>'
    + '</div>'
    + '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px">'+calCells+'</div>'
    + '<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;font-size:.65rem;color:var(--mu)">'
    + '<span>🔴 생리일</span><span>🟣 배란 추정</span><span>🟪 가임기</span><span style="border:1px dashed #ccc;padding:0 4px;border-radius:4px">점선=예측</span>'
    + '</div><div style="display:flex;gap:8px;margin-top:4px;flex-wrap:wrap;font-size:.65rem;color:var(--mu)">'
    + '<span>💊 영양제</span><span>🏃 운동</span><span>🏥 치료</span><span>📝 메모</span>'
    + '</div>'
    + nextInfo
    + '<div style="margin-top:12px">'
    + '<button class="btn-accum-add" onclick="brkOpenCycleForm()" style="font-size:.75rem">+ 생리 기록 추가</button>'
    + ' <button class="btn-export" onclick="brkCycleFromPhoto()" style="font-size:.75rem;margin-left:6px">📷 사진/파일에서 읽기</button>'
    + '<input type="file" id="brk-cycle-photo" accept="image/*" style="display:none" onchange="brkProcessCyclePhoto(this)">'
    + '</div>'
    + '<div id="brk-cycle-form" style="display:none;margin-top:10px;padding:12px;background:var(--sf2);border-radius:8px;border:1.5px solid var(--bd)">'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap">'
    + '<div><div class="dx-form-label">시작일 *</div><input type="date" id="brk-cyc-start" class="dx-form-input" style="width:140px"></div>'
    + '<div><div class="dx-form-label">종료일</div><input type="date" id="brk-cyc-end" class="dx-form-input" style="width:140px"></div>'
    + '<div><div class="dx-form-label">양</div><select id="brk-cyc-flow" class="dx-form-input" style="width:100px"><option value="">기록 안함</option><option value="moderate">보통</option><option value="light">적음</option><option value="heavy">많음</option></select></div>'
    + '<div><div class="dx-form-label">통증</div><select id="brk-cyc-pain" class="dx-form-input" style="width:100px"><option value="-1">기록 안함</option><option value="0">0</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option><option value="7">7</option><option value="8">8</option><option value="9">9</option><option value="10">10</option></select></div>'
    + '</div>'
    + '<div style="margin-top:8px"><div class="dx-form-label">메모</div><input type="text" id="brk-cyc-memo" class="dx-form-input" placeholder="증상, 특이사항 등"></div>'
    + '<div style="margin-top:8px;display:flex;gap:8px">'
    + '<button class="btn-accum-add" onclick="brkSaveCycle()">💾 저장</button>'
    + '<button class="btn-cancel" onclick="document.getElementById(\'brk-cycle-form\').style.display=\'none\'" style="font-size:.78rem">취소</button>'
    + '</div></div>'
    + (recentHtml ? '<div style="margin-top:12px"><div style="font-size:.75rem;font-weight:600;color:var(--mu);margin-bottom:4px">최근 기록</div>'+recentHtml+'</div>' : '')
    + '</div>';
}

function brkCalNav(dir) {
  var cur = S._brkCalMonth || kstToday().slice(0,7);
  var y = parseInt(cur.slice(0,4));
  var mo = parseInt(cur.slice(5,7)) + dir;
  if (mo < 1) { mo = 12; y--; }
  if (mo > 12) { mo = 1; y++; }
  S._brkCalMonth = y+'-'+(mo<10?'0':'')+mo;
  renderView('meds');
}

function brkOpenCycleForm() {
  var f = document.getElementById('brk-cycle-form');
  if (f) { f.style.display = 'block'; document.getElementById('brk-cyc-start').value = kstToday(); }
}

function brkTogglePeriodDay(ds) {
  var el = document.getElementById('brk-cyc-start');
  if (el && document.getElementById('brk-cycle-form').style.display !== 'none') {
    el.value = ds;
  }
}

async function brkSaveCycle() {
  var m = getBrkMaster(); if (!m) return;
  var start = document.getElementById('brk-cyc-start').value;
  if (!start) { alert('시작일을 입력하세요'); return; }
  var end = document.getElementById('brk-cyc-end').value || '';
  var flow = document.getElementById('brk-cyc-flow').value || null;
  var painVal = parseInt(document.getElementById('brk-cyc-pain').value);
  var pain = painVal >= 0 ? painVal : -1;
  var memo = document.getElementById('brk-cyc-memo').value || '';

  var sorted = m.menstrualCycles.slice().sort(function(a,b){return a.startDate.localeCompare(b.startDate);});
  var prevCycle = null;
  for (var i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].startDate < start) { prevCycle = sorted[i]; break; }
  }
  var length = 28;
  if (prevCycle) {
    length = Math.round((new Date(start+'T00:00:00') - new Date(prevCycle.startDate+'T00:00:00')) / 86400000);
  }

  m.menstrualCycles.push({
    id: Date.now(), startDate: start, endDate: end, length: length,
    flow: flow, pain: pain, symptoms: [], memo: memo
  });
  await saveBrkMaster();
  renderView('meds');
  showToast('생리 기록 저장됨');
}

function brkCycleFromPhoto() {
  document.getElementById('brk-cycle-photo').click();
}

async function brkProcessCyclePhoto(input) {
  if (!input.files || !input.files[0]) return;
  var file = input.files[0];
  showToast('📷 사진 분석 중...');
  try {
    var reader = new FileReader();
    reader.onload = async function(e) {
      var base64 = e.target.result.split(',')[1];
      var mediaType = file.type || 'image/jpeg';
      // Try Claude first, fallback to GPT
      var aiId = S.keys?.claude ? 'claude' : (S.keys?.gpt ? 'gpt' : null);
      if (!aiId) { showToast('⚠️ AI API 키가 필요합니다 (Claude 또는 GPT)'); return; }
      var prompt = '이 이미지는 생리주기 추적 앱의 스크린샷입니다. 이미지에서 생리 시작일과 종료일을 추출해주세요.\n\n반드시 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):\n[{"startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD"}]\n\n여러 주기가 보이면 모두 추출하세요. 종료일을 알 수 없으면 endDate를 빈 문자열로 두세요.';
      var result = null;
      if (aiId === 'claude') {
        var resp = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': S.keys.claude, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
          body: JSON.stringify({ model: S.models?.claude || 'claude-sonnet-4-20250514', max_tokens: 500, messages: [{ role: 'user', content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            { type: 'text', text: prompt }
          ]}]})
        });
        var data = await resp.json();
        result = data.content?.[0]?.text || '';
      } else {
        var resp = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + S.keys.gpt },
          body: JSON.stringify({ model: S.models?.gpt || 'gpt-4o', max_tokens: 500, messages: [{ role: 'user', content: [
            { type: 'image_url', image_url: { url: 'data:' + mediaType + ';base64,' + base64 } },
            { type: 'text', text: prompt }
          ]}]})
        });
        var data = await resp.json();
        result = data.choices?.[0]?.message?.content || '';
      }
      // Parse JSON from response
      var jsonMatch = result.match(/\[[\s\S]*?\]/);
      if (!jsonMatch) { showToast('⚠️ 날짜를 인식하지 못했습니다', 3000); return; }
      var cycles = JSON.parse(jsonMatch[0]);
      if (!cycles.length) { showToast('⚠️ 생리 기록을 찾지 못했습니다', 3000); return; }
      var m = getBrkMaster(); if (!m) return;
      var added = 0;
      cycles.forEach(function(c) {
        if (!c.startDate || !/^\d{4}-\d{2}-\d{2}$/.test(c.startDate)) return;
        var exists = m.menstrualCycles.some(function(ex) { return ex.startDate === c.startDate; });
        if (exists) return;
        m.menstrualCycles.push({ id: Date.now() + added, startDate: c.startDate, endDate: c.endDate || '', length: 28, flow: null, pain: -1, symptoms: [], memo: '📷 사진에서 자동 추출' });
        added++;
      });
      if (added > 0) {
        await saveBrkMaster();
        renderView('meds');
        showToast('📷 ' + added + '개 생리 기록 추출 완료');
      } else {
        showToast('이미 등록된 기록이거나 날짜를 찾지 못했습니다', 3000);
      }
    };
    reader.readAsDataURL(file);
  } catch (e) {
    showToast('⚠️ 사진 분석 실패: ' + e.message, 3000);
  }
  input.value = '';
}

async function brkDeleteCycle(idx) {
  var m = getBrkMaster(); if (!m) return;
  var sorted = m.menstrualCycles.slice().sort(function(a,b){return b.startDate.localeCompare(a.startDate);});
  var target = sorted[idx];
  if (!target) return;
  m.menstrualCycles = m.menstrualCycles.filter(function(c){return c.id !== target.id;});
  await saveBrkMaster();
  renderView('meds');
  showToast('삭제됨');
}

// ── 7-2: 일일 체크리스트 ──

var _brkCheckDate = null;
var _brkCheckWho = 'orangi'; // orangi | bung

function renderDailyChecks() {
  var m = getBrkMaster(); if (!m) return '<div class="hint">로딩 중...</div>';
  var today = kstToday();
  var selDate = _brkCheckDate || today;
  var dayData = m.dailyChecks[selDate] || {};
  var isOrangi = _brkCheckWho === 'orangi';
  var whoData = isOrangi ? (dayData.orangi || {}) : (dayData.bung || {});

  // 카테고리 서브탭
  var cats = [
    {id:'suppl',label:'💊 영양제',color:'#16a34a'},
    {id:'exercise',label:'🏃 운동',color:'#2563eb'},
    {id:'treatment',label:'🏥 치료',color:'#dc2626'},
    {id:'memo',label:'📝 메모',color:'#7c3aed'},
  ];
  var catTabHtml = cats.map(function(c){
    var active = _brkDailyCat === c.id;
    return '<button onclick="_brkDailyCat=\''+c.id+'\';renderView(\'meds\')" style="flex:1;padding:6px 2px;font-size:.68rem;font-weight:'+(active?'700':'400')+';background:'+(active?c.color+'18':'transparent')+';color:'+(active?c.color:'var(--mu)')+';border:none;border-bottom:2px solid '+(active?c.color:'transparent')+';cursor:pointer;font-family:var(--font)">'+c.label+'</button>';
  }).join('');

  // 카테고리별 콘텐츠
  var contentHtml = '';
  if (_brkDailyCat === 'suppl') contentHtml = _brkRenderSuppl(isOrangi, whoData, m, today);
  else if (_brkDailyCat === 'exercise') contentHtml = _brkRenderExercise(isOrangi, whoData);
  else if (_brkDailyCat === 'treatment') contentHtml = _brkRenderTreatment(whoData);
  else if (_brkDailyCat === 'memo') contentHtml = _brkRenderMemo(whoData);

  // 오늘 기록 요약 아이콘
  var todayIcons = _brkDayIcons(dayData, isOrangi);

  return '<div>'
    + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">'
    + '<input type="date" value="'+selDate+'" onchange="_brkCheckDate=this.value;renderView(\'meds\')" class="dx-form-input" style="width:140px;font-size:.78rem">'
    + (selDate===today?'<span class="log-tag" style="background:#dbeafe;color:#1d4ed8">오늘</span>':'<button class="btn-export" onclick="_brkCheckDate=null;renderView(\'meds\')" style="font-size:.72rem">오늘로</button>')
    + (todayIcons?'<span style="font-size:.75rem;margin-left:4px">'+todayIcons+'</span>':'')
    + '<span style="margin-left:auto;font-size:.65rem;color:#16a34a">☁️ 자동 저장</span>'
    + '</div>'
    + '<div style="display:flex;gap:4px;margin-bottom:8px">'
    + '<button onclick="_brkCheckWho=\'orangi\';renderView(\'meds\')" class="btn-export" style="flex:1;padding:6px;font-size:.82rem;'+(isOrangi?'background:#ec4899;color:white;border-color:#ec4899':'')+'">🧡 오랑이</button>'
    + '<button onclick="_brkCheckWho=\'bung\';renderView(\'meds\')" class="btn-export" style="flex:1;padding:6px;font-size:.82rem;'+(!isOrangi?'background:#06b6d4;color:white;border-color:#06b6d4':'')+'">🩵 붕쌤</button>'
    + '</div>'
    + '<div style="display:flex;border-bottom:1px solid var(--bd);margin-bottom:10px">'+catTabHtml+'</div>'
    + contentHtml
    + renderCrossSyncStatus(selDate, isOrangi?'orangi':'bung')
    + '</div>';
}

// 교차 동기화 상태 인라인 카드
function renderCrossSyncStatus(date, who) {
  const healthDomain = who==='orangi' ? 'orangi-health' : 'bung-health';
  const ds = S.domainState[healthDomain];
  if(!ds?.logData) return '';
  const syncId = 'brk-sync-'+date;
  const synced = ds.logData.find(l=>l._syncId===syncId);
  if(!synced) return '';
  const dd = DOMAINS[healthDomain];
  return `<div style="margin-top:10px;padding:8px 10px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;font-size:.72rem">
    <div style="font-weight:600;color:#1d4ed8;margin-bottom:4px">🔗 ${dd.icon} ${dd.label} 연동됨</div>
    <div style="color:#1e40af">${esc(synced.memo||'')}</div>
  </div>`;
}

var BRK_SUPPL_ORANGI = ['folicAcid','iron','vitaminD','multivitamin','magnesium'];
var BRK_SUPPL_BUNG = ['arginine','coq10','silymarin','multivitamin','febuxostat'];

function _getBrkWhoData(m) {
  if (!m) m = getBrkMaster(); if (!m) return null;
  var selDate = _brkCheckDate || kstToday();
  if (!m.dailyChecks[selDate]) m.dailyChecks[selDate] = {};
  var who = _brkCheckWho === 'orangi' ? 'orangi' : 'bung';
  if (!m.dailyChecks[selDate][who]) m.dailyChecks[selDate][who] = {};
  return {m: m, whoData: m.dailyChecks[selDate][who], selDate: selDate};
}

function _brkDayIcons(dayData, isOrangi) {
  var icons = [];
  var who = isOrangi ? (dayData.orangi || {}) : (dayData.bung || {});
  var supplKeys = isOrangi ? BRK_SUPPL_ORANGI : BRK_SUPPL_BUNG;
  if (supplKeys.some(function(k){return who[k];})) icons.push('💊');
  if (who.exercise) icons.push('🏃');
  if (who.treatment) icons.push('🏥');
  if (who.memo) icons.push('📝');
  return icons.join('');
}

function _brkRenderSuppl(isOrangi, whoData, m, today) {
  var orangiItems = [
    { key: 'folicAcid', label: '엽산', icon: '💊' },
    { key: 'iron', label: '철분', icon: '🩸' },
    { key: 'vitaminD', label: '비타민D', icon: '☀️' },
    { key: 'multivitamin', label: '멀티비타민', icon: '💊' },
    { key: 'magnesium', label: '마그네슘', icon: '🧲' },
  ];
  var bungItems = [
    { key: 'arginine', label: '아르기닌', icon: '💪' },
    { key: 'coq10', label: 'CoQ10', icon: '⚡' },
    { key: 'silymarin', label: '실리마린', icon: '🌿' },
    { key: 'multivitamin', label: '멀티비타민', icon: '💊' },
    { key: 'febuxostat', label: 'Febuxostat', icon: '💉' },
  ];
  var items = isOrangi ? orangiItems : bungItems;

  var checkHtml = items.map(function(it) {
    var checked = whoData[it.key] ? true : false;
    return '<div onclick="brkToggleCheck(\''+it.key+'\')" style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:'+(checked?'#f0fdf4':'var(--sf2)')+';border:1.5px solid '+(checked?'#86efac':'var(--bd)')+';border-radius:8px;cursor:pointer;transition:all .2s">'
      + '<span style="font-size:1.2rem">'+(checked?'✅':it.icon)+'</span>'
      + '<span style="font-size:.82rem;font-weight:'+(checked?'600':'400')+';color:'+(checked?'#16a34a':'var(--tx)')+'">'+it.label+'</span>'
      + '</div>';
  }).join('');

  // 주간 요약
  var weekDays = [];
  for (var i = 6; i >= 0; i--) {
    var d = new Date(new Date(today+'T00:00:00').getTime() - i*86400000);
    weekDays.push(_localDateStr(d));
  }
  var weekSummary = items.map(function(it) {
    var count = 0;
    weekDays.forEach(function(wd) {
      var dd = m.dailyChecks[wd];
      var w = isOrangi ? (dd?.orangi || {}) : (dd?.bung || {});
      if (w[it.key]) count++;
    });
    var pct = Math.round(count/7*100);
    return '<div style="display:flex;align-items:center;gap:6px;font-size:.75rem">'
      + '<span>'+it.icon+' '+it.label+'</span>'
      + '<span style="flex:1;height:6px;background:var(--bd);border-radius:3px;overflow:hidden"><span style="display:block;height:100%;width:'+pct+'%;background:'+(pct>=80?'#16a34a':pct>=50?'#f59e0b':'#ef4444')+';border-radius:3px"></span></span>'
      + '<span style="font-weight:600;color:'+(pct>=80?'#16a34a':pct>=50?'#f59e0b':'#ef4444')+'">'+count+'/7</span>'
      + '</div>';
  }).join('');

  return '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:6px">'+checkHtml+'</div>'
    + '<div style="margin-top:14px;padding:10px;background:var(--sf2);border-radius:8px;border:1px solid var(--bd)">'
    + '<div style="font-size:.75rem;font-weight:600;color:var(--mu);margin-bottom:6px">📊 주간 요약 (최근 7일)</div>'
    + '<div style="display:flex;flex-direction:column;gap:4px">'+weekSummary+'</div>'
    + '</div>';
}

function _brkRenderExercise(isOrangi, whoData) {
  var exercise = whoData.exercise || null;
  var exOpts = [
    {v:null,l:'안함',c:''},
    {v:'cardio',l:'유산소',c:'🏃'},
    {v:'strength',l:'근력',c:'🏋️'},
    {v:'stretch',l:'스트레칭',c:'🧘'}
  ];
  var html = '<div style="margin-bottom:10px"><div class="dx-form-label">운동 종류</div>'
    + '<div style="display:flex;gap:4px">'
    + exOpts.map(function(o){return '<button onclick="brkSetExercise('+(o.v?'\''+o.v+'\'':'null')+')" class="btn-export" style="flex:1;padding:8px 2px;font-size:.78rem;'+(exercise===o.v?'background:var(--ac);color:white;border-color:var(--ac)':'')+'">'+(o.c?o.c+' ':'')+o.l+'</button>';}).join('')
    + '</div></div>';

  if (isOrangi) {
    var meals = whoData.meals || 0;
    var weight = whoData.weight || '';
    html += '<div style="display:flex;gap:10px;margin-top:10px">'
      + '<div style="flex:1"><div class="dx-form-label">식사 횟수</div>'
      + '<div style="display:flex;gap:4px">'
      + [0,1,2,3].map(function(n){return '<button onclick="brkSetMeals('+n+')" class="btn-export" style="flex:1;padding:6px;font-size:.82rem;'+(meals===n?'background:var(--ac);color:white;border-color:var(--ac)':'')+'">'+n+'</button>';}).join('')
      + '</div></div>'
      + '<div style="flex:1"><div class="dx-form-label">체중 (kg)</div>'
      + '<input type="number" step="0.1" id="brk-weight" value="'+(weight||'')+'" class="dx-form-input" placeholder="예: 40.2" onchange="brkSetWeight(this.value)" style="width:100%"></div>'
      + '</div>';
  } else {
    var alcohol = whoData.alcohol || false;
    html += '<div style="margin-top:10px"><div class="dx-form-label">음주 여부</div>'
      + '<div onclick="brkToggleAlcohol()" style="display:inline-flex;align-items:center;gap:8px;padding:10px 16px;background:'+(alcohol?'#fef2f2':'#f0fdf4')+';border:1.5px solid '+(alcohol?'#fca5a5':'#86efac')+';border-radius:8px;cursor:pointer">'
      + '<span style="font-size:1.2rem">'+(alcohol?'🍺':'🚫')+'</span>'
      + '<span style="font-size:.82rem;font-weight:600;color:'+(alcohol?'#dc2626':'#16a34a')+'">'+(alcohol?'음주':'금주')+'</span>'
      + '</div></div>';
  }
  return html;
}

function _brkRenderTreatment(whoData) {
  var treatment = whoData.treatment || '';
  var treatType = whoData.treatmentType || null;
  var typeOpts = [
    {v:null,l:'없음'},
    {v:'hospital',l:'🏥 병원'},
    {v:'procedure',l:'💉 시술'},
    {v:'counseling',l:'💬 상담'},
  ];
  return '<div style="margin-bottom:10px"><div class="dx-form-label">치료/진료 종류</div>'
    + '<div style="display:flex;gap:4px">'
    + typeOpts.map(function(o){return '<button onclick="brkSetTreatmentType('+(o.v?'\''+o.v+'\'':'null')+')" class="btn-export" style="flex:1;padding:8px 2px;font-size:.75rem;'+(treatType===o.v?'background:var(--ac);color:white;border-color:var(--ac)':'')+'">'+o.l+'</button>';}).join('')
    + '</div></div>'
    + '<div><div class="dx-form-label">치료 내용</div>'
    + '<textarea id="brk-treatment" class="dx-form-input" rows="3" placeholder="진료 내용, 처방, 검사 결과 등" onchange="brkSetTreatment(this.value)" style="width:100%;resize:vertical">'+esc(treatment)+'</textarea></div>';
}

function _brkRenderMemo(whoData) {
  var memo = whoData.memo || '';
  return '<div><div class="dx-form-label">오늘의 메모</div>'
    + '<textarea id="brk-memo" class="dx-form-input" rows="4" placeholder="컨디션, 증상, 특이사항 등 자유롭게 기록" onchange="brkSetMemo(this.value)" style="width:100%;resize:vertical">'+esc(memo)+'</textarea></div>';
}

async function brkToggleCheck(key) {
  var r = _getBrkWhoData(); if (!r) return;
  r.whoData[key] = !r.whoData[key];
  await saveBrkMaster();
  // 교차 동기화: 건강관리 도메인에 영양제/운동 기록 반영
  syncBrkToHealth(r.selDate, _brkCheckWho);
  renderView('meds');
}

// 붕룩이 체크 → 건강관리 도메인 로그 동기화
function syncBrkToHealth(date, who) {
  const healthDomain = who==='orangi' ? 'orangi-health' : 'bung-health';
  const ds = S.domainState[healthDomain];
  if(!ds?.master) return; // 건강관리 도메인 미로드 시 스킵
  const m = getBrkMaster(); if(!m) return;
  const dayData = m.dailyChecks?.[date]?.[who];
  if(!dayData) return;
  // 영양제 목록 수집
  const supplKeys = who==='orangi' ? BRK_SUPPL_ORANGI : BRK_SUPPL_BUNG;
  const supplItems = who==='orangi'
    ? [{key:'folicAcid',label:'엽산'},{key:'iron',label:'철분'},{key:'vitaminD',label:'비타민D'},{key:'multivitamin',label:'멀티비타민'},{key:'magnesium',label:'마그네슘'}]
    : [{key:'arginine',label:'아르기닌'},{key:'coq10',label:'CoQ10'},{key:'silymarin',label:'실리마린'},{key:'multivitamin',label:'멀티비타민'},{key:'febuxostat',label:'Febuxostat'}];
  const takenSuppl = supplItems.filter(it=>dayData[it.key]).map(it=>it.label);
  const exercise = dayData.exercise || '';
  const memo = dayData.memo || '';
  // 건강관리 로그에 동기화 기록 찾기/생성
  if(!ds.logData) ds.logData=[];
  const syncId = 'brk-sync-'+date;
  let existing = ds.logData.find(l=>l._syncId===syncId);
  const parts = [];
  if(takenSuppl.length) parts.push('💊 영양제: '+takenSuppl.join(', '));
  if(exercise) parts.push('🏃 운동: '+exercise);
  if(memo) parts.push('📝 '+memo);
  if(!parts.length) {
    // 모두 해제됨 → 동기화 기록 제거
    if(existing) { ds.logData=ds.logData.filter(l=>l._syncId!==syncId); }
    return;
  }
  const entry = {
    _syncId: syncId,
    datetime: date+'T00:00',
    categories: takenSuppl.length ? ['투약'] : [],
    memo: '[🍼 임신준비 연동] '+parts.join(' | '),
    who: '',
  };
  if(exercise) entry.categories.push('운동');
  if(existing) {
    Object.assign(existing, entry);
  } else {
    entry.id = Date.now();
    ds.logData.push(entry);
    ds.logData.sort((a,b)=>a.datetime.localeCompare(b.datetime));
  }
}

async function brkSetMeals(n) {
  var r = _getBrkWhoData(); if (!r) return;
  // meals는 항상 orangi
  if (!r.m.dailyChecks[r.selDate].orangi) r.m.dailyChecks[r.selDate].orangi = {};
  r.m.dailyChecks[r.selDate].orangi.meals = n;
  await saveBrkMaster();
  renderView('meds');
}

async function brkSetWeight(val) {
  var r = _getBrkWhoData(); if (!r) return;
  if (!r.m.dailyChecks[r.selDate].orangi) r.m.dailyChecks[r.selDate].orangi = {};
  r.m.dailyChecks[r.selDate].orangi.weight = parseFloat(val) || null;
  await saveBrkMaster();
  renderView('meds');
}

async function brkSetExercise(val) {
  var r = _getBrkWhoData(); if (!r) return;
  r.whoData.exercise = val;
  await saveBrkMaster();
  renderView('meds');
}

async function brkToggleAlcohol() {
  // 음주는 항상 붕쌤 전용 (orangi 무관)
  var r = _getBrkWhoData(); if (!r) return;
  if (!r.m.dailyChecks[r.selDate].bung) r.m.dailyChecks[r.selDate].bung = {};
  r.m.dailyChecks[r.selDate].bung.alcohol = !r.m.dailyChecks[r.selDate].bung.alcohol;
  await saveBrkMaster();
  renderView('meds');
}

async function brkSetTreatmentType(val) {
  var r = _getBrkWhoData(); if (!r) return;
  r.whoData.treatmentType = val;
  await saveBrkMaster();
  renderView('meds');
}

async function brkSetTreatment(val) {
  var r = _getBrkWhoData(); if (!r) return;
  r.whoData.treatment = val || null;
  await saveBrkMaster();
}

async function brkSetMemo(val) {
  var r = _getBrkWhoData(); if (!r) return;
  r.whoData.memo = val || null;
  await saveBrkMaster();
}

// ── 7-3: 검사 결과 관리 ──

// 정액검사 WHO 정상 범위
const _SEMEN_NORMS={volume:{min:1.5,unit:'mL',label:'Volume'},count:{min:15,unit:'M/mL',label:'Count'},motility:{min:42,unit:'%',label:'Motility'},morphology:{min:4,unit:'%',label:'Morphology'}};

function _semenGrade(vals) {
  if(!vals) return {grade:'-',color:'var(--mu)',issues:[]};
  const issues=[];
  if(vals.morphology!==undefined&&vals.morphology<4) issues.push('형태↓');
  if(vals.motility!==undefined&&vals.motility<42) issues.push('운동성↓');
  if(vals.count!==undefined&&vals.count<15) issues.push('농도↓');
  if(vals.volume!==undefined&&vals.volume<1.5) issues.push('양↓');
  if(!issues.length) return {grade:'정상',color:'#10b981',issues:[]};
  if(issues.length===1) return {grade:'경미',color:'#f59e0b',issues};
  return {grade:'주의',color:'#dc2626',issues};
}

// 자연임신 확률 다중 모델 추정
function estimateConceptionRate(m) {
  const cycles=m.menstrualCycles||[];
  const labs=m.labResults||[];
  const semenLabs=labs.filter(l=>l.type==='semen'&&l.values).sort((a,b)=>b.date.localeCompare(a.date));
  const sv=semenLabs[0]?.values;
  // 주기 분석
  const sorted=[...cycles].sort((a,b)=>a.startDate.localeCompare(b.startDate));
  const lens=[];
  for(let i=0;i<sorted.length-1;i++){const d=Math.round((new Date(sorted[i+1].startDate+'T00:00:00')-new Date(sorted[i].startDate+'T00:00:00'))/86400000);if(d>0&&d<60)lens.push(d);}
  const cycleStd=lens.length>=3?Math.sqrt(lens.reduce((s,v)=>s+Math.pow(v-lens.reduce((a,b)=>a+b,0)/lens.length,2),0)/lens.length):0;
  const avgCycle=lens.length?lens.reduce((a,b)=>a+b,0)/lens.length:30;

  // === 모델 1: WHO/Hunault 간이 모델 ===
  const factors1=[];
  let r1=25; // 건강한 커플 기저 (Gnoth 2003: 주기당 ~25%)
  if(sv){
    if(sv.morphology!==undefined&&sv.morphology<4){r1*=0.55;factors1.push({name:'형태<4%',impact:-45,tip:'항산화제(CoQ10 200mg, 비타민E, 아연) 3개월 복용'});}
    if(sv.motility!==undefined&&sv.motility<42){r1*=0.65;factors1.push({name:'운동성<42%',impact:-35,tip:'금주·금연, 규칙적 운동, 꽉 끼는 속옷 회피'});}
    if(sv.count!==undefined&&sv.count<15){r1*=0.45;factors1.push({name:'농도<15M',impact:-55,tip:'비뇨기과 정밀검사 권장'});}
    if(sv.count!==undefined&&sv.count>=15&&sv.motility!==undefined&&sv.motility>=42&&(sv.morphology===undefined||sv.morphology>=4)){factors1.push({name:'정액검사 정상',impact:0,tip:'양호'});}
  } else {factors1.push({name:'정액검사 미실시',impact:0,tip:'검사 추가 시 정확도 향상'});}
  if(cycleStd>7){r1*=0.7;factors1.push({name:'주기 불규칙(±'+cycleStd.toFixed(1)+'일)',impact:-30,tip:'배란일 예측 정확도↓, 배란테스트기(LH strip) 병행 권장'});}
  else if(lens.length>=3){factors1.push({name:'주기 규칙적(±'+cycleStd.toFixed(1)+'일)',impact:0,tip:'배란 예측 유리'});}
  r1=Math.round(Math.max(3,Math.min(r1,30)));

  // === 모델 2: TMSC(Total Motile Sperm Count) 기반 ===
  let r2=null,tmsc=null;
  if(sv&&sv.count!==undefined&&sv.motility!==undefined&&sv.volume!==undefined){
    tmsc=Math.round(sv.volume*sv.count*(sv.motility/100));
    // Ayala 2003 + Hamilton 2015 + van Weert 2021: TMSC 구간별 자연임신율
    if(tmsc>=20) r2=25;
    else if(tmsc>=9) r2=18;
    else if(tmsc>=5) r2=10;
    else if(tmsc>=1) r2=5;
    else r2=2;
  }

  // === 모델 3: 나이 기반 기저율 (여성 나이 — SSOT에서) ===
  // 간이: 28세 기준 ~25%, 데이터 없으면 기본값 사용
  const r3=25; // 28세 여성 기준

  // 일별 확률 (배란일 기준 Wilcox 1995 + Dunson 2002 + 2019 앱기반 코호트 보정)
  const dailyRates=[
    {day:-5,rate:4},{day:-4,rate:8},{day:-3,rate:14},{day:-2,rate:27},{day:-1,rate:31},{day:0,rate:12},{day:1,rate:1}
  ];
  // 보정: 정액검사 결과 반영
  const semenMult=sv?(r1/25):1;
  const adjDaily=dailyRates.map(d=>({...d,adjRate:Math.round(Math.max(0,d.rate*semenMult))}));

  return {monthly:r1,tmsc,tmscRate:r2,ageRate:r3,factors:factors1,dailyRates:adjDaily,cycleStd,avgCycle,hasSemen:!!sv};
}

function _renderConceptionCard(m) {
  const r=estimateConceptionRate(m);
  const rate=r.monthly;
  const rateColor=rate>=20?'#10b981':rate>=12?'#f59e0b':'#dc2626';

  // 비교 모델 표
  let modelRows=`<div style="font-size:.68rem;font-weight:600;color:var(--mu);margin-top:8px;margin-bottom:4px">📊 추정 모델 비교</div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;margin-bottom:8px">
      <div style="background:${rateColor}10;border:1px solid ${rateColor}40;border-radius:6px;padding:6px;text-align:center">
        <div style="font-size:.55rem;color:var(--mu)">WHO/Hunault</div>
        <div style="font-size:.88rem;font-weight:700;color:${rateColor}">${rate}%</div>
      </div>`;
  if(r.tmscRate!==null){
    const tc=r.tmscRate>=20?'#10b981':r.tmscRate>=10?'#f59e0b':'#dc2626';
    modelRows+=`<div style="background:${tc}10;border:1px solid ${tc}40;border-radius:6px;padding:6px;text-align:center">
      <div style="font-size:.55rem;color:var(--mu)">TMSC(${r.tmsc}M)</div>
      <div style="font-size:.88rem;font-weight:700;color:${tc}">${r.tmscRate}%</div>
    </div>`;
  } else {
    modelRows+=`<div style="background:var(--sf2);border:1px solid var(--bd);border-radius:6px;padding:6px;text-align:center">
      <div style="font-size:.55rem;color:var(--mu)">TMSC</div>
      <div style="font-size:.75rem;color:var(--mu2)">검사 필요</div>
    </div>`;
  }
  modelRows+=`<div style="background:var(--sf2);border:1px solid var(--bd);border-radius:6px;padding:6px;text-align:center">
    <div style="font-size:.55rem;color:var(--mu)">연령 기저율</div>
    <div style="font-size:.88rem;font-weight:700">${r.ageRate}%</div>
  </div></div>`;

  // 영향 요소
  const factorsHtml=r.factors.length?`<div style="font-size:.68rem;font-weight:600;color:var(--mu);margin-bottom:4px">📋 영향 요소</div>
    ${r.factors.map(f=>{
      const ic=f.impact<0?'🔻':'✅';
      const col=f.impact<0?'#dc2626':'#10b981';
      return `<div style="display:flex;align-items:start;gap:6px;padding:3px 0;font-size:.68rem">
        <span>${ic}</span>
        <div><span style="font-weight:600;color:${col}">${f.name}</span>${f.impact?` (${f.impact}%)`:''}<br>
        <span style="color:var(--mu)">→ ${f.tip}</span></div>
      </div>`;
    }).join('')}`:'';

  // 일별 확률 (배란일 기준)
  const maxD=Math.max(...r.dailyRates.map(d=>d.adjRate),1);
  const dailyHtml=`<div style="font-size:.68rem;font-weight:600;color:var(--mu);margin-top:8px;margin-bottom:4px">📅 배란일 기준 일별 임신 확률 <span style="font-weight:400;font-size:.6rem">(Wilcox 1995)</span></div>
    <div style="display:flex;align-items:flex-end;gap:3px;height:50px;margin-bottom:2px">
      ${r.dailyRates.map(d=>{
        const h=Math.max(3,Math.round(d.adjRate/maxD*44));
        const col=d.day===-1||d.day===-2?'#ec4899':d.adjRate>0?'#f59e0b':'var(--bd)';
        return `<div style="flex:1;text-align:center">
          <div style="font-size:.5rem;color:${col};font-weight:600">${d.adjRate}%</div>
          <div style="height:${h}px;background:${col};border-radius:3px 3px 0 0;margin:0 auto;width:65%"></div>
          <div style="font-size:.5rem;color:var(--mu)">${d.day>=0?'D+'+d.day:'D'+d.day}</div>
        </div>`;
      }).join('')}
    </div>
    <div style="font-size:.55rem;color:var(--mu2);text-align:center">D-2~D-1이 가장 높음 (배란 전 1~2일)</div>`;

  // 레퍼런스
  const refHtml=`<div style="margin-top:8px;padding:6px 8px;background:var(--sf);border-radius:6px;font-size:.58rem;color:var(--mu2)">
    <div style="font-weight:600;margin-bottom:2px">📚 참고 문헌</div>
    <div style="margin-bottom:4px;font-weight:600">월간 임신율</div>
    • Gnoth et al. (2003) Hum Reprod 18(9) — 주기당 자연임신율 ~25%<br>
    • Wesselink et al. (2024) AJOG PRESTO 코호트 — 연령별 fecundability 최신 데이터<br>
    <div style="margin-top:4px;margin-bottom:4px;font-weight:600">일별 확률 (가임기 윈도우)</div>
    • Wilcox et al. (1995) NEJM 333(23) — 배란일 기준 일별 확률 원본<br>
    • Dunson et al. (2002) Hum Reprod — 일별 확률 베이지안 보정<br>
    • Bull et al. (2019) Fertil Steril 앱 기반 코호트(225,596주기) — 확인 연구<br>
    • Manders et al. (2023) Cochrane — Timed intercourse 메타분석<br>
    <div style="margin-top:4px;margin-bottom:4px;font-weight:600">정액검사·TMSC</div>
    • WHO (2021) 정액검사 정상 하한치 6th edition<br>
    • Ayala et al. (2003) Fertil Steril — TMSC-임신율 상관<br>
    • Hamilton et al. (2015) Fertil Steril — TMSC 임계값 정밀화<br>
    • van Weert et al. (2021) Fertil Steril — TMSC ≥9M 최적, 점진적 감소 확인<br>
    • Mazzilli et al. (2025) — TMSC와 ICSI 수정률 상관<br>
    <div style="margin-top:6px;padding:4px 6px;background:#fef2f2;border-radius:4px;color:#dc2626">
    ⚠️ 간이 추정치이며 의학적 진단을 대체하지 않습니다.<br>
    실제 확률은 나이, 불임 기간, 기저 질환, 타이밍 등에 따라 크게 달라집니다.<br>
    정확한 평가는 생식의학과 전문의 상담을 권장합니다.
    </div>
  </div>`;

  return `<div style="background:${rateColor}08;border:1.5px solid ${rateColor}30;border-radius:10px;padding:12px;margin-bottom:10px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <span style="font-size:1.3rem">🍀</span>
      <div>
        <div style="font-size:.7rem;color:var(--mu)">추정 월간 자연임신 확률</div>
        <div style="font-size:1.2rem;font-weight:700;color:${rateColor}">${rate}%<span style="font-size:.65rem;font-weight:400;color:var(--mu);margin-left:6px">/ 주기</span></div>
      </div>
    </div>
    ${modelRows}
    ${factorsHtml}
    ${dailyHtml}
    <div style="font-size:.6rem;color:var(--ac);cursor:pointer;margin-top:6px" onclick="const d=this.nextElementSibling;d.style.display=d.style.display==='none'?'block':'none'">▸ 계산 근거 및 참고 문헌</div>
    <div style="display:none">${refHtml}</div>
  </div>`;
}

function renderLabResults() {
  var m = getBrkMaster(); if (!m) return '<div class="hint">로딩 중...</div>';
  var labs = m.labResults.slice().sort(function(a,b){return b.date.localeCompare(a.date);});

  var typeLabels = {semen:'정액검사',blood:'혈액검사',hormone:'호르몬검사',ultrasound:'초음파',other:'기타'};
  var typeIcons = {semen:'🔬',blood:'🩸',hormone:'⚗️',ultrasound:'📷',other:'📋'};

  // 임신확률 카드
  const rateHtml=_renderConceptionCard(m);

  // 검사 목록 — 요약 카드 + 접기
  var listHtml = labs.map(function(l,i){
    // 요약 한 줄
    let summary='';
    if(l.type==='semen'&&l.values) {
      const g=_semenGrade(l.values);
      const vals=['Vol '+(l.values.volume||'-'),'Count '+(l.values.count||'-'),'Mot '+(l.values.motility||'-')+'%','Morph '+(l.values.morphology||'-')+'%'].join(' · ');
      summary=`<span style="font-weight:600;color:${g.color}">${g.grade}</span> ${vals}${g.issues.length?' <span style="color:#dc2626;font-size:.65rem">('+g.issues.join(', ')+')</span>':''}`;
    } else if(l.values&&typeof l.values==='object') {
      summary=Object.entries(l.values).slice(0,4).map(([k,v])=>k+':'+v).join(' · ');
    }

    return `<div style="padding:8px 10px;background:var(--sf2);border:1.5px solid var(--bd);border-radius:8px;margin-bottom:5px">
      <div style="display:flex;align-items:center;gap:6px">
        <span>${typeIcons[l.type]}</span>
        <span style="font-size:.78rem;font-weight:600">${typeLabels[l.type]}</span>
        <span class="log-tag" style="background:#dbeafe;color:#1d4ed8;font-size:.6rem">${esc(l.who||'')}</span>
        <span style="font-size:.68rem;color:var(--mu);margin-left:auto">${esc(l.date)}</span>
        <button class="accum-del" onclick="brkDeleteLab(${i})" title="삭제">🗑</button>
      </div>
      <div style="font-size:.72rem;color:var(--tx);margin-top:4px">${summary}</div>
      ${l.memo?`<div style="margin-top:4px">
        <div style="font-size:.62rem;color:var(--ac);cursor:pointer" onclick="const d=this.nextElementSibling;d.style.display=d.style.display==='none'?'block':'none'">▸ 상세 보기</div>
        <div style="display:none;font-size:.68rem;color:var(--mu);margin-top:4px;padding:6px;background:var(--sf);border-radius:6px;white-space:pre-wrap">${esc(l.memo)}</div>
      </div>`:''}
    </div>`;
  }).join('');

  // 정액검사 추세 차트 (수치별 색상 바)
  var semenLabs = labs.filter(function(l){return l.type==='semen'&&l.values;}).reverse();
  var trendHtml = '';
  if (semenLabs.length >= 2) {
    const metrics=[
      {key:'count',label:'농도(M/mL)',norm:15,color:'#3b82f6'},
      {key:'motility',label:'운동성(%)',norm:42,color:'#10b981'},
      {key:'morphology',label:'형태(%)',norm:4,color:'#f59e0b'},
    ];
    const rows=metrics.map(mt=>{
      const vals=semenLabs.map(s=>s.values[mt.key]||0);
      const max=Math.max(...vals,mt.norm)*1.2;
      return `<div style="margin-bottom:8px">
        <div style="font-size:.62rem;color:var(--mu);margin-bottom:2px">${mt.label} (정상≥${mt.norm})</div>
        <div style="display:flex;align-items:flex-end;gap:3px;height:40px">
          ${semenLabs.map((s,j)=>{
            const v=s.values[mt.key]||0;
            const h=Math.max(4,Math.round(v/max*36));
            const ok=v>=mt.norm;
            return `<div style="flex:1;text-align:center">
              <div style="font-size:.5rem;color:${ok?mt.color:'#dc2626'};font-weight:600">${v}</div>
              <div style="height:${h}px;background:${ok?mt.color:'#fca5a5'};border-radius:3px 3px 0 0;margin:0 auto;width:60%"></div>
              <div style="font-size:.45rem;color:var(--mu2)">${s.date.slice(5)}</div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
    }).join('');
    trendHtml=`<div style="margin-top:10px;padding:10px;background:var(--sf2);border-radius:8px;border:1px solid var(--bd)">
      <div style="font-size:.75rem;font-weight:600;color:var(--mu);margin-bottom:6px">📈 정액검사 추세</div>${rows}</div>`;
  }

  return '<div>'
    + rateHtml
    + '<div style="display:flex;gap:6px;margin-bottom:10px">'
    + '<button class="btn-accum-add" onclick="brkOpenLabForm()" style="font-size:.75rem">+ 검사 결과 추가</button>'
    + '<button onclick="document.getElementById(\'brk-lab-photo\').click()" style="background:none;border:1.5px solid var(--bd);border-radius:6px;padding:5px 12px;font-size:.72rem;cursor:pointer;color:var(--mu)">📷 검사결과 사진 분석</button>'
    + '<input type="file" id="brk-lab-photo" accept="image/*" style="display:none" onchange="brkProcessLabPhoto(this)">'
    + '</div>'
    + '<div id="brk-lab-form" style="display:none;margin-bottom:12px;padding:12px;background:var(--sf2);border-radius:8px;border:1.5px solid var(--bd)">'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap">'
    + '<div><div class="dx-form-label">날짜 *</div><input type="date" id="brk-lab-date" class="dx-form-input" style="width:140px"></div>'
    + '<div><div class="dx-form-label">누구</div><select id="brk-lab-who" class="dx-form-input" style="width:90px"><option value="붕쌤">붕쌤</option><option value="오랑이">오랑이</option></select></div>'
    + '<div><div class="dx-form-label">검사 종류</div><select id="brk-lab-type" class="dx-form-input" style="width:120px" onchange="brkLabTypeChange()">'
    + '<option value="semen">🔬 정액검사</option><option value="blood">🩸 혈액검사</option><option value="hormone">⚗️ 호르몬</option><option value="ultrasound">📷 초음파</option><option value="other">📋 기타</option>'
    + '</select></div></div>'
    + '<div id="brk-lab-fields" style="margin-top:8px">' + brkLabFieldsFor('semen') + '</div>'
    + '<div style="margin-top:8px"><div class="dx-form-label">메모</div><input type="text" id="brk-lab-memo" class="dx-form-input" placeholder="소견, 특이사항"></div>'
    + '<div style="margin-top:8px;display:flex;gap:8px">'
    + '<button class="btn-accum-add" onclick="brkSaveLab()">💾 저장</button>'
    + '<button class="btn-cancel" onclick="document.getElementById(\'brk-lab-form\').style.display=\'none\'" style="font-size:.78rem">취소</button>'
    + '</div></div>'
    + _renderLabsByPerson(labs, typeLabels, typeIcons)
    + trendHtml
    + '</div>';
}

function _renderLabsByPerson(labs, typeLabels, typeIcons) {
  const bung=labs.filter(l=>(l.who||'')==='붕쌤');
  const orangi=labs.filter(l=>(l.who||'')==='오랑이');
  const other=labs.filter(l=>l.who!=='붕쌤'&&l.who!=='오랑이');
  const renderGroup=(title,icon,color,items)=>{
    if(!items.length) return '';
    return `<div style="margin-bottom:10px">
      <div style="display:flex;align-items:center;gap:6px;padding:6px 0;border-bottom:2px solid ${color}">
        <span style="font-size:.85rem">${icon}</span>
        <span style="font-size:.78rem;font-weight:700;color:${color}">${title}</span>
        <span style="font-size:.62rem;color:var(--mu)">${items.length}건</span>
      </div>
      ${items.map((l,i)=>_renderLabCard(l,labs.indexOf(l),typeLabels,typeIcons)).join('')}
    </div>`;
  };
  return renderGroup('붕쌤','🩵','#06b6d4',bung)
    + renderGroup('오랑이','🧡','#f97316',orangi)
    + (other.length?renderGroup('기타','📋','var(--mu)',other):'');
}

function _renderLabCard(l, globalIdx, typeLabels, typeIcons) {
  let summary='', interpret='';
  if(l.type==='semen'&&l.values) {
    const g=_semenGrade(l.values);
    const vals=['Vol '+(l.values.volume||'-'),'Count '+(l.values.count||'-'),'Mot '+(l.values.motility||'-')+'%','Morph '+(l.values.morphology||'-')+'%'].join(' · ');
    summary=`<span style="font-weight:600;color:${g.color}">${g.grade}</span> ${vals}${g.issues.length?' <span style="color:#dc2626;font-size:.65rem">('+g.issues.join(', ')+')</span>':''}`;
    // 해석 한 줄
    if(!g.issues.length) interpret='전 항목 WHO 정상 범위 — 자연임신에 유리';
    else if(g.issues.includes('형태↓')&&g.issues.length===1) interpret='기형정자증 소견 — 형태 개선 위해 항산화제(CoQ10, 비타민E) 권장, 3개월 후 재검';
    else if(g.issues.includes('운동성↓')&&g.issues.length===1) interpret='정자 운동성 저하 — 생활습관 개선(금주, 운동) 후 재검 권장';
    else if(g.issues.includes('농도↓')&&g.issues.length===1) interpret='정자 농도 저하 — 비뇨기과 정밀검사 권장';
    else interpret='복합 이상 소견 — 비뇨기과 상담 및 IUI/ICSI 등 보조생식술 검토 권장';
  } else if(l.type==='hormone'&&l.values) {
    const parts=[];
    if(l.values.AMH!==undefined) parts.push(l.values.AMH>=1.0?'AMH 정상':'AMH 저하→난소 예비력 감소');
    if(l.values.FSH!==undefined) parts.push(l.values.FSH<=10?'FSH 정상':'FSH 상승→난소기능 확인 필요');
    if(l.values.TSH!==undefined) parts.push(l.values.TSH<=4.0?'TSH 정상':'TSH 이상→갑상선 확인');
    summary=Object.entries(l.values).map(([k,v])=>k+':'+v).join(' · ');
    interpret=parts.join(' · ')||'수치 확인 필요';
  } else if(l.type==='blood'&&l.values) {
    const parts=[];
    if(l.values.Hb!==undefined) parts.push(l.values.Hb>=12?'Hb 정상':'Hb 저하→빈혈');
    if(l.values.AST!==undefined||l.values.ALT!==undefined) {
      const ast=l.values.AST||0,alt=l.values.ALT||0;
      parts.push(ast<=40&&alt<=40?'간기능 정상':'간수치 상승→확인 필요');
    }
    summary=Object.entries(l.values).map(([k,v])=>k+':'+v).join(' · ');
    interpret=parts.join(' · ')||'';
  } else if(l.values&&typeof l.values==='object') {
    summary=Object.entries(l.values).slice(0,4).map(([k,v])=>k+':'+v).join(' · ');
  }
  return `<div style="padding:7px 10px;background:var(--sf2);border:1px solid var(--bd);border-radius:6px;margin-top:4px">
    <div style="display:flex;align-items:center;gap:6px">
      <span style="font-size:.72rem">${typeIcons[l.type]}</span>
      <span style="font-size:.75rem;font-weight:600">${typeLabels[l.type]}</span>
      <span style="font-size:.65rem;color:var(--mu);margin-left:auto">${esc(l.date)}</span>
      <button class="accum-del" onclick="brkDeleteLab(${globalIdx})" title="삭제">🗑</button>
    </div>
    <div style="font-size:.7rem;color:var(--tx);margin-top:3px">${summary}</div>
    ${interpret?`<div style="font-size:.65rem;color:#0369a1;margin-top:2px">💡 ${esc(interpret)}</div>`:''}
    ${l.memo?`<div style="margin-top:3px">
      <div style="font-size:.6rem;color:var(--ac);cursor:pointer" onclick="const d=this.nextElementSibling;d.style.display=d.style.display==='none'?'block':'none'">▸ 상세</div>
      <div style="display:none;font-size:.65rem;color:var(--mu);margin-top:3px;padding:5px;background:var(--sf);border-radius:5px;white-space:pre-wrap">${esc(l.memo)}</div>
    </div>`:''}
  </div>`;
}

function brkLabFieldsFor(type) {
  if (type === 'semen') {
    return '<div style="display:flex;gap:8px;flex-wrap:wrap">'
      + '<div><div class="dx-form-label">Volume (mL)</div><input type="number" step="0.1" id="brk-lab-v-volume" class="dx-form-input" style="width:80px"></div>'
      + '<div><div class="dx-form-label">Count (M/mL)</div><input type="number" step="0.1" id="brk-lab-v-count" class="dx-form-input" style="width:90px"></div>'
      + '<div><div class="dx-form-label">Motility (%)</div><input type="number" step="0.1" id="brk-lab-v-motility" class="dx-form-input" style="width:90px"></div>'
      + '<div><div class="dx-form-label">Morphology (%)</div><input type="number" step="0.1" id="brk-lab-v-morphology" class="dx-form-input" style="width:100px"></div>'
      + '</div>';
  } else if (type === 'hormone') {
    return '<div style="display:flex;gap:8px;flex-wrap:wrap">'
      + ['FSH','LH','E2','AMH','TSH','Prolactin'].map(function(h){
        return '<div><div class="dx-form-label">'+h+'</div><input type="number" step="0.01" id="brk-lab-v-'+h+'" class="dx-form-input" style="width:80px"></div>';
      }).join('')
      + '</div>';
  } else if (type === 'blood') {
    return '<div style="display:flex;gap:8px;flex-wrap:wrap">'
      + ['Hb','WBC','PLT','AST','ALT'].map(function(h){
        return '<div><div class="dx-form-label">'+h+'</div><input type="number" step="0.1" id="brk-lab-v-'+h+'" class="dx-form-input" style="width:80px"></div>';
      }).join('')
      + '</div>';
  } else {
    return '<div><div class="dx-form-label">소견/수치</div><textarea id="brk-lab-v-text" class="dx-form-ta" rows="2" placeholder="자유 입력"></textarea></div>';
  }
}

function brkLabTypeChange() {
  var type = document.getElementById('brk-lab-type').value;
  var el = document.getElementById('brk-lab-fields');
  if (el) el.innerHTML = brkLabFieldsFor(type);
}

function brkOpenLabForm() {
  var f = document.getElementById('brk-lab-form');
  if (f) { f.style.display = 'block'; document.getElementById('brk-lab-date').value = kstToday(); }
}

async function brkSaveLab() {
  var m = getBrkMaster(); if (!m) return;
  var date = document.getElementById('brk-lab-date').value;
  if (!date) { alert('날짜를 입력하세요'); return; }
  var who = document.getElementById('brk-lab-who').value;
  var type = document.getElementById('brk-lab-type').value;
  var memo = document.getElementById('brk-lab-memo').value || '';

  var values = {};
  if (type === 'semen') {
    ['volume','count','motility','morphology'].forEach(function(k){
      var el = document.getElementById('brk-lab-v-'+k);
      if (el && el.value) values[k] = parseFloat(el.value);
    });
  } else if (type === 'hormone') {
    ['FSH','LH','E2','AMH','TSH','Prolactin'].forEach(function(k){
      var el = document.getElementById('brk-lab-v-'+k);
      if (el && el.value) values[k] = parseFloat(el.value);
    });
  } else if (type === 'blood') {
    ['Hb','WBC','PLT','AST','ALT'].forEach(function(k){
      var el = document.getElementById('brk-lab-v-'+k);
      if (el && el.value) values[k] = parseFloat(el.value);
    });
  } else {
    var textEl = document.getElementById('brk-lab-v-text');
    if (textEl && textEl.value) values.text = textEl.value;
  }

  m.labResults.push({ id: Date.now(), date: date, who: who, type: type, values: values, memo: memo });
  await saveBrkMaster();
  renderView('meds');
  showToast('검사 결과 저장됨');
}

// 📷 검사결과 사진 AI 분석
async function brkProcessLabPhoto(input) {
  if(!input.files||!input.files[0]) return;
  const file=input.files[0];
  const aiId=S.keys?.claude?'claude':(S.keys?.gpt?'gpt':null);
  if(!aiId){showToast('⚠️ AI API 키가 필요합니다 (Claude 또는 GPT)');return;}
  showToast('📷 검사결과 분석 중...',6000);
  try {
    const reader=new FileReader();
    reader.onload=async function(e){
      const base64=e.target.result.split(',')[1];
      const mediaType=file.type||'image/jpeg';
      const prompt=`이 이미지는 의료 검사 결과지(혈액검사, 호르몬검사, 정액검사, 초음파 등)입니다.

다음을 추출하세요:
1. 검사 종류 (semen/blood/hormone/ultrasound/other)
2. 검사 날짜 (YYYY-MM-DD)
3. 검사 대상 (남성이면 "붕쌤", 여성이면 "오랑이")
4. 수치 결과 (항목명: 수치)
5. 정상 범위 대비 이상 여부
6. 임신 준비 관점에서의 소견

반드시 아래 JSON으로 응답:
{"type":"semen","date":"2026-04-06","who":"붕쌤","values":{"항목":"수치"},"abnormal":["이상 항목 설명"],"opinion":"임신준비 관점 소견"}`;
      let result='';
      if(aiId==='claude'){
        const resp=await fetchWithRetry('https://api.anthropic.com/v1/messages',{
          method:'POST',
          headers:{'Content-Type':'application/json','x-api-key':S.keys.claude,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
          body:JSON.stringify({model:S.models?.claude||DEFAULT_MODELS.claude,max_tokens:1500,messages:[{role:'user',content:[
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
          body:JSON.stringify({model:S.models?.gpt||DEFAULT_MODELS.gpt,max_tokens:1500,messages:[{role:'user',content:[
            {type:'image_url',image_url:{url:'data:'+mediaType+';base64,'+base64}},
            {type:'text',text:prompt}
          ]}]})
        });
        const data=await resp.json();
        result=data.choices?.[0]?.message?.content||'';
      }
      const jsonMatch=result.match(/\{[\s\S]*\}/);
      if(!jsonMatch){showToast('⚠️ 검사결과를 인식하지 못했습니다',3000);return;}
      const parsed=JSON.parse(jsonMatch[0]);
      // 결과를 인라인으로 표시
      const abnormalHtml=(parsed.abnormal||[]).length
        ?'<div style="margin-top:6px"><div style="font-size:.7rem;font-weight:600;color:#dc2626">⚠️ 이상 소견:</div>'+parsed.abnormal.map(a=>'<div style="font-size:.72rem;color:#dc2626;padding:2px 0">• '+esc(a)+'</div>').join('')+'</div>':'';
      const valuesHtml=parsed.values?Object.entries(parsed.values).map(([k,v])=>'<span class="log-tag" style="background:#eff6ff;color:#1d4ed8">'+esc(k)+': '+esc(String(v))+'</span>').join(' '):'';
      document.getElementById('confirm-title').textContent='📷 검사결과 분석';
      document.getElementById('confirm-body').innerHTML=`
        <div style="font-size:.78rem;margin-bottom:6px"><b>검사:</b> ${esc(parsed.type||'기타')} · <b>날짜:</b> ${esc(parsed.date||'미인식')} · <b>대상:</b> ${esc(parsed.who||'')}</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px">${valuesHtml}</div>
        ${abnormalHtml}
        ${parsed.opinion?'<div style="margin-top:8px;padding:8px;background:#f0fdf4;border-radius:6px;font-size:.75rem;color:#15803d"><b>💡 소견:</b> '+esc(parsed.opinion)+'</div>':''}
        <div style="margin-top:10px;font-size:.7rem;color:var(--mu)">위 내용을 검사결과로 저장하시겠습니까?</div>`;
      document.getElementById('confirm-foot').innerHTML=
        '<button class="btn-cancel" onclick="closeConfirmModal()" style="font-size:.78rem">취소</button>'+
        `<button class="btn-accum-add" onclick="brkSaveLabFromPhoto()">💾 저장</button>`;
      window._brkLabPhotoResult=parsed;
      openModal('confirm-modal');
    };
    reader.readAsDataURL(file);
  } catch(e){
    showToast('❌ 분석 실패: '+e.message,4000);
  }
  input.value='';
}

async function brkSaveLabFromPhoto() {
  const parsed=window._brkLabPhotoResult;
  if(!parsed) return;
  const m=getBrkMaster();if(!m) return;
  const typeMap={semen:'semen',blood:'blood',hormone:'hormone',ultrasound:'ultrasound'};
  const type=typeMap[parsed.type]||'other';
  const values=parsed.values||{};
  if(type==='other'&&parsed.opinion) values.text=(parsed.opinion||'');
  const memo=[
    ...(parsed.abnormal||[]).map(a=>'⚠️ '+a),
    parsed.opinion?'💡 '+parsed.opinion:''
  ].filter(Boolean).join('; ');
  m.labResults.push({id:Date.now(),date:parsed.date||kstToday(),who:parsed.who||'붕쌤',type,values,memo:'📷 사진분석: '+memo});
  await saveBrkMaster();
  closeConfirmModal();
  delete window._brkLabPhotoResult;
  renderView('meds');
  showToast('✅ 검사결과 저장됨');
}

async function brkDeleteLab(idx) {
  var m = getBrkMaster(); if (!m) return;
  var sorted = m.labResults.slice().sort(function(a,b){return b.date.localeCompare(a.date);});
  var target = sorted[idx];
  if (!target) return;
  m.labResults = m.labResults.filter(function(l){return l.id !== target.id;});
  await saveBrkMaster();
  renderView('meds');
  showToast('삭제됨');
}

// ── 7-4: 프리컨셉션 마일스톤 ──

function renderMilestones() {
  var m = getBrkMaster(); if (!m) return '<div class="hint">로딩 중...</div>';
  var ms = m.milestones || [];
  var done = ms.filter(function(x){return x.done;}).length;
  var total = ms.length;
  var pct = total ? Math.round(done/total*100) : 0;

  var whoGroups = {};
  ms.forEach(function(item,i){
    var w = item.who || '공통';
    if (!whoGroups[w]) whoGroups[w] = [];
    whoGroups[w].push({item:item,idx:i});
  });
  var whoColors = {오랑이:'#ec4899',붕쌤:'#06b6d4',공통:'#8b5cf6'};
  var whoEmoji = {오랑이:'🧡',붕쌤:'🩵',공통:'💑'};

  var groupHtml = Object.entries(whoGroups).map(function(entry){
    var who = entry[0], items = entry[1];
    var groupDone = items.filter(function(x){return x.item.done;}).length;
    return '<div style="margin-bottom:10px">'
      + '<div style="font-size:.78rem;font-weight:600;color:'+(whoColors[who]||'var(--mu)')+';margin-bottom:4px">'+(whoEmoji[who]||'')+' '+who+' ('+groupDone+'/'+items.length+')</div>'
      + items.map(function(x){
        var it = x.item, idx = x.idx;
        return '<div onclick="brkToggleMilestone('+idx+')" style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:'+(it.done?'#f0fdf4':'var(--sf)')+';border:1px solid '+(it.done?'#86efac':'var(--bd)')+';border-radius:6px;margin-bottom:3px;cursor:pointer">'
          + '<span style="font-size:1rem">'+(it.done?'✅':'⬜')+'</span>'
          + '<span style="font-size:.8rem;'+(it.done?'text-decoration:line-through;color:var(--mu)':'color:var(--tx)')+'">'+esc(it.label)+'</span>'
          + (it.doneDate?'<span style="font-size:.65rem;color:var(--mu);margin-left:auto">'+it.doneDate.slice(5)+'</span>':'')
          + '<button class="accum-del" onclick="event.stopPropagation();brkDeleteMilestone('+idx+')" title="삭제" style="margin-left:'+(it.doneDate?'4px':'auto')+'">🗑</button>'
          + '</div>';
      }).join('')
      + '</div>';
  }).join('');

  return '<div>'
    + '<div style="margin-bottom:12px">'
    + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">'
    + '<span style="font-size:.85rem;font-weight:700">'+done+'/'+total+' 완료</span>'
    + '<span style="font-size:.82rem;font-weight:600;color:'+(pct>=70?'#16a34a':pct>=40?'#f59e0b':'#ef4444')+'">'+pct+'%</span>'
    + '</div>'
    + '<div style="height:8px;background:var(--bd);border-radius:4px;overflow:hidden">'
    + '<div style="height:100%;width:'+pct+'%;background:linear-gradient(90deg,#16a34a,#4ade80);border-radius:4px;transition:width .3s"></div>'
    + '</div></div>'
    + groupHtml
    + '<div style="margin-top:10px;padding:10px;background:var(--sf2);border-radius:8px;border:1px solid var(--bd)">'
    + '<div style="font-size:.75rem;font-weight:600;color:var(--mu);margin-bottom:6px">+ 항목 추가</div>'
    + '<div style="display:flex;gap:6px">'
    + '<select id="brk-ms-who" class="dx-form-input" style="width:80px"><option value="오랑이">오랑이</option><option value="붕쌤">붕쌤</option><option value="공통">공통</option></select>'
    + '<input id="brk-ms-label" class="dx-form-input" placeholder="항목명" style="flex:1">'
    + '<button class="btn-accum-add" onclick="brkAddMilestone()" style="padding:6px 12px">추가</button>'
    + '</div></div>'
    + '</div>';
}

async function brkToggleMilestone(idx) {
  var m = getBrkMaster(); if (!m || !m.milestones[idx]) return;
  m.milestones[idx].done = !m.milestones[idx].done;
  m.milestones[idx].doneDate = m.milestones[idx].done ? kstToday() : null;
  await saveBrkMaster();
  renderView('meds');
}

async function brkDeleteMilestone(idx) {
  var m = getBrkMaster(); if (!m) return;
  m.milestones.splice(idx, 1);
  await saveBrkMaster();
  renderView('meds');
  showToast('삭제됨');
}

async function brkAddMilestone() {
  var m = getBrkMaster(); if (!m) return;
  var who = document.getElementById('brk-ms-who').value;
  var label = document.getElementById('brk-ms-label').value.trim();
  if (!label) { alert('항목명을 입력하세요'); return; }
  var maxId = m.milestones.reduce(function(mx,x){return Math.max(mx,x.id||0);},0);
  m.milestones.push({ id: maxId+1, who: who, label: label, done: false, doneDate: null });
  await saveBrkMaster();
  renderView('meds');
  showToast('항목 추가됨');
}

// ── 7-5: 약물 안전 등급 (3소스 교차검증) ──

function _fdaColor(g){
  if(!g||g==='?'||g==='N/A') return '#6b7280';
  if(g==='A') return '#16a34a';
  if(g==='B') return '#65a30d';
  if(g.startsWith('C')) return '#f59e0b';
  if(g.startsWith('D')||g.includes('D')) return '#ea580c';
  if(g.startsWith('X')||g.includes('X')) return '#dc2626';
  return '#6b7280';
}
function _fdaBg(g){
  if(!g||g==='?'||g==='N/A') return '#f9fafb';
  if(g==='A') return '#f0fdf4';
  if(g==='B') return '#f7fee7';
  if(g.startsWith('C')) return '#fffbeb';
  if(g.startsWith('D')||g.includes('D')) return '#fff7ed';
  if(g.startsWith('X')||g.includes('X')) return '#fef2f2';
  return '#f9fafb';
}
function _kfdaColor(k){
  if(k==='안전') return '#16a34a';
  if(k==='2등급') return '#f59e0b';
  if(k==='금기'||k?.includes('금기')) return '#dc2626';
  return '#6b7280';
}

function _lookupDrugSafety(name) {
  // 1) 내장 DB 직접 매칭
  var safety=_PREGNANCY_SAFETY[name];
  if(safety) return {...safety,source:'내장DB'};
  // 2) 한영 매핑 후 내장 DB
  var eng=_DRUG_NAMES[name];
  if(eng) { safety=_PREGNANCY_SAFETY[eng]; if(safety) return {...safety,source:'내장DB'}; }
  // 3) localStorage 캐시
  try {
    var cache=JSON.parse(localStorage.getItem('om_preg_drug_db')||'{}');
    if(cache[name]) return {...cache[name],source:'AI검색'};
    if(eng&&cache[eng]) return {...cache[eng],source:'AI검색'};
  } catch(e){}
  return null;
}

function _cacheDrugSafety(name, data) {
  try {
    var cache=JSON.parse(localStorage.getItem('om_preg_drug_db')||'{}');
    cache[name]={...data,searchedAt:new Date().toISOString()};
    localStorage.setItem('om_preg_drug_db',JSON.stringify(cache));
  } catch(e){}
}

async function fetchDrugSafetyPerplexity(drugName) {
  if(!S.keys?.perp){showToast('Perplexity API 키 필요');return null;}
  const prompt=`약물 '${drugName}'의 임신 안전성 정보를 JSON으로 반환하세요.
{"fda":"FDA등급(A/B/C/D/X)","pllr":"PLLR 요약(태아 위험 1-2문장)","kfda":"한국식약처(안전/2등급/금기 중 택1)","note":"핵심 요약 1문장"}
불확실하면 "정보부족". JSON만 출력.`;
  try {
    const r=await fetchWithRetry('https://api.perplexity.ai/chat/completions',{method:'POST',
      headers:{'Content-Type':'application/json',Authorization:'Bearer '+S.keys.perp},
      body:JSON.stringify({model:'sonar',max_tokens:300,messages:[{role:'user',content:prompt}]})});
    const d=await r.json();
    const text=d.choices?.[0]?.message?.content||'';
    const match=text.match(/\{[\s\S]*\}/);
    if(match){
      const parsed=JSON.parse(match[0]);
      _cacheDrugSafety(drugName,parsed);
      recordUsage('perp','sonar',d.usage?.prompt_tokens||0,d.usage?.completion_tokens||0);
      return parsed;
    }
  } catch(e){console.error('Drug safety Perplexity error:',e);}
  return null;
}

async function fetchDrugSafetyDUR(drugName) {
  try {
    const url=`https://apis.data.go.kr/1471000/DURPrdlstInfoService03/getPwnmTabooInfoList2?serviceKey=${_DRUG_API_KEY}&type=json&typeName=${encodeURIComponent(drugName)}&numOfRows=5`;
    const r=await fetchWithRetry(url,{},{signal:AbortSignal.timeout(3000)});
    const d=await r.json();
    const items=d?.body?.items||[];
    if(items.length) {
      const item=items[0];
      const grade=item.PRHIBT_CONTENT?.includes('1등급')?'금기':item.PRHIBT_CONTENT?.includes('2등급')?'2등급':'정보없음';
      return {kfda_dur:grade, detail:item.PRHIBT_CONTENT||''};
    }
  } catch(e){}
  return null;
}

async function refreshDrugSafety(drugName) {
  const el=document.getElementById('ds-loading-'+CSS.escape(drugName));
  if(el) el.style.display='inline';
  const result=await fetchDrugSafetyPerplexity(drugName);
  if(el) el.style.display='none';
  if(result){showToast('✅ '+drugName+' 안전 정보 갱신');renderView('meds');}
  else showToast('⚠️ 검색 실패');
}

function renderDrugSafety() {
  // Collect meds from ALL domains (붕룩이는 두 유저 모두의 약물을 봄)
  var allMeds = {};
  Object.entries(S.domainState).forEach(function(entry){
    var domainId = entry[0], ds = entry[1];
    var dd = DOMAINS[domainId];
    if (!dd || domainId === 'bungruki' || !ds.master?.conditions) return;
    ds.master.conditions.forEach(function(c){
      if (!c.medsList?.length || c.status === 'resolved') return;
      c.medsList.forEach(function(med){
        var baseName = med.replace(/\s*\d+\s*mg.*/i,'').replace(/\s*\(.*\)/,'').trim();
        if (!allMeds[baseName]) allMeds[baseName] = { domains: [], originalNames: [] };
        if (allMeds[baseName].domains.indexOf(dd.label) < 0) allMeds[baseName].domains.push(dd.label);
        if (allMeds[baseName].originalNames.indexOf(med) < 0) allMeds[baseName].originalNames.push(med);
      });
    });
  });

  var cards = Object.entries(allMeds).map(function(entry){
    var name = entry[0], info = entry[1];
    var safety = _lookupDrugSafety(name);
    var fda = safety?.fda || '?';
    var pllr = safety?.pllr || '';
    var kfda = safety?.kfda || '정보없음';
    var note = safety?.note || '';
    var source = safety?.source || '';
    var fc = _fdaColor(fda), fb = _fdaBg(fda), kc = _kfdaColor(kfda);

    var badges = '<div style="display:flex;gap:4px;margin-top:6px;flex-wrap:wrap">'
      + '<span style="padding:2px 8px;border-radius:10px;font-size:.68rem;font-weight:700;background:'+fc+'18;color:'+fc+';border:1px solid '+fc+'40">FDA: '+esc(fda)+'</span>'
      + '<span style="padding:2px 8px;border-radius:10px;font-size:.68rem;font-weight:600;background:'+kc+'18;color:'+kc+';border:1px solid '+kc+'40">식약처: '+esc(kfda)+'</span>'
      + (pllr?'<span style="padding:2px 8px;border-radius:10px;font-size:.68rem;background:#f0f9ff;color:#0369a1;border:1px solid #bae6fd">PLLR</span>':'')
      + '</div>';

    var detail = (pllr?'<div style="font-size:.72rem;color:#0369a1;margin-top:4px"><b>PLLR:</b> '+esc(pllr)+'</div>':'')
      + (note?'<div style="font-size:.72rem;color:var(--mu);margin-top:2px">'+esc(note)+'</div>':'');

    var srcLabel = source==='내장DB'?'<span style="font-size:.58rem;color:var(--mu2)">✓ 공식</span>'
      :source==='AI검색'?'<span style="font-size:.58rem;color:#f59e0b">🔍 AI검색 (확인 권장)</span>'
      :'<span style="font-size:.58rem;color:var(--mu2)">데이터 없음</span>';

    var refreshBtn = !safety?`<button onclick="refreshDrugSafety('${esc(name)}')" class="accum-del" style="font-size:.62rem;color:var(--ac)" title="Perplexity로 검색">🔍 검색</button>`
      :(source==='AI검색'?`<button onclick="refreshDrugSafety('${esc(name)}')" class="accum-del" style="font-size:.62rem;color:var(--mu)" title="재검색">🔄</button>`:'');

    return '<div style="padding:10px 12px;background:'+fb+';border:1.5px solid '+fc+'30;border-radius:8px;margin-bottom:6px">'
      + '<div style="display:flex;align-items:center;gap:8px">'
      + '<span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:'+fc+';color:white;font-size:.72rem;font-weight:700">'+fda.charAt(0)+'</span>'
      + '<div style="flex:1">'
      + '<div style="font-size:.82rem;font-weight:600">'+esc(info.originalNames[0])+'</div>'
      + '<div style="font-size:.68rem;color:var(--mu)">'+info.domains.join(', ')+'</div>'
      + '</div>'
      + srcLabel + refreshBtn
      + '<span id="ds-loading-'+esc(name)+'" style="display:none;font-size:.6rem;color:var(--ac)">검색중...</span>'
      + '</div>'
      + badges + detail
      + '</div>';
  }).join('');

  if (!cards) cards = '<div class="hint">교차 도메인에서 활성 약물이 없습니다.<br>다른 도메인에서 질환/투약을 등록하면 여기에 자동 표시됩니다.</div>';

  // Cache stats
  var cacheStats='';
  try {
    var cache=JSON.parse(localStorage.getItem('om_preg_drug_db')||'{}');
    var cacheCount=Object.keys(cache).length;
    var cacheSize=new Blob([JSON.stringify(cache)]).size;
    if(cacheCount) cacheStats='<div style="font-size:.62rem;color:var(--mu2);margin-top:8px;text-align:right">💾 캐시: '+cacheCount+'개 약물 · '+Math.round(cacheSize/1024)+'KB</div>';
  } catch(e){}

  return '<div>'
    + '<div style="font-size:.78rem;color:var(--mu);margin-bottom:10px">복용 중인 약물의 임신 안전성을 3개 소스로 교차 비교합니다.</div>'
    + '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:10px;font-size:.65rem">'
    + [['A','안전','#16a34a'],['B','대체로 안전','#65a30d'],['C','위험-이익','#f59e0b'],['D','위험','#ea580c'],['X','금기','#dc2626']].map(function(g){
      return '<span style="padding:2px 8px;border-radius:10px;background:'+g[2]+'15;color:'+g[2]+';border:1px solid '+g[2]+'30">'+g[0]+': '+g[1]+'</span>';
    }).join('')
    + '</div>'
    + '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px;font-size:.6rem;color:var(--mu2)">'
    + '<span>📊 3소스:</span> <span style="color:#16a34a">FDA</span> · <span style="color:#0369a1">PLLR</span> · <span style="color:#f59e0b">식약처</span>'
    + ' | <span>✓ 공식 = 내장DB</span> · <span>🔍 = AI검색(Perplexity)</span>'
    + '</div>'
    + cards
    + cacheStats
    + '</div>';
}

// ── 7-6: 메인 대시보드 렌더러 ──

function renderBungrukiDashboard() {
  var tabs = [
    {id:'cycle',label:'🩸 생리주기',color:'#dc2626'},
    {id:'daily',label:'✅ 일일체크',color:'#16a34a'},
    {id:'lab',label:'🔬 검사결과',color:'#2563eb'},
    {id:'milestone',label:'🏁 마일스톤',color:'#7c3aed'},
    {id:'safety',label:'💊 약물안전',color:'#ea580c'},
  ];

  var tabHtml = tabs.map(function(t){
    var isActive = _brkDashTab === t.id;
    return '<button onclick="_brkDashTab=\''+t.id+'\';renderView(\'meds\')" style="flex:1;padding:8px 4px;font-size:.72rem;font-weight:'+(isActive?'700':'400')+';background:'+(isActive?t.color+'15':'transparent')+';color:'+(isActive?t.color:'var(--mu)')+';border:none;border-bottom:2px solid '+(isActive?t.color:'transparent')+';cursor:pointer;font-family:var(--font);transition:all .2s">'+t.label+'</button>';
  }).join('');

  var contentHtml = '';
  if (_brkDashTab === 'cycle') contentHtml = renderCycleTracker();
  else if (_brkDashTab === 'daily') contentHtml = renderDailyChecks();
  else if (_brkDashTab === 'lab') contentHtml = renderLabResults();
  else if (_brkDashTab === 'milestone') contentHtml = renderMilestones();
  else if (_brkDashTab === 'safety') contentHtml = renderDrugSafety();

  return '<div class="card">'
    + '<div class="card-title">🍼 붕룩이 — 임신 준비 대시보드</div>'
    + '<div style="display:flex;border-bottom:1.5px solid var(--bd);margin:-2px -16px 12px;overflow-x:auto">'+tabHtml+'</div>'
    + contentHtml
    + '</div>';
}

// ── 7-7: 생리주기 → 편두통 교차 태그 ──

function getMenstrualTag() {
  var bds = S.domainState['bungruki'];
  if (!bds?.master?.menstrualCycles?.length) return null;
  var cycles = bds.master.menstrualCycles.slice().sort(function(a,b){return b.startDate.localeCompare(a.startDate);});
  var last = cycles[0];
  var today = kstToday();
  var diff = Math.round((new Date(today+'T00:00:00') - new Date(last.startDate+'T00:00:00')) / 86400000);
  if (diff >= 0 && diff <= 7) return '생리 D+' + diff;
  // Check fertile window
  var avgLen = getAvgCycleLength(cycles);
  var ovDate = getOvulationDate(last.startDate, avgLen);
  var ovDiff = Math.round((new Date(today+'T00:00:00') - new Date(ovDate+'T00:00:00')) / 86400000);
  if (ovDiff >= -3 && ovDiff <= 3) return '가임기';
  return null;
}

// ═══════════════════════════════════════════════════════════════
// BUNGRUKI TIMELINE (임신 준비 타임라인)
// ═══════════════════════════════════════════════════════════════
function renderBungrukiTimeline() {
  if(S.currentDomain!=='bungruki') return '';
  const ds=D();
  if(!ds.logData?.length) return '';
  const events=[...ds.logData].reverse().slice(0,30);
  if(!events.length) return '';

  const whoColors={오랑이:'#ec4899',붕쌤:'#06b6d4',함께:'#8b5cf6'};
  const whoSide={오랑이:'left',붕쌤:'right',함께:'center'};

  const items=events.map(l=>{
    const who=l.who||'함께';
    const side=whoSide[who]||'center';
    const cats=(l.categories||[]).join(', ');
    const color=whoColors[who]||'var(--mu)';
    return `<div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:12px;${side==='right'?'flex-direction:row-reverse':''}">
      <div style="flex:1;${side==='right'?'text-align:right':''}${side==='center'?';text-align:center':''}">
        <div style="font-size:.68rem;font-family:var(--mono);color:var(--mu)">${l.datetime.slice(0,10)}</div>
        <div style="font-size:.62rem;color:${color};font-weight:600">${who}</div>
        ${cats?`<div style="font-size:.65rem;color:var(--ac);margin-top:2px">${esc(cats)}</div>`:''}
        <div style="font-size:.78rem;margin-top:3px;line-height:1.5">${esc((l.memo||'').substring(0,100))}</div>
      </div>
      <div style="width:12px;display:flex;flex-direction:column;align-items:center;flex-shrink:0">
        <div style="width:10px;height:10px;border-radius:50%;background:${color};border:2px solid var(--sf)"></div>
        <div style="width:2px;flex:1;background:var(--bd)"></div>
      </div>
      <div style="flex:1"></div>
    </div>`;
  }).join('');

  return `<div class="card">
    <div class="card-title">🍼 붕룩이 타임라인</div>
    <div style="display:flex;gap:16px;justify-content:center;margin-bottom:10px;font-size:.68rem">
      <span style="color:#ec4899">● 오랑이</span>
      <span style="color:#06b6d4">● 붕쌤</span>
      <span style="color:#8b5cf6">● 함께</span>
    </div>
    ${items}
  </div>`;
}
