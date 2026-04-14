# Claude Code Handoff — Family-Health-system-by-BoongSSem

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
