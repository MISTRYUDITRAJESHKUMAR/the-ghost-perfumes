/**
 * ═══════════════════════════════════════════════════════════════
 *  THE GHOST PERFUMES — Main Application Controller
 * ═══════════════════════════════════════════════════════════════
 *
 *  Boots on DOMContentLoaded:
 *    • Navigation (mobile menu, scroll effects)
 *    • Auth state listener
 *    • Cart badge on every page
 *    • Page-specific module initialisation (shop, product, cart…)
 *    • Animations (particles, reveals, tilt cards…)
 *    • Toast notification system
 *    • Loading overlay
 *    • Modal system
 *    • Newsletter & contact form handling
 *
 *  Depends on:
 *    firebase-init.js  (GhostFirebase)
 *    auth.js           (GhostAuth)
 *    cart.js           (GhostCart)
 *    products.js       (GhostProducts)
 *    animations.js     (GhostAnimations)
 *    shop.js           (GhostShop)
 * ═══════════════════════════════════════════════════════════════
 */

/* global GhostFirebase, GhostAuth, GhostCart, GhostProducts,
          GhostAnimations, GhostShop */

const GhostApp = (function () {
  'use strict';

  // ════════════════════════════════════════════════════
  //  Toast Notification System
  // ════════════════════════════════════════════════════
  const _toastDefaults = { duration: 4000 };
  let _toastContainer  = null;

  function _ensureToastContainer() {
    if (_toastContainer) return _toastContainer;
    _toastContainer = document.createElement('div');
    _toastContainer.id = 'toast-container';
    _toastContainer.className = 'toast-container';
    _toastContainer.setAttribute('aria-live', 'polite');
    document.body.appendChild(_toastContainer);
    return _toastContainer;
  }

  /**
   * Show a toast notification.
   * @param {string} message
   * @param {'success'|'error'|'warning'|'info'} [type='info']
   * @param {number} [duration]
   */
  function showToast(message, type, duration) {
    const container = _ensureToastContainer();
    const dur = duration || _toastDefaults.duration;

    const icons = {
      success: '✓',
      error:   '✕',
      warning: '⚠',
      info:    'ℹ'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast--${type || 'info'}`;
    toast.innerHTML = `
      <span class="toast__icon">${icons[type] || icons.info}</span>
      <span class="toast__message">${_escHtml(message)}</span>
      <button class="toast__close" aria-label="Dismiss">&times;</button>`;

    container.appendChild(toast);

    // Trigger enter animation (browser needs a frame)
    requestAnimationFrame(() => toast.classList.add('toast--visible'));

    const dismiss = () => {
      toast.classList.remove('toast--visible');
      toast.addEventListener('transitionend', () => toast.remove(), { once: true });
      // Safety net — remove after transition max
      setTimeout(() => { if (toast.parentNode) toast.remove(); }, 500);
    };

    toast.querySelector('.toast__close').addEventListener('click', dismiss);
    setTimeout(dismiss, dur);
  }

  // ════════════════════════════════════════════════════
  //  Loading Overlay (Bulletproof with Failsafe)
  // ════════════════════════════════════════════════════
  let _loadingOverlay = null;
  let _loadingTimer   = null;

  function showLoading(msg) {
    if (!_loadingOverlay) {
      _loadingOverlay = document.getElementById('loading-overlay');
    }
    if (!_loadingOverlay) return;

    if (msg) {
      const textEl = _loadingOverlay.querySelector('.loading-text, p');
      if (textEl) textEl.textContent = msg;
    }

    if (_loadingTimer) clearTimeout(_loadingTimer);

    _loadingOverlay.style.display = 'flex';
    _loadingOverlay.classList.add('active');
    document.body.classList.add('loading');

    // Failsafe: Automatically dismiss after 1.5 seconds so user is NEVER stuck
    _loadingTimer = setTimeout(() => {
      hideLoading();
    }, 1500);
  }

  function hideLoading() {
    if (_loadingTimer) {
      clearTimeout(_loadingTimer);
      _loadingTimer = null;
    }
    if (!_loadingOverlay) {
      _loadingOverlay = document.getElementById('loading-overlay');
    }
    if (_loadingOverlay) {
      _loadingOverlay.classList.remove('active');
      _loadingOverlay.style.display = 'none';
    }
    document.body.classList.remove('loading');
  }

  // ════════════════════════════════════════════════════
  //  Modal System
  // ════════════════════════════════════════════════════
  let _modalOverlay = null;

  function _ensureModalOverlay() {
    if (_modalOverlay) return _modalOverlay;
    _modalOverlay = document.createElement('div');
    _modalOverlay.id = 'modal-overlay';
    _modalOverlay.className = 'modal-overlay';
    _modalOverlay.innerHTML = `
      <div class="modal-content">
        <button class="modal-close" aria-label="Close modal">&times;</button>
        <div class="modal-body"></div>
      </div>`;
    document.body.appendChild(_modalOverlay);

    // Close on overlay click
    _modalOverlay.addEventListener('click', (e) => {
      if (e.target === _modalOverlay) closeModal();
    });
    _modalOverlay.querySelector('.modal-close').addEventListener('click', closeModal);

    // ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && _modalOverlay.classList.contains('active')) closeModal();
    });

    return _modalOverlay;
  }

  /**
   * @param {string} html — inner HTML for the modal body
   * @param {string} [extraClass] — optional class added to .modal-content
   */
  function openModal(html, extraClass) {
    const overlay = _ensureModalOverlay();
    const body    = overlay.querySelector('.modal-body');
    const content = overlay.querySelector('.modal-content');

    body.innerHTML = html;
    if (extraClass) content.classList.add(extraClass);
    overlay.classList.add('active');
    document.body.classList.add('modal-open');
  }

  function closeModal() {
    if (!_modalOverlay) return;
    _modalOverlay.classList.remove('active');
    document.body.classList.remove('modal-open');
    const content = _modalOverlay.querySelector('.modal-content');
    // Strip dynamic classes
    content.className = 'modal-content';
  }

  // ════════════════════════════════════════════════════
  //  Navigation — mobile menu & scroll
  // ════════════════════════════════════════════════════
  function _initNavigation() {
    // Mobile hamburger toggle
    const toggle    = document.querySelector('.mobile-menu-btn, #mobileMenuBtn, .nav-toggle, .hamburger, #mobile-menu-toggle');
    const mobileNav = document.querySelector('.nav-links, #navLinks, .mobile-nav, #mobile-nav');

    if (toggle && mobileNav) {
      let backdrop = document.querySelector('.mobile-menu-backdrop');
      if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.className = 'mobile-menu-backdrop';
        document.body.appendChild(backdrop);
      }

      const closeMenu = () => {
        mobileNav.classList.remove('open', 'active');
        toggle.classList.remove('active');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('nav-open');
        backdrop.classList.remove('active');
        const icon = toggle.querySelector('i');
        if (icon) { icon.className = 'fas fa-bars'; }
      };

      const openMenu = () => {
        mobileNav.classList.add('open', 'active');
        toggle.classList.add('active');
        toggle.setAttribute('aria-expanded', 'true');
        document.body.classList.add('nav-open');
        backdrop.classList.add('active');
        const icon = toggle.querySelector('i');
        if (icon) { icon.className = 'fas fa-times'; }
      };

      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        if (mobileNav.classList.contains('open') || mobileNav.classList.contains('active')) {
          closeMenu();
        } else {
          openMenu();
        }
      });

      backdrop.addEventListener('click', closeMenu);

      // Close on nav link click
      mobileNav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', closeMenu);
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeMenu();
      });
    }

    // Smooth scroll for all anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        const target = document.querySelector(anchor.getAttribute('href'));
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });

    // Active nav link highlighting
    _highlightActiveNav();
  }

  function _highlightActiveNav() {
    const path = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link, .nav-links a').forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.includes(path)) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  // ════════════════════════════════════════════════════
  //  Form handlers
  // ════════════════════════════════════════════════════
  function _initNewsletterForm() {
    const form = document.getElementById('newsletter-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailInput = form.querySelector('input[type="email"]');
      const email = emailInput ? emailInput.value.trim() : '';

      if (!email) return showToast('Please enter your email.', 'warning');

      try {
        await GhostFirebase.db.collection('newsletter').add({
          email,
          subscribedAt: GhostFirebase.timestamp()
        });
        showToast('Welcome to the spectral circle! 👻', 'success');
        form.reset();
      } catch (err) {
        console.error('[Newsletter]', err);
        showToast('Could not subscribe. Try again later.', 'error');
      }
    });
  }

  function _initContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form));

      if (!data.name || !data.email || !data.message) {
        return showToast('Please fill in all required fields.', 'warning');
      }

      try {
        await GhostFirebase.db.collection('messages').add({
          ...data,
          createdAt: GhostFirebase.timestamp(),
          read: false
        });
        showToast('Message sent! We\'ll get back to you soon.', 'success');
        form.reset();
      } catch (err) {
        console.error('[Contact]', err);
        showToast('Could not send message. Try again later.', 'error');
      }
    });
  }

  // ════════════════════════════════════════════════════
  //  Page-specific initialization
  // ════════════════════════════════════════════════════
  function _detectAndInitPage() {
    const path = window.location.pathname.toLowerCase();
    const page = path.split('/').pop().replace('.html', '') || 'index';

    switch (true) {
      // ── Home / Index ───────────────────────────
      case page === 'index' || page === '' || path === '/':
        _initHomePage();
        break;

      // ── Shop ───────────────────────────────────
      case page === 'shop':
        GhostShop.init();
        GhostAnimations.init({ hero: false });
        break;

      // ── Single Product ─────────────────────────
      case page === 'product':
        _initProductPage();
        break;

      // ── Cart ───────────────────────────────────
      case page === 'cart':
        _initCartPage();
        break;

      // ── About ──────────────────────────────────
      case page === 'about':
        GhostAnimations.init({ hero: false });
        break;

      // ── Contact ────────────────────────────────
      case page === 'contact':
        GhostAnimations.init({ hero: false, particles: true });
        break;

      // ── Fallback (any page) ────────────────────
      default:
        GhostAnimations.init({ hero: false });
    }
  }

  async function _initHomePage() {
    GhostAnimations.init({ hero: true, particles: true });

    // Featured products
    const featuredGrid = document.getElementById('featured-products');
    if (featuredGrid) {
      try {
        const featured = await GhostProducts.fetchFeatured(8);
        GhostProducts.renderCards(featuredGrid, featured);
        GhostAnimations.initTiltCards();
        GhostAnimations.initLazyImages();
        _bindGridCartButtons(featuredGrid);
      } catch (err) {
        console.error('[Home] Featured products:', err);
      }
    }
  }

  async function _initProductPage() {
    GhostAnimations.init({ hero: false, particles: true });
    hideLoading();

    const params    = new URLSearchParams(window.location.search);
    let productId   = params.get('id');

    try {
      let product = null;
      if (productId) {
        product = await GhostProducts.fetchById(productId);
      }
      if (!product) {
        const all = await GhostProducts.fetchAll();
        product = all && all.length ? all[0] : null;
      }
      if (!product) {
        hideLoading();
        showToast('No fragrances available.', 'warning');
        return;
      }

      GhostProducts.renderDetail(product);
      hideLoading();

      // Add to cart button on detail page
      const addBtn = document.getElementById('add-to-cart-btn');
      if (addBtn) {
        addBtn.addEventListener('click', async () => {
          const sizeSelect = document.getElementById('product-sizes');
          const qtyInput   = document.getElementById('product-qty');
          const qty        = qtyInput ? parseInt(qtyInput.value, 10) || 1 : 1;

          let price = product.salePrice || product.price;
          let size  = null;

          if (sizeSelect && sizeSelect.selectedOptions[0]) {
            price = parseFloat(sizeSelect.selectedOptions[0].dataset.price) || price;
            size  = sizeSelect.value;
          }

          await GhostCart.addItem({
            productId: product.id,
            name:      product.name,
            price,
            image:     product.thumbnail || (product.images && product.images[0]) || '',
            quantity:  qty,
            size
          });
        });
      }

      // Related products
      const relatedGrid = document.getElementById('related-products');
      if (relatedGrid) {
        await GhostProducts.renderRelated(relatedGrid, product, 4);
        GhostAnimations.initTiltCards();
        GhostAnimations.initLazyImages();
        _bindGridCartButtons(relatedGrid);
      }
    } catch (err) {
      console.error('[Product]', err);
      showToast('Error loading product.', 'error');
    } finally {
      hideLoading();
    }
  }

  async function _initCartPage() {
    GhostAnimations.init({ hero: false, particles: false });
    const cartContainer = document.getElementById('cart-items');
    if (cartContainer) {
      await GhostCart.renderCart(cartContainer);
    }
  }

  /**
   * Bind add-to-cart buttons inside any product grid.
   */
  function _bindGridCartButtons(grid) {
    if (!grid) return;
    grid.addEventListener('click', async (e) => {
      const btn = e.target.closest('.btn--add-cart');
      if (!btn) return;
      e.preventDefault();
      const card = btn.closest('.product-card');
      const img  = card ? card.querySelector('.product-card__image') : null;

      await GhostCart.addItem({
        productId: btn.dataset.productId,
        name:      btn.dataset.productName,
        price:     parseFloat(btn.dataset.productPrice),
        image:     img ? (img.src || img.dataset.src || '') : '',
        quantity:  1
      });
    });
  }

  // ════════════════════════════════════════════════════
  //  Dynamic Storefront Content (Editable from Admin)
  // ════════════════════════════════════════════════════
  //  Storefront Live Settings (Hero Tagline, About Story)
  // ════════════════════════════════════════════════════
  const RTDB_URL = 'https://perfume-37ca2-default-rtdb.asia-southeast1.firebasedatabase.app';

  async function _applyStoreSettings() {
    let settings = null;
    try {
      settings = JSON.parse(localStorage.getItem('ghost_store_settings') || 'null');
    } catch (_) {}

    // 1. Apply local settings immediately without waiting for network
    if (settings) {
      _renderSettingsDOM(settings);
    }

    // 2. Realtime listener via Firebase RTDB (works on Vercel + all devices)
    try {
      if (GhostFirebase && GhostFirebase.rtdb) {
        GhostFirebase.rtdb.ref('settings').on('value', (snapshot) => {
          const val = snapshot.val();
          if (val) {
            settings = { ...(settings || {}), ...val };
            localStorage.setItem('ghost_store_settings', JSON.stringify(settings));
            _renderSettingsDOM(settings);
          }
        });
      }
    } catch (_) {}

    // 3. Direct REST fetch to RTDB (always works on Vercel)
    try {
      const resp = await fetch(RTDB_URL + '/settings.json');
      if (resp.ok) {
        const val = await resp.json();
        if (val) {
          settings = { ...(settings || {}), ...val };
          localStorage.setItem('ghost_store_settings', JSON.stringify(settings));
          _renderSettingsDOM(settings);
          return;
        }
      }
    } catch (_) {}

    // 4. Server API fallback
    try {
      const resp = await fetch('/api/settings');
      if (resp.ok) {
        const json = await resp.json();
        if (json.success && json.settings) {
          settings = { ...(settings || {}), ...json.settings };
          localStorage.setItem('ghost_store_settings', JSON.stringify(settings));
          _renderSettingsDOM(settings);
        }
      }
    } catch (_) {}
  }

  function _renderSettingsDOM(settings) {
    if (!settings) return;

    // 1. Home page hero elements
    const taglineEl = document.querySelector('.hero-tagline');
    if (taglineEl && settings.heroTagline) taglineEl.textContent = settings.heroTagline;

    const titleEl = document.querySelector('.hero-title');
    if (titleEl && settings.heroTitle && titleEl.textContent !== settings.heroTitle) {
      titleEl.textContent = settings.heroTitle;
      titleEl.classList.remove('hero-char-animated');
      if (typeof GhostAnimations !== 'undefined' && GhostAnimations.heroTextReveal) {
        GhostAnimations.heroTextReveal('.hero-title');
      }
    }

    const descEl = document.querySelector('.hero-description');
    if (descEl && settings.heroDescription) descEl.textContent = settings.heroDescription;

    // 2. About page elements
    const aboutSubEl = document.querySelector('.philosophy-grid .section-subtitle');
    if (aboutSubEl && settings.aboutSubtitle) aboutSubEl.textContent = settings.aboutSubtitle;

    const aboutHeadingEl = document.querySelector('.philosophy-grid h2');
    if (aboutHeadingEl && settings.aboutHeading) aboutHeadingEl.textContent = settings.aboutHeading;

    const aboutParas = document.querySelectorAll('.philosophy-grid p');
    if (aboutParas[0] && settings.aboutStory1) aboutParas[0].textContent = settings.aboutStory1;
    if (aboutParas[1] && settings.aboutStory2) aboutParas[1].textContent = settings.aboutStory2;

    const quoteEl = document.querySelector('.page-header p');
    if (quoteEl && settings.aboutQuote && window.location.pathname.includes('about')) {
      quoteEl.textContent = settings.aboutQuote;
    }
  }

  // ════════════════════════════════════════════════════
  //  Utility
  // ════════════════════════════════════════════════════
  function _escHtml(s) {
    if (!s) return '';
    const el = document.createElement('span');
    el.textContent = s;
    return el.innerHTML;
  }

  // ════════════════════════════════════════════════════
  //  Boot
  // ════════════════════════════════════════════════════
  async function _boot() {
    // 0. Dynamic Store Content from Admin
    _applyStoreSettings();

    // 1. Navigation
    _initNavigation();

    // 2. Auth state
    GhostAuth.onAuthStateChanged();
    GhostAuth.bindAuthForms();

    // 3. Cart badge
    GhostCart.updateBadge();

    // 4. Forms
    _initNewsletterForm();
    _initContactForm();

    // 5. Page-specific init
    _detectAndInitPage();

    console.log(
      '%c👻 THE GHOST PERFUMES — Ready',
      'color:#b388ff;font-weight:bold;font-size:14px;'
    );
  }

  // ── DOMContentLoaded ───────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _boot);
  } else {
    _boot();
  }

  // ════════════════════════════════════════════════════
  //  Public API
  // ════════════════════════════════════════════════════
  return Object.freeze({
    showToast,
    showLoading,
    hideLoading,
    openModal,
    closeModal
  });
})();
