// js/constants.js — 상수 정의 (Phase 1 모듈화)

const APP_VERSION = [
  {v:'v9.5', date:'2026-04-05', note:'코드모듈화(15파일) · 편두통일기예보 · 약물효과리포트 · 로그프리셋 · 자동로그인 · 로그자동저장 · SW업데이트알림 · 매일복용약체크 · 오랑이dailyChecks · Gemini리뷰반영'},
  {v:'v9.4', date:'2026-04-05', note:'ntfy액션버튼 · 경과URL안정화 · 기억안남버튼 · 클라우드outcome동기화 · Gemini리뷰6회반영 · 붕룩이헬퍼리팩토링'},
  {v:'v9.3', date:'2026-04-03', note:'기본모드(GPT+Perp→Claude) · 약물안전3중검증(FDA/PLLR/식약처) · 투약변경이력 · 도메인별비용 · Gemini리뷰반영'},
  {v:'v9.2', date:'2026-04-02', note:'처치효과회고 · 트리거칩 · 날씨자동수집 · 통계차트강화 · 경량모드 · ntfy경과알림 · 붕룩이대시보드'},
  {v:'v9.0', date:'2026-03-29', note:'20개 신기능 · 약물상호작용 · Undo/Redo · AI평가 · AI선택 · 타임라인 · 암호화 · 충돌해결 · PWA설치 · 오프라인편집 · 통계강화 · 주간요약 · 템플릿추천 · 세션공유 · 키갱신알림 · 첨부UX · 버그수정'},
  {v:'v8.5', date:'2026-03-29', note:'두통 빠른 기록 (quick.html) · 인증 없는 독립 기록 · 메인 앱 연동/검토/반영'},
].slice(0,5);

// Auto-render changelog + update sidebar version
(function(){
  const box=document.getElementById('changelog-box');
  if(box) {
    box.innerHTML=`<div style="font-size:.72rem;font-weight:700;color:var(--mu);letter-spacing:.08em;margin-bottom:8px">CHANGELOG</div>
      <div style="font-size:.68rem;color:var(--mu2);line-height:1.8;font-family:var(--mono)">${
        APP_VERSION.map((v,i)=>`<div${i===0?' style="color:var(--ink);font-weight:500"':''}>
          <span style="color:var(--ac);font-weight:600">${v.v}</span>
          <span style="color:var(--mu)">${v.date}</span> ${v.note}</div>`).join('')
      }</div>`;
  }
  // Update sidebar version text
  const sub=document.querySelector('.logo-sub');
  if(sub&&APP_VERSION[0]) sub.textContent=`MULTI-DOMAIN ${APP_VERSION[0].v}`;
})();

// ═══════════════════════════════════════════════════════════════
// DOMAIN DEFINITIONS
// ═══════════════════════════════════════════════════════════════
const DOMAINS = {
  'orangi-migraine': {
    user:'오랑이', label:'편두통', icon:'🧠', color:'#c96442',
    folder:'Orangi Migraine', masterFile:'orangi_master.json',
    logPrefix:'orangi_log',
    defaultContext: `[오랑이 rCM 협진 — SSOT 컨텍스트 / 기준: 2026-03-28]

■ 환자 기본
- 김나연(오랑이), 여성 28세(1997년생), 체중 39~42kg
- 주진단: 난치성 만성 편두통(rCM)
- 동반: MDD, OCD, 불안장애, vasovagal syncope 병력
- 특이: 저혈압 경향, 약물 민감도 높음, 유당불내증, 후두신경 감압술(효과 없음)

■ 핵심 기전 (작업 가설)
- Central Sensitization 경향 강함
- TCC 패턴(C2-3→V1 전이) 임상적 의심
- GI stasis/흡수 지연 축이 flare와 반복 연관
- 자율신경 불안정성이 headache wave와 얽힘
- Phonophobia: 저주파 진동음에 극도로 취약
- 공복/저섭취/피로/수면분절이 파동 증폭

■ 치료 반응
유의: GON block 1~3차(clear responder), Metoclopramide(GI/흡수축), 수면, Propranolol 10mg(도움 신호)
실패/배제: Triptan, CGRP mAb, Botox, Atogepant(변비), 후두신경 감압술, SPG MAD

■ SSOT 원칙
- 팩트/해석/전략 분리, 확정/추정/가설 구분
- MOH: high-risk state, 확진 단정 금지
- Venlafaxine: 단독 인과 확정 금지

■ 금지 표현
- GON wear-off 확정 / MOH 확진 / Drug Holiday 유일한 방법 / Consensus 99%`,
    aiRoles: {gpt:'SSOT 기준축',claude:'구조·메타',gemini:'액션 플랜',perp:'데이터 계수'},
    templates:[
      'GON4 타이밍 — 현재 NRS 패턴 기준으로 적절한 시술 시점인가?',
      'MOH 위험도 — 이번 달 acute-med day 집계 및 high-risk 여부',
      '이번 주 패턴 분석 — 증상 변화 추세와 트리거 연관성',
      '약 반응 평가 — AAP 효과 및 투약 기준선 재검토',
      '자율신경 증상 평가 — ANS/GI 동반 여부 및 의미',
    ],
    logConfig: {
      sites: {left:['미간','이마','눈썹부위','관자놀이','후두부'], right:['미간','이마','눈썹부위','관자놀이','후두부']},
      painTypes: ['욱신거림','쥐어짜는','찌르는','묵직한','쑤시는','타는 듯한','전기 오는 듯한'],
      triggers: ['수면부족','과수면','수면분절','공복','불규칙식사','카페인','알코올','스트레스','피로','강한빛','소음','냄새','운동후','긴장/자세','생리전후','날씨변화'],
      symptoms: ['구역','어지러움','손발저림','빛과민','소리과민','식은땀','심계항진','실신전조'],
      meds: ['AAP 500mg','Loxoprofen','타 NSAID','Metoclopramide'],
      treatments: ['GON block','LON block','SPG block'],
      nrsLabel: '통증 강도 (NRS)',
    },
  },
  'orangi-mental': {
    user:'오랑이', label:'마음 관리', icon:'💜', color:'#8b5cf6',
    folder:'Orangi Mental', masterFile:'orangi_mental_master.json',
    logPrefix:'orangi_mental_log',
    defaultContext: `[오랑이 마음 관리 — 정신과 약물·증상 SSOT / 기준: 2026-03-28]

■ 환자 기본
- 김나연(오랑이), 여성 28세
- 진단: MDD(주요우울장애), OCD(강박장애), 불안장애
- 동반: rCM(난치성 만성 편두통), vasovagal syncope
- 특이: 약물 민감도 매우 높음, 저체중(39~42kg), 저혈압

■ 현재 약물 상태 (정신과)
- Venlafaxine: ⚠️ 자의 중단 (자율신경 폭주 부작용 발생)
- Bupropion: ⚠️ 자의 중단 (자율신경 폭주 부작용 발생)
- 중단 후 1개월+ 경과, 정신과 증상 거의 없음
- 주치의 판단 아닌 보호자(붕쌤) 판단으로 중단 — 추적 필요

■ 중단 후 모니터링 항목
- Withdrawal 증상 (brain zaps, 어지러움, 감정 불안정)
- OCD/불안/우울 재발 징후
- 편두통 패턴 변화 (Venlafaxine 예방 효과 소실 가능)

■ 핵심 추적 항목
- 기분·에너지 일별 패턴 (0-10 스케일)
- 수면의 질·시간 (분절, 입면 지연, 조기 각성)
- 강박사고 빈도·강도
- 불안 에피소드 (트리거, 지속시간, 강도)
- 식사 패턴 (편두통과 연관: 공복이 트리거)
- 약물 부작용 모니터링

■ SSOT 원칙
- 약물 변경은 주치의 판단 최우선
- 편두통 약물과 상호작용 항상 고려
- 감정 기록 시 판단 없이 사실만
- 자해/자살 사고 → 즉시 전문가 연결`,
    aiRoles: {gpt:'약물·증상 분석',claude:'구조·메타',gemini:'행동 패턴·액션',perp:'근거 검색'},
    templates: [
      '이번 주 기분/에너지 패턴 — 추세 분석',
      '수면의 질 리뷰 — 편두통 연관성 포함',
      '약물 부작용 체크 — 현재 복용약 전체',
      '불안 트리거 패턴 — 최근 에피소드 분석',
      '강박사고 빈도 리뷰 — 악화/완화 요인',
    ],
    logConfig: {
      sites: null,
      moodMode: true,
      dailyChecks: ['수면', '에너지', '식욕', '불안', '강박'],
      symptoms: ['불안','우울감','무기력','과민','강박사고','공황','불면','과수면','식욕변화','집중력저하'],
      meds: ['Venlafaxine','Bupropion','Escitalopram','Hydroxyzine','기타'],
      treatments: null,
      nrsLabel: '기분',
    },
  },
  'orangi-health': {
    user:'오랑이', label:'건강관리', icon:'💚', color:'#10b981',
    folder:'Orangi Health', masterFile:'orangi_health_master.json',
    logPrefix:'orangi_health_log',
    defaultContext: `[오랑이 건강관리 — 일반 건강 SSOT / 기준: 2026-03-28]

■ 환자 기본
- 김나연(오랑이), 여성 28세, 체중 39~42kg
- 기저: 저혈압, 유당불내증, 저체중, vasovagal syncope
- 동반 질환: rCM, MDD, OCD, 불안장애

■ 핵심 관리 항목
- 영양: 칼로리 섭취, 단백질, 철분, 비타민D, B12
- 체중: 39~42kg 범위 유지/증가 목표
- 운동: 저강도 유산소 (현기증 주의), 근력 운동
- 수면: 7~8시간 목표, 분절 수면 모니터링
- GI: 흡수 장애 가능성, 유당불내증 관리

■ 급성 질환 발생 시
- 모든 투약 전 편두통·정신과 약물 상호작용 확인 필수
- 해열/진통: AAP 우선 (편두통 급성기와 겹치지 않도록)
- 항생제: 유산균 병용, GI 부작용 주의

■ SSOT 원칙
- 타 도메인(편두통/마음관리) 약물과 상호작용 항상 고려
- 영양·운동 데이터는 편두통 트리거와 교차 분석`,
    aiRoles: {gpt:'영양·대사 분석',claude:'구조·메타·상호작용',gemini:'운동·수면 플랜',perp:'근거 검색'},
    templates: [
      '영양 상태 점검 — 칼로리/단백질/미량원소',
      '운동 계획 리뷰 — 저혈압·편두통 고려',
      '수면 패턴 분석 — 분절/총시간/질',
      '급성 질환 약물 상호작용 체크',
      'GI 증상 리뷰 — 흡수 장애 가능성',
    ],
    logConfig: {
      sites: null,
      customFields: true,
      journalCategories: ['컨디션','식사','운동','수면','검사결과','급성질환','투약','기타'],
      symptoms: [],
      meds: [],
      treatments: [],
      nrsLabel: '컨디션 (0=최악 10=최상)',
    },
  },
  'bung-mental': {
    user:'붕쌤', label:'마음 관리', icon:'🩵', color:'#06b6d4',
    folder:'Bung Mental', masterFile:'bung_mental_master.json',
    logPrefix:'bung_mental_log',
    defaultContext: `[붕쌤 마음 관리 — 정신과 SSOT / 기준: 2026-03-28]

■ 기본
- 유성우(붕쌤), 남성, 1차 진료 일반의 (고회전 외래)
- 진단: MDD(2022 발병, 현재 관해~부분관해), Bipolar spectrum 고려
- 기분 배경: 의대 시절부터 기분부전 양상 가능

■ 현재 핵심 문제
- MDD 관해 후 잔존 인지/집행기능 문제
- Speech-output drag (생각→말 변환 병목) — ATX 감량으로 크게 호전
- Working-memory lapse (고부하 진료 시)
- 수면: delayed sleep-wake phase, 25~26시간 생체시계형

■ 현재 투약
- Desvenlafaxine 50mg qAM (항우울 유지)
- Bupropion XR 150mg qAM (MDD 관해 유지, CYP2D6 억제)
- Lithium 300mg qAM (기분 안정화)
- Atomoxetine 18mg (58→40→18 감량 — speech drag/GU 부작용으로)
- Concerta 18mg PRN (언어출력 명료화, 손떨림 감소)

■ 약물 반응 요약
- ATX 감량(58→18): 말-생각 일치 크게 호전, GU 호전
- Concerta: 발화 명료도↑, 손떨림↓, 커피 병용 시 미세 tremor
- Desvenlafaxine: 1-2일 미복용 시 brain zaps

■ SSOT 원칙
- 인지/발화 기능이 기분 점수보다 중요한 추적 축
- 케어기버 번아웃 동시 모니터링
- 약물 변경은 주치의 판단 우선`,
    aiRoles: {gpt:'패턴·스트레스 분석',claude:'구조·메타',gemini:'행동 플랜',perp:'근거 검색'},
    templates: [
      '이번 주 스트레스/번아웃 리뷰',
      '수면·운동 밸런스 체크',
      '케어기버 부담감 점검 — compassion fatigue',
      '자기 시간 확보 계획',
    ],
    logConfig: {
      sites: null,
      moodMode: true,
      dailyChecks: ['수면', '집중력', '발화', '기억력', '에너지', '식욕'],
      symptoms: ['불안','우울감','번아웃','불면','무기력','과민','집중력저하','공황','식욕변화'],
      meds: ['Desvenlafaxine','Bupropion','Lithium','Atomoxetine','Concerta','기타'],
      treatments: null,
      nrsLabel: '기분',
    },
  },
  'bung-health': {
    user:'붕쌤', label:'건강관리', icon:'💪', color:'#f59e0b',
    folder:'Bung Health', masterFile:'bung_health_master.json',
    logPrefix:'bung_health_log',
    defaultContext: `[붕쌤 건강관리 — 일반 건강 SSOT / 기준: 2026-03-28]

■ 기본
- 유성우(붕쌤), 남성, 1차 진료 일반의
- Shift 근무자 (09-24, 14-24, 19-24 패턴)

■ 만성 질환
- 중등도 지방간 (2025-11 초음파)
- 이상지질혈증 (추적 중)
- 통풍 — Febuxostat 40mg 주 2-3회 간헐 복용
- 수면: delayed sleep-wake phase

■ 급성/반복 질환
- 부비동염 반복 악화 (Augmentin→Cravit 전환 이력)

■ 검사 이력
- 2025-11: 복부초음파(중등도 지방간), 전립선초음파(정상), CBC/LFT/TFT/Cr(정상)
- 2026-03-09: 정액검사 완료

■ SSOT 원칙
- 정신과 약물과 상호작용 항상 고려
- 급성 질환(부비동염 등) → 항생제 → 인지 영향 교차 체크
- Shift 근무 패턴이 건강 지표에 미치는 영향 추적`,
    aiRoles: {gpt:'영양·운동 분석',claude:'구조·메타',gemini:'액션 플랜',perp:'근거 검색'},
    templates: [
      '운동 루틴 리뷰 — 주간 요약',
      '식단 분석 — 영양 밸런스',
      '건강검진 결과 해석 — 추세 비교',
      '급성 질환 약물 상호작용 체크',
    ],
    logConfig: {
      sites: null,
      customFields: true,
      journalCategories: ['컨디션','운동','식단','수면','검사결과','급성질환','투약','통풍','기타'],
      symptoms: [],
      meds: [],
      treatments: [],
      nrsLabel: '컨디션 (0=최악 10=최상)',
    },
  },
  'bungruki': {
    user:'붕룩이', label:'임신 준비', icon:'🍼', color:'#ec4899',
    folder:'Bungruki Pregnancy', masterFile:'bungruki_master.json',
    logPrefix:'bungruki_log',
    defaultContext: `[붕룩이 프로젝트 — 임신 준비 SSOT / 기준: 2026-03-28]

■ 기본
- 첫째 태명: 붕룩이
- 엄마: 김나연(오랑이), 여성 28세, 체중 39~42kg
- 아빠: 유성우(붕쌤), 남성, 1차 진료 일반의

■ 오랑이 고려사항
- 저체중(39~42kg), 저혈압, 약물 민감도 높음
- 정신과 약물 자의 중단 상태 (Venlafaxine, Bupropion)
  → 임신 전 약물 정리 상태 확인 필요
- 편두통 약물(AAP 등) 임신 중 사용 가능 여부
- 엽산/철분/비타민D 보충 필요성 높음

■ 붕쌤 고려사항
- ATX 감량 중 (GU/성기능 영향) → 가임력 관련
- 2026-03-09 정액검사: Vol 1.6mL, count 62M, motility 61.1%, morphology 1%
- 2026-03-18~ 임신준비 영양제 (아르기닌, CoQ10, 실리마린, 멀티비타민)
- 정신과 약물(Lithium 등) 기형유발성 검토 필요

■ SSOT 원칙
- 양측 약물의 임신 안전성(FDA 카테고리) 항상 확인
- 영양/체중/컨디션 기록은 오랑이·붕쌤 각각 분리
- 검사 결과는 날짜별 기록
- 주치의(산부인과, 정신과) 판단 최우선`,
    aiRoles: {gpt:'임신 안전성·영양 분석',claude:'구조·메타·약물 안전',gemini:'액션 플랜·타임라인',perp:'근거·가이드라인 검색'},
    templates: [
      '오랑이 약물 임신 안전성 — 현재 복용/중단 약물 전체 리뷰',
      '붕쌤 약물 가임력 영향 — ATX/Lithium/Concerta 검토',
      '붕쌤 정액검사 결과 해석 — morphology 1% 의미',
      '임신 전 필수 검사 체크리스트',
      '엽산/철분/영양제 계획 리뷰',
    ],
    logConfig: {
      sites: null,
      symptoms: [],
      meds: [],
      treatments: [],
      nrsLabel: '컨디션 (0=최악 10=최상)',
      customFields: true,
    },
  },
};

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════
const CLIENT_ID = '103056429713-6ne324793lgc09nl9rkjqonlg4pcd12i.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

const AI_DEFS = {
  gpt:    {name:'GPT',        color:'#10a37f'},
  claude: {name:'Claude',     color:'#c96442'},
  gemini: {name:'Gemini',     color:'#4285f4'},
  grok:   {name:'Grok',       color:'#1DA1F2'},
  perp:   {name:'Perplexity', color:'#20808d'},
};

const DEFAULT_MODELS = {
  gpt:'gpt-5.4', claude:'claude-sonnet-4-6', gemini:'gemini-2.5-pro', grok:'grok-3', perp:'sonar',
};

const MODEL_OPTIONS = {
  gpt: [
    {value:'gpt-5.4',label:'GPT-5.4 (최신·추천)'},
    {value:'gpt-5.4-mini',label:'GPT-5.4 Mini (저비용)'},
    {value:'gpt-5.4-nano',label:'GPT-5.4 Nano (최저비용)'},
    {value:'gpt-5.3-chat-latest',label:'GPT-5.3'},
    {value:'gpt-4.1',label:'GPT-4.1 (안정)'},
    {value:'gpt-4.1-mini',label:'GPT-4.1 Mini'},
    {value:'o3',label:'o3 (추론)'},
    {value:'o3-mini',label:'o3 Mini (빠른 추론)'},
    {value:'o4-mini',label:'o4-mini (빠른 추론)'},
  ],
  claude: [
    {value:'claude-sonnet-4-6',label:'Sonnet 4.6 (추천)'},
    {value:'claude-opus-4-6',label:'Opus 4.6 (고성능)'},
    {value:'claude-haiku-4-5-20251001',label:'Haiku 4.5 (빠름)'},
  ],
  gemini: [
    {value:'gemini-3.1-pro-preview',label:'Gemini 3.1 Pro (최신)'},
    {value:'gemini-3-flash-preview',label:'Gemini 3 Flash (빠름)'},
    {value:'gemini-2.5-pro',label:'Gemini 2.5 Pro (안정·무료)'},
    {value:'gemini-2.5-flash',label:'Gemini 2.5 Flash (무료)'},
    {value:'gemini-2.5-flash-lite',label:'Gemini 2.5 Flash-Lite (최저비용)'},
  ],
  grok: [
    {value:'grok-4',label:'Grok 4 (최신·추천)'},
    {value:'grok-4-1-fast',label:'Grok 4.1 Fast (에이전트·2M)'},
    {value:'grok-3',label:'Grok 3 (안정)'},
    {value:'grok-3-mini',label:'Grok 3 Mini (빠름)'},
  ],
  perp: [
    {value:'sonar',label:'Sonar (추천)'},
    {value:'sonar-pro',label:'Sonar Pro (고성능)'},
    {value:'sonar-deep-research',label:'Sonar Deep Research (심층)'},
    {value:'sonar-reasoning-pro',label:'Sonar Reasoning Pro (추론)'},
    {value:'sonar-reasoning',label:'Sonar Reasoning (추론·저비용)'},
  ],
};

const KEY_INFO = {
  gpt:    {label:'OpenAI (GPT)',      link:'https://platform.openai.com/api-keys',   note:'platform.openai.com → API Keys'},
  claude: {label:'Anthropic (Claude)',link:'https://console.anthropic.com/',          note:'console.anthropic.com → API Keys'},
  gemini: {label:'Google (Gemini)',   link:'https://aistudio.google.com/app/apikey', note:'aistudio.google.com → Get API Key'},
  grok:   {label:'xAI (Grok)',       link:'https://console.x.ai/',                  note:'console.x.ai → API Keys'},
  perp:   {label:'Perplexity',       link:'https://www.perplexity.ai/settings/api', note:'perplexity.ai → Settings → API'},
};

const DEFAULT_PRICE_TABLE = {
  'gpt-5.4':{in:2.50,out:15.00},
  'gpt-5.4-mini':{in:0.75,out:4.50},
  'gpt-5.4-nano':{in:0.20,out:1.25},
  'gpt-5.3-chat-latest':{in:2.50,out:10.00},
  'gpt-4.1':{in:2.00,out:8.00},
  'gpt-4.1-mini':{in:0.40,out:1.60},
  'o3':{in:2.00,out:8.00},
  'o3-mini':{in:1.10,out:4.40},
  'o4-mini':{in:0.55,out:2.20},
  'claude-sonnet-4-6':{in:3.00,out:15.00},
  'claude-opus-4-6':{in:5.00,out:25.00},
  'claude-haiku-4-5-20251001':{in:1.00,out:5.00},
  'gemini-3.1-pro-preview':{in:2.00,out:12.00},
  'gemini-3-flash-preview':{in:0.50,out:3.00},
  'gemini-2.5-pro':{in:1.25,out:10.00},
  'gemini-2.5-flash':{in:0.15,out:0.60},
  'gemini-2.5-flash-lite':{in:0.04,out:0.15},
  'grok-4':{in:3.00,out:15.00},
  'grok-4-1-fast':{in:0.20,out:0.50},
  'grok-3':{in:3.00,out:15.00},
  'grok-3-mini':{in:0.30,out:0.50},
  'grok-4.20-multi-agent':{in:2.00,out:6.00},
  'sonar':{in:1.00,out:1.00},
  'sonar-pro':{in:3.00,out:15.00},
  'sonar-deep-research':{in:2.00,out:8.00},
  'sonar-reasoning-pro':{in:2.00,out:8.00},
  'sonar-reasoning':{in:1.00,out:5.00},
};
