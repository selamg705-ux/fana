import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import apiRouter from './api.ts';
import { initializeDatabase } from './db.ts';

dotenv.config();

const app = express();

// Request body parsing with generous limits for camera uploads
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Serverless-friendly lazy database initialization
let initDbPromise: Promise<any> | null = null;
export function ensureDbInitialized() {
  if (!initDbPromise) {
    initDbPromise = initializeDatabase().then((res) => {
      if (res.success) {
        console.log('Neon PostgreSQL ready:', res.message);
      } else {
        console.warn('Database notice:', res.message);
      }
      return res;
    }).catch((err) => {
      console.warn('Database initialization error:', err?.message || err);
      // Reset promise on error so subsequent requests can retry
      initDbPromise = null;
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

export default app;
