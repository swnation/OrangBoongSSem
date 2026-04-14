# Firebase Migration Workplan

## Goal
Migrate `OrangBoongSSem` to a Firebase-first architecture incrementally, without a risky full-port to a new repository.

## Rules
- Do not use persistent localStorage as the source of truth.
- Keep current-session memory cache.
- Use Firestore as the long-term source of truth.
- Exclude ntfy redesign from this migration.

## Work order

### 1. Audit localStorage usage
Create a full inventory of localStorage keys and usage sites.
Classify each key as:
- migrate now
- migrate later
- remove / redesign later

Deliverable:
- `LOCALSTORAGE_AUDIT.md`

### 2. Introduce a storage adapter
Add:
- `src/storage/adapter.ts`
- `src/storage/memory.ts`
- `src/storage/firestore.ts`
- `src/storage/index.ts`

All new code must go through the adapter.

### 3. Implement memory adapter first
Preserve current behavior with an in-memory adapter before switching persistence.
This separates architecture change from backend migration.

### 4. Add Firebase scaffold
Add Firebase init, Auth bootstrap, and Firestore wiring.
Do not commit secrets.

Suggested files:
- `src/firebase/init.ts`
- `src/firebase/auth.ts`
- `src/firebase/firestore.ts`
- `FIREBASE_SCHEMA.md`

### 5. Lock first-pass Firestore schema
Start with:
- `users/{uid}/settings/app`
- `users/{uid}/domains/{domainId}/meta/main`
- `users/{uid}/domains/{domainId}/customItems/{group}`
- `users/{uid}/domains/{domainId}/templates/{templateId}`

### 6. Migrate settings first
Move settings through the adapter to Firestore.
Priority:
- app settings
- dashboard/home settings
- model preferences
- UI/view preferences
- notification preferences data only

### 7. Migrate custom items and templates
Move:
- custom meds
- custom symptoms
- custom procedures
- custom sites/pain labels
- presets/templates

This should solve the main multi-device sync pain point.

### 8. Remove direct localStorage calls module by module
Suggested order:
1. settings modules
2. custom item modules
3. template/preset modules
4. dashboard/home modules
5. usage cache modules
6. session/log modules

### 9. Migrate logs, sessions, and accumulated data later
Second wave only:
- accumulated knowledge
- sessions
- logs
- domain metadata
- monthly derived docs

Keep Firestore reads narrow and cost-aware.

### 10. Harden security and backend later
After the migration stabilizes:
- redesign browser key handling
- move AI calls behind Cloud Functions
- redesign notification scheduling
- add stronger Firestore security rules

## PR grouping
- PR A: audit + adapter + memory + Firebase scaffold
- PR B: settings
- PR C: custom items + templates
- PR D: domain data
- PR E: hardening

## First milestone
Success means:
- localStorage audit completed
- storage adapter exists
- memory adapter works
- Firebase scaffold exists
- settings/customItems/templates migration path is live
- no new direct localStorage usage is added
