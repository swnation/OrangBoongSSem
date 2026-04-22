# CLAUDE.md — Orangi Health AI 협진 시스템 v9.7

## 프로젝트 개요
멀티 도메인 AI 협진 의료 기록 시스템. 5개 AI(GPT/Claude/Gemini/Grok/Perplexity)를 동시 호출하여 환자 데이터를 분석하는 단일 페이지 웹앱.

## 파일 구조
```
index.html      — HTML + 부트스트랩 JS
style.css       — CSS + CSS 변수 (다크모드)
js/             — 모듈화된 JS (20개 파일)
  constants.js  — 상수 정의
  storage.js    — Storage Adapter (localStorage↔Firestore 추상화)
  firebase-init.js  — Firebase 초기화 (fam-med-service)
  firebase-auth.js  — Firebase Auth (Google)
  firebase-store.js — Firestore CRUD + 경로 헬퍼
  state.js      — 전역 상태 S 객체
  utils.js      — 유틸리티 함수
  crypto.js     — API 키 암호화
  drive.js      — Google Drive + OAuth
  cost.js       — 비용 추적
  ai-api.js     — AI API 호출
  session.js    — 세션 관리
  head-diagram.js — 머리 다이어그램
  log.js        — 증상 기록
  conditions.js — 질환 관리
  bungruki.js   — 임신 준비 대시보드
  checkup.js    — 건강 검진 표준화 아카이브
  settings.js   — 설정 + 컨텍스트
  pwa.js        — PWA + 오프라인
  views.js      — 뷰 렌더링
manifest.json   — PWA 매니페스트
sw.js           — Service Worker (CACHE_NAME: v99m)
quick/          — 두통 빠른 기록 별도 앱 (SW: v21)
bung/           — 데일리체크 별도 앱
icons/          — PWA 아이콘 (icon-512/192, quick-512/192, head-front/back)
CLAUDE.md       — 이 파일
HANDOFF.md      — 세션 인수인계
LOCALSTORAGE_AUDIT.md — localStorage 전수 감사
FIREBASE_MIGRATION_WORKPLAN.md — Firebase 마이그레이션 계획
FIREBASE_MIGRATION_PRACTICAL_NOTES.md — 실무 제약사항
FIRESTORE_SCHEMA.md — Firestore 스키마
CLAUDE_CODE_HANDOFF.md — 아키텍처 전환 핸드오프
```

## 기술 스택
- **프론트엔드**: Vanilla JS (프레임워크 없음), 20개 모듈 파일 (`js/` 디렉토리)
- **스타일**: 외부 CSS (`style.css`) + CSS 변수 (다크모드 지원)
- **저장**: Storage Adapter (`js/storage.js`) → localStorage (읽기 캐시) + Firestore (write-through)
- **1차 데이터**: Google Drive API (OAuth2) — 로그/세션/마스터 JSON
- **2차 데이터**: Firebase Firestore (`fam-med-service`) — 설정/커스텀항목/프리셋
- **인증**: Google OAuth (Drive) + Firebase Auth (Firestore) — Drive 로그인 시 Firebase 자동 연동
- **AI API**: 5개 프로바이더 SSE 스트리밍 (Claude/GPT/Gemini/Grok/Perplexity)
- **외부 라이브러리**: marked.js (마크다운), DOMPurify (XSS 방어), Firebase SDK (CDN compat)
- **PWA**: Service Worker + manifest.json
- **의약품 검색**: 식약처 공공데이터 API (`DrugPrdtPrmsnInfoService07`)
- **API 키 보안**: AES-256-GCM 암호화 (PIN 기반 PBKDF2)

## 핵심 아키텍처

### 전역 상태 (`S` 객체)
```javascript
S = {
  token,           // Google OAuth access token
  currentDomain,   // 현재 선택된 도메인 ID
  domainState,     // {domainId: {folderId, masterFileId, master, logData, ...}}
  keys,            // AI API 키 (storage.js 경유, Drive 저장 안 함)
  models,          // AI 모델 선택
  session,         // 현재 AI 세션 상태
  generating,      // AI 생성 중 플래그
}
```

### 도메인 구조 (`DOMAINS` 객체)
6개 도메인, 2명의 유저:
- **오랑이**: 편두통(`orangi-migraine`), 마음관리(`orangi-mental`), 건강관리(`orangi-health`)
- **붕쌤**: 마음관리(`bung-mental`), 건강관리(`bung-health`)
- **붕룩이**: 임신준비(`bungruki`)

각 도메인은 독립 Google Drive 폴더에 마스터 JSON 파일 저장.

### 뷰 시스템
`renderView(view)` → 9개 뷰:
`home`, `session`, `log`, `history`, `templates`, `meds`, `stats`, `crosslog`, `usage`

### 날짜/시간
모든 날짜는 **KST** 기준 (`kstToday()`, `kstMonth()`, `kstDaysAgo(n)`).
UTC+9 오프셋을 수동 적용하는 방식.

### NRS 값 규칙
- `nrs >= 0`: 유효한 기록 (0 = 통증 없음, 10 = 최대)
- `nrs === -1`: 기록 안함 (스킵)
- 표시/통계에서 `nrs >= 0`으로 필터링 (0도 유효값으로 포함)

### API 호출
- `fetchWithRetry(url, opts, maxRetries=2)`: 429/5xx 시 지수 백오프 재시도
- `callAIStream(aiId, system, user, onChunk, signal)`: SSE 스트리밍 + AbortController 지원
- `callAI(aiId, system, user)`: 비스트리밍 래퍼 (요약 등에 사용)
- AI 5개: gpt(OpenAI), claude(Anthropic), gemini(Google), grok(xAI), perp(Perplexity)
- **Grok Multi-Agent**: `grok-4.20-multi-agent` 모델, `/v1/responses` 엔드포인트 (chat/completions 아님)
- 비용 최적화: R1에서 Grok 제외, R2+에서 Perplexity 제외
- Grok 스트리밍: `stream_options: {include_usage: true}` 필수 (비용 추적용)
- OAuth 토큰 자동 갱신 (`scheduleTokenRefresh`, `ensureValidToken`)

### ntfy 알림
- **quick.html에서만 발송** (메인앱은 본인 기록이라 불필요)
- 붕쌤 토픽: 즉시 알림 (`POST ntfy.sh/TOPIC` 단순 POST, 커스텀 헤더 금지→CORS)
- 오랑이 토픽: 2시간 후 예약 발송 (`At: 2h` 헤더 → ntfy 서버측 타이머)
- SW에서 ntfy.sh 도메인 제외 필수

### 경과(Outcome) 체계
- `outcome.rating`: `better` / `same` / `worse` / `unknown` (기존 good/partial/none 하위 호환)
- `outcome.source`: `'auto'` (자동 감지) 또는 없음 (수동)
- `outcome.reason`: 자동 감지 근거 (예: "NRS 7→3 (4 감소) · 45분 후")
- **자동 감지** (`_autoDetectOutcomes`): 같은 날 시간대별 NRS 변화 분석 — 약/치료 후 다음 기록 비교
- quick.html에 🩺 경과 탭 (기록/경과/목록 3탭)
- 메인앱 로그 목록에 경과 태그 클릭→수정 모달
- 미평가 기록에 "+ 경과" 태그 표시
- 새 기록 시 이전 미발송 경과 알림 자동 취소 (`_cancelPendingOutcomeNtfy`)
- 경과 알림 기본 2시간 (`om_outcome_delay` = 120)

### 붕룩이 대시보드
- `renderBungrukiDashboard()` → meds 뷰에서 bungruki 도메인일 때 호출
- 5개 탭: `_brkDashTab` = cycle / daily / lab / milestone / safety
- `getBrkMaster()` / `saveBrkMaster()` 헬퍼
- `getMenstrualTag()`: 생리주기→편두통 트리거 교차 태그
- 📷 사진 OCR: AI Vision으로 생리주기 앱 스크린샷에서 날짜 추출
- 사이드바 탭명: 🍼 임신 준비 대시보드 / 📝 일지 기록 / 📈 임신 준비 통계

### 머리 다이어그램
- `icons/head-front.png`, `icons/head-back.png` (600x500 동일 크기)
- `<img>` + 투명 SVG 오버레이 (인터랙티브 클릭 영역)
- `syncMainHeadDiagram()`: 선택 상태 동기화
- index.html + quick.html 양쪽 동일 이미지 사용

### 자동완성 시스템
- 내장 DB: 약품 80개 + 증상 187개 + 치료 114개 + 질환 100개
- 약품 한영 매핑: 310쌍 (`_DRUG_NAMES` — 객체, 배열 아님!)
- 식약처 API: 실시간 검색 + `MAIN_ITEM_INGR`에서 동적 매핑 학습
- `setupAutocomplete(inputId, list, useAPI)`: datalist 기반, `_acSetup` 플래그로 중복 방지

### Storage 아키텍처 (`js/storage.js`)
- **읽기**: localStorage (sync, 즉시) — `getAppSetting()`, `getCustomItems()`
- **쓰기**: localStorage 즉시 + Firestore 백그라운드 write-through (500ms 디바운스)
- **로그인 시**: Firestore → localStorage 양방향 동기화 (`syncFromFirestore()`)
- **Firebase 미연결 시**: localStorage만 사용 (graceful fallback)
- **localStorage 직접 호출 금지** — 반드시 `storage.js` API 경유 (`_storageGet/Set` 또는 고수준 API)

### 커스텀(+고정) 항목
- `_CUSTOM_GROUPS`: `['meds','syms','tx','pain','triggers','sites_left','sites_right','hidden']`
- `storage.js` adapter 경유: `getCustomItems(domainId, group)` / `setCustomItems()` / `addCustomItem()`
- Firestore write-through: `users/{uid}/domains/{domainId}/customItems/{group}`
- Drive 마스터에도 `_customItems`로 동기화 (`_syncCustomItemsToMaster()` + `saveMaster()`)
- `addCustomChip/addCustomSite/addCustomPainType/addCustomTrigger` 모두 동기화 호출 필수

### 질환 관리
- 유저 단위 통합 (`getAllUserConditions`)
- 질환별 `medsList` 배열로 투약 관리
- `_DISEASE_MEDS`: 질환→약품 자동 추천 매핑 (20개 질환)
- 질환명 ICD-10 기반 자동완성 (`_AC_DISEASES`)
- 증상 기록 시 질환별 투약 선택 UI (`renderConditionMedSelector`)

### 버전 관리
`APP_VERSION` 배열 (`js/constants.js`):
- 새 버전 추가 시 맨 위에 한 줄 추가
- `.slice(0,5)`로 최신 5개만 유지
- 로그인 화면 CHANGELOG + 사이드바 버전 번호 자동 렌더링

## 주요 함수 래퍼 (주의)
```javascript
// renderView가 래핑되어 있음 (자동완성 셋업용)
const _origRenderView = renderView;
renderView = function(view) { _origRenderView(view); /* autocomplete setup */ };

// saveMaster가 래핑되어 있음 (오프라인 캐시용)
const _origSaveMasterFn = saveMaster;
saveMaster = async function() { await _origSaveMasterFn(); cacheToLocal(...); };
```

## 백업 브랜치
**규칙: 최근 5개 버전은 항상 백업 브랜치를 유지한다. 새 버전 백업 시 가장 오래된 것을 삭제.**
현재 원격 백업 브랜치 (최신→오래된 순):
- `backup/v9.8.5` (2026-04-22) ← v9.8.4(Grok patient_friendly·bung 배지·중복메모도구) + v9.8.5(AI 보수성 완화·_OPINION_POSTURE) 통합
- `backup/v9.8.3` (2026-04-22)
- `backup/v9.8.2` (2026-04-22)
- `backup/v9.8` (2026-04-21)
- `backup/v9.7`
- `backup/v9.6` ⚠️ **삭제 필요** (자동 삭제 403 실패 — 초과 1건)
- `backup/pre-modular` (마일스톤 — 유지)

※ backup/v9.4, v9.5는 이전 세션에서 삭제 처리 완료 확인.

### 버전업 시 백업 자동화 절차 (필수)
**Claude는 버전업 커밋을 main에 머지할 때 아래 절차를 반드시 자동 수행한다:**
1. `mcp__github__list_branches`로 현재 `backup/v*` 브랜치 목록 조회
2. `mcp__github__create_branch`로 `backup/v{새버전}` 생성 (from: main)
3. 백업 브랜치가 5개 초과 시, 가장 오래된 것부터 삭제 요청 (삭제 도구 없으면 사용자에게 알림)
4. 이 CLAUDE.md의 백업 브랜치 목록을 업데이트하여 커밋
5. HANDOFF.md에도 반영

## 작업 시 주의사항
1. `esc()` 함수는 `'`(단일 인용부호)도 이스케이프함 (`&#39;`)
2. `nrs > 0` 사용 금지 → 반드시 `nrs >= 0` (0은 유효값)
3. `nrs: 0` 사용 금지 → 미기록은 반드시 `nrs: -1`
4. 날짜는 `kstToday()` 사용 (`new Date().toISOString().slice(0,10)` 금지)
5. 외부 API fetch는 `fetchWithRetry` 사용
6. `+고정` 버튼 등 폼 리렌더 시 `_saveLogFormState()` / `_restoreLogFormState()` 사용
7. onclick에 사용자/AI 텍스트 직접 삽입 금지 → 전역 변수 참조 방식 사용
8. 자동완성 리스너 중복 방지: `input._acSetup` 플래그 확인
9. API 키는 AES-GCM 암호화 후 `_storageSet` 경유 저장 (`om_keys_enc`). 평문 저장 금지
10. +고정 항목 추가 시 `_syncCustomItemsToMaster()` + `saveMaster()` 호출 필수
11. ntfy 호출은 단순 POST만 (커스텀 헤더/JSON 금지 → CORS 문제)
12. Grok Multi-Agent는 `/v1/responses` 엔드포인트 사용 (chat/completions 아님)
13. 머리 이미지: SVG가 아닌 PNG + 투명 SVG 오버레이. `icons/head-front.png`, `head-back.png`
14. 코드 변경 배포 시 `sw.js`의 `CACHE_NAME` 버전을 반드시 올릴 것 (예: `v97a`→`v97b`). 안 올리면 SW가 업데이트 감지 못하고 구 캐시 계속 서빙
15. 버전 업 시 `APP_VERSION` 배열에 새 항목 추가 필수
16. 버전 업 시 **백업 자동화 절차** (위 "버전업 시 백업 자동화 절차" 섹션) 반드시 수행
17. 버전 업 시 `codeBackupToDrive()` 실행하여 Google Drive에 코드+맥락 백업 필수 (사용자가 로그인 상태일 때 자동 호출)
18. **세션 종료 시 반드시 `HANDOFF.md` + `CLAUDE.md` 업데이트** — 완료 작업, 다음 TODO, 주의사항을 빠짐없이 기록하여 다음 세션 인수인계에 누락 없도록 할 것
19. **PR은 main 머지 전에 먼저 생성** — feature 브랜치에서 작업 → PR 생성 → Gemini 리뷰 → 머지 순서. main에 직접 커밋 후 PR 만들면 diff가 없어서 PR 생성 불가. 작은 수정만 main 직접 커밋 허용
20. undo/redo: 요약/병합 등 데이터 변경 기능에는 항상 `_pushUndo()` 호출 필수

### 사용자 핵심 원칙 (★ 반드시 준수)
21. **기능 추가 시 설정은 사용자가 자유롭게 커스텀** — 타이밍/간격/횟수/모드 등 매직넘버 하드코딩 금지. 반드시 설정 UI를 함께 구성하고, 설정값은 클라우드(마스터 JSON) 저장 우선 (localStorage는 오프라인 캐시 용도만)
22. **저장은 반드시 storage.js adapter 경유** — `localStorage.getItem/setItem` 직접 호출 금지. `getAppSetting()`, `setAppSetting()`, `getCustomItems()`, `setCustomItems()` 등 adapter API 사용. 설정/커스텀항목은 Firestore로 자동 write-through. 로그/세션/마스터는 Google Drive. 새 기능 추가 시 "이 데이터가 새로고침/기기 변경 후에도 유지되는가?" 반드시 확인
23. **AI 모델은 주기적으로 업데이트** — `DEFAULT_MODELS`, `PRICE_TABLE`, `_brkVisionAiOptions` 등을 새 모델 출시 시 반드시 갱신. Vision AI는 모델별 특성(표 인식, OCR, 속도) 설명 포함
24. **AI가 데이터를 변경(요약/병합/정리 등)할 때는 반드시 `_pushUndo()` 호출** — 되돌리기 가능하도록. AI 호출 전 원본 스냅샷 필수
25. **정기적 백업 시스템 유지** — 버전업 시 backup/vX.X 브랜치 (최근 5개), `codeBackupToDrive()`, GitHub Actions 자동 정리

### 구현 규칙
26. **데이터 조회는 반드시 고유 ID 기반** — 배열 인덱스로 데이터 접근 금지 (정렬/필터 시 인덱스 불일치). `labResults`, `logData` 등은 항상 `.find(x=>x.id===id)` 조회
27. **비용이 큰 작업(AI 호출, 외부 API)은 미리보기 → 확인 후 실행** — 사진 분석, AI 요약 등은 반드시 사용자 확인 버튼 후 실행
28. **AI 호출 시 모델 선택권 제공** — 단일 AI 하드코딩 금지. 사용 가능한 모델 목록 + 추천 태그 제시. 2개 이상 키 있으면 멀티 AI 병렬 분석(교차 검증) 옵션도 제공. Vision 분석 대상: Gemini/Claude/GPT (Grok/Perplexity는 Vision 미지원으로 제외)
29. **예약/알림은 서버사이드 스케줄링 우선** — 클라이언트 setTimeout은 페이지 닫으면 소멸. ntfy `?delay=Xm` 등 서버사이드 방식 사용
30. **도메인 간 데이터 접근 시 소유자(who) 필터 필수** — bungruki 등 공유 도메인은 반드시 `who` 필드로 필터링
31. **겹치는 데이터 변경 시 연결된 모든 도메인/페이지에 동시 반영** — 예방접종(건강관리↔붕룩이), 질환/약물(도메인 간 공유), 설정(메인↔quick↔bung) 등 하나를 수정하면 관련 시스템 전부 갱신
32. **UI/UX는 가독성 높고 시각적으로 깔끔하게** — 카드/섹션 구분, 색상 일관성, 상태별 아이콘(✅/⬜/💉), 여백·정렬, 다크모드 호환. 정보 밀도가 높더라도 읽기 쉽게 계층 구조 명확히
33. **의료/건강 데이터는 공인 출처 기반** — 예방접종(질병관리청 KDCA), 약물(식약처 API), 질환(ICD-10) 등 공인 DB/API 활용. 내장 DB도 출처 명시
34. **AI 등 대기 작업은 실시간 진행률 UI 필수** — 프로그레스 바 + 퍼센트 숫자 + 현재 상태 텍스트. 중단(⏹)/이어하기 버튼 제공. 사용자가 진행 상황을 항상 알 수 있도록
35. **멀티 AI 분석 시 일부 모델 실패 → 재시도/제외/중단 선택지 제공** — 자동으로 넘어가지 않고 사용자에게 판단 위임. "🔄 실패 AI 재시도" / "▶ 성공분만 사용" / "⏹ 전체 중단" 3가지 옵션
36. **AI 호출 기능 추가 시 반드시 비용 추적 포함** — API 응답의 토큰 사용량을 파싱하여 `recordUsage(aiId, model, inTokens, outTokens)` 호출 필수. Vision/사진분석/요약 등 `callAI`를 거치지 않는 직접 호출도 예외 없이 적용
37. **모든 데이터 입력/변환 과정에 AI 검증 단계 포함** — 하드코딩 사전·규칙만으로 처리하지 말 것. 반드시 AI 검증 레이어를 함께 구성하여 변수에 유연하게 대응:
    - **3단계 파이프라인 패턴**: ①캐시/사전 빠른 매칭 → ②하드코딩 규칙 → ③AI 검증(미매칭/의심분만 전송, 비용 최소화)
    - **동적 사전 확장**: AI가 새 항목 발견 시 `settings.customTests` 등에 자동 추가 → 다음부터 AI 재호출 불필요
    - **오류 시 AI 반환값 제공**: 변환 실패·미매칭 시에도 AI가 `stdCode: null, reason: "..."` 등 구조화된 응답을 주어 사용자가 수동 교정 가능하도록
    - **매핑 캐시**: 동일 소스(기관, 포맷)의 동일 키는 캐시하여 재검증 방지
    - 적용 예: 검사 결과 표준화(`aiVerifyNormalization`), 약품명 정규화, 질환 코드 매핑 등
    - 적용 대상: `_DRUG_NAMES`, `_DISEASE_MEDS`, `_PREGNANCY_SAFETY`, `_MALE_FERTILITY_IMPACT`, `_CHECKUP_STD_TESTS`
38. **새 규칙 추가 시 기존 규칙과 교차 검증 필수** — 새 규칙이 기존 규칙과 충돌·중복하는지 확인하고, 병합이 나으면 병합. 또한 새 규칙을 기존 시스템 중 어디에 적용할 수 있는지 함께 탐색하여 제안할 것
39. **작업 완료 시 전체 시스템 통합 검증 필수** — 메인앱(index.html) · 두통 빠른 기록(quick/) · 데일리체크(bung/) 간 연결 누락, 데이터 포맷 불일치, 동기화 누락이 없는지 확인. 구체적으로: ①`node --check js/*.js`로 모든 JS 파일 구문 검사 실행 (필수!) ②스크립트 로딩 순서 ③함수 존재 여부(typeof 방어) ④도메인 간 sync 포맷 일치 ⑤ntfy 액션/URL 해시 일관성 ⑥영양제/운동/약물 키 목록 일치 ⑦SW precache 파일 누락 ⑧다크모드 호환성
