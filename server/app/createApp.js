import express from 'express';
import cors from 'cors';
import session from 'express-session';

export function createApp({ allowedOrigins, allowNullOrigin = false, sessionSecret } = {}) {
  const app = express();

  app.disable('x-powered-by');

  const origins = Array.isArray(allowedOrigins) ? allowedOrigins : [];
  const allowAllOrigins = origins.includes('*');

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowAllOrigins) return callback(null, true);
      if (origin === 'null') return callback(allowNullOrigin ? null : new Error('CORS origin not allowed'), allowNullOrigin);
      if (origins.includes(origin)) return callback(null, true);
      return callback(new Error('CORS origin not allowed'));
    },
    credentials: true,
  }));

  app.use(session({
    secret: sessionSecret || process.env.SESSION_SECRET || 'gastown-dev-secret-change-in-prod',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  }));

  app.use(express.json({ limit: '1mb' }));

  return app;
}

