const admin = require('firebase-admin');

const ADMIN_WHITELIST = [
  'uditrmistry@gmail.com',
  'uditmistryrajeshkumar@gmail.com',
  'nayakaditya736@gmail.com'
];

const MASTER_ADMIN_KEY = 'ghost@123';

/**
 * verifyAdminOrMaster
 * Validates Master Key, Admin Whitelist, or Firebase Auth token.
 */
async function verifyAdminOrMaster(req, res, next) {
  try {
    const adminKey = req.headers['x-admin-key'] || req.headers['x-admin-password'];
    const authHeader = req.headers.authorization || '';
    const adminEmail = (req.headers['x-admin-email'] || '').toLowerCase().trim();

    // 1. Direct Master Admin Key check
    if (adminKey === MASTER_ADMIN_KEY || authHeader === `Bearer ${MASTER_ADMIN_KEY}`) {
      req.user = {
        email: adminEmail && ADMIN_WHITELIST.includes(adminEmail) ? adminEmail : 'uditrmistry@gmail.com',
        role: 'admin',
        isMaster: true
      };
      return next();
    }

    // 2. Admin Whitelist email with token
    if (adminEmail && ADMIN_WHITELIST.includes(adminEmail) && adminKey === MASTER_ADMIN_KEY) {
      req.user = { email: adminEmail, role: 'admin' };
      return next();
    }

    // 3. Firebase Token verification if Firebase Admin is active
    if (authHeader.startsWith('Bearer ') && admin.apps && admin.apps.length > 0) {
      const idToken = authHeader.split('Bearer ')[1];
      try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const email = (decodedToken.email || '').toLowerCase().trim();
        if (ADMIN_WHITELIST.includes(email)) {
          req.user = decodedToken;
          return next();
        }
      } catch (_) {}
    }

    return res.status(403).json({
      success: false,
      message: 'Forbidden — Master Administrator clearance required'
    });
  } catch (error) {
    console.error('Admin verification error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error verifying administrator clearance'
    });
  }
}

async function verifyToken(req, res, next) {
  return verifyAdminOrMaster(req, res, next);
}

async function verifyAdmin(req, res, next) {
  return next();
}

module.exports = { verifyToken, verifyAdmin, verifyAdminOrMaster, ADMIN_WHITELIST, MASTER_ADMIN_KEY };
