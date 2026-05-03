# Claude Code Handoff — Family-Health-system-by-BoongSSem

## 0. Claude Code 세션 피드백 (2026-04-14)

> 아래는 Claude Code가 현재 OrangBoongSSem 코드베이스를 12건 PR로 개선한 뒤,
> 이 핸드오프 문서를 검토하고 남기는 피드백입니다.

### 현재 시스템 현황 (OrangBoongSSem)
- **15개 JS 모듈, 80K+ 라인**, 3개 앱 (메인/quick/bung)
- 이번 세션(PR #169~#180)에서 추가된 검증 완료 기능:
  - 편두통 일기예보 (5요소 위험도 분석 + 상세 근거)
  - 경과 자동 감지 (NRS 시간대별 변화 기반)
  - 약물 복용량 추적 + 24시간 과량 경고
  - 약물→영양제 자동 연동
  - 검사 아카이브 검색/영문명/날짜표
  - quick↔메인 양방향 커스텀 항목 동기화

### 핵심 피드백

#### 1. 점진적 마이그레이션 권장 (새 레포 X, 이 레포에서 전환)
- 현재 80K+ 라인을 새 레포로 포팅하면 기능 손실 위험이 큼
- **이 레포 안에서** Firebase adapter를 추가하고, 기존 코드를 점진적으로 교체하는 방식 권장
- 기존 기능이 동작하는 상태에서 한 모듈씩 전환 → 안전

#### 2. Storage Adapter가 최우선
- 현재 `localStorage.getItem/setItem` 직접 호출이 수백 군데
- `src/storage/adapter.ts` 인터페이스를 먼저 만들고
- `memory.ts` (현재 세션) → `firestore.ts` (영속) 로 교체하는 구조
- 기존 코드의 localStorage 호출을 adapter 호출로 점진적 교체

#### 3. Phase 2 (settings/customItems)부터 시작하면 즉시 효과
- settings, customItems, notification preferences는 Firestore 이관이 쉬움
- 이것만 해도 **기기 간 동기화** 문제 해결 (현재 최대 페인포인트)
- 로그/세션은 나중에 (데이터량이 크고 마이그레이션 복잡)

#### 4. ntfy는 제외
- 현재 ntfy 알림 시스템은 이 아키텍처 전환에서 제외
- 나중에 Cloud Functions로 알림 시스템을 재설계할 때 다시 고려

#### 5. 다중 사용자 확장 고려
- 현재 `DOMAINS` 구조 (orangi-migraine, bung-mental 등)는 이미 **유저별 도메인 분리** 패턴
- Firebase에서 `users/{uid}/domains/{domainId}` 로 자연스럽게 매핑
- 향후 가족 건강관리 → 병원 환자 관리로 확장 시:
  - `roles: {doctor, patient, caregiver}` 추가
  - Firestore 보안규칙으로 접근 제어
  - Cloud Functions로 AI 키 서버사이드 관리

#### 6. 재활용 가능한 핵심 모듈
| 모듈 | 파일 | 재활용 가치 |
|------|------|------------|
| AI 협진 | ai-api.js | SSE 스트리밍, 5개 프로바이더, 비용 추적 |
| 검사 표준화 | checkup.js | 200+ 표준 검사 사전, AI-first 정규화, 대분류 |
| 약물 안전 | bungruki.js | 임신 안전등급, 남성 가임력, 상호작용 |
| 약물 사전 | conditions.js | 식약처 API, 한영 매핑 310쌍, 질환→약물 추천 |
| 비용 추적 | cost.js | 모델별 가격, source 태깅, breakdown UI |

### 제안하는 첫 번째 작업 순서
1. `src/storage/adapter.ts` 인터페이스 정의
2. `src/storage/memory.ts` 구현 (현재 동작과 동일)
3. Firebase 프로젝트 설정 + `src/storage/firestore.ts` 스캐폴드
4. settings/customItems를 adapter 경유로 변경
5. 기존 15개 모듈의 localStorage 호출을 점진적으로 adapter로 교체

---

## 1. Project intent
This repository will become the **personal-use main codebase** for a family health system.

Short-term goal:
- keep the repository **public** so multiple AI tools can read the codebase
- keep **all personal/medical data outside GitHub**
- remove **persistent local browser storage** as a source of truth
- move toward a **Firebase-first architecture**

Long-term goal:
- finish/stabilize the system here
- later create a separate public-facing/open-source version if needed

---

## 2. Core decisions already made

### 2.1 Repository policy
- This repo stays **public** for now.
- **No real personal data** should ever be committed.
- Code, docs, examples, mocks, and schemas are allowed.
- Real records, screenshots, reports, raw medical files, API secrets, and personal JSON data are **not allowed in Git**.

### 2.2 Storage policy
- **Do not use localStorage as persistent storage.**
- Temporary **in-memory cache is allowed** for current-session UX only.
- Main persistent store should be **Firebase**.
- Google Drive can remain a **future backup/export channel**, but it is **not the primary data store** in the new architecture.

### 2.3 Backend direction
Use Firebase as the primary platform.

Preferred order:
1. **Firebase Auth**
2. **Firestore** as main database
3. **Firebase Storage** only when needed for attachments/files
4. **Cloud Functions** later for server-side secrets, notifications, AI proxying, scheduled jobs

### 2.4 Security policy
- No real secrets in the repo.
- No browser-persistent secret storage.
- Do not assume client-side secrecy.
- Long-term, AI provider keys should be moved behind **Cloud Functions** or another server-side layer.

---

## 3. Why Firebase-first
The previous system architecture evolved around browser state, Google Drive JSON, and local persistence.
That was practical, but the next phase needs:
- better multi-device consistency
- partial document updates
- better app-like persistence semantics
- less dependence on browser-local state
- easier future migration to production-grade backend patterns

Firebase is preferred because:
- Firestore fits document-oriented health/session/log data well
- Auth gives a clean user boundary
- Cloud Functions can later own secrets and scheduled work
- Firebase should be stable and fast enough for this scale

Cost concern exists, so the implementation should be designed to minimize reads/writes.

---

## 4. Cost and performance constraints
Design for **low Firestore read volume**.

### 4.1 Do
- load only required documents for the active screen
- query logs by date range, limit, or pagination
- keep dashboard queries narrow
- use derived/aggregated documents where useful
- avoid reloading entire history on every view switch
- prefer explicit fetches over many always-on listeners

### 4.2 Avoid
- reading all logs from all domains on app start
- full-history scans for simple widgets
- unnecessary real-time listeners across many collections
- large monolithic documents that are rewritten too often

### 4.3 Practical assumption
Single-user/personal usage should remain low-cost if queries are designed correctly.

---

## 5. Current source system to port from
Primary reference/source code:
- `swnation/OrangBoongSSem`

This new repo should become the cleaned-up continuation.
The port should be selective rather than blind copy-paste if architectural cleanup is underway.

---

## 6. Immediate architecture target

```text
client (public repo)
  ├─ UI
  ├─ in-memory app/session cache
  ├─ Firebase Auth
  ├─ Firestore adapter
  └─ feature modules

Firebase
  ├─ Auth
  ├─ Firestore
  ├─ Storage (optional / later)
  └─ Cloud Functions (later)
```

Important principle:
- UI/features should **not** directly call raw storage APIs everywhere.
- Introduce a **storage adapter layer**.

Recommended structure:

```text
src/
  storage/
    adapter.ts
    firestore.ts
    memory.ts
  auth/
    firebaseAuth.ts
  domains/
  features/
  ui/
```

---

## 7. Persistence model

### 7.1 Source of truth
- Firestore is the **single source of truth**.
- In-memory state is only a runtime cache.
- No localStorage persistence for user data/settings.

### 7.2 In-memory cache use cases
Allowed examples:
- currently open session state
- unsaved form drafts during one page lifetime
- loaded document cache for current navigation flow
- optimistic UI state

Not allowed as persistent truth:
- master records
- logs
- templates
- settings
- custom item registries
- notification preferences
- API/provider configs

---

## 8. Suggested Firestore data model
This is a starting point, not a final lock.

```text
users/{uid}
  profile/main
  settings/app
  domains/{domainId}
    meta/main
    accumulated/main
    templates/{templateId}
    sessions/{sessionId}
    logs/{logId}
    monthlyStats/{yyyy-mm}
    customItems/{itemGroup}
```

Possible domain ids:
- `orangi-migraine`
- `orangi-mental`
- `orangi-health`
- `bung-mental`
- `bung-health`
- `bungruki`

### 8.1 Example responsibilities
- `profile/main`: display/user-level metadata
- `settings/app`: UI preferences, selected models, notification settings, etc.
- `domains/{domainId}/meta/main`: domain config and lightweight metadata
- `domains/{domainId}/accumulated/main`: consensus/unresolved/discarded/protocol summaries
- `templates/*`: reusable prompts/templates
- `sessions/*`: multi-AI session history
- `logs/*`: symptom/daily/health log entries
- `monthlyStats/*`: aggregated low-read summaries for dashboards
- `customItems/*`: custom meds/symptoms/tags/etc.

### 8.2 Data-shape guidance
- avoid one giant master document for everything
- keep hot-write entities separate
- keep log entries as individual documents
- create lightweight aggregate docs when dashboard reads would otherwise be expensive

---

## 9. Migration priorities

### Phase 1 — foundation
1. initialize Firebase integration
2. create storage adapter abstraction
3. add Auth bootstrap
4. stop adding new localStorage dependencies

### Phase 2 — settings/custom items
Move these first:
- app settings
- model selections
- home/dashboard settings
- notification settings
- custom item registries
- templates

Reason:
- easier than full log migration
- removes many browser-persistent dependencies early

### Phase 3 — domain data
Migrate:
- accumulated knowledge
- sessions
- logs
- domain metadata

### Phase 4 — derived views
Refactor statistics/timeline/cross-domain views so they read from Firestore efficiently.

### Phase 5 — server-side hardening
Later:
- move AI provider calls behind Cloud Functions
- move scheduled notifications to backend
- evaluate export/backup strategy

---

## 10. LocalStorage removal policy
Search for all localStorage usage and classify them.

### Remove or replace
- persistent settings
- templates
- custom chips/items
- notification topics/preferences
- cached domain state
- home card preferences
- usage caches
- persistent encrypted browser data

### Temporary exception
A tiny compatibility bridge may exist during migration, but only if:
- clearly marked as transitional
- not treated as authoritative
- scheduled for removal

---

## 11. Notification direction
Short-term:
- notification preferences may live in Firestore
- implementation may stay client-side only if absolutely necessary during transition

Long-term preferred:
- scheduling and delivery logic move to Cloud Functions or another backend worker
- no fragile browser-tab-dependent scheduling

---

## 12. AI integration direction
Current/legacy browser-direct AI calling is not the ideal final architecture.

Long-term preferred:
- provider calls handled server-side
- browser calls app backend / Cloud Functions
- secrets stay off client
- usage/accounting easier to centralize

For now, structure code so that AI access can be swapped later without rewriting all features.

---

## 13. What Claude Code should focus on first

### First objective
Turn this repo into a **clean Firebase-first skeleton** that can receive features from the old project safely.

### Concrete first tasks
1. set up project structure
2. add Firebase bootstrap placeholders/config pattern
3. create storage adapter interface
4. implement in-memory adapter
5. implement Firestore adapter scaffold
6. define first-pass Firestore schema/types
7. document env/config strategy with no secrets committed
8. identify old-project modules that can be ported with minimal coupling

### Good first deliverables
- `README.md`
- `ARCHITECTURE.md`
- `src/storage/adapter.ts`
- `src/storage/firestore.ts`
- `src/storage/memory.ts`
- `src/types/domain.ts`
- `src/types/log.ts`
- `src/types/session.ts`
- `FIRESTORE_SCHEMA.md`

---

## 14. Guardrails

### Do not do
- do not commit real user data
- do not use localStorage as persistent SSOT
- do not tightly couple UI components to raw Firestore APIs everywhere
- do not overuse real-time subscriptions without a strong reason
- do not assume browser-stored secrets are acceptable long-term

### Do
- keep domain boundaries explicit
- prefer typed models/interfaces
- preserve future migration path to backend-controlled AI calls
- design queries with cost awareness
- keep repo readable for multiple AI assistants

---

## 15. Definition of success for the next milestone
The next milestone is successful if:
- the new repo has a clean Firebase-first skeleton
- persistent localStorage dependence is structurally removed
- in-memory session cache exists
- Firestore schema is defined
- initial settings/templates/custom-items path is clear
- future migration from old repo is easier, not harder

---

## 16. Working summary
In one sentence:

> Build this as a **public-code / private-data**, **Firebase-first**, **no persistent localStorage**, **in-memory-cache-only** family health system, with clear separation between UI, storage adapters, and future backend-controlled AI integrations.
