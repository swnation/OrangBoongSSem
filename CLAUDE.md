# CLAUDE.md — Orangi Health AI 협진 시스템 v9.1

## 프로젝트 개요
멀티 도메인 AI 협진 의료 기록 시스템. 5개 AI(GPT/Claude/Gemini/Grok/Perplexity)를 동시 호출하여 환자 데이터를 분석하는 단일 페이지 웹앱.

## 파일 구조
```
index.html      — HTML + JS 메인 앱 (~7500줄)
style.css       — CSS (325줄)
manifest.json   — PWA 매니페스트
sw.js           — Service Worker (network-first HTML, cache-first 정적자산)
quick/          — 두통 빠른 기록 별도 앱
icons/          — PWA 아이콘 (icon-512/192, quick-512/192)
VERSION.md      — 버전 정보 + 백업 브랜치 목록
CLAUDE.md       — 이 파일
```

## 기술 스택
- **프론트엔드**: Vanilla JS (프레임워크 없음), 단일 `<script>` 태그
- **스타일**: 외부 CSS (`style.css`) + CSS 변수 (다크모드 지원)
- **저장**: Google Drive API (OAuth2) + localStorage 오프라인 캐시
- **AI API**: 5개 프로바이더 SSE 스트리밍 (Claude/GPT/Gemini/Grok/Perplexity)
- **외부 라이브러리**: marked.js (마크다운), DOMPurify (XSS 방어)
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
  keys,            // AI API 키 (localStorage 전용, Drive 저장 안 함)
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
- 비용 최적화: R1에서 Grok 제외, R2+에서 Perplexity 제외
- OAuth 토큰 자동 갱신 (`scheduleTokenRefresh`, `ensureValidToken`)

### 자동완성 시스템
- 내장 DB: 약품 80개 + 증상 187개 + 치료 114개 + 질환 100개
- 약품 한영 매핑: 310쌍 (`_DRUG_NAMES`)
- 식약처 API: 실시간 검색 + `MAIN_ITEM_INGR`에서 동적 매핑 학습
- `setupAutocomplete(inputId, list, useAPI)`: datalist 기반, `_acSetup` 플래그로 중복 방지

### 질환 관리
- 유저 단위 통합 (`getAllUserConditions`)
- 질환별 `medsList` 배열로 투약 관리
- `_DISEASE_MEDS`: 질환→약품 자동 추천 매핑 (20개 질환)
- 질환명 ICD-10 기반 자동완성 (`_AC_DISEASES`)
- 증상 기록 시 질환별 투약 선택 UI (`renderConditionMedSelector`)

### 버전 관리
`APP_VERSION` 배열 (index.html 상단):
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
```
backup/v9.0  ← 20개 신기능 · 약물상호작용 · 푸시알림 · 인터랙티브 머리그림
backup/v8.4  ← 디베이트/빠른질문/인사이트/세션이어하기
backup/v8.3  ← KST/한영매핑/PDF/캘린더/시술추적
backup/v8.2  ← 질환 관리 통합/ICD-10/질환별 투약
backup/v8.1  ← UX 개선/직접입력/자동완성/컨텍스트통합
```
> ※ backup/v8.0, backup/v7.6은 5개 초과로 삭제 대상 (GitHub에서 수동 삭제)

## 작업 시 주의사항
1. `esc()` 함수는 `'`(단일 인용부호)도 이스케이프함 (`&#39;`)
2. `nrs > 0` 사용 금지 → 반드시 `nrs >= 0` (0은 유효값)
3. `nrs: 0` 사용 금지 → 미기록은 반드시 `nrs: -1`
4. 날짜는 `kstToday()` 사용 (`new Date().toISOString().slice(0,10)` 금지)
5. 외부 API fetch는 `fetchWithRetry` 사용
6. `+고정` 버튼 등 폼 리렌더 시 `_saveLogFormState()` / `_restoreLogFormState()` 사용
7. onclick에 사용자/AI 텍스트 직접 삽입 금지 → 전역 변수 참조 방식 사용
8. 자동완성 리스너 중복 방지: `input._acSetup` 플래그 확인
9. API 키는 AES-GCM 암호화 후 localStorage 저장 (`om_keys_enc`). 평문 저장 금지
10. 버전 업 시 `APP_VERSION` 배열에 새 항목 추가 필수
11. 버전 업 시 `backup/vX.X` 브랜치 생성 필수, **최근 5개만 유지** (가장 오래된 것 삭제)
12. 버전 업 시 `codeBackupToDrive()` 실행하여 Google Drive에 코드+맥락 백업 필수 (사용자가 로그인 상태일 때 자동 호출)
