/**
 * ═══════════════════════════════════════════════════════════════
 *  THE GHOST PERFUMES — Products Module
 * ═══════════════════════════════════════════════════════════════
 *
 *  Luxury Ethereal Fragrances catalog with 3D card tilt effects,
 *  real-time Firestore sync, and offline persistence.
 * ═══════════════════════════════════════════════════════════════
 */

/* global GhostFirebase, GhostApp */

const GhostProducts = (function () {
  'use strict';

  const _defaultCatalog = [];

  let _cache = [];
  let _unsubscribe = null;

  function _getLocalProducts() {
    try {
      const custom = JSON.parse(localStorage.getItem('ghost_custom_products') || '[]');
      const deleted = JSON.parse(localStorage.getItem('ghost_deleted_products') || '[]');
      const legacyDummyIds = ['ghost-01','ghost-02','ghost-03','ghost-04','ghost-05','ghost-06','ghost-07'];
      const filtered = custom.filter(p => !legacyDummyIds.includes(p.id) && !deleted.includes(p.id));
      if (filtered.length !== custom.length) {
        localStorage.setItem('ghost_custom_products', JSON.stringify(filtered));
      }
      return filtered;
    } catch (e) {
      return [];
    }
  }

  // ── RTDB URL for direct REST fallback ──
  const RTDB_URL = 'https://perfume-37ca2-default-rtdb.asia-southeast1.firebasedatabase.app';

  function _rtdbToArray(val) {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    return Object.entries(val).map(([id, data]) => ({ id, ...data }));
  }

  function listenAll(onUpdate) {
    _cache = _getLocalProducts();
    if (typeof onUpdate === 'function') onUpdate(_cache);

    function applyUpdate(arr) {
      _cache = Array.isArray(arr) ? arr : [];
      if (_cache.length > 0) {
        try { localStorage.setItem('ghost_custom_products', JSON.stringify(_cache)); } catch (_) {}
      } else {
        try {
          localStorage.removeItem('ghost_custom_products');
          localStorage.removeItem('ghost_deleted_products');
        } catch (_) {}
      }
      if (typeof onUpdate === 'function') onUpdate(_cache);
    }

    // PRIMARY: Firebase Realtime Database (works on Vercel + all devices)
    try {
      if (GhostFirebase && GhostFirebase.rtdb) {
        const productsRef = GhostFirebase.rtdb.ref('products');
        productsRef.on('value', (snapshot) => {
          const val = snapshot.val();
          const rtdbProducts = _rtdbToArray(val);
          applyUpdate(rtdbProducts);
        }, (err) => {
          console.warn('[GhostProducts] RTDB listener deferred:', err.message);
        });
        _unsubscribe = () => productsRef.off('value');
      }
    } catch (e) {
      console.warn('[GhostProducts] RTDB listener setup failed:', e.message);
    }

    // FALLBACK: REST fetch from RTDB
    fetch(RTDB_URL + '/products.json')
      .then(r => r.json())
      .then(val => {
        const rtdbProducts = _rtdbToArray(val);
        applyUpdate(rtdbProducts);
      })
      .catch(() => {});

    // FALLBACK: Server REST API
    fetch('/api/products')
      .then(r => r.json())
      .then(json => {
        if (json && json.success && Array.isArray(json.products)) {
          applyUpdate(json.products);
        }
      })
      .catch(() => {});

    return _unsubscribe;
  }

  function stopListening() {
    if (_unsubscribe) { _unsubscribe(); _unsubscribe = null; }
  }

  async function fetchAll() {
    _cache = _getLocalProducts();

    // 1. Try RTDB REST (works on Vercel without server API)
    try {
      const resp = await fetch(RTDB_URL + '/products.json');
      if (resp.ok) {
        const val = await resp.json();
        const rtdbProducts = _rtdbToArray(val);
        _cache = rtdbProducts;
        if (_cache.length > 0) {
          try { localStorage.setItem('ghost_custom_products', JSON.stringify(_cache)); } catch (_) {}
        } else {
          try {
            localStorage.removeItem('ghost_custom_products');
            localStorage.removeItem('ghost_deleted_products');
          } catch (_) {}
        }
        return _cache;
      }
    } catch (_) {}

    // 2. Try server REST API (works on localhost)
    try {
      const resp = await fetch('/api/products');
      if (resp.ok) {
        const json = await resp.json();
        if (json.success && Array.isArray(json.products)) {
          _cache = json.products;
          if (_cache.length > 0) {
            try { localStorage.setItem('ghost_custom_products', JSON.stringify(_cache)); } catch (_) {}
          } else {
            try {
              localStorage.removeItem('ghost_custom_products');
              localStorage.removeItem('ghost_deleted_products');
            } catch (_) {}
          }
          return _cache;
        }
      }
    } catch (_) {}

    return _cache;
  }

  async function fetchById(id) {
    if (!id) return _cache[0] || null;

    // 1. Check current memory cache or local storage
    const local = _getLocalProducts();
    const localFound = local.find(p => p.id === id);

    // 2. Try RTDB directly
    try {
      const resp = await fetch(RTDB_URL + '/products/' + encodeURIComponent(id) + '.json');
      if (resp.ok) {
        const val = await resp.json();
        if (val) return { id, ...val };
      }
    } catch (_) {}

    // 3. Try server API
    try {
      const resp = await fetch('/api/products/' + encodeURIComponent(id));
      if (resp.ok) {
        const json = await resp.json();
        if (json.success && json.product) return json.product;
      }
    } catch (_) {}

    if (localFound) return localFound;

    // 4. Fallback to first available
    return (fetchAll().then(list => list.find(p => p.id === id) || list[0] || null));
  }

  async function fetchFeatured(limit = 8) {
    const all = await fetchAll();
    return all.filter(p => p.featured !== false).slice(0, limit);
  }

  async function fetchByCategory(category) {
    const all = await fetchAll();
    if (!category || category === 'all') return all;
    return all.filter(p => (p.category || '').toLowerCase() === category.toLowerCase());
  }

  function searchByName(query, products) {
    const src = products || _cache;
    if (!query) return src;
    const q = query.toLowerCase().trim();
    return src.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.tags && p.tags.some(t => t.toLowerCase().includes(q))) ||
      (p.notes && Object.values(p.notes).flat().some(n => n.toLowerCase().includes(q)))
    );
  }

  function sortProducts(products, key) {
    const arr = [...products];
    switch (key) {
      case 'price-asc':
        return arr.sort((a, b) => _effectivePrice(a) - _effectivePrice(b));
      case 'price-desc':
        return arr.sort((a, b) => _effectivePrice(b) - _effectivePrice(a));
      case 'name-asc':
        return arr.sort((a, b) => a.name.localeCompare(b.name));
      case 'newest':
      default:
        return arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }
  }

  function _effectivePrice(p) {
    return p.salePrice != null && p.salePrice > 0 ? p.salePrice : p.price;
  }

  function renderCard(product) {
    const price = _effectivePrice(product);
    const hasDiscount = product.salePrice && product.salePrice < product.price;
    const badge = hasDiscount
      ? `<span class="product-badge sale">-${Math.round((1 - product.salePrice / product.price) * 100)}%</span>`
      : (product.featured ? '<span class="product-badge featured">Private Reserve</span>' : '');

    const images = Array.isArray(product.images) && product.images.length > 0
      ? product.images.filter(Boolean)
      : [product.thumbnail || product.image || product.imageUrl || 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=800&q=80'];

    const imgUrl = images[0];
    const secondaryImg = images.length > 1 ? images[1] : null;
    const imagesCount = images.length;
    const prodUrl = `product.html?id=${encodeURIComponent(product.id)}`;

    return `
      <div class="product-card tilt-card" data-product-id="${product.id}" onclick="if(!event.target.closest('.btn--add-cart, button, input')) window.location.href='${prodUrl}'" style="cursor: pointer;">
        <div class="product-card__inner">
          ${badge}
          ${imagesCount > 1 ? `<span class="product-badge product-badge--images" title="${imagesCount} Photos"><i class="fas fa-images"></i> ${imagesCount}</span>` : ''}
          <div class="product-card__image-wrap">
            <a href="${prodUrl}" class="product-card__image-link" tabindex="-1" aria-hidden="true" style="display:block;width:100%;height:100%;position:relative;">
              <img
                class="product-card__image product-card__image--primary ${secondaryImg ? 'has-secondary' : ''}"
                src="${_escHtml(imgUrl)}"
                alt="${_escHtml(product.name)}"
                loading="lazy"
                onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=800&q=80';"
              />
              ${secondaryImg ? `
              <img
                class="product-card__image product-card__image--secondary"
                src="${_escHtml(secondaryImg)}"
                alt="${_escHtml(product.name)} (Angle)"
                loading="lazy"
                onerror="this.style.display='none';"
              />` : ''}
            </a>
            <div class="product-card__overlay">
              <a href="${prodUrl}" class="btn btn--ghost btn--sm">
                <i class="fas fa-eye"></i> View Details
              </a>
            </div>
          </div>
          <div class="product-card__body">
            <span class="product-card__category">${_escHtml(product.category || 'Haute Parfumerie')}</span>
            <h3 class="product-card__name">
              <a href="${prodUrl}">${_escHtml(product.name)}</a>
            </h3>
            <p class="product-card__desc">${_escHtml(product.shortDesc || product.description || '')}</p>
            <div class="product-card__price">
              ${hasDiscount ? `<span class="price--old">₹${Number(product.price).toLocaleString('en-IN')}</span>` : ''}
              <span class="price--current">₹${Number(price).toLocaleString('en-IN')}</span>
            </div>
          </div>
          <div class="product-card__actions">
            <button class="btn btn--primary btn--add-cart" data-product-id="${product.id}" data-product-name="${_escHtml(product.name)}" data-product-price="${price}" onclick="event.stopPropagation();">
              <i class="fas fa-shopping-bag"></i> Add to Bag
            </button>
            <a href="${prodUrl}" class="btn--wishlist" aria-label="View product details" onclick="event.stopPropagation();">
              <i class="fas fa-arrow-right"></i>
            </a>
          </div>
        </div>
      </div>`;
  }

  function renderCards(container, products) {
    if (!container) return;
    if (!products.length) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem;">
          <i class="fas fa-ghost" style="font-size: 3rem; color: var(--accent-purple); margin-bottom: 1rem;"></i>
          <p style="font-size: 1.2rem; color: var(--text-secondary);">No spectral fragrances found in this realm.</p>
        </div>`;
      return;
    }
    container.innerHTML = products.map(renderCard).join('');
  }

  function renderDetail(product) {
    if (!product) return;

    _setText('#product-name', product.name);
    _setText('#breadcrumb-product-name', product.name);
    _setText('#product-price', `₹${Number(_effectivePrice(product)).toLocaleString('en-IN')}`);
    _setText('#product-description', product.description);
    _setText('#product-category', (product.category || 'Haute Parfumerie').toUpperCase());

    if (product.salePrice && product.salePrice < product.price) {
      _setText('#product-original-price', `₹${Number(product.price).toLocaleString('en-IN')}`);
      const badge = document.getElementById('product-sale-badge');
      if (badge) badge.style.display = '';
    }

    const images = Array.isArray(product.images) && product.images.length > 0
      ? product.images.filter(Boolean)
      : [product.thumbnail || product.image || product.imageUrl || ''].filter(Boolean);

    let activeImageIndex = 0;
    const mainImg = document.getElementById('product-main-image');
    const gallery = document.getElementById('product-gallery');
    const prevBtn = document.getElementById('gallery-prev-btn');
    const nextBtn = document.getElementById('gallery-next-btn');
    const counterWrap = document.getElementById('product-img-counter');
    const curIdxEl = document.getElementById('current-img-index');
    const totalCountEl = document.getElementById('total-img-count');

    function switchImage(index) {
      if (!images.length) return;
      activeImageIndex = (index + images.length) % images.length;
      if (mainImg) {
        mainImg.style.opacity = '0.2';
        setTimeout(() => {
          mainImg.src = images[activeImageIndex];
          mainImg.alt = `${product.name} (View ${activeImageIndex + 1})`;
          mainImg.style.opacity = '1';
        }, 120);
      }
      if (curIdxEl) curIdxEl.textContent = activeImageIndex + 1;
      if (gallery) {
        gallery.querySelectorAll('.gallery-thumb').forEach((thumb, idx) => {
          if (idx === activeImageIndex) {
            thumb.classList.add('active');
            try {
              thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            } catch (_) {}
          } else {
            thumb.classList.remove('active');
          }
        });
      }
    }

    if (images.length > 0) {
      if (mainImg) {
        mainImg.src = images[0];
        mainImg.alt = product.name;
      }
      if (counterWrap && totalCountEl) {
        counterWrap.style.display = images.length > 1 ? 'inline-flex' : 'none';
        totalCountEl.textContent = images.length;
        if (curIdxEl) curIdxEl.textContent = '1';
      }
      if (prevBtn) {
        prevBtn.style.display = images.length > 1 ? 'flex' : 'none';
        prevBtn.onclick = (e) => {
          e.preventDefault();
          switchImage(activeImageIndex - 1);
        };
      }
      if (nextBtn) {
        nextBtn.style.display = images.length > 1 ? 'flex' : 'none';
        nextBtn.onclick = (e) => {
          e.preventDefault();
          switchImage(activeImageIndex + 1);
        };
      }

      // Add touch swipe on mobile
      const stage = document.querySelector('.product-main-stage');
      if (stage && !stage._hasTouchSwipe) {
        stage._hasTouchSwipe = true;
        let startX = 0;
        stage.addEventListener('touchstart', (e) => {
          startX = e.changedTouches[0].screenX;
        }, { passive: true });
        stage.addEventListener('touchend', (e) => {
          const diff = e.changedTouches[0].screenX - startX;
          if (Math.abs(diff) > 40) {
            if (diff < 0) switchImage(activeImageIndex + 1);
            else switchImage(activeImageIndex - 1);
          }
        }, { passive: true });
      }

      // Add keyboard arrow navigation
      if (!window._ghostGalleryKeyNav) {
        window._ghostGalleryKeyNav = true;
        window.addEventListener('keydown', (e) => {
          if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
          if (e.key === 'ArrowLeft') switchImage(activeImageIndex - 1);
          if (e.key === 'ArrowRight') switchImage(activeImageIndex + 1);
        });
      }
    }

    if (gallery && images.length > 1) {
      gallery.innerHTML = images.map((url, i) => `
        <button type="button" class="gallery-thumb ${i === 0 ? 'active' : ''}" data-index="${i}" title="View angle ${i + 1}" aria-label="View angle ${i + 1}">
          <img src="${_escHtml(url)}" alt="${_escHtml(product.name)} view ${i + 1}" onerror="this.src='https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=800&q=80';" />
        </button>
      `).join('');

      gallery.addEventListener('click', (e) => {
        const btn = e.target.closest('.gallery-thumb');
        if (!btn) return;
        const idx = parseInt(btn.dataset.index, 10);
        switchImage(idx);
      });
    } else if (gallery) {
      gallery.innerHTML = '';
    }

    const sizeSelect = document.getElementById('product-sizes');
    if (sizeSelect) {
      const sizes = product.sizes && product.sizes.length ? product.sizes : [
        { label: 'Sanctuary Flacon', ml: 100, price: product.price }
      ];
      sizeSelect.innerHTML = sizes.map(s => {
        const p = typeof s === 'object' ? s.price || product.price : product.price;
        const ml = typeof s === 'object' ? s.ml || s.label : s;
        const lbl = typeof s === 'object' ? s.label : s;
        return `<option value="${ml}" data-price="${p}">${lbl} — ₹${Number(p).toLocaleString('en-IN')}</option>`;
      }).join('');

      sizeSelect.addEventListener('change', () => {
        const opt = sizeSelect.selectedOptions[0];
        if (opt) _setText('#product-price', `₹${Number(parseFloat(opt.dataset.price)).toLocaleString('en-IN')}`);
      });
    }

    const pyramidContainer = document.getElementById('notes-pyramid');
    if (pyramidContainer && product.notes) {
      renderNotesPyramid(pyramidContainer, product.notes);
    }
  }

    function renderNotesPyramid(container, notes) {
    if (!container || !notes) return;
    const top = Array.isArray(notes.top) ? notes.top : (notes.top ? [notes.top] : ['Bergamot', 'Cold Dew']);
    const mid = Array.isArray(notes.middle) ? notes.middle : (notes.middle ? [notes.middle] : ['Midnight Rose', 'Incense']);
    const base = Array.isArray(notes.base) ? notes.base : (notes.base ? [notes.base] : ['White Amber', 'Pure Oud']);

    container.innerHTML = `
      <div class="notes-pyramid">
        <div class="pyramid-level">
          <span class="pyramid-level__title"><i class="fas fa-feather"></i> Ephemeral Top Notes (0-30 mins)</span>
          <div class="pyramid-level__notes">
            ${top.map(n => `<span class="note-tag">${_escHtml(n)}</span>`).join('')}
          </div>
        </div>
        <div class="pyramid-level">
          <span class="pyramid-level__title"><i class="fas fa-heart"></i> Spectral Heart (30 mins - 4 hours)</span>
          <div class="pyramid-level__notes">
            ${mid.map(n => `<span class="note-tag">${_escHtml(n)}</span>`).join('')}
          </div>
        </div>
        <div class="pyramid-level">
          <span class="pyramid-level__title"><i class="fas fa-infinity"></i> Eternal Foundation (4 - 48 hours)</span>
          <div class="pyramid-level__notes">
            ${base.map(n => `<span class="note-tag">${_escHtml(n)}</span>`).join('')}
          </div>
        </div>
      </div>
    `;
  }

  async function renderRelated(container, currentProduct, limit = 3) {
    if (!container) return;
    const all = await fetchAll();
    const related = all.filter(p => p.id !== currentProduct.id).slice(0, limit);
    renderCards(container, related);
  }

  function _docToProduct(doc) {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt && data.createdAt.toMillis ? data.createdAt.toMillis() : Date.now()
    };
  }

  function _escHtml(str) {
    if (!str) return '';
    const el = document.createElement('span');
    el.textContent = str;
    return el.innerHTML;
  }

  function _setText(selector, text) {
    const el = document.querySelector(selector);
    if (el) el.textContent = text;
  }

  function getCached() {
    return _cache.length ? _cache : _getLocalProducts();
  }

  return Object.freeze({
    listenAll,
    stopListening,
    fetchAll,
    fetchById,
    fetchFeatured,
    fetchByCategory,
    searchByName,
    sortProducts,
    renderCard,
    renderCards,
    renderDetail,
    renderNotesPyramid,
    renderRelated,
    getCached
  });
})();
