# HANDOFF — v9.7+ 세션 인수인계 가이드

## 현재 상태: v9.7+ (main)
- 브랜치: main
- SW CACHE_NAME: v99d
- APP_VERSION: v9.7
- backup/v9.7 브랜치 유지
- PR #166 (통합폼·통계·타임라인), #167 (비용추적), #168 (복용주기·알림로그·교차메모) 머지 완료

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

### 약물 시스템 후속
- [ ] bung/index.html에 medsDetail 빈도 체크 반영 (현재 메인앱만)
- [ ] 처방 소진 알림 ntfy 토픽 설정 UI
- [ ] 약물 변경 시 medsDetail 자동 초기화

### 비용 추적 후속
- [ ] 1~2주 후 calls 배열로 추정 vs 실제 재비교
- [ ] OpenAI 실제 호출 모델 확인 (gpt-5.4 vs 다른 모델?)
- [ ] Gemini/Perplexity 비용도 앱 내 추적과 대조

### 통합 폼 개선
- [ ] 편집 모드 (다른 도메인 섹션도 로드)
- [ ] auto-save/restore
- [ ] 붕룩이 축약 섹션 추가

### 검사 아카이브 개선
- [ ] AI Vision 프롬프트에 institution 추출 추가
- [ ] 미분류(other) 비율 줄이기 — AI 재분류 + 사전 확장

### 기존 미완료
- [ ] AI 건강 인사이트 (검진+약물+운동+체중 종합)
- [ ] 붕룩이 통계 관계/가임기 분석 강화

### 정리
- [ ] patches/ 폴더 삭제 (main에 머지됨, 더 이상 불필요)
- [ ] review/base-post166, tmp-tree-test-vision-cost 브랜치 정리

## 주의사항
- sw.js CACHE_NAME 현재 **v99d**
- 약물 체크: **빈도 인식** — `medsDetail.cycle` (daily/weekly/monthly/prn)
- 약물명 정규화: `_normalizeDrugName()` 3단계 + `customDrugMappings`
- 검사 대분류: `_getEffectiveMajorCategories()` — 커스텀 or 기본
- 영양제 라벨: `BRK_SUPPL_LABELS` (constants.js) 단일 정의
- 태그 색상: CSS 변수 (var(--tag-*), var(--ok/warn/err/info))
- **recordUsage source**: 새 AI 호출 추가 시 반드시 source 포함 (규칙 #36)
- 검사 정규화: **AI-first** (규칙 #37)
- NRS 표시: `_scoreLabel()` (하드코딩 금지)
- `node --check js/*.js` 구문 검사 필수 (규칙 #39)

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
