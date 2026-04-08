# HANDOFF — v9.7 세션 인수인계 가이드

## 현재 상태: v9.7 완료
- 브랜치: main (최신)
- SW CACHE_NAME: v97q
- APP_VERSION: v9.7

## 이번 세션 완료 (v9.7)

### 버그 수정
- **데일리체크 캘린더**: bungruki 도메인에서 오랑이 엔트리 필터링 (`_isBungEntry` 함수)
- **경과 알림(quick.html)**: 클라이언트 setTimeout → ntfy 서버사이드 `?delay=Xm` 스케줄링

### 그룹 1: 데이터 무결성
- 데일리체크↔메인앱 양방향 자동 동기화 (visibilitychange 기반)
  - bung/index.html: 탭 전환 시 현재 월 캐시 무효화 + Drive 리로드
  - js/log.js: `_syncReloadCurrentMonth()` — 포그라운드 복귀 시 logData 새로고침
- medCheck 키 정규화 유틸: `_normalizeMedCheckKeys()` — 약물 변경이력 기준 유사도 매칭

### 그룹 2: 임신준비
- **관계 기록↔가임기 매칭**: `_brkRenderIntimacy()` 카테고리 추가
  - `_getFertileStatus()`: 생리주기 기반 가임기/배란일/비가임기 자동 판정
  - 캘린더에 ❤️ 아이콘 표시
  - 최근 관계 기록 + 가임기 매칭 배지
- **정액검사 비교 차트**: volume 추가, 최근 2회 비교 카드 (↑↓ 화살표 + % 변화)

### 그룹 3: AI 활용
- **AI 일일 요약**: `_aiDailySummary()` — 오늘 기록 기반 AI 요약 (통계뷰)
- **월간 패턴 인사이트**: `_aiMonthlyInsight()` — 패턴/약물효과/주의점/제안 (통계뷰)
- **OCR 선택적 재분석**: AI 선택 드롭다운 + 누락 필드 표시 (`_brkMissingFieldsHtml`)

### 그룹 4: UX
- **오프라인 데일리체크**: `_offlineSave()`/`_syncOfflinePending()` — localStorage 임시저장 → 온라인 시 자동 동기화
- **홈 대시보드 커스텀**: `_HOME_CARDS` 배열 + localStorage 토글 — 카드 표시/숨김 설정

### 그룹 5: 버전업
- APP_VERSION v9.7 추가
- SW CACHE_NAME v97q
- backup/v9.7 브랜치 생성 예정

## 다음 세션 TODO

### 데이터
- [ ] 데일리체크 일괄입력 오프라인 지원
- [ ] medCheck 마이그레이션 — 전체 월 스캔 (현재는 현재 달만)

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
- PR은 큰 변화마다 만들어서 Gemini 리뷰 받기
- 코드 변경 시 sw.js CACHE_NAME 반드시 올리기 (현재 v97q)
- undo/redo: 요약/병합 등 데이터 변경 기능에는 항상 _pushUndo 호출
- medCheck 저장: replace (merge 아님) — 키 불일치 방지
- ntfy 경과 알림: 서버사이드 `?delay=Xm` 방식 — 재스케줄 시 중복 알림 가능성 있음

## 15개 JS 모듈 + 독립 페이지
| 파일 | 역할 |
|------|------|
| constants.js | 상수 (DOMAINS, AI, APP_VERSION, USER_PROFILES, PRICE_TABLE) |
| state.js | 전역 상태 S 객체 |
| utils.js | 유틸리티 (esc, kstToday, 모달, 토스트) |
| crypto.js | API 키 AES-256-GCM 암호화 |
| drive.js | Google Drive + OAuth + 자동로그인 + signOut |
| cost.js | 비용 추적 (전체 도메인 합산) |
| ai-api.js | 5개 AI SSE 스트리밍 + 공유 프로필 컨텍스트 |
| session.js | 세션/디베이트/요약 |
| head-diagram.js | SVG 머리 다이어그램 |
| log.js | 증상 기록 + medCheck + undo/redo + timeline 병합 + 양방향 동기화 |
| conditions.js | 질환관리 + trackCompliance + 약물변경이력 |
| bungruki.js | 임신 준비 대시보드 + 검사결과 + 확률 + 관계기록 |
| settings.js | API 키 + 모델 선택 + 컨텍스트 편집 |
| pwa.js | PWA + 알림 + SW 업데이트 |
| views.js | 뷰 렌더링 + 캘린더 + 붕룩이 통계 + AI 인사이트 + 홈 커스텀 |
| bung/index.html | 붕쌤 데일리체크 (독립 페이지, 오프라인 지원) |
| quick/index.html | 두통 빠른 기록 (독립 페이지, 서버사이드 알림) |

## 새 채팅 시작 시
```
CLAUDE.md와 HANDOFF.md 읽고 이어서 작업해줘.
```
