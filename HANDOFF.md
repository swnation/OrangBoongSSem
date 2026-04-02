# HANDOFF — v9.2 세션 이어받기 가이드

## 현재 상태: v9.2 (기능 1~6 완료, 기능 7 붕룩이 대시보드 구현 완료)

### 이번 세션 완료 작업 (PR #50~#71)

#### v9.2 핵심 기능 5개
- [x] 처치 효과 회고 → 경과 체계로 개편 (🟢호전/🟡비슷/🔴악화)
- [x] 트리거 기록 — 14개 칩 + 직접입력 + CSV/AI 연동
- [x] 날씨 자동 수집 — OpenWeatherMap API, 기록 시 자동 첨부
- [x] 통계 차트 강화 — 경과 통계/트리거-NRS/기압-NRS 산점도
- [x] 경량 모드 — ⚡ 빠른 체크 (AI 1개 자동 분석)

#### 경과 알림 시스템 (ntfy)
- [x] 붕쌤 토픽: 오랑이 두통 기록 시 즉시 알림
- [x] 오랑이 토픽: 2시간 후 경과 확인 푸시
- [x] 경과 수정: 태그 클릭 → 모달에서 재선택/삭제
- [x] 경과 통계: 약물별/시술별/자연경과 호전율

#### SSOT 관리
- [x] AI 통합 정리 + 최근 기록 반영 업그레이드
- [x] Drive 자동 백업 5개 유지 + 원클릭 복원
- [x] 진행 상태 표시 + 되돌리기

#### 기타 개선
- [x] 누적 지식 AI 정리 + API 키 Drive 백업/복원
- [x] 전체 AI 중단 버튼 + 빠른질문 UX
- [x] Grok Multi-Agent 수정 (getFullContext 헬퍼)
- [x] 머리 SVG → 몽치치 캐릭터 스타일
- [x] GitHub Actions 백업 브랜치 자동 정리

### 주요 아키텍처
- **AI 5개**: GPT, Claude, Gemini, Grok(xAI), Perplexity
- **세션 모드 5가지**: 일반 협진 / 디베이트 / Grok Multi-Agent / 빠른 질문 / 경량 모드
- **비용 최적화**: R1에서 Grok 제외, R2+에서 Perplexity 제외 (디베이트 모드 예외)
- **경과 체계**: better/same/worse (기존 good/partial/none 하위 호환)
- **ntfy 알림**: 붕쌤 즉시 + 오랑이 2시간 후 경과
- **컨텍스트**: `getFullContext(question)` 공통 헬퍼 — `buildUserPrompt`와 `runGrokMultiAgent`에서 공유
- **SSOT 백업**: Drive "Orangi SSOT Backups" 폴더, 최근 5개
- **붕룩이 대시보드**: 생리주기/일일체크/검사결과/마일스톤/약물안전 5개 탭

### 백업 브랜치 (최근 5개 유지)
- `backup/v9.2` ← v9.2 전체 기능
- `backup/v9.1` ← Gemini 리뷰 반영
- `backup/v9.0` ← 20개 신기능
- `backup/v8.4` ← 디베이트/빠른질문
- `backup/v8.3` ← KST/한영매핑/PDF
> GitHub Actions가 5개 초과 시 자동 삭제

### 남은 작업 (SPEC-v9.2 참조)
- ~~**기능 7: 붕룩이 전용 대시보드** — 생리주기/일일체크/검사결과/마일스톤/약물안전~~ ✅ 완료
- quick.html에 트리거 칩 + 경과 카드 미적용 (메인 앱만 구현)
- ntfy 2시간 알림: 현재 setTimeout (앱 켜있을 때만). GAS 서버 트리거가 최종 해결책
- startRandomDebate() 랜덤 팀 디베이트 — Grok 제안, 미구현
- grok-4.20-multi-agent-0309 모델 실제 동작 확인 필요

### PR 워크플로우
1. PR 생성 → 바로 머지 (대기 없음)
2. 다음 작업 시 이전 PR의 Gemini 리뷰 확인
3. 반영할 것 있으면 다음 커밋에 포함

## 새 채팅 시작 시
```
CLAUDE.md와 HANDOFF.md 읽고 이어서 작업해줘.
SPEC-v9.2.md도 확인해서 남은 작업(기능 7: 붕룩이 대시보드) 진행해줘.
PR 머지 후 Gemini 봇 리뷰를 확인하고 반영해줘.
```
