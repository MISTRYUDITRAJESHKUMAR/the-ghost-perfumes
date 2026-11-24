const express = require('express');
const router = express.Router();
const store = require('../services/store');

// ═══════════════════════════════════════════════════════════════════════════════
//  PRODUCTS (PUBLIC)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/products
 * List all products. Supports optional ?category=men|women|unisex filter.
 */
router.get('/api/products', async (req, res) => {
  try {
    const { category } = req.query;
    const products = await store.getProductsAsync({ category });
    res.json({ success: true, products });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch products' });
  }
});

/**
 * GET /api/products/featured
 * Get products where featured === true.
 */
router.get('/api/products/featured', async (req, res) => {
  try {
    const products = await store.getProductsAsync({ featured: true });
    res.json({ success: true, products });
  } catch (error) {
    console.error('Error fetching featured products:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch featured products' });
  }
});

/**
 * GET /api/products/:id
 * Get a single product by ID.
 */
router.get('/api/products/:id', async (req, res) => {
  try {
    const product = await store.getProductByIdAsync(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, product });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch product' });
  }
});

/**
 * GET /api/settings
 * Get current store content settings (hero tagline, about story, etc.)
 */
router.get('/api/settings', async (req, res) => {
  try {
    const settings = await store.getSettingsAsync();
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch settings' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  ORDERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/orders
 * Place a new order into the master store.
 */
router.post('/api/orders', (req, res) => {
  try {
    const orderData = req.body;
    if (!orderData || !orderData.items || !Array.isArray(orderData.items)) {
      return res.status(400).json({ success: false, message: 'Invalid order data: items array required' });
    }

    const saved = store.saveOrder(orderData);
    res.status(201).json({ success: true, orderId: saved.orderId, order: saved });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ success: false, message: 'Failed to create order' });
  }
});

/**
 * GET /api/orders
 * Get orders list.
 */
router.get('/api/orders', (req, res) => {
  try {
    const orders = store.getOrders();
    res.json({ success: true, orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
});

module.exports = router;
