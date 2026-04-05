# HANDOFF — v9.5 세션 이어받기 가이드

## 현재 상태: v9.5 (코드모듈화 · 편두통일기예보 · 약물효과리포트 · 자동로그인 · 로그프리셋)

### 이번 세션 완료 작업 (PR #137~#159 + 직접 커밋)

#### 코드 모듈화 (Phase 1~7)
- [x] index.html 9939줄 → 235줄 (15개 JS 모듈 분리)
- [x] `backup/pre-modular` 브랜치 보존 (롤백용 — 모듈화 안정화까지 유지)
- [x] SW: JS 파일 network-first + PRECACHE

#### 신기능
- [x] 편두통 일기예보 — 5요인(요일/최근NRS/트리거/기압/생리주기) 기반 위험도 0~100
- [x] 약물 종합 효과 리포트 — NRS 변화 + 경과 평가 통합 랭킹
- [x] 로그 프리셋(즐겨찾기) — 칩 조합 원탭 입력 (메인+quick 앱 모두)
- [x] 자동 로그인 — GSI 사일런트 토큰 (prompt:'')
- [x] 로그 폼 자동저장 — sessionStorage, 500ms 디바운스, 1시간 만료
- [x] SW 업데이트 알림 — 하단 바 "새로고침" + ✕ 닫기

#### 마음관리 로그 폼 개선
- [x] moodMode에서 NRS=-1 고정 (가짜 NRS 제거)
- [x] dailyChecks 추가: 수면/집중력/발화/기억력/에너지/식욕 (1-5 스케일)
- [x] 로그 목록에서 moodMode NRS 평균 숨김

#### 질환관리 개선
- [x] PRN 복용 구분 — 약 추가 시 PRN 체크박스 + 점선 시각 구분
- [x] 붕룩이 도메인 용어 맞춤 (질환→관리 항목, ICD-10 비활성화)
- [x] 가격표 병합 수정 (DEFAULT + 커스텀 merge), recalcCost로 0원 데이터 재계산
- [x] 가격 자동 업데이트 강화 — 신규 모델/가격 변동 알림

#### 머리 다이어그램
- [x] SVG 좌표 상수 추출 + 빌더 함수
- [x] 이미지 280px→340px, 라벨 stroke + 폰트 크기 증가
- [x] sync 함수 색상 상수화 + 선택 부위 drop-shadow

#### Gemini PR 리뷰 반영 (PR #137~#159)
- [x] var→const, 다크모드 stroke 분기
- [x] views.js 구문 오류 수정 (} 누락)
- [x] showConfirmModal action 문자열→함수 참조
- [x] session.js 누적지식 Array.isArray + 헬퍼 추출 + 중복방지
- [x] conditions.js migrateConditions 닫는 중괄호
- [x] 약물 효과 점수 스케일 정규화
- [x] SSE 버퍼 잔여 처리 (GPT/Perp/Grok)

### 15개 JS 모듈
| 파일 | 줄 수 | 역할 |
|------|--------|------|
| constants.js | 409 | 상수 (DOMAINS, AI, APP_VERSION) |
| state.js | 34 | 전역 상태 S 객체 |
| utils.js | 69 | 유틸리티 (esc, kstToday, 모달, 토스트) |
| crypto.js | 93 | API 키 AES-256-GCM 암호화 |
| drive.js | 456 | Google Drive + OAuth + 자동로그인 |
| cost.js | 37 | 비용 추적 + recalcCost |
| ai-api.js | 280 | 5개 AI SSE 스트리밍 |
| session.js | 696 | 세션/디베이트/요약 |
| head-diagram.js | 112 | SVG 머리 다이어그램 |
| log.js | 1734 | 증상 기록 + 프리셋 + 자동저장 + dailyChecks |
| conditions.js | 1455 | 질환관리 + 약물 + PRN |
| bungruki.js | 1195 | 임신 준비 대시보드 |
| settings.js | 625 | API 키 + 컨텍스트 편집 |
| pwa.js | 321 | PWA + 알림 + SW 업데이트 |
| views.js | 2727 | 뷰 렌더링 + 일기예보 + 약물 리포트 |

### 백업 브랜치
- `backup/v9.5` ← 현재
- `backup/v9.4` / `backup/v9.3` / `backup/v9.2` / `backup/v9.1`
- `backup/pre-modular` ← 모듈화 전 스냅샷 (안정화까지 유지)
- ⚠️ `backup/v9.0` 삭제 필요 (5개 유지 규칙)

### 미완료/다음 세션 작업
- [ ] ES 모듈 전환 (선택적 — 현재 전역 스코프로 정상 동작)

### PR 워크플로우
1. PR 생성 → Gemini 리뷰 확인 → 반영 → 머지
2. 직접 main 커밋도 가능 (작은 수정)

## 새 채팅 시작 시
```
CLAUDE.md와 HANDOFF.md 읽고 이어서 작업해줘.
```
