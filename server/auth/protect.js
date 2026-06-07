/**
 * Express middleware that gates all routes behind a local-password session.
 *
 * Pass-through paths (no auth required):
 *   /auth/*       — login / logout / GitHub OAuth routes
 *   /login        — login HTML page
 *   /assets/*     — static assets (favicon, images)
 *   /css/*        — stylesheets served to the login page
 *
 * Everything else:
 *   - JSON requests → 401 { error: 'Not authenticated' }
 *   - HTML/browser requests → redirect to /login
 */

const PASS_PREFIXES = ['/auth/', '/assets/', '/css/'];
const PASS_EXACT = new Set(['/auth/login', '/login', '/favicon.ico']);

/**
 * @param {object} [opts]
 * @param {string} [opts.loginPath='/login']
 * @returns {import('express').RequestHandler}
 */
export function requireAuth({ loginPath = '/login' } = {}) {
  return (req, res, next) => {
    const path = req.path;

    // Always allow pass-through paths
    if (PASS_EXACT.has(path)) return next();
    if (PASS_PREFIXES.some(p => path.startsWith(p))) return next();

    if (req.session?.user) {
      return next();
    }

    const acceptsJson =
      req.headers['accept']?.includes('application/json') ||
      req.headers['content-type']?.includes('application/json');

    if (acceptsJson) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Save the intended destination so login can redirect back
    req.session.returnTo = req.originalUrl;
    req.session.save(() => res.redirect(loginPath));
  };
}

/**
 * Check if a raw IncomingMessage (WebSocket upgrade request) has a valid
 * authenticated session. Wraps the express-session middleware manually.
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('express-session').RequestHandler} sessionMiddleware
 * @returns {Promise<boolean>}
 */
export function isWsAuthenticated(req, sessionMiddleware) {
  return new Promise((resolve) => {
    // express-session expects a response-like object but only calls next()
    sessionMiddleware(req, {}, () => {
      resolve(!!(req.session?.user));
    });
  });
}
