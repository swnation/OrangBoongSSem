# HANDOFF — v9.4 세션 이어받기 가이드

## 현재 상태: v9.4 (모듈화 완료 + ntfy 액션버튼 + 경과동기화 + 머리다이어그램 개선)

### 모듈화 완료 (Phase 1~6)

index.html의 ~7500줄 단일 파일을 15개 JS 모듈로 분리 완료.
`backup/pre-modular` 브랜치에 모듈화 전 상태 보존됨 (롤백 가능).

**15개 JS 모듈 (js/ 디렉토리):**
| 파일 | 줄 수 | 역할 |
|------|--------|------|
| constants.js | 407 | 상수 정의 (DOMAINS, AI_LIST, APP_VERSION 등) |
| state.js | 34 | 전역 상태 S 객체 |
| utils.js | 69 | 유틸리티 함수 (esc, kstToday 등) |
| crypto.js | 93 | API 키 AES-256-GCM 암호화 |
| drive.js | 440 | Google Drive API + OAuth2 |
| cost.js | 31 | 비용 추적 |
| ai-api.js | 265 | AI API 호출 (SSE 스트리밍) |
| session.js | 691 | 세션 관리 (R1/R2/디베이트) |
| head-diagram.js | 112 | 머리 다이어그램 SVG |
| log.js | 1608 | 증상 기록 폼 + 자동완성 |
| conditions.js | 1419 | 질환 관리 + 투약 |
| bungruki.js | 1195 | 임신 준비 대시보드 |
| settings.js | 625 | 설정 + 컨텍스트 관리 |
| pwa.js | 307 | PWA + 오프라인 캐시 |
| views.js | 2520 | 뷰 렌더링 (home/session/stats 등) |

**index.html**: 233줄 (HTML + 최소 부트스트랩 JS)
**총합**: ~10,133줄 (15개 JS + index.html + sw.js)

**로드 순서**: constants → state → utils → crypto → drive → cost → ai-api → session → head-diagram → log → conditions → bungruki → settings → pwa → views → inline bootstrap

**방식**: 일반 `<script src>` (ES 모듈 아님). 모든 함수/변수는 전역 스코프.

### 이전 세션 완료 작업 (PR #123~#136)

#### ntfy 경과 알림 개선
- [x] 경과 알림 URL 3개 나열 → 쿼리 파라미터 액션 버튼 1회 전송
- [x] Cloudflare Worker 시도 → 429 rate limit으로 제거
- [x] ntfy 쿼리 파라미터(?title=&actions=)로 버튼 직접 전송 (Worker 불필요)
- [x] URL #hash → ?query 방식으로 변경 (encodeURIComponent 안정성)
- [x] rate.html parseParams()가 ?query(신) + #hash(구) 모두 지원

#### 경과(Outcome) 동기화
- [x] rate.html → quick앱: visibilitychange에서 현재 탭 리렌더
- [x] quick앱 fetchCloudStatus: 클라우드 outcome을 로컬에 반영
- [x] 메인앱 pollCloudQuickLogs: outcome 변경 감지 + 반영
- [x] WebView(ntfy 내장 브라우저) localStorage 격리 문제 해결

#### rate.html 기능 추가
- [x] 🤷 기억 안 나요 버튼 추가 (4번째 선택지)
- [x] hash regex + 타임라인에 unknown 지원

#### 머리 다이어그램 대폭 개선
- [x] 정면/후면 가로 배치(각 44vw) → 탭 전환(80vw) — 이미지 2배 확대
- [x] 기본 정면 표시, 후두부 칩 선택 시 자동 후면 전환
- [x] SVG 좌표 얼굴 위치에 맞게 전면 재조정
- [x] 관자놀이: ellipse → rect, 얼굴 옆면 밀착
- [x] 눈썹: 점선 테두리로 이마와 시각적 구분
- [x] 배경 투명도 0.10→0.15 (영역 가시성 개선)

#### 붕룩이 리팩토링 (Gemini 리뷰 반영)
- [x] BRK_SUPPL_ORANGI/BUNG 전역 상수 추출
- [x] _getBrkWhoData() 헬퍼 (selDate 포함 반환)
- [x] brk 함수 보일러플레이트 제거 (8개 함수)
- [x] brkToggleAlcohol 붕쌤 전용 주석 명확화

#### Gemini PR 리뷰 반영 (6회분)
- [x] PR#123: 영양제키 상수화 + brk 헬퍼 추출
- [x] PR#124: fBody 빈문자열 처리 + 테스트 알림 줄바꿈
- [x] PR#125: selDate 반환 + syncNtfy 조건 + console.warn
- [x] PR#128: actions 중복 지적 (헬퍼 추출은 보류)
- [x] PR#129: visibilitychange 탭 감지 간결화
- [x] PR#134: SVG 중복 지적 (별도 앱이라 의도적 유지)

#### 버전업
- [x] APP_VERSION v9.4 추가
- [x] backup/v9.4 브랜치 생성
- [x] CLAUDE.md 백업 브랜치 목록 갱신

### 주요 아키텍처 변경점
- **ntfy 액션 버튼**: 쿼리 파라미터 방식 (`?title=&actions=view,라벨,URL;...`)
- **rate.html URL**: `?r=better&id=123` (기존 `#rate-better-123`도 하위 호환)
- **outcome 동기화**: rate.html → cloud → quick앱/메인앱 (3중 경로)
- **머리 다이어그램**: `_headView` / `_mainHeadView` 상태 변수로 탭 전환
- **관자놀이 SVG**: ellipse → rect (syncHeadDiagram에서 fill 설정 동일하게 동작)

### 백업 브랜치
- `backup/v9.4` / `backup/v9.3` / `backup/v9.2` / `backup/v9.1` / `backup/v9.0` (5개 유지)

#### Gemini PR#136~#143 리뷰 반영
- [x] SVG 하드코딩 좌표 → `_FRONT_REGIONS`/`_BACK_REGIONS`/`_SIDE_LABELS` 상수 추출
- [x] `_buildRegionSVG()` 빌더 함수로 SVG 생성 로직 통합
- [x] `_SIDE_COLORS` 상수로 좌/우/양측 색상 관리
- [x] quick/index.html `var`→`const` 4개 상수
- [x] 다크모드 라벨 stroke 분기 (라이트: 검정 반투명, 다크: 흰색 반투명)
- [x] sync 함수에서 `_SIDE_COLORS` 상수 사용 + 선택 부위 drop-shadow 발광 효과

### 미완료/다음 세션 작업
- [ ] ntfy 액션 버튼 실제 테스트 확인 (쿼리 파라미터 방식 버튼 표시 여부)
- [ ] Cloudflare Worker 삭제 (raspy-voice-8a1b, 더 이상 미사용 — Cloudflare 대시보드에서 수동 삭제)

### 향후 개선 (선택)
- [ ] ES 모듈 전환 (`<script type="module">` + import/export) — 현재는 전역 스코프로 동작 중
- [ ] 편두통 일기예보 기능
- [ ] 기타 미구현 피처

### PR 워크플로우
1. PR 생성 → Gemini 리뷰 확인 → 반영 → 머지
2. 다음 작업 시 이전 PR의 Gemini 리뷰 확인

## 새 채팅 시작 시
```
CLAUDE.md와 HANDOFF.md 읽고 이어서 작업해줘.
PR 머지 후 Gemini 봇 리뷰를 확인하고 반영해줘.
```
