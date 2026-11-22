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

  const _defaultCatalog = [
    {
      id: 'ghost-01',
      name: 'Phantom Veil',
      price: 2499,
      salePrice: null,
      category: 'unisex',
      tags: ['ethereal', 'iris', 'amber', 'unisex'],
      thumbnail: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=800&q=80',
      images: [
        'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=800&q=80'
      ],
      description: 'A whisper of cold white iris wrapped in midnight violet and celestial amber. Distilled under a moonless sky, Phantom Veil leaves a lingering aura that feels suspended between memory and dream.',
      shortDesc: 'Cold white iris, violet smoke & celestial white amber.',
      featured: true,
      inStock: true,
      stockQty: 14,
      sizes: [
        { label: 'Travel Flacon', ml: 50, price: 1499 },
        { label: 'Sanctuary Flacon', ml: 100, price: 2499 },
        { label: 'Grand Reserve', ml: 200, price: 3999 }
      ],
      notes: {
        top: ['White Bergamot', 'Cold Iris Dew', 'Aldehydic Mist'],
        middle: ['Midnight Violet', 'Spectral Incense', 'Silver Peony'],
        base: ['White Amber', 'Cashmere Musk', 'Ethereal Vetiver']
      },
      createdAt: Date.now() - 1000000
    },
    {
      id: 'ghost-02',
      name: 'Obsidian Haunt',
      price: 2999,
      salePrice: null,
      category: 'men',
      tags: ['dark', 'smoky', 'leather', 'men'],
      thumbnail: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=800&q=80',
      images: [
        'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1615397349754-cfa2066a298e?auto=format&fit=crop&w=800&q=80'
      ],
      description: 'Carved from the darkest shadows of ancient Siberian forests. Smoked birch wood and aged black cardamom colliding with raw Himalayan oud and bourbon-soaked oak barrels.',
      shortDesc: 'Smoked birch, Himalayan oud, leather & charred oak.',
      featured: true,
      inStock: true,
      stockQty: 8,
      sizes: [
        { label: 'Standard Flacon', ml: 100, price: 2999 },
        { label: 'Grand Reserve', ml: 250, price: 4999 }
      ],
      notes: {
        top: ['Smoked Birch', 'Black Cardamom', 'Burnt Orange Peel'],
        middle: ['Dark Saddle Leather', 'Wild Himalayan Oud', 'Castoreum Resin'],
        base: ['Charred Oak', 'Java Vetiver', 'Black Ambergris']
      },
      createdAt: Date.now() - 2000000
    },
    {
      id: 'ghost-03',
      name: 'Spectral Rose',
      price: 2599,
      salePrice: 2199,
      category: 'women',
      tags: ['rose', 'floral', 'dark-rose', 'women'],
      thumbnail: 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=800&q=80',
      images: [
        'https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=800&q=80'
      ],
      description: 'A crimson blood rose blooming in a frozen gothic garden. Enriched with rare blackcurrant nectar, nocturnal damask petals, and a base of pure Bourbon vanilla pods.',
      shortDesc: 'Frozen crimson rose, blackcurrant nectar & dark vanilla.',
      featured: true,
      inStock: true,
      stockQty: 18,
      sizes: [
        { label: 'Sanctuary Flacon', ml: 100, price: 2199 },
        { label: 'Grand Reserve', ml: 150, price: 3199 }
      ],
      notes: {
        top: ['Blood Mandarin', 'Frozen Morning Dew', 'Pink Peppercorn'],
        middle: ['Damask Rose Absolute', 'Cassis Nectar', 'Night Jasmine'],
        base: ['Bourbon Vanilla', 'Mysore Sandalwood', 'White Patchouli']
      },
      createdAt: Date.now() - 3000000
    },
    {
      id: 'ghost-04',
      name: 'Ethereal Oud',
      price: 3499,
      salePrice: null,
      category: 'unisex',
      tags: ['oud', 'pure', 'luxury', 'unisex'],
      thumbnail: 'https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?auto=format&fit=crop&w=800&q=80',
      images: [
        'https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?auto=format&fit=crop&w=800&q=80'
      ],
      description: 'The magnum opus of our private distillery. Aged 40-year wild Cambodian agarwood extract, purified through liquid crystal condensation and balanced with golden saffron.',
      shortDesc: 'Aged 40-year wild Cambodian agarwood & golden saffron.',
      featured: true,
      inStock: true,
      stockQty: 6,
      sizes: [
        { label: 'Sanctuary Flacon', ml: 100, price: 3499 },
        { label: 'Private Vault', ml: 200, price: 5499 }
      ],
      notes: {
        top: ['Kashmiri Saffron', 'Nutmeg Flower', 'Bergamot Zest'],
        middle: ['Royal Cambodian Oud', 'Taif Rose Petals', 'Myrrh Resin'],
        base: ['Grey Ambergris', 'Smoked Cedarwood', 'Tonka Bean']
      },
      createdAt: Date.now() - 4000000
    },
    {
      id: 'ghost-05',
      name: 'Night Wraith',
      price: 2699,
      salePrice: null,
      category: 'men',
      tags: ['men', 'spice', 'tobacco'],
      thumbnail: 'https://images.unsplash.com/photo-1615397349754-cfa2066a298e?auto=format&fit=crop&w=800&q=80',
      images: [
        'https://images.unsplash.com/photo-1615397349754-cfa2066a298e?auto=format&fit=crop&w=800&q=80'
      ],
      description: 'An apparition of dark tobacco leaf, crushed clove, and roasted coffee enveloped in the cool mist of Himalayan juniper.',
      shortDesc: 'Dark cured tobacco leaf, spiced clove & cool juniper.',
      featured: false,
      inStock: true,
      stockQty: 22,
      sizes: [
        { label: 'Sanctuary Flacon', ml: 100, price: 2699 }
      ],
      notes: {
        top: ['Alpine Juniper', 'Pink Pepper', 'Cold Aldehydes'],
        middle: ['Cured Tobacco Leaf', 'Crushed Clove', 'Black Tea'],
        base: ['Roasted Coffee Bean', 'Indonesian Patchouli', 'Oakwood']
      },
      createdAt: Date.now() - 5000000
    },
    {
      id: 'ghost-06',
      name: 'Lunar Mirage',
      price: 2399,
      salePrice: null,
      category: 'women',
      tags: ['women', 'jasmine', 'ethereal'],
      thumbnail: 'https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?auto=format&fit=crop&w=800&q=80',
      images: [
        'https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?auto=format&fit=crop&w=800&q=80'
      ],
      description: 'Luminous moonlight bottled as fragrance. Night-blooming jasmine, creamy white peach, and silken magnolia layered over white cedarwood.',
      shortDesc: 'Night-blooming jasmine, white peach & silken magnolia.',
      featured: true,
      inStock: true,
      stockQty: 15,
      sizes: [
        { label: 'Sanctuary Flacon', ml: 100, price: 2399 }
      ],
      notes: {
        top: ['White Peach Flesh', 'Star Anise', 'Green Mandarin'],
        middle: ['Nocturnal Jasmine', 'White Magnolia', 'Freesia'],
        base: ['White Cedarwood', 'Soft Amber', 'Tonka Bean']
      },
      createdAt: Date.now() - 6000000
    },
    {
      id: 'ghost-07',
      name: 'Astral Amber',
      price: 2899,
      salePrice: null,
      category: 'unisex',
      tags: ['amber', 'unisex', 'warm'],
      thumbnail: 'https://images.unsplash.com/photo-1587017539504-67cfbddac569?auto=format&fit=crop&w=800&q=80',
      images: [
        'https://images.unsplash.com/photo-1587017539504-67cfbddac569?auto=format&fit=crop&w=800&q=80'
      ],
      description: 'A radiant golden nebula of amber resin, candied cinnamon bark, and labdanum warmth that glows intimately upon the pulse points.',
      shortDesc: 'Warm amber nebula, candied cinnamon & sacred labdanum.',
      featured: false,
      inStock: true,
      stockQty: 11,
      sizes: [
        { label: 'Sanctuary Flacon', ml: 100, price: 2899 }
      ],
      notes: {
        top: ['Calabrian Mandarin', 'Clary Sage', 'Coriander'],
        middle: ['Baltic Amber', 'Ceylon Cinnamon', 'Immortelle'],
        base: ['Siam Benzoin', 'Labdanum', 'Dark Vanilla']
      },
      createdAt: Date.now() - 7000000
    },
    {
      id: 'ghost-08',
      name: 'Silent Revenant',
      price: 3299,
      salePrice: null,
      category: 'unisex',
      tags: ['rare', 'ambergris', 'unisex'],
      thumbnail: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=800&q=80',
      images: [
        'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=800&q=80'
      ],
      description: 'Raw oceanic storm mist crashing upon petrified coastal driftwood. Infused with floating grey ambergris harvested ethically from Atlantic shores.',
      shortDesc: 'Oceanic salt mist, Atlantic grey ambergris & driftwood.',
      featured: true,
      inStock: true,
      stockQty: 5,
      sizes: [
        { label: 'Sanctuary Flacon', ml: 100, price: 3299 }
      ],
      notes: {
        top: ['Oceanic Sea Salt', 'Grey Thyme', 'Icy Ozone'],
        middle: ['Petrified Driftwood', 'Italian Orris Butter'],
        base: ['Natural Grey Ambergris', 'Black Oakmoss']
      },
      createdAt: Date.now() - 8000000
    }
  ];

  let _cache = [];
  let _unsubscribe = null;

  function _getLocalProducts() {
    try {
      const custom = JSON.parse(localStorage.getItem('ghost_custom_products') || '[]');
      const deleted = JSON.parse(localStorage.getItem('ghost_deleted_products') || '[]');
      const map = new Map();
      _defaultCatalog.forEach(p => {
        if (!deleted.includes(p.id)) map.set(p.id, p);
      });
      custom.forEach(p => {
        if (!deleted.includes(p.id)) map.set(p.id, p);
      });
      return Array.from(map.values());
    } catch (e) {
      return [..._defaultCatalog];
    }
  }

  function listenAll(onUpdate) {
    _cache = _getLocalProducts();
    if (typeof onUpdate === 'function') onUpdate(_cache);

    try {
      if (GhostFirebase && GhostFirebase.db) {
        _unsubscribe = GhostFirebase.db.collection('products')
          .orderBy('createdAt', 'desc')
          .onSnapshot(
            (snap) => {
              if (snap && !snap.empty) {
                const firestoreProducts = snap.docs.map(_docToProduct);
                const map = new Map();
                _getLocalProducts().forEach(p => map.set(p.id, p));
                firestoreProducts.forEach(p => map.set(p.id, p));
                _cache = Array.from(map.values());
                if (typeof onUpdate === 'function') onUpdate(_cache);
              }
            },
            (err) => {
              console.warn('[GhostProducts] Cloud sync deferred:', err.message);
            }
          );
      }
    } catch (e) {
      console.warn('[GhostProducts] Offline store active.');
    }
    return _unsubscribe;
  }

  function stopListening() {
    if (_unsubscribe) { _unsubscribe(); _unsubscribe = null; }
  }

  async function fetchAll() {
    const local = _getLocalProducts();
    _cache = local;

    if (!GhostFirebase || !GhostFirebase.isConfigured() || !GhostFirebase.db) {
      return _cache;
    }

    try {
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000));
      const snap = await Promise.race([
        GhostFirebase.db.collection('products').orderBy('createdAt', 'desc').get(),
        timeoutPromise
      ]);
      if (snap && !snap.empty) {
        const cloud = snap.docs.map(_docToProduct);
        const map = new Map();
        local.forEach(p => map.set(p.id, p));
        cloud.forEach(p => map.set(p.id, p));
        _cache = Array.from(map.values());
        return _cache;
      }
    } catch (err) {
      // Offline fallback is already in _cache
    }
    return _cache;
  }

  async function fetchById(id) {
    const local = _getLocalProducts();
    if (id) {
      const localFound = local.find(p => p.id === id);
      if (localFound) return localFound;
    }

    if (GhostFirebase && GhostFirebase.isConfigured() && GhostFirebase.db && id) {
      try {
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000));
        const doc = await Promise.race([
          GhostFirebase.db.collection('products').doc(id).get(),
          timeoutPromise
        ]);
        if (doc && doc.exists) return _docToProduct(doc);
      } catch (_) {}
    }

    // Default to first product if specific id not found
    return (id ? local.find(p => p.id === id) : null) || local[0] || null;
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

    const imgUrl = product.thumbnail || (product.images && product.images[0]) || product.image || product.imageUrl || 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=800&q=80';
    const prodUrl = `product.html?id=${encodeURIComponent(product.id)}`;

    return `
      <div class="product-card tilt-card" data-product-id="${product.id}" onclick="if(!event.target.closest('.btn--add-cart, button, input')) window.location.href='${prodUrl}'" style="cursor: pointer;">
        <div class="product-card__inner">
          ${badge}
          <div class="product-card__image-wrap">
            <a href="${prodUrl}" class="product-card__image-link" tabindex="-1" aria-hidden="true" style="display:block;width:100%;height:100%;">
              <img
                class="product-card__image"
                src="${_escHtml(imgUrl)}"
                alt="${_escHtml(product.name)}"
                loading="lazy"
                onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=800&q=80';"
              />
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

    const mainImg = document.getElementById('product-main-image');
    const imgUrl = product.thumbnail || (product.images && product.images[0]) || product.image || product.imageUrl || '';
    if (mainImg && imgUrl) {
      mainImg.src = imgUrl;
      mainImg.alt = product.name;
    }

    const gallery = document.getElementById('product-gallery');
    const images = product.images || [imgUrl];
    if (gallery && images.length > 1) {
      gallery.innerHTML = images.map((url, i) => `
        <button class="gallery-thumb ${i === 0 ? 'active' : ''}" style="width:65px;height:70px;background:#13111e;border:1px solid var(--border-subtle);border-radius:var(--radius-sm);overflow:hidden;cursor:pointer;padding:0;" data-index="${i}">
          <img src="${_escHtml(url)}" style="width:100%;height:100%;object-fit:cover;" />
        </button>
      `).join('');

      gallery.addEventListener('click', (e) => {
        const btn = e.target.closest('.gallery-thumb');
        if (!btn) return;
        gallery.querySelectorAll('.gallery-thumb').forEach(b => b.style.borderColor = 'var(--border-subtle)');
        btn.style.borderColor = 'var(--accent-purple)';
        if (mainImg) mainImg.src = images[parseInt(btn.dataset.index, 10)];
      });
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
