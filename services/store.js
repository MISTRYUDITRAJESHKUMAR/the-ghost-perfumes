const fs = require('fs');
const path = require('path');

const PRODUCTS_FILE = path.join(__dirname, '..', 'data', 'products.json');
const SETTINGS_FILE = path.join(__dirname, '..', 'data', 'settings.json');
const ORDERS_FILE   = path.join(__dirname, '..', 'data', 'orders.json');

const RTDB_URL = 'https://perfume-37ca2-default-rtdb.asia-southeast1.firebasedatabase.app';

// In-memory cache for ultra-fast response & serverless compatibility
let _productsCache = null;
let _settingsCache = null;
let _ordersCache   = null;

function _safeReadJSON(filePath, defaultVal) {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn(`[Store] Note reading ${filePath}:`, err.message);
  }
  return defaultVal;
}

function _safeWriteJSON(filePath, data) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    // Expected on read-only serverless filesystems like Vercel
  }
}

function _rtdbToArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return Object.entries(val).map(([id, data]) => ({ id, ...data }));
}

// ─────────────────────────────────────────────────────────────
// PRODUCTS API
// ─────────────────────────────────────────────────────────────
async function getProductsAsync(filter = {}) {
  try {
    const res = await fetch(RTDB_URL + '/products.json');
    if (res.ok) {
      const data = await res.json();
      if (data) {
        _productsCache = _rtdbToArray(data);
      }
    }
  } catch (_) {}

  return getProducts(filter);
}

function getProducts(filter = {}) {
  if (!_productsCache) {
    _productsCache = _safeReadJSON(PRODUCTS_FILE, []);
  }

  let list = [..._productsCache];

  if (filter.category && filter.category !== 'all') {
    list = list.filter(p => (p.category || '').toLowerCase() === filter.category.toLowerCase());
  }

  if (filter.featured !== undefined) {
    const boolVal = String(filter.featured) === 'true';
    list = list.filter(p => Boolean(p.featured) === boolVal);
  }

  return list;
}

async function getProductByIdAsync(id) {
  try {
    const res = await fetch(RTDB_URL + '/products/' + encodeURIComponent(id) + '.json');
    if (res.ok) {
      const data = await res.json();
      if (data) return { id, ...data };
    }
  } catch (_) {}

  return getProductById(id);
}

function getProductById(id) {
  const all = getProducts();
  return all.find(p => p.id === id) || null;
}

function saveProduct(productData) {
  if (!_productsCache) {
    _productsCache = _safeReadJSON(PRODUCTS_FILE, []);
  }

  const id = productData.id || ('ghost-prod-' + Date.now());
  const existingIdx = _productsCache.findIndex(p => p.id === id);

  const cleanProduct = {
    id: id,
    name: productData.name || 'Spectral Fragrance',
    price: Number(productData.price) || 2499,
    salePrice: productData.salePrice ? Number(productData.salePrice) : null,
    category: productData.category || 'unisex',
    tags: Array.isArray(productData.tags) ? productData.tags : [productData.category || 'unisex'],
    thumbnail: productData.image || productData.thumbnail || productData.imageUrl || '',
    image: productData.image || productData.thumbnail || productData.imageUrl || '',
    images: Array.isArray(productData.images) && productData.images.length > 0 
      ? productData.images 
      : [productData.image || productData.thumbnail || ''],
    description: productData.description || '',
    shortDesc: productData.shortDesc || (productData.description ? productData.description.slice(0, 100) + '...' : ''),
    featured: Boolean(productData.featured),
    inStock: Number(productData.stock) > 0,
    stock: Number(productData.stock) !== undefined ? Number(productData.stock) : 10,
    stockQty: Number(productData.stock) !== undefined ? Number(productData.stock) : 10,
    sizes: Array.isArray(productData.sizes) && productData.sizes.length > 0 
      ? productData.sizes 
      : [{ label: 'Sanctuary Flacon', ml: '100ml', price: Number(productData.price) || 2499 }],
    notes: productData.notes || { top: [], middle: [], base: [] },
    updatedAt: Date.now()
  };

  if (existingIdx >= 0) {
    cleanProduct.createdAt = _productsCache[existingIdx].createdAt || Date.now();
    _productsCache[existingIdx] = cleanProduct;
  } else {
    cleanProduct.createdAt = Date.now();
    _productsCache.unshift(cleanProduct);
  }

  _safeWriteJSON(PRODUCTS_FILE, _productsCache);

  // Sync to Firebase Realtime Database
  fetch(RTDB_URL + '/products/' + encodeURIComponent(id) + '.json', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cleanProduct)
  }).catch(() => {});

  return cleanProduct;
}

function deleteProduct(id) {
  if (!_productsCache) {
    _productsCache = _safeReadJSON(PRODUCTS_FILE, []);
  }

  const initialLen = _productsCache.length;
  _productsCache = _productsCache.filter(p => p.id !== id);

  _safeWriteJSON(PRODUCTS_FILE, _productsCache);

  // Sync delete to Firebase Realtime Database
  fetch(RTDB_URL + '/products/' + encodeURIComponent(id) + '.json', {
    method: 'DELETE'
  }).catch(() => {});

  return _productsCache.length !== initialLen;
}

// ─────────────────────────────────────────────────────────────
// STORE SETTINGS (HERO TAGLINE, TITLE, ABOUT US STORY)
// ─────────────────────────────────────────────────────────────
async function getSettingsAsync() {
  try {
    const res = await fetch(RTDB_URL + '/settings.json');
    if (res.ok) {
      const data = await res.json();
      if (data) {
        _settingsCache = data;
        return _settingsCache;
      }
    }
  } catch (_) {}

  return getSettings();
}

function getSettings() {
  if (!_settingsCache) {
    _settingsCache = _safeReadJSON(SETTINGS_FILE, {
      heroTagline: 'Ethereal Haute Parfumerie',
      heroTitle: 'Where Fragrance Meets the Ethereal',
      heroDescription: 'Rare phantom botanicals, midnight smoke, and obsidian flacons distilled in darkness. Step beyond the veil and wear the scent of eternity.',
      aboutSubtitle: 'Distillation of the Unseen',
      aboutHeading: 'Crafted in Darkness, Revealed in Heat',
      aboutStory1: 'Founded by olfactory sculptors and 3D industrial architects, THE GHOST PERFUMES was forged from a singular obsession: to bottle the invisible vibrations of space.',
      aboutStory2: 'Every fragrance is aged in pitch-black volcanic chambers for seven moon cycles. The ingredients are never stripped of their raw celestial qualities; instead, they are amplified using bespoke cold-plasma extraction.',
      aboutQuote: '"We believe that true luxury does not shout — it lingers like a spectral presence in an empty room, impossible to forget."'
    });
  }
  return _settingsCache;
}

function saveSettings(newSettings) {
  const current = getSettings();
  _settingsCache = {
    ...current,
    ...newSettings,
    updatedAt: new Date().toISOString()
  };
  _safeWriteJSON(SETTINGS_FILE, _settingsCache);

  // Sync to Firebase Realtime Database
  fetch(RTDB_URL + '/settings.json', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(_settingsCache)
  }).catch(() => {});

  return _settingsCache;
}

// ─────────────────────────────────────────────────────────────
// ORDERS API
// ─────────────────────────────────────────────────────────────
async function getOrdersAsync() {
  try {
    const res = await fetch(RTDB_URL + '/orders.json');
    if (res.ok) {
      const data = await res.json();
      if (data) {
        _ordersCache = _rtdbToArray(data);
        return _ordersCache;
      }
    }
  } catch (_) {}

  return getOrders();
}

function getOrders() {
  if (!_ordersCache) {
    _ordersCache = _safeReadJSON(ORDERS_FILE, []);
  }
  return _ordersCache;
}

function saveOrder(order) {
  if (!_ordersCache) {
    _ordersCache = _safeReadJSON(ORDERS_FILE, []);
  }
  const cleanOrder = {
    orderId: order.orderId || ('GHOST-' + Math.floor(Math.random() * 90000 + 10000)),
    customerName: order.customerName || 'Anonymous Patron',
    phone: order.phone || '',
    email: order.email || '',
    address: order.address || '',
    city: order.city || '',
    state: order.state || '',
    zip: order.zip || '',
    items: Array.isArray(order.items) ? order.items : [],
    total: Number(order.total) || 0,
    paymentPreference: order.paymentPreference || 'UPI / WhatsApp',
    status: order.status || 'pending',
    createdAt: order.createdAt || new Date().toISOString()
  };
  _ordersCache.unshift(cleanOrder);
  _safeWriteJSON(ORDERS_FILE, _ordersCache);

  // Sync to Firebase Realtime Database
  fetch(RTDB_URL + '/orders/' + encodeURIComponent(cleanOrder.orderId) + '.json', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cleanOrder)
  }).catch(() => {});

  return cleanOrder;
}

function updateOrderStatus(orderId, status) {
  if (!_ordersCache) {
    _ordersCache = _safeReadJSON(ORDERS_FILE, []);
  }
  const order = _ordersCache.find(o => o.orderId === orderId || o.id === orderId);
  if (order) {
    order.status = status;
    order.updatedAt = new Date().toISOString();
    _safeWriteJSON(ORDERS_FILE, _ordersCache);

    fetch(RTDB_URL + '/orders/' + encodeURIComponent(orderId) + '/status.json', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(status)
    }).catch(() => {});

    return order;
  }
  return null;
}

module.exports = {
  getProducts,
  getProductsAsync,
  getProductById,
  getProductByIdAsync,
  saveProduct,
  deleteProduct,
  getSettings,
  getSettingsAsync,
  saveSettings,
  getOrders,
  getOrdersAsync,
  saveOrder,
  updateOrderStatus
};
