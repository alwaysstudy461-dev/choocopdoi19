import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import compression from 'compression';
import express from 'express';
import { createConfigManager } from './config.js';
import { createDatabase } from './db.js';
import { createApiRouter } from './routes/api.js';
import {
  getSiteOrigin,
  injectSeoHtml,
  renderRobotsTxt,
  renderSitemapIndex,
  renderSitemapPages,
  renderSitemapProducts,
  renderSitemapRegions,
  resolveRouteSeo,
} from './seo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

const FALLBACK_HTML = `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><meta name="description" content="Chợ OCOP Thanh Niên Đồng Nai" /><meta name="robots" content="index, follow" /><meta property="og:type" content="website" /><meta property="og:title" content="Chợ OCOP Thanh Niên Đồng Nai" /><meta property="og:description" content="Chợ OCOP Thanh Niên Đồng Nai" /><meta property="og:image" content="/images/chom-chom.jpg" /><title>Chợ OCOP Thanh Niên Đồng Nai</title></head><body><div id="root"></div></body></html>`;

async function readHtmlTemplate() {
  for (const candidate of [path.join(DIST_DIR, 'index.html'), path.join(ROOT_DIR, 'index.html')]) {
    try {
      return await fs.readFile(candidate, 'utf8');
    } catch {
      // try next
    }
  }
  return FALLBACK_HTML;
}

export async function createServerApp({ dbPath, runtimeConfigPath, fetchImpl } = {}) {
  const configManager = createConfigManager(runtimeConfigPath);
  const db = createDatabase(dbPath);
  await db.init();

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));

  // Security headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()');
    next();
  });

  // Dynamic SEO infrastructure endpoints
  app.get('/robots.txt', (req, res) => {
    const origin = getSiteOrigin(req);
    res.type('text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(renderRobotsTxt(origin));
  });

  app.get('/sitemap.xml', (req, res) => {
    const origin = getSiteOrigin(req);
    res.type('application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=1800');
    res.send(renderSitemapIndex(origin));
  });

  app.get('/sitemap-pages.xml', (req, res) => {
    const origin = getSiteOrigin(req);
    res.type('application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=1800');
    res.send(renderSitemapPages(origin));
  });

  app.get('/sitemap-regions.xml', (req, res) => {
    const origin = getSiteOrigin(req);
    res.type('application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=1800');
    res.send(renderSitemapRegions(origin));
  });

  app.get('/sitemap-products.xml', async (req, res) => {
    const origin = getSiteOrigin(req);
    const products = await db.getAllProducts();
    res.type('application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=600');
    res.send(renderSitemapProducts(origin, products));
  });

  // REST API
  app.use('/api', createApiRouter(db, configManager, { fetchImpl }));

  // Static built assets (immutable cache for hashed assets; fall back to public/)
  app.use(
    '/assets',
    express.static(path.join(DIST_DIR, 'assets'), {
      maxAge: '1y',
      immutable: true,
      fallthrough: true,
    })
  );
  app.use(
    '/images',
    express.static(path.join(DIST_DIR, 'images'), {
      maxAge: '7d',
      fallthrough: true,
    })
  );
  app.use(
    express.static(DIST_DIR, {
      index: false,
      maxAge: '1h',
      fallthrough: true,
    })
  );
  app.use(
    express.static(PUBLIC_DIR, {
      index: false,
      maxAge: '1h',
      fallthrough: true,
    })
  );

  // Explicit 404 for missing static asset files (prevent HTML soft-404 on broken images/scripts)
  app.get(/\.(js|css|map|png|jpg|jpeg|webp|svg|ico|woff2?|json|xml|txt|webmanifest)$/i, (req, res, next) => {
    if (req.path.endsWith('.html')) {
      next();
      return;
    }
    res.status(404).type('text/plain; charset=utf-8').send('Not Found');
  });

  // Dynamic SSR SEO HTML responder for all SPA routes
  app.use(async (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next();
      return;
    }
    const boot = await db.getBootstrap();
    const seo = resolveRouteSeo(req, boot);
    const template = await readHtmlTemplate();
    const origin = getSiteOrigin(req);
    const html = injectSeoHtml(template, seo, origin);

    if (seo.robots && seo.robots.startsWith('noindex')) {
      res.setHeader('X-Robots-Tag', seo.robots);
    }
    res.setHeader('Cache-Control', 'no-cache');
    res.status(seo.statusCode || 200).type('text/html; charset=utf-8').send(html);
  });

  // Global error handler
  app.use((err, _req, res, _next) => {
    console.error('[server error]', err);
    res.status(500).json({ ok: false, error: 'Lỗi máy chủ nội bộ.' });
  });

  return { app, db };
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectRun) {
  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST || '127.0.0.1';
  createServerApp()
    .then(({ app }) => {
      app.listen(port, host, () => {
        console.log(`ChoOCOP backend + SEO server running at http://${host}:${port}`);
      });
    })
    .catch((err) => {
      console.error('Failed to start server:', err);
      process.exit(1);
    });
}
