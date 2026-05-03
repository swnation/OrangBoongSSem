# Firebase Migration Practical Notes

This note updates the migration plan with implementation constraints from the current `OrangBoongSSem` codebase.

## Why this note exists
The original workplan is directionally correct, but the current project has practical constraints:
- Vanilla JS project
- no build pipeline
- direct `<script src="js/...">` loading from HTML
- 3 separate apps: main / quick / bung

Because of that, migration should start **inside the current structure**, not with TypeScript or a new `src/` layout.

---

## Key adjustments

### 1. Do not start with TypeScript
Do **not** begin with:
- `adapter.ts`
- `memory.ts`
- `firestore.ts`
- `src/` migration

Reason:
- current project has no Vite/esbuild/tsc pipeline
- introducing TS first would force a second large architectural change
- this increases migration risk without immediate user benefit

### 2. Do not start with a new `src/` directory
Do **not** make `src/` the first migration step.

Reason:
- current load graph is based on `index.html` + direct script tags
- moving core files into `src/` would require a broad loader/restructure change
- storage migration should stay isolated from packaging changes

### 3. Start with JS adapters in the existing `js/` tree
Recommended first implementation:
- `js/storage.js`
- `js/firebase-init.js`
- `js/firebase-auth.js`
- `js/firebase-store.js`

These should be loadable in the current app structure with minimal disruption.

### 4. Handle the 3 apps explicitly
There are 3 entry apps:
- main
- quick
- bung

Firebase SDK/bootstrap will need to be available in all relevant entry points.
Do not assume a single-app bundler model yet.

---

## Revised execution order

### Step A — audit first
Immediately do:
- `LOCALSTORAGE_AUDIT.md`
- classify keys/usages
- identify which keys belong to settings/customItems/templates

This can be done now with no architectural risk.

### Step B — add a JS storage adapter in current structure
Add `js/storage.js` first.

Initial responsibility:
- wrap reads/writes for settings/customItems/templates
- provide a single API surface
- stop adding new direct localStorage calls

Example direction:
- `getAppSettings()`
- `saveAppSettings(data)`
- `getCustomItems(domainId, group)`
- `saveCustomItems(domainId, group, items)`
- `getTemplates(domainId)`
- `saveTemplate(domainId, tpl)`

### Step C — add memory-backed behavior first
Before full Firestore persistence, let the adapter support memory/current-session behavior where useful.

Goal:
- preserve current runtime behavior
- avoid coupling migration logic directly to Firestore too early

### Step D — add Firebase scaffold in JS
Add Firebase bootstrap in plain JS.

Suggested files:
- `js/firebase-init.js`
- `js/firebase-auth.js`
- `js/firebase-store.js`

Keep this phase limited to:
- app init
- auth bootstrap
- Firestore connection setup
- no broad feature rewrites yet

### Step E — migrate settings/customItems/templates first
This remains the best first real migration target.

Reason:
- easiest to move
- high user-visible value
- solves device-sync pain quickly
- avoids immediate risk to logs/sessions

### Step F — postpone TS/build tooling to a separate track
If TypeScript/Vite/esbuild is desired, treat it as a **separate future project step**, not a prerequisite for Firebase migration.

---

## Recommended near-term file strategy
Use the existing structure first.

### Add
- `js/storage.js`
- `js/firebase-init.js`
- `js/firebase-auth.js`
- `js/firebase-store.js`
- `LOCALSTORAGE_AUDIT.md`

### Avoid for now
- `src/storage/adapter.ts`
- `src/storage/memory.ts`
- `src/storage/firestore.ts`
- full `src/` re-layout
- bundler migration as part of PR A

---

## PR A should become

### PR A1
- localStorage audit
- key classification
- no behavioral change yet

### PR A2
- `js/storage.js` adapter introduction
- existing code can start calling adapter helpers
- no TS, no bundler

### PR A3
- Firebase JS scaffold
- init/auth/store placeholders
- entry-point integration for main/quick/bung as needed

Then continue to settings/customItems migration.

---

## One-line operational guidance
> Keep the Firebase migration inside the current Vanilla JS + `js/` + direct-script architecture first; defer TypeScript, `src/`, and build-system migration to a later independent phase.
