# localStorage Audit — OrangBoongSSem

> 생성: 2026-04-14 | 총 183회 호출 (getItem 103, setItem 77, removeItem 9)

## 요약

| 분류 | 키 수 | 호출 수 | 마이그레이션 |
|------|-------|--------|-------------|
| Settings (앱 설정) | 10 | ~45 | Phase 1 — 즉시 |
| Custom Items (커스텀 항목) | 7 패턴 | ~40 | Phase 1 — 즉시 |
| Notification Config | 4 | ~35 | Phase 1 — 즉시 |
| Quick Logs (빠른 기록) | 2 | ~15 | Phase 2 — 로그와 함께 |
| Offline/Cache | 4 | ~12 | Phase 2 — 로그와 함께 |
| Crypto/Keys | 3 | ~10 | Phase 3 — 보안 하드닝 |
| UX State (일회성) | 4 | ~8 | 제거 또는 메모리 전환 |
| Migration Flags | 2 | ~3 | 제거 |

---

## Phase 1: 즉시 마이그레이션 (settings + customItems + ntfy config)

### Settings (앱 설정)

| 키 | 파일 | get/set | 설명 | Firestore 경로 |
|----|------|---------|------|---------------|
| `om_models` | settings.js | 4/3 | AI 모델 선택 | `users/{uid}/settings/app.models` |
| `om_theme` | settings.js | 2/2 | 다크/라이트 테마 | `users/{uid}/settings/app.theme` |
| `om_home_cards` | views.js | 2/2 | 홈 카드 표시 설정 | `users/{uid}/settings/app.homeCards` |
| `om_home_card_order` | views.js | 2/2 | 홈 카드 순서 | `users/{uid}/settings/app.homeCardOrder` |
| `om_domain` | state.js | 1/1 | 마지막 선택 도메인 | `users/{uid}/settings/app.lastDomain` |
| `om_auto_login` | drive.js, settings.js, bung | 4/4 | 자동 로그인 플래그 | `users/{uid}/settings/app.autoLogin` |
| `om_weather_key` | log.js, quick, settings.js | 5/4 | OpenWeatherMap API 키 | `users/{uid}/settings/app.weatherKey` |
| `om_device_id` | pwa.js | 1/1 | 기기 식별자 | `users/{uid}/settings/app.deviceId` |
| `om_notif_muted` | log.js | 2/2 | 알림 음소거 | `users/{uid}/settings/app.notifMuted` |
| `aiEnabled` | settings.js | 1/1 | AI 활성화 | `users/{uid}/settings/app.aiEnabled` |

### Custom Items (도메인별 커스텀 칩)

| 키 패턴 | 파일 | 설명 | Firestore 경로 |
|---------|------|------|---------------|
| `om_custom_meds_{domainId}` | log.js, drive.js, quick | 커스텀 약물 | `users/{uid}/domains/{domainId}/customItems/meds` |
| `om_custom_syms_{domainId}` | log.js, drive.js, quick | 커스텀 증상 | `.../customItems/syms` |
| `om_custom_tx_{domainId}` | log.js, drive.js, quick | 커스텀 치료 | `.../customItems/tx` |
| `om_custom_pain_{domainId}` | log.js, drive.js, quick | 커스텀 통증종류 | `.../customItems/pain` |
| `om_custom_triggers_{domainId}` | log.js, drive.js, quick | 커스텀 트리거 | `.../customItems/triggers` |
| `om_custom_sites_left_{domainId}` | log.js, drive.js, quick | 커스텀 부위(왼) | `.../customItems/sites_left` |
| `om_custom_sites_right_{domainId}` | log.js, drive.js, quick | 커스텀 부위(오) | `.../customItems/sites_right` |
| `om_hidden_chips_{domainId}` | log.js | 숨긴 칩 목록 | `.../customItems/hidden` |

> Drive 마스터에도 `_customItems`로 동기화 중 (drive.js `_syncCustomItemsToMaster`)

### Notification Config

| 키 | 파일 | 설명 | Firestore 경로 |
|----|------|------|---------------|
| `om_ntfy_bung` | log.js, quick, settings.js | 붕쌤 ntfy 토픽 | `users/{uid}/settings/app.ntfyBung` |
| `om_ntfy_orangi` | log.js, quick, settings.js | 오랑이 ntfy 토픽 | `users/{uid}/settings/app.ntfyOrangi` |
| `om_outcome_delay` | quick | 경과 알림 딜레이(분) | `users/{uid}/settings/app.outcomeDelay` |
| `om_med_reminder_delay` | quick | 약물 리마인더 딜레이(분) | `users/{uid}/settings/app.medReminderDelay` |

---

## Phase 2: 로그/데이터와 함께 마이그레이션

### Quick Logs

| 키 | 파일 | 설명 | Firestore 경로 |
|----|------|------|---------------|
| `om_quick_logs` | quick | 빠른 기록 배열 (JSON) | `users/{uid}/domains/orangi-migraine/quickLogs/{id}` |
| `om_quick_sync_url` | quick, settings.js | Apps Script 동기화 URL | `users/{uid}/settings/app.quickSyncUrl` |

### Offline Cache / Pending

| 키 | 파일 | 설명 | 처리 방향 |
|----|------|------|----------|
| `om_offline_{domainId}` | pwa.js | 오프라인 캐시 (도메인별 마스터) | Firestore 오프라인 persistence로 대체 |
| `om_bung_offline` | bung | bung 앱 오프라인 저장 | 동일 |
| `om_pending_edits` | log.js | 미반영 편집 큐 | Firestore 오프라인 큐로 대체 |
| `om_usage_{month}` | cost.js | 월별 비용 캐시 | `users/{uid}/usage/{yyyy-mm}` |

### Presets / Templates

| 키 패턴 | 파일 | 설명 | Firestore 경로 |
|---------|------|------|---------------|
| `om_presets_{domainId}` | log.js | 로그 프리셋 (동적 키) | `users/{uid}/domains/{domainId}/templates/{id}` |

### Supplement Customs (붕룩이)

| 키 | 파일 | 설명 | Firestore 경로 |
|----|------|------|---------------|
| `om_brk_suppl_{who}` | bungruki.js | 커스텀 영양제 (orangi/bung) | `users/{uid}/domains/bungruki/customItems/suppl_{who}` |
| `om_preg_drug_db` | bungruki.js | 임신 약물 안전 DB 캐시 | Firestore 캐시 또는 제거 |

---

## Phase 3: 보안 하드닝 시 처리

### Crypto / API Keys

| 키 | 파일 | 설명 | 처리 방향 |
|----|------|------|----------|
| `om_keys` (= `om_keys_enc`) | crypto.js | AES-GCM 암호화된 API 키 | Cloud Functions로 이전 |
| `om_encrypt_enabled` | crypto.js | 암호화 활성화 플래그 | Cloud Functions와 함께 제거 |
| `keysSetAt` | crypto.js | 키 설정 시각 | 동일 |

---

## 제거 / 메모리 전환

### UX State (세션 한정, 영속 불필요)

| 키 | 파일 | 설명 | 처리 |
|----|------|------|------|
| `pwa-install-dismissed` | pwa.js | PWA 설치 배너 닫음 | sessionStorage 또는 메모리 |
| `om_last_code_backup` | pwa.js | 마지막 코드 백업 시각 | 메모리 (세션 한정) |
| `om_site_migrated` | quick | 부위명 마이그레이션 완료 플래그 | 제거 (마이그레이션 완료) |
| `om_qc_*` | quick | 레거시 커스텀 키 (구 버전) | 제거 (이미 병합됨) |

---

## 파일별 호출 수

| 파일 | getItem | setItem | removeItem | 합계 |
|------|---------|---------|------------|------|
| js/log.js | 22 | 12 | 2 | 36 |
| js/settings.js | 18 | 16 | 1 | 35 |
| js/drive.js | 10 | 5 | 2 | 17 |
| js/views.js | 8 | 7 | 0 | 15 |
| js/pwa.js | 7 | 4 | 1 | 12 |
| js/bungruki.js | 3 | 3 | 0 | 6 |
| js/crypto.js | 2 | 1 | 1 | 4 |
| js/state.js | 1 | 1 | 0 | 2 |
| js/cost.js | 1 | 1 | 0 | 2 |
| quick/index.html | 27 | 22 | 2 | 51 |
| bung/index.html | 4 | 2 | 0 | 6 |
| **합계** | **103** | **77** | **9** | **186** |

---

## 마이그레이션 영향도

### Phase 1 (즉시): ~120 호출 사이트
- settings: ~45
- customItems: ~40
- ntfy config: ~35

### Phase 2 (로그): ~45 호출 사이트
- quick logs + offline + presets + usage

### Phase 3 (보안): ~10 호출 사이트
- crypto/keys

### 제거: ~11 호출 사이트
- migration flags + legacy keys + UX state
