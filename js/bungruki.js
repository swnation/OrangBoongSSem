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

let _brkDashTab = 'cycle'; // cycle | daily | lab | vaccine | milestone | safety
let _brkDailyCat = 'suppl'; // suppl | exercise | treatment | memo
let _brkCalShowOrangi = true;
let _brkCalShowBung = true;

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
    // 일일 기록 아이콘 (오랑이/붕쌤 필터 적용)
    var dayIcons = '';
    var dc = dailyChecks && dailyChecks[ds];
    if (dc) {
      var ic = [];
      var oShow = typeof _brkCalShowOrangi!=='undefined'?_brkCalShowOrangi:true;
      var bShow = typeof _brkCalShowBung!=='undefined'?_brkCalShowBung:true;
      var oData = oShow&&dc.orangi?dc.orangi:{};
      var bData = bShow&&dc.bung?dc.bung:{};
      var allKeys = BRK_SUPPL_ORANGI.concat(BRK_SUPPL_BUNG);
      if (allKeys.some(function(k){return oData[k]||bData[k];})) ic.push('💊');
      if (dc.intimacy) ic.push('❤️');
      if (oData.exercise||bData.exercise) ic.push('🏃');
      if (oData.treatment||bData.treatment) ic.push('🏥');
      if (oData.memo||bData.memo) ic.push('📝');
      // 누구 기록인지 표시
      var whoMark='';
      var hasO=BRK_SUPPL_ORANGI.some(function(k){return oData[k];})||oData.exercise||oData.treatment||oData.memo;
      var hasB=BRK_SUPPL_BUNG.some(function(k){return bData[k];})||bData.exercise||bData.treatment||bData.memo;
      if(hasO&&hasB)whoMark='<span style="font-size:.35rem">🧡🩵</span>';
      else if(hasO)whoMark='<span style="font-size:.35rem">🧡</span>';
      else if(hasB)whoMark='<span style="font-size:.35rem">🩵</span>';
      if (ic.length) dayIcons = '<div style="font-size:.4rem;line-height:1;margin-top:1px">'+ic.join('')+whoMark+'</div>';
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
    + '<span>💊 영양제</span><span>❤️ 관계</span><span>🏃 운동</span><span>🏥 치료</span><span>📝 메모</span>'
    + '</div><div style="display:flex;gap:10px;margin-top:6px;align-items:center;font-size:.65rem;color:var(--mu)">'
    + '<span>필터:</span>'
    + '<label style="display:flex;align-items:center;gap:3px;cursor:pointer"><input type="checkbox" '+(_brkCalShowOrangi?'checked':'')+' onchange="_brkCalShowOrangi=this.checked;renderView(\'meds\')" style="accent-color:#f97316"> 🧡 오랑이</label>'
    + '<label style="display:flex;align-items:center;gap:3px;cursor:pointer"><input type="checkbox" '+(_brkCalShowBung?'checked':'')+' onchange="_brkCalShowBung=this.checked;renderView(\'meds\')" style="accent-color:#06b6d4"> 🩵 붕쌤</label>'
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
    {id:'intimacy',label:'❤️ 관계',color:'#e11d48'},
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
  else if (_brkDailyCat === 'intimacy') contentHtml = _brkRenderIntimacy(m, selDate);
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
var BRK_SUPPL_BUNG = ['arginine','coq10','silymarin','multivitamin'];

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
  ];
  // 사용자 추가 영양제 (클라우드 우선, localStorage 폴백)
  var who2=isOrangi?'orangi':'bung';
  var customs=_getBrkCustomSuppl(who2);
  if(isOrangi) customs.forEach(function(c){orangiItems.push({key:c.key,label:c.label,icon:'💊',custom:true});});
  else customs.forEach(function(c){bungItems.push({key:c.key,label:c.label,icon:'💊',custom:true});});
  // 숨긴 항목 필터링
  var hidden=_getBrkHiddenSuppl(who2);
  var allItems = isOrangi ? orangiItems : bungItems;
  var items = allItems.filter(function(it){ return hidden.indexOf(it.key)<0; });
  var hiddenItems = allItems.filter(function(it){ return hidden.indexOf(it.key)>=0; });

  var checkHtml = items.map(function(it) {
    var checked = whoData[it.key] ? true : false;
    return '<div style="display:flex;align-items:center;gap:0">'
      + '<div onclick="brkToggleCheck(\''+it.key+'\')" style="flex:1;display:flex;align-items:center;gap:10px;padding:10px 12px;background:'+(checked?'#f0fdf4':'var(--sf2)')+';border:1.5px solid '+(checked?'#86efac':'var(--bd)')+';border-radius:8px;cursor:pointer;transition:all .2s">'
      + '<span style="font-size:1.2rem">'+(checked?'✅':it.icon)+'</span>'
      + '<span style="font-size:.82rem;font-weight:'+(checked?'600':'400')+';color:'+(checked?'#16a34a':'var(--tx)')+'">'+it.label+'</span>'
      + '</div>'
      + '<button onclick="'+(it.custom?'_brkRemoveSuppl':'_brkHideSuppl')+'(\''+esc(it.key)+'\')" style="background:none;border:none;color:var(--mu2);cursor:pointer;font-size:.7rem;padding:4px 6px" title="'+(it.custom?'삭제':'숨기기')+'">✕</button>'
      + '</div>';
  }).join('');
  // 숨긴 항목 복원
  if(hiddenItems.length) {
    checkHtml += '<div style="margin-top:8px;font-size:.65rem;color:var(--mu)">숨긴 항목: '
      + hiddenItems.map(function(it){ return '<button onclick="_brkUnhideSuppl(\''+esc(it.key)+'\')" style="background:none;border:1px dashed var(--bd);border-radius:4px;padding:1px 6px;font-size:.62rem;color:var(--mu);cursor:pointer;margin:0 2px" title="다시 표시">'+it.icon+' '+it.label+' ↩</button>'; }).join('')
      + '</div>';
  }
  // 추가 버튼
  checkHtml += '<div style="display:flex;gap:6px;margin-top:8px"><input id="brk-suppl-add" class="dx-form-input" placeholder="영양제/약물 이름" style="flex:1;font-size:.78rem;padding:6px 10px"><button onclick="_brkAddSuppl()" style="font-size:.72rem;padding:6px 12px;border:1.5px solid var(--ac);border-radius:6px;background:none;color:var(--ac);cursor:pointer;font-family:var(--font);white-space:nowrap">+ 추가</button></div>';

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

// ── 관계 기록 (가임기 자동 매칭) ──
function _brkRenderIntimacy(m, selDate) {
  if(!m.dailyChecks[selDate]) m.dailyChecks[selDate]={};
  var rec=m.dailyChecks[selDate].intimacy||null;
  // 가임기 판정
  var fertileInfo=_getFertileStatus(m, selDate);
  var fertBadge='';
  if(fertileInfo.status==='fertile') fertBadge='<span style="background:#ede9fe;color:#7c3aed;padding:2px 8px;border-radius:10px;font-size:.68rem;font-weight:600">🟪 가임기</span>';
  else if(fertileInfo.status==='ovulation') fertBadge='<span style="background:#f3e8ff;color:#9333ea;padding:2px 8px;border-radius:10px;font-size:.68rem;font-weight:600">🟣 배란 추정일</span>';
  else if(fertileInfo.status==='period') fertBadge='<span style="background:#fee2e2;color:#dc2626;padding:2px 8px;border-radius:10px;font-size:.68rem;font-weight:600">🔴 생리 중</span>';
  else fertBadge='<span style="background:var(--sf2);color:var(--mu);padding:2px 8px;border-radius:10px;font-size:.68rem">비가임기</span>';
  var html='<div style="margin-bottom:10px;display:flex;align-items:center;gap:8px">'+fertBadge;
  if(fertileInfo.daysToOv!==null) html+='<span style="font-size:.65rem;color:var(--mu)">배란까지 '+(fertileInfo.daysToOv>0?fertileInfo.daysToOv+'일':'오늘')+'</span>';
  html+='</div>';
  if(rec){
    html+='<div style="padding:12px;background:#fdf2f8;border:1px solid #fbcfe8;border-radius:8px;margin-bottom:10px">'
      +'<div style="font-size:.78rem;font-weight:600;color:#be185d;margin-bottom:6px">❤️ 관계 기록됨</div>'
      +(rec.time?'<div style="font-size:.72rem;color:var(--mu)">시간: '+esc(rec.time)+'</div>':'')
      +(rec.note?'<div style="font-size:.72rem;color:var(--mu)">메모: '+esc(rec.note)+'</div>':'')
      +'<button onclick="brkRemoveIntimacy()" style="margin-top:6px;font-size:.68rem;background:none;border:none;color:#dc2626;cursor:pointer;text-decoration:underline">삭제</button>'
      +'</div>';
  } else {
    html+='<div style="padding:12px;background:var(--sf2);border:1px solid var(--bd);border-radius:8px;margin-bottom:10px">'
      +'<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">'
      +'<input type="time" id="brk-int-time" class="dx-form-input" style="width:120px" value="'+kstTime()+'">'
      +'<button onclick="brkSaveIntimacy()" class="btn-accum-add" style="font-size:.75rem;padding:6px 16px">❤️ 기록</button>'
      +'</div>'
      +'<input type="text" id="brk-int-note" class="dx-form-input" placeholder="메모 (선택)" style="width:100%;font-size:.78rem">'
      +'</div>';
  }
  // 최근 관계 기록 + 가임기 매칭 요약
  html+=_brkIntimacyHistory(m);
  return html;
}
function _getFertileStatus(m, date){
  var cycles=(m.menstrualCycles||[]).slice().sort(function(a,b){return b.startDate.localeCompare(a.startDate);});
  var avgLen=getAvgCycleLength(cycles);
  // 생리 중 체크
  for(var ci=0;ci<cycles.length;ci++){
    var c=cycles[ci];var s=new Date(c.startDate+'T00:00:00');
    var e=c.endDate?new Date(c.endDate+'T00:00:00'):new Date(s.getTime()+4*86400000);
    if(date>=c.startDate&&date<=_localDateStr(e))return{status:'period',daysToOv:null};
  }
  // 배란일/가임기 체크
  var closestOv=null,closestDiff=999;
  for(var ci2=0;ci2<Math.min(cycles.length,3);ci2++){
    var c2=cycles[ci2];var ovD=getOvulationDate(c2.startDate,c2.length||avgLen);
    var diff=Math.round((new Date(date+'T00:00:00')-new Date(ovD+'T00:00:00'))/86400000);
    if(Math.abs(diff)<Math.abs(closestDiff)){closestDiff=diff;closestOv=ovD;}
  }
  // 예측 배란일도 체크
  if(cycles.length){
    var last=cycles[0];var nextStart=new Date(last.startDate+'T00:00:00');nextStart.setDate(nextStart.getDate()+avgLen);
    var nextOv=getOvulationDate(_localDateStr(nextStart),avgLen);
    var nextDiff=Math.round((new Date(date+'T00:00:00')-new Date(nextOv+'T00:00:00'))/86400000);
    if(Math.abs(nextDiff)<Math.abs(closestDiff)){closestDiff=nextDiff;closestOv=nextOv;}
  }
  if(closestDiff===0)return{status:'ovulation',daysToOv:0};
  if(closestDiff>=-3&&closestDiff<=3)return{status:'fertile',daysToOv:-closestDiff};
  return{status:'none',daysToOv:closestDiff<0?null:-closestDiff};
}
function _brkIntimacyHistory(m){
  var dc=m.dailyChecks||{};
  var records=[];
  Object.keys(dc).sort().reverse().forEach(function(d){if(dc[d].intimacy)records.push({date:d,rec:dc[d].intimacy});});
  if(!records.length) return '<div style="font-size:.72rem;color:var(--mu2);text-align:center;padding:10px">관계 기록이 없습니다</div>';
  var html='<div style="font-size:.72rem;font-weight:600;color:var(--mu);margin-bottom:6px">최근 관계 기록</div>';
  records.slice(0,10).forEach(function(r){
    var fs=_getFertileStatus(m,r.date);
    var badge='';
    if(fs.status==='fertile')badge='<span style="background:#ede9fe;color:#7c3aed;font-size:.6rem;padding:1px 6px;border-radius:8px">가임기</span>';
    else if(fs.status==='ovulation')badge='<span style="background:#f3e8ff;color:#9333ea;font-size:.6rem;padding:1px 6px;border-radius:8px">배란일</span>';
    html+='<div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--bd);font-size:.72rem">'
      +'<span style="font-weight:500">'+r.date+'</span>'
      +(r.rec.time?'<span style="color:var(--mu)">'+esc(r.rec.time)+'</span>':'')
      +badge
      +(r.rec.note?'<span style="color:var(--mu2);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(r.rec.note)+'</span>':'')
      +'</div>';
  });
  return html;
}
async function brkSaveIntimacy(){
  var m=getBrkMaster();if(!m)return;
  var selDate=_brkCheckDate||kstToday();
  if(!m.dailyChecks[selDate])m.dailyChecks[selDate]={};
  var time=(document.getElementById('brk-int-time')?.value||'').trim();
  var note=(document.getElementById('brk-int-note')?.value||'').trim();
  m.dailyChecks[selDate].intimacy={time:time,note:note,recordedAt:new Date(Date.now()+9*3600000).toISOString()};
  await saveBrkMaster();
  showToast('❤️ 관계 기록 저장');
  renderView('meds');
}
async function brkRemoveIntimacy(){
  if(!confirm('이 관계 기록을 삭제하시겠습니까?'))return;
  var m=getBrkMaster();if(!m)return;
  var selDate=_brkCheckDate||kstToday();
  if(m.dailyChecks[selDate])delete m.dailyChecks[selDate].intimacy;
  await saveBrkMaster();
  showToast('🗑 삭제됨');
  renderView('meds');
}

function _getBrkCustomSuppl(who){
  // 클라우드(마스터) 우선, localStorage 폴백
  const m=getBrkMaster();
  const cloud=m?.customSuppl?.[who];
  if(cloud?.length) return cloud;
  return JSON.parse(localStorage.getItem('om_brk_suppl_'+who)||'[]');
}
async function _saveBrkCustomSuppl(who,customs){
  // localStorage + 클라우드(마스터) 양쪽 저장
  localStorage.setItem('om_brk_suppl_'+who,JSON.stringify(customs));
  const m=getBrkMaster();
  if(m){if(!m.customSuppl)m.customSuppl={};m.customSuppl[who]=customs;await saveBrkMaster();}
}
function _brkAddSuppl(){
  const input=document.getElementById('brk-suppl-add');if(!input)return;
  const label=input.value.trim();if(!label){showToast('이름을 입력하세요');return;}
  const key=label.toLowerCase().replace(/[^a-z0-9가-힣]/g,'');
  const who=_brkCheckWho==='orangi'?'orangi':'bung';
  const customs=_getBrkCustomSuppl(who);
  if(customs.find(c=>c.key===key)){showToast('이미 존재합니다');return;}
  customs.push({key,label});
  _saveBrkCustomSuppl(who,customs);
  showToast('✅ '+label+' 추가됨');
  renderView('meds');
}

function _getBrkHiddenSuppl(who){
  var m=getBrkMaster();
  return m?.hiddenSuppl?.[who]||[];
}
async function _saveBrkHiddenSuppl(who,hidden){
  var m=getBrkMaster();
  if(m){if(!m.hiddenSuppl)m.hiddenSuppl={};m.hiddenSuppl[who]=hidden;await saveBrkMaster();}
}
function _brkHideSuppl(key){
  var who=_brkCheckWho==='orangi'?'orangi':'bung';
  var hidden=_getBrkHiddenSuppl(who);
  if(hidden.indexOf(key)>=0)return;
  hidden.push(key);
  _saveBrkHiddenSuppl(who,hidden);
  showToast('숨김 처리됨 (아래에서 복원 가능)');
  renderView('meds');
}
function _brkUnhideSuppl(key){
  var who=_brkCheckWho==='orangi'?'orangi':'bung';
  var hidden=_getBrkHiddenSuppl(who).filter(function(k){return k!==key;});
  _saveBrkHiddenSuppl(who,hidden);
  showToast('다시 표시됨');
  renderView('meds');
}

function _brkRemoveSuppl(key){
  const who=_brkCheckWho==='orangi'?'orangi':'bung';
  const customs=_getBrkCustomSuppl(who);
  const item=customs.find(c=>c.key===key);
  if(!item)return;
  if(!confirm(item.label+' 항목을 삭제하시겠습니까?'))return;
  _saveBrkCustomSuppl(who,customs.filter(c=>c.key!==key));
  showToast('🗑 '+item.label+' 삭제됨');
  renderView('meds');
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
    : [{key:'arginine',label:'아르기닌'},{key:'coq10',label:'CoQ10'},{key:'silymarin',label:'실리마린'},{key:'multivitamin',label:'멀티비타민'}];
  // 사용자 추가 영양제도 동기화에 포함
  var syncCustomKey='om_brk_suppl_'+who;
  var syncCustoms=JSON.parse(localStorage.getItem(syncCustomKey)||'[]');
  syncCustoms.forEach(function(c){supplItems.push({key:c.key,label:c.label});});
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
    who: who==='orangi'?'오랑이':'붕쌤',
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

// AI가 다양한 키명으로 저장하므로 표준 키로 정규화
function _normalizeSemenValues(vals){
  if(!vals)return vals;
  const map={
    volume:['volume','vol','정액량','semen volume'],
    count:['sperm count','count','concentration','정자수','농도','sperm concentration'],
    motility:['motility','total motility','운동성'],
    morphology:['morphology','strict morphology','형태','normal morphology','normal forms'],
  };
  const norm={};
  // 부분 매칭: 키에 alias가 포함되어 있으면 매칭 (단위 포함 키 대응)
  const valKeys=Object.keys(vals);
  for(const [std,aliases] of Object.entries(map)){
    for(const alias of aliases){
      const found=valKeys.find(k=>k.toLowerCase().includes(alias.toLowerCase()));
      if(found&&vals[found]!==undefined){
        const v=parseFloat(vals[found]);
        if(!isNaN(v)){norm[std]=v;break;}
      }
    }
  }
  // 나머지 키도 보존
  Object.entries(vals).forEach(([k,v])=>{
    const isMatched=Object.values(map).some(aliases=>aliases.some(a=>k.toLowerCase().includes(a.toLowerCase())));
    if(!isMatched)norm[k]=v;
  });
  return norm;
}

function _semenGrade(rawVals) {
  if(!rawVals) return {grade:'-',color:'var(--mu)',issues:[],norm:{}};
  const vals=_normalizeSemenValues(rawVals);
  const issues=[];
  if(vals.morphology!==undefined&&vals.morphology<4) issues.push('형태↓');
  if(vals.motility!==undefined&&vals.motility<42) issues.push('운동성↓');
  if(vals.count!==undefined&&vals.count<15) issues.push('농도↓');
  if(vals.volume!==undefined&&vals.volume<1.5) issues.push('양↓');
  if(!issues.length) return {grade:'정상',color:'#10b981',issues:[],norm:vals};
  if(issues.length===1) return {grade:'경미',color:'#f59e0b',issues,norm:vals};
  return {grade:'주의',color:'#dc2626',issues,norm:vals};
}

// 자연임신 확률 다중 모델 추정
function estimateConceptionRate(m) {
  const cycles=m.menstrualCycles||[];
  const labs=m.labResults||[];
  const semenLabs=labs.filter(l=>l.type==='semen'&&l.values).sort((a,b)=>b.date.localeCompare(a.date));
  const sv=semenLabs[0]?.values?_normalizeSemenValues(semenLabs[0].values):null;
  const hormoneLabs=labs.filter(l=>l.type==='hormone'&&l.values).sort((a,b)=>b.date.localeCompare(a.date));
  // 호르몬 값 부분 매칭 (단위 포함 키 대응: "AMH(ng/mL)" → _hv('amh'))
  const _hvRaw=hormoneLabs[0]?.values||{};
  const _hv=(name)=>{for(const[k,v]of Object.entries(_hvRaw)){if(k.toLowerCase().includes(name.toLowerCase())){const n=parseFloat(v);if(!isNaN(n))return n;}}return undefined;};
  // 주기 분석
  const sorted=[...cycles].sort((a,b)=>a.startDate.localeCompare(b.startDate));
  const lens=[];
  for(let i=0;i<sorted.length-1;i++){const d=Math.round((new Date(sorted[i+1].startDate+'T00:00:00')-new Date(sorted[i].startDate+'T00:00:00'))/86400000);if(d>0&&d<60)lens.push(d);}
  const cycleStd=lens.length>=3?Math.sqrt(lens.reduce((s,v)=>s+Math.pow(v-lens.reduce((a,b)=>a+b,0)/lens.length,2),0)/lens.length):0;
  const avgCycle=lens.length?lens.reduce((a,b)=>a+b,0)/lens.length:30;

  // === 여성/남성 연령 (생년월일 기반 동적 계산) ===
  const _birthdays={orangi:'1997-07-29',bung:'1988-01-27'};
  const _calcAge=(bd)=>{const b=new Date(bd+'T00:00:00'),t=new Date(kstToday()+'T00:00:00');let a=t.getFullYear()-b.getFullYear();if(t.getMonth()<b.getMonth()||(t.getMonth()===b.getMonth()&&t.getDate()<b.getDate()))a--;return a;};
  const femaleAge=_calcAge(_birthdays.orangi);
  const maleAge=_calcAge(_birthdays.bung);
  // 연령 보정 계수 (PRESTO 2024 + Gnoth 2003)
  let ageMult=1.0;
  if(femaleAge<=30) ageMult=1.0;
  else if(femaleAge<=33) ageMult=0.85;
  else if(femaleAge<=35) ageMult=0.75;
  else if(femaleAge<=37) ageMult=0.60;
  else if(femaleAge<=39) ageMult=0.45;
  else if(femaleAge<=42) ageMult=0.25;
  else ageMult=0.10;

  // === 모델 1: 종합 모델 (연령+정액+주기+호르몬) ===
  const factors=[];
  const waterfall=[]; // {name, mult, before, after} — 요인별 누적 감소 추적
  let r1=25*ageMult; // 연령 보정 기저율
  waterfall.push({name:'기저율 (25%×연령)',mult:ageMult,before:25,after:Math.round(r1)});
  factors.push({name:`여성 ${femaleAge}세`,impact:ageMult<1?Math.round((ageMult-1)*100):0,tip:ageMult>=0.75?'양호한 연령대':'난소 예비력 검사(AMH) 권장',solo:Math.round(25*ageMult)});
  // 남성 연령 보정
  let maleMult=1.0;
  if(maleAge>=45){maleMult=0.8;const bf=Math.round(r1);r1*=0.8;waterfall.push({name:`남성 ${maleAge}세`,mult:0.8,before:bf,after:Math.round(r1)});factors.push({name:`남성 ${maleAge}세 (≥45)`,impact:-20,tip:'정자 DNA 분절 증가 가능 — 항산화제 권장',solo:Math.round(25*ageMult*0.8)});}
  else if(maleAge>=40){maleMult=0.9;const bf=Math.round(r1);r1*=0.9;waterfall.push({name:`남성 ${maleAge}세`,mult:0.9,before:bf,after:Math.round(r1)});factors.push({name:`남성 ${maleAge}세 (≥40)`,impact:-10,tip:'정자 질 경미 감소 가능',solo:Math.round(25*ageMult*0.9)});}
  else{factors.push({name:`남성 ${maleAge}세`,impact:0,tip:'양호한 연령대',solo:Math.round(25*ageMult)});}
  // 정액검사
  const baseAfterAge=Math.round(r1);
  if(sv){
    if(sv.morphology!==undefined&&sv.morphology<4){const bf=Math.round(r1);r1*=0.55;waterfall.push({name:'형태 <4%',mult:0.55,before:bf,after:Math.round(r1)});factors.push({name:'형태<4% (기형정자증)',impact:-45,tip:'항산화제(CoQ10 200mg, 비타민E, 아연) 3개월 복용 후 재검',solo:Math.round(baseAfterAge*0.55)});}
    if(sv.motility!==undefined&&sv.motility<42){const bf=Math.round(r1);r1*=0.65;waterfall.push({name:'운동성 <42%',mult:0.65,before:bf,after:Math.round(r1)});factors.push({name:'운동성<42%',impact:-35,tip:'금주·금연, 규칙적 유산소 운동, 꽉 끼는 속옷·사우나 회피',solo:Math.round(baseAfterAge*0.65)});}
    if(sv.count!==undefined&&sv.count<15){const bf=Math.round(r1);r1*=0.45;waterfall.push({name:'농도 <15M',mult:0.45,before:bf,after:Math.round(r1)});factors.push({name:'농도<15M/mL',impact:-55,tip:'비뇨기과 정밀검사(정계정맥류 등) 권장',solo:Math.round(baseAfterAge*0.45)});}
    if(sv.count!==undefined&&sv.count>=15&&sv.motility!==undefined&&sv.motility>=42&&(sv.morphology===undefined||sv.morphology>=4)){factors.push({name:'정액검사 정상',impact:0,tip:'양호',solo:baseAfterAge});}
  } else {factors.push({name:'정액검사 미실시',impact:0,tip:'검사 추가 시 정확도 크게 향상'});}
  // 주기 규칙성
  if(cycleStd>7){const bf=Math.round(r1);r1*=0.7;waterfall.push({name:'주기 불규칙',mult:0.7,before:bf,after:Math.round(r1)});factors.push({name:'주기 불규칙(±'+cycleStd.toFixed(1)+'일)',impact:-30,tip:'배란테스트기(LH strip) 필수 + 배란 앱 연동',solo:Math.round(baseAfterAge*0.7)});}
  else if(lens.length>=3){factors.push({name:'주기 규칙적(±'+cycleStd.toFixed(1)+'일)',impact:0,tip:'배란 예측 유리 — 주기 중간 2일 전후 집중',solo:baseAfterAge});}
  // AMH 반영 (있으면)
  const _amh=_hv('amh');
  if(_amh!==undefined){
    if(_amh<0.5){const bf=Math.round(r1);r1*=0.5;waterfall.push({name:'AMH<0.5',mult:0.5,before:bf,after:Math.round(r1)});factors.push({name:'AMH<0.5 (난소예비력 저하)',impact:-50,tip:'생식의학과 상담 — IVF 조기 검토',solo:Math.round(baseAfterAge*0.5)});}
    else if(_amh<1.0){const bf=Math.round(r1);r1*=0.8;waterfall.push({name:'AMH 경계',mult:0.8,before:bf,after:Math.round(r1)});factors.push({name:'AMH 0.5-1.0 (경계)',impact:-20,tip:'난소기능 추적 관찰 권장',solo:Math.round(baseAfterAge*0.8)});}
    else{factors.push({name:'AMH≥1.0 (정상)',impact:0,tip:'난소 예비력 양호',solo:baseAfterAge});}
  }
  // FSH
  const _fsh=_hv('fsh');
  if(_fsh!==undefined&&_fsh>10){const bf=Math.round(r1);r1*=0.7;waterfall.push({name:'FSH>10',mult:0.7,before:bf,after:Math.round(r1)});factors.push({name:'FSH>10 (상승)',impact:-30,tip:'난소기능 저하 가능 — 생식의학과 상담',solo:Math.round(baseAfterAge*0.7)});}
  r1=Math.round(Math.max(2,Math.min(r1,30)));

  // === 모델 2: TMSC 기반 ===
  let r2=null,tmsc=null;
  if(sv&&sv.count!==undefined&&sv.motility!==undefined&&sv.volume!==undefined){
    tmsc=Math.round(sv.volume*sv.count*(sv.motility/100));
    if(tmsc>=20) r2=Math.round(25*ageMult);
    else if(tmsc>=9) r2=Math.round(18*ageMult);
    else if(tmsc>=5) r2=Math.round(10*ageMult);
    else if(tmsc>=1) r2=Math.round(5*ageMult);
    else r2=2;
  }

  // === 모델 3: 연령 기저율 (연령만) ===
  const r3=Math.round(25*ageMult);

  // 누적 확률 (1-(1-p)^n)
  const cumulative=[1,3,6,9,12].map(n=>({months:n,pct:Math.round((1-Math.pow(1-r1/100,n))*100)}));

  // 일별 확률 (배란일 기준)
  const dailyRates=[
    {day:-5,rate:4},{day:-4,rate:8},{day:-3,rate:14},{day:-2,rate:27},{day:-1,rate:31},{day:0,rate:12},{day:1,rate:1}
  ];
  const semenMult=sv?(r1/(25*ageMult||25)):1;
  const adjDaily=dailyRates.map(d=>({...d,adjRate:Math.round(Math.max(0,d.rate*semenMult*ageMult))}));

  // 개인화 타임라인 권장
  let timeline='';
  if(r1>=20) timeline='자연임신 시도 6개월 → 미임신 시 생식의학과 상담';
  else if(r1>=12) timeline='자연임신 시도 3-6개월 + 배란 타이밍 최적화 → 미임신 시 IUI 검토';
  else if(r1>=5) timeline='생식의학과 조기 상담 권장 — IUI 또는 IVF 병행 검토';
  else timeline='생식의학과 즉시 상담 — IVF/ICSI 적극 검토';

  return {monthly:r1,tmsc,tmscRate:r2,ageRate:r3,femaleAge,maleAge,ageMult,factors,waterfall,dailyRates:adjDaily,cumulative,cycleStd,avgCycle,hasSemen:!!sv,hasHormone:!!hormoneLabs.length,timeline};
}

function _showModelInfo(model){
  const el=document.getElementById('model-info-box');if(!el)return;
  const infos={
    who:`<b>WHO/Hunault 모델</b><br>
    네덜란드 Hunault 등(2004)이 개발한 자연임신 확률 예측 모델. WHO 정상 참고치(2021, 6th edition)를 기반으로 여성 나이, 불임 기간, 정액검사 결과, 주기 규칙성 등을 종합하여 월간 임신 확률(fecundability)을 추정합니다.<br><br>
    <b>주요 변수:</b> 여성 연령, 주기 길이/규칙성, 정액검사(양, 농도, 운동성, 형태), 불임 기간<br>
    <b>정상 하한(WHO 2021):</b> Vol ≥1.5mL, Count ≥15M/mL, Motility ≥42%, Morphology ≥4%<br>
    <b>기저율:</b> 건강한 커플 ~25%/주기 (Gnoth 2003)<br>
    <b>한계:</b> 나팔관 이상, 자궁내막증 등 기질적 원인은 반영 불가`,
    tmsc:`<b>TMSC (Total Motile Sperm Count)</b><br>
    정액량(mL) × 농도(M/mL) × 운동성(%) = 총 운동 정자 수. 단일 수치로 남성 가임력을 평가하는 가장 실용적인 지표입니다.<br><br>
    <b>해석 기준:</b><br>
    • ≥20M: 자연임신에 유리 (임신율 ~25%)<br>
    • 10-19M: 경계 — IUI 검토 (임신율 ~18%)<br>
    • 5-9M: IUI 권장 (임신율 ~12%)<br>
    • 1-4M: IVF/ICSI 검토 (임신율 ~5%)<br>
    • <1M: ICSI 필요<br><br>
    <b>참고:</b> Hamilton(2015), van Weert(2021) — TMSC ≥9M이 IUI 최소 임계값`,
    age:`<b>연령 기저율 (PRESTO 2024)</b><br>
    Wesselink 등(2024) PRESTO 코호트 연구에서 도출된 연령별 월간 자연임신 확률입니다. 여성 연령이 가장 강력한 예측 변수입니다.<br><br>
    <b>연령별 보정계수:</b><br>
    • ≤30세: ×1.0 (기본)<br>
    • 31-33세: ×0.85<br>
    • 34-35세: ×0.75<br>
    • 36-37세: ×0.60<br>
    • 38-39세: ×0.45<br>
    • 40-42세: ×0.25<br>
    • 43+세: ×0.10<br><br>
    <b>의미:</b> 다른 조건이 동일해도 35세 이후 급격히 감소. 조기 상담 권장.`,
  };
  const html=infos[model];if(!html)return;
  el.innerHTML=`<div style="margin-top:6px;padding:10px;background:var(--sf);border:1px solid var(--bd);border-radius:8px;font-size:.68rem;color:var(--tx);line-height:1.6">
    ${html}
    <div style="text-align:right;margin-top:6px"><button onclick="document.getElementById('model-info-box').innerHTML=''" style="font-size:.62rem;padding:2px 10px;border:1px solid var(--bd);border-radius:4px;background:none;color:var(--mu);cursor:pointer;font-family:var(--font)">닫기</button></div>
  </div>`;
}

function _renderConceptionCard(m) {
  const r=estimateConceptionRate(m);
  const rate=r.monthly;
  const rateColor=rate>=20?'#10b981':rate>=12?'#f59e0b':'#dc2626';

  // 비교 모델 표 (클릭 시 설명)
  const acColor=r.ageRate>=20?'#10b981':r.ageRate>=12?'#f59e0b':'#dc2626';
  let modelRows=`<div style="font-size:.68rem;font-weight:600;color:var(--mu);margin-top:8px;margin-bottom:4px">📊 추정 모델 비교 <span style="font-weight:400;font-size:.58rem">(클릭하면 설명)</span></div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;margin-bottom:4px">
      <div style="background:${acColor}10;border:1px solid ${acColor}40;border-radius:6px;padding:6px;text-align:center;cursor:pointer" onclick="_showModelInfo('age')">
        <div style="font-size:.55rem;color:var(--mu)">연령 기저율</div>
        <div style="font-size:.88rem;font-weight:700;color:${acColor}">${r.ageRate}%</div>
        <div style="font-size:.48rem;color:var(--mu2)">여${r.femaleAge}·남${r.maleAge}세</div>
      </div>`;
  if(r.tmscRate!==null){
    const tc=r.tmscRate>=20?'#10b981':r.tmscRate>=10?'#f59e0b':'#dc2626';
    modelRows+=`<div style="background:${tc}10;border:1px solid ${tc}40;border-radius:6px;padding:6px;text-align:center;cursor:pointer" onclick="_showModelInfo('tmsc')">
      <div style="font-size:.55rem;color:var(--mu)">TMSC(${r.tmsc}M)</div>
      <div style="font-size:.88rem;font-weight:700;color:${tc}">${r.tmscRate}%</div>
      <div style="font-size:.48rem;color:var(--mu2)">연령+정자총수</div>
    </div>`;
  } else {
    modelRows+=`<div style="background:var(--sf2);border:1px solid var(--bd);border-radius:6px;padding:6px;text-align:center;cursor:pointer" onclick="_showModelInfo('tmsc')">
      <div style="font-size:.55rem;color:var(--mu)">TMSC</div>
      <div style="font-size:.75rem;color:var(--mu2)">검사 필요</div>
    </div>`;
  }
  modelRows+=`<div style="background:${rateColor}10;border:2px solid ${rateColor}60;border-radius:6px;padding:6px;text-align:center;cursor:pointer" onclick="_showModelInfo('who')">
    <div style="font-size:.55rem;color:var(--mu)">종합(WHO)</div>
    <div style="font-size:.88rem;font-weight:700;color:${rateColor}">${rate}%</div>
    <div style="font-size:.48rem;color:var(--mu2)">전체 반영</div>
  </div></div>`;

  // 모델 차이 해석
  let diffNote='';
  if(r.tmscRate!==null && Math.abs(rate-r.tmscRate)>=5){
    if(rate<r.tmscRate) diffNote=`<div style="font-size:.65rem;color:#ea580c;background:#fff7ed;padding:6px 8px;border-radius:6px;margin:4px 0;border:1px solid #fed7aa">💡 <b>종합(${rate}%) &lt; TMSC(${r.tmscRate}%)</b> — 정자 총 운동수는 양호하지만 형태/운동성 등 세부 항목이나 주기·호르몬 요인이 확률을 낮추고 있습니다. 아래 워터폴에서 어떤 요인이 얼마나 감소시키는지 확인하세요.</div>`;
    else diffNote=`<div style="font-size:.65rem;color:#0369a1;background:#f0f9ff;padding:6px 8px;border-radius:6px;margin:4px 0;border:1px solid #bae6fd">💡 <b>종합(${rate}%) &gt; TMSC(${r.tmscRate}%)</b> — TMSC가 낮아 단순 계산상 불리하지만, 주기 규칙성·호르몬 등 다른 요인이 양호하여 종합 확률이 더 높게 산출됩니다.</div>`;
  }
  if(r.ageRate>0 && rate<r.ageRate){
    diffNote+=`<div style="font-size:.65rem;color:var(--mu);background:var(--sf2);padding:6px 8px;border-radius:6px;margin:4px 0;border:1px solid var(--bd)">📉 연령 기저율(${r.ageRate}%)에서 <b>${r.ageRate-rate}%p 감소</b> — 검사 결과·주기 등 추가 요인 반영 결과입니다.</div>`;
  }
  modelRows+=diffNote;
  // 모델 설명 표시 영역
  modelRows+=`<div id="model-info-box"></div>`;

  // 워터폴 차트 (요인별 누적 감소)
  let waterfallHtml='';
  if(r.waterfall.length>1){
    const maxVal=Math.max(...r.waterfall.map(w=>Math.max(w.before,w.after)),1);
    waterfallHtml=`<div style="font-size:.68rem;font-weight:600;color:var(--mu);margin-top:8px;margin-bottom:6px">📉 요인별 확률 변화 (워터폴)</div>
    <div style="padding:4px 0">
      ${r.waterfall.map((w,i)=>{
        const bw=Math.round(w.before/maxVal*100);
        const aw=Math.round(w.after/maxVal*100);
        const isFirst=i===0;
        const drop=w.before-w.after;
        return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;font-size:.65rem">
          <span style="width:65px;text-align:right;color:var(--mu);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${w.name}</span>
          <div style="flex:1;position:relative;height:18px;background:var(--sf2);border-radius:4px;overflow:hidden">
            ${isFirst?`<div style="height:100%;width:${aw}%;background:#10b981;border-radius:4px"></div>`
            :`<div style="height:100%;width:${bw}%;background:#fca5a5;border-radius:4px;position:absolute"></div>
              <div style="height:100%;width:${aw}%;background:#3b82f6;border-radius:4px;position:absolute"></div>`}
          </div>
          <span style="width:52px;text-align:right;font-weight:600;color:${w.after<w.before?'#dc2626':'#10b981'}">${isFirst?w.after+'%':w.before+'→'+w.after+'%'}</span>
          ${!isFirst?`<span style="width:28px;font-size:.55rem;color:#dc2626">-${drop}%p</span>`:'<span style="width:28px"></span>'}
        </div>`;
      }).join('')}
      <div style="display:flex;align-items:center;gap:6px;margin-top:2px;font-size:.65rem;border-top:1px solid var(--bd);padding-top:4px">
        <span style="width:65px;text-align:right;font-weight:700;color:var(--ink)">종합 결과</span>
        <div style="flex:1;position:relative;height:18px;background:var(--sf2);border-radius:4px;overflow:hidden">
          <div style="height:100%;width:${Math.round(rate/maxVal*100)}%;background:${rateColor};border-radius:4px"></div>
        </div>
        <span style="width:52px;text-align:right;font-weight:700;color:${rateColor}">${rate}%</span>
        <span style="width:28px"></span>
      </div>
    </div>`;
  }

  // 영향 요소 (요인만 적용 시 solo 확률 포함)
  const factorsHtml=r.factors.length?`<div style="font-size:.68rem;font-weight:600;color:var(--mu);margin-bottom:4px">📋 영향 요소 <span style="font-weight:400;font-size:.55rem">(이 항목만 반영 시 확률)</span></div>
    ${r.factors.map(f=>{
      const ic=f.impact<0?'🔻':'✅';
      const col=f.impact<0?'#dc2626':'#10b981';
      return `<div style="display:flex;align-items:start;gap:6px;padding:4px 0;border-bottom:1px dotted var(--bd);font-size:.68rem">
        <span>${ic}</span>
        <div style="flex:1"><span style="font-weight:600;color:${col}">${f.name}</span>${f.impact?` (${f.impact}%)`:''}<br>
        <span style="color:var(--mu)">→ ${f.tip}</span></div>
        ${f.solo!==undefined&&f.impact!==0?`<span style="font-size:.65rem;font-weight:700;color:${f.solo>=20?'#10b981':f.solo>=12?'#f59e0b':'#dc2626'};white-space:nowrap">${f.solo}%</span>`:''}
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

  // 확률 향상 팁 (현재 데이터 기반 맞춤 — 잘 하고 있는 것 체크)
  const tips=[];
  // dailyChecks에서 최근 7일 복용 현황 확인
  const _last7=[];for(let i=0;i<7;i++){const dd=new Date(kstToday()+'T00:00:00');dd.setDate(dd.getDate()-i);_last7.push(dd.toISOString().slice(0,10));}
  const dc7=_last7.map(d=>m.dailyChecks?.[d]).filter(Boolean);
  const bungSupplDays=dc7.filter(d=>BRK_SUPPL_BUNG.some(k=>d.bung?.[k])).length;
  const orangiSupplDays=dc7.filter(d=>BRK_SUPPL_ORANGI.some(k=>d.orangi?.[k])).length;
  const milestones=m.milestones||[];
  const alcoholMilestone=milestones.find(x=>x.label?.includes('금주'));

  // 타이밍
  tips.push({icon:'🎯',title:'타이밍 최적화',desc:'배란일 D-2~D-1에 집중 (이 시기가 확률 최고). 배란 예측 키트(LH strip) 사용 시 양성 후 24-36시간 내가 가장 유리',ref:'Wilcox 1995, Bull 2019'});
  // 빈도
  tips.push({icon:'📅',title:'관계 빈도',desc:'가임기(배란 전 5일~당일) 중 격일 관계가 최적. 매일도 괜찮지만 정자 농도 유지 관점에서 격일 권장',ref:'NICE 2013, Practice Committee ASRM 2017'});
  // 남성 영양제
  if(r.hasSemen){
    tips.push({icon:'💊',title:'남성 영양제',desc:'CoQ10(200-300mg), 아르기닌(2-3g), 비타민E(400IU), 아연(30mg), 셀레늄(200μg) — 정자 질 개선에 3개월 소요',ref:'Salas-Huetos 2017 메타분석',doing:bungSupplDays>=5});
  }
  // 여성 영양제
  tips.push({icon:'🥬',title:'여성 영양제',desc:'엽산(0.4-5mg, 필수), 비타민D(1000-4000IU), 철분, 오메가3(DHA 200mg) — 임신 3개월 전부터 시작',ref:'WHO, ACOG 2023',doing:orangiSupplDays>=5});
  // 생활습관
  tips.push({icon:'🚭',title:'생활습관',desc:'금주·금연(남녀 모두), 카페인 <200mg/일, BMI 19-25 유지, 7-8시간 수면, 과도한 운동 피하기',ref:'ASRM Committee 2017',doing:alcoholMilestone?.done});
  // 체중
  tips.push({icon:'⚖️',title:'체중 관리',desc:'저체중(BMI <18.5)은 배란 장애 위험 증가. 목표 BMI 19+ 달성 시 임신율 유의미하게 향상',ref:'Rich-Edwards 2002'});
  // 스트레스
  tips.push({icon:'🧘',title:'스트레스 관리',desc:'만성 스트레스는 시상하부-뇌하수체-난소 축에 영향 → 배란 지연. 명상, 요가 등 권장',ref:'Lynch 2014 PRESTO'});
  // 연령
  if(r.femaleAge>=35) tips.push({icon:'⏰',title:'조기 상담',desc:'35세 이후 6개월 시도 후 미임신 시 생식의학과 상담 권장 (일반: 12개월)',ref:'ASRM 2020'});

  const tipsHtml=`<div style="margin-top:10px"><div style="font-size:.68rem;font-weight:600;color:var(--mu);margin-bottom:6px;cursor:pointer" onclick="const d=this.nextElementSibling;d.style.display=d.style.display==='none'?'block':'none'">💡 확률 향상 팁 ▸</div>
    <div style="display:none">
    ${tips.map(t=>`<div style="display:flex;gap:8px;padding:6px 0;border-bottom:1px dotted var(--bd);${t.doing?'background:#f0fdf408':''}">
      <span style="font-size:1rem">${t.icon}</span>
      <div><div style="font-size:.72rem;font-weight:600;color:var(--ink)">${t.doing?'✅ ':''}${t.title}${t.doing?' <span style="font-size:.6rem;color:#10b981;font-weight:400">잘 하고 있어요!</span>':''}</div>
      <div style="font-size:.65rem;color:var(--mu);line-height:1.5">${t.desc}</div>
      <div style="font-size:.55rem;color:var(--mu2)">📚 ${t.ref}</div></div>
    </div>`).join('')}
    </div></div>`;

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
    ${waterfallHtml}
    ${factorsHtml}
    <div style="font-size:.68rem;font-weight:600;color:var(--mu);margin-top:8px;margin-bottom:4px">📈 누적 임신 확률 <span style="font-weight:400;font-size:.6rem">(시도 기간별)</span></div>
    <div style="display:flex;align-items:flex-end;gap:4px;height:55px;margin-bottom:2px">
      ${r.cumulative.map(c=>{
        const h=Math.max(4,Math.round(c.pct/100*48));
        const col=c.pct>=80?'#10b981':c.pct>=50?'#3b82f6':'#f59e0b';
        return `<div style="flex:1;text-align:center">
          <div style="font-size:.55rem;color:${col};font-weight:700">${c.pct}%</div>
          <div style="height:${h}px;background:${col};border-radius:3px 3px 0 0;margin:0 auto;width:60%"></div>
          <div style="font-size:.5rem;color:var(--mu)">${c.months}개월</div>
        </div>`;
      }).join('')}
    </div>
    <div style="font-size:.55rem;color:var(--mu2);text-align:center">월 ${rate}% 기준 누적 (독립 시행 가정)</div>
    ${dailyHtml}
    <div style="margin-top:8px;padding:8px 10px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px">
      <div style="font-size:.68rem;font-weight:600;color:#0369a1;margin-bottom:3px">🗓 권장 타임라인</div>
      <div style="font-size:.7rem;color:#0c4a6e">${r.timeline}</div>
    </div>
    ${tipsHtml}
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
      const n=g.norm||{};
    const vals=['Vol '+(n.volume||'-'),'Count '+(n.count||'-'),'Mot '+(n.motility||'-')+'%','Morph '+(n.morphology||'-')+'%'].join(' · ');
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
        <button class="accum-del" onclick="brkDeleteLab(${l.id})" title="삭제">🗑</button>
      </div>
      <div style="font-size:.72rem;color:var(--tx);margin-top:4px">${summary}</div>
      ${l.memo?`<div style="margin-top:4px">
        <div style="font-size:.62rem;color:var(--ac);cursor:pointer" onclick="const d=this.nextElementSibling;d.style.display=d.style.display==='none'?'block':'none'">▸ 상세 보기</div>
        <div style="display:none;font-size:.68rem;color:var(--mu);margin-top:4px;padding:6px;background:var(--sf);border-radius:6px;white-space:pre-wrap">${esc(l.memo)}</div>
      </div>`:''}
    </div>`;
  }).join('');

  // 정액검사 추세 차트 + 비교 (수치별 색상 바)
  var semenLabs = labs.filter(function(l){return l.type==='semen'&&l.values;}).reverse();
  var trendHtml = '';
  if (semenLabs.length >= 2) {
    const metrics=[
      {key:'count',label:'농도(M/mL)',norm:15,color:'#3b82f6'},
      {key:'motility',label:'운동성(%)',norm:42,color:'#10b981'},
      {key:'morphology',label:'형태(%)',norm:4,color:'#f59e0b'},
      {key:'volume',label:'정액량(mL)',norm:1.5,color:'#8b5cf6'},
    ];
    const rows=metrics.map(mt=>{
      const vals=semenLabs.map(s=>_normalizeSemenValues(s.values)[mt.key]);
      if(vals.every(v=>v===undefined))return '';
      const numVals=vals.map(v=>v||0);
      const max=Math.max(...numVals,mt.norm)*1.2;
      return `<div style="margin-bottom:8px">
        <div style="font-size:.62rem;color:var(--mu);margin-bottom:2px">${mt.label} (정상≥${mt.norm})</div>
        <div style="display:flex;align-items:flex-end;gap:3px;height:40px">
          ${semenLabs.map((s,j)=>{
            const nv=_normalizeSemenValues(s.values);
            const v=nv[mt.key];if(v===undefined)return '<div style="flex:1;text-align:center;font-size:.45rem;color:var(--mu2)">-</div>';
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
    }).filter(Boolean).join('');
    // 최근 2회 비교 카드
    const latest=_normalizeSemenValues(semenLabs[semenLabs.length-1].values);
    const prev=_normalizeSemenValues(semenLabs[semenLabs.length-2].values);
    const compRows=metrics.map(mt=>{
      const lv=latest[mt.key],pv=prev[mt.key];
      if(lv===undefined&&pv===undefined)return '';
      const delta=lv!==undefined&&pv!==undefined?lv-pv:null;
      const pct=delta!==null&&pv>0?Math.round(delta/pv*100):null;
      const arrow=delta===null?'':delta>0?'<span style="color:#10b981">↑</span>':delta<0?'<span style="color:#dc2626">↓</span>':'<span style="color:var(--mu)">→</span>';
      return `<div style="display:flex;align-items:center;gap:6px;padding:3px 0;border-bottom:1px solid var(--bd);font-size:.72rem">
        <span style="width:80px;color:var(--mu)">${mt.label}</span>
        <span style="width:50px;text-align:right;color:${(pv||0)>=mt.norm?mt.color:'#dc2626'}">${pv!==undefined?pv:'-'}</span>
        <span style="width:20px;text-align:center">${arrow}</span>
        <span style="width:50px;text-align:right;font-weight:600;color:${(lv||0)>=mt.norm?mt.color:'#dc2626'}">${lv!==undefined?lv:'-'}</span>
        <span style="flex:1;font-size:.6rem;color:var(--mu2)">${pct!==null?(pct>=0?'+':'')+pct+'%':''}</span>
      </div>`;
    }).filter(Boolean).join('');
    const compHtml=compRows?`<div style="margin-top:8px;padding:8px;background:var(--sf);border-radius:6px;border:1px solid var(--bd)">
      <div style="font-size:.68rem;font-weight:600;color:var(--mu);margin-bottom:4px;display:flex;gap:8px">🔄 최근 비교
        <span style="margin-left:auto;font-size:.6rem;color:var(--mu2)">${semenLabs[semenLabs.length-2].date} → ${semenLabs[semenLabs.length-1].date}</span></div>${compRows}</div>`:'';
    trendHtml=`<div style="margin-top:10px;padding:10px;background:var(--sf2);border-radius:8px;border:1px solid var(--bd)">
      <div style="font-size:.75rem;font-weight:600;color:var(--mu);margin-bottom:6px">📈 정액검사 추세</div>${rows}${compHtml}</div>`;
  }

  return '<div>'
    + rateHtml
    + '<div style="display:flex;gap:6px;margin-bottom:10px">'
    + '<button class="btn-accum-add" onclick="brkOpenLabForm()" style="font-size:.75rem">+ 검사 결과 추가</button>'
    + '<button onclick="document.getElementById(\'brk-lab-photo\').click()" style="background:none;border:1.5px solid var(--bd);border-radius:6px;padding:5px 12px;font-size:.72rem;cursor:pointer;color:var(--mu)">📷 검사결과 사진 분석</button>'
    + '<input type="file" id="brk-lab-photo" accept="image/*" multiple style="display:none" onchange="brkStageLabPhotos(this)">'
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

var _labBulkMode=false;
var _labBulkSet=new Set();
function _renderLabsByPerson(labs, typeLabels, typeIcons) {
  const bung=labs.filter(l=>(l.who||'')==='붕쌤');
  const orangi=labs.filter(l=>(l.who||'')==='오랑이');
  const other=labs.filter(l=>l.who!=='붕쌤'&&l.who!=='오랑이');
  // 관리 도구바
  const toolbar=`<div style="display:flex;gap:6px;margin-bottom:8px;align-items:center;flex-wrap:wrap">
    <button onclick="_labBulkMode=!_labBulkMode;_labBulkSet.clear();renderView('meds')" style="font-size:.65rem;padding:3px 10px;border:1px solid ${_labBulkMode?'#dc2626':'var(--bd)'};border-radius:5px;background:${_labBulkMode?'#fee2e2':'var(--sf)'};color:${_labBulkMode?'#dc2626':'var(--mu)'};cursor:pointer;font-family:var(--font)">${_labBulkMode?'✕ 선택 모드 끄기':'☑️ 선택 삭제'}</button>
    ${_labBulkMode&&_labBulkSet.size?`<button onclick="_brkBulkDeleteLabs()" style="font-size:.65rem;padding:3px 10px;border:1px solid #dc2626;border-radius:5px;background:#dc2626;color:#fff;cursor:pointer;font-family:var(--font)">🗑 ${_labBulkSet.size}건 삭제</button>`:''}
    <button onclick="_toggleAllLabFold()" style="font-size:.65rem;padding:3px 10px;border:1px solid var(--bd);border-radius:5px;background:var(--sf);color:var(--mu);cursor:pointer;font-family:var(--font)">📂 전체 접기/펼치기</button>
  </div>`;
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
  return toolbar + renderGroup('붕쌤','🩵','#06b6d4',bung)
    + renderGroup('오랑이','🧡','#f97316',orangi)
    + (other.length?renderGroup('기타','📋','var(--mu)',other):'');
}
async function _brkBulkDeleteLabs(){
  if(!_labBulkSet.size)return;
  if(!confirm(_labBulkSet.size+'건의 검사결과를 삭제하시겠습니까?'))return;
  const m=getBrkMaster();if(!m)return;
  m.labResults=m.labResults.filter(l=>!_labBulkSet.has(l.id));
  _labBulkSet.clear();_labBulkMode=false;
  await saveBrkMaster();renderView('meds');showToast('🗑 삭제됨');
}
function _toggleLabBulk(labId){
  if(_labBulkSet.has(labId))_labBulkSet.delete(labId);else _labBulkSet.add(labId);
  renderView('meds');
}
var _labFoldAll=false;
function _toggleAllLabFold(){_labFoldAll=!_labFoldAll;document.querySelectorAll('.brk-lab-body').forEach(el=>el.style.display=_labFoldAll?'none':'');}
function _labFoldToggleJS(){return "var b=this.nextElementSibling;b.style.display=b.style.display==='none'?'':'none'";}
async function _brkEditLabType(labId){
  const m=getBrkMaster();if(!m)return;
  const l=m.labResults.find(x=>x.id===labId);if(!l)return;
  const typeLabels={semen:'정액검사',blood:'혈액검사',hormone:'호르몬검사',ultrasound:'초음파',other:'기타'};
  showConfirmModal('📝 검사 종류/이름 수정',
    `<div style="margin-bottom:8px"><div class="dx-form-label">검사 종류</div>
      <select id="brk-lt-type" class="dx-form-input" style="width:160px">
        ${Object.entries(typeLabels).map(([k,v])=>`<option value="${k}"${l.type===k?' selected':''}>${v}</option>`).join('')}
      </select></div>
    <div><div class="dx-form-label">표시 이름 (선택)</div>
      <input id="brk-lt-label" class="dx-form-input" value="${esc(l.customLabel||'')}" placeholder="예: 임신 전 종합검사" style="width:100%"></div>`,
    [{label:'💾 저장',action:async()=>{
      l.type=document.getElementById('brk-lt-type')?.value||l.type;
      const lbl=document.getElementById('brk-lt-label')?.value?.trim();
      if(lbl)l.customLabel=lbl;else delete l.customLabel;
      await saveBrkMaster();closeConfirmModal();showToast('✅ 수정됨');renderView('meds');
    },primary:true}]);
}
async function _brkToggleLabLock(labId){
  const m=getBrkMaster();if(!m)return;
  const l=m.labResults.find(x=>x.id===labId);if(!l)return;
  l.locked=!l.locked;
  await saveBrkMaster();renderView('meds');showToast(l.locked?'🔒 잠금됨':'🔓 잠금 해제');
}

function _renderLabCard(l, globalIdx, typeLabels, typeIcons) {
  const labId=l.id||globalIdx;
  const isLocked=l.locked;
  const displayName=l.customLabel||typeLabels[l.type]||l.type;
  let summary='', interpret='';
  // 참고치 범위 벗어남 체크 (예: "0.35-5.50" → min=0.35, max=5.50)
  const _isOutOfRange=(num,refStr)=>{
    if(isNaN(num)||!refStr)return false;
    const m=String(refStr).match(/([\d.]+)\s*[-~]\s*([\d.]+)/);
    if(!m)return false;
    return num<parseFloat(m[1])||num>parseFloat(m[2]);
  };
  if(l.type==='semen'&&l.values) {
    const g=_semenGrade(l.values);
    const n=g.norm||{};
    const vals=['Vol '+(n.volume||'-'),'Count '+(n.count||'-'),'Mot '+(n.motility||'-')+'%','Morph '+(n.morphology||'-')+'%'].join(' · ');
    summary=`<span style="font-weight:600;color:${g.color}">${g.grade}</span> ${vals}${g.issues.length?' <span style="color:#dc2626;font-size:.65rem">('+g.issues.join(', ')+')</span>':''}`;
    // 해석 한 줄
    if(!g.issues.length) interpret='전 항목 WHO 정상 범위 — 자연임신에 유리';
    else if(g.issues.includes('형태↓')&&g.issues.length===1) interpret='기형정자증 소견 — 형태 개선 위해 항산화제(CoQ10, 비타민E) 권장, 3개월 후 재검';
    else if(g.issues.includes('운동성↓')&&g.issues.length===1) interpret='정자 운동성 저하 — 생활습관 개선(금주, 운동) 후 재검 권장';
    else if(g.issues.includes('농도↓')&&g.issues.length===1) interpret='정자 농도 저하 — 비뇨기과 정밀검사 권장';
    else interpret='복합 이상 소견 — 비뇨기과 상담 및 IUI/ICSI 등 보조생식술 검토 권장';
  } else if(l.values&&typeof l.values==='object') {
    const entries=Object.entries(l.values);
    const abnormalKeys=[];
    summary=entries.slice(0,8).map(([k,v])=>{
      const num=parseFloat(v);const ref=l.ref?.[k];
      const oor=ref?_isOutOfRange(num,ref):false;
      if(oor)abnormalKeys.push(k);
      return `<span style="${oor?'color:#dc2626;font-weight:600':''}">${esc(k)}:${esc(String(v))}</span>${ref?' <span style="font-size:.55rem;color:var(--mu2)">['+esc(ref)+']</span>':''}`;
    }).join(' · ')+(entries.length>8?' <span style="color:var(--mu2)">외 '+(entries.length-8)+'항목</span>':'');
    if(abnormalKeys.length)interpret='⚠️ 참고치 이탈: '+abnormalKeys.join(', ');
  }
  const checked=_labBulkMode&&_labBulkSet.has(labId);
  return `<div style="padding:7px 10px;background:${isLocked?'#f0fdf4':'var(--sf2)'};border:1.5px solid ${isLocked?'#86efac':'var(--bd)'};border-radius:6px;margin-top:4px;${checked?'outline:2px solid #dc2626':''}">
    <div style="display:flex;align-items:center;gap:6px;cursor:pointer" onclick="${_labBulkMode?'_toggleLabBulk('+labId+')':_labFoldToggleJS()}">
      ${_labBulkMode?`<input type="checkbox" ${checked?'checked':''} ${isLocked?'disabled':''} onclick="event.stopPropagation();_toggleLabBulk(${labId})" style="accent-color:#dc2626">`:''}
      <span style="font-size:.72rem">${typeIcons[l.type]||'📋'}</span>
      <span style="font-size:.75rem;font-weight:600">${esc(displayName)}</span>
      ${isLocked?'<span style="font-size:.6rem">🔒</span>':''}
      <span style="font-size:.65rem;color:var(--mu);margin-left:auto">${esc(l.date)}</span>
      <span style="font-size:.6rem;color:var(--mu2)">▾</span>
    </div>
    <div class="brk-lab-body"${_labFoldAll?' style="display:none"':''}>
      <div style="font-size:.7rem;color:var(--tx);margin-top:3px">${summary}</div>
      ${interpret?`<div style="font-size:.65rem;color:#0369a1;margin-top:2px">💡 ${esc(interpret)}</div>`:''}
      ${l.memo?`<div style="margin-top:3px">
        <div style="font-size:.6rem;color:var(--ac);cursor:pointer" onclick="event.stopPropagation();const d=this.nextElementSibling;d.style.display=d.style.display==='none'?'block':'none'">▸ 상세/메모</div>
        <div style="display:none;font-size:.65rem;color:var(--mu);margin-top:3px;padding:5px;background:var(--sf);border-radius:5px;white-space:pre-wrap">${esc(l.memo)}</div>
      </div>`:''}
      ${l.imgSrc?`<div style="margin-top:3px">
        <div style="font-size:.6rem;color:#7c3aed;cursor:pointer" onclick="event.stopPropagation();const d=this.nextElementSibling;d.style.display=d.style.display==='none'?'block':'none'">▸ 원본 이미지</div>
        <div style="display:none;margin-top:4px"><img src="${l.imgSrc}" style="max-width:100%;border-radius:6px;border:1px solid var(--bd)"></div>
      </div>`:''}
      ${_brkMissingFieldsHtml(l)}
      ${_brkMissingRefHtml(l,labId)}
      <div style="display:flex;gap:4px;margin-top:4px;flex-wrap:wrap">
        <button onclick="_brkEditLabType(${labId})" style="font-size:.56rem;padding:2px 6px;border:1px solid var(--mu);border-radius:4px;background:none;color:var(--mu);cursor:pointer;font-family:var(--font)">📝 이름 수정</button>
        <button onclick="_brkEditLabValues(${labId})" style="font-size:.56rem;padding:2px 6px;border:1px solid var(--ac);border-radius:4px;background:none;color:var(--ac);cursor:pointer;font-family:var(--font)">✏️ 수치 수정</button>
        <button onclick="_brkToggleLabLock(${labId})" style="font-size:.56rem;padding:2px 6px;border:1px solid ${isLocked?'#15803d':'var(--bd)'};border-radius:4px;background:${isLocked?'#dcfce7':'none'};color:${isLocked?'#15803d':'var(--mu)'};cursor:pointer;font-family:var(--font)">${isLocked?'🔓 잠금 해제':'🔒 잠금'}</button>
        ${!isLocked?`<button onclick="brkDeleteLab(${labId})" style="font-size:.56rem;padding:2px 6px;border:1px solid #dc2626;border-radius:4px;background:none;color:#dc2626;cursor:pointer;font-family:var(--font)">🗑 삭제</button>`:''}
        ${l.imgSrc?`<button onclick="_brkReanalyzeLab(${labId})" style="font-size:.56rem;padding:2px 6px;border:1px solid #7c3aed;border-radius:4px;background:none;color:#7c3aed;cursor:pointer;font-family:var(--font)">🔄 재분석</button>
        <select onchange="if(this.value){_brkReanalyzeLab(${labId},this.value);this.value='';}" style="font-size:.56rem;padding:2px 4px;border:1px solid var(--bd);border-radius:4px;background:var(--sf);color:var(--mu);font-family:var(--font)">
          <option value="">AI 선택</option>
          ${S.keys?.gemini?'<option value="gemini">Gemini</option>':''}
          ${S.keys?.gpt?'<option value="gpt">GPT</option>':''}
          ${S.keys?.claude?'<option value="claude">Claude</option>':''}
        </select>`:''}
      </div>
    </div>
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

  const labEntry3={ id: Date.now(), date: date, who: who, type: type, values: values, memo: memo };
  m.labResults.push(labEntry3);
  if(typeof _checkAntibodyAndSyncVax==='function')_checkAntibodyAndSyncVax(labEntry3);
  await saveBrkMaster();
  renderView('meds');
  showToast('검사 결과 저장됨');
}

// 📷 검사결과 사진 AI 분석
// 수치 직접 수정
function _brkEditLabValues(labId){
  const m=getBrkMaster();if(!m)return;
  const l=m.labResults.find(x=>x.id===labId);if(!l)return;
  const vals=l.values||{};
  const fieldsHtml=Object.entries(vals).map(([k,v])=>
    `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px"><span style="font-size:.72rem;min-width:80px;color:var(--mu)">${esc(k)}</span><input type="text" id="brk-lab-edit-${esc(k)}" value="${esc(String(v))}" class="dx-form-input" style="flex:1;font-size:.78rem;padding:4px 8px"></div>`
  ).join('');
  const addFieldHtml=`<div style="display:flex;gap:4px;margin-top:6px"><input id="brk-lab-add-key" class="dx-form-input" placeholder="항목명" style="flex:1;font-size:.72rem;padding:4px 6px"><input id="brk-lab-add-val" class="dx-form-input" placeholder="수치" style="flex:1;font-size:.72rem;padding:4px 6px"><button onclick="_brkAddLabField()" style="font-size:.65rem;padding:3px 8px;border:1px solid var(--ac);border-radius:4px;background:none;color:var(--ac);cursor:pointer;white-space:nowrap">+</button></div>`;
  window._brkEditLabId=labId;
  showConfirmModal('✏️ 수치 수정 — '+l.date,
    `<div id="brk-lab-edit-fields">${fieldsHtml}</div>${addFieldHtml}`,
    [{label:'💾 저장',action:_brkSaveEditLabValues,primary:true},{label:'취소',action:closeConfirmModal}]);
}

function _brkAddLabField(){
  const key=document.getElementById('brk-lab-add-key')?.value.trim();
  const val=document.getElementById('brk-lab-add-val')?.value.trim();
  if(!key||!val)return;
  const container=document.getElementById('brk-lab-edit-fields');
  container.insertAdjacentHTML('beforeend',
    `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px"><span style="font-size:.72rem;min-width:80px;color:var(--mu)">${esc(key)}</span><input type="text" id="brk-lab-edit-${esc(key)}" value="${esc(val)}" class="dx-form-input" style="flex:1;font-size:.78rem;padding:4px 8px"></div>`);
  document.getElementById('brk-lab-add-key').value='';
  document.getElementById('brk-lab-add-val').value='';
}

async function _brkSaveEditLabValues(){
  const m=getBrkMaster();if(!m)return;
  const l=m.labResults.find(x=>x.id===window._brkEditLabId);if(!l)return;
  const newVals={};
  document.querySelectorAll('#brk-lab-edit-fields input').forEach(inp=>{
    const key=inp.id.replace('brk-lab-edit-','');
    const raw=inp.value.trim();
    const num=parseFloat(raw);
    newVals[key]=isNaN(num)?raw:num;
  });
  l.values=newVals;
  await saveBrkMaster();
  closeConfirmModal();
  showToast('✅ 수치 수정됨');
  renderView('meds');
}

// 재분석 (Vision 유리 모델 선택)
function _brkMissingFieldsHtml(l){
  if(!l.values||!l.type)return '';
  const expected={semen:['volume','count','motility','morphology'],hormone:['FSH','LH','E2','AMH','TSH'],blood:['Hb','WBC','PLT','AST','ALT']};
  const fields=expected[l.type];if(!fields)return '';
  const nv=l.type==='semen'?_normalizeSemenValues(l.values):l.values;
  // 부분 매칭으로 누락 체크
  const missing=fields.filter(f=>!Object.keys(nv).some(k=>k.toLowerCase().includes(f.toLowerCase())));
  if(!missing.length)return '';
  return `<div style="font-size:.6rem;color:#b45309;margin-top:3px;padding:3px 6px;background:#fef3c7;border-radius:4px">⚠️ 누락: ${missing.join(', ')}</div>`;
}
function _brkMissingRefHtml(l,labId){
  if(!l.values||!Object.keys(l.values).length)return '';
  const ref=l.ref||{};
  const noRef=Object.keys(l.values).filter(k=>!ref[k]&&typeof l.values[k]==='number');
  if(!noRef.length)return '';
  return `<div style="font-size:.58rem;color:var(--mu2);margin-top:2px;display:flex;align-items:center;gap:4px">
    <span>📏 참고치 없는 항목 ${noRef.length}개</span>
    <button onclick="_brkFillStdRef(${labId})" style="font-size:.55rem;padding:1px 6px;border:1px solid var(--bd);border-radius:3px;background:none;color:var(--ac);cursor:pointer;font-family:var(--font)">일반 참고치 추가</button>
  </div>`;
}
// 일반적인 정상 참고치 (KDCA/WHO 기준)
const _STD_REF={
  'wbc':'4.0-10.0','rbc':'4.0-5.5','hemoglobin':'12.0-16.0','hematocrit':'36-48','platelet':'150-400',
  'ast':'0-40','got':'0-40','alt':'0-40','gpt':'0-40','bun':'7-20','creatinine':'0.5-1.2',
  'tsh':'0.35-5.50','fsh':'3.0-12.0','lh':'2.0-12.0','amh':'1.0-10.0','prolactin':'2-25',
  'e2':'30-400','hba1c':'4.0-6.0','glucose':'70-100','cholesterol':'0-200','triglyceride':'0-150',
  'hdl':'40-60','ldl':'0-130','vitamin d':'20-100','25-oh':'20-100',
  'volume':'1.5-6.0','count':'15-200','motility':'42-100','morphology':'4-100',
};
async function _brkFillStdRef(labId){
  const m=getBrkMaster();if(!m)return;
  const l=m.labResults.find(x=>x.id===labId);if(!l?.values)return;
  if(!l.ref)l.ref={};
  let added=0;
  Object.keys(l.values).forEach(k=>{
    if(l.ref[k])return;// 이미 있으면 스킵
    const kl=k.toLowerCase();
    for(const[std,range] of Object.entries(_STD_REF)){
      if(kl.includes(std)){l.ref[k]=range;added++;break;}
    }
  });
  if(!added){showToast('추가할 참고치 없음');return;}
  await saveBrkMaster();showToast('📏 일반 참고치 '+added+'개 추가 (검사실 기준과 다를 수 있음)');renderView('meds');
}
async function _brkReanalyzeLab(labId,forceAiId){
  const m=getBrkMaster();if(!m)return;
  const l=m.labResults.find(x=>x.id===labId);if(!l?.imgSrc)return;
  const aiId=forceAiId||(S.keys?.gemini?'gemini':(S.keys?.gpt?'gpt':(S.keys?.claude?'claude':null)));
  if(!aiId){showToast('⚠️ AI API 키 필요');return;}
  showToast('🔄 '+AI_DEFS[aiId].name+'으로 재분석 중...',8000);
  try{
    // _analyzeOnePhoto 재사용 (비용 추적 + 이미지 분할 + 에러 처리 포함)
    const parsed=await _analyzeOnePhoto({dataUrl:l.imgSrc,type:l.imgSrc.split(';')[0].split(':')[1]||'image/jpeg'},aiId);
    // 기존 값과 비교
    const oldVals=l.values||{};
    const newVals=parsed.values||{};
    const diffHtml=Object.keys({...oldVals,...newVals}).map(k=>{
      const o=oldVals[k],n=newVals[k];
      const changed=String(o)!==String(n);
      return `<div style="font-size:.7rem;padding:2px 0;${changed?'font-weight:600;color:var(--ac)':''}">${esc(k)}: ${o!==undefined?o:'-'} → ${n!==undefined?n:'-'}${changed?' ✦':''}</div>`;
    }).join('');
    showConfirmModal('🔄 재분석 결과 ('+AI_DEFS[aiId].name+')',
      `<div style="margin-bottom:8px">${diffHtml}</div>${parsed.opinion?'<div style="font-size:.7rem;color:#15803d;padding:6px;background:#f0fdf4;border-radius:6px">💡 '+esc(parsed.opinion)+'</div>':''}
      <div style="font-size:.65rem;color:var(--mu);margin-top:6px">✦ = 변경된 수치. 적용하시겠습니까?</div>`,
      [{label:'적용',action:async()=>{l.values=newVals;l.memo=(l.memo||'')+'\n🔄 재분석('+AI_DEFS[aiId].name+'): '+(parsed.opinion||'');await saveBrkMaster();closeConfirmModal();showToast('✅ 재분석 적용');renderView('meds');},primary:true},
       {label:'취소',action:closeConfirmModal}]);
  }catch(e){showToast('❌ 재분석 실패: '+e.message,4000);}
}

// ── 다중 사진 업로드: 미리보기 → 확인 후 분석 ──
var _stagedLabPhotos=[];
function brkStageLabPhotos(input){
  if(!input.files||!input.files.length)return;
  _stagedLabPhotos=[];
  let loaded=0;
  const total=input.files.length;
  Array.from(input.files).forEach((file,i)=>{
    const reader=new FileReader();
    reader.onload=function(e){
      _stagedLabPhotos.push({dataUrl:e.target.result,name:file.name,type:file.type||'image/jpeg'});
      loaded++;
      if(loaded===total)_showStagedPhotos();
    };
    reader.readAsDataURL(file);
  });
  input.value='';
}
function _showStagedPhotos(){
  const thumbs=_stagedLabPhotos.map((p,i)=>`<div style="position:relative;display:inline-block">
    <img src="${p.dataUrl}" style="width:80px;height:80px;object-fit:cover;border-radius:6px;border:1px solid var(--bd)">
    <button onclick="_stagedLabPhotos.splice(${i},1);_showStagedPhotos()" style="position:absolute;top:-4px;right:-4px;background:#dc2626;color:white;border:none;border-radius:50%;width:18px;height:18px;font-size:.6rem;cursor:pointer;line-height:18px">✕</button>
    <div style="font-size:.5rem;color:var(--mu);text-align:center;margin-top:2px">${esc(p.name.slice(0,12))}</div>
  </div>`).join('');
  showConfirmModal('📷 검사결과 사진 ('+_stagedLabPhotos.length+'장)',
    `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px">${thumbs}</div>
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
      <button onclick="document.getElementById('brk-lab-photo-add').click()" style="font-size:.72rem;padding:5px 12px;border:1.5px dashed var(--bd);border-radius:6px;background:none;color:var(--mu);cursor:pointer">+ 사진 추가</button>
      <input type="file" id="brk-lab-photo-add" accept="image/*" multiple style="display:none" onchange="_addMorePhotos(this)">
    </div>
    <div style="font-size:.72rem;font-weight:600;color:var(--mu);margin-bottom:4px">🤖 분석 모드</div>
    <div style="display:flex;flex-direction:column;gap:4px;margin-bottom:10px">
    ${(()=>{
      const opts=_brkVisionAiOptions();
      const availCount=opts.filter(a=>a.available).length;
      const consensusOpt=availCount>=2?`<label style="display:flex;align-items:center;gap:8px;padding:8px 10px;border:2px solid #8b5cf6;border-radius:8px;cursor:pointer;background:#f5f3ff">
        <input type="radio" name="brk-photo-ai" value="_consensus" checked style="accent-color:#8b5cf6">
        <div style="flex:1"><span style="font-size:.75rem;font-weight:700;color:#7c3aed">🏆 멀티 AI 병렬 분석</span>
        <span style="font-size:.6rem;color:#8b5cf6;margin-left:4px">⭐ 추천</span>
        <div style="font-size:.6rem;color:var(--mu2)">${opts.filter(a=>a.available).map(a=>a.name).join('+')} 동시 분석 → 수치 교차 검증 (가장 정확)</div></div>
      </label>`:'';
      const singles=opts.map(a=>`<label style="display:flex;align-items:center;gap:8px;padding:6px 10px;border:1.5px solid var(--bd);border-radius:8px;cursor:${a.available?'pointer':'default'};opacity:${a.available?1:.4};background:var(--sf)">
        <input type="radio" name="brk-photo-ai" value="${a.id}" ${a.available?'':'disabled'} ${!availCount||availCount<2&&a.default?'checked':''} style="accent-color:var(--ac)">
        <div style="flex:1"><span style="font-size:.75rem;font-weight:600;color:${a.color}">${a.name}</span>
        <span style="font-size:.6rem;color:var(--mu);margin-left:4px">${a.tag}</span>
        <div style="font-size:.6rem;color:var(--mu2)">${a.desc}</div></div>
      </label>`).join('');
      return consensusOpt+singles;
    })()}
    </div>
    <div style="font-size:.65rem;color:var(--mu2)">사진 ${_stagedLabPhotos.length}장을 분석합니다.</div>`,
    [{label:'🔬 분석 시작',action:()=>{
      const sel=document.querySelector('input[name="brk-photo-ai"]:checked')?.value;
      closeConfirmModal();
      if(sel==='_consensus')_brkConsensusAnalyze();
      else _brkAnalyzeStagedPhotos(sel);
    },primary:true},
     {label:'취소',action:()=>{_stagedLabPhotos=[];closeConfirmModal();}}]);
}
function _addMorePhotos(input){
  if(!input.files?.length)return;
  let loaded=0;const total=input.files.length;
  Array.from(input.files).forEach(file=>{
    const reader=new FileReader();
    reader.onload=function(e){
      _stagedLabPhotos.push({dataUrl:e.target.result,name:file.name,type:file.type||'image/jpeg'});
      loaded++;if(loaded===total)_showStagedPhotos();
    };
    reader.readAsDataURL(file);
  });
  input.value='';
}
// ── 멀티 AI 병렬 분석 (교차 검증) + 진행률 UI + 실패 시 재시도/제외 ──
var _brkAnalyzeAbort=false;
async function _brkConsensusAnalyze(){
  if(!_stagedLabPhotos.length)return;
  const opts=_brkVisionAiOptions().filter(a=>a.available);
  if(opts.length<2){showToast('⚠️ 멀티 분석에는 2개 이상 AI 키 필요');return _brkAnalyzeStagedPhotos();}
  const aiIds=opts.map(a=>a.id);
  const total=_stagedLabPhotos.length;
  _brkAnalyzeAbort=false;
  _showAnalyzeProgress('멀티 AI 분석',total,'#8b5cf6');
  const allResults=[];
  for(let i=0;i<total;i++){
    if(_brkAnalyzeAbort){allResults.push({error:'사용자 중단',_imgSrc:_stagedLabPhotos[i].dataUrl});continue;}
    _updateProgress(i,total,'📷 사진 '+(i+1)+'/'+total+' — '+aiIds.join('+')+' 동시 분석 중...');
    const detailEl=document.getElementById('brk-ap-detail');if(detailEl)detailEl.innerHTML='';
    const p=_stagedLabPhotos[i];
    // 병렬 호출 + 개별 상태
    let results=await _runParallelAIs(aiIds,p,detailEl);
    // 실패한 AI 있으면 재시도/제외 선택
    let failures=results.filter(r=>r.error);
    while(failures.length>0&&failures.length<results.length&&!_brkAnalyzeAbort){
      const choice=await _askRetryOrSkip(i+1,failures,results);
      if(choice==='skip')break;
      if(choice==='abort'){_brkAnalyzeAbort=true;break;}
      // retry: 실패한 AI만 재실행
      const retryIds=failures.map(f=>f.ai);
      if(detailEl)detailEl.innerHTML='🔄 재시도: '+retryIds.join(', ');
      const retryResults=await _runParallelAIs(retryIds,p,detailEl);
      // 결과 병합: 재시도 성공한 것으로 교체
      retryResults.forEach(rr=>{const idx2=results.findIndex(r=>r.ai===rr.ai);if(idx2>=0)results[idx2]=rr;});
      failures=results.filter(r=>r.error);
    }
    allResults.push(_mergeConsensus(results,p.dataUrl));
  }
  _updateProgress(total,total,'✅ 분석 완료');
  _stagedLabPhotos=[];
  _showConsensusResults(allResults);
}
async function _runParallelAIs(aiIds,photo,detailEl){
  const promises=aiIds.map(async aid=>{
    if(detailEl)detailEl.innerHTML+='<span id="brk-ai-st-'+aid+'" style="color:var(--ac)">'+aid+' 호출 중... </span>';
    try{
      const r=await _analyzeOnePhoto(photo,aid);
      const el=document.getElementById('brk-ai-st-'+aid);if(el){el.style.color='#10b981';el.textContent=aid+' ✅ ';}
      return{ai:aid,result:r};
    }catch(e){
      const el=document.getElementById('brk-ai-st-'+aid);if(el){el.style.color='#dc2626';el.textContent=aid+' ❌ ';}
      return{ai:aid,error:e.message};
    }
  });
  return Promise.all(promises);
}
function _askRetryOrSkip(photoNum,failures,allResults){
  return new Promise(resolve=>{
    const succCount=allResults.filter(r=>!r.error).length;
    const failNames=failures.map(f=>f.ai+': '+f.error).join('<br>');
    const statusEl=document.getElementById('brk-ap-status');
    const detailEl=document.getElementById('brk-ap-detail');
    if(statusEl)statusEl.innerHTML=`<span style="color:#dc2626">⚠️ 사진 ${photoNum} — ${failures.length}개 AI 실패 (${succCount}개 성공)</span>`;
    if(detailEl)detailEl.innerHTML=`<div style="font-size:.62rem;color:#dc2626;margin:4px 0">${failNames}</div>
      <div style="display:flex;gap:6px;margin-top:6px">
        <button id="brk-retry-btn" style="padding:5px 12px;font-size:.72rem;border:1.5px solid #f59e0b;border-radius:6px;background:#fef3c7;color:#92400e;cursor:pointer;font-family:var(--font);font-weight:600">🔄 실패 AI 재시도</button>
        <button id="brk-skip-btn" style="padding:5px 12px;font-size:.72rem;border:1.5px solid #10b981;border-radius:6px;background:#dcfce7;color:#15803d;cursor:pointer;font-family:var(--font)">▶ 성공분만 사용</button>
        <button id="brk-abort-btn" style="padding:5px 12px;font-size:.72rem;border:1.5px solid #dc2626;border-radius:6px;background:#fee2e2;color:#dc2626;cursor:pointer;font-family:var(--font)">⏹ 전체 중단</button>
      </div>`;
    document.getElementById('brk-retry-btn')?.addEventListener('click',()=>resolve('retry'));
    document.getElementById('brk-skip-btn')?.addEventListener('click',()=>resolve('skip'));
    document.getElementById('brk-abort-btn')?.addEventListener('click',()=>resolve('abort'));
  });
}
function _showAnalyzeProgress(title,total,color){
  showConfirmModal('🔬 '+title+' 중...',
    `<div id="brk-analyze-progress">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <div style="flex:1;height:8px;background:var(--bd);border-radius:4px;overflow:hidden"><div id="brk-ap-bar" style="width:0%;height:100%;background:${color};border-radius:4px;transition:width .3s"></div></div>
        <span id="brk-ap-pct" style="font-size:.78rem;font-weight:600;font-family:var(--mono);min-width:40px">0%</span>
      </div>
      <div id="brk-ap-status" style="font-size:.72rem;color:var(--mu)">준비 중...</div>
      <div id="brk-ap-detail" style="font-size:.62rem;color:var(--mu2);margin-top:4px"></div>
    </div>`,
    [{label:'⏹ 중단',action:()=>{_brkAnalyzeAbort=true;},color:'#dc2626'}]);
}
function _updateProgress(i,total,text){
  const pct=Math.round((i/total)*100);
  const bar=document.getElementById('brk-ap-bar');if(bar)bar.style.width=pct+'%';
  const pctEl=document.getElementById('brk-ap-pct');if(pctEl)pctEl.textContent=pct+'%';
  const statusEl=document.getElementById('brk-ap-status');if(statusEl)statusEl.textContent=text;
}
var _consensusResults=[];
function _showConsensusResults(allResults){
  _consensusResults=allResults;
  const hasDivergent=allResults.some(r=>r._confidence&&Object.values(r._confidence).includes('divergent'));
  const html=allResults.map((r,i)=>{
    if(r.error)return `<div style="padding:6px;background:#fef2f2;border-radius:6px;margin-bottom:6px;font-size:.72rem">사진 ${i+1}: ❌ ${esc(r.error)}</div>`;
    const aiCount=r._usedAis?.length||0;
    const aiLabel=aiCount>=2?r._usedAis.join('+')+' 교차 검증':r._usedAis[0]+' 단독';
    const aiColor=aiCount>=2?'#8b5cf6':'#f59e0b';
    // 값 렌더: 일치=태그, 불일치=AI별 비교 + 수동입력
    const valsHtml=r.values?Object.entries(r.values).map(([k,v])=>{
      const conf=r._confidence?.[k]||'';
      if(conf==='divergent'){
        const perAi=r._perAi?.[k]||[];
        const aiCompare=perAi.map(av=>`<span style="font-size:.58rem;padding:1px 5px;border-radius:4px;background:${String(av.val)===String(v)?'#dbeafe':'#fef2f2'};color:${String(av.val)===String(v)?'#1d4ed8':'#dc2626'}">${av.ai}: ${esc(String(av.val))}</span>`).join(' ');
        return `<div style="padding:4px 6px;margin:2px 0;background:#fef2f2;border:1px solid #fca5a5;border-radius:6px">
          <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap">
            <span style="font-size:.65rem;font-weight:600;color:#dc2626;min-width:60px">${esc(k)}</span>
            ${aiCompare}
            <span style="font-size:.45rem;color:#dc2626">?불일치</span>
          </div>
          <div style="display:flex;align-items:center;gap:4px;margin-top:3px">
            <span style="font-size:.58rem;color:var(--mu)">직접 입력:</span>
            <input type="text" data-fix-photo="${i}" data-fix-key="${esc(k)}" value="${esc(String(v))}"
              style="width:80px;font-size:.72rem;padding:2px 6px;border:1.5px solid #f59e0b;border-radius:4px;background:#fffbeb;font-family:var(--mono);color:var(--ink)">
          </div>
        </div>`;
      }
      const confBadge=conf==='unanimous'?'<span style="font-size:.45rem;color:#10b981">✓</span>'
        :conf==='majority'?'<span style="font-size:.45rem;color:#f59e0b">△</span>'
        :conf==='single'?'<span style="font-size:.45rem;color:#6366f1">◆</span>':'';
      return '<span class="log-tag" style="background:#eff6ff;color:#1d4ed8;font-size:.6rem">'+esc(k)+':'+esc(String(v))+' '+confBadge+'</span>';
    }).join(''):'';
    // 원본 이미지 토글 (불일치 있을 때)
    const divKeys=Object.entries(r._confidence||{}).filter(([,c])=>c==='divergent');
    const imgToggle=divKeys.length?`<div style="margin-top:4px">
      <div style="font-size:.6rem;color:#7c3aed;cursor:pointer" onclick="const d=this.nextElementSibling;d.style.display=d.style.display==='none'?'block':'none'">📷 원본 이미지 보기 (${divKeys.length}건 불일치 — 직접 확인)</div>
      <div style="display:none;margin-top:4px"><img src="${r._imgSrc}" style="max-width:100%;max-height:300px;border-radius:6px;border:1px solid var(--bd)"></div>
    </div>`:'';
    return `<div style="padding:8px;background:var(--sf2);border:1px solid ${divKeys.length?'#fca5a5':'var(--bd)'};border-radius:6px;margin-bottom:6px">
      <div style="display:flex;gap:6px;align-items:center">
        <img src="${r._imgSrc}" style="width:36px;height:36px;object-fit:cover;border-radius:4px;cursor:pointer" onclick="this.parentElement.parentElement.querySelector('.brk-img-full')?.click()">
        <div style="flex:1"><div style="font-size:.72rem;font-weight:600">사진 ${i+1}: ${esc(r.type||'기타')} · ${esc(r.date||'')} · ${esc(r.who||'')}</div>
        <div style="font-size:.58rem;color:${aiColor}">${aiLabel}${r._failedAis?.length?' <span style="color:#dc2626">('+r._failedAis.join(',')+' 실패)</span>':''}</div></div>
      </div>
      <div style="margin-top:4px;display:flex;flex-wrap:wrap;gap:2px">${valsHtml}</div>
      ${r.opinion?'<div style="font-size:.62rem;color:#15803d;margin-top:3px">💡 '+esc(r.opinion)+'</div>':''}
      ${imgToggle}
    </div>`;
  }).join('');
  const legend=`<div style="font-size:.58rem;color:var(--mu);margin-top:4px;padding:4px 6px;background:var(--sf2);border-radius:4px">
    ✓일치 △다수결 ◆단독 <span style="color:#dc2626">?불일치→직접 입력 후 저장</span></div>`;
  showConfirmModal('🏆 멀티 AI 분석 완료 ('+allResults.filter(r=>!r.error).length+'/'+allResults.length+')',
    html+legend,
    [{label:'💾 전체 저장'+(hasDivergent?' (수정 반영)':''),action:async()=>{
      // 수동 입력 반영
      document.querySelectorAll('#confirm-body input[data-fix-photo]').forEach(inp=>{
        const pi=parseInt(inp.dataset.fixPhoto);const k=inp.dataset.fixKey;
        if(_consensusResults[pi]?.values){
          const raw=inp.value.trim();const num=parseFloat(raw);
          _consensusResults[pi].values[k]=isNaN(num)?raw:num;
        }
      });
      const m=getBrkMaster();if(!m)return;let saved=0;
      _consensusResults.forEach(r=>{
        if(r.error)return;
        const typeMap={semen:'semen',blood:'blood',hormone:'hormone',ultrasound:'ultrasound'};
        const type=typeMap[r.type]||'other';
        const memo=['🏆 멀티AI('+r._usedAis.join('+')+')',...(r.abnormal||[]).map(a=>'⚠️ '+a),r.opinion?'💡 '+r.opinion:''].filter(Boolean).join('; ');
        const entry={id:Date.now()+saved,date:r.date||kstToday(),who:r.who||'붕쌤',type,values:r.values||{},memo,imgSrc:r._imgSrc};
        if(r.ref)entry.ref=r.ref;
        m.labResults.push(entry);
        if(typeof _checkAntibodyAndSyncVax==='function')_checkAntibodyAndSyncVax(entry);
        saved++;
      });
      if(saved){await saveBrkMaster();showToast('✅ '+saved+'건 저장됨 (수정 반영)');}
      closeConfirmModal();_consensusResults=[];renderView('meds');
    },primary:true}]);
}
function _mergeConsensus(results,imgSrc){
  const successes=results.filter(r=>!r.error&&r.result);
  const failures=results.filter(r=>r.error);
  const failedAis=failures.map(r=>r.ai);
  if(!successes.length)return{error:'모든 AI 실패: '+results.map(r=>r.ai+':'+r.error).join(', '),_imgSrc:imgSrc};
  if(successes.length===1){const r=successes[0].result;r._imgSrc=imgSrc;r._usedAis=[successes[0].ai];r._failedAis=failedAis;r._confidence={};Object.keys(r.values||{}).forEach(k=>r._confidence[k]='single');return r;}
  // 다수결 병합
  const base={...successes[0].result};base._imgSrc=imgSrc;base._usedAis=successes.map(s=>s.ai);base._failedAis=failedAis;base._confidence={};base._perAi={};
  // type/date/who — 다수결
  const types=successes.map(s=>s.result.type).filter(Boolean);base.type=_majority(types)||base.type;
  const dates=successes.map(s=>s.result.date).filter(Boolean);base.date=_majority(dates)||base.date;
  const whos=successes.map(s=>s.result.who).filter(Boolean);base.who=_majority(whos)||base.who;
  // values — 키별 다수결/평균
  const allKeys=new Set();
  successes.forEach(s=>Object.keys(s.result.values||{}).forEach(k=>allKeys.add(k)));
  const mergedVals={};
  allKeys.forEach(k=>{
    const aiVals=successes.map(s=>({ai:s.ai,val:(s.result.values||{})[k]})).filter(av=>av.val!==undefined);
    if(!aiVals.length)return;
    const vals=aiVals.map(av=>av.val);
    const nums=vals.map(v=>parseFloat(v)).filter(v=>!isNaN(v));
    if(nums.length===vals.length&&nums.length>1){
      const allSame=nums.every(n=>Math.abs(n-nums[0])<0.01);
      if(allSame){mergedVals[k]=nums[0];base._confidence[k]='unanimous';}
      else{
        const sorted=[...nums].sort((a,b)=>a-b);
        mergedVals[k]=sorted[Math.floor(sorted.length/2)];
        const spread=Math.max(...nums)-Math.min(...nums);
        base._confidence[k]=spread/Math.max(1,mergedVals[k])<0.1?'majority':'divergent';
      }
    }else{
      const strVals=vals.map(String);
      mergedVals[k]=_majority(strVals)||vals[0];
      const allSame=strVals.every(v=>v===strVals[0]);
      base._confidence[k]=allSame?'unanimous':(strVals.filter(v=>v===mergedVals[k]).length>1?'majority':'divergent');
    }
    // 불일치 시 AI별 값 저장
    if(base._confidence[k]==='divergent'||base._confidence[k]==='majority'){
      base._perAi[k]=aiVals;
    }
  });
  base.values=mergedVals;
  // ref (참고치) — 합집합 병합
  const mergedRef={};
  successes.forEach(s=>{if(s.result.ref)Object.entries(s.result.ref).forEach(([k,v])=>{if(!mergedRef[k])mergedRef[k]=v;});});
  if(Object.keys(mergedRef).length)base.ref=mergedRef;
  // opinion — 가장 긴 것
  const opinions=successes.map(s=>s.result.opinion).filter(Boolean);
  base.opinion=opinions.sort((a,b)=>b.length-a.length)[0]||'';
  // abnormal — 합집합
  base.abnormal=[...new Set(successes.flatMap(s=>s.result.abnormal||[]))];
  return base;
}
function _majority(arr){const freq={};arr.forEach(v=>{freq[v]=(freq[v]||0)+1;});return Object.entries(freq).sort((a,b)=>b[1]-a[1])[0]?.[0];}

function _brkVisionAiOptions(){
  return [
    {id:'gemini',name:'Gemini',color:'#4285f4',tag:'⭐ 추천',desc:'Vision 최적화, 표/수치 인식 우수, 빠름',available:!!S.keys?.gemini,default:!!S.keys?.gemini},
    {id:'claude',name:'Claude',color:'#c96442',tag:'정밀',desc:'복잡한 레이아웃/손글씨 판독 우수',available:!!S.keys?.claude,default:!S.keys?.gemini&&!!S.keys?.claude},
    {id:'gpt',name:'GPT',color:'#10a37f',tag:'범용',desc:'범용 Vision, 안정적 JSON 출력',available:!!S.keys?.gpt,default:!S.keys?.gemini&&!S.keys?.claude&&!!S.keys?.gpt},
  ];
}
async function _brkAnalyzeStagedPhotos(selectedAiId){
  if(!_stagedLabPhotos.length)return;
  const aiId=selectedAiId||(S.keys?.gemini?'gemini':(S.keys?.claude?'claude':(S.keys?.gpt?'gpt':null)));
  if(!aiId||!S.keys?.[aiId]){showToast('⚠️ AI API 키 필요');return;}
  const total=_stagedLabPhotos.length;
  _brkAnalyzeAbort=false;
  _showAnalyzeProgress(aiId+' 분석',total,'var(--ac)');
  const results=[];
  for(let i=0;i<total;i++){
    if(_brkAnalyzeAbort){results.push({error:'사용자 중단',_imgSrc:_stagedLabPhotos[i].dataUrl});continue;}
    _updateProgress(i,total,'📷 사진 '+(i+1)+'/'+total+' — '+aiId+' 분석 중...');
    const p=_stagedLabPhotos[i];
    try{
      const parsed=await _analyzeOnePhoto(p,aiId);
      parsed._imgSrc=p.dataUrl;
      results.push(parsed);
    }catch(e){results.push({error:e.message,_imgSrc:p.dataUrl});}
  }
  _updateProgress(total,total,'✅ 분석 완료');
  _stagedLabPhotos=[];
  // 결과 확인 모달
  const html=results.map((r,i)=>{
    if(r.error)return `<div style="padding:6px;background:#fef2f2;border-radius:6px;margin-bottom:6px;font-size:.72rem"><b>사진 ${i+1}:</b> ❌ ${esc(r.error)}</div>`;
    const vals=r.values?Object.entries(r.values).map(([k,v])=>'<span class="log-tag" style="background:#eff6ff;color:#1d4ed8;font-size:.6rem">'+esc(k)+':'+esc(String(v))+'</span>').join(' '):'';
    return `<div style="padding:8px;background:var(--sf2);border:1px solid var(--bd);border-radius:6px;margin-bottom:6px">
      <div style="display:flex;gap:6px;align-items:center"><img src="${r._imgSrc}" style="width:40px;height:40px;object-fit:cover;border-radius:4px">
      <div><div style="font-size:.72rem;font-weight:600">사진 ${i+1}: ${esc(r.type||'기타')} · ${esc(r.date||'미인식')} · ${esc(r.who||'')}</div>
      <div style="display:flex;flex-wrap:wrap;gap:2px;margin-top:2px">${vals}</div></div></div>
      ${r.opinion?'<div style="font-size:.65rem;color:#15803d;margin-top:4px">💡 '+esc(r.opinion)+'</div>':''}
    </div>`;
  }).join('');
  showConfirmModal('📷 분석 완료 ('+results.filter(r=>!r.error).length+'/'+results.length+')',
    html+'<div style="font-size:.7rem;color:var(--mu);margin-top:6px">성공한 결과를 모두 저장하시겠습니까?</div>',
    [{label:'💾 전체 저장',action:async()=>{
      const m=getBrkMaster();if(!m)return;
      let saved=0;
      results.forEach(r=>{
        if(r.error)return;
        const typeMap={semen:'semen',blood:'blood',hormone:'hormone',ultrasound:'ultrasound'};
        const type=typeMap[r.type]||'other';
        const values=r.values||{};
        const memo=[(r.abnormal||[]).map(a=>'⚠️ '+a).join('; '),r.opinion?'💡 '+r.opinion:''].filter(Boolean).join('; ');
        const entry2={id:Date.now()+saved,date:r.date||kstToday(),who:r.who||'붕쌤',type,values,memo:'📷 사진분석: '+memo,imgSrc:r._imgSrc};
        if(r.ref)entry2.ref=r.ref;
        m.labResults.push(entry2);
        if(typeof _checkAntibodyAndSyncVax==='function')_checkAntibodyAndSyncVax(entry2);
        saved++;
      });
      if(saved){await saveBrkMaster();showToast('✅ '+saved+'건 저장됨');}
      closeConfirmModal();renderView('meds');
    },primary:true},{label:'취소',action:closeConfirmModal}]);
}
// 이미지 전처리 — 5MB 초과 시 분할 (해상도 유지), 이하면 그대로
const _IMG_MAX_BYTES=4500000;
async function _prepareImage(dataUrl){
  const base64=dataUrl.split(',')[1]||'';
  if(base64.length<=_IMG_MAX_BYTES) return {mode:'single',tiles:[dataUrl]};
  // 분할 전송: 원본 해상도 유지하면서 2~4등분
  return new Promise(resolve=>{
    const img=new Image();
    img.onload=function(){
      const w=img.width,h=img.height;
      // 세로가 길면 상하 분할, 가로가 길면 좌우 분할
      const isPortrait=h>w;
      const splits=base64.length>_IMG_MAX_BYTES*3?4:(base64.length>_IMG_MAX_BYTES*1.5?3:2);
      const tiles=[];
      for(let i=0;i<splits;i++){
        const canvas=document.createElement('canvas');
        if(isPortrait){
          const tileH=Math.ceil(h/splits);const sy=i*tileH;const sh=Math.min(tileH+20,h-sy);// +20px 겹침
          canvas.width=w;canvas.height=sh;
          canvas.getContext('2d').drawImage(img,0,sy,w,sh,0,0,w,sh);
        }else{
          const tileW=Math.ceil(w/splits);const sx=i*tileW;const sw=Math.min(tileW+20,w-sx);
          canvas.width=sw;canvas.height=h;
          canvas.getContext('2d').drawImage(img,sx,0,sw,h,0,0,sw,h);
        }
        tiles.push(canvas.toDataURL('image/jpeg',0.92));
      }
      resolve({mode:'tiled',tiles,splits,direction:isPortrait?'vertical':'horizontal'});
    };
    img.onerror=()=>resolve({mode:'single',tiles:[dataUrl]});
    img.src=dataUrl;
  });
}
async function _analyzeOnePhoto(photo,aiId){
  const prep=await _prepareImage(photo.dataUrl);
  const tiles=prep.tiles;
  const isTiled=prep.mode==='tiled';
  const tileNote=isTiled?`\n주의: 이 ${tiles.length}개 이미지는 하나의 검사결과지를 ${prep.direction==='vertical'?'상하':'좌우'}로 분할한 것입니다. 모든 이미지의 수치를 합산하여 하나의 JSON으로 응답하세요.`:'';
  const prompt=`이 이미지는 의료 검사 결과지(혈액검사, 호르몬검사, 정액검사, 초음파 등)입니다.${tileNote}
다음을 추출하세요:
1. 검사 종류 (semen/blood/hormone/ultrasound/other)
2. 검사 날짜 (YYYY-MM-DD)
3. 검사 대상 (남성이면 "붕쌤", 여성이면 "오랑이")
4. 모든 수치 결과 — 항목명에 단위를 포함 (예: "TSH(mIU/L)": 3.63). 빠짐없이 전부 추출
5. 정상 범위 (참고치가 보이면 ref에 기록)
6. 이상 소견 + 임신 준비 관점 소견
반드시 JSON으로 응답:
{"type":"blood","date":"YYYY-MM-DD","who":"오랑이","values":{"WBC(10^3/uL)":6.78,"TSH(mIU/L)":3.63},"ref":{"WBC(10^3/uL)":"4.0-10.0","TSH(mIU/L)":"0.35-5.50"},"abnormal":["이상소견"],"opinion":"소견"}
중요 규칙:
1. values 키에 반드시 단위를 괄호로 포함 (예: "TSH(mIU/L)")
2. ref는 검사지에 인쇄된 참고치(정상범위)를 그대로 기록 — 검사실마다 다를 수 있으므로 검사지의 값을 우선
3. 검사지에 참고치가 없는 항목은 ref에서 제외 (임의로 넣지 말 것)
4. abnormal은 참고치 범위를 벗어난 항목만 기록`;
  let result='';
  if(aiId==='gemini'){
    const gemModel=S.models?.gemini||DEFAULT_MODELS.gemini;
    const parts=tiles.map(t=>{const b=t.split(',')[1];const mt=t.startsWith('data:image/jpeg')?'image/jpeg':'image/png';return{inline_data:{mime_type:mt,data:b}};});
    parts.push({text:prompt});
    const resp=await fetchWithRetry('https://generativelanguage.googleapis.com/v1beta/models/'+gemModel+':generateContent?key='+S.keys.gemini,{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({contents:[{parts}]})});
    const d=await resp.json();
    if(d.error)throw new Error('Gemini: '+(d.error.message||d.error.status||JSON.stringify(d.error)));
    result=d.candidates?.[0]?.content?.parts?.[0]?.text||'';
    if(!result)throw new Error('Gemini: 빈 응답'+(d.candidates?.[0]?.finishReason?' ('+d.candidates[0].finishReason+')':''));
    // 비용 추적
    const gu=d.usageMetadata;if(gu)recordUsage('gemini',gemModel,gu.promptTokenCount||0,gu.candidatesTokenCount||0);
  }else if(aiId==='claude'){
    const clModel=S.models?.claude||DEFAULT_MODELS.claude;
    const content=tiles.map(t=>{const b=t.split(',')[1];const mt=t.startsWith('data:image/jpeg')?'image/jpeg':'image/png';return{type:'image',source:{type:'base64',media_type:mt,data:b}};});
    content.push({type:'text',text:prompt});
    const resp=await fetchWithRetry('https://api.anthropic.com/v1/messages',{method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':S.keys.claude,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
      body:JSON.stringify({model:clModel,max_tokens:2000,messages:[{role:'user',content}]})});
    const d=await resp.json();
    if(d.error)throw new Error('Claude: '+(d.error.message||JSON.stringify(d.error)));
    result=d.content?.[0]?.text||'';
    if(!result)throw new Error('Claude: 빈 응답');
    // 비용 추적
    if(d.usage)recordUsage('claude',clModel,d.usage.input_tokens||0,d.usage.output_tokens||0);
  }else{
    const gptModel=S.models?.gpt||DEFAULT_MODELS.gpt;
    const content=tiles.map(t=>({type:'image_url',image_url:{url:t,detail:'high'}}));
    content.push({type:'text',text:prompt});
    const body={model:gptModel,max_completion_tokens:4000,messages:[{role:'user',content}]};
    const resp=await fetchWithRetry('https://api.openai.com/v1/chat/completions',{method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+S.keys.gpt},
      body:JSON.stringify(body)});
    const d=await resp.json();
    if(d.error)throw new Error('GPT: '+(d.error.message||d.error.code||JSON.stringify(d.error)));
    result=d.choices?.[0]?.message?.content||'';
    if(!result)throw new Error('GPT: 빈 응답');
    // 비용 추적
    if(d.usage)recordUsage('gpt',gptModel,d.usage.prompt_tokens||0,d.usage.completion_tokens||0);
  }
  const jsonMatch=result.match(/\{[\s\S]*\}/);
  if(!jsonMatch)throw new Error('인식 실패');
  return JSON.parse(jsonMatch[0]);
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
  const imgSrc=window._brkLabPhotoBase64||null;
  const labEntry={id:Date.now(),date:parsed.date||kstToday(),who:parsed.who||'붕쌤',type,values,memo:'📷 사진분석: '+memo,imgSrc};
  if(parsed.ref)labEntry.ref=parsed.ref;
  m.labResults.push(labEntry);
  if(typeof _checkAntibodyAndSyncVax==='function')_checkAntibodyAndSyncVax(labEntry);
  await saveBrkMaster();
  closeConfirmModal();
  delete window._brkLabPhotoResult;
  renderView('meds');
  showToast('✅ 검사결과 저장됨');
}

async function brkDeleteLab(labId) {
  var m = getBrkMaster(); if (!m) return;
  var target=m.labResults.find(function(l){return l.id===labId;});
  if(target?.locked){showToast('🔒 잠금된 항목입니다. 잠금 해제 후 삭제하세요.');return;}
  if(!confirm('이 검사결과를 삭제하시겠습니까?'))return;
  m.labResults = m.labResults.filter(function(l){return l.id !== labId;});
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

// 한국 약품명에서 브랜드명·성분명 후보를 추출
function _extractDrugCandidates(rawName) {
  var s = rawName.replace(/\s*\(PRN\)\s*/i,'').replace(/\s*\(정규\)\s*/i,'').trim();
  var candidates = [s];
  // 괄호 안 성분명 추출: "타이레놀정500밀리그람(아세트아미노펜)" → 아세트아미노펜
  var m = s.match(/^([^(]+)\(([^)]+)\)$/);
  if (m) {
    candidates.push(m[1].trim()); // 브랜드+제형
    candidates.push(m[2].trim()); // 성분명
  }
  // 제형·용량 제거: 정, 캡슐, 밀리그람, 시럽, 정제 등
  candidates = candidates.concat(candidates.map(function(c){
    return c.replace(/[정캡슐]+\d*.*$/,'').replace(/\d+(밀리그람|mg|mcg|ug).*/i,'').trim();
  }).filter(Boolean));
  // 성분명에서 "나트륨수화물","나트륨","수화물","염산염" 등 접미사 제거하여 추가
  candidates = candidates.concat(candidates.map(function(c){
    return c.replace(/(나트륨|수화물|염산염|칼슘|마그네슘|칼륨)+$/g,'').trim();
  }).filter(Boolean));
  // 중복 제거
  var seen = {};
  return candidates.filter(function(c){ if(!c||seen[c])return false; seen[c]=true; return true; });
}

function _lookupDrugSafety(name) {
  var candidates = _extractDrugCandidates(name);
  // 1) 내장 DB 직접 매칭 + 한영 매핑
  for (var i=0; i<candidates.length; i++) {
    var c = candidates[i];
    var safety = _PREGNANCY_SAFETY[c];
    if (safety) return {...safety, source:'내장DB'};
    var eng = _DRUG_NAMES[c];
    if (eng) { safety = _PREGNANCY_SAFETY[eng]; if (safety) return {...safety, source:'내장DB'}; }
    // 부분 매칭: _DRUG_NAMES 키에 후보가 포함되어 있는지
    for (var ko in _DRUG_NAMES) {
      if (ko === c || c.indexOf(ko) >= 0 || ko.indexOf(c) >= 0) {
        safety = _PREGNANCY_SAFETY[_DRUG_NAMES[ko]];
        if (safety) return {...safety, source:'내장DB'};
      }
    }
  }
  // 2) localStorage 캐시
  try {
    var cache = JSON.parse(localStorage.getItem('om_preg_drug_db')||'{}');
    for (var j=0; j<candidates.length; j++) {
      if (cache[candidates[j]]) return {...cache[candidates[j]], source:'AI검색'};
      var eng2 = _DRUG_NAMES[candidates[j]];
      if (eng2 && cache[eng2]) return {...cache[eng2], source:'AI검색'};
    }
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
  // 정규화된 성분명으로 검색 시도
  var candidates=_extractDrugCandidates(drugName);
  var searchName=drugName;
  for(var i=0;i<candidates.length;i++){
    var eng=_DRUG_NAMES[candidates[i]];
    if(eng){searchName=eng;break;}
  }
  const result=await fetchDrugSafetyPerplexity(searchName);
  if(result){
    // 원본명과 영문명 모두 캐시
    _cacheDrugSafety(drugName,result);
    if(searchName!==drugName) _cacheDrugSafety(searchName,result);
  }
  if(el) el.style.display='none';
  if(result){showToast('✅ '+drugName+' 안전 정보 갱신');renderView('meds');}
  else showToast('⚠️ 검색 실패');
}

// ── 임신 관련 접종 탭 (bungruki) ──
function _renderBrkVaccineTab(){
  const pregVaxKeys=Object.entries(typeof _VACCINE_DB!=='undefined'?_VACCINE_DB:{}).filter(([k,v])=>v.pregnancy).map(([k])=>k);
  if(!pregVaxKeys.length)return '<div style="color:var(--mu);font-size:.72rem;text-align:center;padding:20px">접종 데이터를 불러오는 중...</div>';
  const allRecs=typeof getPregnancyVaccinations==='function'?getPregnancyVaccinations():[];
  // 도메인별로 그룹
  const byWho={오랑이:[],붕쌤:[]};
  allRecs.forEach(r=>{const w=r.who||'';if(byWho[w])byWho[w].push(r);});

  function renderPersonVax(who,recs,color,icon){
    const byVax={};
    recs.forEach(r=>{if(!byVax[r.vaccine])byVax[r.vaccine]=[];byVax[r.vaccine].push(r);});
    const done=pregVaxKeys.filter(k=>{const d=byVax[k]||[];const nr=d.some(r=>r.status==='non-responder');return !nr&&(d.length>=_VACCINE_DB[k].doses||d.some(r=>r.status==='antibody'||r.status==='childhood'));}).length;
    const pct=Math.round(done/pregVaxKeys.length*100);
    const rows=pregVaxKeys.map(key=>{
      const vax=_VACCINE_DB[key];const doses=byVax[key]||[];
      const hasAb=doses.some(d=>d.status==='antibody');
      const hasCh=doses.some(d=>d.status==='childhood');
      const hasNR=doses.some(d=>d.status==='non-responder');
      const complete=!hasNR&&(doses.length>=vax.doses||hasAb||hasCh);
      const icon2=hasNR?'⚠️':hasAb?'🛡️':hasCh?'👶':complete?'✅':'⬜';
      const liveTag=vax.live?'<span style="font-size:.48rem;background:#fef2f2;color:#dc2626;padding:1px 3px;border-radius:3px">생백신</span>':'';
      const statusInfo=hasNR?'⚠️ 항체 미형성':hasAb?'항체 확인':hasCh?'어릴 때 접종':doses.length?doses.map(d=>d.date!=='미상'?d.date:'').filter(Boolean).join(', '):'';
      return `<div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--bd)">
        <span style="font-size:.72rem;width:20px;text-align:center">${icon2}</span>
        <div style="flex:1;min-width:0"><span style="font-size:.7rem;color:${complete?'var(--mu)':'var(--ink)'};${complete?'text-decoration:line-through':''}">${vax.label}</span> ${liveTag}</div>
        <span style="font-size:.55rem;color:var(--mu2)">${statusInfo}</span>
      </div>`;
    }).join('');
    return `<div style="margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <span style="font-size:.9rem">${icon}</span>
        <span style="font-size:.78rem;font-weight:700;color:${color}">${who}</span>
        <span style="font-size:.6rem;color:var(--mu)">${done}/${pregVaxKeys.length}</span>
        <div style="flex:1;height:4px;background:var(--bd);border-radius:2px;overflow:hidden;max-width:80px">
          <div style="width:${pct}%;height:100%;background:${color};border-radius:2px"></div>
        </div>
      </div>${rows}</div>`;
  }
  const orangiHtml=renderPersonVax('오랑이',byWho['오랑이'],'#ec4899','🧡');
  const bungHtml=renderPersonVax('붕쌤',byWho['붕쌤'],'#06b6d4','🩵');

  return `<div>
    <div style="font-size:.72rem;color:var(--mu);margin-bottom:8px;padding:6px 8px;background:#fdf2f8;border-radius:6px;border:1px solid #fbcfe8">
      💡 임신 관련 접종은 각 건강관리 도메인(오랑이/붕쌤)에서 기록하면 여기에 자동 표시됩니다.
    </div>
    ${orangiHtml}${bungHtml}
    <div style="font-size:.62rem;color:var(--mu2);padding:6px;background:var(--sf2);border-radius:6px">
      ※ MMR·수두는 <b>생백신</b>이므로 임신 중 접종 불가 → 임신 전 완료 필수<br>
      ※ Tdap은 <b>매 임신</b> 27-36주에 1회 접종 권장 (신생아 백일해 예방)<br>
      ※ 인플루엔자는 임신 중 접종 안전 (불활성화 백신)
    </div>
  </div>`;
}

function _isDrugNotTreatment(med) {
  // 시술/치료/검사/설명은 약물 안전성 탭에서 제외
  var clean = med.replace(/\s*\(PRN\)\s*/i,'').replace(/\s*\(정규\)\s*/i,'').trim();
  // _AC_TREATMENTS 목록에 있는 시술/검사
  if (typeof _AC_TREATMENTS!=='undefined' && _AC_TREATMENTS.indexOf(clean)>=0) return false;
  // block/치료/검사/시술 패턴
  if (/\bblock\b/i.test(clean)) return false;
  if (/^(물리치료|도수치료|운동치료|CBT|EMDR|DBT|MRI|CT|X-ray|초음파|심전도|EEG|수술|시술)/i.test(clean)) return false;
  // 문장형 설명 (마침표 포함 또는 20자 이상+공백 3개 이상)
  if (clean.indexOf('.') >= 0 && clean.length > 15) return false;
  if (clean.length > 20 && (clean.split(/\s+/).length >= 4)) return false;
  return true;
}

function _renderDrugCard(name, info) {
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
    :source==='AI검색'?'<span style="font-size:.58rem;color:#f59e0b">🔍 AI검색</span>'
    :'<span style="font-size:.58rem;color:var(--mu2)">데이터 없음</span>';
  var refreshBtn = !safety?`<button onclick="refreshDrugSafety('${esc(name)}')" class="accum-del" style="font-size:.62rem;color:var(--ac)" title="Perplexity로 검색">🔍 검색</button>`
    :(source==='AI검색'?`<button onclick="refreshDrugSafety('${esc(name)}')" class="accum-del" style="font-size:.62rem;color:var(--mu)" title="재검색">🔄</button>`:'');

  return '<div style="padding:10px 12px;background:'+fb+';border:1.5px solid '+fc+'30;border-radius:8px;margin-bottom:5px">'
    + '<div style="display:flex;align-items:center;gap:8px">'
    + '<span style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:'+fc+';color:white;font-size:.68rem;font-weight:700">'+fda.charAt(0)+'</span>'
    + '<div style="flex:1">'
    + '<div style="font-size:.78rem;font-weight:600">'+esc(info.originalNames[0].replace(/\s*\(PRN\)/i,' (PRN)').replace(/\s*\(정규\)/i,' (정규)'))+'</div>'
    + (name!==info.originalNames[0]?'<div style="font-size:.6rem;color:var(--ac)">'+esc(name)+'</div>':'')
    + '<div style="font-size:.62rem;color:var(--mu)">'+info.conditions.join(', ')+'</div>'
    + '</div>'
    + srcLabel + refreshBtn
    + '<span id="ds-loading-'+esc(name)+'" style="display:none;font-size:.6rem;color:var(--ac)">검색중...</span>'
    + '</div>'
    + badges + detail
    + '</div>';
}

function renderDrugSafety() {
  // 유저별로 약물 수집
  var byUser = {'오랑이':{}, '붕쌤':{}};
  Object.entries(S.domainState).forEach(function(entry){
    var domainId = entry[0], ds = entry[1];
    var dd = DOMAINS[domainId];
    if (!dd || domainId === 'bungruki' || !ds.master?.conditions) return;
    var user = dd.user;
    if (!byUser[user]) byUser[user] = {};
    ds.master.conditions.forEach(function(c){
      if (!c.medsList?.length || c.status === 'resolved') return;
      c.medsList.forEach(function(med){
        if (!_isDrugNotTreatment(med)) return;
        var candidates = _extractDrugCandidates(med);
        var key = med;
        for (var ci=0; ci<candidates.length; ci++) {
          var eng = _DRUG_NAMES[candidates[ci]];
          if (eng) { key = eng; break; }
          if (_PREGNANCY_SAFETY[candidates[ci]]) { key = candidates[ci]; break; }
        }
        if (!byUser[user][key]) byUser[user][key] = { conditions: [], originalNames: [] };
        var condLabel = c.name || dd.label;
        if (byUser[user][key].conditions.indexOf(condLabel) < 0) byUser[user][key].conditions.push(condLabel);
        if (byUser[user][key].originalNames.indexOf(med) < 0) byUser[user][key].originalNames.push(med);
      });
    });
  });

  // 유저별 섹션 렌더링
  function renderUserSection(userName, userIcon, userColor, meds) {
    var entries = Object.entries(meds);
    if (!entries.length) return '<div style="font-size:.72rem;color:var(--mu2);padding:8px;text-align:center">등록된 약물이 없습니다.</div>';
    // 위험도 순 정렬: X > D > C > B > A > ?
    var order = {'X':0,'D':1,'C':2,'B':3,'A':4,'?':5,'N/A':5};
    entries.sort(function(a,b){
      var sa = _lookupDrugSafety(a[0]), sb = _lookupDrugSafety(b[0]);
      var fa = sa?.fda||'?', fb2 = sb?.fda||'?';
      return (order[fa.charAt(0)]||5) - (order[fb2.charAt(0)]||5);
    });
    return entries.map(function(e){ return _renderDrugCard(e[0], e[1]); }).join('');
  }

  var orangiCards = renderUserSection('오랑이','🧡','#f97316',byUser['오랑이']);
  var bungCards = renderUserSection('붕쌤','🩵','#06b6d4',byUser['붕쌤']);
  var totalCount = Object.keys(byUser['오랑이']).length + Object.keys(byUser['붕쌤']).length;

  if (!totalCount) {
    orangiCards = '<div class="hint">교차 도메인에서 활성 약물이 없습니다.<br>다른 도메인에서 질환/투약을 등록하면 여기에 자동 표시됩니다.</div>';
    bungCards = '';
  }

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
    + (totalCount ? '<div style="margin-bottom:12px">'
      + '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px"><span style="font-size:.88rem">🧡</span><span style="font-size:.78rem;font-weight:700;color:#f97316">오랑이</span><span style="font-size:.6rem;color:var(--mu)">'+Object.keys(byUser['오랑이']).length+'개</span></div>'
      + orangiCards
      + '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;margin-top:14px"><span style="font-size:.88rem">🩵</span><span style="font-size:.78rem;font-weight:700;color:#06b6d4">붕쌤</span><span style="font-size:.6rem;color:var(--mu)">'+Object.keys(byUser['붕쌤']).length+'개</span></div>'
      + bungCards
      + '</div>' : orangiCards)
    + cacheStats
    + '</div>';
}

// ── 7-6: 메인 대시보드 렌더러 ──

function renderBungrukiDashboard() {
  var tabs = [
    {id:'cycle',label:'🩸 생리주기',color:'#dc2626'},
    {id:'daily',label:'✅ 일일체크',color:'#16a34a'},
    {id:'lab',label:'🔬 검사결과',color:'#2563eb'},
    {id:'vaccine',label:'💉 접종',color:'#0891b2'},
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
  else if (_brkDashTab === 'vaccine') contentHtml = _renderBrkVaccineTab();
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
