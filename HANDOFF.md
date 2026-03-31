# HANDOFF — v9.1 세션 이어받기 가이드

## 현재 상태: v9.1 (v9.0 + 대규모 개선)

### v9.1 추가 작업 (이번 세션)
- [x] 머리 그림 SVG 리디자인 (타원형 터치 영역, 해부학적 얼굴)
- [x] PWA 아이콘 교체 (제미나이 디자인 OB 로고 + 두통 프로필)
- [x] 오류 AI만 재실행 (errorsOnly 파라미터)
- [x] AI 응답 간결화 (_CONCISE 규칙: 4~6문장, 서론/인사 금지)
- [x] 최신 모델 추가 (Gemini 3.1/3 Flash, GPT 5.4 Mini/4.1/o3, Sonar Reasoning)
- [x] AI 카드 모델 드롭다운 R0부터 표시
- [x] AI별 생성 중단 버튼 (AbortController)
- [x] AI 생성 타이머 + 45초 느림 경고
- [x] 에러 판별: startsWith('⚠️') → errors 플래그 객체
- [x] Grok (xAI) 5번째 AI 추가
- [x] 디베이트 5역할: 찬성/반대/중도(Grok)/심판(Claude)/팩트체크(Perplexity)
- [x] Grok Multi-Agent 모드 (4/8/16 에이전트, grok-4.20-multi-agent-0309)
- [x] API 키 AES-GCM 암호화 (PIN 기반 PBKDF2)
- [x] 커스텀 항목(직접입력) Google Drive 영구 저장
- [x] 주간 요약 일별 펼치기 + 증상 기록 날짜별 접기
- [x] 증상 기록 월 이동 (이전 달/다음 달)
- [x] 비용 최적화: R1에서 Grok 제외, R2+에서 Perp 제외
- [x] 누적 협진 지식 최근 10개 + 관련도 선별
- [x] R1 의견 충돌 감지 → R2 권장 메시지
- [x] icons 폴더 정리 (4개 파일만 유지)
- [x] Gemini 코드 리뷰 반영 (PR#35 에러플래그, 변수재활용, 버튼중복)

### 주요 아키텍처
- **AI 5개**: GPT, Claude, Gemini, Grok(xAI), Perplexity
- **Grok API**: https://api.x.ai/v1/chat/completions (OpenAI 호환)
- **세션 모드 4가지**: 일반 협진 / 디베이트 5역할 / Grok Multi-Agent / 빠른 질문
- **비용 최적화**: R1=GPT+Claude+Gemini+Perp, R2+=GPT+Claude+Gemini+Grok
- **API 키 보안**: PIN → PBKDF2 → AES-256-GCM. localStorage에 암호화만 저장
- **커스텀 항목**: master JSON의 _customItems에 포함 → Drive 동기화
- **간결 규칙**: _CONCISE 상수, 서론/인사/결론 금지, 항목당 1문장

### Apps Script 현황
- URL: https://script.google.com/macros/s/AKfycbzYF46qeLJRGIQsqfXbic6ITRGKr1eA9chrVJ8Fu5_gM7TDSYUFlpaWQGmSR9RdAACjzw/exec
- 기능: save / markSynced / replaceAll / delete + 이메일 알림 + 7일 자동 삭제

### PR 워크플로우
1. PR 생성 → 바로 머지 (대기 없음)
2. 다음 작업 시 이전 PR의 Gemini 리뷰 확인
3. 반영할 것 있으면 다음 커밋에 포함

### 백업 브랜치 (최근 5개 유지)
- `backup/v9.1` ← Gemini 리뷰 반영
- `backup/v9.0` ← 20개 신기능
- `backup/v8.4` ← 디베이트/빠른질문
- `backup/v8.3` ← KST/한영매핑/PDF
- `backup/v8.2` ← 질환 관리 통합
- ⚠️ `backup/v7.6`, `backup/v8.0`, `backup/v8.1` 삭제 필요 (사용자 수동)
> 버전업 시 CLAUDE.md "백업 자동화 절차" 섹션 필수 수행

### 알려진 이슈 / 남은 작업
- 두통 경과 추적 시스템 (원탭 경과 기록) — 설계 논의 완료, 미구현
- grok-4.20-multi-agent-0309 모델 실제 동작 확인 필요
- API 키 암호화 첫 실행 시 UX 확인 필요
- GitHub 백업 브랜치 삭제 도구 미지원 → 오래된 브랜치 수동 삭제 필요

## 새 채팅 시작 시
```
CLAUDE.md와 HANDOFF.md 읽고 이어서 작업해줘.
PR 머지 후 Gemini 봇 리뷰를 확인하고 반영해줘.
```
