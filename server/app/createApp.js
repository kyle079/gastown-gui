import express from 'express';
import cors from 'cors';
import session from 'express-session';

// Used only in dev/test when SESSION_SECRET is not set
const DEV_FALLBACK_SECRET = 'gastown-dev-secret-CHANGE-IN-PROD';

/**
 * @param {object} [opts]
 * @param {string[]} [opts.allowedOrigins]
 * @param {boolean} [opts.allowNullOrigin]
 * @param {string} [opts.sessionSecret]
 * @returns {{ app: import('express').Application, sessionParser: import('express-session').RequestHandler }}
 */
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

  const secret = sessionSecret || process.env.SESSION_SECRET || DEV_FALLBACK_SECRET;
  if (secret === DEV_FALLBACK_SECRET) {
    console.warn('[Security] SESSION_SECRET is not set — using dev fallback. Set SESSION_SECRET before deploying.');
  }

  const sessionParser = session({
    secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  });

  app.use(sessionParser);
  app.use(express.json({ limit: '1mb' }));

  return { app, sessionParser };
}
