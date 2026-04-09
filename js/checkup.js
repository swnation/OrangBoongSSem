// js/checkup.js — 건강 검진 표준화 아카이브 (Phase 7 모듈화)

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

  // ── 감염 ──
  HBSAG:{ name:{ko:'B형간염표면항원',en:'HBsAg'}, unit:'qualitative', category:'infection', ref:{low:0,high:0},
    aliases:['hbsag','b형간염표면항원','hepatitis b surface antigen','b형간염 표면항원','hbs ag'], related:['HBSAB'], pregnancyRelevant:true },
  HBSAB:{ name:{ko:'B형간염표면항체',en:'HBsAb'}, unit:'mIU/mL', category:'infection', ref:{low:10,high:999},
    aliases:['hbsab','b형간염표면항체','hepatitis b surface antibody','b형간염 표면항체','hbs ab','anti-hbs'], related:['HBSAG'], pregnancyRelevant:true },
  HCVAB:{ name:{ko:'C형간염항체',en:'HCV Ab'}, unit:'qualitative', category:'infection', ref:{low:0,high:0},
    aliases:['hcv ab','hcvab','c형간염항체','hepatitis c antibody','c형간염 항체','anti-hcv'], related:[], pregnancyRelevant:true },
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
function _matchStdTest(rawName) {
  if (!rawName) return null;
  const lower = rawName.toLowerCase().trim();
  // 1) 코드 직접 매칭
  for (const code of Object.keys(_CHECKUP_STD_TESTS)) {
    if (lower === code.toLowerCase()) return code;
  }
  // 2) 별칭 정확 매칭
  for (const [code, def] of Object.entries(_CHECKUP_STD_TESTS)) {
    if (def.aliases.some(a => a.toLowerCase() === lower)) return code;
  }
  // 3) 별칭 포함 매칭 (alias가 rawName에 포함되거나, rawName이 alias에 포함)
  let bestMatch = null, bestLen = 0;
  for (const [code, def] of Object.entries(_CHECKUP_STD_TESTS)) {
    for (const alias of def.aliases) {
      const al = alias.toLowerCase();
      if (lower.includes(al) && al.length > bestLen) {
        bestMatch = code; bestLen = al.length;
      } else if (al.includes(lower) && lower.length >= 2 && lower.length > bestLen) {
        bestMatch = code; bestLen = lower.length;
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
function _judgeStatus(value, ref, who) {
  if (value === null || value === undefined || ref === null) return 'unknown';
  const r = (ref.male && ref.female)
    ? (who === '붕쌤' ? ref.male : ref.female)
    : ref;
  if (!r || r.low === undefined) return 'unknown';
  const v = parseFloat(value);
  if (isNaN(v)) return 'unknown';
  if (v < r.low) return 'low';
  if (r.high < 999 && v > r.high) return 'high';
  return 'normal';
}

// AI 파싱 결과를 표준화: {values:{},ref:{}} → [{stdCode, rawName, value, unit, ...}]
function normalizeCheckupResults(aiValues, aiRefs, who) {
  if (!aiValues || typeof aiValues !== 'object') return [];
  const results = [];
  for (const [rawKey, rawVal] of Object.entries(aiValues)) {
    if (rawKey === 'text') continue; // 텍스트 메모 스킵
    const parsed = _parseTestKey(rawKey);
    const stdCode = _matchStdTest(parsed.name);
    const def = stdCode ? _CHECKUP_STD_TESTS[stdCode] : null;
    const numVal = parseFloat(rawVal);
    const isNum = !isNaN(numVal);

    // 단위 변환
    const converted = (stdCode && isNum && parsed.unit)
      ? _convertToStdUnit(stdCode, numVal, parsed.unit)
      : { value: isNum ? numVal : rawVal, unit: parsed.unit || (def ? def.unit : '') };

    // 참고치
    const rawRefStr = aiRefs ? aiRefs[rawKey] : null;
    const parsedRef = _parseRefRange(rawRefStr);
    const stdRef = def ? (def.ref.male ? (who === '붕쌤' ? def.ref.male : def.ref.female) : def.ref) : null;
    const finalRef = parsedRef || stdRef;

    // 상태 판정
    const status = isNum ? _judgeStatus(converted.value, finalRef || (def ? def.ref : null), who) : 'unknown';

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
    });
  }
  // 카테고리 순 정렬
  const catOrder = Object.fromEntries(Object.entries(_CHECKUP_CATEGORIES).map(([k, v]) => [k, v.order]));
  results.sort((a, b) => (catOrder[a.category] || 99) - (catOrder[b.category] || 99));
  return results;
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

// 특정 유저의 모든 건강검진 데이터 (건강관리 도메인 + 붕룩이 labResults 변환)
function getAllHealthCheckups(who) {
  const results = [];
  // 1) 건강관리 도메인의 healthCheckups
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
  // 2) 붕룩이 labResults → 표준화 변환
  const brkDs = S.domainState['bungruki'];
  if (brkDs?.master?.labResults) {
    brkDs.master.labResults.forEach(l => {
      if (who && l.who !== who) return;
      // labResults → healthCheckup 형식으로 변환
      const normalized = normalizeCheckupResults(l.values || {}, l.ref || {}, l.who);
      if (normalized.length) {
        results.push({
          id: l.id, date: l.date, who: l.who,
          institution: '붕룩이 기록', type: l.type,
          results: normalized, memo: l.memo || '',
          _source: 'bungruki', _sourceLabel: '임신 준비',
          _legacyLab: true,
        });
      }
    });
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
  m.healthCheckups.push(checkupData);
  await saveMaster();
  showToast('✅ 검진 결과 저장됨');
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
// AI VISION ANALYSIS (검진 결과 사진/PDF → 표준화)
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
    // 표준화
    const normalized = normalizeCheckupResults(r.values || {}, r.ref || {}, r.who || who);
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
        const statusColor = n.status === 'high' ? '#dc2626' : n.status === 'low' ? '#2563eb' : n.status === 'normal' ? '#10b981' : 'var(--mu)';
        const statusIcon = n.status === 'high' ? '↑' : n.status === 'low' ? '↓' : n.status === 'normal' ? '✓' : '?';
        const matchBadge = n.stdCode
          ? `<span style="font-size:.45rem;color:#8b5cf6" title="표준코드: ${n.stdCode}">⚙</span>`
          : `<span style="font-size:.45rem;color:#f59e0b" title="미매칭">⚠</span>`;
        return `<span class="log-tag" style="background:${statusColor}15;color:${statusColor};font-size:.6rem;border:1px solid ${statusColor}30">
          ${matchBadge} ${esc(n.displayName)} ${esc(String(n.value))}${n.unit ? ' ' + esc(n.unit) : ''} ${statusIcon}
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
    <span style="color:#10b981">✓정상</span> <span style="color:#dc2626">↑높음</span> <span style="color:#2563eb">↓낮음</span> · <span style="color:#8b5cf6">⚙표준매칭</span> <span style="color:#f59e0b">⚠미매칭</span></div>`;

  showConfirmModal('📋 검진 결과 분석 완료', legend + resultsHtml,
    [{
      label: '💾 표준화 저장', primary: true,
      action: async () => {
        let saved = 0;
        for (let i = 0; i < allResults.length; i++) {
          const r = allResults[i];
          if (r.error) continue;
          const inst = document.querySelector(`input[data-ck-inst="${i}"]`)?.value || '';
          const normalized = normalizeCheckupResults(r.values || {}, r.ref || {}, r.who || who);
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
    }, { label: '취소', action: closeConfirmModal }]);
}

// ═══════════════════════════════════════════════════════════════
// ARCHIVE UI RENDERING
// ═══════════════════════════════════════════════════════════════

var _checkupViewTab = 'timeline'; // timeline | trends | categories

function renderCheckupArchive() {
  const who = DC().user;
  const isHealth = S.currentDomain.endsWith('-health');
  if (!isHealth) return '';

  const allCheckups = getAllHealthCheckups(who);
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
  const uploadArea = `<div style="display:flex;gap:6px;margin:8px 0">
    <div style="flex:1;padding:10px;border:2px dashed var(--bd);border-radius:8px;text-align:center;cursor:pointer;background:var(--sf2)"
      onclick="document.getElementById('ck-file-input').click()">
      <span style="font-size:1.2rem">📤</span>
      <div style="font-size:.72rem;color:var(--mu);margin-top:4px">사진 업로드</div>
      <div style="font-size:.55rem;color:var(--mu2)">AI Vision 자동 추출</div>
      <input type="file" id="ck-file-input" multiple accept="image/*" onchange="stageCheckupPhotos(this)" style="display:none">
    </div>
    <div style="width:80px;padding:10px;border:2px dashed var(--bd);border-radius:8px;text-align:center;cursor:pointer;background:var(--sf2)"
      onclick="openManualCheckupEntry()">
      <span style="font-size:1.2rem">📝</span>
      <div style="font-size:.72rem;color:var(--mu);margin-top:4px">수동 입력</div>
    </div>
  </div>
  <div id="checkup-staged-area"></div>`;

  // 콘텐츠
  let content = '';
  if (_checkupViewTab === 'timeline') content = _renderCheckupTimeline(allCheckups);
  else if (_checkupViewTab === 'trends') content = _renderCheckupTrends(who, allCheckups);
  else if (_checkupViewTab === 'categories') content = _renderCheckupCategories(who, allCheckups);

  return `<div class="section-card" style="border-color:var(--domain-color)">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <span style="font-size:1.1rem">📋</span>
      <span style="font-size:.88rem;font-weight:700;color:var(--domain-color)">검사 아카이브</span>
      <span style="font-size:.62rem;color:var(--mu);margin-left:auto">${allCheckups.length}건 · ${totalItems}항목</span>
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
    const abnormal = results.filter(r => r.status === 'high' || r.status === 'low');
    const normal = results.filter(r => r.status === 'normal');

    // 카테고리별 요약
    const cats = {};
    results.forEach(r => { const cat = r.category || 'other'; if (!cats[cat]) cats[cat] = []; cats[cat].push(r); });
    const catSummary = Object.entries(cats).map(([cat, items]) => {
      const catDef = _CHECKUP_CATEGORIES[cat] || _CHECKUP_CATEGORIES.other;
      return `<span style="font-size:.55rem;padding:1px 5px;border-radius:3px;background:var(--sf);color:var(--mu)">${catDef.icon} ${items.length}</span>`;
    }).join('');

    // 이상 항목 하이라이트
    const abnormalTags = abnormal.slice(0, 5).map(r => {
      const color = r.status === 'high' ? '#dc2626' : '#2563eb';
      const arrow = r.status === 'high' ? '↑' : '↓';
      return `<span style="font-size:.58rem;padding:1px 5px;border-radius:3px;background:${color}15;color:${color};font-weight:600">${esc(r.displayName)} ${esc(String(r.value))} ${arrow}</span>`;
    }).join('');
    const moreCount = abnormal.length > 5 ? `<span style="font-size:.55rem;color:#dc2626">+${abnormal.length - 5}</span>` : '';

    const sourceTag = c._legacyLab ? `<span style="font-size:.5rem;padding:1px 4px;border-radius:3px;background:#ede9fe;color:#7c3aed">붕룩이</span>` : '';

    return `<div style="padding:8px 10px;background:var(--sf2);border:1.5px solid ${abnormal.length ? '#fca5a580' : 'var(--bd)'};border-radius:8px;margin-bottom:5px">
      <div style="display:flex;align-items:center;gap:6px">
        <span style="font-size:.78rem;font-weight:600">${esc(c.date || '')}</span>
        ${c.institution ? `<span style="font-size:.6rem;color:var(--ac)">${esc(c.institution)}</span>` : ''}
        ${sourceTag}
        <span style="font-size:.6rem;color:var(--mu);margin-left:auto">${results.length}항목</span>
        ${c._legacyLab ? '' : `<button class="accum-del" onclick="if(confirm('삭제?'))deleteHealthCheckup(${c.id})" title="삭제">🗑</button>`}
      </div>
      <div style="display:flex;gap:3px;margin-top:4px;flex-wrap:wrap">${catSummary}</div>
      ${abnormal.length ? `<div style="margin-top:4px"><span style="font-size:.6rem;color:#dc2626;font-weight:600">⚠ 이상 ${abnormal.length}건:</span>
        <div style="display:flex;flex-wrap:wrap;gap:2px;margin-top:2px">${abnormalTags}${moreCount}</div></div>` : ''}
      ${!abnormal.length && normal.length ? `<div style="font-size:.62rem;color:#10b981;margin-top:3px">✅ 전 항목 정상 범위</div>` : ''}
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
      const statusColor = r.status === 'high' ? '#dc2626' : r.status === 'low' ? '#2563eb' : r.status === 'normal' ? '#10b981' : 'var(--mu)';
      const statusIcon = r.status === 'high' ? '▲' : r.status === 'low' ? '▼' : r.status === 'normal' ? '●' : '○';
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
    const lastColor = last.status === 'high' ? '#dc2626' : last.status === 'low' ? '#2563eb' : '#10b981';

    // 미니 바 차트 (최근 6개)
    const recent = points.slice(-6);
    const vals = recent.map(p => p.value);
    const minV = Math.min(...vals);
    const maxV = Math.max(...vals);
    const range = maxV - minV || 1;
    const ref = def ? (def.ref.male ? (who === '붕쌤' ? def.ref.male : def.ref.female) : def.ref) : null;

    const bars = recent.map(p => {
      const h = Math.max(6, Math.round(((p.value - minV) / range) * 36));
      const pColor = p.status === 'high' ? '#dc2626' : p.status === 'low' ? '#2563eb' : '#10b981';
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
      const abnCount = items.filter(r => r.status === 'high' || r.status === 'low').length;
      const rows = items.map(r => {
        const statusColor = r.status === 'high' ? '#dc2626' : r.status === 'low' ? '#2563eb' : r.status === 'normal' ? '#10b981' : 'var(--mu)';
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
    const abnormal = (c.results || []).filter(r => r.status === 'high' || r.status === 'low');
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
async function migrateLabResultsStdRef() {
  const m = typeof getBrkMaster === 'function' ? getBrkMaster() : null;
  if (!m || !m.labResults?.length) { showToast('⚠️ 붕룩이 데이터 없음'); return; }
  // _pushUndo (되돌리기용 스냅샷)
  if (typeof _pushUndo === 'function') _pushUndo();
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
    const status = isNum ? _judgeStatus(numVal, def.ref, who) : 'unknown';
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
