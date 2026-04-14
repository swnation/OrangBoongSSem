// js/firebase-init.js — Firebase 초기화 (PR A3)
// Firebase SDK는 CDN compat 버전 사용 (빌드 시스템 불필요)
// 실제 config는 커밋하지 않음 — 런타임에 주입

'use strict';

// ═══════════════════════════════════════════════════════════════
// Firebase 앱 초기화
// ═══════════════════════════════════════════════════════════════

let _firebaseApp = null;
let _firebaseReady = false;

// Firebase config를 외부에서 주입 (예: env, 별도 파일, 또는 UI 설정)
// 절대 이 파일에 실제 config를 하드코딩하지 않을 것
const _FIREBASE_CONFIG_KEY = 'om_firebase_config'; // localStorage에 임시 저장 (Phase 3에서 제거)

function getFirebaseConfig() {
  // 1) 전역 변수에서 (index.html에서 주입 가능)
  if (window._FIREBASE_CONFIG) return window._FIREBASE_CONFIG;
  // 2) localStorage 폴백 (임시 — Phase 3에서 제거)
  try {
    const stored = localStorage.getItem(_FIREBASE_CONFIG_KEY);
    if (stored) return JSON.parse(stored);
  } catch(e) {}
  return null;
}

function setFirebaseConfig(config) {
  window._FIREBASE_CONFIG = config;
  try { localStorage.setItem(_FIREBASE_CONFIG_KEY, JSON.stringify(config)); } catch(e) {}
}

async function initFirebase() {
  if (_firebaseReady) return _firebaseApp;

  const config = getFirebaseConfig();
  if (!config) {
    console.info('[Firebase] config 없음 — 오프라인/localStorage 모드로 동작');
    return null;
  }

  // Firebase SDK 로드 확인
  if (typeof firebase === 'undefined') {
    console.warn('[Firebase] SDK가 로드되지 않았습니다. CDN 스크립트를 확인하세요.');
    return null;
  }

  try {
    // 이미 초기화된 앱이 있으면 재사용
    if (firebase.apps.length) {
      _firebaseApp = firebase.apps[0];
    } else {
      _firebaseApp = firebase.initializeApp(config);
    }
    _firebaseReady = true;
    console.info('[Firebase] 초기화 완료');
    return _firebaseApp;
  } catch(e) {
    console.error('[Firebase] 초기화 실패:', e);
    return null;
  }
}

function isFirebaseReady() {
  return _firebaseReady && _firebaseApp !== null;
}
