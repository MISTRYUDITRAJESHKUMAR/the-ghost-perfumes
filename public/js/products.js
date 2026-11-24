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
        "category": "men",
        "createdAt": 1731900000000,
        "description": "Carved from the darkest shadows of ancient Siberian forests. Smoked birch wood and aged black cardamom colliding with raw Himalayan oud and bourbon-soaked oak barrels.",
        "featured": true,
        "id": "ghost-02",
        "image": "https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=800&q=80",
        "images": [
            "https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1615397349754-cfa2066a298e?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=800&q=80"
        ],
        "inStock": true,
        "name": "Obsidian Haunt",
        "notes": {
            "base": [
                "Charred Oak",
                "Java Vetiver",
                "Black Ambergris"
            ],
            "middle": [
                "Dark Saddle Leather",
                "Wild Himalayan Oud",
                "Castoreum Resin"
            ],
            "top": [
                "Smoked Birch",
                "Black Cardamom",
                "Burnt Orange Peel"
            ]
        },
        "price": 2999,
        "shortDesc": "Smoked birch, Himalayan oud, leather & charred oak.",
        "sizes": [
            {
                "label": "Standard Flacon",
                "ml": "100ml",
                "price": 2999
            },
            {
                "label": "Grand Reserve",
                "ml": "250ml",
                "price": 4999
            }
        ],
        "stock": 8,
        "stockQty": 8,
        "tags": [
            "dark",
            "smoky",
            "leather",
            "men"
        ],
        "thumbnail": "https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=800&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=800&q=80"
    },
    {
        "category": "women",
        "createdAt": 1731800000000,
        "description": "A crimson blood rose blooming in a frozen gothic garden. Enriched with rare blackcurrant nectar, nocturnal damask petals, and a base of pure Bourbon vanilla pods.",
        "featured": true,
        "id": "ghost-03",
        "image": "https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=800&q=80",
        "images": [
            "https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1587017539504-67cfbddac569?auto=format&fit=crop&w=800&q=80"
        ],
        "inStock": true,
        "name": "Spectral Rose",
        "notes": {
            "base": [
                "Bourbon Vanilla Pod",
                "Sandalwood Cream",
                "Dark Amber"
            ],
            "middle": [
                "Nocturnal Damask Rose",
                "Crimson Peony",
                "Geranium Absolute"
            ],
            "top": [
                "Blackcurrant Buds",
                "Frozen Pink Peppercorn",
                "Lychee Mist"
            ]
        },
        "price": 2599,
        "salePrice": 2199,
        "shortDesc": "Frozen crimson rose, blackcurrant nectar & dark vanilla.",
        "sizes": [
            {
                "label": "Travel Flacon",
                "ml": "50ml",
                "price": 1699
            },
            {
                "label": "Sanctuary Flacon",
                "ml": "100ml",
                "price": 2599
            }
        ],
        "stock": 18,
        "stockQty": 18,
        "tags": [
            "rose",
            "floral",
            "dark-rose",
            "women"
        ],
        "thumbnail": "https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=800&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=800&q=80"
    },
    {
        "category": "women",
        "createdAt": 1731700000000,
        "description": "Not the sweet confection of mortal dreams, but a smoky, resinous Madagascar vanilla bean scorched over ceremonial birch charcoal.",
        "featured": false,
        "id": "ghost-04",
        "image": "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=800&q=80",
        "images": [
            "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1587017539504-67cfbddac569?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=800&q=80"
        ],
        "inStock": true,
        "name": "Ether Vanilla",
        "notes": {
            "base": [
                "Madagascar Vanilla Absolute",
                "Benzoin Tears",
                "White Cedar"
            ],
            "middle": [
                "Smoked Vanilla Orchid",
                "Heliotrope",
                "Tonka Bean"
            ],
            "top": [
                "Almond Blossom",
                "Candied Nutmeg",
                "Golden Rum"
            ]
        },
        "price": 2799,
        "shortDesc": "Scorched Madagascar vanilla bean, benzoin & tonka resin.",
        "sizes": [
            {
                "label": "Sanctuary Flacon",
                "ml": "100ml",
                "price": 2799
            }
        ],
        "stock": 20,
        "stockQty": 20,
        "tags": [
            "women",
            "vanilla",
            "gourmand"
        ],
        "thumbnail": "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=800&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=800&q=80"
    },
    {
        "category": "men",
        "createdAt": 1731600000000,
        "description": "An apparition of dark tobacco leaf, crushed clove, and roasted coffee enveloped in the cool mist of Himalayan juniper.",
        "featured": false,
        "id": "ghost-05",
        "image": "https://images.unsplash.com/photo-1615397349754-cfa2066a298e?auto=format&fit=crop&w=800&q=80",
        "images": [
            "https://images.unsplash.com/photo-1615397349754-cfa2066a298e?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=800&q=80"
        ],
        "inStock": true,
        "name": "Night Wraith",
        "notes": {
            "base": [
                "Roasted Coffee Bean",
                "Indonesian Patchouli",
                "Oakwood"
            ],
            "middle": [
                "Cured Tobacco Leaf",
                "Crushed Clove",
                "Black Tea"
            ],
            "top": [
                "Alpine Juniper",
                "Pink Pepper",
                "Cold Aldehydes"
            ]
        },
        "price": 2699,
        "shortDesc": "Dark cured tobacco leaf, spiced clove & cool juniper.",
        "sizes": [
            {
                "label": "Sanctuary Flacon",
                "ml": "100ml",
                "price": 2699
            }
        ],
        "stock": 22,
        "stockQty": 22,
        "tags": [
            "men",
            "spice",
            "tobacco"
        ],
        "thumbnail": "https://images.unsplash.com/photo-1615397349754-cfa2066a298e?auto=format&fit=crop&w=800&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1615397349754-cfa2066a298e?auto=format&fit=crop&w=800&q=80"
    },
    {
        "category": "women",
        "createdAt": 1731500000000,
        "description": "Luminous moonlight bottled as fragrance. Night-blooming jasmine, creamy white peach, and silken magnolia layered over white cedarwood.",
        "featured": true,
        "id": "ghost-06",
        "image": "https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?auto=format&fit=crop&w=800&q=80",
        "images": [
            "https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1587017539504-67cfbddac569?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=800&q=80"
        ],
        "inStock": true,
        "name": "Lunar Mirage",
        "notes": {
            "base": [
                "White Cedarwood",
                "Soft Amber",
                "Tonka Bean"
            ],
            "middle": [
                "Nocturnal Jasmine",
                "White Magnolia",
                "Freesia"
            ],
            "top": [
                "White Peach Flesh",
                "Star Anise",
                "Green Mandarin"
            ]
        },
        "price": 2399,
        "shortDesc": "Night-blooming jasmine, white peach & silken magnolia.",
        "sizes": [
            {
                "label": "Sanctuary Flacon",
                "ml": "100ml",
                "price": 2399
            }
        ],
        "stock": 15,
        "stockQty": 15,
        "tags": [
            "women",
            "jasmine",
            "ethereal"
        ],
        "thumbnail": "https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?auto=format&fit=crop&w=800&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?auto=format&fit=crop&w=800&q=80"
    },
    {
        "category": "unisex",
        "createdAt": 1731400000000,
        "description": "A radiant golden nebula of amber resin, candied cinnamon bark, and labdanum warmth that glows intimately upon the pulse points.",
        "featured": false,
        "id": "ghost-07",
        "image": "https://images.unsplash.com/photo-1587017539504-67cfbddac569?auto=format&fit=crop&w=800&q=80",
        "images": [
            "https://images.unsplash.com/photo-1587017539504-67cfbddac569?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1615397349754-cfa2066a298e?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=800&q=80"
        ],
        "inStock": true,
        "name": "Astral Amber",
        "notes": {
            "base": [
                "Siam Benzoin",
                "Labdanum",
                "Dark Vanilla"
            ],
            "middle": [
                "Baltic Amber",
                "Ceylon Cinnamon",
                "Immortelle"
            ],
            "top": [
                "Calabrian Mandarin",
                "Clary Sage",
                "Coriander"
            ]
        },
        "price": 2899,
        "shortDesc": "Warm amber nebula, candied cinnamon & sacred labdanum.",
        "sizes": [
            {
                "label": "Sanctuary Flacon",
                "ml": "100ml",
                "price": 2899
            }
        ],
        "stock": 11,
        "stockQty": 11,
        "tags": [
            "amber",
            "unisex",
            "warm"
        ],
        "thumbnail": "https://images.unsplash.com/photo-1587017539504-67cfbddac569?auto=format&fit=crop&w=800&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1587017539504-67cfbddac569?auto=format&fit=crop&w=800&q=80"
    },
    {
        "category": "unisex",
        "createdAt": 1731300000000,
        "description": "Raw oceanic storm mist crashing upon petrified coastal driftwood. Infused with floating grey ambergris harvested ethically from Atlantic shores.",
        "featured": true,
        "id": "ghost-08",
        "image": "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=800&q=80",
        "images": [
            "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1615397349754-cfa2066a298e?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=800&q=80"
        ],
        "inStock": true,
        "name": "Silent Revenant",
        "notes": {
            "base": [
                "Natural Grey Ambergris",
                "Black Oakmoss"
            ],
            "middle": [
                "Petrified Driftwood",
                "Italian Orris Butter"
            ],
            "top": [
                "Oceanic Sea Salt",
                "Grey Thyme",
                "Icy Ozone"
            ]
        },
        "price": 3299,
        "shortDesc": "Oceanic salt mist, Atlantic grey ambergris & driftwood.",
        "sizes": [
            {
                "label": "Sanctuary Flacon",
                "ml": "100ml",
                "price": 3299
            }
        ],
        "stock": 5,
        "stockQty": 5,
        "tags": [
            "rare",
            "ambergris",
            "unisex"
        ],
        "thumbnail": "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=800&q=80",
        "imageUrl": "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=800&q=80"
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

    // PRIMARY: Firebase Realtime Database (works on Vercel + all devices)
    try {
      if (GhostFirebase && GhostFirebase.rtdb) {
        const productsRef = GhostFirebase.rtdb.ref('products');
        productsRef.on('value', (snapshot) => {
          const val = snapshot.val();
          if (val) {
            const rtdbProducts = _rtdbToArray(val);
            if (rtdbProducts.length > 0) {
              _cache = rtdbProducts;
              try {
                localStorage.setItem('ghost_custom_products', JSON.stringify(_cache));
              } catch (_) {}
              if (typeof onUpdate === 'function') onUpdate(_cache);
            }
          }
        }, (err) => {
          console.warn('[GhostProducts] RTDB listener deferred:', err.message);
        });
        _unsubscribe = () => productsRef.off('value');
        return _unsubscribe;
      }
    } catch (e) {
      console.warn('[GhostProducts] RTDB listener setup failed:', e.message);
    }

    // FALLBACK: REST fetch from RTDB
    fetch(RTDB_URL + '/products.json')
      .then(r => r.json())
      .then(val => {
        if (val) {
          const rtdbProducts = _rtdbToArray(val);
          if (rtdbProducts.length > 0) {
            _cache = rtdbProducts;
            try {
              localStorage.setItem('ghost_custom_products', JSON.stringify(_cache));
            } catch (_) {}
            if (typeof onUpdate === 'function') onUpdate(_cache);
          }
        }
      })
      .catch(() => {});

    return _unsubscribe;
  }

  function stopListening() {
    if (_unsubscribe) { _unsubscribe(); _unsubscribe = null; }
  }

  async function fetchAll() {
    const local = _getLocalProducts();
    _cache = local;

    // 1. Try RTDB REST (works on Vercel without server API)
    try {
      const resp = await fetch(RTDB_URL + '/products.json');
      if (resp.ok) {
        const val = await resp.json();
        if (val) {
          const rtdbProducts = _rtdbToArray(val);
          if (rtdbProducts.length > 0) {
            _cache = rtdbProducts;
            try {
              localStorage.setItem('ghost_custom_products', JSON.stringify(_cache));
            } catch (_) {}
            return _cache;
          }
        }
      }
    } catch (_) {}

    // 2. Try server REST API (works on localhost)
    try {
      const resp = await fetch('/api/products');
      if (resp.ok) {
        const json = await resp.json();
        if (json.success && Array.isArray(json.products) && json.products.length > 0) {
          _cache = json.products;
          try {
            localStorage.setItem('ghost_custom_products', JSON.stringify(_cache));
          } catch (_) {}
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
        mainImg.style.opacity = '0.25';
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
            thumb.style.borderColor = 'var(--accent-gold)';
            thumb.style.boxShadow = '0 0 12px rgba(212, 175, 55, 0.45)';
          } else {
            thumb.classList.remove('active');
            thumb.style.borderColor = 'var(--border-subtle)';
            thumb.style.boxShadow = 'none';
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
        counterWrap.style.display = images.length > 1 ? 'block' : 'none';
        totalCountEl.textContent = images.length;
        if (curIdxEl) curIdxEl.textContent = '1';
      }
      if (prevBtn) {
        prevBtn.style.display = images.length > 1 ? 'flex' : 'none';
        prevBtn.onclick = () => switchImage(activeImageIndex - 1);
      }
      if (nextBtn) {
        nextBtn.style.display = images.length > 1 ? 'flex' : 'none';
        nextBtn.onclick = () => switchImage(activeImageIndex + 1);
      }
    }

    if (gallery && images.length > 1) {
      gallery.innerHTML = images.map((url, i) => `
        <button class="gallery-thumb ${i === 0 ? 'active' : ''}" style="width:72px;height:76px;background:#13111e;border:2px solid ${i === 0 ? 'var(--accent-gold)' : 'var(--border-subtle)'};border-radius:var(--radius-sm);overflow:hidden;cursor:pointer;padding:0;transition:all 0.25s ease;" data-index="${i}" title="View angle ${i + 1}">
          <img src="${_escHtml(url)}" style="width:100%;height:100%;object-fit:cover;" onerror="this.src='https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=800&q=80';" />
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
