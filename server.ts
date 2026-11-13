import http from 'http';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

import { createServer as createViteServer } from 'vite';
import app, { ensureDbInitialized } from './server/app.ts';
import { getExistingSuperAdminSummary, resetSuperAdminPasswordInDb } from './server/db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OWNER_SOCKET_PATH = '/tmp/mela-owner-reset.sock';
const OWNER_TOKEN_PATH = '/tmp/mela-owner-reset.token';

process.on('unhandledRejection', (reason, promise) => {
  console.warn('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

function startPrivateOwnerRecoverySocket() {
  try {
    if (fs.existsSync(OWNER_SOCKET_PATH)) {
      fs.unlinkSync(OWNER_SOCKET_PATH);
    }
    const ownerToken = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(OWNER_TOKEN_PATH, ownerToken, { mode: 0o600 });

    const ownerServer = http.createServer(async (req, res) => {
      res.setHeader('Content-Type', 'application/json');

      const provided = String(req.headers['x-owner-token'] || '');
      const expectedBuf = Buffer.from(ownerToken, 'utf8');
      const providedBuf = Buffer.from(provided, 'utf8');
      if (expectedBuf.length !== providedBuf.length || !crypto.timingSafeEqual(expectedBuf, providedBuf)) {
        res.statusCode = 403;
        res.end(JSON.stringify({ error: 'Unauthorized local owner request.' }));
        return;
      }

      try {
        await ensureDbInitialized();
      } catch {}

      if (req.method === 'GET' && req.url === '/owner/superadmin') {
        try {
          const summary = await getExistingSuperAdminSummary();
          if (!summary) {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: 'Existing Super Admin account not found.' }));
            return;
          }
          res.statusCode = 200;
          res.end(JSON.stringify({ account: summary }));
        } catch (err: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err?.message || 'Failed to inspect Super Admin account.' }));
        }
        return;
      }

      if (req.method === 'POST' && req.url === '/owner/reset-superadmin') {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
          if (body.length > 16384) req.destroy();
        });
        req.on('end', async () => {
          try {
            const parsed = JSON.parse(body || '{}');
            const updated = await resetSuperAdminPasswordInDb(parsed.newPassword, parsed.expectedEmail);
            res.statusCode = 200;
            res.end(JSON.stringify({
              success: true,
              message: 'Existing Super Admin password updated securely in Neon PostgreSQL.',
              account: updated
            }));
          } catch (err: any) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: err?.message || 'Could not reset Super Admin password.' }));
          }
        });
        return;
      }

      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'Not found' }));
    });

    ownerServer.listen(OWNER_SOCKET_PATH, () => {
      try {
        fs.chmodSync(OWNER_SOCKET_PATH, 0o600);
      } catch {}
    });

    const cleanupSocket = () => {
      try { if (fs.existsSync(OWNER_SOCKET_PATH)) fs.unlinkSync(OWNER_SOCKET_PATH); } catch {}
      try { if (fs.existsSync(OWNER_TOKEN_PATH)) fs.unlinkSync(OWNER_TOKEN_PATH); } catch {}
    };
    process.once('SIGINT', cleanupSocket);
    process.once('SIGTERM', cleanupSocket);
  } catch (err: any) {
    console.warn('Private owner socket setup skipped:', err?.message);
  }
}

async function startServer() {
  const httpServer = http.createServer(app);

  // Parse command-line args if passed (e.g. --port 3000 --host 0.0.0.0)
  const portArgIdx = process.argv.indexOf('--port');
  const portFromArg = portArgIdx !== -1 && process.argv[portArgIdx + 1] ? parseInt(process.argv[portArgIdx + 1], 10) : undefined;
  const PORT = portFromArg || (process.env.PORT ? parseInt(process.env.PORT, 10) : 3000);

  const hostArgIdx = process.argv.indexOf('--host');
  const HOST = (hostArgIdx !== -1 && process.argv[hostArgIdx + 1]) ? process.argv[hostArgIdx + 1] : '0.0.0.0';

  const isProd = process.env.NODE_ENV === 'production';

  // Ensure unmatched /api/* endpoints return JSON 404 rather than SPA HTML
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  if (!isProd) {
    // Mount Vite dev server middleware in development
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log(`Vite middleware mounted in development mode (hmr: ${!isHmrDisabled})`);
  } else {
    // Serve production static assets
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  httpServer.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use.`);
    } else {
      console.error('Server error:', err);
    }
  });

  httpServer.listen(PORT, HOST, () => {
    console.log(`Mela Market full-stack server running at http://${HOST}:${PORT}`);
  });

  startPrivateOwnerRecoverySocket();
}

startServer().catch((err) => {
  console.error('Fatal server boot failure:', err);
  process.exit(1);
});
