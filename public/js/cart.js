/**
 * ═══════════════════════════════════════════════════════════════
 *  THE GHOST PERFUMES — Shopping Cart Module
 * ═══════════════════════════════════════════════════════════════
 *
 *  Dual-storage strategy:
 *    • Logged-in users  → Firestore  carts/{uid}/items/{productId}
 *    • Guest visitors   → localStorage  "ghost_cart"
 *
 *  On login the guest cart is merged into the user's Firestore
 *  cart, and localStorage is cleared.
 *
 *  Depends on: firebase-init.js (GhostFirebase)
 * ═══════════════════════════════════════════════════════════════
 */

/* global GhostFirebase, GhostAuth, GhostApp, firebase */

const GhostCart = (function () {
  'use strict';

  const db = GhostFirebase.db;
  const LS_KEY = 'ghost_cart';

  const TAX_RATE        = 0;      // Prices inclusive of GST
  const FREE_SHIP_ABOVE = 999;    // Free shipping above ₹999
  const FLAT_SHIP_RATE  = 99;     // ₹99 standard shipping below threshold

  // ────────────────────────────────────────────────────
  //  Helpers — current user
  // ────────────────────────────────────────────────────
  function _uid() {
    const user = (typeof GhostAuth !== 'undefined' && GhostAuth.getCurrentUser)
      ? GhostAuth.getCurrentUser()
      : (GhostFirebase.auth.currentUser || null);
    return user ? user.uid : null;
  }

  function _cartCol(uid) {
    return db.collection('carts').doc(uid).collection('items');
  }

  // ────────────────────────────────────────────────────
  //  LocalStorage helpers
  // ────────────────────────────────────────────────────
  function _lsGet() {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY)) || [];
    } catch (_) {
      return [];
    }
  }

  function _lsSet(items) {
    localStorage.setItem(LS_KEY, JSON.stringify(items));
  }

  function _lsClear() {
    localStorage.removeItem(LS_KEY);
  }

  // ────────────────────────────────────────────────────
  //  Add to cart — Bulletproof & Instant
  // ────────────────────────────────────────────────────
  /**
   * @param {{ productId, name, price, image, quantity?, size? }} item
   */
  async function addItem(item) {
    if (!item || !item.productId) return;
    const qty = parseInt(item.quantity, 10) || 1;
    const size = item.size || null;

    try {
      // 1. ALWAYS update local cart first — instant & 100% reliable
      const cart = _lsGet();
      const idx  = cart.findIndex(c => c.productId === item.productId && (c.size || null) === size);

      if (idx > -1) {
        cart[idx].quantity = (parseInt(cart[idx].quantity, 10) || 0) + qty;
      } else {
        cart.push({
          productId: item.productId,
          name:      item.name || 'Spectral Essence',
          price:     parseFloat(item.price) || 0,
          image:     item.image || '',
          size:      size,
          quantity:  qty
        });
      }
      _lsSet(cart);

      // 2. Show instant feedback & update badge count
      _toast(`${item.name} added to bag! 🛍️`, 'success');
      await updateBadge();

      // 3. Optional: Sync to Firestore in background without blocking or throwing
      const uid = _uid();
      if (uid && GhostFirebase && GhostFirebase.isConfigured() && GhostFirebase.db) {
        try {
          const ref = _cartCol(uid).doc(item.productId);
          ref.set({
            productId: item.productId,
            name:      item.name || '',
            price:     parseFloat(item.price) || 0,
            image:     item.image || '',
            size:      size,
            quantity:  idx > -1 ? cart[idx].quantity : qty,
            updatedAt: GhostFirebase.timestamp()
          }, { merge: true }).catch(() => {});
        } catch (_) {}
      }
    } catch (err) {
      console.error('[GhostCart] addItem:', err);
      // Fallback local save if anything went wrong
      try {
        const cart = _lsGet();
        cart.push({ ...item, quantity: qty });
        _lsSet(cart);
        _toast(`${item.name} added to bag!`, 'success');
        updateBadge();
      } catch (_) {
        _toast('Could not add item to cart.', 'error');
      }
    }
  }

  // ────────────────────────────────────────────────────
  //  Remove from cart
  // ────────────────────────────────────────────────────
  /**
   * @param {string} productId
   * @param {string|null} [size]
   */
  async function removeItem(productId, size) {
    try {
      // 1. Always remove from local storage immediately
      const cart = _lsGet().filter(c => !(c.productId === productId && (c.size || null) === (size || null)));
      _lsSet(cart);
      _toast('Item removed from cart.', 'info');
      await updateBadge();

      // 2. Optional: Cloud delete in background
      const uid = _uid();
      if (uid && GhostFirebase && GhostFirebase.isConfigured() && GhostFirebase.db) {
        try {
          _cartCol(uid).doc(productId).delete().catch(() => {});
        } catch (_) {}
      }
    } catch (err) {
      console.error('[GhostCart] removeItem:', err);
    }
  }

  // ────────────────────────────────────────────────────
  //  Update quantity
  // ────────────────────────────────────────────────────
  /**
   * @param {string} productId
   * @param {number} quantity
   * @param {string|null} [size]
   */
  async function updateQuantity(productId, quantity, size) {
    if (quantity < 1) return removeItem(productId, size);

    try {
      // 1. Always update local storage immediately
      const cart = _lsGet();
      const idx  = cart.findIndex(c => c.productId === productId && (c.size || null) === (size || null));
      if (idx > -1) {
        cart[idx].quantity = quantity;
        _lsSet(cart);
      }
      await updateBadge();

      // 2. Optional: Cloud sync in background
      const uid = _uid();
      if (uid && GhostFirebase && GhostFirebase.isConfigured() && GhostFirebase.db) {
        try {
          _cartCol(uid).doc(productId).update({
            quantity,
            updatedAt: GhostFirebase.timestamp()
          }).catch(() => {});
        } catch (_) {}
      }
    } catch (err) {
      console.error('[GhostCart] updateQuantity:', err);
    }
  }

  // ────────────────────────────────────────────────────
  //  Get cart items — Reliable & Instant
  // ────────────────────────────────────────────────────
  /**
   * @returns {Promise<Object[]>}
   */
  async function getItems() {
    // Local storage is single source of truth for seamless responsiveness
    const local = _lsGet();
    return local;
  }

  // ────────────────────────────────────────────────────
  //  Totals
  // ────────────────────────────────────────────────────
  /**
   * @param {Object[]} items
   * @returns {{ subtotal, tax, shipping, total, itemCount }}
   */
  function calculateTotals(items) {
    const subtotal  = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    const tax       = subtotal * TAX_RATE;
    const shipping  = subtotal >= FREE_SHIP_ABOVE ? 0 : FLAT_SHIP_RATE;
    const total     = subtotal + tax + shipping;
    const itemCount = items.reduce((n, i) => n + i.quantity, 0);

    return {
      subtotal:  Math.round(subtotal * 100) / 100,
      tax:       Math.round(tax * 100) / 100,
      shipping:  Math.round(shipping * 100) / 100,
      total:     Math.round(total * 100) / 100,
      itemCount
    };
  }

  // ────────────────────────────────────────────────────
  //  Render cart page
  // ────────────────────────────────────────────────────
  /**
   * @param {HTMLElement} container
   */
  async function renderCart(container) {
    if (!container) return;
    const items = await getItems();

    if (!items.length) {
      container.innerHTML = `
        <div class="cart-empty">
          <i class="icon-cart-empty"></i>
          <h2>Your cart is empty</h2>
          <p>Looks like you haven't added any spirits to your collection yet.</p>
          <a href="shop.html" class="btn btn--primary">Browse Collection</a>
        </div>`;
      _renderSummary(null, { subtotal: 0, tax: 0, shipping: 0, total: 0, itemCount: 0 });
      return;
    }

    const totals = calculateTotals(items);

    container.innerHTML = `
      <div class="cart-items">
        ${items.map(_renderCartRow).join('')}
      </div>`;

    _renderSummary(container, totals);
    _bindCartEvents(container);
  }

  function _renderCartRow(item) {
    return `
      <div class="cart-item" data-product-id="${item.productId}" data-size="${item.size || ''}">
        <div class="cart-item__image">
          <img src="${_esc(item.image)}" alt="${_esc(item.name)}" />
        </div>
        <div class="cart-item__details">
          <h3 class="cart-item__name">${_esc(item.name)}</h3>
          ${item.size ? `<p class="cart-item__size">Size: ${_esc(item.size)}</p>` : ''}
          <p class="cart-item__price">₹${Number(item.price).toLocaleString('en-IN')}</p>
        </div>
        <div class="cart-item__quantity">
          <button class="qty-btn qty-btn--minus" data-product-id="${item.productId}" data-size="${item.size || ''}" aria-label="Decrease quantity">−</button>
          <span class="qty-value">${item.quantity}</span>
          <button class="qty-btn qty-btn--plus" data-product-id="${item.productId}" data-size="${item.size || ''}" aria-label="Increase quantity">+</button>
        </div>
        <div class="cart-item__total">
          ₹${Number(item.price * item.quantity).toLocaleString('en-IN')}
        </div>
        <button class="cart-item__remove" data-product-id="${item.productId}" data-size="${item.size || ''}" aria-label="Remove item">
          &times;
        </button>
      </div>`;
  }

  function _renderSummary(container, totals) {
    const el = document.getElementById('cart-summary');
    if (!el) return;

    el.innerHTML = `
      <div class="cart-summary__row"><span>Subtotal</span><span>₹${Number(totals.subtotal).toLocaleString('en-IN')}</span></div>
      <div class="cart-summary__row">
        <span>Delivery</span>
        <span>${totals.shipping === 0 ? '<em style="color:#22c55e;">Free Delivery</em>' : `₹${Number(totals.shipping).toLocaleString('en-IN')}`}</span>
      </div>
      <div class="cart-summary__divider"></div>
      <div class="cart-summary__row cart-summary__total">
        <span>Total Amount</span><span style="color:var(--accent-gold);font-weight:700;">₹${Number(totals.total).toLocaleString('en-IN')}</span>
      </div>
      ${totals.subtotal > 0 && totals.subtotal < FREE_SHIP_ABOVE
        ? `<p class="cart-summary__hint">Add ₹${Number(FREE_SHIP_ABOVE - totals.subtotal).toLocaleString('en-IN')} more for free delivery!</p>`
        : ''}
      <button class="btn btn--primary btn--full btn--checkout" ${totals.itemCount === 0 ? 'disabled' : ''}>
        <i class="fab fa-whatsapp" style="margin-right:0.5rem;font-size:1.1rem;color:#25d366;"></i> Proceed to Checkout
      </button>`;
  }

  function _bindCartEvents(container) {
    // Quantity buttons
    container.addEventListener('click', async (e) => {
      const btn = e.target.closest('.qty-btn');
      if (btn) {
        const pid  = btn.dataset.productId;
        const size = btn.dataset.size || null;
        const row  = btn.closest('.cart-item');
        const cur  = parseInt(row.querySelector('.qty-value').textContent, 10);
        const next = btn.classList.contains('qty-btn--plus') ? cur + 1 : cur - 1;
        await updateQuantity(pid, next, size);
        await renderCart(container);
        return;
      }

      // Remove button
      const rem = e.target.closest('.cart-item__remove');
      if (rem) {
        await removeItem(rem.dataset.productId, rem.dataset.size || null);
        await renderCart(container);
      }
    });

    // Checkout button
    const checkoutBtn = container.parentElement && container.parentElement.querySelector('.btn--checkout');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', () => {
        if (!_uid()) {
          _toast('Please sign in to checkout.', 'warning');
          return;
        }
        window.location.href = 'checkout.html';
      });
    }
  }

  // ────────────────────────────────────────────────────
  //  Badge
  // ────────────────────────────────────────────────────
  async function updateBadge() {
    try {
      const items = await getItems();
      const count = items.reduce((n, i) => n + (parseInt(i.quantity, 10) || 1), 0);
      document.querySelectorAll('[data-cart-count], .cart-badge, #cart-badge').forEach(el => {
        el.textContent = count;
        el.style.display = count > 0 ? 'inline-flex' : 'none';
      });
    } catch (_) {}
  }

  // ────────────────────────────────────────────────────
  //  Merge guest cart → user cart
  // ────────────────────────────────────────────────────
  /**
   * @param {string} uid
   */
  async function mergeGuestCart(uid) {
    const guestItems = _lsGet();
    if (!guestItems.length) return;

    const col = _cartCol(uid);
    const batch = db.batch();

    for (const item of guestItems) {
      const ref  = col.doc(item.productId);
      const snap = await ref.get();

      if (snap.exists) {
        batch.update(ref, {
          quantity:  GhostFirebase.increment(item.quantity),
          updatedAt: GhostFirebase.timestamp()
        });
      } else {
        batch.set(ref, {
          ...item,
          addedAt:   GhostFirebase.timestamp(),
          updatedAt: GhostFirebase.timestamp()
        });
      }
    }

    await batch.commit();
    _lsClear();
    await updateBadge();
  }

  // ────────────────────────────────────────────────────
  //  Clear cart (after successful order)
  // ────────────────────────────────────────────────────
  async function clearCart() {
    _lsClear();
    await updateBadge();

    const uid = _uid();
    if (uid && GhostFirebase && GhostFirebase.isConfigured() && GhostFirebase.db) {
      try {
        const snap = await _cartCol(uid).get();
        const batch = GhostFirebase.db.batch();
        snap.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit().catch(() => {});
      } catch (_) {}
    }
  }

  // ────────────────────────────────────────────────────
  //  Create Order
  // ────────────────────────────────────────────────────
  /**
   * @param {{ shippingAddress, billingAddress, paymentMethod }} details
   * @returns {Promise<string>} orderId
   */
  async function createOrder(details) {
    const uid = _uid();
    if (!uid) throw new Error('User must be signed in to place an order.');

    const items  = await getItems();
    if (!items.length) throw new Error('Cart is empty.');

    const totals = calculateTotals(items);

    const orderData = {
      uid,
      items:     items.map(i => ({
        productId: i.productId,
        name:      i.name,
        price:     i.price,
        quantity:  i.quantity,
        size:      i.size || null,
        image:     i.image || ''
      })),
      subtotal:  totals.subtotal,
      tax:       totals.tax,
      shipping:  totals.shipping,
      total:     totals.total,
      status:    'pending',
      shippingAddress: details.shippingAddress || null,
      billingAddress:  details.billingAddress  || null,
      paymentMethod:   details.paymentMethod   || null,
      createdAt: GhostFirebase.timestamp(),
      updatedAt: GhostFirebase.timestamp()
    };

    try {
      const docRef = await db.collection('orders').add(orderData);

      // Also store a reference on the user document
      await db.collection('users').doc(uid).update({
        orders: GhostFirebase.arrayUnion(docRef.id)
      });

      await clearCart();
      _toast('Order placed successfully!', 'success');
      return docRef.id;
    } catch (err) {
      console.error('[GhostCart] createOrder:', err);
      _toast('Failed to place order. Please try again.', 'error');
      throw err;
    }
  }

  // ────────────────────────────────────────────────────
  //  Internal helpers
  // ────────────────────────────────────────────────────
  function _esc(s) {
    if (!s) return '';
    const el = document.createElement('span');
    el.textContent = s;
    return el.innerHTML;
  }

  function _toast(msg, type) {
    if (typeof GhostApp !== 'undefined' && GhostApp.showToast) {
      GhostApp.showToast(msg, type);
    } else {
      console.log(`[Toast/${type}] ${msg}`);
    }
  }

  // ────────────────────────────────────────────────────
  //  Public API
  // ────────────────────────────────────────────────────
  return Object.freeze({
    addItem,
    removeItem,
    updateQuantity,
    getItems,
    calculateTotals,
    renderCart,
    updateBadge,
    mergeGuestCart,
    clearCart,
    createOrder
  });
})();
