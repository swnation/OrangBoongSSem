# HANDOFF — v9.7+ 세션 인수인계 가이드

## 현재 상태: v9.7+ (main)
- 브랜치: main (직접 커밋)
- SW CACHE_NAME: v98h
- APP_VERSION: v9.7
- backup/v9.7 브랜치 유지

## 이번 세션 완료 (2026-04-10)

### 검진 아카이브 도메인 간 공유 수정
- 출처 표시: `institution: '붕룩이 기록'` → 실제 who 정보, 뱃지 '임신준비 연계'
- 건강관리 도메인: 정액검사(semen)/호르몬(hormone) type 통째 제외
- 타임라인에 who(오랑이/붕쌤) 이름 표시 추가

### 데일리체크 전면 연동
- bung/index.html: 🍼 임신준비 섹션 (영양제/운동/음주) 추가
- 메인앱 건강관리 도메인: `renderHealthDailyCheck()` UI 추가 (날짜 네비게이션 포함)
- 홈 카드: `renderBrkDailySyncCard()` 오늘의 데일리체크 현황
- `syncBrkToHealth` 개선: 운동/음주/메모 동기화 추가 (기존: 영양제만)
- `brkSetExercise`/`brkToggleAlcohol`/`brkSetMemo`에 sync 호출 추가
- 약물 체크 기본값: 전체 해제(false)
- 음주 UI: '금주/음주 토글' → '오늘 음주함' 체크 방식

### 항체 검사 해석 개선
- `higherIsBetter` 속성: HBSAB, HAVIGG, RUBELLAIGG
- `_judgeStatus`: higherIsBetter → 'positive'(🛡️ 면역) 판정
- 신규 검사 6종: HAV IgG/IgM, Rubella IgG/IgM, HIV Ag/Ab + 별칭 보강
- `_matchStdTest`: 언더스코어→공백 정규화 (HBs_Ab 매칭)
- 헬퍼: `_statusColor`/`_statusIcon`/`_isAbnormal` 통합
- 숫자 단위 검사에 비숫자 값(Negative 등) 자동 스킵

### 검사 분석 AI-first 파이프라인 전환
- **기존**: AI 추출 → 사전 매칭 → 사전 판정 (오매칭/미매칭 다수)
- **변경**: AI 추출+분류+판정 통합 → 사전은 교차검증만
- `_analyzeOnePhoto` 프롬프트: results[] 배열 반환 (code/name/value/status/category)
- `normalizeFromAI()`: AI results 파서 + 사전 교차검증
- `_aiNormalized` 플래그로 새/기존 포맷 분기
- 기존 `normalizeCheckupResults`는 레거시 데이터용으로 유지

### 기존 데이터 AI 재분류 기능
- 타임라인 각 기록에 🤖 버튼 → 개별 AI 재분류
- 아카이브 상단 "🤖 전체 AI 재분류" 버튼
- `_aiReclassify()`: callAI 텍스트 기반 (Vision 불필요 → 저비용)
- 레거시 데이터는 healthCheckups에 새 레코드로 저장

### 붕룩이 전용 검사 입력
- lab 폼 who 셀렉터에 '🍼 붕룩이' 옵션 추가
- `_renderLabsByPerson`: 붕룩이 그룹(🍼 보라색) 별도 표시
- `_isTestApplicable`: 붕룩이 성별 미정 → 모든 검사 허용
- AI 사진분석 프롬프트: 아기/태아 → '붕룩이' 인식

### CLAUDE.md 규칙 업데이트
- #19 강화: PR은 main 머지 전에 먼저 생성 (feature → PR → 리뷰 → 머지)

### 버그 수정
- bungruki.js 문법 오류 (renderHealthDailyCheck 이스케이프)
- 정액검사 값이 CBC 0으로 건강관리에 노출되는 문제

## 이전 세션 완료 요약
- 건강 검진 표준화 아카이브 (js/checkup.js 1130줄)
- 임신확률 모델 + 워터폴 차트
- 약물안전 탭 (유저별 분리, 한국 약품명 정규화)
- AI 동적 사전 확장 3종
- 버그 수정 다수

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

### quick 경과 모달
- 🤷모르겠어요 (unknown) 선택지 추가
- 다크모드 가시성: 버튼 배경 transparent + 테두리 색 강조

## 신규 프로젝트 구상

### 1. 가족 건강관리 시스템 (새 레포)
**목적**: 가족 각자의 건강 기록 관리 + 의료인(붕쌤) 통합 관리
**기술 스택**: Vanilla JS + PWA + Firebase (Auth + Firestore + Cloud Functions)
**Firebase 선택 이유**: 가족별 접근 제어(Firestore Security Rules), 재처방 알림(Cloud Functions), 무료 티어 충분(가족 10명 미만)

**핵심 기능**:
- 가족별 계정: 각자 본인 정보만 접근, 타인 정보는 제한적 조회
- 질환 기록 + 약 복용 + 복용 여부 체크
- 검진 결과 추가 및 AI 해석 (OrangBoongSSem 검사 표준화 재활용)
- 만성질환 재처방 알림: 처방일수 경과 시 붕쌤에게 알림 (Cloud Functions + ntfy)
- 과거력 정리 출력: 1차 의료기관용(간략) / 2~3차 의료기관용(상세) 깊이 설정
- 검진 신청 AI 상담: 매년 검진 시 선택 항목 추천

**OrangBoongSSem에서 재활용**:
- Google OAuth 인증 → Firebase Auth로 전환
- ai-api.js (AI 멀티 호출 + 비용 추적)
- checkup.js (검사 표준화 사전 + AI-first 파이프라인)
- constants.js (_DRUG_NAMES 약물 사전, _AC_DISEASES 질환 코드)
- PWA + 오프라인 구조

### 2. EMR AI 진료 어시스트 (EMR_AI_support 레포)
**목적**: 병원 진료 시 환자 개인화 보조 도구
**배포**: 로컬 서버 (인증된 근무자만 접속)

**핵심 기능**:
- 본원 진료 내역 기억 + 재진 시 최근 경과 정리
- 과거력 기반 처방 주의약물 필터링 (처방코드 연동)
- 만성질환 f/u 주기 관리 + 권장 주기 경과 알림
- 타 병원 관리 중인 질환 체크 + 알람 끄기
- 놓치기 쉬운 과거력 하이라이트

**OrangBoongSSem에서 재활용**:
- 약물 사전 + 상호작용 체크
- 검사 표준화 사전
- AI 호출 패턴

## 주의사항
- sw.js CACHE_NAME 현재 **v98h**
- 검사 정규화 파이프라인: **AI-first** (AI 추출+분류+판정 → 사전 교차검증)
- `_aiNormalized` 플래그: true면 AI results[] 포맷, false면 기존 values/ref 포맷
- `normalizeFromAI()`: AI 결과용, `normalizeCheckupResults()`: 레거시 데이터용
- 건강관리 도메인에서 붕룩이 labResults 공유 시: `type === 'semen' || 'hormone'` 통째 제외
- 데일리체크 동기화: 영양제/운동/음주/메모 모두 syncBrkToHealth 호출
- bung/index.html: 독립 앱, _saveBrkDaily + _syncBrkToHealthLocal 자체 구현
- CLAUDE.md 규칙 #19: PR은 main 머지 전에 생성 (feature → PR → 리뷰 → 머지)

## 새 채팅 시작 시
```
CLAUDE.md와 HANDOFF.md 읽고 이어서 작업해줘.
```
