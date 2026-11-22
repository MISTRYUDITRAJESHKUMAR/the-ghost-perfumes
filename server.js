require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');

// ── Firebase Admin Initialization ──────────────────────────────────────────────
const admin = require('firebase-admin');

if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
  try {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('🔥 Firebase Admin SDK connected to Firestore.');
  } catch (err) {
    console.warn('⚠️ Firebase Admin init skipped:', err.message);
  }
} else {
  console.log('ℹ️ Running in local mode. Provide FIREBASE_* credentials in .env to connect live Firestore.');
}

// ── Express App ────────────────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use(apiRoutes);
app.use(adminRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', store: 'THE GHOST PERFUMES' });
});

// 404 handler — serve index.html for SPA client-side routing
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global error handling middleware
app.use((err, _req, res, _next) => {
  console.error('🔥 Unhandled error:', err.stack || err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// ── Start Server ───────────────────────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`👻 THE GHOST PERFUMES server running on http://localhost:${PORT}`);
    console.log(`👻 Also available on http://127.0.0.1:${PORT}`);
  });
}

module.exports = app;
