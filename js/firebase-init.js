// js/firebase-init.js — Firebase 초기화 (Step 9: 실제 연결)
// Firebase SDK는 CDN compat 버전 사용 (빌드 시스템 불필요)

'use strict';

// ═══════════════════════════════════════════════════════════════
// Firebase Config (공개 가능 — 보안규칙이 실제 보호 담당)
// ═══════════════════════════════════════════════════════════════
const _FIREBASE_CONFIG = {
  apiKey: "AIzaSyB6KM2JkWYYRBKk2t3Levzq-GChXjjAiS0",
  authDomain: "fam-med-service.firebaseapp.com",
  projectId: "fam-med-service",
  storageBucket: "fam-med-service.firebasestorage.app",
  messagingSenderId: "219099477841",
  appId: "1:219099477841:web:926b81a4798d0446b08570"
};

let _firebaseApp = null;
let _firebaseReady = false;

async function initFirebase() {
  if (_firebaseReady) return _firebaseApp;

  // Firebase SDK 로드 확인
  if (typeof firebase === 'undefined') {
    console.warn('[Firebase] SDK가 로드되지 않았습니다');
    return null;
  }

  try {
    if (firebase.apps.length) {
      _firebaseApp = firebase.apps[0];
    } else {
      _firebaseApp = firebase.initializeApp(_FIREBASE_CONFIG);
    }
    _firebaseReady = true;

    // Firestore 오프라인 persistence 활성화
    try {
      await firebase.firestore().enablePersistence({ synchronizeTabs: true });
    } catch(e) {
      if (e.code === 'failed-precondition') console.info('[Firestore] 다중 탭 — persistence는 한 탭에서만');
      else if (e.code === 'unimplemented') console.info('[Firestore] 이 브라우저에서 persistence 미지원');
    }

    console.info('[Firebase] 초기화 완료 — ' + _FIREBASE_CONFIG.projectId);
    return _firebaseApp;
  } catch(e) {
    console.error('[Firebase] 초기화 실패:', e);
    return null;
  }
}

function isFirebaseReady() {
  return _firebaseReady && _firebaseApp !== null;
}
