/**
 * ═══════════════════════════════════════════════════════════════
 *  THE GHOST PERFUMES — Firebase Initialization
 *  Luxury Ghost-Themed Perfume E-Commerce
 * ═══════════════════════════════════════════════════════════════
 *
 *  Initializes Firebase App, Firestore, and Auth (compat SDK).
 *  Credentials can be set either here or in /public/firebase-config.js.
 *
 *  CDN scripts required (load before this file):
 *    - firebase-app-compat.js
 *    - firebase-auth-compat.js
 *    - firebase-firestore-compat.js
 * ═══════════════════════════════════════════════════════════════
 */

/* global firebase */

const GhostFirebase = (function () {
  'use strict';

  // ──────────────────────────────────────────────
  //  Firebase Configuration
  //  Reads from window.FIREBASE_CONFIG (from firebase-config.js)
  //  or falls back to the object below.
  // ──────────────────────────────────────────────
  const defaultFirebaseConfig = {
    apiKey:            'YOUR_API_KEY_HERE',
    authDomain:        'YOUR_PROJECT_ID.firebaseapp.com',
    projectId:         'YOUR_PROJECT_ID',
    storageBucket:     'YOUR_PROJECT_ID.appspot.com',
    messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
    appId:             'YOUR_APP_ID',
    measurementId:     'YOUR_MEASUREMENT_ID'
  };

  const firebaseConfig = window.FIREBASE_CONFIG || defaultFirebaseConfig;

  // ──────────────────────────────────────────────
  //  Initialization guard
  // ──────────────────────────────────────────────
  let app  = null;
  let db   = null;
  let auth = null;
  let rtdb = null;

  function isConfigured() {
    const key = firebaseConfig.apiKey || '';
    return key &&
           key !== 'YOUR_API_KEY' &&
           key !== 'YOUR_API_KEY_HERE' &&
           !key.includes('YOUR_');
  }

  /**
   * Initialize Firebase (idempotent — safe to call more than once).
   * @returns {{ app, db, auth, rtdb, isConfigured: boolean }}
   */
  function init() {
    if (app) return { app, db, auth, rtdb, isConfigured: isConfigured() };

    if (!isConfigured()) {
      console.log(
        '%cℹ️ THE GHOST PERFUMES — Running in local/demo mode (Firebase credentials pending in public/firebase-config.js)',
        'color:#d4af37;font-weight:bold;font-size:12px;'
      );
      return { app: null, db: null, auth: null, rtdb: null, isConfigured: false };
    }

    try {
      if (typeof firebase === 'undefined') {
        console.warn('Firebase SDK not loaded on window');
        return { app: null, db: null, auth: null, rtdb: null, isConfigured: false };
      }

      if (!firebase.apps.length) {
        app = firebase.initializeApp(firebaseConfig);
      } else {
        app = firebase.app();
      }

      if (typeof firebase.firestore === 'function') {
        try {
          db = firebase.firestore();
          db.settings({ experimentalForceLongPolling: false, merge: true });
        } catch (_) {}
      }

      if (typeof firebase.database === 'function') {
        try {
          rtdb = firebase.database();
        } catch (_) {}
      }

      if (typeof firebase.auth === 'function') {
        try {
          auth = firebase.auth();
        } catch (_) {}
      }

      console.log(
        '%c👻 THE GHOST PERFUMES — Live Firebase connected successfully! Project: ' + firebaseConfig.projectId + ' (RTDB Active: ' + Boolean(rtdb) + ')',
        'color:#b388ff;font-weight:bold;font-size:13px;'
      );
    } catch (err) {
      console.warn('🔥 Firebase initialisation note:', err.message);
    }

    return { app, db, auth, rtdb, isConfigured: isConfigured() };
  }

  // Auto-init on load
  init();

  // ──────────────────────────────────────────────
  //  Public API
  // ──────────────────────────────────────────────
  return Object.freeze({
    init,
    isConfigured,
    get app()  { return app; },
    get db()   { return db; },
    get auth() { return auth; },
    get rtdb() { return rtdb; },
    get config() { return firebaseConfig; },
    get firebase() { return typeof firebase !== 'undefined' ? firebase : null; },
    /** Firestore server-timestamp sentinel */
    timestamp: function () {
      if (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore.FieldValue) {
        return firebase.firestore.FieldValue.serverTimestamp();
      }
      return new Date().toISOString();
    },
    /** Firestore increment sentinel */
    increment: function (n) {
      if (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore.FieldValue) {
        return firebase.firestore.FieldValue.increment(n);
      }
      return n;
    },
    /** Firestore arrayUnion sentinel */
    arrayUnion: function (...items) {
      if (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore.FieldValue) {
        return firebase.firestore.FieldValue.arrayUnion(...items);
      }
      return items;
    },
    /** Firestore arrayRemove sentinel */
    arrayRemove: function (...items) {
      if (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore.FieldValue) {
        return firebase.firestore.FieldValue.arrayRemove(...items);
      }
      return items;
    }
  });
})();
