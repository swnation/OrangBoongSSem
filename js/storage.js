// js/storage.js — Storage Adapter (Firebase Migration Phase A2)
// 목적: localStorage 직접 호출을 추상화하여 Firestore 전환 준비
// 현재: localStorage 래퍼 (기존 동작 유지)
// 향후: Firestore adapter로 교체

'use strict';

// ═══════════════════════════════════════════════════════════════
// BACKEND 선택 (현재: localStorage, 향후: firestore)
// ═══════════════════════════════════════════════════════════════
const _STORAGE_BACKEND = 'localStorage'; // 'localStorage' | 'firestore'

// ═══════════════════════════════════════════════════════════════
// LOW-LEVEL: 현재 localStorage 래퍼 (향후 firestore로 교체 지점)
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
  if (value === null || value === undefined) _storageRemove(key);
  else _storageSet(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
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
// 향후: Firestore 오프라인 persistence로 대체
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
