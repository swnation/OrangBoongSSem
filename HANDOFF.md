# HANDOFF — v9.2 세션 이어받기 가이드

## 현재 상태: v9.2 (전체 기능 완료 + UX 대규모 개선)

### 이번 세션 완료 작업 (PR #73~#83 + main 직접 커밋)

#### 붕룩이 대시보드 (기능 7) — PR #73~#74
- [x] 생리주기 트래커 (캘린더, 배란 추정, 가임기, 예측)
- [x] 일일 체크리스트 (오랑이/붕쌤 탭, 영양제·운동·체중, 주간 요약)
- [x] 검사 결과 관리 (정액/혈액/호르몬/초음파, 추세 차트)
- [x] 프리컨셉션 마일스톤 (14개 기본, 진행률 바, 추가/삭제)
- [x] 약물 안전 등급 (교차 도메인, FDA A~X 뱃지)
- [x] meds 뷰 분기 + 생리주기→편두통 교차 태그

#### 몽치치 머리 이미지 — PR #75~#82
- [x] SVG 손그림 → 실제 3D 몽치치 이미지로 교체
- [x] 정면/후면 600x500 동일 크기
- [x] 투명 SVG 오버레이로 인터랙티브 클릭 영역 유지
- [x] quick.html도 동일 이미지 적용

#### ntfy 알림 수정
- [x] CORS 문제 해결 — 단순 POST (커스텀 헤더/JSON 없이)
- [x] quick.html에서만 ntfy 발송 (메인앱은 본인 기록이라 불필요)
- [x] 경과 알림: setTimeout → ntfy 예약 발송 (At: 2h) — 앱 꺼도 작동
- [x] SW에서 ntfy.sh 도메인 제외
- [x] API 키 설정에 테스트 알림 버튼 추가

#### 붕룩이 UX 개선
- [x] 사이드바 탭명: 🍼 임신 준비 대시보드 / 📝 일지 기록 / 📈 임신 준비 통계
- [x] 일일체크 "☁️ 자동 저장" 인디케이터
- [x] 생리주기 양/강도 "기록 안함" 옵션
- [x] 📷 사진에서 읽기 — AI Vision으로 생리주기 날짜 추출
- [x] 증상기록→대시보드 바로가기 안내

#### 경과 시스템 강화
- [x] quick.html에 🩺 경과 탭 추가 (기록/경과/목록 3탭)
- [x] 호전/비슷/악화 + 🤷 기억 안남 옵션
- [x] 경과 삭제/수정 가능
- [x] 메인앱 로그 목록에 "+ 경과" 태그 (미평가 기록)
- [x] 경과 알림 테스트 버튼 (quick.html)
- [x] 표시 기간 3일로 제한

#### Grok 수정
- [x] Multi-Agent: grok-4.20-multi-agent 모델 + /v1/responses API
- [x] 스트리밍 비용 추적: stream_options.include_usage 추가

#### 기타
- [x] +고정 항목 Drive 영속화 (_syncCustomItemsToMaster + saveMaster)
- [x] triggers를 _CUSTOM_KEYS에 추가
- [x] API 키 백업에 ntfy/날씨/동기화URL 포함
- [x] 질문 템플릿: 수정 기능 + 도메인별 추천 템플릿
- [x] 세션에서 템플릿 다중 선택 → 복합 질문
- [x] Gemini 리뷰 반영 (PR #73~#82 전부)

### 주요 아키텍처
- **AI 5개**: GPT, Claude, Gemini, Grok(xAI), Perplexity
- **세션 모드 5가지**: 일반 협진 / 디베이트 / Grok Multi-Agent / 빠른 질문 / 경량 모드
- **Grok Multi-Agent**: grok-4.20-multi-agent 모델, /v1/responses 엔드포인트
- **비용 최적화**: R1에서 Grok 제외, R2+에서 Perplexity 제외 (디베이트 모드 예외)
- **경과 체계**: better/same/worse/unknown (기존 good/partial/none 하위 호환)
- **ntfy 알림**: quick.html → 붕쌤 즉시 + 오랑이 2시간 예약발송(At: 2h)
- **컨텍스트**: `getFullContext(question)` 공통 헬퍼
- **SSOT 백업**: Drive "Orangi SSOT Backups" 폴더, 최근 5개
- **붕룩이 대시보드**: 생리주기/일일체크/검사결과/마일스톤/약물안전 5개 탭
- **머리 이미지**: icons/head-front.png, head-back.png (600x500) + SVG 오버레이
- **커스텀 항목**: localStorage + Drive 동기화 (_syncCustomItemsToMaster)

### 백업 브랜치 (최근 5개 유지)
- `backup/v9.2` ← v9.2 전체 기능
- `backup/v9.1` ← Gemini 리뷰 반영
- `backup/v9.0` ← 20개 신기능
- `backup/v8.4` ← 디베이트/빠른질문
- `backup/v8.3` ← KST/한영매핑/PDF
> GitHub Actions가 5개 초과 시 자동 삭제

### 남은 작업
- quick.html에 트리거 칩 미적용 (메인 앱만 구현)
- startRandomDebate() 랜덤 팀 디베이트 — 미구현
- 머리 이미지 클릭 영역 미세 조정 필요할 수 있음

### PR 워크플로우
1. PR 생성 → 바로 머지 (대기 없음)
2. 다음 작업 시 이전 PR의 Gemini 리뷰 확인
3. 반영할 것 있으면 다음 커밋에 포함

## 새 채팅 시작 시
```
CLAUDE.md와 HANDOFF.md 읽고 이어서 작업해줘.
PR 머지 후 Gemini 봇 리뷰를 확인하고 반영해줘.
```
