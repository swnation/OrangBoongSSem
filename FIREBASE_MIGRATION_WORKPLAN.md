# Firebase Migration Workplan

## Goal
Migrate `OrangBoongSSem` to a Firebase-first architecture incrementally, without a risky full-port to a new repository.

## Rules
- Do not use persistent localStorage as the source of truth.
- Keep current-session memory cache.
- Use Firestore as the long-term source of truth.
- Exclude ntfy redesign from this migration.

## Work order

### 1. ✅ Audit localStorage usage — PR #181
- `LOCALSTORAGE_AUDIT.md`: 186회 호출, 37개 키, Phase별 분류

### 2. ✅ Introduce a storage adapter — PR #182
- `js/storage.js` (Vanilla JS, 빌드 불필요)
- Practical Notes에 따라 `src/` 대신 `js/` 트리 유지

### 3. ✅ Implement memory adapter first — PR #182
- 내부는 localStorage 래퍼 → 기존 동작 100% 유지

### 4. ✅ Add Firebase scaffold — PR #183
- `js/firebase-init.js`, `js/firebase-auth.js`, `js/firebase-store.js`
- `FIRESTORE_SCHEMA.md`
- config 미설정 시 graceful fallback

### 5. ✅ Lock first-pass Firestore schema — PR #183
- `users/{uid}/settings/app`
- `users/{uid}/domains/{domainId}/customItems/{group}`
- `users/{uid}/domains/{domainId}/templates/{templateId}`
- `users/{uid}/usage/{yyyy-mm}`

### 6. ✅ Migrate settings first — PR #184 (33사이트)

### 7. ✅ Migrate custom items and templates — PR #185 (13사이트)

### 8. ✅ Remove direct localStorage calls module by module — PR #186, #187, #188
- 메인앱 js/*.js: 106사이트
- quick/index.html: 51사이트
- bung/index.html: 6사이트
- crypto/om_keys: 6사이트
- **전체 프로젝트 localStorage 직접 호출: 0건** (storage.js 래퍼 3줄 제외)

### 9. ⏳ Migrate logs, sessions, and accumulated data — 다음 단계
- Firebase 프로젝트 실제 설정 후 진행
- `_storageGet/Set` 내부를 Firestore로 교체
- 로그는 월 단위 페이지네이션 (비용 최적화)

### 10. ⏳ Harden security and backend — 다음 단계
- AI 키를 Cloud Functions로 이전
- Firebase Auth로 기존 Google OAuth 교체
- Firestore 보안규칙 강화

## PR grouping (완료)
- ✅ PR A: audit (#181) + adapter (#182) + Firebase scaffold (#183)
- ✅ PR B: settings (#184)
- ✅ PR C: custom items + templates (#185)
- ✅ PR D: domain data (#186)
- ✅ PR D+: quick/bung 앱 (#187)
- ✅ PR E: crypto/keys (#188)

## First milestone — ✅ 달성
- ✅ localStorage audit completed
- ✅ storage adapter exists
- ✅ memory adapter works
- ✅ Firebase scaffold exists
- ✅ settings/customItems/templates migration path is live
- ✅ no new direct localStorage usage is added
- ✅ **전체 프로젝트 localStorage 직접 호출 0건**
