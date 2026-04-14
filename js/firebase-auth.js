// js/firebase-auth.js — Firebase Auth 부트스트랩 (PR A3)
// 현재: 스캐폴드만 (실제 Auth 전환은 Phase 3+)
// 기존 Google OAuth (drive.js)와 공존 — 향후 Firebase Auth로 교체

'use strict';

// ═══════════════════════════════════════════════════════════════
// Firebase Auth 상태
// ═══════════════════════════════════════════════════════════════

let _firebaseUser = null;

function getFirebaseUser() {
  return _firebaseUser;
}

function getFirebaseUid() {
  return _firebaseUser?.uid || null;
}

// Auth 상태 리스너 등록 (Firebase SDK 로드 후 호출)
function setupFirebaseAuth() {
  if (!isFirebaseReady()) return;
  if (typeof firebase === 'undefined' || !firebase.auth) return;

  firebase.auth().onAuthStateChanged(user => {
    _firebaseUser = user;
    if (user) {
      console.info('[Firebase Auth] 로그인:', user.email || user.uid);
    } else {
      console.info('[Firebase Auth] 로그아웃 상태');
    }
  });
}

// Google 로그인 (기존 OAuth와 별개 — Firebase Auth 경유)
async function firebaseSignInWithGoogle() {
  if (!isFirebaseReady()) {
    console.warn('[Firebase Auth] Firebase가 초기화되지 않았습니다');
    return null;
  }
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    const result = await firebase.auth().signInWithPopup(provider);
    return result.user;
  } catch(e) {
    console.error('[Firebase Auth] 로그인 실패:', e);
    return null;
  }
}

async function firebaseSignOut() {
  if (!isFirebaseReady()) return;
  try {
    await firebase.auth().signOut();
    _firebaseUser = null;
  } catch(e) {
    console.error('[Firebase Auth] 로그아웃 실패:', e);
  }
}
