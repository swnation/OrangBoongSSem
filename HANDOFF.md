# HANDOFF — v9.7 세션 인수인계 가이드

## 현재 상태: v9.7 완료 (main 최신)
- 브랜치: main
- SW CACHE_NAME: v97z14
- APP_VERSION: v9.7
- backup/v9.7 브랜치 생성 완료

## 이번 세션 완료

### 버그 수정
- 데일리체크 캘린더: bungruki 오랑이 엔트리 필터링 (`_isBungEntry`)
- 경과 알림: 클라이언트 setTimeout → ntfy 서버사이드 `?delay=Xm`
- saveBulk `_isBungEntry` 필터 누락
- 검사결과 인덱스→ID 기반 조회 (sorted index 불일치)
- GPT Vision: `max_tokens`→`max_completion_tokens`, `detail:'high'`
- Claude Vision: 5MB 초과 이미지 → 분할 전송 (해상도 유지)
- 멀티AI 단독분석 시 "?확인"→"◆단독" 신뢰도 표시
- showConfirmModal 취소 버튼 중복 제거
- 정액검사/호르몬 수치: 단위 포함 키 부분 매칭 (`_normalizeSemenValues`, `_hv()`)
- 검사결과 해석: 하드코딩 판정 제거 → AI opinion + ref 범위만 사용
- journal-nrs oninput dead code 제거 (Gemini #162 리뷰)

### 신규 기능
- 데일리체크↔메인앱 양방향 동기화 (visibilitychange)
- medCheck 키 정규화 유틸
- 관계 기록↔가임기 자동 매칭 (`_brkRenderIntimacy`, `_getFertileStatus`)
- 정액검사 비교 차트 (↑↓ + %)
- AI 일일 요약 + 월간 패턴 인사이트 (통계뷰)
- 검사결과 다중 사진 업로드 (미리보기 → 확인 후 분석)
- 사진분석 AI 모델 선택 + 추천 (Gemini⭐/Claude/GPT)
- 멀티 AI 병렬 분석 (교차 검증 + 수치 합의)
- 멀티AI 실패 시 재시도/제외/중단 선택
- AI 불일치 항목: AI별 비교 + 원본 이미지 참조 + 수동 입력
- 진행률 UI (프로그레스 바 + % + 중단 버튼)
- 큰 이미지 분할 전송 (해상도 유지, 2~4등분)
- 검사결과 단위 + 참고치(ref) 범위 포함, 검사지 우선
- 일반 참고치 선택적 추가 (`_STD_REF`)
- Vision AI 비용 추적 (`recordUsage` 전 경로 적용)
- 두통 기록 약물 복용 추적 알림 (ntfy 서버사이드, 시간 설정 가능)
- 목록에서 "💊 복용 추가" 버튼 + quickAddMeds 모달
- 오프라인 데일리체크 (localStorage 폴백 → 온라인 자동 동기화)
- 홈 대시보드 카드 선택/숨김 커스텀
- 설정 클라우드 우선 저장 (홈카드/알림시간/커스텀영양제 → Drive)
- 예방접종 추적 (건강관리 도메인 + 붕룩이 임신접종 공유)
  - KDCA 2024 기준 19종 + 카테고리별 그룹
  - 차수 선택 + 부스터 접종
  - 유연한 날짜 (정확/연도만/모름)
  - 상태: 접종완료/어릴때접종/항체확인/항체미형성(non-responder)
  - 접기/펼치기, 다중선택삭제, 잠금🔒, 이름수정
  - 검사결과 항체 → 접종 자동 기록 연동
- OCR 선택적 재분석 + 누락필드 표시

### CLAUDE.md 규칙 추가 (#21-36)
사용자 핵심 원칙: #21 설정 커스텀, #22 클라우드 우선, #23 AI 모델 업데이트, #24 AI undo, #25 정기 백업
구현 규칙: #26 ID기반조회, #27 확인후실행, #28 AI모델선택권, #29 서버사이드스케줄링, #30 who필터, #31 도메인간동기화, #32 UI/UX가독성, #33 공인출처, #34 진행률UI, #35 실패시재시도/제외/중단, #36 AI비용추적필수

## 다음 세션 TODO

### 데이터
- [ ] 검사결과 ref 없는 기존 데이터에 일반 참고치 일괄 적용 옵션
- [ ] medCheck 마이그레이션 — 전체 월 스캔

### 임신준비
- [ ] 관계 기록 빈도 통계 + 가임기 적중률 차트
- [ ] 붕룩이 통계에 관계/가임기 분석 포함

### AI
- [ ] AI 요약 결과 마스터에 저장 (히스토리)
- [ ] 약물 변경 전후 AI 비교 분석

### UX
- [ ] 홈 대시보드 카드 드래그 정렬
- [ ] 데일리체크 위젯 (PWA shortcut)

## 주의사항
- sw.js CACHE_NAME 현재 v97z14
- 검사결과 값 접근 시 **반드시 부분 매칭** (단위 포함 키 대응)
- ntfy 경과/약물 알림: 서버사이드 `?delay=Xm`
- Vision AI 호출 시 반드시 `recordUsage` 포함
- 예방접종 변경 시 건강관리↔붕룩이 양쪽 반영

## 새 채팅 시작 시
```
CLAUDE.md와 HANDOFF.md 읽고 이어서 작업해줘.
```
