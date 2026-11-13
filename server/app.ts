import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import apiRouter from './api.ts';
import { initializeDatabase, isNeonConnected, getDatabaseUrl } from './db.ts';

dotenv.config();

const app = express();

// Request body parsing with generous limits for camera uploads
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Serverless-friendly lazy database initialization
let initDbPromise: Promise<any> | null = null;
let initDbInFlight = false;
let lastInitFailureAt = 0;
const INIT_RETRY_COOLDOWN_MS = 15000;

export function resetDbInitCooldown() {
  lastInitFailureAt = 0;
  initDbPromise = null;
}

export function ensureDbInitialized(force = false) {
  if (isNeonConnected() && !force) {
    return Promise.resolve({ success: true });
  }
  const now = Date.now();
  if (!force && !initDbInFlight && lastInitFailureAt > 0 && now - lastInitFailureAt < INIT_RETRY_COOLDOWN_MS) {
    return Promise.resolve({ success: false, message: 'Database initialization retry cooldown active.' });
  }
  if (!initDbInFlight && (force || getDatabaseUrl())) {
    initDbPromise = null;
  }
  if (!initDbPromise) {
    initDbInFlight = true;
    initDbPromise = initializeDatabase().then((res) => {
      initDbInFlight = false;
      if (res.success) {
        lastInitFailureAt = 0;
        console.log('Neon PostgreSQL ready:', res.message);
      } else {
        lastInitFailureAt = Date.now();
        console.warn('Database notice:', res.message);
        if (getDatabaseUrl()) {
          initDbPromise = null;
        }
      }
      return res;
    }).catch((err) => {
      initDbInFlight = false;
      lastInitFailureAt = Date.now();
      console.warn('Database initialization error:', err?.message || err);
      initDbPromise = null;
      return { success: false, message: typeof err?.message === 'string' ? err.message : 'Database initialization error' };
    });
  }
  return initDbPromise;
}

// Kick off initialization
ensureDbInitialized();

// Middleware: wait for DB init on API requests
app.use(async (req: Request, _res: Response, next: NextFunction) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/auth') || req.path.startsWith('/products') || req.path.startsWith('/categories')) {
    try {
      await ensureDbInitialized();
    } catch {}
  }
  next();
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Mount API router on both '/api' and root to support Vercel rewrites seamlessly
app.use('/api', apiRouter);
app.use(apiRouter);

// Global JSON error handler (catches malformed JSON, oversized payloads, or unexpected Express errors)
app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    next(err);
    return;
  }
  if (err?.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    res.status(400).json({ error: 'Invalid JSON request body.' });
    return;
  }
  if (err?.type === 'entity.too.large' || err?.status === 413) {
    res.status(413).json({ error: 'Uploaded data is too large. Maximum size is 15MB.' });
    return;
  }
  const status = typeof err?.status === 'number' && err.status >= 400 && err.status < 600 ? err.status : 500;
  const message = typeof err?.message === 'string' && err.message.trim()
    ? err.message
    : 'An unexpected server error occurred.';
  res.status(status).json({ error: message });
});

export default app;
