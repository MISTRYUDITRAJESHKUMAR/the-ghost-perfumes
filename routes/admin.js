const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

const db = new Proxy({}, {
  get(target, prop) {
    if (admin.apps && admin.apps.length > 0) {
      const realDb = admin.firestore();
      const val = realDb[prop];
      return typeof val === 'function' ? val.bind(realDb) : val;
    }
    return () => ({
      orderBy: () => ({ get: async () => ({ docs: [] }), where: () => ({ get: async () => ({ docs: [] }) }) }),
      where: () => ({ get: async () => ({ docs: [] }), orderBy: () => ({ get: async () => ({ docs: [] }) }) }),
      get: async () => ({ docs: [], empty: true, exists: false }),
      doc: () => ({
        get: async () => ({ exists: false, data: () => ({}) }),
        update: async () => {},
        delete: async () => {},
        set: async () => {}
      }),
      add: async () => ({ id: 'local-' + Date.now() })
    });
  }
});

// All admin routes require authentication + admin role
router.use('/api/admin', verifyToken, verifyAdmin);

// ═══════════════════════════════════════════════════════════════════════════════
//  ADMIN — PRODUCTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/admin/products
 * List all products (admin view).
 */
router.get('/api/admin/products', async (req, res) => {
  try {
    const snapshot = await db.collection('products').orderBy('createdAt', 'desc').get();

    const products = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({ success: true, products });
  } catch (error) {
    console.error('Error fetching admin products:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch products' });
  }
});

/**
 * POST /api/admin/products
 * Add a new product.
 * Body: { name, description, price, image, category, stock, featured, notes, size }
 */
router.post('/api/admin/products', async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      image,
      category,
      stock,
      featured = false,
      notes = { top: [], middle: [], base: [] },
      size,
    } = req.body;

    // Validation
    if (!name || !price || !category) {
      return res.status(400).json({
        success: false,
        message: 'name, price, and category are required',
      });
    }

    if (!['men', 'women', 'unisex'].includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'category must be one of: men, women, unisex',
      });
    }

    const product = {
      name,
      description: description || '',
      price: Number(price),
      image: image || '',
      category,
      stock: Number(stock) || 0,
      featured: Boolean(featured),
      notes: {
        top: notes.top || [],
        middle: notes.middle || [],
        base: notes.base || [],
      },
      size: size || '',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('products').add(product);

    res.status(201).json({ success: true, productId: docRef.id, product });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ success: false, message: 'Failed to add product' });
  }
});

/**
 * PUT /api/admin/products/:id
 * Update an existing product.
 */
router.put('/api/admin/products/:id', async (req, res) => {
  try {
    const productRef = db.collection('products').doc(req.params.id);
    const doc = await productRef.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const updates = { ...req.body, updatedAt: admin.firestore.FieldValue.serverTimestamp() };

    // Sanitise category if provided
    if (updates.category && !['men', 'women', 'unisex'].includes(updates.category)) {
      return res.status(400).json({
        success: false,
        message: 'category must be one of: men, women, unisex',
      });
    }

    // Ensure numeric types
    if (updates.price !== undefined) updates.price = Number(updates.price);
    if (updates.stock !== undefined) updates.stock = Number(updates.stock);
    if (updates.featured !== undefined) updates.featured = Boolean(updates.featured);

    // Don't allow overwriting createdAt
    delete updates.createdAt;

    await productRef.update(updates);

    const updated = await productRef.get();

    res.json({ success: true, product: { id: updated.id, ...updated.data() } });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ success: false, message: 'Failed to update product' });
  }
});

/**
 * DELETE /api/admin/products/:id
 * Delete a product.
 */
router.delete('/api/admin/products/:id', async (req, res) => {
  try {
    const productRef = db.collection('products').doc(req.params.id);
    const doc = await productRef.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    await productRef.delete();

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ success: false, message: 'Failed to delete product' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  ADMIN — ORDERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/admin/orders
 * List all orders (admin view).
 */
router.get('/api/admin/orders', async (req, res) => {
  try {
    const snapshot = await db.collection('orders').orderBy('createdAt', 'desc').get();

    const orders = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({ success: true, orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
});

/**
 * PUT /api/admin/orders/:id
 * Update an order's status.
 * Body: { status } — e.g. pending, confirmed, shipped, delivered, cancelled
 */
router.put('/api/admin/orders/:id', async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'status is required' });
    }

    const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `status must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const orderRef = db.collection('orders').doc(req.params.id);
    const doc = await orderRef.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    await orderRef.update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const updated = await orderRef.get();

    res.json({ success: true, order: { id: updated.id, ...updated.data() } });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ success: false, message: 'Failed to update order' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  ADMIN — DASHBOARD STATS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/admin/stats
 * Dashboard statistics: total products, total orders, total revenue.
 */
router.get('/api/admin/stats', async (req, res) => {
  try {
    const [productsSnap, ordersSnap] = await Promise.all([
      db.collection('products').get(),
      db.collection('orders').get(),
    ]);

    const totalProducts = productsSnap.size;
    const totalOrders = ordersSnap.size;

    let totalRevenue = 0;
    ordersSnap.docs.forEach((doc) => {
      const data = doc.data();
      if (data.status !== 'cancelled') {
        totalRevenue += data.totalAmount || 0;
      }
    });

    res.json({
      success: true,
      stats: {
        totalProducts,
        totalOrders,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
      },
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats' });
  }
});

module.exports = router;
