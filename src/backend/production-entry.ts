import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Production bootstrap for the existing backend.
 *
 * server.ts owns the API and starts the Express application. This bootstrap is
 * loaded instead for production so the same Express application also serves
 * the Vite build immediately before it begins listening. Development remains
 * unchanged and continues to use Vite's dev server.
 */
const backendDir = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(backendDir, '..');
const indexPath = path.join(frontendDir, 'index.html');

if (!fs.existsSync(indexPath)) {
  throw new Error(`AEGIS production frontend is missing: ${indexPath}. Run npm run build before npm start.`);
}

const application = express.application as typeof express.application & {
  listen: typeof express.application.listen;
};
const originalListen = application.listen;
let frontendMounted = false;

application.listen = function patchedListen(this: express.Application, ...args: Parameters<typeof originalListen>) {
  if (!frontendMounted) {
    frontendMounted = true;
    this.use(express.static(frontendDir, { index: false }));
    this.get('*', (req, res, next) => {
      if (
        req.path.startsWith('/api/') ||
        req.path === '/health' ||
        req.path === '/status' ||
        req.path === '/metrics'
      ) {
        return next();
      }
      return res.sendFile(indexPath);
    });
  }
  return originalListen.apply(this, args);
} as typeof originalListen;

await import('./server.js');
