# HANDOFF — v9.7+ 세션 인수인계 가이드

## 현재 상태: v9.7+ (main)
- 브랜치: main
- SW CACHE_NAME: v99m (메인), v21 (quick)
- APP_VERSION: v9.7
- backup/v9.7 브랜치 유지
- PR #166~#195 머지 완료 (이번 세션 PR 31건)
- **Firebase 마이그레이션 완료**:
  - localStorage 직접 호출 0건 (storage.js adapter 경유)
  - Firebase 프로젝트: `fam-med-service` (Firestore + Auth)
  - Write-through 패턴: localStorage 즉시 + Firestore 백그라운드 저장
  - 양방향 동기화: Firestore↔localStorage (로그인 시 자동)
  - Drive 로그인 → Firebase Auth 자동 연동 (팝업 방식)
  - 보안규칙: 본인 데이터만 읽기/쓰기 허용

## 세션 C 완료 (2026-04-14) — 편두통 예보·경과자동·약물관리·검사개선

### PR 목록 (12건)
| PR | 내용 |
|----|------|
| #169 | 편두통 일기예보 quick 앱 추가 + 빈 메모 렌더링 버그 수정 |
| #170 | 데일리체크↔메인앱 동기화 + 컨디션 단일선택 + 타임라인 중복 병합 + 검사 검색 탭 |
| #171 | 편두통 일기예보 탭→상세 근거 모달 표시 |
| #172 | 경과 자동 감지 (NRS·증상 시간대별 변화 기반) |
| #173 | NRS동일→비슷 + 경과알림 기본 2시간 + 시간고정 옵션 |
| #174 | 새 기록 시 이전 경과 알림 자동 취소 |
| #175 | 영양제 버튼 수정 + 약물→영양제 자동 연동 (syncMedsToBrkSuppl) |
| #176 | Gemini 리뷰 #165 반영 (코드 품질: Set필터/단일순회/가독성) |
| #177 | quick↔메인앱 커스텀 항목 양방향 동기화 + quick 약 검색 API |
| #178 | 알림 로그 복원 + 비우기 자기참조 버그 수정 |
| #179 | 약물 복용량 기록 (0.5T 단위) + 24시간 누적 과량 경고 |
| #180 | 검사 카테고리: 영문명 병기 + 날짜별 표 형태 |

### 주요 신규 기능

#### 1. 편두통 일기예보 (quick + 메인)
- `renderQuickForecast()` / `renderMigraineForecast()`: 5가지 위험 요소 분석
- 카드 탭 → 상세 근거 모달 (각 요소별 점수+설명+산출기준)
- `window._forecastDetails`: 전역 저장 → `showForecastDetails()` 모달

#### 2. 경과 자동 감지
- `_autoDetectOutcomes()` / `_autoDetectQuickOutcomes()`: 같은 날 시간대별 NRS 변화 자동 분석
- 약/치료 후 다음 기록 NRS 비교 → better/same/worse 자동 판정
- `outcome.source:'auto'` + `outcome.reason` 필드로 수동/자동 구분
- NRS 동일+증상만 감소 → 'same' (not 'better')
- 새 기록 시 이전 미발송 경과 알림 자동 취소 (`_cancelPendingOutcomeNtfy`)

#### 3. 약물 복용량 추적 (quick)
- 약 선택 시 수량 스테퍼 (−/+ 0.5T 단위, 시럽은 mL/포)
- `medsQty: {medName: {qty, unit}}` 저장
- `_MED_INGREDIENT_LIMITS`: 성분별 24시간 한도 (아세트아미노펜 4000mg 등)
- 80%→주의, 100%→과량경고 표시

#### 4. 약물→영양제 자동 연동
- `syncMedsToBrkSuppl()`: 메인앱/quick에서 magnesium 복용 → 붕룩이 마그네슘 체크
- `_MED_TO_SUPPL_MAP`: 한영 매핑 + 커스텀 영양제 부분일치

#### 5. quick↔메인앱 항목 동기화
- `_syncCustomItemsBidirectional()`: localStorage↔Drive 마스터 머지
- `_syncCustomsFromMain()`: quick 탭 복귀 시 자동 머지
- quick 약물 입력에 식약처 API 검색 (`searchDrugAPI`, `setupDrugAutocomplete`)

#### 6. 검사 아카이브 개선
- 🔍 검색 탭: 항목명/코드 실시간 검색 + 대분류 바로가기
- 카테고리 뷰: 영문명 병기 (예: 백혈구 WBC) + 날짜별 표 형태
- 소분류별 테이블: 항목 | 참고 | 날짜1 | 날짜2 | ... (최근 6회)

### 버그 수정
- 빈 메모 렌더링 (`log.js`, `bungruki.js`) — 조건부 렌더링
- 컨디션 체크 다중선택 → 단일선택 (`toggleDcChip`)
- 타임라인 중복 시간 자동 병합 (`_showTimeline`, `mergeDayEntries`)
- 데일리체크앱 데이터 → 메인앱 폼 미반영 (`_prefillDailyChecksFromExisting`)
- 영양제 버튼 안 눌림 → try-catch + 즉시 UI 갱신
- 알림 로그 비우기 → 1건 남는 버그 + 복원 기능 추가
- 경과알림 기본값 60분→120분, 시간변경 시 고정 confirm

## 세션 B 완료 (2026-04-13) — 복용주기·검사사전·교차메모

### 대기능 5개

#### 1. 통합 기록 폼 (Unified Form) — PR #166
- 다른 도메인 빠른 기록 아코디언 (`_renderOtherDomainSections`)
- 저장 시 현재 + 다른 도메인 동시 저장 (`_saveOtherDomainData`)
- 데일리체크 모든 비-bungruki 도메인에서 표시

#### 2. 건강관리 통계 대시보드 — PR #166
- `_renderHealthDashboardStats()`: 체중 SVG · 운동 · 영양제 · 음주
- `_renderCrossDomainCorrelation()`: 피어슨 상관분석

#### 3. 타임라인 전면 재설계 — PR #166
- 7종 이벤트 + 필터 + 50건 페이지네이션

#### 4. 약물 빈도별 복용 체크 — PR #168
- `medsDetail`: `{cycle, timesPerDay, timing, weekDays, monthDay, dose, rxDays, rxStartDate}`
- cycle: daily(기본) / weekly / monthly / prn
- QD 잠금+추가이유, BID/TID 카운터, PRN 이유필수, 비해당일 ⏭축소
- `medCheckDetail: {약물명: {reason}}` logData 저장
- `openMedDetailSettings()` ⚙️ 약물별 설정 모달
- 복용 이유 프리셋 + 커스텀 추가 (`medReasonPresets` 클라우드)

#### 5. 출산준비 체크리스트 — PR #166
- 🍼 출산준비 탭 (`_renderBirthPrepTab`)
- 5카테고리 20항목 + 메모/추가/삭제/초기화
- `birthPrep: {categories, checked, notes}` 클라우드 저장

### UX 개선 6개
6. **약물안전경고**: 접기/검색/정렬 (위험도/약물명/유형순)
7. **검사 중복정리**: 자동 감지 + ☑️ 선택 → 🤖 AI 병합
8. **기관명**: 일괄입력 (`openBatchInstitution`) + 붕룩이 기관명 필드
9. **📋 알림 로그**: showToast 100건 저장 + `showToastLog()` 모달
10. **캘린더 드릴다운**: 90일 셀 클릭 → `_showCalDetail()`
11. **ntfy 소진 알림**: 3일전/1일전/당일 (`checkRxRefillAlerts`)

### 데이터 통일 5개
12. **약물명 AI 검증 (Rule #37)**: `_normalizeDrugName` 3단계 + `aiVerifyDrugName` + `customDrugMappings`
13. **검사 사전**: 병원 XLS 기반 별칭 + 14종 신규 + P/PO4 통합 + FT4→Free T4 + 한영 병기
14. **영양제 라벨**: `BRK_SUPPL_LABELS` (constants.js) 단일 정의
15. **다크모드 CSS 변수**: --tag-*/--ok/--warn/--err/--info + log.js 24곳 + views.js 11곳
16. 붕룩이 카테고리 재구성 (임신 여정 기반)

### 버그 수정 3개
17. 편집 시 컨디션점수/체크/복용체크 초기화 복원
18. detail.freq → detail.cycle 필드 마이그레이션
19. Gemini 리뷰: 배열 mutation · 저장 피드백 · 중복키 강화 · 삭제 헬퍼

## 세션 A 완료 (2026-04-13) — 비용추적·교차메모·기관별뷰 (PR #167)

### 비용 추적 누락 수정 (핵심)
- **bungruki.js:595,607** — 생리주기 사진 OCR (Claude/GPT Vision) `recordUsage` 추가
- **conditions.js:862,874** — 약물 사진 인식 (Claude/GPT Vision) `recordUsage` 추가
- 이 3곳이 `fetchWithRetry`로 직접 API 호출하면서 비용 추적을 빠뜨리고 있었음

### recordUsage 상세 추적 시스템
- **cost.js**: `recordUsage(aiId, model, inT, outT, source)` — 5번째 인자 추가
- calls 배열: `{time, model, in, out, cost, source}` — 개별 호출 기록
- source 값: `session-r1~r3`, `summary`, `photo-ocr`, `drug-photo`, `lab-normalize`, `drug-safety`, `drug-search`, `drug-normalize`, `checkup-interpret`, `checkup-merge`, `drug-alert`, `insight`, `daily-insight`, `monthly-insight`, `forecast`
- **ai-api.js**: `callAI(aiId, system, user, source)`, `callAIStream(..., source)` 전파
- **모든 AI 호출 18곳** source 태깅 완료 (10개 파일)

### 비용 페이지 breakdown UI (views.js)
- `_renderUsageCallsBreakdown(monthStr)` 신규 함수
- 📋 기능별 비용 / 🏷 모델별 비용 / 🕐 최근 호출 로그 (20건)

### 교차 도메인 메모 확장 (log.js)
- **편두통 도메인**: 마음관리/건강관리 최근 3일 메모 전문 표시 (기존: 오늘만, 80자 잘림)
- **건강관리 도메인**: 교차 메모 7일, 14건으로 확대
- 도메인별 색상 테두리/배경 + dailyChecks 정보 포함

### 검사 아카이브 기관별 뷰 (checkup.js)
- `_renderCheckupByInstitution(checkups)` 신규 함수
- 🏥 기관별 탭 추가 (타임라인/추세/카테고리 옆)
- 기관별 → 대분류(🩸혈액/🧪소변/🛡️감염/🎯암/🧬생식)별 정리
- 항목별 날짜 매트릭스로 추세 한눈에

### GPT 가격 테이블 검증 (constants.js)
- `gpt-5.4` $2.50/$15.00 확인 (정확)
- 누락 추가: `gpt-4.1-nano` $0.05/$0.20, `gpt-4o` $2.50/$10.00, `gpt-4o-mini` $0.15/$0.60
- 과다 추정 원인: 가격표는 정확, 실제 호출 모델이 다를 가능성 → OpenAI 콘솔 확인 필요

### AI 타이머 예상금액 (session.js)
- `startAITimer`: 모델 가격 기반 예상 금액/call 표시

### 실제 API 사용량 (4월 스크린샷 분석)
| Provider | 실제 비용 | 비고 |
|----------|----------|------|
| Claude | $4.10 | sonnet-4-6: 481K in/173K out, haiku-4-5: 28K in/5K out |
| OpenAI | $0.41 | 95K tokens, 추정 $1.24 대비 과다추정 |
| Gemini | ₩12,800 | Orangi Migraine |
| Perplexity | $4.79 (3-4월) | sonar-pro, sonar, deep-research |

## 이전 세션 (2026-04-10~11) 완료 요약
- 검진 아카이브 도메인 간 공유 · 데일리체크 전면 연동
- 검사 AI-first 파이프라인 · PDF/워드 분석 · Drive 가져오기
- NRS 하드코딩 제거 · 시술 분리 · 복수 기록 중복 방지
- 건강 검진 표준화 · 임신확률 모델 · 약물안전 탭

## 다음 세션 TODO

### 아키텍처 전환 (CLAUDE_CODE_HANDOFF.md 참조)
- [ ] Firebase 초기 설정 (Auth + Firestore 스키마)
- [ ] Storage adapter 추상화 (`adapter.ts`, `firestore.ts`, `memory.ts`)
- [ ] settings + customItems를 Firestore로 이관 (Phase 2)
- [ ] localStorage 의존도 점진적 제거

### 약물 시스템 후속
- [ ] 메인앱 log.js에도 medsQty 수량 스테퍼 + 24시간 경고 추가 (현재 quick만)
- [ ] bung/index.html에 medsDetail 빈도 체크 반영
- [ ] 처방 소진 알림 ntfy 토픽 설정 UI
- [ ] 약물 변경 시 medsDetail 자동 초기화
- [ ] _MED_INGREDIENT_LIMITS 확장 (NSAIDs 교차 한도 등)

### 경과 시스템 후속
- [ ] 하루 중 간편 NRS 추적 (ntfy 체크인 알림 + 원탭 기록)
- [ ] 위치 변화도 자동 경과에 반영

### 비용 추적 후속
- [ ] 1~2주 후 calls 배열로 추정 vs 실제 재비교
- [ ] OpenAI 실제 호출 모델 확인
- [ ] Gemini/Perplexity 비용도 앱 내 추적과 대조

### 검사 아카이브 개선
- [x] 검색 탭 + 영문명 병기 + 날짜별 표 (세션 C 완료)
- [ ] AI Vision 프롬프트에 institution 추출 추가
- [ ] 미분류(other) 비율 줄이기 — AI 재분류 + 사전 확장
- [ ] 검사 기록 중복 항목 정리 + UI 간소화

### 기존 미완료
- [ ] AI 건강 인사이트 (검진+약물+운동+체중 종합)
- [ ] 붕룩이 통계 관계/가임기 분석 강화

### 정리
- [ ] patches/ 폴더 삭제
- [ ] review/base-post166, tmp-tree-test-vision-cost 브랜치 정리

## 주의사항
- sw.js CACHE_NAME 현재 **v99m** (메인), quick **v21**
- 약물 체크: **빈도 인식** — `medsDetail.cycle` (daily/weekly/monthly/prn)
- 약물명 정규화: `_normalizeDrugName()` 3단계 + `customDrugMappings`
- 검사 대분류: `_getEffectiveMajorCategories()` — 커스텀 or 기본
- 영양제 라벨: `BRK_SUPPL_LABELS` (constants.js) 단일 정의
- 태그 색상: CSS 변수 (var(--tag-*), var(--ok/warn/err/info))
- **recordUsage source**: 새 AI 호출 추가 시 반드시 source 포함 (규칙 #36)
- 검사 정규화: **AI-first** (규칙 #37)
- NRS 표시: `_scoreLabel()` (하드코딩 금지)
- `node --check js/*.js` 구문 검사 필수 (규칙 #39)
- **localStorage 직접 호출 금지** — 반드시 `storage.js` adapter 경유
- **Firebase 프로젝트**: `fam-med-service` (Firestore + Auth)
- **Storage 패턴**: localStorage(읽기 캐시) + Firestore(write-through) — `js/storage.js`
- **Drive vs Firestore 역할**: Drive=로그/세션/마스터, Firestore=설정/커스텀/프리셋
- **JS 파일 20개** (기존 15 + storage, firebase-init/auth/store, checkup)

## 신규 프로젝트 구상

### 1. 가족 건강관리 시스템 (새 레포)
**기술**: Vanilla JS + PWA + Firebase
**재활용**: ai-api.js, checkup.js, constants.js 약물사전

### 2. EMR AI 진료 어시스트 (EMR_AI_24clinic 레포)
**배포**: 로컬 서버

## 새 채팅 시작 시
```
CLAUDE.md와 HANDOFF.md 읽고 이어서 작업해줘.
```
