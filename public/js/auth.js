/**
 * ═══════════════════════════════════════════════════════════════
 *  THE GHOST PERFUMES — Authentication Module
 * ═══════════════════════════════════════════════════════════════
 *
 *  Handles sign-up, sign-in, Google auth, admin detection,
 *  Firebase cloud sync, and instant local fallback authentication.
 *  Stores complete user profile and authentication ID in Firestore.
 *
 *  ADMIN WHITELIST (STRICT):
 *    Only the emails below can ever be admins. No one else can
 *    register or sign in as admin — even if they guess the password.
 * ═══════════════════════════════════════════════════════════════
 */

/* global GhostFirebase, firebase, GhostApp, GhostCart */

const GhostAuth = (function () {
  'use strict';

  let _isAdmin = false;
  let _currentUser = null;
  const _subscribers = [];

  // ── STRICT ADMIN WHITELIST ─────────────────────────────────
  // ONLY these exact emails can access the admin panel.
  // Password for all: ghost@123
  const ADMIN_EMAILS = [
    'uditrmistry@gmail.com',
    'uditmistryrajeshkumar@gmail.com',
    'nayakaditya736@gmail.com'
  ];

  // Admin password (used for local/offline mode verification)
  const ADMIN_PASSWORD = 'ghost@123';

  function _getSavedUser() {
    try {
      const u = localStorage.getItem('ghost_auth_user');
      return u ? JSON.parse(u) : null;
    } catch (_) {
      return null;
    }
  }

  function _saveUser(u) {
    if (u) {
      localStorage.setItem('ghost_auth_user', JSON.stringify({
        uid: u.uid,
        email: u.email,
        displayName: u.displayName || 'Patron',
        photoURL: u.photoURL || null,
        role: u.role || (_isAdmin ? 'admin' : 'customer'),
        lastLoginAt: new Date().toISOString()
      }));
    } else {
      localStorage.removeItem('ghost_auth_user');
    }
  }

  // Strict check — ONLY whitelisted emails are admins, NO wildcards
  function _isEmailAdmin(email) {
    if (!email) return false;
    const lower = email.trim().toLowerCase();
    return ADMIN_EMAILS.includes(lower);
  }

  // ────────────────────────────────────────────────────
  //  Store / Sync User Profile in Firestore
  // ────────────────────────────────────────────────────
  async function _syncUserProfileToFirestore(user, extraData = {}) {
    if (!GhostFirebase.isConfigured() || !GhostFirebase.db || !user) return;

    try {
      const isUserAdmin = _isEmailAdmin(user.email) || extraData.role === 'admin';
      const userRef = GhostFirebase.db.collection('users').doc(user.uid);
      const doc = await userRef.get();

      const profilePayload = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || extraData.displayName || user.email.split('@')[0],
        photoURL: user.photoURL || null,
        role: doc.exists && doc.data().role ? doc.data().role : (isUserAdmin ? 'admin' : 'customer'),
        authProvider: extraData.provider || 'password',
        lastLoginAt: GhostFirebase.timestamp(),
        updatedAt: GhostFirebase.timestamp()
      };

      if (!doc.exists) {
        profilePayload.createdAt = GhostFirebase.timestamp();
        profilePayload.cart = [];
        profilePayload.orders = [];
        profilePayload.status = 'active';
      }

      await userRef.set(profilePayload, { merge: true });

      if (profilePayload.role === 'admin') {
        _isAdmin = true;
      }
    } catch (err) {
      console.warn('[GhostAuth] Firestore user profile sync note:', err.message);
    }
  }

  // ────────────────────────────────────────────────────
  //  Sign Up — CUSTOMERS ONLY. Admin emails CANNOT register.
  // ────────────────────────────────────────────────────
  async function signUp(email, password, displayName) {
    email = (email || '').trim().toLowerCase();
    displayName = displayName || email.split('@')[0];

    // Block admin emails from registering via signup form
    if (_isEmailAdmin(email)) {
      _showToast('Admin accounts cannot be created via registration. Use the Admin login tab.', 'error');
      throw new Error('Admin registration blocked');
    }

    // 1. Try Firebase Auth if configured
    if (GhostFirebase.isConfigured() && GhostFirebase.auth) {
      try {
        const credential = await GhostFirebase.auth.createUserWithEmailAndPassword(email, password);
        const user = credential.user;
        await user.updateProfile({ displayName });

        _currentUser = user;
        _isAdmin = false; // Registered users are NEVER admins

        await _syncUserProfileToFirestore(user, {
          displayName,
          role: 'customer',
          provider: 'password'
        });

        _saveUser({ ...user, role: 'customer', displayName });
        _notifySubscribers();
        _showToast('Welcome to THE GHOST PERFUMES, ' + displayName + '!', 'success');
        return user;
      } catch (err) {
        _handleAuthError(err);
        throw err;
      }
    }

    // 2. Seamless local authentication fallback
    const users = JSON.parse(localStorage.getItem('ghost_local_users') || '[]');
    if (users.some(u => u.email === email)) {
      _showToast('This email is already registered.', 'error');
      throw new Error('User exists');
    }

    const newUser = {
      uid: 'ghost-usr-' + Date.now(),
      email: email,
      displayName: displayName,
      role: 'customer', // Always customer for registration
      passwordHash: btoa(password),
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };

    users.push(newUser);
    localStorage.setItem('ghost_local_users', JSON.stringify(users));

    _currentUser = newUser;
    _isAdmin = false;
    _saveUser(newUser);
    _notifySubscribers();

    _showToast('Account created! Welcome, ' + displayName + '.', 'success');
    return newUser;
  }

  // ────────────────────────────────────────────────────
  //  Sign In — Seamless for Admin & Customer
  // ────────────────────────────────────────────────────
  async function signIn(email, password) {
    email = (email || '').trim().toLowerCase();
    const isAdmin = _isEmailAdmin(email);

    // ── 1. MASTER ADMIN LOGIN FLOW ─────────────────────
    if (isAdmin) {
      if (password !== ADMIN_PASSWORD) {
        _showToast('Invalid administrator password.', 'error');
        throw new Error('Invalid administrator password.');
      }

      // Prepare verified master admin object
      const adminUser = {
        uid: 'ghost-admin-' + email.replace(/[^a-z0-9]/g, ''),
        email: email,
        displayName: 'Master Admin — THE GHOST PERFUMES',
        role: 'admin',
        lastLoginAt: new Date().toISOString()
      };

      // Attempt background Firebase Auth sync/creation without blocking login
      if (GhostFirebase.isConfigured() && GhostFirebase.auth) {
        try {
          const cred = await GhostFirebase.auth.signInWithEmailAndPassword(email, password);
          adminUser.uid = cred.user.uid;
        } catch (fErr) {
          // If user doesn't exist yet in Firebase Auth, auto-create it
          if (fErr.code === 'auth/user-not-found' || fErr.code === 'auth/invalid-credential') {
            try {
              const newCred = await GhostFirebase.auth.createUserWithEmailAndPassword(email, password);
              adminUser.uid = newCred.user.uid;
            } catch (_) {}
          }
        }
      }

      // Background Firestore profile sync
      _syncUserProfileToFirestore(adminUser, { role: 'admin' }).catch(() => {});

      _currentUser = adminUser;
      _isAdmin = true;
      _saveUser(adminUser);
      _notifySubscribers();
      _showToast('✓ Admin clearance verified. Welcome, Master Admin!', 'success');
      return adminUser;
    }

    // ── 2. REGULAR CUSTOMER LOGIN FLOW ─────────────────
    // Try Firebase Auth if configured
    if (GhostFirebase.isConfigured() && GhostFirebase.auth) {
      try {
        const credential = await GhostFirebase.auth.signInWithEmailAndPassword(email, password);
        _currentUser = credential.user;
        _isAdmin = false;
        
        await _syncUserProfileToFirestore(_currentUser, { provider: 'password' });

        _saveUser({ ..._currentUser, role: 'customer' });
        _notifySubscribers();
        _showToast('Welcome back, ' + (_currentUser.displayName || 'Patron') + '!', 'success');
        return _currentUser;
      } catch (err) {
        // Fall back to local customer lookup if Firebase credentials fail
        const users = JSON.parse(localStorage.getItem('ghost_local_users') || '[]');
        const localUser = users.find(u => u.email === email);
        if (localUser && localUser.passwordHash === btoa(password)) {
          localUser.lastLoginAt = new Date().toISOString();
          _currentUser = localUser;
          _isAdmin = false;
          _saveUser(localUser);
          _notifySubscribers();
          _showToast('Welcome back, ' + (localUser.displayName || 'Patron') + '!', 'success');
          return localUser;
        }

        _handleAuthError(err);
        throw err;
      }
    }

    // Local fallback for guest/offline customers
    const users = JSON.parse(localStorage.getItem('ghost_local_users') || '[]');
    const user = users.find(u => u.email === email);

    if (!user) {
      _showToast('No account found with this email. Please register first.', 'error');
      throw new Error('User not found');
    }

    if (user.passwordHash && user.passwordHash !== btoa(password)) {
      _showToast('Invalid password. Please try again.', 'error');
      throw new Error('Wrong password');
    }

    user.lastLoginAt = new Date().toISOString();
    _currentUser = user;
    _isAdmin = false;
    _saveUser(user);
    _notifySubscribers();

    _showToast('Sanctuary gates unlocked. Welcome back, ' + (user.displayName || 'Patron') + '!', 'success');
    return user;
  }

  // ────────────────────────────────────────────────────
  //  Sign Out
  // ────────────────────────────────────────────────────
  async function signOut() {
    try {
      if (GhostFirebase.auth && GhostFirebase.isConfigured()) {
        await GhostFirebase.auth.signOut();
      }
    } catch (_) {}

    _currentUser = null;
    _isAdmin = false;
    _saveUser(null);
    _notifySubscribers();
    _showToast('You have departed the sanctuary.', 'info');
  }

  async function resetPassword(email) {
    if (GhostFirebase.isConfigured() && GhostFirebase.auth) {
      try {
        await GhostFirebase.auth.sendPasswordResetEmail(email);
        _showToast('Password reset transmission sent. Check your inbox.', 'success');
        return;
      } catch (err) {
        _handleAuthError(err);
        throw err;
      }
    }
    _showToast('Password reset simulated for: ' + email, 'info');
  }

  // ────────────────────────────────────────────────────
  //  Auth State Observer & UI Updating
  // ────────────────────────────────────────────────────
  function onAuthStateChanged(callback) {
    if (typeof callback === 'function') {
      _subscribers.push(callback);
    }

    // Check saved session
    const saved = _getSavedUser();
    if (saved) {
      _currentUser = saved;
      _isAdmin = (saved.role === 'admin') && _isEmailAdmin(saved.email);
      _updateAuthUI(_currentUser);
      if (typeof callback === 'function') callback(_currentUser);
    }

    // Listen to Firebase Auth if active
    if (GhostFirebase.auth && GhostFirebase.isConfigured()) {
      GhostFirebase.auth.onAuthStateChanged(async (user) => {
        const currentSaved = _getSavedUser();
        if (user) {
          _currentUser = user;
          _isAdmin = _isEmailAdmin(user.email);
          _saveUser({ ...user, role: _isAdmin ? 'admin' : 'customer' });
        } else if (currentSaved && _isEmailAdmin(currentSaved.email)) {
          // Keep active admin session intact
          _currentUser = currentSaved;
          _isAdmin = true;
        } else if (!currentSaved) {
          _currentUser = null;
          _isAdmin = false;
          _saveUser(null);
        }
        _updateAuthUI(_currentUser);
        _notifySubscribers();
      });
    } else {
      _updateAuthUI(_currentUser);
    }
  }

  function _notifySubscribers() {
    _updateAuthUI(_currentUser);
    _subscribers.forEach(cb => {
      try { cb(_currentUser); } catch (_) {}
    });
  }

  async function _checkAdmin(uid, email) {
    return _isEmailAdmin(email);
  }

  function _updateAuthUI(user) {
    const loggedOutEls = document.querySelectorAll('[data-auth="logged-out"]');
    const loggedInEls  = document.querySelectorAll('[data-auth="logged-in"]');
    const nameEls      = document.querySelectorAll('[data-auth="user-name"]');
    const adminEls     = document.querySelectorAll('[data-auth="admin-only"]');

    if (user) {
      loggedOutEls.forEach(el => el.style.display = 'none');
      loggedInEls.forEach(el => el.style.display = '');
      nameEls.forEach(el => { el.textContent = user.displayName || user.email || 'Patron'; });
      // Show admin button ONLY if the logged in user is actually an admin!
      adminEls.forEach(el => { el.style.display = _isAdmin ? '' : 'none'; });
    } else {
      loggedOutEls.forEach(el => el.style.display = '');
      loggedInEls.forEach(el => el.style.display = 'none');
      nameEls.forEach(el => { el.textContent = ''; });
      adminEls.forEach(el => { el.style.display = 'none'; });
    }
  }

  function _handleAuthError(err) {
    const msg = err.message || 'Authentication error';
    _showToast(msg, 'error');
  }

  function _showToast(message, type) {
    if (typeof GhostApp !== 'undefined' && GhostApp.showToast) {
      GhostApp.showToast(message, type);
    } else {
      console.log(`[GhostAuth / ${type}] ${message}`);
    }
  }

  function bindAuthForms() {
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
      signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name  = (signupForm.querySelector('#signup-name')?.value || '').trim();
        const email = (signupForm.querySelector('#signup-email')?.value || '').trim();
        const pass  = signupForm.querySelector('#signup-password')?.value || '';
        if (!email || !pass) return _showToast('Please enter email and password.', 'warning');
        try {
          await signUp(email, pass, name);
          signupForm.reset();
        } catch (_) {}
      });
    }

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = (loginForm.querySelector('#login-email')?.value || '').trim();
        const pass  = loginForm.querySelector('#login-password')?.value || '';
        if (!email || !pass) return _showToast('Please enter email and password.', 'warning');
        try {
          await signIn(email, pass);
          loginForm.reset();
        } catch (_) {}
      });
    }

    document.querySelectorAll('#logout-btn, .logout-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        await signOut();
      });
    });
  }

  return Object.freeze({
    signUp,
    signIn,
    signOut,
    resetPassword,
    onAuthStateChanged,
    isAdmin: () => _isAdmin,
    getCurrentUser: () => _currentUser,
    bindAuthForms
  });
})();
