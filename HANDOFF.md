# HANDOFF — v9.3 세션 이어받기 가이드

## 현재 상태: v9.3 (기본 모드 + 약물 3중 검증 + 대규모 UX 개선)

### 이번 세션 완료 작업 (PR #84~#121)

#### 기본 모드 (Basic Consult)
- [x] 경량 모드를 기본 모드로 대체, 기본값으로 설정
- [x] GPT(데이터분석) || Perplexity(근거검색) 병렬 → Claude(최종판단) 순차
- [x] 모드: 🌱 기본 협진 / ⚡ 심층 협진 / ⚔️ 디베이트 / 🤖 Grok / 💬 빠른질문

#### 약물 안전성 3계층 교차검증
- [x] 내장 DB 80개 약물 (FDA/PLLR/식약처 3소스)
- [x] 식약처 DUR API + Perplexity fallback + localStorage 캐싱

#### 투약 변경 이력 (medHistory)
- [x] 약물 변경 자동 감지, 카드형 타임라인, 수동 이력 추가

#### 비용 추적
- [x] 전체 모델 26개 가격표 완성, Grok 비용 0원 수정
- [x] 도메인별/일별 AI별 상세, 모바일 가독성

#### 디베이트 심판
- [x] Phase1(4AI 병렬) → Phase2(Claude 심판 순차)

#### ntfy 경과 알림 시스템
- [x] quick/rate.html 경과 전용 페이지 (3버튼 + 2단계 확인)
- [x] 클라이언트 타이머 (중복 방지), 기본/커스텀 알림 시간
- [x] ntfy 토픽 클라우드 동기화 (quickLogs config 항목)

#### quick.html 개선
- [x] 추정 트리거 16개, 날씨 자동 수집, painType 표시
- [x] 커스텀 칩 클라우드 동기화 + 기록 기반 복구

#### 날씨 + 트리거 상관분석
- [x] AI 컨텍스트에 [날씨-두통 데이터] + [트리거 상관분석] 포함
- [x] 저기압(<1010hPa) 자동 트리거 분석

#### 기타
- [x] Grok 4 + 4.1 Fast 모델 추가
- [x] 세션 진행 중 "🔄 새 질문" 버튼, 알림 on/off 토글
- [x] 생리주기 사진/파일 업로드 (카메라+갤러리+파일)
- [x] 코드 감사 완료 (SW xAI 제외, light→basic, PRECACHE 보강)

### 주요 아키텍처
- **세션 모드**: 기본(3AI) / 심층(5AI) / 디베이트 / Grok Multi-Agent / 빠른질문
- **경과**: rate.html + 클라이언트 타이머 + outcomeNotifyAt 기록 저장
- **날씨/트리거**: getRecentLogSummary → getTriggerCorrelation → AI 자동 수신
- **약물 안전**: 내장DB(80) → 식약처DUR → Perplexity → localStorage 캐싱
- **커스텀 칩**: localStorage + 클라우드 + 기록 기반 복구 (3중 백업)

### 백업 브랜치
- `backup/v9.3` ← 현재
- `backup/v9.2` / `backup/v9.1` / `backup/v9.0` / `backup/v8.4`

### 다음 세션 작업
- **붕룩이 기록 포맷 개선** (핵심):
  질환관리 폼 → 카테고리별 전용 빠른 입력 (💊영양제/🏃운동/🔬검사/🏥치료)
  + 생리주기 캘린더에 모든 기록 아이콘 통합 표시
- startRandomDebate() 랜덤 팀 디베이트

### PR 워크플로우
1. PR 생성 → Gemini 리뷰 확인 → 반영 → 머지
2. 다음 작업 시 이전 PR의 Gemini 리뷰 확인

## 새 채팅 시작 시
```
CLAUDE.md와 HANDOFF.md 읽고 이어서 작업해줘.
PR 머지 후 Gemini 봇 리뷰를 확인하고 반영해줘.
```
