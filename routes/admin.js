const express = require('express');
const router = express.Router();
const store = require('../services/store');
const { verifyAdminOrMaster } = require('../middleware/auth');

// Protect all admin endpoints with Master / Whitelist check
router.use('/api/admin', verifyAdminOrMaster);

// ═══════════════════════════════════════════════════════════════════════════════
//  ADMIN — PRODUCTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/admin/products
 * List all products for admin dashboard.
 */
router.get('/api/admin/products', (req, res) => {
  try {
    const products = store.getProducts();
    res.json({ success: true, products });
  } catch (error) {
    console.error('Error fetching admin products:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch products' });
  }
});

/**
 * POST /api/admin/products
 * Add or update a product.
 */
router.post('/api/admin/products', (req, res) => {
  try {
    const { name, price, category } = req.body;

    if (!name || !price) {
      return res.status(400).json({
        success: false,
        message: 'Product name and price are required',
      });
    }

    const saved = store.saveProduct(req.body);
    res.status(201).json({ success: true, productId: saved.id, product: saved });
  } catch (error) {
    console.error('Error saving admin product:', error);
    res.status(500).json({ success: false, message: 'Failed to save product' });
  }
});

/**
 * PUT /api/admin/products/:id
 * Update an existing product.
 */
router.put('/api/admin/products/:id', (req, res) => {
  try {
    const saved = store.saveProduct({ id: req.params.id, ...req.body });
    res.json({ success: true, product: saved });
  } catch (error) {
    console.error('Error updating admin product:', error);
    res.status(500).json({ success: false, message: 'Failed to update product' });
  }
});

/**
 * DELETE /api/admin/products/:id
 * Delete a product.
 */
router.delete('/api/admin/products/:id', (req, res) => {
  try {
    const deleted = store.deleteProduct(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, message: 'Product deleted from master vault' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ success: false, message: 'Failed to delete product' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  ADMIN — STORE SETTINGS (HERO TAGLINE, ABOUT STORY)
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/api/admin/settings', (req, res) => {
  try {
    const settings = store.getSettings();
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch settings' });
  }
});

router.post('/api/admin/settings', (req, res) => {
  try {
    const updated = store.saveSettings(req.body);
    res.json({ success: true, settings: updated });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ success: false, message: 'Failed to save settings' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  ADMIN — ORDERS
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/api/admin/orders', (req, res) => {
  try {
    const orders = store.getOrders();
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
});

router.put('/api/admin/orders/:id', (req, res) => {
  try {
    const { status } = req.body;
    const order = store.updateOrderStatus(req.params.id, status);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update order' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  ADMIN — DASHBOARD STATS
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/api/admin/stats', (req, res) => {
  try {
    const products = store.getProducts();
    const orders = store.getOrders();
    const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

    res.json({
      success: true,
      stats: {
        totalProducts: products.length,
        totalOrders: orders.length,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        activeUsers: 48
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
});

module.exports = router;
