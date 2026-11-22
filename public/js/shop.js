/**
 * ═══════════════════════════════════════════════════════════════
 *  THE GHOST PERFUMES — Shop Page Controller
 * ═══════════════════════════════════════════════════════════════
 *
 *  Manages the /shop.html page: grid loading, category & price
 *  filtering, sorting, search, pagination, quick-view modal,
 *  and add-to-cart actions.
 *
 *  Depends on:
 *    firebase-init.js  (GhostFirebase)
 *    products.js       (GhostProducts)
 *    cart.js           (GhostCart)
 *    animations.js     (GhostAnimations)
 *    app.js            (GhostApp — toast, modal helpers)
 * ═══════════════════════════════════════════════════════════════
 */

/* global GhostProducts, GhostCart, GhostAnimations, GhostApp */

const GhostShop = (function () {
  'use strict';

  // ── State ──────────────────────────────────────────
  let _allProducts    = [];
  let _filtered       = [];
  let _currentPage    = 1;
  const PER_PAGE      = 12;

  // ── DOM refs (cached after init) ───────────────────
  let _grid           = null;
  let _searchInput    = null;
  let _sortSelect     = null;
  let _categoryBtns   = null;
  let _priceMin       = null;
  let _priceMax       = null;
  let _paginationWrap = null;

  // ── Active filters ─────────────────────────────────
  let _activeCategory = 'all';
  let _activePriceMin = 0;
  let _activePriceMax = Infinity;
  let _activeSort     = 'newest';
  let _activeSearch   = '';

  // ────────────────────────────────────────────────────
  //  Initialise
  // ────────────────────────────────────────────────────
  async function init() {
    _grid           = document.getElementById('products-grid');
    _searchInput    = document.getElementById('shop-search');
    _sortSelect     = document.getElementById('shop-sort');
    _categoryBtns   = document.querySelectorAll('[data-category]');
    _priceMin       = document.getElementById('price-min');
    _priceMax       = document.getElementById('price-max');
    _paginationWrap = document.getElementById('shop-pagination');

    if (!_grid) return; // not on shop page

    _bindEvents();

    // Load products (realtime listener keeps cache fresh)
    GhostProducts.listenAll((products) => {
      _allProducts = products;
      _applyFilters();
    });

    // Fallback if listener is slow
    _allProducts = await GhostProducts.fetchAll();
    _applyFilters();
  }

  // ────────────────────────────────────────────────────
  //  Event bindings
  // ────────────────────────────────────────────────────
  function _bindEvents() {
    // Search
    if (_searchInput) {
      let debounce;
      _searchInput.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
          _activeSearch = _searchInput.value.trim();
          _currentPage  = 1;
          _applyFilters();
        }, 300);
      });
    }

    // Sort
    if (_sortSelect) {
      _sortSelect.addEventListener('change', () => {
        _activeSort  = _sortSelect.value;
        _currentPage = 1;
        _applyFilters();
      });
    }

    // Category buttons
    if (_categoryBtns.length) {
      _categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          _categoryBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          _activeCategory = btn.dataset.category;
          _currentPage    = 1;
          _applyFilters();
        });
      });
    }

    // Price range
    const priceApply = document.getElementById('price-apply');
    if (priceApply) {
      priceApply.addEventListener('click', () => {
        _activePriceMin = parseFloat((_priceMin && _priceMin.value) || 0) || 0;
        _activePriceMax = parseFloat((_priceMax && _priceMax.value) || Infinity) || Infinity;
        _currentPage    = 1;
        _applyFilters();
      });
    }

    // Delegation — add-to-cart & quick-view on the grid
    if (_grid) {
      _grid.addEventListener('click', async (e) => {
        const addBtn = e.target.closest('.btn--add-cart');
        if (addBtn) {
          e.preventDefault();
          await _addToCartFromBtn(addBtn);
          return;
        }

        const qvBtn = e.target.closest('.btn--quick-view');
        if (qvBtn) {
          e.preventDefault();
          _openQuickView(qvBtn.dataset.productId);
        }
      });
    }
  }

  // ────────────────────────────────────────────────────
  //  Filtering pipeline
  // ────────────────────────────────────────────────────
  function _applyFilters() {
    let result = [..._allProducts];

    // Category
    if (_activeCategory && _activeCategory !== 'all') {
      result = result.filter(p => p.category === _activeCategory);
    }

    // Price
    result = result.filter(p => {
      const price = p.salePrice || p.price;
      return price >= _activePriceMin && price <= _activePriceMax;
    });

    // Search
    if (_activeSearch) {
      result = GhostProducts.searchByName(_activeSearch, result);
    }

    // Sort
    result = GhostProducts.sortProducts(result, _activeSort);

    _filtered = result;
    _renderPage();
  }

  // ────────────────────────────────────────────────────
  //  Pagination & render
  // ────────────────────────────────────────────────────
  function _renderPage() {
    const start  = (_currentPage - 1) * PER_PAGE;
    const page   = _filtered.slice(start, start + PER_PAGE);

    // Show result count
    const countEl = document.getElementById('shop-result-count');
    if (countEl) countEl.textContent = `${_filtered.length} product${_filtered.length !== 1 ? 's' : ''}`;

    // Render cards
    GhostProducts.renderCards(_grid, page);

    // Re-attach tilt
    GhostAnimations.initTiltCards();
    GhostAnimations.initLazyImages();

    // Pagination
    _renderPagination();
  }

  function _renderPagination() {
    if (!_paginationWrap) return;
    const totalPages = Math.ceil(_filtered.length / PER_PAGE);
    if (totalPages <= 1) { _paginationWrap.innerHTML = ''; return; }

    let html = '';

    // Prev
    html += `<button class="page-btn ${_currentPage === 1 ? 'disabled' : ''}" data-page="${_currentPage - 1}" ${_currentPage === 1 ? 'disabled' : ''}>&laquo;</button>`;

    // Page numbers (show max 7 around current)
    const startP = Math.max(1, _currentPage - 3);
    const endP   = Math.min(totalPages, _currentPage + 3);
    for (let i = startP; i <= endP; i++) {
      html += `<button class="page-btn ${i === _currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }

    // Next
    html += `<button class="page-btn ${_currentPage === totalPages ? 'disabled' : ''}" data-page="${_currentPage + 1}" ${_currentPage === totalPages ? 'disabled' : ''}>&raquo;</button>`;

    _paginationWrap.innerHTML = html;

    _paginationWrap.querySelectorAll('.page-btn:not(.disabled)').forEach(btn => {
      btn.addEventListener('click', () => {
        _currentPage = parseInt(btn.dataset.page, 10);
        _renderPage();
        // Scroll to top of grid
        _grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  // ────────────────────────────────────────────────────
  //  Quick View Modal
  // ────────────────────────────────────────────────────
  async function _openQuickView(productId) {
    const product = await GhostProducts.fetchById(productId);
    if (!product) return;

    const price     = product.salePrice || product.price;
    const hasDiscount = product.salePrice && product.salePrice < product.price;

    const modalHTML = `
      <div class="quick-view">
        <div class="quick-view__image">
          <img src="${_esc(product.images && product.images[0])}" alt="${_esc(product.name)}" />
        </div>
        <div class="quick-view__info">
          <h2>${_esc(product.name)}</h2>
          <p class="quick-view__category">${_esc(product.category)}</p>
          <div class="quick-view__price">
            ${hasDiscount ? `<span class="price--old">\$${product.price.toFixed(2)}</span>` : ''}
            <span class="price--current">\$${price.toFixed(2)}</span>
          </div>
          <p class="quick-view__desc">${_esc(product.shortDesc || product.description)}</p>

          ${product.sizes && product.sizes.length ? `
            <div class="quick-view__sizes">
              <label for="qv-size">Size</label>
              <select id="qv-size">
                ${product.sizes.map(s => `<option value="${s.ml}" data-price="${s.price}">${s.label} (${s.ml}ml)</option>`).join('')}
              </select>
            </div>` : ''}

          <div class="quick-view__actions">
            <button class="btn btn--primary btn--add-cart-qv"
              data-product-id="${product.id}"
              data-product-name="${_esc(product.name)}"
              data-product-price="${price}"
              data-product-image="${_esc(product.thumbnail || (product.images && product.images[0]) || '')}">
              Add to Cart
            </button>
            <a href="product.html?id=${product.id}" class="btn btn--ghost">View Details</a>
          </div>
        </div>
      </div>`;

    if (typeof GhostApp !== 'undefined' && GhostApp.openModal) {
      GhostApp.openModal(modalHTML, 'quick-view-modal');
    } else {
      _fallbackModal(modalHTML);
    }

    // Bind add-to-cart inside modal
    const addBtn = document.querySelector('.btn--add-cart-qv');
    if (addBtn) {
      addBtn.addEventListener('click', async () => {
        const sizeSelect = document.getElementById('qv-size');
        const finalPrice = sizeSelect
          ? parseFloat(sizeSelect.selectedOptions[0].dataset.price)
          : price;

        await GhostCart.addItem({
          productId: product.id,
          name:      product.name,
          price:     finalPrice,
          image:     product.thumbnail || (product.images && product.images[0]) || '',
          quantity:  1,
          size:      sizeSelect ? sizeSelect.value : null
        });

        if (typeof GhostApp !== 'undefined' && GhostApp.closeModal) {
          GhostApp.closeModal();
        }
      });
    }
  }

  /** Minimal fallback modal if GhostApp is not available */
  function _fallbackModal(html) {
    let overlay = document.getElementById('qv-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'qv-overlay';
      overlay.className = 'modal-overlay active';
      document.body.appendChild(overlay);
    }
    overlay.innerHTML = `
      <div class="modal-content">
        <button class="modal-close" aria-label="Close">&times;</button>
        ${html}
      </div>`;
    overlay.classList.add('active');
    document.body.classList.add('modal-open');

    overlay.querySelector('.modal-close').addEventListener('click', () => {
      overlay.classList.remove('active');
      document.body.classList.remove('modal-open');
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('active');
        document.body.classList.remove('modal-open');
      }
    });
  }

  // ────────────────────────────────────────────────────
  //  Add to cart from card button
  // ────────────────────────────────────────────────────
  async function _addToCartFromBtn(btn) {
    const card = btn.closest('.product-card');
    const img  = card ? card.querySelector('.product-card__image') : null;

    await GhostCart.addItem({
      productId: btn.dataset.productId,
      name:      btn.dataset.productName,
      price:     parseFloat(btn.dataset.productPrice),
      image:     img ? (img.src || img.dataset.src || '') : '',
      quantity:  1
    });
  }

  // ────────────────────────────────────────────────────
  //  Utility
  // ────────────────────────────────────────────────────
  function _esc(s) {
    if (!s) return '';
    const el = document.createElement('span');
    el.textContent = s;
    return el.innerHTML;
  }

  // ────────────────────────────────────────────────────
  //  Public API
  // ────────────────────────────────────────────────────
  return Object.freeze({
    init
  });
})();
