const admin = require('firebase-admin');

function getDb() {
  return admin.apps && admin.apps.length > 0 ? admin.firestore() : null;
}

/**
 * verifyToken
 * Validates the Firebase ID token from the Authorization header.
 * Attaches the decoded user to req.user on success.
 */
async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized — no token provided',
      });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Unauthorized — invalid or expired token',
    });
  }
}

const ADMIN_WHITELIST = [
  'uditrmistry@gmail.com',
  'uditmistryrajeshkumar@gmail.com',
  'nayakaditya736@gmail.com'
];

/**
 * verifyAdmin
 * Must be used AFTER verifyToken.
 * Checks if the authenticated user has an authorized admin email.
 */
async function verifyAdmin(req, res, next) {
  try {
    const email = (req.user && req.user.email ? req.user.email : '').toLowerCase().trim();

    if (!ADMIN_WHITELIST.includes(email)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden — not an authorized administrator',
      });
    }

    next();
  } catch (error) {
    console.error('Admin verification failed:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error verifying admin privileges',
    });
  }
}

module.exports = { verifyToken, verifyAdmin };
