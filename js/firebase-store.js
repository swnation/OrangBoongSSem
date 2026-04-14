// js/firebase-store.js — Firestore 읽기/쓰기 어댑터 (PR A3)
// storage.js의 _storageGet/Set를 Firestore로 교체할 때 사용
// 현재: 스캐폴드만 (실제 전환은 PR B+)

'use strict';

// ═══════════════════════════════════════════════════════════════
// Firestore 인스턴스
// ═══════════════════════════════════════════════════════════════

function _getFirestore() {
  if (!isFirebaseReady()) return null;
  if (typeof firebase === 'undefined' || !firebase.firestore) return null;
  return firebase.firestore();
}

// ═══════════════════════════════════════════════════════════════
// DOCUMENT 읽기/쓰기 (범용)
// ═══════════════════════════════════════════════════════════════

async function firestoreGet(path) {
  const db = _getFirestore();
  if (!db) return null;
  try {
    const doc = await db.doc(path).get();
    return doc.exists ? doc.data() : null;
  } catch(e) {
    console.error('[Firestore] get failed:', path, e);
    return null;
  }
}

async function firestoreSet(path, data, merge) {
  const db = _getFirestore();
  if (!db) return false;
  try {
    await db.doc(path).set(data, merge ? { merge: true } : {});
    return true;
  } catch(e) {
    console.error('[Firestore] set failed:', path, e);
    return false;
  }
}

async function firestoreDelete(path) {
  const db = _getFirestore();
  if (!db) return false;
  try {
    await db.doc(path).delete();
    return true;
  } catch(e) {
    console.error('[Firestore] delete failed:', path, e);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// 경로 헬퍼 (LOCALSTORAGE_AUDIT.md 매핑 기준)
// ═══════════════════════════════════════════════════════════════

function _userPath() {
  const uid = getFirebaseUid();
  if (!uid) return null;
  return `users/${uid}`;
}

function fsSettingsPath() {
  const base = _userPath();
  return base ? `${base}/settings/app` : null;
}

function fsCustomItemsPath(domainId, group) {
  const base = _userPath();
  return base ? `${base}/domains/${domainId}/customItems/${group}` : null;
}

function fsTemplatePath(domainId, templateId) {
  const base = _userPath();
  return base ? `${base}/domains/${domainId}/templates/${templateId}` : null;
}

function fsLogPath(domainId, logId) {
  const base = _userPath();
  return base ? `${base}/domains/${domainId}/logs/${logId}` : null;
}

function fsUsagePath(month) {
  const base = _userPath();
  return base ? `${base}/usage/${month}` : null;
}

// ═══════════════════════════════════════════════════════════════
// 고수준 API (PR B에서 storage.js와 연결)
// ═══════════════════════════════════════════════════════════════

async function fsGetSettings() {
  const path = fsSettingsPath();
  return path ? await firestoreGet(path) : null;
}

async function fsSaveSettings(data) {
  const path = fsSettingsPath();
  return path ? await firestoreSet(path, data, true) : false;
}

async function fsGetCustomItems(domainId, group) {
  const path = fsCustomItemsPath(domainId, group);
  if (!path) return null;
  const doc = await firestoreGet(path);
  return doc?.items || null;
}

async function fsSaveCustomItems(domainId, group, items) {
  const path = fsCustomItemsPath(domainId, group);
  return path ? await firestoreSet(path, { items, updatedAt: new Date().toISOString() }) : false;
}
