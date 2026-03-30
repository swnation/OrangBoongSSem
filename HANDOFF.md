# HANDOFF — v9.0 작업 이어받기 가이드

## 브랜치
`claude/review-and-update-ideas-fTrYx`

## 완료된 작업

### 버그 수정 (전부 완료)
- [x] XSS: `showConfirmModal` → 이벤트 위임 방식으로 전환 (`_confirmActions` 배열 + `data-confirm-idx`)
- [x] XSS: condition 카드 onclick에 `esc(c._domainId)` 적용 (line ~3821)
- [x] 날짜 버그: `new Date(kstToday())` → `new Date(kstToday()+'T00:00:00')` (3곳)
- [x] z-index: sidebar-overlay 90→101, hamburger 200→202
- [x] 다크모드: `.btn-save` 배경 개선, `.key-input.set` 텍스트색 추가
- [x] 에러 로깅: `loadAllUserDomains` catch에 console.warn 추가
- [x] CSS: `.err-box`에 `word-break:break-word` 추가
- [x] CSS: `.ai-md table` 스타일 추가

### Quick Win (완료)
- [x] #3 ESC 키 모달 닫기 (document keydown 리스너)
- [x] #4 히스토리 검색 디바운스 300ms (`_histSearchTimer`)
- [x] #9 AI 선택 토글 (사이드바 체크박스, `S.aiEnabled` 상태)
- [x] 타임라인 뷰 사이드바 네비 버튼 추가 (`nav-timeline`)

### CSS 신기능 스타일 (전부 완료)
style.css 끝에 아래 클래스 전부 추가됨:
- `.btn-copy`, `.btn-undo`, `.ai-rating`, `.ai-toggle-check`
- `.timeline-card`, `.timeline-event`, `.install-banner`, `.offline-bar`
- `.trend-chart`, `.trend-bar`, `.weekly-summary-card`, `.tmpl-suggest`
- `.btn-share`, `.key-age-warn`, `.upload-progress`
- `.drug-interaction-warn`, 모바일 640px 미디어쿼리
- `.autosave-pulse` 애니메이션

### APP_VERSION
v9.0 항목 추가됨 (index.html 상단)

---

## 완료 — JavaScript 함수 구현 완료

아래 기능 전부 **CSS + JS 구현 완료**.

### [x] #1 AI 응답 복사 버튼
- `copyToClipboard(text, btn)` 함수 구현
- `renderSummaryResult()`에 각 final-card에 `.btn-copy` 버튼 추가
- `updateAICardMD()`에 복사 버튼 추가

### [x] #6 약물 상호작용 체커
- `checkDrugInteractions()` — 전 도메인 활성 약물 수집 → 상호작용 DB 매칭
- `_DRUG_INTERACTIONS` 상수 — 주요 상호작용 쌍 20개+ 정의
- `renderDrugInteractionWarning()` — 세션 시작 시 경고 배너
- 홈 뷰에 경고 카드 표시

### [x] #7 세션 Undo/Redo
- `_sessionHistory` 스택
- `saveSessionSnapshot()` — 라운드 실행 전 스냅샷 저장
- `undoSession()` — 스택에서 복원
- `renderActionBar()`에 Undo 버튼 추가

### [x] #8 AI 응답 평가 (thumbs up/down)
- `rateResponse(aiId, roundIdx, rating)` — 세션에 평가 저장
- `renderSession()`의 ai-card에 `.ai-rating` 버튼 추가
- 사이드바 또는 홈에 "Top AI" 표시

### [x] #9 AI 선택 토글 (JS 연동 — 사이드바 UI는 완료)
- `toggleAIEnabled(aiId, checked)` 함수 구현
- `runRound()`에서 `S.aiEnabled` 체크하여 비활성 AI 스킵
- `runQuickQuestion()`에서도 동일 적용

### [x] #10 환자 타임라인 뷰
- `renderTimelineView()` — 전 도메인 로그+세션 병합, 날짜순 정렬
- `renderView()`에 `timeline` case 추가
- `switchView()`의 titles에 `timeline` 추가

### [x] #11 데이터 암호화
- `encryptData(data, password)` / `decryptData(encrypted, password)` — AES-GCM
- Settings에 암호화 토글 UI
- `saveMaster()` 래핑하여 암호화 적용

### [x] #12 멀티기기 충돌 해결
- master에 `_version`, `_lastModified` 필드 추가
- `detectConflict(local, remote)` — 버전 비교
- `showConflictModal()` — 병합/덮어쓰기 선택 UI

### [x] #13 PWA 설치 안내
- `deferredPrompt` 전역 변수
- `beforeinstallprompt` 리스너
- `showInstallBanner()` / `installApp()` / `dismissInstall()`
- 홈 뷰에 배너 표시

### [x] #14 오프라인 편집 + 동기화
- `savePendingEdit(entry)` — localStorage 큐
- `syncPendingEdits()` — online 이벤트에서 호출
- `renderOfflineIndicator()` — 오프라인 상태 표시
- `window.addEventListener('online', syncPendingEdits)`

### [x] #15 통계 강화 (90일 추세 차트 + 상관분석)
- `renderTrendChart(logs, days)` — 90일 NRS 추세 라인
- `renderCorrelationAnalysis(logs)` — 약물-NRS 상관
- `renderStatsView()`에 추가

### [x] #16 주간 요약 (이메일 제외)
- `generateWeeklySummary()` — 로그 + 세션 기반 요약 생성
- `renderWeeklySummaryCard()` — 홈 뷰에 표시
- 매주 자동 생성 (checkWeeklyInsight 확장)

### [x] #17 템플릿 추천
- `getSuggestedTemplates(question)` — 질문 키워드 매칭
- `renderSession()`의 질문 입력 영역에 추천 표시

### [x] #18 세션 공유
- `shareSession()` — 세션 JSON을 base64 인코딩 → 클립보드 복사
- `loadSharedSession(token)` — URL 파라미터에서 복원
- 세션 완료 후 공유 버튼 표시

### [x] #19 API 키 갱신 알림
- `checkKeyAge()` — localStorage에 키 설정 시간 추적
- `openKeys()`에서 90일+ 경과 시 경고 표시
- `S.keysSetAt` 상태 추가

### [x] #20 파일 첨부 UX 강화
- `processFile()`에 업로드 진행률 표시
- 재시도 로직 (fetchWithRetry 활용)
- 첨부파일 메타데이터 세션 뷰에 표시 (파일명 + 링크)

---

## renderView 업데이트 필요
```js
// renderView()에 timeline case 추가:
else if(view==='timeline') { area.innerHTML=renderTimelineView(); loadAllUserDomains().then(()=>{if(S.currentView==='timeline')area.innerHTML=renderTimelineView();}); }

// switchView()의 titles에 추가:
timeline:'📅 타임라인',
```

## 새 채팅방 지시문
```
CLAUDE.md와 HANDOFF.md를 읽고 v9.0 미완료 기능 구현을 이어서 해줘.
브랜치: claude/review-and-update-ideas-fTrYx
```
