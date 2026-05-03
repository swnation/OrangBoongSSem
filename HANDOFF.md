# HANDOFF — v9.8.8 세션 인수인계 가이드

## 현재 상태: v9.8.8 (main)
- 브랜치: main
- SW CACHE_NAME: v99y (메인), v21 (quick)
- APP_VERSION: v9.8.8
- backup/v9.8.8 브랜치 생성 완료
- ⚠️ backup/v9.8, v9.8.2 자동 삭제 실패(403) — 다음 세션 수동 정리 (초과 2건)

## 세션 J 완료 (2026-05-03) — 검사 아카이브 접기 + 약물 복용법

### PR #210 (v9.8.8)
**요청 2건**

#### 1. 검사 아카이브 접기 토글 (`js/checkup.js`)
- 헤더 클릭 시 ▸/▾로 접기/펼치기, `localStorage 'om_checkup_collapsed'` 영속, **기본 접힘**
- 접힌 상태에서도 건수·항목 수는 헤더에 표시
- 접으면 액션 버튼·탭바·업로드·콘텐츠 모두 숨김 → 화면 공간 확보

#### 2. 약물 복용법 — 일투수 + 1회 복용량 (`js/conditions.js`)
- `medSchedule[medName]` 스키마 확장: `timesPerDay`, `doseAmount`, `doseUnit` (T/C/mL/포/매/회/방울/개)
- 📅 모달에 ⏰ 일투수(QD/BID/TID/QID — daily 타입에서만) + 💊 1회 복용량(숫자+단위) 행 추가
- `_isDefaultSched` 헬퍼 신설 → daily + QD + 용량 미설정만 default 취급
- `_fmtMedSched` 확장: "매일 1T BID", "주2회 0.5T", "PRN 5mL" 식 표시
- 칩 📅 배지 보라색 강조: timesPerDay>1 또는 doseAmount>0인 경우
- 모달 라벨 "복용 주기" → "복용법"

**Gemini 리뷰 반영 (medium 2건)**
- `_collectSchedFromForm`/`_isDefaultSched`에서 `doseAmount && doseAmount > 0` 패턴이 0/null 모호
- → `doseAmount != null && doseAmount > 0`로 통일, "0 = 미설정" 의도를 주석으로 명시

### 다음 세션 TODO
- backup/v9.8, v9.8.2 수동 삭제 (GitHub UI)
- AI 응답 실전 모니터링 → `_OPINION_POSTURE` 미세 조정 여부 판단

---

## 세션 I 완료 (2026-04-29)

## 세션 I 완료 (2026-04-29) — bung 데일리체크 운동 UX 개선

### PR #209 (v9.8.7)
**문제 4건**
1. 다크모드에서 운동 영역 글씨 검은색 고정 → 안 보임
2. 운동 +추가/삭제할 때마다 약 체크/NRS/시간/메모/증상 모두 초기화
3. 운동 종류 부족 (17종) + 웨이트 서브카테고리 없음
4. 운동량 칸 placeholder가 단위 변경해도 '분' 고정

**수정**
- 모든 폼 요소에 `color:var(--ink)` + 입력은 `background:var(--sf2)`
- `_BRK_EX_DB_FULL` 모듈 전역 상수로 분리 (50+ 종목)
  · cardio 13 / strength 22 (웨이트 서브카테고리: 벤치프레스·데드리프트·스쿼트·숄더프레스·바벨로우·풀업·딥스·바이셉컬·트라이셉·런지·케틀벨 등) / stretch 5 / sports 14
- 📚 더 보기 버튼 신설 — 카테고리별 그룹 picker 모달
- `_rerenderBrkDailySection` 헬퍼 — 운동 영역만 in-place 교체. 재렌더 전 `_saveBrkFormToData`로 brk 섹션 폼 값 보존, 다른 섹션(약물·NRS·시간·메모·증상) 폼 값은 건드리지 않음
- `_updateExUnitPlaceholder` — 단위 select onchange 시 input.placeholder 즉시 동기화
- 운동 amount/unit/weight 입력 변경 시 `_saveBrkFormToData` 자동 호출

**Gemini 리뷰 반영**
- `_addBrkEx`/`_pickBrkEx` onclick에서 `esc(name)`이 `'`를 `&#39;`로 변환해도 브라우저 속성 디코딩 시 다시 `'`로 복원 → JS 파싱 오류
- 수정: `esc()` 호출 전에 `name.replace(/'/g, "\\'")` JS 이스케이프 우선 처리 (685, 785 두 곳)

### 다음 세션 TODO
- backup/v9.8 수동 삭제 (GitHub UI)
- AI 응답 실전 모니터링 → `_OPINION_POSTURE` 미세 조정 여부 판단

---

## 세션 H 완료 (2026-04-22)

## 세션 H 완료 (2026-04-22) — 시간미상 필터 버그 수정

### PR #208 (v9.8.6)
**문제**: 오랑이 편두통에서 NRS=0 + 시간미상 + 메모만 있는 "두통 없는 날" 기록이 "최근 기록으로 AI 협진" 시 "최근 7일 기록 없음"으로 판정. 편두통 요약 포맷터에 memo 필드 누락으로 AI가 메모 내용도 못 받음.

**원인**: datetime이 `"YYYY-MM-DDT시간미상"` 문자열이라 `new Date()` → Invalid Date → 주간 필터에서 탈락.

**수정**:
- `_logTimestamp(l)` 헬퍼 신설 (`js/log.js`) — "시간미상"·invalid datetime을 `T00:00`로 폴백
- `new Date(l.datetime)` 필터 5곳 교체:
  - `js/log.js`: `getRecentLogSummary`, 24h 중복 약물 체크, 3일 미평가 스캔
  - `js/views.js`: 통계 `last30`/`last7` (2곳) — `typeof _logTimestamp==='function'` 방어
- 편두통 요약 `_fmtEntry`에 `📝 memo (100자)` 추가
- moodMode 요약에도 memo 추가
- 시간미상 기록 prefix는 `"MM-DD (시간미상)"`로 표시

### 다음 세션 TODO
- backup/v9.6, v9.7 수동 삭제 (GitHub UI)
- AI 응답 실전 모니터링 → `_OPINION_POSTURE` 미세 조정 여부 판단

---

## 세션 G 완료 (2026-04-22) — 이전 기록

## 세션 G 완료 (2026-04-22)

### PR #206 — 후속 3건 (v9.8.4)
1. `runGrokMultiAgent` 요약 JSON에 `patient_friendly` 필드 추가
2. `bung/` 데일리체크에 `condition.medSchedule` 인식 — 비일일 약(주/월/N일/custom)은 보라색 `📅 라벨` 배지 + 연한 배경
3. 🧹 붕쌤 중복 메모 대량 정리 도구 (사이드바 버튼)
   - Drive 전체 월별 로그 스캔 → mental/health 간 메모 정확 일치 탐지
   - 미리보기 모달 → 확정 시 영향받은 월 파일만 업데이트, 메모 외 데이터 전부 보존

### PR #207 — AI 보수성 완화 (v9.8.5)
- `_OPINION_POSTURE` 공통 상수 신설 (`cost.js`)
- 모든 세션 모드(basic/normal/debate/summary/grok)에 주입
- **허용**: 근거 기반 강한 의견·감별·잠정 결론·용량·우선순위 (확률 언어 사용)
- **금지**: "전문의와 상담", "주치의 판단이 우선", "의학적 조언 아님" 보일러플레이트
- basic mode GPT/Perp 역할에서 "의료적 판단 금지" 제거 → 방향성 권고 유도
- `final_recommendation` 길이 200→240자 + 도피성 금지
- `renderSummaryResult` 하단 문구 완화 ("반드시 전문의와 상담" → "임상 판단 보조용")

### 향후 TODO
- backup/v9.6 수동 삭제 (GitHub UI 또는 권한 환경 CLI)
- AI 응답이 실제로 덜 보수적이 됐는지 실전 모니터링 (몇 세션 돌려본 후 `_OPINION_POSTURE` 미세 조정)

## 세션 F 완료 (2026-04-22) — 통합 검증 & 회귀 수정

### PR #205 — 기본 모드 Claude 환자 설명용 문장 복원 (회귀 수정)
PR #204 머지 후 통합 검증 중 회귀 1건 발견:
- 기본 모드(GPT+Perp→Claude) R2 Claude가 **최종 출력**인데, PR #204에서 모든 라운드 "환자 설명용 문장"을 금지하면서 기본 모드 사용자가 환자 전달용 문장을 못 받게 됨.
- 기본 모드는 별도 `runFinalSummary` 호출이 없음.
- 수정: basic mode Claude 프롬프트 형식에 `→ **환자 설명용 문장**` 복원, 헤더에 "기본 모드는 응답이 곧 최종 출력" 명시.
- normal mode (R1/R2/R3 + runFinalSummary)는 그대로 유지.

### 통합 검증 결과 (CLAUDE.md 규칙 39)
- ✅ `node --check js/*.js` 전체 통과
- ✅ 인라인 스크립트(`index.html`, `bung/`, `quick/`) 전부 파싱 OK
- ✅ 스크립트 로딩 순서 vs 의존성 만족
- ✅ SW PRECACHE vs index.html script 태그 일치
- ✅ 신규 심볼(`_CROSS_MEMO_EXCLUDE`, `_msState`, `_summaryTick`, `patient_friendly`) 단일 파일 내 사용 — 외부 의존성 없음
- ✅ ntfy 호출 패턴 일관 (메인: `At:` 헤더 / quick: `?delay=Xm` 쿼리)

### 후속 검토 필요 (세션 F 범위 외)
1. `runGrokMultiAgent`(`session.js:537`) 요약 JSON에도 `patient_friendly` 필드 추가 → Grok Multi-Agent 모드 일관성
2. `bung/`(데일리체크)는 `condition.medSchedule`을 무시하고 매일 모든 약 표시 — 주N회/월N회 약의 표시 개선 (예: 배지, 비일일 약 회색 처리)
3. backup/v9.4, v9.5 수동 삭제 (GitHub UI 또는 권한 환경 CLI)
4. 기존 `bung-health` 엔트리 중복 메모 정리 대량 도구 검토

## 세션 E 완료 (2026-04-22)

### PR #203 — 질환 편집 약물 칩에 📅 복용 주기 선택기
- 칩에 매일/PRN 토글 옆 📅 버튼 신설
- 모달: 매일 / PRN / 주 N회 / 월 N회 / N일마다 / **직접 입력** (자유 문자열)
- `_dxMedSchedMap` state로 편집 중 관리, `condition.medSchedule`(기존 스키마)에 저장
- 헬퍼 공용화: `_fmtMedSched`, `_renderSchedPickerInner`, `_setMedSchedType`, `_collectSchedFromForm`, `_msState` (window 전역 오염 방지)
- Gemini 리뷰 반영: 키 이관 단일 패스 통합, window→`_msState` 모듈 로컬화

### PR #204 — 협진 세션 프롬프트 위생 + 최종 요약 진행률 + Opus 4.7
1. **환자 설명용 문장**은 최종 요약 단계에서만 생성 (중간 라운드 금지)
   - `_CONCISE`에 "자기 역할 재진술/환자 설명용 금지" 추가
   - basic mode Claude 프롬프트에서 "환자 설명용 문장" 형식 제거
2. **대상 환자 명시 강화** — Perplexity 등이 헷갈리지 않도록
   - `getFullContext` 맨 앞 `★ 대상 환자` 헤더 신설
   - 공유 환자 프로필 → "가족 구성원 참고 (상호작용/영향 맥락)" 라벨 변경
   - `getRoleSystem`/`buildUserPrompt`에 `[대상 환자] OO·OO` 라인 매번 포함
3. **runFinalSummary 진행률** UI 추가 (800ms당 +4%, 95% 상한)
   - 타이머와 progress 초기화 모두 try 블록 내부 (Gemini 리뷰 반영, 누수 방지)
   - 프롬프트에 `patient_friendly` 필드 추가 → renderSummaryResult에 💬 카드
4. **Claude Opus 4.7** 추가 (2026-04-16 GA, $5/$25, Sonnet 4.6 일상 추천 유지)

### 다음 세션 TODO
- backup/v9.4 수동 삭제 (GitHub UI 또는 권한 환경에서 `git push origin --delete backup/v9.4`)
- 기존 bung-health 엔트리 중복 메모 정리 — 📤 버튼으로 수동 또는 대량 정리 도구 검토

---

## 세션 D 완료 (2026-04-21) — 붕쌤 마음↔건강 메모 분리

### PR #202 (squash 머지 완료)

#### 문제
붕쌤 건강관리 목록에 마음관리 메모가 교차 표시되어 불편. `bung/` 앱이 같은 메모를 두 도메인에 중복 저장하던 문제.

#### 해결
1. **메인앱 교차 표시 필터** (`js/log.js`)
   - `_CROSS_MEMO_EXCLUDE` 상수: `{bung-health↔bung-mental}` 짝 정의
   - 홈(`renderRecentLogs`) / 저널(`renderJournalLogs`) 교차 표시에서 짝 제외
2. **데일리체크 도메인별 메모 분리** (`bung/index.html`)
   - 단일 `daily-memo` → `daily-memo-bung-mental` / `daily-memo-bung-health` 두 개로 분리
   - `saveAll`에서 도메인별 메모 각각 저장 (중복 저장 중단)
   - 엔트리 프리뷰/캘린더 상세에서도 도메인별로 구분 표시
3. **📤 짝 도메인 이동 버튼**
   - 메인앱 기록 목록: `_sendMemoToSibling(realIdx)` — 확인 후 메모 이동
     · 같은 `datetime` 기존 엔트리 있으면 메모 append, 없으면 새 엔트리 생성
     · 원본이 메모 외 내용 없으면 삭제, 있으면 메모만 비움
     · `_pushUndo`로 되돌리기 가능
   - bung/ 앱: `_sendMemoBetween(from, to)` — textarea 내용 이동 (저장 필요)

#### 데이터 처리 방침
- 기존 `bung-health` 엔트리에 남아 있는 중복 메모는 **자동 정리 안 함** (사용자 판단 "지금까지 자료는 마음관리에 두면 될 것 같아" 반영)
- 필요 시 📤 버튼으로 개별 이동, 또는 대량 정리 기능을 향후 추가
- 오랑이 도메인(`orangi-health`↔`orangi-mental`)은 제외 — 명시 요청 없었음. 필요 시 `_CROSS_MEMO_EXCLUDE`에 두 줄 추가로 확장 가능

### 주의사항
- `_sendMemoToSibling`은 짝 도메인의 `logMonth`가 다르면 Drive에서 해당 월을 새로 로드함. 대상 도메인이 아예 로드되지 않은 상태(`!folderId`)면 토스트 후 중단
- bung/ 앱의 📤 버튼은 textarea끼리 이동만 하고 저장은 하지 않음 — 유저가 💾 저장 버튼 눌러야 Drive 반영

---

### 이전 컨텍스트 (v9.7까지)
- PR #166~#195 머지 완료 (이전 세션들 PR 31건)
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

### 아키텍처 전환 — 완료 (Phase 1~2)
- [x] Firebase 초기 설정 (`firebase-init.js`, `firebase-auth.js`, `firebase-store.js`)
- [x] Storage adapter 추상화 (`storage.js` — localStorage 직접 호출 0건)
- [x] settings + customItems Firestore write-through 이관
- [x] localStorage 의존도 제거 (전량 adapter 경유)

### 아키텍처 전환 — 후속 (Phase 3~5)
- [ ] 로그/세션/마스터 데이터 Firestore 이관 검토 (현재 Drive 의존 — Phase 3)
- [ ] 통계/타임라인 뷰 Firestore 직접 쿼리 전환 (Phase 4)
- [ ] Cloud Functions: AI 키 서버사이드 관리 (Phase 5)
- [ ] Cloud Functions: 알림(ntfy) 백엔드 스케줄링 (Phase 5)

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
