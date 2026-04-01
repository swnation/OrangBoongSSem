# HANDOFF — v9.2 세션 이어받기 가이드

## 현재 상태: v9.2 (v9.1 + 5대 신기능)

### v9.2 추가 작업 (이번 세션)
- [x] 처치 효과 회고 — 미평가 기록 원탭 평가 (좋음/나아짐/안들음)
- [x] 트리거 기록 — 14개 칩 + 직접입력 + CSV/AI 연동
- [x] 날씨 자동 수집 — OpenWeatherMap API, 기록 시 자동 첨부
- [x] 통계 차트 강화 — 약물 효과율/트리거-NRS/기압-NRS 산점도
- [x] 경량 모드 — ⚡ 빠른 체크 (AI 1개 자동 분석)
- [x] SSOT 컨텍스트 AI 통합 정리 + Drive 백업 5개 유지
- [x] SSOT 최근 기록 반영 업그레이드 기능
- [x] 누적 지식 AI 정리 (중복 제거/병합/재분류)
- [x] API 키 Drive 백업/복원 (로컬 4 + Drive 4)
- [x] 전체 AI 중단 버튼
- [x] 빠른질문 UX 개선 (선택→하이라이트→시작 분리)
- [x] Grok Multi-Agent 카드 정리 (Grok만 표시)
- [x] 증상 기록 이전 달 기록 없으면 이동 차단
- [x] getFullContext() 헬퍼 추출 (중복 제거)
- [x] GitHub Actions 백업 브랜치 자동 정리

### v9.1 이전 작업
- Grok 5번째 AI + 디베이트 5역할 + Multi-Agent
- API 키 AES-GCM 암호화 (PIN 기반)
- 비용 최적화 (R1 Grok 제외, R2+ Perp 제외, debate 예외)
- 머리 그림 SVG + PWA 아이콘 + AI 생성 타이머

### 주요 아키텍처
- **AI 5개**: GPT, Claude, Gemini, Grok(xAI), Perplexity
- **세션 모드 6가지**: 일반 협진 / 디베이트 / Grok Multi-Agent / 빠른 질문 / 빠른 체크(light) / 경량
- **비용 최적화**: R1=GPT+Claude+Gemini+Perp, R2+=GPT+Claude+Gemini+Grok (debate 예외)
- **컨텍스트**: `getFullContext(question)` 공통 헬퍼 (buildUserPrompt + runGrokMultiAgent 공유)
- **SSOT 백업**: Drive "Orangi SSOT Backups" 폴더, 최근 5개 유지
- **API 키 백업**: 로컬 파일 + Drive "Orangi Settings" 폴더 (8자 이상 암호)

### 백업 브랜치 (최근 5개 유지)
- `backup/v9.2` ← 처치회고/트리거/날씨/차트/경량모드
- `backup/v9.1` ← Gemini 리뷰 반영
- `backup/v9.0` ← 20개 신기능
- `backup/v8.4` ← 디베이트/빠른질문
- `backup/v8.3` ← KST/한영매핑/PDF
> GitHub Actions가 5개 초과 시 자동 삭제

### 알려진 이슈 / 남은 작업
- grok-4.20-multi-agent-0309 모델 실제 동작 확인 필요
- quick.html에 트리거 칩 + 회고 카드 미적용 (메인 앱만 구현)
- startRandomDebate() 랜덤 팀 디베이트 — Grok 제안, 미구현

### PR 워크플로우
1. PR 생성 → 바로 머지 (대기 없음)
2. 다음 작업 시 이전 PR의 Gemini 리뷰 확인
3. 반영할 것 있으면 다음 커밋에 포함

## 새 채팅 시작 시
```
CLAUDE.md와 HANDOFF.md 읽고 이어서 작업해줘.
PR 머지 후 Gemini 봇 리뷰를 확인하고 반영해줘.
```
