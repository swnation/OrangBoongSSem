// js/storage.js — Storage Adapter (Firestore Write-Through)
// 패턴: localStorage = 읽기 캐시 (sync) + Firestore = 영속 저장 (async write-through)
// 로그인 시 Firestore → localStorage 동기화 (cloud is truth)

'use strict';

// ═══════════════════════════════════════════════════════════════
// LOW-LEVEL: localStorage 래퍼
// ═══════════════════════════════════════════════════════════════
function _storageGet(key) {
  try { return localStorage.getItem(key); } catch(e) { return null; }
}
function _storageSet(key, value) {
  try { localStorage.setItem(key, value); } catch(e) { console.warn('storage set failed:', key, e); }
}
function _storageRemove(key) {
  try { localStorage.removeItem(key); } catch(e) {}
}
function _storageGetJSON(key, fallback) {
  try { const v = _storageGet(key); return v ? JSON.parse(v) : fallback; }
  catch(e) { return fallback; }
}
function _storageSetJSON(key, value) {
  _storageSet(key, JSON.stringify(value));
}

// ═══════════════════════════════════════════════════════════════
// FIRESTORE WRITE-THROUGH (비동기 백그라운드 저장)
// ═══════════════════════════════════════════════════════════════
let _fsWriteTimer = null;
const _fsPendingWrites = {};

function _fsWriteThrough(path, data) {
  if (!isFirebaseReady() || !getFirebaseUid()) return;
  // 디바운스: 같은 경로 연속 쓰기 500ms 병합
  _fsPendingWrites[path] = data;
  clearTimeout(_fsWriteTimer);
  _fsWriteTimer = setTimeout(() => {
    const writes = { ..._fsPendingWrites };
    Object.keys(_fsPendingWrites).forEach(k => delete _fsPendingWrites[k]);
    Object.entries(writes).forEach(([p, d]) => {
      firestoreSet(p, d, true).catch(e => console.warn('[Storage] Firestore write failed:', p, e));
    });
  }, 500);
}

// ═══════════════════════════════════════════════════════════════
// FIRESTORE → localStorage 동기화 (로그인 시 1회)
// ═══════════════════════════════════════════════════════════════
async function syncFromFirestore() {
  if (!isFirebaseReady() || !getFirebaseUid()) return;
  console.info('[Storage] Firestore → localStorage 동기화 시작');

  try {
    // 1) Settings 동기화
    const settings = await fsGetSettings();
    if (settings) {
      let count = 0;
      Object.entries(_SETTINGS_KEYS).forEach(([name, lsKey]) => {
        if (settings[name] !== undefined && settings[name] !== null) {
          const val = typeof settings[name] === 'object' ? JSON.stringify(settings[name]) : String(settings[name]);
          _storageSet(lsKey, val);
          count++;
        }
      });
      console.info(`[Storage] Settings ${count}개 동기화`);
    }

    // 2) Custom Items 동기화 (현재 도메인)
    const dom = _storageGet('om_domain') || 'orangi-migraine';
    let customCount = 0;
    for (const group of _CUSTOM_GROUPS) {
      const items = await fsGetCustomItems(dom, group);
      if (items && items.length) {
        const existing = _storageGetJSON(_customKey(dom, group), []);
        const merged = [...new Set([...existing, ...items])];
        _storageSetJSON(_customKey(dom, group), merged);
        customCount += items.length;
      }
    }
    if (customCount) console.info(`[Storage] CustomItems ${customCount}개 동기화 (${dom})`);

    console.info('[Storage] Firestore → localStorage 동기화 완료');
  } catch(e) {
    console.warn('[Storage] Firestore 동기화 실패 (오프라인?):', e);
  }
}

// ═══════════════════════════════════════════════════════════════
// APP SETTINGS
// Firestore 경로: users/{uid}/settings/app
// ═══════════════════════════════════════════════════════════════
const _SETTINGS_KEYS = {
  models:           'om_models',
  theme:            'om_theme',
  homeCards:        'om_home_cards',
  homeCardOrder:    'om_home_card_order',
  lastDomain:       'om_domain',
  autoLogin:        'om_auto_login',
  weatherKey:       'om_weather_key',
  deviceId:         'om_device_id',
  notifMuted:       'om_notif_muted',
  aiEnabled:        'aiEnabled',
  quickSyncUrl:     'om_quick_sync_url',
  ntfyBung:         'om_ntfy_bung',
  ntfyOrangi:       'om_ntfy_orangi',
  outcomeDelay:     'om_outcome_delay',
  medReminderDelay: 'om_med_reminder_delay',
  encryptEnabled:   'om_encrypt_enabled',
};

function getAppSetting(name) {
  const key = _SETTINGS_KEYS[name];
  if (!key) { console.warn('Unknown setting:', name); return null; }
  return _storageGet(key);
}

function getAppSettingJSON(name, fallback) {
  const key = _SETTINGS_KEYS[name];
  if (!key) return fallback;
  return _storageGetJSON(key, fallback);
}

function setAppSetting(name, value) {
  const key = _SETTINGS_KEYS[name];
  if (!key) { console.warn('Unknown setting:', name); return; }
  // localStorage (즉시)
  if (value === null || value === undefined) _storageRemove(key);
  else _storageSet(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
  // Firestore (백그라운드 write-through)
  const path = fsSettingsPath();
  if (path) {
    const fsVal = value === null || value === undefined ? null : value;
    _fsWriteThrough(path, { [name]: fsVal, updatedAt: new Date().toISOString() });
  }
}

function getAllAppSettings() {
  const result = {};
  Object.entries(_SETTINGS_KEYS).forEach(([name, key]) => {
    const v = _storageGet(key);
    if (v !== null) result[name] = v;
  });
  return result;
}

// ═══════════════════════════════════════════════════════════════
// CUSTOM ITEMS (도메인별)
// Firestore 경로: users/{uid}/domains/{domainId}/customItems/{group}
// ═══════════════════════════════════════════════════════════════
const _CUSTOM_GROUPS = ['meds', 'syms', 'tx', 'pain', 'triggers', 'sites_left', 'sites_right', 'hidden'];

function _customKey(domainId, group) {
  if (group === 'hidden') return 'om_hidden_chips_' + domainId;
  return 'om_custom_' + group + '_' + domainId;
}

function getCustomItems(domainId, group) {
  return _storageGetJSON(_customKey(domainId, group), []);
}

function setCustomItems(domainId, group, items) {
  _storageSetJSON(_customKey(domainId, group), items);
  // Firestore write-through
  const path = fsCustomItemsPath(domainId, group);
  if (path) _fsWriteThrough(path, { items, updatedAt: new Date().toISOString() });
}

function addCustomItem(domainId, group, item) {
  const items = getCustomItems(domainId, group);
  if (!items.includes(item)) {
    items.push(item);
    setCustomItems(domainId, group, items);
  }
  return items;
}

function getAllCustomItems(domainId) {
  const result = {};
  _CUSTOM_GROUPS.forEach(g => {
    const items = getCustomItems(domainId, g);
    if (items.length) result[g] = items;
  });
  return result;
}

// ═══════════════════════════════════════════════════════════════
// PRESETS / TEMPLATES (도메인별)
// Firestore 경로: users/{uid}/domains/{domainId}/templates/{id}
// ═══════════════════════════════════════════════════════════════
function _presetKey(domainId) {
  return 'om_presets_' + domainId;
}

function getPresets(domainId) {
  return _storageGetJSON(_presetKey(domainId), []);
}

function setPresets(domainId, presets) {
  _storageSetJSON(_presetKey(domainId), presets);
  const path = fsCustomItemsPath(domainId, 'presets');
  if (path) _fsWriteThrough(path, { items: presets, updatedAt: new Date().toISOString() });
}

// ═══════════════════════════════════════════════════════════════
// USAGE CACHE (월별)
// Firestore 경로: users/{uid}/usage/{yyyy-mm}
// ═══════════════════════════════════════════════════════════════
function getUsageCache(month) {
  return _storageGetJSON('om_usage_' + month, null);
}

function setUsageCache(month, data) {
  _storageSetJSON('om_usage_' + month, data);
}

// ═══════════════════════════════════════════════════════════════
// OFFLINE CACHE (도메인별)
// Firestore 오프라인 persistence가 이 역할을 대체
// ═══════════════════════════════════════════════════════════════
function getOfflineCache(domainId) {
  return _storageGetJSON('om_offline_' + domainId, null);
}

function setOfflineCache(domainId, data) {
  _storageSetJSON('om_offline_' + domainId, data);
}

function removeOfflineCache(domainId) {
  _storageRemove('om_offline_' + domainId);
}
