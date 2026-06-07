export function registerAuthRoutes(app, { oauth, sessionStore, isSecure = false } = {}) {
  // Attach session to every request (non-blocking — missing session is OK for public routes)
  app.use((req, _res, next) => {
    const entry = sessionStore.readFromRequest(req);
    req.session = entry?.data ?? null;
    req.sessionId = entry?.id ?? null;
    next();
  });

  // GET /api/auth/me — current user info (public, returns loggedIn: false if no session)
  app.get('/api/auth/me', (req, res) => {
    if (req.session?.login) {
      res.json({
        loggedIn: true,
        login: req.session.login,
        avatarUrl: req.session.avatarUrl,
        name: req.session.name,
      });
    } else {
      res.json({ loggedIn: false });
    }
  });

  // GET /auth/github — begin OAuth login
  app.get('/auth/github', (req, res) => {
    if (!oauth?.configured) {
      return res.status(501).send([
        '<!DOCTYPE html><html><body>',
        '<h2>GitHub OAuth not configured</h2>',
        '<p>Set <code>GITHUB_CLIENT_ID</code>, <code>GITHUB_CLIENT_SECRET</code>, ',
        'and <code>GITHUB_CALLBACK_URL</code> to enable Sign in with GitHub.</p>',
        '</body></html>',
      ].join(''));
    }
    const authUrl = oauth.generateAuthUrl();
    res.redirect(authUrl);
  });

  // GET /auth/github/callback — OAuth callback
  app.get('/auth/github/callback', async (req, res) => {
    const { code, state, error } = req.query;

    if (error) {
      return res.redirect('/?auth_error=' + encodeURIComponent(error));
    }

    if (!oauth?.configured) {
      return res.redirect('/?auth_error=not_configured');
    }

    if (!oauth.consumeState(state)) {
      return res.redirect('/?auth_error=invalid_state');
    }

    try {
      const token = await oauth.exchangeCode(code);
      const user = await oauth.getUser(token);

      if (!oauth.isAllowed(user.login)) {
        return res.redirect('/?auth_error=not_allowed');
      }

      const sessionId = sessionStore.create({
        login: user.login,
        avatarUrl: user.avatarUrl,
        name: user.name,
        githubToken: token,
      });

      sessionStore.setCookie(res, sessionId, { secure: isSecure });
      res.redirect('/');
    } catch (err) {
      console.error('[Auth] OAuth callback error:', err.message);
      res.redirect('/?auth_error=' + encodeURIComponent('login_failed'));
    }
  });

  // POST /auth/logout — clear session
  app.post('/auth/logout', (req, res) => {
    if (req.sessionId) {
      sessionStore.delete(req.sessionId);
    }
    sessionStore.clearCookie(res);
    res.json({ success: true });
  });
}
