const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { verifyToken } = require('../middleware/auth');

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
      add: async () => ({ id: 'local-' + Date.now() }),
      batch: () => ({ update: () => {}, commit: async () => {} })
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  PRODUCTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/products
 * List all products. Supports optional ?category=men|women|unisex filter.
 */
router.get('/api/products', async (req, res) => {
  try {
    const { category } = req.query;
    let query = db.collection('products').orderBy('createdAt', 'desc');

    if (category) {
      query = query.where('category', '==', category);
    }

    const snapshot = await query.get();
    const products = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

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
    const snapshot = await db
      .collection('products')
      .where('featured', '==', true)
      .orderBy('createdAt', 'desc')
      .get();

    const products = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

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
    const doc = await db.collection('products').doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, product: { id: doc.id, ...doc.data() } });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch product' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  CART
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/cart
 * Add an item to the authenticated user's cart.
 * Body: { productId, quantity, size }
 */
router.post('/api/cart', verifyToken, async (req, res) => {
  try {
    const { productId, quantity = 1, size } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'productId is required' });
    }

    // Verify the product exists
    const productDoc = await db.collection('products').doc(productId).get();
    if (!productDoc.exists) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const product = productDoc.data();

    const cartItem = {
      productId,
      name: product.name,
      price: product.price,
      image: product.image || '',
      quantity: Number(quantity),
      size: size || product.size || '',
      addedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const cartRef = await db
      .collection('users')
      .doc(req.user.uid)
      .collection('cart')
      .add(cartItem);

    res.status(201).json({ success: true, cartItemId: cartRef.id, item: cartItem });
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({ success: false, message: 'Failed to add item to cart' });
  }
});

/**
 * GET /api/cart
 * Get the authenticated user's cart.
 */
router.get('/api/cart', verifyToken, async (req, res) => {
  try {
    const snapshot = await db
      .collection('users')
      .doc(req.user.uid)
      .collection('cart')
      .orderBy('addedAt', 'desc')
      .get();

    const cart = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({ success: true, cart });
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch cart' });
  }
});

/**
 * DELETE /api/cart/:itemId
 * Remove an item from the authenticated user's cart.
 */
router.delete('/api/cart/:itemId', verifyToken, async (req, res) => {
  try {
    const cartItemRef = db
      .collection('users')
      .doc(req.user.uid)
      .collection('cart')
      .doc(req.params.itemId);

    const doc = await cartItemRef.get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, message: 'Cart item not found' });
    }

    await cartItemRef.delete();

    res.json({ success: true, message: 'Item removed from cart' });
  } catch (error) {
    console.error('Error removing cart item:', error);
    res.status(500).json({ success: false, message: 'Failed to remove cart item' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  ORDERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/orders
 * Create an order from the authenticated user's cart.
 * Body: { shippingAddress: { name, address, city, state, zip, phone } }
 */
router.post('/api/orders', verifyToken, async (req, res) => {
  try {
    const { shippingAddress } = req.body;

    if (!shippingAddress) {
      return res.status(400).json({ success: false, message: 'Shipping address is required' });
    }

    // Fetch user cart
    const cartSnapshot = await db
      .collection('users')
      .doc(req.user.uid)
      .collection('cart')
      .get();

    if (cartSnapshot.empty) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    const items = cartSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const order = {
      userId: req.user.uid,
      userEmail: req.user.email || '',
      items,
      totalAmount,
      shippingAddress,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const orderRef = await db.collection('orders').add(order);

    // Clear the user's cart after placing the order
    const batch = db.batch();
    cartSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    res.status(201).json({ success: true, orderId: orderRef.id, order });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ success: false, message: 'Failed to create order' });
  }
});

/**
 * GET /api/orders
 * Get all orders for the authenticated user.
 */
router.get('/api/orders', verifyToken, async (req, res) => {
  try {
    const snapshot = await db
      .collection('orders')
      .where('userId', '==', req.user.uid)
      .orderBy('createdAt', 'desc')
      .get();

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

module.exports = router;
