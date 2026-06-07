export function requireAuth(sessionStore) {
  return (req, res, next) => {
    const session = sessionStore.readFromRequest(req);
    if (!session?.data?.login) {
      return res.status(401).json({ error: 'Authentication required', authRequired: true });
    }
    req.session = session;
    next();
  };
}
