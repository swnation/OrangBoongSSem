# HANDOFF — v9.7+ 세션 인수인계 가이드

## 현재 상태: v9.7+ (main)
- 브랜치: main (직접 커밋)
- SW CACHE_NAME: v98t
- APP_VERSION: v9.7
- backup/v9.7 브랜치 유지

## 이번 세션 완료 (2026-04-10)

### 검진 아카이브 도메인 간 공유 수정
- 출처 표시: `institution: '붕룩이 기록'` → 실제 who 정보, 뱃지 '임신준비 연계'
- 건강관리 도메인: 정액검사(semen)/호르몬(hormone) type 통째 제외
- 타임라인에 who(오랑이/붕쌤) 이름 표시 추가

### 데일리체크 전면 연동
- bung/index.html: 🍼 임신준비 섹션 (영양제/운동/음주) 추가
- 메인앱 건강관리 도메인: `renderHealthDailyCheck()` UI 추가 (날짜 네비게이션)
- 홈 카드: `renderBrkDailySyncCard()` 오늘의 데일리체크 현황
- `syncBrkToHealth` 개선: 운동/음주/메모 동기화 추가 (기존: 영양제만)
- 약물 체크 기본값: 전체 해제(false)
- 음주 UI: '오늘 음주함' 체크 방식

### 항체 검사 해석 개선
- `higherIsBetter` 속성: HBSAB, HAVIGG, RUBELLAIGG
- `_judgeStatus`: higherIsBetter → 'positive'(🛡️ 면역) 판정
- 신규 검사 6종: HAV IgG/IgM, Rubella IgG/IgM, HIV Ag/Ab
- `_matchStdTest`: 언더스코어→공백 정규화
- 숫자 단위 검사에 비숫자 값(Negative 등) 자동 스킵

### 검사 분석 AI-first 파이프라인 전환
- **기존**: AI 추출 → 사전 매칭 → 사전 판정
- **변경**: AI 추출+분류+판정 통합 → 사전은 교차검증만
- `_analyzeOnePhoto` 프롬프트: results[] 배열 반환
- `normalizeFromAI()`: AI results 파서 + 사전 교차검증
- 기존 `normalizeCheckupResults`는 레거시 데이터용으로 유지

### 기존 데이터 AI 재분류
- 타임라인 🤖 버튼 → 개별 AI 재분류
- 아카이브 "🤖 재분류" 버튼 → 전체 일괄
- `_aiReclassify()`: callAI 텍스트 기반 (저비용)

### PDF/워드/텍스트 문서 분석
- 📄 문서 업로드 버튼 (PDF/docx/txt)
- pdf.js CDN + JSZip 동적 로드
- Vision API 불필요 → 비용 1/5~1/10

### Google Drive 파일 가져오기
- ☁️ Drive 버튼: 최근 이미지/PDF/워드 20개 검색 → 선택 → 분석

### 검진 결과 수정/편집 UI
- ✏️ 편집 버튼: 날짜/기관/메모 수정, 개별 값 인라인 수정, 항목 삭제

### 관계 빈도 통계 + 가임기 적중률 차트
- ❤️ 관계 빈도: 총 기록/월 평균/가임기 비율, 12주 주간 바 차트
- 🎯 가임기 적중률: 배란일 기준 타이밍 히스토그램 (D-7~D+7)

### AI 종합 해석 + 홈 카드 순서 설정
- 💡 AI 종합 해석: 최근 5건 검진 기반 소견, 마스터 aiInterpretations에 저장
- 홈 카드: ▲▼ 순서 변경, homeCardOrder 클라우드 저장

### 이미지 Drive 보관 + 붕룩이↔건강관리 연계 + medCheck 마이그레이션
- saveHealthCheckup: base64 → Drive 'Checkup Images' 업로드, imgDriveId로 대체
- 붕룩이 검사탭 하단에 건강관리 검진 연계 표시
- `migrateMedCheck()`: 기존 meds → medCheck 역산

### NRS 하드코딩 전면 제거
- `_scoreLabel()` 헬퍼: 편두통=NRS, 마음관리=기분, 건강관리=컨디션
- views.js 27곳 + log.js 8곳 = 35곳 교체
- quick/index.html: 편두통 전용이라 NRS 유지

### 시술 분리 (GON/LON block 등)
- `_isProcedure()` / `_PROCEDURE_KEYWORDS`: block/신경자극술/VNS/ONS/SPG 등
- 약물 체크에서 시술 💉 별도 섹션 (시행 시에만 기록)
- 메인앱 + bung/index.html 동일 적용

### 하루 복수 기록 약물 중복 체크 방지
- 이전 기록에서 복용한 약: ✓이전 복용 표시 + 체크 잠금(disabled)
- 미복용 약만 활성 → 새로 복용한 것만 체크
- PRN은 잠금 안 함 (하루 여러 번 가능)

### quick 경과 모달 + 기타
- 다크모드 가시성: 버튼 배경 반투명 색상
- ntfy 액션에 '🤷 모름(unknown)' 추가 (3곳)
- URL 해시 패턴에 unknown 포함
- bung _syncBrkToHealthLocal async 전환 + loadLogMonth 보장
- showConfirmModal: new Function(action) 제거 (보안)

### CLAUDE.md 규칙 업데이트
- #19 강화: PR은 main 머지 전에 먼저 생성
- #39 신규: 전체 시스템 통합 검증 필수 (`node --check` 포함)

## 이전 세션 완료 요약
- 건강 검진 표준화 아카이브 (js/checkup.js)
- 임신확률 모델 + 워터폴 차트
- 약물안전 탭, AI 동적 사전 확장 3종

## 다음 세션 TODO

### 기존 미완료
- [ ] 붕룩이 통계에 관계/가임기 분석 더 강화 (월별 추세 등)

## 신규 프로젝트 구상

### 1. 가족 건강관리 시스템 (새 레포)
**기술**: Vanilla JS + PWA + Firebase (Auth + Firestore + Cloud Functions)
**핵심**: 가족별 접근 제어, 질환/약 기록, 검진 AI 해석, 재처방 알림, 과거력 정리(1차/2~3차 깊이 분리), 검진 항목 AI 추천
**재활용**: ai-api.js, checkup.js, constants.js 약물사전, PWA 구조

### 2. EMR AI 진료 어시스트 (EMR_AI_support 레포)
**배포**: 로컬 서버
**핵심**: 진료 내역 기억, 재진 경과 정리, 처방 주의약물 필터링, 만성질환 f/u 주기 관리

## 주의사항
- sw.js CACHE_NAME 현재 **v98t**
- 검사 정규화: **AI-first** (AI 추출+분류+판정 → 사전 교차검증)
- `_aiNormalized` 플래그: true면 AI results[], false면 기존 values/ref
- NRS 표시: 반드시 `_scoreLabel()` 사용 (하드코딩 금지)
- 시술 판별: `_isProcedure()` / `_PROCEDURE_KEYWORDS` (conditions.js) / `_isProc` (bung/)
- 약물 체크: 당일 이전 기록 병합 → 복용 완료 약 자동 잠금
- CLAUDE.md 규칙 #39: `node --check js/*.js` 구문 검사 필수

## 새 채팅 시작 시
```
CLAUDE.md와 HANDOFF.md 읽고 이어서 작업해줘.
```
