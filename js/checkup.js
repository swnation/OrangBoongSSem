// js/checkup.js — 건강 검진 표준화 아카이브 (Phase 7 모듈화)

// ═══════════════════════════════════════════════════════════════
// AI 작업 진행률 오버레이 (규칙 #34: 실시간 진행률 필수)
// ═══════════════════════════════════════════════════════════════
var _ckProgressAbort = false;

function _showCkProgress(title, color) {
  _ckProgressAbort = false;
  let overlay = document.getElementById('ck-progress-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'ck-progress-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:998;display:flex;align-items:center;justify-content:center';
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `<div style="background:var(--sf,#fff);border-radius:14px;padding:24px;max-width:340px;width:85vw;box-shadow:0 4px 20px rgba(0,0,0,.3);text-align:center">
    <div id="ck-prog-title" style="font-size:.88rem;font-weight:700;color:${color || 'var(--ac)'};margin-bottom:12px">${title}</div>
    <div style="height:6px;background:var(--bd);border-radius:3px;overflow:hidden;margin-bottom:8px">
      <div id="ck-prog-bar" style="height:100%;width:0%;background:${color || 'var(--ac)'};border-radius:3px;transition:width .3s"></div>
    </div>
    <div id="ck-prog-pct" style="font-size:1.1rem;font-weight:700;color:var(--ink);margin-bottom:4px">0%</div>
    <div id="ck-prog-status" style="font-size:.72rem;color:var(--mu);margin-bottom:12px">준비 중...</div>
    <button id="ck-prog-stop" onclick="_ckProgressAbort=true;this.textContent='⏹ 중단 요청됨';this.disabled=true" style="padding:8px 20px;border:1.5px solid #dc2626;border-radius:8px;background:none;color:#dc2626;font-size:.78rem;font-weight:600;cursor:pointer;font-family:var(--font)">⏹ 중단</button>
  </div>`;
  overlay.style.display = 'flex';
}

function _updateCkProgress(current, total, status) {
  const pct = total ? Math.round(current / total * 100) : 0;
  const bar = document.getElementById('ck-prog-bar');
  const pctEl = document.getElementById('ck-prog-pct');
  const statusEl = document.getElementById('ck-prog-status');
  if (bar) bar.style.width = pct + '%';
  if (pctEl) pctEl.textContent = pct + '%';
  if (statusEl) statusEl.textContent = status || '';
}

function _closeCkProgress() {
  const overlay = document.getElementById('ck-progress-overlay');
  if (overlay) overlay.style.display = 'none';
}

// ═══════════════════════════════════════════════════════════════
// CATEGORIES
// ═══════════════════════════════════════════════════════════════
const _CHECKUP_CATEGORIES = {
  cbc:          { name:'혈액검사(CBC)', icon:'🩸', order:1 },
  liver:        { name:'간기능', icon:'🫁', order:2 },
  kidney:       { name:'신장기능', icon:'🫘', order:3 },
  thyroid:      { name:'갑상선', icon:'🦋', order:4 },
  lipid:        { name:'지질', icon:'🫀', order:5 },
  glucose:      { name:'당대사', icon:'🍬', order:6 },
  electrolyte:  { name:'전해질', icon:'⚡', order:7 },
  inflammation: { name:'염증', icon:'🔥', order:8 },
  reproductive: { name:'생식호르몬', icon:'🧬', order:9 },
  semen:        { name:'정액검사', icon:'🔬', order:10 },
  vitamin:      { name:'비타민/영양', icon:'💊', order:11 },
  iron:         { name:'철분', icon:'🧲', order:12 },
  tumor:        { name:'종양표지자', icon:'🎯', order:13 },
  infection:    { name:'감염', icon:'🛡️', order:14 },
  coagulation:  { name:'응고', icon:'🩹', order:15 },
  urine:        { name:'소변검사', icon:'🧪', order:16 },
  other:        { name:'기타', icon:'📋', order:99 },
};

// ═══════════════════════════════════════════════════════════════
// STANDARD TEST DICTIONARY
// 각 항목: { name:{ko,en}, unit, category, ref:{low,high} or {male:{},female:{}},
//            aliases:[], conversions:{fromUnit:{factor}}, related:[], pregnancyRelevant }
// ═══════════════════════════════════════════════════════════════
const _CHECKUP_STD_TESTS = {
  // ── CBC ──
  WBC:  { name:{ko:'백혈구',en:'WBC'}, unit:'10^3/μL', category:'cbc', ref:{low:4.0,high:10.0},
    aliases:['wbc','백혈구','백혈구수','white blood cell','wbc count','w.b.c'], related:['RBC','HGB','PLT'], pregnancyRelevant:false },
  RBC:  { name:{ko:'적혈구',en:'RBC'}, unit:'10^6/μL', category:'cbc', ref:{male:{low:4.5,high:5.5},female:{low:4.0,high:5.0}},
    aliases:['rbc','적혈구','적혈구수','red blood cell','rbc count','r.b.c'], related:['WBC','HGB','HCT'], pregnancyRelevant:false },
  HGB:  { name:{ko:'혈색소',en:'Hemoglobin'}, unit:'g/dL', category:'cbc', ref:{male:{low:13.0,high:17.0},female:{low:12.0,high:16.0}},
    aliases:['hemoglobin','hgb','hb','혈색소','헤모글로빈','hemoglobin(hb)'], related:['RBC','HCT'], pregnancyRelevant:true },
  HCT:  { name:{ko:'헤마토크릿',en:'Hematocrit'}, unit:'%', category:'cbc', ref:{male:{low:39,high:51},female:{low:36,high:48}},
    aliases:['hematocrit','hct','헤마토크릿','적혈구용적률'], related:['RBC','HGB'], pregnancyRelevant:false },
  PLT:  { name:{ko:'혈소판',en:'Platelet'}, unit:'10^3/μL', category:'cbc', ref:{low:150,high:400},
    aliases:['platelet','plt','혈소판','혈소판수','platelet count'], related:['WBC','RBC'], pregnancyRelevant:true },
  MCV:  { name:{ko:'평균적혈구용적',en:'MCV'}, unit:'fL', category:'cbc', ref:{low:80,high:100},
    aliases:['mcv','평균적혈구용적','mean corpuscular volume'], related:['MCH','MCHC','RDW'], pregnancyRelevant:false },
  MCH:  { name:{ko:'평균적혈구혈색소량',en:'MCH'}, unit:'pg', category:'cbc', ref:{low:27,high:33},
    aliases:['mch','평균적혈구혈색소량','mean corpuscular hemoglobin'], related:['MCV','MCHC'], pregnancyRelevant:false },
  MCHC: { name:{ko:'평균적혈구혈색소농도',en:'MCHC'}, unit:'g/dL', category:'cbc', ref:{low:32,high:36},
    aliases:['mchc','평균적혈구혈색소농도'], related:['MCV','MCH'], pregnancyRelevant:false },
  RDW:  { name:{ko:'적혈구분포폭',en:'RDW'}, unit:'%', category:'cbc', ref:{low:11.5,high:14.5},
    aliases:['rdw','적혈구분포폭','rdw-cv','rdw cv'], related:['MCV'], pregnancyRelevant:false },
  MPV:  { name:{ko:'평균혈소판용적',en:'MPV'}, unit:'fL', category:'cbc', ref:{low:7.5,high:11.5},
    aliases:['mpv','평균혈소판용적','mean platelet volume'], related:['PLT'], pregnancyRelevant:false },
  NEUT: { name:{ko:'호중구',en:'Neutrophil'}, unit:'%', category:'cbc', ref:{low:40,high:70},
    aliases:['neutrophil','neut','호중구','seg','segmented'], related:['LYMPH','MONO'], pregnancyRelevant:false },
  LYMPH:{ name:{ko:'림프구',en:'Lymphocyte'}, unit:'%', category:'cbc', ref:{low:20,high:44},
    aliases:['lymphocyte','lymph','림프구','lympho'], related:['NEUT','MONO'], pregnancyRelevant:false },
  MONO: { name:{ko:'단핵구',en:'Monocyte'}, unit:'%', category:'cbc', ref:{low:2,high:8},
    aliases:['monocyte','mono','단핵구','단구'], related:['NEUT','LYMPH'], pregnancyRelevant:false },
  EOS:  { name:{ko:'호산구',en:'Eosinophil'}, unit:'%', category:'cbc', ref:{low:0,high:5},
    aliases:['eosinophil','eos','호산구','eosino'], related:['NEUT','BASO'], pregnancyRelevant:false },
  BASO: { name:{ko:'호염기구',en:'Basophil'}, unit:'%', category:'cbc', ref:{low:0,high:1},
    aliases:['basophil','baso','호염기구'], related:['NEUT','EOS'], pregnancyRelevant:false },

  // ── 간기능 ──
  AST:  { name:{ko:'AST(GOT)',en:'AST'}, unit:'U/L', category:'liver', ref:{low:0,high:40},
    aliases:['ast','got','sgot','ast(got)','got(ast)','아스파르테이트','s-got','s-ast'], related:['ALT','GGT','ALP','TBIL'], pregnancyRelevant:false },
  ALT:  { name:{ko:'ALT(GPT)',en:'ALT'}, unit:'U/L', category:'liver', ref:{low:0,high:40},
    aliases:['alt','gpt','sgpt','alt(gpt)','gpt(alt)','알라닌','s-gpt','s-alt'], related:['AST','GGT','ALP','TBIL'], pregnancyRelevant:false },
  GGT:  { name:{ko:'감마지티피',en:'GGT'}, unit:'U/L', category:'liver', ref:{male:{low:0,high:60},female:{low:0,high:40}},
    aliases:['ggt','γ-gtp','r-gtp','감마지티피','gamma-gtp','gamma gt','r-gt','γgtp','감마gt','감마 지티피'], related:['AST','ALT'], pregnancyRelevant:false },
  ALP:  { name:{ko:'알칼리포스파타제',en:'ALP'}, unit:'U/L', category:'liver', ref:{low:40,high:130},
    aliases:['alp','알칼리포스파타제','alkaline phosphatase','알칼리성인산분해효소','alk phos'], related:['AST','ALT','GGT'], pregnancyRelevant:false },
  TBIL: { name:{ko:'총빌리루빈',en:'Total Bilirubin'}, unit:'mg/dL', category:'liver', ref:{low:0.2,high:1.2},
    aliases:['total bilirubin','tbil','t-bil','총빌리루빈','총 빌리루빈','t.bil','bilirubin total'], related:['DBIL','AST','ALT'], pregnancyRelevant:false },
  DBIL: { name:{ko:'직접빌리루빈',en:'Direct Bilirubin'}, unit:'mg/dL', category:'liver', ref:{low:0,high:0.4},
    aliases:['direct bilirubin','dbil','d-bil','직접빌리루빈','직접 빌리루빈','d.bil'], related:['TBIL'], pregnancyRelevant:false },
  ALB:  { name:{ko:'알부민',en:'Albumin'}, unit:'g/dL', category:'liver', ref:{low:3.5,high:5.2},
    aliases:['albumin','alb','알부민','s-albumin'], related:['TP'], pregnancyRelevant:true },
  TP:   { name:{ko:'총단백',en:'Total Protein'}, unit:'g/dL', category:'liver', ref:{low:6.0,high:8.3},
    aliases:['total protein','tp','총단백','총 단백','t.protein','총단백질'], related:['ALB'], pregnancyRelevant:false },

  // ── 신장기능 ──
  BUN:  { name:{ko:'혈액요소질소',en:'BUN'}, unit:'mg/dL', category:'kidney', ref:{low:7,high:20},
    aliases:['bun','혈액요소질소','blood urea nitrogen','요소질소','urea nitrogen'], related:['CR','EGFR','UA'], pregnancyRelevant:false,
    conversions:{'mmol/L':{factor:0.357}} },
  CR:   { name:{ko:'크레아티닌',en:'Creatinine'}, unit:'mg/dL', category:'kidney', ref:{male:{low:0.7,high:1.3},female:{low:0.5,high:1.1}},
    aliases:['creatinine','cr','cre','크레아티닌','s-creatinine','s-cr','serum creatinine'], related:['BUN','EGFR','UA'], pregnancyRelevant:true,
    conversions:{'μmol/L':{factor:0.0113},'umol/L':{factor:0.0113}} },
  EGFR: { name:{ko:'사구체여과율',en:'eGFR'}, unit:'mL/min/1.73m²', category:'kidney', ref:{low:90,high:999},
    aliases:['egfr','gfr','사구체여과율','e-gfr','estimated gfr','사구체 여과율'], related:['CR','BUN'], pregnancyRelevant:false },
  UA:   { name:{ko:'요산',en:'Uric Acid'}, unit:'mg/dL', category:'kidney', ref:{male:{low:3.0,high:7.0},female:{low:2.5,high:6.5}},
    aliases:['uric acid','ua','요산','uric','s-uric acid'], related:['BUN','CR'], pregnancyRelevant:true,
    conversions:{'μmol/L':{factor:0.0168},'umol/L':{factor:0.0168}} },

  // ── 갑상선 ──
  TSH:  { name:{ko:'갑상선자극호르몬',en:'TSH'}, unit:'mIU/L', category:'thyroid', ref:{low:0.35,high:5.50},
    aliases:['tsh','갑상선자극호르몬','thyroid stimulating hormone','갑상선 자극 호르몬','s-tsh'], related:['FT4','FT3'], pregnancyRelevant:true,
    conversions:{'μIU/mL':{factor:1},'uIU/mL':{factor:1}} },
  FT4:  { name:{ko:'유리T4',en:'Free T4'}, unit:'ng/dL', category:'thyroid', ref:{low:0.8,high:1.8},
    aliases:['free t4','ft4','유리t4','유리 t4','free thyroxine','f-t4'], related:['TSH','FT3'], pregnancyRelevant:true,
    conversions:{'pmol/L':{factor:0.0777}} },
  FT3:  { name:{ko:'유리T3',en:'Free T3'}, unit:'pg/mL', category:'thyroid', ref:{low:2.0,high:4.4},
    aliases:['free t3','ft3','유리t3','유리 t3','free triiodothyronine','f-t3'], related:['TSH','FT4'], pregnancyRelevant:true,
    conversions:{'pmol/L':{factor:0.651}} },
  T4:   { name:{ko:'T4',en:'T4'}, unit:'μg/dL', category:'thyroid', ref:{low:4.5,high:12.5},
    aliases:['t4','thyroxine','총t4','total t4'], related:['TSH','T3'], pregnancyRelevant:false },
  T3:   { name:{ko:'T3',en:'T3'}, unit:'ng/dL', category:'thyroid', ref:{low:80,high:200},
    aliases:['t3','triiodothyronine','총t3','total t3'], related:['TSH','T4'], pregnancyRelevant:false },

  // ── 지질 ──
  TCHOL:{ name:{ko:'총콜레스테롤',en:'Total Cholesterol'}, unit:'mg/dL', category:'lipid', ref:{low:0,high:200},
    aliases:['total cholesterol','cholesterol','tchol','t-chol','t.chol','총콜레스테롤','총 콜레스테롤','t-cholesterol','콜레스테롤'], related:['TG','HDL','LDL'], pregnancyRelevant:false,
    conversions:{'mmol/L':{factor:38.67}} },
  TG:   { name:{ko:'중성지방',en:'Triglyceride'}, unit:'mg/dL', category:'lipid', ref:{low:0,high:150},
    aliases:['triglyceride','tg','중성지방','triglycerides','트리글리세리드','중성 지방'], related:['TCHOL','HDL','LDL'], pregnancyRelevant:false,
    conversions:{'mmol/L':{factor:88.57}} },
  HDL:  { name:{ko:'HDL콜레스테롤',en:'HDL'}, unit:'mg/dL', category:'lipid', ref:{low:40,high:999},
    aliases:['hdl','hdl-c','hdl cholesterol','hdl콜레스테롤','hdl 콜레스테롤','hdl-cholesterol'], related:['TCHOL','TG','LDL'], pregnancyRelevant:false,
    conversions:{'mmol/L':{factor:38.67}} },
  LDL:  { name:{ko:'LDL콜레스테롤',en:'LDL'}, unit:'mg/dL', category:'lipid', ref:{low:0,high:130},
    aliases:['ldl','ldl-c','ldl cholesterol','ldl콜레스테롤','ldl 콜레스테롤','ldl-cholesterol'], related:['TCHOL','TG','HDL'], pregnancyRelevant:false,
    conversions:{'mmol/L':{factor:38.67}} },

  // ── 당대사 ──
  GLU:  { name:{ko:'공복혈당',en:'Fasting Glucose'}, unit:'mg/dL', category:'glucose', ref:{low:70,high:100},
    aliases:['glucose','glu','fasting glucose','공복혈당','혈당','blood sugar','fbs','공복 혈당','blood glucose'], related:['HBA1C','INSULIN'], pregnancyRelevant:true,
    conversions:{'mmol/L':{factor:18.02}} },
  HBA1C:{ name:{ko:'당화혈색소',en:'HbA1c'}, unit:'%', category:'glucose', ref:{low:4.0,high:6.0},
    aliases:['hba1c','a1c','glycated hemoglobin','당화혈색소','당화 혈색소','hemoglobin a1c','glycohemoglobin','hb a1c'], related:['GLU','INSULIN'], pregnancyRelevant:true },
  INSULIN:{ name:{ko:'인슐린',en:'Insulin'}, unit:'μIU/mL', category:'glucose', ref:{low:2,high:25},
    aliases:['insulin','인슐린','fasting insulin','공복인슐린','공복 인슐린'], related:['GLU','HBA1C','HOMA'], pregnancyRelevant:true },
  HOMA: { name:{ko:'인슐린저항성',en:'HOMA-IR'}, unit:'index', category:'glucose', ref:{low:0,high:2.5},
    aliases:['homa-ir','homa','인슐린저항성','인슐린 저항성','homa ir'], related:['GLU','INSULIN'], pregnancyRelevant:true },

  // ── 전해질 ──
  NA:   { name:{ko:'나트륨',en:'Sodium'}, unit:'mEq/L', category:'electrolyte', ref:{low:136,high:145},
    aliases:['sodium','na','나트륨','na+','s-na','natrium'], related:['K','CL'], pregnancyRelevant:false },
  K:    { name:{ko:'칼륨',en:'Potassium'}, unit:'mEq/L', category:'electrolyte', ref:{low:3.5,high:5.0},
    aliases:['potassium','k','칼륨','k+','s-k','kalium'], related:['NA','CL'], pregnancyRelevant:false },
  CL:   { name:{ko:'염소',en:'Chloride'}, unit:'mEq/L', category:'electrolyte', ref:{low:98,high:106},
    aliases:['chloride','cl','염소','cl-','s-cl'], related:['NA','K'], pregnancyRelevant:false },
  CA:   { name:{ko:'칼슘',en:'Calcium'}, unit:'mg/dL', category:'electrolyte', ref:{low:8.5,high:10.5},
    aliases:['calcium','ca','칼슘','s-ca','ca2+','총칼슘','total calcium'], related:['P','MG'], pregnancyRelevant:true,
    conversions:{'mmol/L':{factor:4.0}} },
  P:    { name:{ko:'인',en:'Phosphorus'}, unit:'mg/dL', category:'electrolyte', ref:{low:2.5,high:4.5},
    aliases:['phosphorus','p','인','phosphate','무기인','inorganic phosphorus','s-p'], related:['CA','MG'], pregnancyRelevant:false },
  MG:   { name:{ko:'마그네슘',en:'Magnesium'}, unit:'mg/dL', category:'electrolyte', ref:{low:1.6,high:2.6},
    aliases:['magnesium','mg','마그네슘','s-mg'], related:['CA','P'], pregnancyRelevant:true },

  // ── 염증 ──
  CRP:  { name:{ko:'C반응단백',en:'CRP'}, unit:'mg/dL', category:'inflammation', ref:{low:0,high:0.5},
    aliases:['crp','c-reactive protein','c반응단백','c반응성단백','c-반응단백','crp정량'], related:['HSCRP','ESR'], pregnancyRelevant:false },
  HSCRP:{ name:{ko:'고감도CRP',en:'hs-CRP'}, unit:'mg/L', category:'inflammation', ref:{low:0,high:3.0},
    aliases:['hs-crp','hscrp','고감도crp','고감도 crp','high sensitivity crp','hs crp'], related:['CRP','ESR'], pregnancyRelevant:false },
  ESR:  { name:{ko:'적혈구침강속도',en:'ESR'}, unit:'mm/hr', category:'inflammation', ref:{male:{low:0,high:15},female:{low:0,high:20}},
    aliases:['esr','적혈구침강속도','sed rate','erythrocyte sedimentation rate','혈침'], related:['CRP'], pregnancyRelevant:false },

  // ── 생식호르몬 ──
  FSH:  { name:{ko:'난포자극호르몬',en:'FSH'}, unit:'mIU/mL', category:'reproductive', ref:{female:{low:3.0,high:12.0},male:{low:1.5,high:12.4}},
    aliases:['fsh','난포자극호르몬','follicle stimulating hormone','난포자극 호르몬'], related:['LH','E2','AMH'], pregnancyRelevant:true },
  LH:   { name:{ko:'황체형성호르몬',en:'LH'}, unit:'mIU/mL', category:'reproductive', ref:{female:{low:2.0,high:12.0},male:{low:1.7,high:8.6}},
    aliases:['lh','황체형성호르몬','luteinizing hormone','황체화호르몬','황체형성 호르몬'], related:['FSH','E2','AMH'], pregnancyRelevant:true },
  E2:   { name:{ko:'에스트라디올',en:'Estradiol'}, unit:'pg/mL', category:'reproductive', ref:{female:{low:30,high:400},male:{low:10,high:40}},
    aliases:['e2','estradiol','에스트라디올','에스트로겐','estrogen','에스트라디올(e2)'], related:['FSH','LH','PROG'], pregnancyRelevant:true },
  AMH:  { name:{ko:'항뮬러관호르몬',en:'AMH'}, unit:'ng/mL', category:'reproductive', ref:{female:{low:1.0,high:10.0}},
    aliases:['amh','항뮬러관호르몬','anti-mullerian hormone','항뮬러리안호르몬','anti mullerian','항뮬러관 호르몬'], related:['FSH','LH'], pregnancyRelevant:true },
  PRL:  { name:{ko:'프로락틴',en:'Prolactin'}, unit:'ng/mL', category:'reproductive', ref:{female:{low:2,high:25},male:{low:2,high:18}},
    aliases:['prolactin','prl','프로락틴','유즙분비호르몬'], related:['FSH','LH'], pregnancyRelevant:true },
  PROG: { name:{ko:'프로게스테론',en:'Progesterone'}, unit:'ng/mL', category:'reproductive', ref:{female:{low:0.2,high:25}},
    aliases:['progesterone','prog','프로게스테론','황체호르몬','p4'], related:['E2','LH'], pregnancyRelevant:true },
  TESTO:{ name:{ko:'테스토스테론',en:'Testosterone'}, unit:'ng/dL', category:'reproductive', ref:{male:{low:280,high:800},female:{low:15,high:70}},
    aliases:['testosterone','testo','테스토스테론','총테스토스테론','total testosterone'], related:['FSH','LH'], pregnancyRelevant:true },

  // ── 정액검사 ──
  SEM_VOL: { name:{ko:'정액량',en:'Semen Volume'}, unit:'mL', category:'semen', ref:{low:1.5,high:6.0},
    aliases:['volume','vol','정액량','semen volume','v'], related:['SEM_CNT','SEM_MOT','SEM_MOR'], pregnancyRelevant:true },
  SEM_CNT: { name:{ko:'정자농도',en:'Sperm Count'}, unit:'M/mL', category:'semen', ref:{low:15,high:200},
    aliases:['count','concentration','정자수','정자농도','sperm count','sperm concentration','conc'], related:['SEM_VOL','SEM_MOT','SEM_MOR'], pregnancyRelevant:true },
  SEM_MOT: { name:{ko:'운동성',en:'Motility'}, unit:'%', category:'semen', ref:{low:42,high:100},
    aliases:['motility','total motility','운동성','motile_percent','pr+np','total motile'], related:['SEM_VOL','SEM_CNT','SEM_MOR'], pregnancyRelevant:true },
  SEM_MOR: { name:{ko:'형태',en:'Morphology'}, unit:'%', category:'semen', ref:{low:4,high:100},
    aliases:['morphology','strict morphology','형태','normal morphology','normal forms','morph_pct','정상형태'], related:['SEM_VOL','SEM_CNT','SEM_MOT'], pregnancyRelevant:true },

  // ── 비타민/영양 ──
  VITD: { name:{ko:'비타민D',en:'Vitamin D'}, unit:'ng/mL', category:'vitamin', ref:{low:20,high:100},
    aliases:['vitamin d','vit d','비타민d','25-oh vitamin d','25-oh','25(oh)d','25-hydroxyvitamin d','비타민 d','25-oh-d','calcidiol'], related:['CA'], pregnancyRelevant:true,
    conversions:{'nmol/L':{factor:0.4006}} },
  VITB12:{ name:{ko:'비타민B12',en:'Vitamin B12'}, unit:'pg/mL', category:'vitamin', ref:{low:200,high:900},
    aliases:['vitamin b12','vit b12','비타민b12','cobalamin','b12','비타민 b12'], related:['FOLATE'], pregnancyRelevant:true,
    conversions:{'pmol/L':{factor:1.355}} },
  FOLATE:{ name:{ko:'엽산',en:'Folate'}, unit:'ng/mL', category:'vitamin', ref:{low:3.0,high:17.0},
    aliases:['folate','folic acid','엽산','폴레이트','serum folate','s-folate'], related:['VITB12'], pregnancyRelevant:true,
    conversions:{'nmol/L':{factor:0.4415}} },

  // ── 철분 ──
  FERRITIN:{ name:{ko:'페리틴',en:'Ferritin'}, unit:'ng/mL', category:'iron', ref:{male:{low:20,high:300},female:{low:10,high:150}},
    aliases:['ferritin','페리틴','s-ferritin','serum ferritin'], related:['FE','TIBC'], pregnancyRelevant:true },
  FE:   { name:{ko:'철',en:'Iron'}, unit:'μg/dL', category:'iron', ref:{male:{low:60,high:170},female:{low:40,high:150}},
    aliases:['iron','fe','철','s-iron','serum iron','s-fe','혈청철'], related:['FERRITIN','TIBC'], pregnancyRelevant:true },
  TIBC: { name:{ko:'총철결합능',en:'TIBC'}, unit:'μg/dL', category:'iron', ref:{low:250,high:400},
    aliases:['tibc','총철결합능','total iron binding capacity','총철결합력'], related:['FERRITIN','FE'], pregnancyRelevant:false },

  // ── 종양표지자 ──
  CEA:  { name:{ko:'CEA',en:'CEA'}, unit:'ng/mL', category:'tumor', ref:{low:0,high:5.0},
    aliases:['cea','carcinoembryonic antigen','암태아성항원'], related:['AFP'], pregnancyRelevant:false },
  AFP:  { name:{ko:'알파태아단백',en:'AFP'}, unit:'ng/mL', category:'tumor', ref:{low:0,high:10.0},
    aliases:['afp','alpha fetoprotein','알파태아단백','알파태아 단백','α-fetoprotein'], related:['CEA'], pregnancyRelevant:true },
  PSA:  { name:{ko:'전립선특이항원',en:'PSA'}, unit:'ng/mL', category:'tumor', ref:{low:0,high:4.0},
    aliases:['psa','전립선특이항원','prostate specific antigen','전립선 특이항원'], related:[], pregnancyRelevant:false },
  CA125:{ name:{ko:'CA-125',en:'CA-125'}, unit:'U/mL', category:'tumor', ref:{low:0,high:35},
    aliases:['ca-125','ca125','ca 125'], related:['CA199'], pregnancyRelevant:true },
  CA199:{ name:{ko:'CA19-9',en:'CA19-9'}, unit:'U/mL', category:'tumor', ref:{low:0,high:37},
    aliases:['ca19-9','ca199','ca 19-9','ca19 9'], related:['CA125','CEA'], pregnancyRelevant:false },

  // ── 감염 / 면역 ──
  HBSAG:{ name:{ko:'B형간염표면항원',en:'HBsAg'}, unit:'Index', category:'infection', ref:{low:0,high:1},
    aliases:['hbsag','b형간염표면항원','hepatitis b surface antigen','b형간염 표면항원','hbs ag','hbs-ag'], related:['HBSAB'], pregnancyRelevant:true },
  HBSAB:{ name:{ko:'B형간염표면항체',en:'HBs Ab'}, unit:'IU/L', category:'infection', ref:{low:10,high:999},
    aliases:['hbsab','b형간염표면항체','hepatitis b surface antibody','b형간염 표면항체','hbs ab','anti-hbs','hbs-ab','hbs_ab'], related:['HBSAG'], pregnancyRelevant:true, higherIsBetter:true },
  HAVIGG:{ name:{ko:'A형간염항체(IgG)',en:'HAV IgG'}, unit:'Index', category:'infection', ref:{low:1,high:999},
    aliases:['hav igg','a형간염항체','hepatitis a igg','a형간염 igg','hav-igg','hav_igg','a형간염igg'], related:[], pregnancyRelevant:true, higherIsBetter:true },
  HAVIGM:{ name:{ko:'A형간염항체(IgM)',en:'HAV IgM'}, unit:'Index', category:'infection', ref:{low:0,high:1},
    aliases:['hav igm','a형간염igm','hepatitis a igm','hav-igm','hav_igm'], related:['HAVIGG'], pregnancyRelevant:true },
  RUBELLAIGG:{ name:{ko:'풍진항체(IgG)',en:'Rubella IgG'}, unit:'IU/mL', category:'infection', ref:{low:10,high:999},
    aliases:['rubella igg','풍진igg','풍진 igg','rubella-igg','rubella_igg','풍진항체'], related:['RUBELLAIGM'], pregnancyRelevant:true, higherIsBetter:true },
  RUBELLAIGM:{ name:{ko:'풍진항체(IgM)',en:'Rubella IgM'}, unit:'Index', category:'infection', ref:{low:0,high:0.8},
    aliases:['rubella igm','풍진igm','풍진 igm','rubella-igm','rubella_igm'], related:['RUBELLAIGG'], pregnancyRelevant:true },
  HCVAB:{ name:{ko:'C형간염항체',en:'HCV Ab'}, unit:'Index', category:'infection', ref:{low:0,high:1},
    aliases:['hcv ab','hcvab','c형간염항체','hepatitis c antibody','c형간염 항체','anti-hcv','hcv-ab','hcv_ab'], related:[], pregnancyRelevant:true },
  HIVAGAB:{ name:{ko:'HIV항원항체',en:'HIV Ag/Ab'}, unit:'Index', category:'infection', ref:{low:0,high:1},
    aliases:['hiv ag/ab','hiv','hivagab','hiv ag ab','hiv_ag_ab','hiv항원항체','hiv 항원항체'], related:[], pregnancyRelevant:true },
  RPR:  { name:{ko:'매독',en:'RPR'}, unit:'qualitative', category:'infection', ref:{low:0,high:0},
    aliases:['rpr','vdrl','매독','syphilis','rpr/vdrl','매독검사'], related:[], pregnancyRelevant:true },

  // ── 응고 ──
  PT:   { name:{ko:'프로트롬빈시간',en:'PT'}, unit:'sec', category:'coagulation', ref:{low:11,high:14},
    aliases:['pt','프로트롬빈시간','prothrombin time','프로트롬빈 시간'], related:['APTT','INR'], pregnancyRelevant:false },
  APTT: { name:{ko:'aPTT',en:'aPTT'}, unit:'sec', category:'coagulation', ref:{low:25,high:35},
    aliases:['aptt','활성부분트롬보플라스틴시간','activated partial thromboplastin time','ptt'], related:['PT','INR'], pregnancyRelevant:false },
  INR:  { name:{ko:'INR',en:'INR'}, unit:'ratio', category:'coagulation', ref:{low:0.8,high:1.2},
    aliases:['inr','international normalized ratio','pt-inr','pt/inr'], related:['PT','APTT'], pregnancyRelevant:false },

  // ── 소변검사 ──
  UPROT:{ name:{ko:'소변단백',en:'Urine Protein'}, unit:'qualitative', category:'urine', ref:{low:0,high:0},
    aliases:['urine protein','u-protein','소변단백','요단백','소변 단백','protein(urine)','u-prot'], related:['UBLOOD'], pregnancyRelevant:true },
  UBLOOD:{ name:{ko:'소변잠혈',en:'Urine Blood'}, unit:'qualitative', category:'urine', ref:{low:0,high:0},
    aliases:['urine blood','u-blood','소변잠혈','요잠혈','소변 잠혈','occult blood','u-ob'], related:['UPROT'], pregnancyRelevant:false },
  UGLU: { name:{ko:'소변당',en:'Urine Glucose'}, unit:'qualitative', category:'urine', ref:{low:0,high:0},
    aliases:['urine glucose','u-glucose','소변당','요당','소변 당','u-glu','glucose(urine)'], related:[], pregnancyRelevant:true },
  UPH:  { name:{ko:'소변pH',en:'Urine pH'}, unit:'', category:'urine', ref:{low:4.5,high:8.0},
    aliases:['urine ph','u-ph','소변ph','요ph','ph(urine)'], related:[], pregnancyRelevant:false },
  USG:  { name:{ko:'소변비중',en:'Urine SG'}, unit:'', category:'urine', ref:{low:1.005,high:1.030},
    aliases:['urine sg','u-sg','소변비중','요비중','specific gravity','비중'], related:[], pregnancyRelevant:false },
  UWBC: { name:{ko:'소변백혈구',en:'Urine WBC'}, unit:'qualitative', category:'urine', ref:{low:0,high:0},
    aliases:['urine wbc','u-wbc','소변백혈구','요백혈구','소변 백혈구','wbc(urine)','leukocyte'], related:[], pregnancyRelevant:false },
};

// ═══════════════════════════════════════════════════════════════
// NORMALIZATION ENGINE
// ═══════════════════════════════════════════════════════════════

// 원시 키에서 검사명과 단위 분리: "TSH(mIU/L)" → {name:"TSH", unit:"mIU/L"}
function _parseTestKey(raw) {
  if (!raw) return { name: '', unit: null };
  const s = raw.trim();
  // 마지막 괄호가 단위인지 판별
  const lastParen = s.match(/\(([^)]+)\)$/);
  if (lastParen) {
    const candidate = lastParen[1];
    if (_looksLikeUnit(candidate)) {
      return { name: s.slice(0, lastParen.index).trim(), unit: candidate };
    }
  }
  return { name: s, unit: null };
}

function _looksLikeUnit(s) {
  if (!s) return false;
  if (s.includes('/') || s === '%') return true;
  if (/\d/.test(s) && /[a-zμµ]/i.test(s)) return true;
  if (/^(fL|pg|sec|ratio|index|mm|hr|mL|dL|g|mg|ng|μg|ug|U|IU|mEq|mmol|μmol|umol|pmol|nmol|mIU|μIU|uIU)$/i.test(s)) return true;
  return false;
}

// 표준 코드 매칭: rawName → stdCode or null
// 비-검사 값 (AI 예측/계산값) 필터: 정규화에서 제외
const _NON_LAB_KEYWORDS = [
  '가능성','확률','비율','예상','잔여','점수','score','rate','probability',
  'bmi','체질량','percentile','백분위','등급','grade','판정','결과요약',
  '소견','opinion','임신','conception','분만','delivery','배란','ovulation',
  '가임','fertile','주기','cycle','기저체온','bbt','권장','추천','recommend',
];

function _isNonLabValue(rawName) {
  if (!rawName) return false;
  const lower = rawName.toLowerCase();
  return _NON_LAB_KEYWORDS.some(kw => lower.includes(kw));
}

function _matchStdTest(rawName) {
  if (!rawName) return null;
  // 정규화: 언더스코어→공백, 연속 공백 제거
  const lower = rawName.toLowerCase().trim().replace(/_/g, ' ').replace(/\s+/g, ' ');
  // 비-검사 값은 매칭 시도하지 않음
  if (_isNonLabValue(lower)) return null;
  // 너무 긴 이름은 검사 항목이 아닐 가능성 높음 (설명문/소견 등)
  if (lower.length > 30) return null;
  // 하드코딩 + 동적 사전 통합 검색
  const allTests = { ..._CHECKUP_STD_TESTS, ..._getCustomTests() };
  // 1) 코드 직접 매칭
  for (const code of Object.keys(allTests)) {
    if (lower === code.toLowerCase()) return code;
  }
  // 2) 별칭 정확 매칭 (별칭도 언더스코어 정규화)
  for (const [code, def] of Object.entries(allTests)) {
    if (def.aliases?.some(a => a.toLowerCase().replace(/_/g, ' ') === lower)) return code;
  }
  // 3) 별칭 포함 매칭 (안전한 부분 매칭)
  //    - 별칭 최소 길이 3자 이상만 (1~2자 "k", "p" 등 오매칭 방지)
  //    - rawName 안에 alias가 포함된 경우만 (역방향 제외 — 오매칭 근원)
  let bestMatch = null, bestLen = 0;
  for (const [code, def] of Object.entries(allTests)) {
    for (const alias of (def.aliases || [])) {
      const al = alias.toLowerCase();
      if (al.length < 3) continue;
      if (lower.includes(al) && al.length > bestLen) {
        bestMatch = code; bestLen = al.length;
      }
    }
  }
  return bestMatch;
}

// 단위 변환: rawValue를 표준 단위로 변환
function _convertToStdUnit(stdCode, rawValue, rawUnit) {
  const def = _CHECKUP_STD_TESTS[stdCode];
  if (!def) return { value: rawValue, unit: rawUnit || '' };
  const stdUnit = def.unit;
  if (!rawUnit || rawUnit === stdUnit) return { value: rawValue, unit: stdUnit };
  // 변환 테이블 확인
  const conv = def.conversions;
  if (conv && conv[rawUnit]) {
    return { value: Math.round(rawValue * conv[rawUnit].factor * 1000) / 1000, unit: stdUnit };
  }
  // 역변환 확인 (표준→원시 방향의 factor로 역산)
  if (conv) {
    for (const [fromUnit, c] of Object.entries(conv)) {
      if (fromUnit === rawUnit) continue;
      // rawUnit이 stdUnit이고 fromUnit에서 변환하려는 경우
    }
  }
  // 변환 실패 시 원본 유지
  return { value: rawValue, unit: rawUnit };
}

// 참고치 문자열 파싱: "0.35-5.50" → {low:0.35, high:5.50}
function _parseRefRange(refStr) {
  if (!refStr) return null;
  const s = String(refStr).trim();
  // "0.35-5.50" 또는 "0.35~5.50" 또는 "0.35 - 5.50"
  const m = s.match(/([0-9.]+)\s*[-~]\s*([0-9.]+)/);
  if (m) return { low: parseFloat(m[1]), high: parseFloat(m[2]) };
  // "<5.0" 또는 "≤5.0"
  const lt = s.match(/[<≤]\s*([0-9.]+)/);
  if (lt) return { low: 0, high: parseFloat(lt[1]) };
  // ">10" 또는 "≥10"
  const gt = s.match(/[>≥]\s*([0-9.]+)/);
  if (gt) return { low: parseFloat(gt[1]), high: 999 };
  return null;
}

// 상태 판정: value가 ref 범위 안인지
// stdCode 전달 시 higherIsBetter 속성 참조 (항체 검사 등)
function _judgeStatus(value, ref, who, stdCode) {
  if (value === null || value === undefined || ref === null) return 'unknown';
  const r = (ref.male && ref.female)
    ? (who === '붕쌤' ? ref.male : ref.female)
    : ref;
  if (!r || r.low === undefined) return 'unknown';
  const v = parseFloat(value);
  if (isNaN(v)) return 'unknown';
  // higherIsBetter 검사 (항체/면역): 높으면 positive(양성=좋음), 낮으면 low(음성=미면역)
  const def = stdCode ? _getTestDef(stdCode) : null;
  if (def?.higherIsBetter) {
    if (v >= r.low) return 'positive'; // 면역 형성
    return 'low'; // 미면역
  }
  if (v < r.low) return 'low';
  if (r.high < 999 && v > r.high) return 'high';
  return 'normal';
}

// 상태 표시 헬퍼: positive(면역)은 정상과 동일 계열, 별도 아이콘
function _statusColor(s) {
  if (s === 'high') return '#dc2626';
  if (s === 'low') return '#2563eb';
  if (s === 'normal' || s === 'positive') return '#10b981';
  return 'var(--mu)';
}
function _statusIcon(s) {
  if (s === 'high') return '▲';
  if (s === 'low') return '▼';
  if (s === 'normal') return '●';
  if (s === 'positive') return '🛡️';
  return '○';
}
function _statusIconSmall(s) {
  if (s === 'high') return '↑';
  if (s === 'low') return '↓';
  if (s === 'normal') return '✓';
  if (s === 'positive') return '🛡';
  return '?';
}
// 이상 여부: positive(면역)은 이상 아님
function _isAbnormal(s) { return s === 'high' || s === 'low'; }

// 성별 부적합 검사 필터: 해당 성별에 맞지 않는 항목 제거
const _MALE_ONLY_TESTS = new Set(['SEM_VOL','SEM_CNT','SEM_MOT','SEM_MOR','PSA','TESTO']);
const _FEMALE_ONLY_TESTS = new Set(['AMH','PROG','CA125']);
const _MALE_ONLY_CATEGORIES = new Set(['semen']);

function _isTestApplicable(stdCode, category, who) {
  // 붕룩이(아기): 성별 미정 → 모든 검사 허용
  if (who === '붕룩이') return true;
  const isMale = who === '붕쌤';
  if (isMale && _FEMALE_ONLY_TESTS.has(stdCode)) return false;
  if (!isMale && (_MALE_ONLY_TESTS.has(stdCode) || _MALE_ONLY_CATEGORIES.has(category))) return false;
  return true;
}

// 이상치 감지: 참고범위 대비 극단적 값 플래그
function _isSuspiciousValue(value, ref) {
  if (!ref || typeof value !== 'number' || ref.high >= 999) return false;
  const range = ref.high - ref.low;
  if (range <= 0) return false;
  // 참고범위 10배 초과 → 의심
  if (value > ref.high * 10 || (ref.low > 0 && value > ref.low * 100)) return true;
  return false;
}

// AI 파싱 결과를 표준화: {values:{},ref:{}} → [{stdCode, rawName, value, unit, ...}]
function normalizeCheckupResults(aiValues, aiRefs, who) {
  if (!aiValues || typeof aiValues !== 'object') return [];
  const results = [];
  for (const [rawKey, rawVal] of Object.entries(aiValues)) {
    if (rawKey === 'text') continue; // 텍스트 메모 스킵
    // 비-검사 값 제외 (AI 예측/계산값, 소견 등)
    if (_isNonLabValue(rawKey)) continue;
    const parsed = _parseTestKey(rawKey);
    const stdCode = _matchStdTest(parsed.name);
    const def = stdCode ? _getTestDef(stdCode) : null;
    const numVal = parseFloat(rawVal);
    const isNum = !isNaN(numVal);
    // 숫자가 아닌 긴 문자열은 소견/텍스트 → 스킵
    if (!isNum && typeof rawVal === 'string' && rawVal.length > 20) continue;
    // 숫자 단위 검사에 비숫자 값(Negative/Positive 등)은 미실시/오류 → 스킵
    // (qualitative 검사는 허용: HBsAg 등)
    if (!isNum && def && def.unit !== 'qualitative') continue;

    // 단위 변환
    const converted = (stdCode && isNum && parsed.unit)
      ? _convertToStdUnit(stdCode, numVal, parsed.unit)
      : { value: isNum ? numVal : rawVal, unit: parsed.unit || (def ? def.unit : '') };

    // 참고치
    const rawRefStr = aiRefs ? aiRefs[rawKey] : null;
    const parsedRef = _parseRefRange(rawRefStr);
    const stdRef = def ? (def.ref.male ? (who === '붕쌤' ? def.ref.male : def.ref.female) : def.ref) : null;
    const finalRef = parsedRef || stdRef;

    // 성별 부적합 항목 스킵
    if (stdCode && def && !_isTestApplicable(stdCode, def.category, who)) continue;

    // 상태 판정
    const status = isNum ? _judgeStatus(converted.value, finalRef || (def ? def.ref : null), who, stdCode) : 'unknown';

    // 이상치 플래그 (참고범위 10배 초과)
    const suspicious = isNum && _isSuspiciousValue(converted.value, finalRef || stdRef);

    results.push({
      stdCode: stdCode || null,
      rawName: rawKey,
      displayName: def ? def.name.ko : parsed.name,
      value: converted.value,
      unit: converted.unit,
      rawValue: rawVal,
      rawUnit: parsed.unit,
      ref: finalRef,
      rawRef: rawRefStr,
      status: status,
      category: def ? def.category : 'other',
      related: def ? def.related : [],
      pregnancyRelevant: def ? def.pregnancyRelevant : false,
      suspicious: suspicious || false,
    });
  }
  // 카테고리 순 정렬
  const catOrder = Object.fromEntries(Object.entries(_CHECKUP_CATEGORIES).map(([k, v]) => [k, v.order]));
  results.sort((a, b) => (catOrder[a.category] || 99) - (catOrder[b.category] || 99));
  return results;
}

// AI-first 정규화: AI가 직접 분류/판정한 results 배열을 사전으로 교차검증만
function normalizeFromAI(aiResults, who) {
  if (!aiResults || !Array.isArray(aiResults)) return [];
  const results = [];
  aiResults.forEach(r => {
    if (r.value === null || r.value === undefined) return;
    const isNum = typeof r.value === 'number' || !isNaN(parseFloat(r.value));
    const numVal = isNum ? parseFloat(r.value) : r.value;
    // AI가 준 code로 사전 매칭 시도 (보조)
    let stdCode = r.code ? (r.code.toUpperCase() in _CHECKUP_STD_TESTS ? r.code.toUpperCase() : _matchStdTest(r.code)) : null;
    if (!stdCode && r.name) stdCode = _matchStdTest(r.name);
    const def = stdCode ? _getTestDef(stdCode) : null;
    // 성별 필터
    if (stdCode && def && !_isTestApplicable(stdCode, def.category, who)) return;
    // 참고범위: AI 제공값 우선, 없으면 사전
    let ref = null;
    if (r.refLow !== undefined || r.refHigh !== undefined) {
      ref = { low: r.refLow ?? 0, high: r.refHigh ?? 999 };
    } else if (def) {
      ref = def.ref.male ? (who === '붕쌤' ? def.ref.male : def.ref.female) : def.ref;
    }
    // 상태: AI 판정 신뢰, 없으면 사전 기반 판정
    let status = r.status || 'unknown';
    if (status === 'unknown' && isNum && ref) {
      status = _judgeStatus(numVal, ref, who, stdCode);
    }
    // 카테고리: AI 판정 신뢰, 없으면 사전
    const category = r.category || (def ? def.category : 'other');
    results.push({
      stdCode: stdCode || null,
      rawName: r.code || r.name || '',
      displayName: r.name || (def ? def.name.ko : (r.code || '?')),
      value: numVal,
      unit: r.unit || (def ? def.unit : ''),
      ref: ref,
      status: status,
      category: category,
      related: def ? def.related : [],
      pregnancyRelevant: def ? def.pregnancyRelevant : false,
      suspicious: false,
      _aiNormalized: true,
    });
  });
  const catOrder = Object.fromEntries(Object.entries(_CHECKUP_CATEGORIES).map(([k, v]) => [k, v.order]));
  results.sort((a, b) => (catOrder[a.category] || 99) - (catOrder[b.category] || 99));
  return results;
}

// ═══════════════════════════════════════════════════════════════
// AI-ASSISTED NORMALIZATION — 하드코딩 사전의 한계를 AI로 보완
// ═══════════════════════════════════════════════════════════════

// 동적 사전: 마스터 settings.customTests에 저장, 하드코딩 사전을 런타임 확장
function _getCustomTests() {
  const m = DM();
  return (m?.settings?.customTests) || {};
}
async function _saveCustomTest(code, def) {
  const m = DM(); if (!m) return;
  if (!m.settings) m.settings = {};
  if (!m.settings.customTests) m.settings.customTests = {};
  m.settings.customTests[code] = def;
  await saveMaster();
}
// 통합 사전 조회: 하드코딩 + 동적
function _getTestDef(code) {
  return _CHECKUP_STD_TESTS[code] || _getCustomTests()[code] || null;
}

// 표준 코드 목록 (AI 프롬프트용 — 하드코딩 + 동적 합산)
function _getStdCodeList() {
  const hard = Object.entries(_CHECKUP_STD_TESTS).map(([code, def]) =>
    `${code}: ${def.name.ko}(${def.name.en}) [${def.unit}]`
  );
  const custom = Object.entries(_getCustomTests()).map(([code, def]) =>
    `${code}: ${def.name.ko}(${def.name.en||''}) [${def.unit}] (사용자정의)`
  );
  return hard.concat(custom).join('\n');
}

// AI에게 매핑 검증 요청 — 미매칭/의심 항목만 전송 (비용 최소화)
async function aiVerifyNormalization(rawResults, who, aiId) {
  const needVerify = rawResults.filter(r => !r.stdCode || r.suspicious);
  if (!needVerify.length) return rawResults;

  const selectedAi = aiId || (S.keys?.gemini ? 'gemini' : (S.keys?.claude ? 'claude' : (S.keys?.gpt ? 'gpt' : null)));
  if (!selectedAi || !S.keys?.[selectedAi]) return rawResults;
  showToast('🤖 ' + (AI_DEFS[selectedAi]?.name || selectedAi) + ' 검사 표준화 검증 중... (' + needVerify.length + '건)', 8000);

  const prompt = `의료 검사 결과 표준화를 검증해주세요.
아래 항목들의 rawName을 표준 검사 코드에 매핑하세요.
대상: ${who} (${who === '붕쌤' ? '남성' : '여성'})

규칙:
1. 기존 코드 목록에 있으면 → 해당 stdCode 사용
2. 목록에 없지만 실제 의료 검사 항목이면 → 새 코드를 만들어 "isNew":true 로 표기
   (코드는 영문 대문자 약어, category는 가장 적절한 것 선택)
3. 검사 결과가 아닌 항목(AI 예측값, 점수, BMI, 소견 등) → stdCode: null
4. 값이 해당 검사의 정상 범위와 크게 다르면 suspicious: true

[매핑할 항목]
${needVerify.map((r, i) => `${i}. rawName="${r.rawName}" value=${r.rawValue} unit=${r.rawUnit || '없음'}`).join('\n')}

[기존 코드 목록]
${_getStdCodeList()}

[카테고리]
${Object.entries(_CHECKUP_CATEGORIES).map(([k,v])=>k+':'+v.name).join(', ')}

반드시 JSON 배열로 응답:
[{"idx":0, "stdCode":"TSH", "displayName":"갑상선자극호르몬", "displayNameEn":"TSH", "unit":"mIU/L", "category":"thyroid", "refLow":0.35, "refHigh":5.50, "suspicious":false, "isNew":false},...]
비-검사 항목: {"idx":0, "stdCode":null, "reason":"AI 예측값"}`;

  try {
    const response = await callAI(selectedAi, '의료 검사 표준화 전문가. JSON만 응답.', prompt);
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return rawResults;
    const aiMappings = JSON.parse(jsonMatch[0]);

    let newTestsAdded = 0;
    aiMappings.forEach(m => {
      if (m.idx === undefined || m.idx < 0 || m.idx >= needVerify.length) return;
      const target = needVerify[m.idx];
      const origIdx = rawResults.findIndex(r => r.rawName === target.rawName && r.rawValue === target.rawValue);
      if (origIdx < 0) return;

      if (m.stdCode === null) {
        rawResults[origIdx]._aiRemoved = true;
      } else if (m.stdCode) {
        let def = _getTestDef(m.stdCode);

        // 새 항목: 동적 사전에 추가
        if (!def && m.isNew) {
          def = {
            name: { ko: m.displayName || m.stdCode, en: m.displayNameEn || m.stdCode },
            unit: m.unit || '', category: m.category || 'other',
            ref: (m.refLow !== undefined && m.refHigh !== undefined) ? { low: m.refLow, high: m.refHigh } : { low: 0, high: 999 },
            aliases: [m.displayName?.toLowerCase(), m.stdCode?.toLowerCase()].filter(Boolean),
            related: [], pregnancyRelevant: false, _aiGenerated: true,
          };
          // 런타임 하드코딩 사전에도 추가 (현재 세션 내 즉시 사용)
          _CHECKUP_STD_TESTS[m.stdCode] = def;
          // 마스터에 비동기 저장 (다음 세션에서도 유지)
          _saveCustomTest(m.stdCode, def);
          newTestsAdded++;
        }

        if (def) {
          rawResults[origIdx].stdCode = m.stdCode;
          rawResults[origIdx].displayName = m.displayName || def.name.ko;
          rawResults[origIdx].category = def.category;
          rawResults[origIdx].related = def.related || [];
          rawResults[origIdx].pregnancyRelevant = def.pregnancyRelevant || false;
          if (m.unit) rawResults[origIdx].unit = m.unit;
          if (m.refLow !== undefined && m.refHigh !== undefined) {
            rawResults[origIdx].ref = { low: m.refLow, high: m.refHigh };
          }
          rawResults[origIdx].suspicious = m.suspicious || false;
          rawResults[origIdx]._aiVerified = true;
        }
      }
    });

    if (newTestsAdded) showToast(`🆕 ${newTestsAdded}개 새 검사항목이 사전에 추가됨`);
    return rawResults.filter(r => !r._aiRemoved);
  } catch (e) {
    console.warn('AI verify failed:', e.message);
    return rawResults;
  }
}

// 매핑 캐시: 기관+원시키 → stdCode (클라우드 저장 — settings.mappingCache)
function _getMappingCache() {
  const m = DM();
  if (!m) return {};
  if (!m.settings) m.settings = {};
  if (!m.settings.mappingCache) m.settings.mappingCache = {};
  return m.settings.mappingCache;
}
function _getCachedMapping(institution, rawName) {
  return _getMappingCache()[institution + '::' + rawName];
}
function _setCachedMapping(institution, rawName, stdCode) {
  const cache = _getMappingCache();
  cache[institution + '::' + rawName] = stdCode;
  // saveMaster는 호출측에서 일괄 처리 (빈번한 저장 방지)
}

// 캐시 적용 정규화: 이전에 AI 검증된 매핑 재사용
function normalizeWithCache(aiValues, aiRefs, who, institution) {
  const results = normalizeCheckupResults(aiValues, aiRefs, who);
  if (!institution) return results;
  // 캐시된 매핑 적용
  results.forEach(r => {
    if (r.stdCode) return; // 이미 매칭됨
    const cached = _getCachedMapping(institution, r.rawName);
    if (cached && _getTestDef(cached)) {
      const def = _getTestDef(cached);
      r.stdCode = cached;
      r.displayName = def.name.ko;
      r.category = def.category;
      r.related = def.related;
      r.pregnancyRelevant = def.pregnancyRelevant;
      r._cached = true;
    } else if (cached === '_skip') {
      r._aiRemoved = true;
    }
  });
  return results.filter(r => !r._aiRemoved);
}

// AI 검증 후 캐시에 저장 (클라우드)
async function _cacheVerifiedMappings(results, institution) {
  if (!institution) return;
  let added = 0;
  results.forEach(r => {
    if (r._aiVerified || r.stdCode) {
      _setCachedMapping(institution, r.rawName, r.stdCode || '_skip');
      added++;
    }
  });
  if (added) await saveMaster(); // 클라우드에 캐시 영속화
}

// ═══════════════════════════════════════════════════════════════
// CROSS-DOMAIN DATA ACCESS
// ═══════════════════════════════════════════════════════════════

// 현재 도메인의 healthCheckups 배열 가져오기 (없으면 초기화)
function _getCheckupMaster() {
  const dm = DM();
  if (!dm) return null;
  if (!dm.healthCheckups) dm.healthCheckups = [];
  return dm;
}

// 특정 유저의 모든 건강검진 데이터
// includeLegacy: true면 붕룩이 labResults도 포함 (AI컨텍스트/추세용), false면 직접 저장분만
// opts.includePregnancy: false면 임신특화 카테고리(reproductive/semen) 제외 (건강관리 도메인용)
function getAllHealthCheckups(who, includeLegacy, opts) {
  if (includeLegacy === undefined) includeLegacy = true;
  const includePregnancy = opts?.includePregnancy !== false; // 기본 true
  const results = [];
  // 1) 각 도메인의 healthCheckups (직접 저장된 데이터)
  Object.entries(S.domainState).forEach(([domainId, ds]) => {
    const dd = DOMAINS[domainId];
    if (!dd || !ds.master) return;
    const checkups = ds.master.healthCheckups || [];
    checkups.forEach(c => {
      if (!who || c.who === who) {
        results.push({ ...c, _source: domainId, _sourceLabel: dd.label });
      }
    });
  });
  // 2) 붕룩이 labResults → 표준화 변환 (옵트인)
  if (includeLegacy) {
    const brkDs = S.domainState['bungruki'];
    if (brkDs?.master?.labResults) {
      brkDs.master.labResults.forEach(l => {
        if (who && l.who !== who) return;
        // 건강관리 도메인: 정액검사/호르몬 type 자체를 제외 (미매칭 항목이 'other'로 통과하는 문제 방지)
        if (!includePregnancy && (l.type === 'semen' || l.type === 'hormone')) return;
        let normalized = normalizeCheckupResults(l.values || {}, l.ref || {}, l.who);
        // 건강관리 도메인: 임신 특화 카테고리(생식호르몬, 정액검사) 추가 필터
        if (!includePregnancy) {
          normalized = normalized.filter(r => r.category !== 'reproductive' && r.category !== 'semen');
        }
        if (normalized.length) {
          results.push({
            id: l.id, date: l.date, who: l.who,
            institution: l.institution || '', type: l.type,
            results: normalized, memo: l.memo || '',
            _source: 'bungruki', _sourceLabel: l.who + ' 검사',
            _legacyLab: true,
          });
        }
      });
    }
  }
  // 날짜순 정렬 (최신 먼저)
  results.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return results;
}

// 특정 검사항목의 시계열 추세 데이터
function getCheckupTrend(who, stdCode) {
  const all = getAllHealthCheckups(who);
  const points = [];
  all.forEach(c => {
    (c.results || []).forEach(r => {
      if (r.stdCode === stdCode && typeof r.value === 'number') {
        points.push({
          date: c.date, value: r.value, unit: r.unit,
          status: r.status, ref: r.ref,
          institution: c.institution || c._sourceLabel,
          source: c._source,
        });
      }
    });
  });
  // 날짜순 정렬 (오래된 것 먼저 → 추세 방향)
  points.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  return points;
}

// 추세 방향 판정
function _trendDirection(points) {
  if (points.length < 2) return 'stable';
  const last = points[points.length - 1].value;
  const prev = points[points.length - 2].value;
  const diff = last - prev;
  const pct = Math.abs(diff) / Math.max(1, Math.abs(prev));
  if (pct < 0.03) return 'stable';
  return diff > 0 ? 'up' : 'down';
}

// 검진 결과 저장
async function saveHealthCheckup(checkupData) {
  const m = _getCheckupMaster();
  if (!m) { showToast('⚠️ 마스터 데이터 없음'); return; }
  // 원본 이미지가 base64이면 Drive에 별도 저장
  if (checkupData.imgSrc && checkupData.imgSrc.startsWith('data:')) {
    try {
      const fileId = await _uploadCheckupImage(checkupData.imgSrc, checkupData.date || kstToday());
      if (fileId) { checkupData.imgDriveId = fileId; delete checkupData.imgSrc; }
    } catch (e) { console.warn('이미지 Drive 업로드 실패:', e); /* imgSrc 유지 */ }
  }
  m.healthCheckups.push(checkupData);
  await saveMaster();
  showToast('✅ 검진 결과 저장됨');
}

async function _uploadCheckupImage(dataUrl, dateStr) {
  if (!S.token) return null;
  const folderName = DC()?.user === '붕쌤' ? 'Bung Health' : 'Orangi Health';
  const folderId = await getOrCreateFolder(folderName);
  const imgFolder = await getOrCreateFolder('Checkup Images');
  const fileName = 'checkup_' + dateStr + '_' + Date.now() + '.jpg';
  // base64 → blob
  const base64 = dataUrl.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: 'image/jpeg' });
  // Drive 업로드
  const boundary = 'ck_img_' + Date.now();
  const meta = JSON.stringify({ name: fileName, parents: [imgFolder] });
  const body = '--' + boundary + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + meta + '\r\n--' + boundary + '\r\nContent-Type: image/jpeg\r\n\r\n';
  const bodyEnd = '\r\n--' + boundary + '--';
  const bodyBlob = new Blob([body, blob, bodyEnd]);
  const resp = await fetchWithRetry('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + S.token, 'Content-Type': 'multipart/related; boundary=' + boundary },
    body: bodyBlob,
  });
  const d = await resp.json();
  return d.id || null;
}

// 검진 결과 삭제
async function deleteHealthCheckup(checkupId) {
  const m = _getCheckupMaster();
  if (!m) return;
  const idx = m.healthCheckups.findIndex(c => c.id === checkupId);
  if (idx < 0) return;
  m.healthCheckups.splice(idx, 1);
  await saveMaster();
  showToast('🗑 삭제됨');
  renderView('meds');
}

// ═══════════════════════════════════════════════════════════════
// EDIT CHECKUP — 검진 결과 수정/편집
// ═══════════════════════════════════════════════════════════════

function editHealthCheckup(checkupId) {
  const m = _getCheckupMaster();
  if (!m) return;
  const checkup = m.healthCheckups.find(c => c.id === checkupId);
  if (!checkup) { showToast('⚠️ 데이터 없음'); return; }

  const results = checkup.results || [];
  const cats = {};
  results.forEach((r, i) => { const cat = r.category || 'other'; if (!cats[cat]) cats[cat] = []; cats[cat].push({ ...r, _idx: i }); });

  const catOrder = Object.fromEntries(Object.entries(_CHECKUP_CATEGORIES).map(([k, v]) => [k, v.order]));
  const sortedCats = Object.entries(cats).sort((a, b) => (catOrder[a[0]] || 99) - (catOrder[b[0]] || 99));

  const rows = sortedCats.map(([cat, items]) => {
    const catDef = _CHECKUP_CATEGORIES[cat] || _CHECKUP_CATEGORIES.other;
    const itemRows = items.map(r => {
      const sc = _statusColor(r.status);
      return `<div style="display:flex;align-items:center;gap:4px;padding:4px 0;border-bottom:1px solid var(--sf)">
        <span style="color:${sc};font-size:.6rem;min-width:14px">${_statusIcon(r.status)}</span>
        <span style="flex:1;font-size:.7rem">${esc(r.displayName)}</span>
        <input type="text" data-ck-edit="${r._idx}" value="${esc(String(r.value))}" style="width:65px;font-size:.72rem;padding:2px 6px;border:1px solid var(--bd);border-radius:4px;font-family:var(--mono);text-align:right">
        <span style="font-size:.58rem;color:var(--mu);min-width:35px">${esc(r.unit || '')}</span>
        <button onclick="this.closest('[data-ck-edit]')?.remove();document.querySelector('[data-ck-del=${r._idx}]').value='1'" style="background:none;border:none;color:#dc2626;cursor:pointer;font-size:.6rem;padding:2px" title="삭제">✕</button>
        <input type="hidden" data-ck-del="${r._idx}" value="0">
      </div>`;
    }).join('');
    return `<div style="margin-bottom:6px">
      <div style="font-size:.68rem;font-weight:600;color:var(--mu);padding:2px 0">${catDef.icon} ${catDef.name}</div>
      ${itemRows}
    </div>`;
  }).join('');

  const meta = `<div style="display:flex;gap:8px;margin-bottom:10px;font-size:.72rem">
    <label>날짜 <input type="date" id="ck-edit-date" value="${checkup.date || ''}" class="dx-form-input" style="width:140px"></label>
    <label>기관 <input type="text" id="ck-edit-inst" value="${esc(checkup.institution || '')}" placeholder="기관명" class="dx-form-input" style="width:140px"></label>
  </div>
  <label style="font-size:.72rem">메모 <input type="text" id="ck-edit-memo" value="${esc(checkup.memo || '')}" class="dx-form-input" style="width:100%"></label>`;

  showConfirmModal('✏️ 검진 결과 편집',
    `<div style="font-size:.72rem">${meta}<div style="margin-top:10px;max-height:300px;overflow-y:auto">${rows}</div></div>`,
    [
      { label: '💾 저장', primary: true, action: async () => {
        // 값 수집
        checkup.date = document.getElementById('ck-edit-date')?.value || checkup.date;
        checkup.institution = document.getElementById('ck-edit-inst')?.value || '';
        checkup.memo = document.getElementById('ck-edit-memo')?.value || '';
        // 개별 결과 수정
        document.querySelectorAll('[data-ck-edit]').forEach(inp => {
          const idx = parseInt(inp.dataset.ckEdit);
          const r = checkup.results[idx];
          if (!r) return;
          const raw = inp.value.trim();
          const num = parseFloat(raw);
          r.value = isNaN(num) ? raw : num;
          // 상태 재판정
          if (typeof r.value === 'number' && r.ref) {
            r.status = _judgeStatus(r.value, r.ref, checkup.who, r.stdCode);
          }
        });
        // 삭제 처리 (역순으로)
        const delIdxs = [];
        document.querySelectorAll('[data-ck-del]').forEach(inp => {
          if (inp.value === '1') delIdxs.push(parseInt(inp.dataset.ckDel));
        });
        delIdxs.sort((a, b) => b - a).forEach(i => checkup.results.splice(i, 1));
        await saveMaster();
        closeConfirmModal();
        showToast('✅ 수정 저장됨');
        renderView('meds');
      }},
      { label: '취소', action: closeConfirmModal },
    ]);
}
// ═══════════════════════════════════════════════════════════════

async function aiReclassifyCheckup(source, id, isLegacy) {
  const aiId = S.keys?.gemini ? 'gemini' : (S.keys?.claude ? 'claude' : (S.keys?.gpt ? 'gpt' : null));
  if (!aiId) { showToast('⚠️ AI API 키 필요'); return; }

  // 원본 데이터 찾기
  let rawValues, rawRef, who, date, origEntry;
  if (isLegacy) {
    const brkDs = S.domainState['bungruki'];
    origEntry = brkDs?.master?.labResults?.find(l => l.id === id);
    if (!origEntry) { showToast('⚠️ 원본 데이터 없음'); return; }
    rawValues = origEntry.values; rawRef = origEntry.ref; who = origEntry.who; date = origEntry.date;
  } else {
    const ds = S.domainState[source];
    origEntry = ds?.master?.healthCheckups?.find(c => c.id === id);
    if (!origEntry) { showToast('⚠️ 원본 데이터 없음'); return; }
    // 이미 results가 있으면 values로 역변환
    rawValues = {};
    (origEntry.results || []).forEach(r => { rawValues[r.displayName || r.rawName] = r.value; });
    rawRef = {};
    (origEntry.results || []).forEach(r => { if (r.ref) rawRef[r.displayName || r.rawName] = r.ref.low + '-' + r.ref.high; });
    who = origEntry.who; date = origEntry.date;
  }

  _showCkProgress('🤖 AI 재분류', '#8b5cf6');
  _updateCkProgress(0, 1, aiId + ' 분석 중... (' + Object.keys(rawValues).length + '개 항목)');
  try {
    const newResults = await _aiReclassify(rawValues, rawRef, who, aiId);
    _updateCkProgress(1, 1, '완료!');
    if (!newResults.length) { _closeCkProgress(); showToast('⚠️ AI 재분류 결과 없음'); return; }

    if (isLegacy) {
      // 붕룩이 labResult: 값은 유지, 건강관리에서 보이는 결과만 변경됨
      // healthCheckups에 새로 저장
      const checkup = {
        id: Date.now(), date, who, institution: origEntry.institution || '',
        type: origEntry.type || 'general', sourceType: 'reclassified',
        results: newResults, aiUsed: 'reclassify:' + aiId,
        memo: (origEntry.memo || '') + ' [AI 재분류]',
        _reclassifiedFrom: id,
      };
      await saveHealthCheckup(checkup);
    } else {
      // healthCheckup: 직접 교체
      origEntry.results = newResults;
      origEntry.aiUsed = (origEntry.aiUsed || '') + '+reclassify:' + aiId;
      await saveMaster();
    }
    _closeCkProgress();
    showToast('✅ AI 재분류 완료');
    renderView('meds');
  } catch (e) {
    _closeCkProgress();
    showToast('❌ 재분류 실패: ' + e.message, 4000);
  }
}

async function aiReclassifyAll() {
  const aiId = S.keys?.gemini ? 'gemini' : (S.keys?.claude ? 'claude' : (S.keys?.gpt ? 'gpt' : null));
  if (!aiId) { showToast('⚠️ AI API 키 필요'); return; }
  const who = DC().user;
  const allCheckups = getAllHealthCheckups(who, true, { includePregnancy: false });
  if (!allCheckups.length) { showToast('재분류할 데이터 없음'); return; }

  if (!confirm(allCheckups.length + '건의 검사결과를 AI로 재분류합니다.\n비용이 발생할 수 있습니다. 계속?')) return;

  _showCkProgress('🤖 전체 AI 재분류', '#8b5cf6');
  let done = 0, failed = 0;
  for (let i = 0; i < allCheckups.length; i++) {
    if (_ckProgressAbort) break;
    const c = allCheckups[i];
    _updateCkProgress(i, allCheckups.length, (i + 1) + '/' + allCheckups.length + ' — ' + (c.date || '') + ' 처리 중...');
    try {
      // 개별 재분류 (내부에서 진행률을 덮어쓰지 않도록 직접 호출)
      const rawValues = {}, rawRef = {};
      if (c._legacyLab) {
        const brkDs = S.domainState['bungruki'];
        const orig = brkDs?.master?.labResults?.find(l => l.id === c.id);
        if (orig) { Object.assign(rawValues, orig.values || {}); Object.assign(rawRef, orig.ref || {}); }
      } else {
        (c.results || []).forEach(r => { rawValues[r.displayName || r.rawName] = r.value; });
        (c.results || []).forEach(r => { if (r.ref) rawRef[r.displayName || r.rawName] = r.ref.low + '-' + r.ref.high; });
      }
      if (Object.keys(rawValues).length) {
        const newResults = await _aiReclassify(rawValues, rawRef, c.who || who, aiId);
        if (newResults.length) {
          if (c._legacyLab) {
            await saveHealthCheckup({ id: Date.now() + done, date: c.date, who: c.who, institution: c.institution || '', type: c.type || 'general', sourceType: 'reclassified', results: newResults, aiUsed: 'reclassify:' + aiId, memo: (c.memo || '') + ' [AI 재분류]', _reclassifiedFrom: c.id });
          } else {
            const ds = S.domainState[c._source];
            const orig = ds?.master?.healthCheckups?.find(x => x.id === c.id);
            if (orig) { orig.results = newResults; orig.aiUsed = (orig.aiUsed || '') + '+reclassify:' + aiId; await saveMaster(); }
          }
        }
      }
      done++;
    } catch (e) { failed++; }
  }
  _updateCkProgress(allCheckups.length, allCheckups.length, '✅ 완료!');
  setTimeout(() => { _closeCkProgress(); showToast('✅ 재분류 완료: ' + done + '건 성공' + (failed ? ', ' + failed + '건 실패' : '')); renderView('meds'); }, 800);
}

// AI에게 기존 values/ref를 보내서 results[] 배열로 재분류
async function _aiReclassify(values, refs, who, aiId) {
  if (!values || !Object.keys(values).length) return [];
  const prompt = `다음은 의료 검사 결과입니다. 정규화된 JSON results 배열로 재분류하세요.

대상: ${who} (${who === '붕쌤' ? '남성' : '여성'})

원본 데이터:
${JSON.stringify(values, null, 1)}

참고범위:
${refs ? JSON.stringify(refs, null, 1) : '없음'}

반드시 아래 JSON 형식으로 응답:
{"results":[
  {"code":"WBC","name":"백혈구","value":6.78,"unit":"10^3/μL","refLow":4.0,"refHigh":10.0,"status":"normal","category":"cbc"}
]}

규칙:
1. 실제 검사된 항목만 포함. 미실시/빈값/텍스트만 있는 항목 제외
2. value가 숫자가 아닌 항목(Negative/Positive 등)은 제외 (단, 항원/항체는 숫자 변환)
3. 중복 항목 하나만 유지
4. status: normal/high/low/positive(항체 면역 형성)
5. category: cbc/liver/kidney/thyroid/lipid/glucose/electrolyte/inflammation/reproductive/semen/vitamin/iron/tumor/infection/coagulation/urine/other
6. code: 표준 약어 (WBC, RBC, HGB, AST, ALT, TSH 등). 모르면 null`;

  const result = await callAI(aiId, '의료 검사 데이터 표준화 전문가', prompt);
  const jsonMatch = result.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('JSON 파싱 실패');
  const parsed = JSON.parse(jsonMatch[0]);
  return normalizeFromAI(parsed.results || [], who);
}

// ═══════════════════════════════════════════════════════════════
// AI VISION ANALYSIS (검진 결과 사진/PDF → 표준화)
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// AI 종합 해석 — 전체 검진 패널 기반 소견 생성
// ═══════════════════════════════════════════════════════════════

async function aiCheckupInterpretation() {
  const aiId = S.keys?.claude ? 'claude' : (S.keys?.gemini ? 'gemini' : (S.keys?.gpt ? 'gpt' : null));
  if (!aiId) { showToast('⚠️ AI API 키 필요'); return; }
  const who = DC().user;
  const allCheckups = getAllHealthCheckups(who, true, { includePregnancy: false });
  if (!allCheckups.length) { showToast('검진 데이터 없음'); return; }

  // 최근 검진 데이터를 텍스트로 정리
  const recent = allCheckups.slice(0, 5); // 최근 5건
  const dataText = recent.map(c => {
    const date = c.date || '?';
    const inst = c.institution || '';
    const items = (c.results || []).map(r => {
      const status = r.status === 'high' ? '↑' : r.status === 'low' ? '↓' : r.status === 'positive' ? '🛡' : '';
      const ref = r.ref ? `(참고: ${r.ref.low}-${r.ref.high})` : '';
      return `${r.displayName || r.rawName}: ${r.value} ${r.unit || ''} ${status} ${ref}`;
    }).join('\n  ');
    return `[${date} ${inst}]\n  ${items}`;
  }).join('\n\n');

  _showCkProgress('💡 AI 종합 해석', '#10b981');
  _updateCkProgress(0, 2, aiId + '에게 검진 ' + recent.length + '건 분석 요청 중...');

  const prompt = `다음은 ${who}의 건강검진 결과 ${recent.length}건입니다.

${dataText}

아래 형식으로 종합 해석을 해주세요:

1. **전반적 건강 상태 요약** (1-2문장)
2. **주의 필요 항목** — 이상 수치와 그 임상적 의미 (각 항목별 구체적으로)
3. **양호한 항목** — 정상 범위 유지 중인 주요 항목
4. **추세 분석** — 같은 항목이 여러 번 기록된 경우 변화 추세
5. **권장 사항** — 추가 검사, 생활습관, 의료 상담 필요 여부
${who === '오랑이' ? '6. **임신 준비 관점** — 현재 결과가 임신에 미치는 영향' : ''}

한국어로 작성하되, 의학적으로 정확하게. 환자가 이해하기 쉬운 용어로.`;

  try {
    const result = await callAI(aiId, '내과 전문의 + 예방의학 전문가', prompt);
    _updateCkProgress(2, 2, '✅ 해석 완료! 결과 저장 중...');
    // 결과를 모달로 표시 + 마스터에 저장
    const interpretation = {
      id: Date.now(),
      date: kstToday(),
      who: who,
      aiUsed: aiId,
      content: result,
      checkupDates: recent.map(c => c.date),
    };

    // 마스터에 저장
    const m = DM();
    if (m) {
      if (!m.aiInterpretations) m.aiInterpretations = [];
      m.aiInterpretations.unshift(interpretation);
      if (m.aiInterpretations.length > 10) m.aiInterpretations = m.aiInterpretations.slice(0, 10);
      await saveMaster();
    }

    _closeCkProgress();
    showConfirmModal('💡 AI 종합 해석',
      `<div style="font-size:.72rem;color:var(--mu);margin-bottom:8px">${who} · ${kstToday()} · ${aiId} 분석 · 검진 ${recent.length}건 기반</div>
      <div style="font-size:.78rem;line-height:1.7;max-height:400px;overflow-y:auto">${typeof marked !== 'undefined' ? DOMPurify.sanitize(marked.parse(result)) : esc(result).replace(/\n/g, '<br>')}</div>`,
      [{ label: '확인', action: closeConfirmModal }]);
  } catch (e) {
    _closeCkProgress();
    showToast('❌ 해석 실패: ' + e.message, 4000);
  }
}

// ═══════════════════════════════════════════════════════════════
// DOCUMENT ANALYSIS (PDF/DOCX/TXT → 텍스트 추출 → AI 분석)
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// GOOGLE DRIVE IMPORT — Drive에서 검사 파일 가져오기
// ═══════════════════════════════════════════════════════════════

async function importCheckupFromDrive() {
  if (!S.token) { showToast('⚠️ 로그인 필요'); return; }
  _browseDriveFolder('root');
}

// Drive 폴더 탐색 + 파일 선택
async function _browseDriveFolder(folderId) {
  showToast('☁️ Drive 탐색 중...', 3000);
  try {
    // 폴더 내 파일 + 하위 폴더 검색
    const folderQ = folderId === 'root'
      ? "'root' in parents and trashed=false"
      : "'" + folderId + "' in parents and trashed=false";
    const query = folderQ + " and (mimeType='application/vnd.google-apps.folder' or mimeType contains 'image/' or mimeType='application/pdf' or mimeType='application/vnd.openxmlformats-officedocument.wordprocessingml.document' or mimeType='text/plain')";
    const resp = await fetchWithRetry(
      'https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(query) +
      '&orderBy=folder,modifiedTime desc&pageSize=50&fields=files(id,name,mimeType,modifiedTime,size)',
      { headers: { Authorization: 'Bearer ' + S.token } });
    const data = await resp.json();
    if (data.error) throw new Error(data.error.message);
    const files = data.files || [];

    // 폴더와 파일 분리
    const folders = files.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
    const docs = files.filter(f => f.mimeType !== 'application/vnd.google-apps.folder');

    const folderList = folders.map(f =>
      `<div onclick="_browseDriveFolder('${f.id}')" style="display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--bd);border-radius:8px;cursor:pointer;background:var(--sf);margin-bottom:3px">
        <span style="font-size:1.1rem">📁</span>
        <span style="font-size:.75rem;font-weight:500">${esc(f.name)}</span>
        <span style="font-size:.6rem;color:var(--mu);margin-left:auto">▶</span>
      </div>`).join('');

    const fileList = docs.map((f, i) => {
      const icon = f.mimeType.includes('image') ? '🖼' : f.mimeType.includes('pdf') ? '📕' : f.mimeType.includes('word') ? '📘' : '📄';
      const size = f.size ? Math.round(f.size / 1024) + 'KB' : '';
      const date = f.modifiedTime ? f.modifiedTime.slice(0, 10) : '';
      return `<div onclick="_selectDriveFile(${i})" style="display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--bd);border-radius:8px;cursor:pointer;background:var(--sf2);margin-bottom:3px" data-drive-idx="${i}">
        <span style="font-size:1.1rem">${icon}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:.72rem;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(f.name)}</div>
          <div style="font-size:.58rem;color:var(--mu)">${date} · ${size}</div>
        </div>
      </div>`;
    }).join('');

    window._driveCheckupFiles = docs;
    const backBtn = folderId !== 'root'
      ? `<button onclick="_browseDriveFolder('root')" style="font-size:.68rem;padding:4px 10px;border:1px solid var(--bd);border-radius:6px;background:var(--sf);cursor:pointer;color:var(--ink);font-family:var(--font);margin-bottom:6px">⬆ 루트로</button>` : '';
    const recentBtn = `<button onclick="_browseRecentDriveFiles()" style="font-size:.68rem;padding:4px 10px;border:1px solid var(--ac);border-radius:6px;background:var(--sf);cursor:pointer;color:var(--ac);font-family:var(--font);margin-bottom:6px;margin-left:4px">🕐 최근 파일</button>`;

    showConfirmModal('☁️ Google Drive에서 파일 선택',
      `<div style="display:flex;gap:4px;margin-bottom:6px">${backBtn}${recentBtn}</div>
      <div style="max-height:350px;overflow-y:auto">
        ${folderList}
        ${fileList}
        ${!folders.length && !docs.length ? '<div style="text-align:center;padding:20px;font-size:.72rem;color:var(--mu)">이 폴더에 파일이 없습니다</div>' : ''}
      </div>`,
      [{ label: '취소', action: closeConfirmModal }]);
  } catch (e) {
    showToast('❌ Drive 탐색 실패: ' + e.message, 4000);
  }
}

// 최근 파일 보기 (기존 동작)
async function _browseRecentDriveFiles() {
  showToast('🕐 최근 파일 검색 중...', 3000);
  try {
    const query = "(mimeType contains 'image/' or mimeType='application/pdf' or mimeType='application/vnd.openxmlformats-officedocument.wordprocessingml.document' or mimeType='text/plain') and trashed=false";
    const resp = await fetchWithRetry(
      'https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(query) +
      '&orderBy=modifiedTime desc&pageSize=20&fields=files(id,name,mimeType,modifiedTime,size)',
      { headers: { Authorization: 'Bearer ' + S.token } });
    const data = await resp.json();
    if (data.error) throw new Error(data.error.message);
    const files = data.files || [];
    if (!files.length) { showToast('📭 최근 파일 없음'); return; }

    const fileList = files.map((f, i) => {
      const icon = f.mimeType.includes('image') ? '🖼' : f.mimeType.includes('pdf') ? '📕' : '📄';
      const size = f.size ? Math.round(f.size / 1024) + 'KB' : '';
      const date = f.modifiedTime ? f.modifiedTime.slice(0, 10) : '';
      return `<div onclick="_selectDriveFile(${i})" style="display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--bd);border-radius:8px;cursor:pointer;background:var(--sf2);margin-bottom:3px">
        <span style="font-size:1.1rem">${icon}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:.72rem;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(f.name)}</div>
          <div style="font-size:.58rem;color:var(--mu)">${date} · ${size}</div>
        </div>
      </div>`;
    }).join('');

    window._driveCheckupFiles = files;
    const backBtn = `<button onclick="_browseDriveFolder('root')" style="font-size:.68rem;padding:4px 10px;border:1px solid var(--bd);border-radius:6px;background:var(--sf);cursor:pointer;color:var(--ink);font-family:var(--font);margin-bottom:6px">📁 폴더 탐색</button>`;

    showConfirmModal('🕐 최근 수정된 파일',
      `${backBtn}<div style="max-height:350px;overflow-y:auto">${fileList}</div>`,
      [{ label: '취소', action: closeConfirmModal }]);
  } catch (e) {
    showToast('❌ 검색 실패: ' + e.message, 4000);
  }
}

async function _selectDriveFile(idx) {
  const files = window._driveCheckupFiles;
  if (!files || !files[idx]) return;
  const f = files[idx];
  closeConfirmModal();
  showToast('☁️ 파일 다운로드 중...', 5000);

  try {
    if (f.mimeType.includes('image')) {
      // 이미지 → Vision 분석 플로우
      const resp = await fetchWithRetry('https://www.googleapis.com/drive/v3/files/' + f.id + '?alt=media',
        { headers: { Authorization: 'Bearer ' + S.token } });
      const blob = await resp.blob();
      const dataUrl = await new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
      _stagedCheckupPhotos = [{ dataUrl, name: f.name, type: f.mimeType }];
      _showStagedCheckupPhotos();
    } else {
      // PDF/문서 → 텍스트 추출 플로우
      const resp = await fetchWithRetry('https://www.googleapis.com/drive/v3/files/' + f.id + '?alt=media',
        { headers: { Authorization: 'Bearer ' + S.token } });
      const blob = await resp.blob();
      const file = new File([blob], f.name, { type: f.mimeType });
      // stageCheckupDocs 내부 로직 재활용
      const ext = f.name.split('.').pop().toLowerCase();
      let text = '';
      if (ext === 'pdf' || f.mimeType.includes('pdf')) text = await _extractPdfText(file);
      else if (ext === 'docx' || f.mimeType.includes('word')) text = await _extractDocxText(file);
      else text = await _extractTxtText(file);

      if (!text || text.trim().length < 20) {
        showToast('⚠️ 텍스트 추출 부족. 이미지로 시도해 주세요.', 4000); return;
      }
      const aiId = S.keys?.gemini ? 'gemini' : (S.keys?.claude ? 'claude' : (S.keys?.gpt ? 'gpt' : null));
      if (!aiId) { showToast('⚠️ AI API 키 필요'); return; }
      const who = DC().user || '오랑이';
      await _analyzeDocText(text, who, aiId, f.name);
    }
  } catch (e) {
    showToast('❌ 파일 처리 실패: ' + e.message, 4000);
  }
  delete window._driveCheckupFiles;
}

// ═══════════════════════════════════════════════════════════════
// DOCUMENT ANALYSIS (PDF/DOCX/TXT → 텍스트 추출 → AI 분석)
// ═══════════════════════════════════════════════════════════════

async function stageCheckupDocs(input) {
  if (!input.files || !input.files.length) return;
  const file = input.files[0];
  input.value = '';
  const ext = file.name.split('.').pop().toLowerCase();

  showToast('📄 문서 읽는 중...', 5000);
  let text = '';
  try {
    if (ext === 'pdf') text = await _extractPdfText(file);
    else if (ext === 'docx') text = await _extractDocxText(file);
    else if (ext === 'txt') text = await _extractTxtText(file);
    else { showToast('⚠️ 지원: PDF, DOCX, TXT'); return; }
  } catch (e) {
    showToast('❌ 문서 읽기 실패: ' + e.message, 4000); return;
  }

  if (!text || text.trim().length < 20) {
    showToast('⚠️ 추출된 텍스트가 너무 적습니다. 사진으로 시도해 주세요.', 4000); return;
  }

  // AI 선택 → 분석
  const aiId = S.keys?.gemini ? 'gemini' : (S.keys?.claude ? 'claude' : (S.keys?.gpt ? 'gpt' : null));
  if (!aiId) { showToast('⚠️ AI API 키 필요'); return; }

  const who = DC().user || '오랑이';
  const preview = text.slice(0, 500) + (text.length > 500 ? '...' : '');

  showConfirmModal('📄 문서 분석',
    `<div style="font-size:.72rem">
      <div style="margin-bottom:8px"><b>${esc(file.name)}</b> (${Math.round(text.length/1024)}KB 텍스트 추출)</div>
      <div style="padding:8px;background:var(--sf2);border:1px solid var(--bd);border-radius:6px;max-height:150px;overflow-y:auto;font-size:.65rem;font-family:var(--mono);white-space:pre-wrap;color:var(--mu)">${esc(preview)}</div>
      <div style="margin-top:8px;font-size:.62rem;color:var(--mu2)">💡 텍스트 기반 분석 — Vision API 불필요 (저비용)</div>
    </div>`,
    [{ label: '🤖 ' + aiId + '로 분석', primary: true, action: async () => {
      closeConfirmModal();
      await _analyzeDocText(text, who, aiId, file.name);
    }}, { label: '취소', action: closeConfirmModal }]);
}

async function _extractPdfText(file) {
  if (!window.pdfjsLib) await window._pdfjsReady;
  if (!window.pdfjsLib) throw new Error('PDF 라이브러리 로딩 실패');
  const arrayBuf = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuf }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map(it => it.str).join(' '));
  }
  return pages.join('\n\n');
}

async function _extractDocxText(file) {
  // JSZip 동적 로드
  if (!window.JSZip) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/jszip@3/dist/jszip.min.js';
      s.onload = resolve; s.onerror = () => reject(new Error('JSZip 로딩 실패'));
      document.head.appendChild(s);
    });
  }
  const arrayBuf = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuf);
  const docXml = await zip.file('word/document.xml')?.async('string');
  if (!docXml) throw new Error('워드 문서 구조 인식 실패');
  // XML에서 텍스트만 추출 (w:t 태그)
  const matches = docXml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
  return matches.map(m => m.replace(/<[^>]+>/g, '')).join(' ').replace(/\s+/g, ' ');
}

async function _extractTxtText(file) {
  return await file.text();
}

async function _analyzeDocText(text, who, aiId, fileName) {
  _showCkProgress('📄 문서 AI 분석', 'var(--ac)');
  _updateCkProgress(0, 2, aiId + '에게 ' + fileName + ' 분석 요청 중...');
  const prompt = `다음은 의료 검사 결과 문서입니다.
대상: ${who} (${who === '붕쌤' ? '남성' : '여성'})

문서 내용:
${text.slice(0, 8000)}

반드시 아래 JSON 형식으로 응답:
{"type":"blood","date":"YYYY-MM-DD","who":"${who}",
 "results":[
  {"code":"WBC","name":"백혈구","value":6.78,"unit":"10^3/μL","refLow":4.0,"refHigh":10.0,"status":"normal","category":"cbc"}
 ],
 "opinion":"종합 소견"}

규칙:
1. type: semen/blood/hormone/ultrasound/other
2. results 배열 — 실제 검사된 항목만. 미실시/빈값 제외
3. value: 반드시 숫자. 항체: 높으면 면역(positive)
4. status: normal/high/low/positive(항체 면역)
5. category: cbc/liver/kidney/thyroid/lipid/glucose/electrolyte/inflammation/reproductive/semen/vitamin/iron/tumor/infection/coagulation/urine/other
6. 중복 항목 제거`;

  try {
    const result = await callAI(aiId, '의료 검사 결과 분석 전문가', prompt);
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI 응답 파싱 실패');
    const parsed = JSON.parse(jsonMatch[0]);
    parsed._aiNormalized = true;
    parsed._imgSrc = null;
    parsed._usedAis = [aiId];
    parsed._sourceFile = fileName;
    _updateCkProgress(2, 2, '✅ 분석 완료!');
    setTimeout(() => { _closeCkProgress(); _showCheckupAnalysisResults([parsed]); }, 500);
  } catch (e) {
    _closeCkProgress();
    showToast('❌ 분석 실패: ' + e.message, 4000);
  }
}

// ═══════════════════════════════════════════════════════════════
// IMAGE ANALYSIS (사진 → AI Vision)
// ═══════════════════════════════════════════════════════════════

var _stagedCheckupPhotos = [];
var _checkupAnalyzeAbort = false;

function stageCheckupPhotos(input) {
  if (!input.files || !input.files.length) return;
  _stagedCheckupPhotos = [];
  let loaded = 0;
  const total = input.files.length;
  Array.from(input.files).forEach(file => {
    const reader = new FileReader();
    reader.onload = function(e) {
      _stagedCheckupPhotos.push({ dataUrl: e.target.result, name: file.name, type: file.type || 'image/jpeg' });
      loaded++;
      if (loaded === total) _showStagedCheckupPhotos();
    };
    reader.readAsDataURL(file);
  });
  input.value = '';
}

function _showStagedCheckupPhotos() {
  const thumbs = _stagedCheckupPhotos.map((p, i) => `<div style="position:relative;display:inline-block">
    <img src="${p.dataUrl}" style="width:80px;height:80px;object-fit:cover;border-radius:6px;border:1px solid var(--bd)">
    <button onclick="_stagedCheckupPhotos.splice(${i},1);_showStagedCheckupPhotos()" style="position:absolute;top:-4px;right:-4px;background:#dc2626;color:white;border:none;border-radius:50%;width:18px;height:18px;font-size:.6rem;cursor:pointer;line-height:18px">✕</button>
    <div style="font-size:.5rem;color:var(--mu);text-align:center;margin-top:2px">${esc(p.name.slice(0, 12))}</div>
  </div>`).join('');

  // AI 선택 옵션 (비용 추적 포함)
  const aiOpts = _brkVisionAiOptions();
  const available = aiOpts.filter(a => a.available);
  const aiButtons = aiOpts.map(a => `<button class="ck-ai-btn${a.available ? '' : ' disabled'}" onclick="${a.available ? `_analyzeCheckupPhotos('${a.id}')` : ''}"
    style="padding:5px 10px;font-size:.72rem;border:1.5px solid ${a.available ? a.color : 'var(--bd)'};border-radius:6px;background:${a.available ? a.color + '15' : 'var(--sf2)'};color:${a.available ? a.color : 'var(--mu)'};cursor:${a.available ? 'pointer' : 'default'};font-family:var(--font);opacity:${a.available ? 1 : 0.4}">
    ${a.name} ${a.tag || ''}<div style="font-size:.5rem;color:var(--mu)">${a.desc}</div>
  </button>`).join('');

  const consensusBtn = available.length >= 2
    ? `<button onclick="_analyzeCheckupConsensus()" style="padding:6px 14px;font-size:.75rem;font-weight:600;border:2px solid #8b5cf6;border-radius:8px;background:#8b5cf615;color:#8b5cf6;cursor:pointer;font-family:var(--font)">
        🏆 멀티AI 교차검증 (${available.map(a=>a.name).join('+')})<div style="font-size:.5rem;color:var(--mu)">정확도 최고 · 비용 ${available.length}배</div></button>` : '';

  const container = document.getElementById('checkup-staged-area');
  if (container) container.innerHTML = `
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin:8px 0">${thumbs}</div>
    <div style="font-size:.68rem;color:var(--mu);margin-bottom:6px">📷 ${_stagedCheckupPhotos.length}장 · AI를 선택하세요</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px">${aiButtons}</div>
    ${consensusBtn}
    <div style="margin-top:6px"><button onclick="_addMoreCheckupPhotos(document.getElementById('ck-add-input'))" style="font-size:.65rem;color:var(--ac);background:none;border:none;cursor:pointer;font-family:var(--font)">+ 사진 추가</button>
    <input type="file" id="ck-add-input" multiple accept="image/*" onchange="_addMoreCheckupPhotos(this)" style="display:none"></div>`;
}

function _addMoreCheckupPhotos(input) {
  if (!input?.files?.length) return;
  let loaded = 0; const total = input.files.length;
  Array.from(input.files).forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      _stagedCheckupPhotos.push({ dataUrl: e.target.result, name: file.name, type: file.type || 'image/jpeg' });
      loaded++; if (loaded === total) _showStagedCheckupPhotos();
    };
    reader.readAsDataURL(file);
  });
  input.value = '';
}

// 단일 AI 분석
async function _analyzeCheckupPhotos(aiId) {
  if (!_stagedCheckupPhotos.length) return;
  if (!S.keys?.[aiId]) { showToast('⚠️ ' + aiId + ' API 키 필요'); return; }
  const total = _stagedCheckupPhotos.length;
  _checkupAnalyzeAbort = false;
  _showAnalyzeProgress(AI_DEFS[aiId].name + ' 검진분석', total, AI_DEFS[aiId].color);

  const results = [];
  for (let i = 0; i < total; i++) {
    if (_checkupAnalyzeAbort) { results.push({ error: '사용자 중단' }); continue; }
    _updateProgress(i, total, '📷 사진 ' + (i + 1) + '/' + total + ' — ' + AI_DEFS[aiId].name + ' 분석 중...');
    try {
      const parsed = await _analyzeOnePhoto(_stagedCheckupPhotos[i], aiId);
      results.push({ ...parsed, _imgSrc: _stagedCheckupPhotos[i].dataUrl, _usedAis: [aiId] });
    } catch (e) {
      results.push({ error: e.message, _imgSrc: _stagedCheckupPhotos[i].dataUrl });
    }
  }
  _updateProgress(total, total, '✅ 분석 완료');
  _stagedCheckupPhotos = [];
  _showCheckupAnalysisResults(results);
}

// 멀티 AI 교차검증 (기존 bungruki consensus 패턴 재사용)
async function _analyzeCheckupConsensus() {
  if (!_stagedCheckupPhotos.length) return;
  const opts = _brkVisionAiOptions().filter(a => a.available);
  if (opts.length < 2) { showToast('⚠️ 2개 이상 AI 키 필요'); return _analyzeCheckupPhotos(opts[0]?.id); }
  const aiIds = opts.map(a => a.id);
  const total = _stagedCheckupPhotos.length;
  _checkupAnalyzeAbort = false;
  _showAnalyzeProgress('멀티AI 교차검증', total, '#8b5cf6');

  const allResults = [];
  for (let i = 0; i < total; i++) {
    if (_checkupAnalyzeAbort) { allResults.push({ error: '사용자 중단' }); continue; }
    _updateProgress(i, total, '📷 사진 ' + (i + 1) + '/' + total + ' — ' + aiIds.join('+') + ' 동시 분석 중...');
    const detailEl = document.getElementById('brk-ap-detail');
    const p = _stagedCheckupPhotos[i];
    let results = await _runParallelAIs(aiIds, p, detailEl);
    // 실패 처리
    let failures = results.filter(r => r.error);
    while (failures.length > 0 && failures.length < results.length && !_checkupAnalyzeAbort) {
      const choice = await _askRetryOrSkip(i + 1, failures, results);
      if (choice === 'skip') break;
      if (choice === 'abort') { _checkupAnalyzeAbort = true; break; }
      const retryIds = failures.map(f => f.ai);
      const retryResults = await _runParallelAIs(retryIds, p, detailEl);
      retryResults.forEach(rr => { const idx = results.findIndex(r => r.ai === rr.ai); if (idx >= 0) results[idx] = rr; });
      failures = results.filter(r => r.error);
    }
    allResults.push(_mergeConsensus(results, p.dataUrl));
  }
  _updateProgress(total, total, '✅ 교차검증 완료');
  _stagedCheckupPhotos = [];
  _showCheckupAnalysisResults(allResults);
}

// 분석 결과 리뷰 → 표준화 → 저장
function _showCheckupAnalysisResults(allResults) {
  const who = DC().user || '오랑이';
  const resultsHtml = allResults.map((r, i) => {
    if (r.error) return `<div style="padding:6px;background:#fef2f2;border-radius:6px;margin-bottom:6px;font-size:.72rem">사진 ${i + 1}: ❌ ${esc(r.error)}</div>`;
    // 표준화: AI 정규화 결과 우선, 없으면 기존 사전 기반
    const normalized = (r._aiNormalized && r.results)
      ? normalizeFromAI(r.results, r.who || who)
      : normalizeCheckupResults(r.values || {}, r.ref || {}, r.who || who);
    const aiLabel = (r._usedAis || []).join('+');

    // 카테고리별 그룹
    const grouped = {};
    normalized.forEach(n => {
      const cat = n.category || 'other';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(n);
    });

    const catHtml = Object.entries(grouped).map(([cat, items]) => {
      const catDef = _CHECKUP_CATEGORIES[cat] || _CHECKUP_CATEGORIES.other;
      const itemsHtml = items.map(n => {
        const sc = _statusColor(n.status), si = _statusIconSmall(n.status);
        const matchBadge = n.stdCode
          ? `<span style="font-size:.45rem;color:#8b5cf6" title="표준코드: ${n.stdCode}">⚙</span>`
          : `<span style="font-size:.45rem;color:#f59e0b" title="미매칭">⚠</span>`;
        return `<span class="log-tag" style="background:${sc}15;color:${sc};font-size:.6rem;border:1px solid ${sc}30">
          ${matchBadge} ${esc(n.displayName)} ${esc(String(n.value))}${n.unit ? ' ' + esc(n.unit) : ''} ${si}
        </span>`;
      }).join('');
      return `<div style="margin-bottom:4px"><span style="font-size:.6rem;font-weight:600;color:var(--mu)">${catDef.icon} ${catDef.name}</span><div style="display:flex;flex-wrap:wrap;gap:2px;margin-top:2px">${itemsHtml}</div></div>`;
    }).join('');

    return `<div style="padding:8px;background:var(--sf2);border:1.5px solid var(--bd);border-radius:8px;margin-bottom:6px">
      <div style="display:flex;gap:6px;align-items:center;margin-bottom:4px">
        <img src="${r._imgSrc}" style="width:36px;height:36px;object-fit:cover;border-radius:4px">
        <div><div style="font-size:.72rem;font-weight:600">${esc(r.date || kstToday())} · ${esc(r.who || who)}</div>
          <div style="font-size:.58rem;color:var(--ac)">${esc(aiLabel)} 분석 · ${normalized.length}개 항목 (${normalized.filter(n => n.stdCode).length}개 표준매칭)</div>
        </div>
      </div>
      ${catHtml}
      ${r.opinion ? '<div style="font-size:.62rem;color:#15803d;margin-top:3px">💡 ' + esc(r.opinion) + '</div>' : ''}
      <div style="margin-top:4px;display:flex;gap:6px">
        <label style="font-size:.65rem;color:var(--mu)">기관명: <input type="text" data-ck-inst="${i}" value="" placeholder="예: 삼성서울병원" style="width:120px;font-size:.68rem;padding:2px 6px;border:1px solid var(--bd);border-radius:4px;font-family:var(--font)"></label>
      </div>
    </div>`;
  }).join('');

  const legend = `<div style="font-size:.58rem;color:var(--mu);padding:4px 6px;background:var(--sf2);border-radius:4px;margin-bottom:6px">
    <span style="color:#10b981">✓정상</span> <span style="color:#10b981">🛡면역</span> <span style="color:#dc2626">↑높음</span> <span style="color:#2563eb">↓낮음</span> · <span style="color:#8b5cf6">⚙표준매칭</span> <span style="color:#f59e0b">⚠미매칭</span></div>`;

  // AI 검증 가능한 AI 판별
  const verifyAiId = S.keys?.gemini ? 'gemini' : (S.keys?.claude ? 'claude' : (S.keys?.gpt ? 'gpt' : null));
  const _getNormalized = (r) => (r._aiNormalized && r.results) ? normalizeFromAI(r.results, r.who || who) : normalizeCheckupResults(r.values || {}, r.ref || {}, r.who || who);
  const hasUnmatched = allResults.some(r => !r.error && _getNormalized(r).some(n => !n.stdCode || n.suspicious));

  const buttons = [];
  if (hasUnmatched && verifyAiId) {
    buttons.push({
      label: '🤖 AI 검증 후 저장', primary: true,
      action: async () => {
        closeConfirmModal();
        const validResults = allResults.filter(r => !r.error);
        _showCkProgress('🤖 AI 검증 + 저장', '#8b5cf6');
        let saved = 0;
        for (let i = 0; i < validResults.length; i++) {
          if (_ckProgressAbort) break;
          const r = validResults[i];
          _updateCkProgress(i, validResults.length, (i + 1) + '/' + validResults.length + ' 검증 중...');
          const inst = document.querySelector(`input[data-ck-inst="${allResults.indexOf(r)}"]`)?.value || '';
          let normalized = (r._aiNormalized && r.results)
            ? normalizeFromAI(r.results, r.who || who)
            : normalizeWithCache(r.values || {}, r.ref || {}, r.who || who, inst);
          if (normalized.some(n => !n.stdCode)) {
            normalized = await aiVerifyNormalization(normalized, r.who || who, verifyAiId);
          }
          _cacheVerifiedMappings(normalized, inst);
          const checkup = {
            id: Date.now() + saved, date: r.date || kstToday(), who: r.who || who,
            institution: inst, type: r.type || 'general', sourceType: 'image',
            results: normalized, aiUsed: (r._usedAis || []).join('+') + '+verify:' + verifyAiId,
            memo: [...(r.abnormal || []).map(a => '⚠️ ' + a), r.opinion ? '💡 ' + r.opinion : ''].filter(Boolean).join('; '),
          };
          await saveHealthCheckup(checkup); saved++;
        }
        _updateCkProgress(validResults.length, validResults.length, '✅ 완료!');
        setTimeout(() => { _closeCkProgress(); if (saved) showToast('✅ ' + saved + '건 AI 검증 + 저장 완료'); renderView('meds'); }, 800);
      }
    });
  }
  buttons.push({
    label: hasUnmatched ? '💾 바로 저장 (검증 생략)' : '💾 표준화 저장', primary: !hasUnmatched,
    action: async () => {
        let saved = 0;
        for (let i = 0; i < allResults.length; i++) {
          const r = allResults[i];
          if (r.error) continue;
          const inst = document.querySelector(`input[data-ck-inst="${i}"]`)?.value || '';
          const normalized = _getNormalized(r);
          const checkup = {
            id: Date.now() + saved,
            date: r.date || kstToday(),
            who: r.who || who,
            institution: inst,
            type: r.type || 'general',
            sourceType: 'image',
            results: normalized,
            aiUsed: (r._usedAis || []).join('+'),
            memo: [
              ...(r.abnormal || []).map(a => '⚠️ ' + a),
              r.opinion ? '💡 ' + r.opinion : ''
            ].filter(Boolean).join('; '),
          };
          await saveHealthCheckup(checkup);
          saved++;
        }
        closeConfirmModal();
        if (saved) showToast('✅ ' + saved + '건 표준화 저장 완료');
        renderView('meds');
      }
  });
  buttons.push({ label: '취소', action: closeConfirmModal });

  showConfirmModal('📋 검진 결과 분석 완료', legend + resultsHtml, buttons);
}

// ═══════════════════════════════════════════════════════════════
// ARCHIVE UI RENDERING
// ═══════════════════════════════════════════════════════════════

var _checkupViewTab = 'timeline'; // timeline | trends | categories

function renderCheckupArchive() {
  const who = DC().user;
  const isHealth = S.currentDomain.endsWith('-health');
  if (!isHealth) return '';

  // 아카이브 UI: 직접 저장 + 붕룩이 연계 (건강관리 도메인: 임신특화 제외)
  const allCheckups = getAllHealthCheckups(who, true, { includePregnancy: false });
  const totalItems = allCheckups.reduce((s, c) => s + (c.results?.length || 0), 0);

  // 탭 바
  const tabs = [
    { id: 'timeline', label: '📅 타임라인', desc: '날짜순 검진 기록' },
    { id: 'trends', label: '📈 추세', desc: '항목별 시계열 차트' },
    { id: 'categories', label: '🏷 카테고리', desc: '검사 분류별 보기' },
  ];
  const tabBar = tabs.map(t => `<button onclick="_checkupViewTab='${t.id}';renderView('meds')"
    style="padding:5px 12px;font-size:.72rem;border:1.5px solid ${_checkupViewTab === t.id ? 'var(--ac)' : 'var(--bd)'};border-radius:6px;
    background:${_checkupViewTab === t.id ? 'var(--ac)' : 'var(--sf2)'};color:${_checkupViewTab === t.id ? '#fff' : 'var(--ink)'};
    cursor:pointer;font-family:var(--font);font-weight:${_checkupViewTab === t.id ? '600' : '400'}">${t.label}</button>`).join('');

  // 업로드 + 수동 입력 영역
  const uploadArea = `<div style="display:flex;gap:5px;margin:8px 0;flex-wrap:wrap">
    <div style="flex:1;min-width:70px;padding:10px;border:2px dashed var(--bd);border-radius:8px;text-align:center;cursor:pointer;background:var(--sf2)"
      onclick="document.getElementById('ck-file-input').click()">
      <span style="font-size:1.2rem">📤</span>
      <div style="font-size:.72rem;color:var(--mu);margin-top:4px">사진</div>
      <div style="font-size:.55rem;color:var(--mu2)">AI Vision</div>
      <input type="file" id="ck-file-input" multiple accept="image/*" onchange="stageCheckupPhotos(this)" style="display:none">
    </div>
    <div style="flex:1;min-width:70px;padding:10px;border:2px dashed var(--bd);border-radius:8px;text-align:center;cursor:pointer;background:var(--sf2)"
      onclick="document.getElementById('ck-doc-input').click()">
      <span style="font-size:1.2rem">📄</span>
      <div style="font-size:.72rem;color:var(--mu);margin-top:4px">문서</div>
      <div style="font-size:.55rem;color:var(--mu2)">PDF · 워드</div>
      <input type="file" id="ck-doc-input" accept=".pdf,.docx,.doc,.txt,.hwp" onchange="stageCheckupDocs(this)" style="display:none">
    </div>
    <div style="flex:1;min-width:70px;padding:10px;border:2px dashed var(--bd);border-radius:8px;text-align:center;cursor:pointer;background:var(--sf2)"
      onclick="importCheckupFromDrive()">
      <span style="font-size:1.2rem">☁️</span>
      <div style="font-size:.72rem;color:var(--mu);margin-top:4px">Drive</div>
      <div style="font-size:.55rem;color:var(--mu2)">구글 드라이브</div>
    </div>
    <div style="flex:1;min-width:70px;padding:10px;border:2px dashed var(--bd);border-radius:8px;text-align:center;cursor:pointer;background:var(--sf2)"
      onclick="openManualCheckupEntry()">
      <span style="font-size:1.2rem">📝</span>
      <div style="font-size:.72rem;color:var(--mu);margin-top:4px">수동</div>
    </div>
  </div>
  <div id="checkup-staged-area"></div>`;

  // 콘텐츠
  let content = '';
  if (_checkupViewTab === 'timeline') content = _renderCheckupTimeline(allCheckups);
  else if (_checkupViewTab === 'trends') content = _renderCheckupTrends(who, allCheckups);
  else if (_checkupViewTab === 'categories') content = _renderCheckupCategories(who, allCheckups);

  return `<div style="padding:12px;background:var(--sf2);border:1.5px solid var(--domain-color);border-radius:10px;margin-bottom:10px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <span style="font-size:1.1rem">📋</span>
      <span style="font-size:.88rem;font-weight:700;color:var(--domain-color)">검사 아카이브</span>
      <button onclick="aiCheckupInterpretation()" style="margin-left:auto;background:none;border:1px solid #10b981;border-radius:5px;padding:2px 8px;font-size:.6rem;color:#10b981;cursor:pointer;font-family:var(--font)">💡 AI 종합 해석</button>
      <button onclick="aiReclassifyAll()" style="background:none;border:1px solid #8b5cf6;border-radius:5px;padding:2px 8px;font-size:.6rem;color:#8b5cf6;cursor:pointer;font-family:var(--font)">🤖 재분류</button>
      <span style="font-size:.62rem;color:var(--mu)">${allCheckups.length}건 · ${totalItems}항목</span>
    </div>
    <div style="display:flex;gap:4px;margin-bottom:8px;flex-wrap:wrap">${tabBar}</div>
    ${uploadArea}
    ${content}
  </div>`;
}

// 타임라인 뷰
function _renderCheckupTimeline(checkups) {
  if (!checkups.length) return '<div style="font-size:.72rem;color:var(--mu);text-align:center;padding:20px">검진 기록이 없습니다. 위에서 사진을 업로드하세요.</div>';

  return checkups.map(c => {
    const results = c.results || [];
    const abnormal = results.filter(r => _isAbnormal(r.status));
    const normal = results.filter(r => r.status === 'normal' || r.status === 'positive');

    // 카테고리별 요약
    const cats = {};
    results.forEach(r => { const cat = r.category || 'other'; if (!cats[cat]) cats[cat] = []; cats[cat].push(r); });
    const catSummary = Object.entries(cats).map(([cat, items]) => {
      const catDef = _CHECKUP_CATEGORIES[cat] || _CHECKUP_CATEGORIES.other;
      return `<span style="font-size:.55rem;padding:1px 5px;border-radius:3px;background:var(--sf);color:var(--mu)">${catDef.icon} ${items.length}</span>`;
    }).join('');

    // suspicious 항목은 별도 경고
    const suspiciousItems = results.filter(r => r.suspicious);

    // 이상 항목 하이라이트 (suspicious 제외)
    const realAbnormal = abnormal.filter(r => !r.suspicious);
    const abnormalTags = realAbnormal.slice(0, 5).map(r => {
      const color = _statusColor(r.status);
      const arrow = r.status === 'high' ? '↑' : '↓';
      return `<span style="font-size:.58rem;padding:1px 5px;border-radius:3px;background:${color}15;color:${color};font-weight:600">${esc(r.displayName)} ${esc(String(r.value))} ${arrow}</span>`;
    }).join('');
    const moreCount = abnormal.length > 5 ? `<span style="font-size:.55rem;color:#dc2626">+${abnormal.length - 5}</span>` : '';

    const sourceTag = c._legacyLab ? `<span style="font-size:.5rem;padding:1px 4px;border-radius:3px;background:#ede9fe;color:#7c3aed">임신준비 연계</span>` : '';

    return `<div style="padding:8px 10px;background:var(--sf2);border:1.5px solid ${abnormal.length ? '#fca5a580' : 'var(--bd)'};border-radius:8px;margin-bottom:5px">
      <div style="display:flex;align-items:center;gap:6px">
        <span style="font-size:.78rem;font-weight:600">${esc(c.date || '')}</span>
        <span style="font-size:.6rem;color:var(--mu)">${esc(c.who || '')}</span>
        ${c.institution ? `<span style="font-size:.6rem;color:var(--ac)">${esc(c.institution)}</span>` : ''}
        ${sourceTag}
        <span style="font-size:.6rem;color:var(--mu);margin-left:auto">${results.length}항목</span>
        <button onclick="aiReclassifyCheckup('${c._source}',${c.id},${c._legacyLab||false})" style="background:none;border:1px solid #8b5cf6;border-radius:4px;padding:1px 6px;font-size:.55rem;color:#8b5cf6;cursor:pointer;font-family:var(--font)" title="AI 재분류">🤖</button>
        ${c._legacyLab ? '' : `<button onclick="editHealthCheckup(${c.id})" style="background:none;border:1px solid var(--ac);border-radius:4px;padding:1px 6px;font-size:.55rem;color:var(--ac);cursor:pointer;font-family:var(--font)" title="편집">✏️</button>`}
        ${c._legacyLab ? '' : `<button class="accum-del" onclick="if(confirm('삭제?'))deleteHealthCheckup(${c.id})" title="삭제">🗑</button>`}
      </div>
      <div style="display:flex;gap:3px;margin-top:4px;flex-wrap:wrap">${catSummary}</div>
      ${realAbnormal.length ? `<div style="margin-top:4px"><span style="font-size:.6rem;color:#dc2626;font-weight:600">⚠ 이상 ${realAbnormal.length}건:</span>
        <div style="display:flex;flex-wrap:wrap;gap:2px;margin-top:2px">${abnormalTags}${moreCount}</div></div>` : ''}
      ${suspiciousItems.length ? `<div style="margin-top:3px;font-size:.58rem;color:#f59e0b">⚠️ 의심 수치 ${suspiciousItems.length}건 (${suspiciousItems.map(r=>esc(r.displayName)).join(', ')}) — 원본 확인 필요</div>` : ''}
      ${!realAbnormal.length && !suspiciousItems.length && normal.length ? `<div style="font-size:.62rem;color:#10b981;margin-top:3px">✅ 전 항목 정상 범위</div>` : ''}
      <div style="font-size:.6rem;color:var(--ac);cursor:pointer;margin-top:4px" onclick="const d=this.nextElementSibling;d.style.display=d.style.display==='none'?'block':'none'">▸ 상세 보기 (${results.length}항목)</div>
      <div style="display:none;margin-top:4px">${_renderCheckupDetail(c)}</div>
    </div>`;
  }).join('');
}

// 상세 보기 (전 항목)
function _renderCheckupDetail(checkup) {
  const results = checkup.results || [];
  const cats = {};
  results.forEach(r => { const cat = r.category || 'other'; if (!cats[cat]) cats[cat] = []; cats[cat].push(r); });

  return Object.entries(cats).sort((a, b) => {
    const oa = (_CHECKUP_CATEGORIES[a[0]]?.order || 99);
    const ob = (_CHECKUP_CATEGORIES[b[0]]?.order || 99);
    return oa - ob;
  }).map(([cat, items]) => {
    const catDef = _CHECKUP_CATEGORIES[cat] || _CHECKUP_CATEGORIES.other;
    const rows = items.map(r => {
      const statusColor = _statusColor(r.status);
      const statusIcon = _statusIcon(r.status);
      const refStr = r.ref ? `${r.ref.low}-${r.ref.high}` : (r.rawRef || '-');
      // 추세 표시
      const who = checkup.who;
      const trend = r.stdCode ? getCheckupTrend(who, r.stdCode) : [];
      let trendIcon = '';
      if (trend.length >= 2) {
        const dir = _trendDirection(trend);
        trendIcon = dir === 'up' ? ' 📈' : dir === 'down' ? ' 📉' : ' ➡️';
      }
      return `<div style="display:flex;align-items:center;gap:4px;padding:2px 0;font-size:.68rem;border-bottom:1px solid var(--sf)">
        <span style="color:${statusColor};min-width:12px;font-size:.6rem">${statusIcon}</span>
        <span style="flex:1;color:var(--ink)">${esc(r.displayName)}${r.stdCode ? '' : ' <span style="color:#f59e0b;font-size:.5rem">미매칭</span>'}</span>
        <span style="font-weight:600;color:${statusColor};font-family:var(--mono);min-width:50px;text-align:right">${esc(String(r.value))}</span>
        <span style="color:var(--mu);min-width:40px;font-size:.6rem">${esc(r.unit || '')}</span>
        <span style="color:var(--mu2);font-size:.58rem;min-width:60px">${esc(refStr)}</span>
        <span style="font-size:.55rem">${trendIcon}</span>
      </div>`;
    }).join('');
    return `<div style="margin-bottom:6px">
      <div style="font-size:.68rem;font-weight:600;color:var(--mu);padding:3px 0;border-bottom:1.5px solid var(--bd)">${catDef.icon} ${catDef.name}</div>
      ${rows}
    </div>`;
  }).join('') + (checkup.memo ? `<div style="font-size:.62rem;color:var(--mu);margin-top:4px;padding:4px 6px;background:var(--sf);border-radius:4px">${esc(checkup.memo)}</div>` : '');
}

// 추세 뷰 — 항목별 시계열 미니 차트
function _renderCheckupTrends(who, checkups) {
  // 표준 코드별 데이터 수집
  const codeMap = {};
  checkups.forEach(c => {
    (c.results || []).forEach(r => {
      if (r.stdCode && typeof r.value === 'number') {
        if (!codeMap[r.stdCode]) codeMap[r.stdCode] = { def: _CHECKUP_STD_TESTS[r.stdCode], points: [] };
        codeMap[r.stdCode].points.push({ date: c.date, value: r.value, status: r.status });
      }
    });
  });

  // 2개 이상 데이터가 있는 항목만 추세 표시
  const trendItems = Object.entries(codeMap)
    .filter(([, d]) => d.points.length >= 2)
    .sort((a, b) => {
      const oa = _CHECKUP_CATEGORIES[a[1].def?.category]?.order || 99;
      const ob = _CHECKUP_CATEGORIES[b[1].def?.category]?.order || 99;
      return oa - ob;
    });

  if (!trendItems.length) {
    return '<div style="font-size:.72rem;color:var(--mu);text-align:center;padding:20px">2회 이상 기록된 항목이 있으면 추세 차트가 표시됩니다.</div>';
  }

  return trendItems.map(([code, data]) => {
    const def = data.def;
    const catDef = _CHECKUP_CATEGORIES[def?.category] || _CHECKUP_CATEGORIES.other;
    const points = data.points.sort((a, b) => a.date.localeCompare(b.date));
    const dir = _trendDirection(points);
    const dirIcon = dir === 'up' ? '📈' : dir === 'down' ? '📉' : '➡️';
    const last = points[points.length - 1];
    const lastColor = _statusColor(last.status);

    // 미니 바 차트 (최근 6개)
    const recent = points.slice(-6);
    const vals = recent.map(p => p.value);
    const minV = Math.min(...vals);
    const maxV = Math.max(...vals);
    const range = maxV - minV || 1;
    const ref = def ? (def.ref.male ? (who === '붕쌤' ? def.ref.male : def.ref.female) : def.ref) : null;

    const bars = recent.map(p => {
      const h = Math.max(6, Math.round(((p.value - minV) / range) * 36));
      const pColor = _statusColor(p.status);
      return `<div style="flex:1;text-align:center;min-width:20px">
        <div style="font-size:.45rem;color:${pColor};font-weight:600">${p.value}</div>
        <div style="height:${h}px;background:${pColor};border-radius:2px 2px 0 0;margin:0 2px"></div>
        <div style="font-size:.4rem;color:var(--mu)">${p.date.slice(5)}</div>
      </div>`;
    }).join('');

    // 참고범위 라인 표시
    const refLine = ref ? `<div style="font-size:.5rem;color:var(--mu2);margin-top:1px">참고: ${ref.low}-${ref.high} ${def?.unit || ''}</div>` : '';

    return `<div style="padding:6px 8px;background:var(--sf2);border:1px solid var(--bd);border-radius:6px;margin-bottom:4px">
      <div style="display:flex;align-items:center;gap:4px;margin-bottom:4px">
        <span style="font-size:.6rem">${catDef.icon}</span>
        <span style="font-size:.72rem;font-weight:600">${esc(def?.name?.ko || code)}</span>
        <span style="font-size:.6rem;color:var(--mu)">${esc(def?.name?.en || '')}</span>
        <span style="margin-left:auto;font-size:.65rem;font-weight:600;color:${lastColor}">${last.value} ${esc(def?.unit || '')} ${dirIcon}</span>
      </div>
      <div style="display:flex;align-items:flex-end;height:48px;gap:1px">${bars}</div>
      ${refLine}
    </div>`;
  }).join('');
}

// 카테고리별 최신 결과 뷰
function _renderCheckupCategories(who, checkups) {
  if (!checkups.length) return '<div style="font-size:.72rem;color:var(--mu);text-align:center;padding:20px">검진 기록이 없습니다.</div>';

  // 각 표준코드의 최신 값 수집
  const latestByCode = {};
  checkups.forEach(c => {
    (c.results || []).forEach(r => {
      if (r.stdCode && (!latestByCode[r.stdCode] || c.date > latestByCode[r.stdCode].date)) {
        latestByCode[r.stdCode] = { ...r, date: c.date, institution: c.institution };
      }
    });
  });

  // 카테고리별 그룹
  const grouped = {};
  Object.entries(latestByCode).forEach(([code, r]) => {
    const cat = r.category || 'other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push({ code, ...r });
  });

  return Object.entries(grouped)
    .sort((a, b) => (_CHECKUP_CATEGORIES[a[0]]?.order || 99) - (_CHECKUP_CATEGORIES[b[0]]?.order || 99))
    .map(([cat, items]) => {
      const catDef = _CHECKUP_CATEGORIES[cat] || _CHECKUP_CATEGORIES.other;
      const abnCount = items.filter(r => _isAbnormal(r.status)).length;
      const rows = items.map(r => {
        const statusColor = _statusColor(r.status);
        const trend = getCheckupTrend(who, r.code);
        const dir = _trendDirection(trend);
        const trendIcon = trend.length >= 2 ? (dir === 'up' ? '📈' : dir === 'down' ? '📉' : '➡️') : '';
        const refStr = r.ref ? `${r.ref.low}-${r.ref.high}` : '-';
        return `<div style="display:flex;align-items:center;gap:4px;padding:3px 0;font-size:.68rem;border-bottom:1px solid var(--sf)">
          <span style="flex:1">${esc(r.displayName)}</span>
          <span style="font-weight:600;color:${statusColor};font-family:var(--mono)">${esc(String(r.value))}</span>
          <span style="font-size:.58rem;color:var(--mu)">${esc(r.unit || '')}</span>
          <span style="font-size:.55rem;color:var(--mu2)">${esc(refStr)}</span>
          <span style="font-size:.55rem">${trendIcon}</span>
          <span style="font-size:.5rem;color:var(--mu2)">${esc(r.date?.slice(5) || '')}</span>
        </div>`;
      }).join('');

      return `<div style="padding:6px 8px;background:var(--sf2);border:1.5px solid ${abnCount ? '#fca5a580' : 'var(--bd)'};border-radius:8px;margin-bottom:5px">
        <div style="display:flex;align-items:center;gap:4px;margin-bottom:4px">
          <span>${catDef.icon}</span>
          <span style="font-size:.75rem;font-weight:600">${catDef.name}</span>
          <span style="font-size:.6rem;color:var(--mu);margin-left:auto">${items.length}항목</span>
          ${abnCount ? `<span style="font-size:.55rem;padding:1px 5px;border-radius:3px;background:#fee2e2;color:#dc2626">이상 ${abnCount}</span>` : ''}
        </div>
        ${rows}
      </div>`;
    }).join('');
}

// ═══════════════════════════════════════════════════════════════
// AI CONTEXT — 세션 시작 시 최근 검진 요약 자동 주입
// ═══════════════════════════════════════════════════════════════
function _getRecentCheckupContext() {
  const who = DC()?.user;
  if (!who) return '';
  const checkups = getAllHealthCheckups(who);
  if (!checkups.length) return '';

  // 최근 3건의 검진에서 이상 항목 + 주요 수치 추출
  const recent = checkups.slice(0, 3);
  const lines = [];
  recent.forEach(c => {
    const abnormal = (c.results || []).filter(r => _isAbnormal(r.status));
    if (!abnormal.length) return;
    const items = abnormal.map(r => {
      const arrow = r.status === 'high' ? '↑' : '↓';
      return `${r.displayName} ${r.value}${r.unit ? ' ' + r.unit : ''} ${arrow}${r.ref ? ' (참고: ' + r.ref.low + '-' + r.ref.high + ')' : ''}`;
    }).join(', ');
    lines.push(`${c.date}${c.institution ? ' ' + c.institution : ''}: ${items}`);
  });

  // 추세 경고: 악화 추세인 항목
  const codeMap = {};
  checkups.forEach(c => {
    (c.results || []).forEach(r => {
      if (r.stdCode && typeof r.value === 'number') {
        if (!codeMap[r.stdCode]) codeMap[r.stdCode] = [];
        codeMap[r.stdCode].push({ date: c.date, value: r.value, status: r.status });
      }
    });
  });
  const warnings = [];
  Object.entries(codeMap).forEach(([code, pts]) => {
    if (pts.length < 2) return;
    pts.sort((a, b) => a.date.localeCompare(b.date));
    const last = pts[pts.length - 1];
    const prev = pts[pts.length - 2];
    if (last.status !== 'normal' && prev.status === 'normal') {
      const def = _CHECKUP_STD_TESTS[code];
      warnings.push(`${def?.name?.ko || code}: ${prev.value}→${last.value} (정상→이상 전환)`);
    }
  });

  if (!lines.length && !warnings.length) return '';
  let ctx = '\n\n[최근 검진 이상 소견]';
  if (lines.length) ctx += '\n' + lines.join('\n');
  if (warnings.length) ctx += '\n⚠ 추세 경고: ' + warnings.join('; ');
  return ctx;
}

// ═══════════════════════════════════════════════════════════════
// MANUAL ENTRY — 수동 검진 결과 입력
// ═══════════════════════════════════════════════════════════════
function openManualCheckupEntry() {
  const who = DC().user || '오랑이';
  const today = kstToday();
  // 카테고리별 검사 항목 선택
  const catOptions = Object.entries(_CHECKUP_CATEGORIES)
    .filter(([k]) => k !== 'other')
    .map(([k, v]) => `<option value="${k}">${v.icon} ${v.name}</option>`).join('');

  showConfirmModal('📝 검진 결과 수동 입력',
    `<div style="font-size:.72rem">
      <div style="display:flex;gap:6px;margin-bottom:8px">
        <label style="flex:1">날짜<br><input type="date" id="ck-manual-date" value="${today}" class="dx-form-input" style="width:100%"></label>
        <label style="flex:1">기관명<br><input type="text" id="ck-manual-inst" placeholder="예: 삼성서울병원" class="dx-form-input" style="width:100%"></label>
      </div>
      <div style="margin-bottom:6px">
        <label>카테고리 <select id="ck-manual-cat" onchange="_updateManualTestList()" class="dx-form-input" style="width:100%">${catOptions}</select></label>
      </div>
      <div id="ck-manual-tests" style="max-height:250px;overflow-y:auto"></div>
    </div>`,
    [{ label: '💾 저장', primary: true, action: _saveManualCheckup }, { label: '취소', action: closeConfirmModal }]);
  setTimeout(_updateManualTestList, 50);
}

function _updateManualTestList() {
  const cat = document.getElementById('ck-manual-cat')?.value;
  const container = document.getElementById('ck-manual-tests');
  if (!cat || !container) return;
  const tests = Object.entries(_CHECKUP_STD_TESTS).filter(([, d]) => d.category === cat);
  container.innerHTML = tests.map(([code, def]) => {
    const ref = def.ref.male ? (DC().user === '붕쌤' ? def.ref.male : def.ref.female) : def.ref;
    const refStr = ref ? `${ref.low}-${ref.high}` : '';
    return `<div style="display:flex;align-items:center;gap:4px;padding:3px 0;border-bottom:1px solid var(--sf)">
      <span style="font-size:.68rem;flex:1">${esc(def.name.ko)} <span style="color:var(--mu);font-size:.58rem">${esc(def.name.en)}</span></span>
      <input type="text" data-ck-code="${code}" placeholder="${refStr}" style="width:70px;font-size:.72rem;padding:2px 6px;border:1px solid var(--bd);border-radius:4px;font-family:var(--mono);text-align:right">
      <span style="font-size:.58rem;color:var(--mu);min-width:40px">${esc(def.unit)}</span>
    </div>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════════════
// MIGRATION — 기존 붕룩이 labResults에 표준 참고치 일괄 적용
// ═══════════════════════════════════════════════════════════════
var _migrateRefBackup = null; // 마이그레이션 되돌리기용 스냅샷
async function migrateLabResultsStdRef() {
  const m = typeof getBrkMaster === 'function' ? getBrkMaster() : null;
  if (!m || !m.labResults?.length) { showToast('⚠️ 붕룩이 데이터 없음'); return; }
  // 자체 스냅샷 (master 단위 — _pushUndo는 logData 전용이라 사용 불가)
  _migrateRefBackup = JSON.parse(JSON.stringify(m.labResults.map(l => ({ id: l.id, ref: l.ref || {} }))));
  let totalAdded = 0, labsUpdated = 0;
  m.labResults.forEach(l => {
    if (!l.values || typeof l.values !== 'object') return;
    if (!l.ref) l.ref = {};
    let added = 0;
    Object.keys(l.values).forEach(rawKey => {
      if (l.ref[rawKey]) return; // 이미 참고치 있으면 건드리지 않음
      const parsed = _parseTestKey(rawKey);
      const stdCode = _matchStdTest(parsed.name);
      if (!stdCode) return;
      const def = _CHECKUP_STD_TESTS[stdCode];
      if (!def) return;
      const ref = def.ref.male ? (l.who === '붕쌤' ? def.ref.male : def.ref.female) : def.ref;
      if (ref) { l.ref[rawKey] = ref.low + '-' + ref.high; added++; }
    });
    if (added) { totalAdded += added; labsUpdated++; }
  });
  if (!totalAdded) { showToast('추가할 참고치 없음 (이미 완료됨)'); return; }
  await (typeof saveBrkMaster === 'function' ? saveBrkMaster() : saveMaster());
  showToast(`📏 ${labsUpdated}건 검사에 표준 참고치 ${totalAdded}개 추가 (검사실 기준과 다를 수 있음)`);
  renderView('meds');
}
async function undoMigrateRef() {
  if (!_migrateRefBackup) { showToast('되돌릴 데이터 없음'); return; }
  const m = typeof getBrkMaster === 'function' ? getBrkMaster() : null;
  if (!m) return;
  _migrateRefBackup.forEach(snap => {
    const l = m.labResults.find(x => x.id === snap.id);
    if (l) l.ref = snap.ref;
  });
  _migrateRefBackup = null;
  await (typeof saveBrkMaster === 'function' ? saveBrkMaster() : saveMaster());
  showToast('↩ 참고치 마이그레이션 되돌림');
  renderView('meds');
}

async function _saveManualCheckup() {
  const date = document.getElementById('ck-manual-date')?.value || kstToday();
  const inst = document.getElementById('ck-manual-inst')?.value || '';
  const who = DC().user || '오랑이';
  const inputs = document.querySelectorAll('#ck-manual-tests input[data-ck-code]');
  const results = [];
  inputs.forEach(inp => {
    const val = inp.value.trim();
    if (!val) return;
    const code = inp.dataset.ckCode;
    const def = _CHECKUP_STD_TESTS[code];
    if (!def) return;
    const numVal = parseFloat(val);
    const isNum = !isNaN(numVal);
    const ref = def.ref.male ? (who === '붕쌤' ? def.ref.male : def.ref.female) : def.ref;
    const status = isNum ? _judgeStatus(numVal, def.ref, who, code) : 'unknown';
    results.push({
      stdCode: code, rawName: def.name.ko, displayName: def.name.ko,
      value: isNum ? numVal : val, unit: def.unit,
      rawValue: val, rawUnit: def.unit,
      ref: ref, rawRef: ref ? `${ref.low}-${ref.high}` : null,
      status, category: def.category,
      related: def.related, pregnancyRelevant: def.pregnancyRelevant,
    });
  });
  if (!results.length) { showToast('⚠️ 값을 입력하세요'); return; }
  const checkup = {
    id: Date.now(), date, who, institution: inst,
    type: 'manual', sourceType: 'manual',
    results, aiUsed: '', memo: '',
  };
  await saveHealthCheckup(checkup);
  closeConfirmModal();
  renderView('meds');
}
