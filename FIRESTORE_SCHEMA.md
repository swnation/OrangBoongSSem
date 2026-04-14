# Firestore Schema — OrangBoongSSem

> 초안: 2026-04-14 | LOCALSTORAGE_AUDIT.md 기반

## 컬렉션 구조

```
users/{uid}
  ├─ settings/
  │   └─ app                    ← 앱 전역 설정
  │
  ├─ domains/{domainId}/
  │   ├─ meta/
  │   │   └─ main               ← 도메인 메타데이터
  │   ├─ customItems/
  │   │   ├─ meds               ← 커스텀 약물
  │   │   ├─ syms               ← 커스텀 증상
  │   │   ├─ tx                 ← 커스텀 치료
  │   │   ├─ pain               ← 커스텀 통증종류
  │   │   ├─ triggers           ← 커스텀 트리거
  │   │   ├─ sites_left         ← 커스텀 부위(왼)
  │   │   ├─ sites_right        ← 커스텀 부위(오)
  │   │   └─ hidden             ← 숨긴 칩 목록
  │   ├─ templates/{templateId} ← 프리셋/템플릿
  │   ├─ logs/{logId}           ← 증상/일지 기록 (Phase 2)
  │   ├─ sessions/{sessionId}   ← AI 세션 (Phase 2)
  │   └─ accumulated/
  │       └─ main               ← AI 축적 지식 (Phase 2)
  │
  └─ usage/{yyyy-mm}            ← 월별 비용 추적
```

## 문서 스키마

### `users/{uid}/settings/app`
```javascript
{
  models: { gpt: "gpt-5.4", claude: "claude-sonnet-4-6", ... },
  theme: "dark" | "light" | "auto",
  homeCards: { forecast: true, warnings: true, ... },
  homeCardOrder: ["forecast", "warnings", ...],
  lastDomain: "orangi-migraine",
  autoLogin: true,
  weatherKey: "owm_api_key",
  ntfyBung: "topic_name",
  ntfyOrangi: "topic_name",
  outcomeDelay: 120,
  medReminderDelay: 30,
  quickSyncUrl: "https://script.google.com/...",
  updatedAt: "2026-04-14T..."
}
```

### `users/{uid}/domains/{domainId}/customItems/{group}`
```javascript
{
  items: ["커스텀항목1", "커스텀항목2", ...],
  updatedAt: "2026-04-14T..."
}
```

### `users/{uid}/domains/{domainId}/templates/{templateId}`
```javascript
{
  name: "프리셋 이름",
  data: { nrs: 5, sites: [...], meds: [...], ... },
  createdAt: "2026-04-14T..."
}
```

### `users/{uid}/usage/{yyyy-mm}`
```javascript
{
  totals: { gpt: { in: 1000, out: 500, cost: 0.05 }, ... },
  calls: [
    { time: "...", model: "...", in: 100, out: 50, cost: 0.01, source: "session-r1" },
    ...
  ]
}
```

## 도메인 ID 목록
- `orangi-migraine` — 오랑이 편두통
- `orangi-mental` — 오랑이 마음관리
- `orangi-health` — 오랑이 건강관리
- `bung-mental` — 붕쌤 마음관리
- `bung-health` — 붕쌤 건강관리
- `bungruki` — 붕룩이 임신준비

## 비용 최적화 원칙
1. 앱 시작 시 settings + 현재 도메인 customItems만 로드 (2~3 reads)
2. 도메인 전환 시 해당 도메인 customItems 로드 (1 read)
3. 로그는 월 단위 페이지네이션 (필요 시만)
4. 대시보드는 monthlyStats 집계 문서 사용
5. 불필요한 실시간 리스너 지양
