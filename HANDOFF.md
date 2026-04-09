# HANDOFF — v9.7+ 세션 인수인계 가이드

## 현재 상태: v9.7+ (feature branch)
- 브랜치: claude/standardize-checkup-results-JnllB
- SW CACHE_NAME: v98b
- APP_VERSION: v9.7
- backup/v9.7 브랜치 유지
- PR #163~#165 머지 완료 (이전 세션)

## 이번 세션 완료 (2026-04-09)

### 🏗️ 건강 검진 표준화 아카이브 (신규 — 대형 기능)

#### js/checkup.js (1130줄, 신규 모듈)

**표준 검사 사전 (`_CHECKUP_STD_TESTS`)**
- 80+ 검사항목 표준화 사전 (17개 카테고리)
- 카테고리: CBC, 간기능, 신장, 갑상선, 지질, 당대사, 전해질, 염증, 생식호르몬, 정액검사, 비타민, 철분, 종양표지자, 감염, 응고, 소변, 기타
- 각 항목: 한/영 이름, 표준 단위, 참고범위(성별별), 별칭(한국어 병원 포맷 대응), 단위 변환 팩터, 관련 검사 연결, 임신 관련 태그
- 별칭: "AST(GOT)", "GOT", "SGOT", "아스파르테이트" → 모두 AST로 매칭
- 단위 변환: mg/dL↔mmol/L (glucose, cholesterol), ng/mL↔nmol/L (VitD) 등

**정규화 엔진**
- `_parseTestKey(raw)`: "TSH(mIU/L)" → {name:"TSH", unit:"mIU/L"} 분리
- `_matchStdTest(rawName)`: 3단계 매칭 (코드→별칭→부분 매칭)
- `_convertToStdUnit()`: 단위 자동 변환 (변환 실패 시 원본 유지)
- `_judgeStatus()`: 참고범위 기반 상태 판정 (정상/높음/낮음, 성별 고려)
- `normalizeCheckupResults()`: AI 파싱 결과 → 표준화 배열 (카테고리순 정렬)

**도메인 간 연계**
- `getAllHealthCheckups(who)`: 모든 도메인의 검진 데이터 통합 반환
  - 건강관리 도메인 `healthCheckups` + 붕룩이 `labResults` 자동 변환
- `getCheckupTrend(who, stdCode)`: 특정 항목 시계열 데이터
- `_getRecentCheckupContext()`: AI 세션 시 최근 이상 소견 + 추세 경고 자동 주입

**UI (3탭)**
- 📅 타임라인: 날짜순 검진 기록, 이상 항목 하이라이트, 접기/펼치기 상세
- 📈 추세: 2회 이상 기록 항목 미니 바 차트, 참고범위 표시, 방향 아이콘
- 🏷 카테고리: 카테고리별 최신 결과 그룹, 이상 건수 배지

**업로드 + AI 분석**
- 사진 업로드 → 미리보기 → AI 선택 → 분석 → 표준화 리뷰 → 저장
- 단일 AI: Gemini(추천)/Claude(정밀)/GPT(범용) 선택
- 멀티AI 교차검증: 2개+ AI 병렬 분석, 합의/다수결/불일치 처리
- 실패 시: 🔄재시도 / ▶성공분만 / ⏹중단 3가지 선택지
- 비용 추적: `_analyzeOnePhoto` 내부 `recordUsage` 재사용
- 기존 bungruki 패턴 100% 재사용 (`_brkVisionAiOptions`, `_runParallelAIs`, `_mergeConsensus`)

**수동 입력**
- `openManualCheckupEntry()`: 카테고리 선택 → 해당 항목 목록 → 값 입력 → 표준화 저장
- 참고범위 placeholder 표시, 즉시 상태 판정

**기존 데이터 마이그레이션**
- `migrateLabResultsStdRef()`: 붕룩이 labResults에 표준 참고치 일괄 적용
- 기존 ref 절대 덮어쓰지 않음 (검사지 값 우선)
- `_pushUndo()` 호출로 되돌리기 가능

#### 연동 변경
- `index.html`: `<script src="js/checkup.js">` 추가 (bungruki.js 다음)
- `sw.js`: PRECACHE에 `./js/checkup.js` 추가, CACHE_NAME v98b
- `js/conditions.js`: `renderMedsView()`에 건강관리 도메인용 `renderCheckupArchive()` 호출
- `js/ai-api.js`: `getFullContext()`에 `_getRecentCheckupContext()` 자동 포함 (이미 연동)

## 이전 세션 완료 요약
- 임신확률 모델 + 워터폴 차트
- 약물안전 탭 (유저별 분리, 한국 약품명 정규화)
- 영양제 숨김, 붕쌤 순응도, 캘린더 연결
- 버그 수정 다수 (estimateConceptionRate, kstTime, 약품 정규식 등)

## 다음 세션 TODO

### 검진 아카이브 후속
- [ ] 원본 이미지 Google Drive 폴더 별도 보관 (imgSrc → Drive file ID 링크)
- [ ] 검진 결과 수정/편집 UI (저장 후 개별 값 수정)
- [ ] 붕룩이 검사결과 탭에서 건강관리 도메인 데이터 연계 표시
- [ ] 검진 결과 AI 종합 해석 (전체 패널 기반 소견 생성)
- [ ] PDF 직접 분석 지원 (현재는 스크린샷만)

### 기존 미완료
- [ ] medCheck 마이그레이션 — 전체 월 스캔
- [ ] 관계 기록 빈도 통계 + 가임기 적중률 차트
- [ ] 붕룩이 통계에 관계/가임기 분석 포함
- [ ] AI 요약 결과 마스터에 저장 (히스토리)
- [ ] 홈 대시보드 카드 드래그 정렬

## 주의사항
- sw.js CACHE_NAME 현재 **v98b**
- 검사 아카이브 데이터: 건강관리 도메인 master의 `healthCheckups` 배열에 저장
- 붕룩이 `labResults`는 읽기 전용 참조 (기존 구조 변경 없음)
- `_matchStdTest()` 3단계 매칭: 코드직접 → 별칭정확 → 부분포함 (최장 매치 우선)
- `_looksLikeUnit()`: 단위/별칭 구분 (괄호 내 /·%·숫자 포함 시 단위로 판별)
- 단위 변환 실패 시 원본 값/단위 유지 (데이터 손실 방지)
- `migrateLabResultsStdRef()` 실행 전 반드시 `_pushUndo()` 확인
- Vision AI 호출은 `_analyzeOnePhoto` 재사용 → `recordUsage` 자동 포함
- 멀티AI 교차검증: `_brkConsensusAnalyze` 패턴 재사용
- ntfy 경과/약물 알림: 서버사이드 `?delay=Xm` + 폴백
- 예방접종 변경 시 건강관리↔붕룩이 양쪽 반영
- 관계 탭 무반응 원인 불확실 — kstTime() 수정 + try-catch 추가
- review/pre-batch 브랜치 정리 필요

## 새 채팅 시작 시
```
CLAUDE.md와 HANDOFF.md 읽고 이어서 작업해줘.
```
