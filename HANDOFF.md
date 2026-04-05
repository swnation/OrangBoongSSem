# HANDOFF — v9.6 세션 이어받기 가이드

## 현재 상태: v9.6 (매일복용약체크 · 약물변경이력 · 비용합산 · AI모델업데이트)

### 이번 세션 완료 작업 (main 직접 커밋)

#### 매일 복용약 체크 UI
- [x] moodMode 도메인에서 질환 등록 약물을 체크박스로 표시
- [x] 매일약 기본체크 + PRN 별도 구분
- [x] medCheck 객체로 저장 + 로그 목록에 ✓복용/✗미복용 태그
- [x] 편집/자동저장 시 medCheck 상태 복원
- [x] 오랑이 마음관리(orangi-mental) dailyChecks 추가: 수면/에너지/식욕/불안/강박

#### 약물 변경 이력 시스템 개선
- [x] 💊 빠른 약물 변경 모달 — 질환 카드에서 바로 약물 추가/제거/사유/일자 입력
- [x] 변경 전 약물 → 이전 기록으로 자동 보존 (drugResponse/notes 포함)
- [x] 질환 카드: "■ 현재 투약 (2026-04-05~)" + "📋 이전 투약 기록" 섹션 분리
- [x] 이전 투약 기록 클릭→전체 편집 모달 (날짜/유형/약물/사유/반응/메모 수정 + 삭제)
- [x] getMedsAtDate(): medHistory 기반 날짜별 활성 약물 세트 조회
- [x] 로그 폼 날짜 변경 시 medCheck 자동 새로고침 (당시 약물 표시)
- [x] 이력 날짜 수정 시 영향 범위 증상 기록 medCheck 자동 업데이트

#### medCheck/dailyChecks 데이터 통합
- [x] AI 세션 컨텍스트에 [컨디션:수면:3] [복용:✓약물명] 전달
- [x] CSV 내보내기에 컨디션체크/복용체크 컬럼 추가
- [x] 통계 뷰: 복용 순응률 차트 + 컨디션 평균 차트 (moodMode)
- [x] 교차도메인 컨텍스트에 타 도메인 복용 순응도 포함

#### 비용 추적 개선
- [x] usage 뷰에 loadAllUserDomains() — 어느 도메인에서든 전체 비용 표시
- [x] 사이드바 비용: 현재 도메인→전체 도메인 합산

#### AI 모델/가격 업데이트 (2026년 4월)
- [x] GPT: gpt-5.4-nano 신규, o3-mini 신규, o3/o4-mini 가격 인하, gpt-4o 제거
- [x] Gemini: 3.1-flash-lite-preview 신규, 3.1-pro/3-flash/2.5-flash/2.5-flash-lite 가격 수정
- [x] Grok: grok-4/grok-4-1-fast/grok-4.20 가격 인하
- [x] Perplexity: sonar-deep-research 신규
- [x] 모델 선택 드롭다운에 [$입력/출력] 가격 태그 표시

#### 버그 수정
- [x] SW 업데이트 바 중복 방지 (id 체크)
- [x] getMedsAtDate 날짜 비교 localeCompare 일관성
- [x] saveMedHistEdit medHistory null 체크

### 15개 JS 모듈
| 파일 | 역할 |
|------|------|
| constants.js | 상수 (DOMAINS, AI, APP_VERSION, PRICE_TABLE) |
| state.js | 전역 상태 S 객체 |
| utils.js | 유틸리티 (esc, kstToday, 모달, 토스트) |
| crypto.js | API 키 AES-256-GCM 암호화 |
| drive.js | Google Drive + OAuth + 자동로그인 |
| cost.js | 비용 추적 (전체 도메인 합산) + recalcCost |
| ai-api.js | 5개 AI SSE 스트리밍 |
| session.js | 세션/디베이트/요약 |
| head-diagram.js | SVG 머리 다이어그램 |
| log.js | 증상 기록 + medCheck + dailyChecks + 프리셋 + 자동저장 |
| conditions.js | 질환관리 + 약물변경이력 + 빠른변경모달 + PRN |
| bungruki.js | 임신 준비 대시보드 |
| settings.js | API 키 + 모델 선택 (가격 표시) + 컨텍스트 편집 |
| pwa.js | PWA + 알림 + SW 업데이트 |
| views.js | 뷰 렌더링 + 일기예보 + 약물 리포트 + 순응률/컨디션 통계 |

### 백업 브랜치
- `backup/v9.6` ← 현재
- `backup/v9.5` / `backup/v9.4` / `backup/v9.3` / `backup/v9.2`
- `backup/pre-modular` ← 모듈화 전 스냅샷 (안정화까지 유지)

### 미완료/다음 세션 작업
- [ ] gemini-2.5-pro / gemini-2.5-flash 2026년 6월 17일 deprecated 예정 — 대체 안내
- [ ] grok-4.20-reasoning / grok-4.20-non-reasoning 변형 모델 추가 검토
- [ ] quick.html에도 medCheck 연동 검토

### PR 워크플로우
1. PR 생성 → Gemini 리뷰 확인 → 반영 → 머지
2. 직접 main 커밋도 가능 (작은 수정)

## 새 채팅 시작 시
```
CLAUDE.md와 HANDOFF.md 읽고 이어서 작업해줘.
```
