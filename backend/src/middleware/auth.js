const { verifyAccessToken } = require('../utils/jwt');

/**
 * Middleware: require a valid Bearer access token.
 * Attaches `req.user = { id, email }` on success.
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required.' });
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Access token expired.' });
    }
    return res.status(401).json({ success: false, message: 'Invalid access token.' });
  }
}

module.exports = { requireAuth };
