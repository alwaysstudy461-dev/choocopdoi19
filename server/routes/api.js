import express from 'express';
import { buildSimulatedAiResponse, parseAiListing } from '../../src/utils/format.js';
import { askGroqChat, parseListingWithGroq } from '../services/groq.js';
import { calculateRegionDistance, getMapLocations } from '../services/maps.js';

export function createApiRouter(db, configManager, { fetchImpl = globalThis.fetch } = {}) {
  const router = express.Router();

  router.use((_req, res, next) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  router.get('/health', async (_req, res) => {
    const boot = await db.getBootstrap();
    const cfg = configManager.getPublicConfig();
    res.json({
      ok: true,
      service: 'choocop-backend',
      integrations: {
        groqEnabled: cfg.groqEnabled,
        groqModel: cfg.groqModel,
        googleMapsEnabled: cfg.googleMapsEnabled,
      },
      counts: {
        products: boot.products.length,
        customProducts: boot.customProducts.length,
        orders: boot.orders.length,
        accounts: boot.accounts.length,
        helpRequests: boot.helpRequestsCount,
      },
      updatedAt: boot.updatedAt,
    });
  });

  router.get('/config/public', (_req, res) => {
    res.json({ ok: true, ...configManager.getPublicConfig() });
  });

  router.post('/config', async (req, res) => {
    const body = req.body || {};
    const updated = await configManager.updateRuntimeConfig({
      groqApiKey: typeof body.groqApiKey === 'string' ? body.groqApiKey : undefined,
      groqModel: typeof body.groqModel === 'string' ? body.groqModel : undefined,
      googleMapsApiKey: typeof body.googleMapsApiKey === 'string' ? body.googleMapsApiKey : undefined,
    });
    res.json({ ok: true, ...updated });
  });

  router.get('/bootstrap', async (_req, res) => {
    const data = await db.getBootstrap();
    res.json({ ok: true, ...data, config: configManager.getPublicConfig() });
  });

  router.get('/products', async (req, res) => {
    const result = await db.queryProducts(req.query);
    res.json({ ok: true, ...result });
  });

  router.get('/products/:slugOrId', async (req, res) => {
    const found = await db.getProductDetail(req.params.slugOrId);
    if (!found) {
      res.status(404).json({ ok: false, error: 'Không tìm thấy sản phẩm.' });
      return;
    }
    res.json({ ok: true, ...found });
  });

  router.post('/products', async (req, res) => {
    const out = await db.createCustomProduct(req.body);
    if (out.error) {
      res.status(out.status || 400).json({ ok: false, error: out.error });
      return;
    }
    res.status(201).json({ ok: true, product: out.product });
  });

  router.post('/products/:id/reviews', async (req, res) => {
    const out = await db.addReview(req.params.id, req.body);
    if (out.error) {
      res.status(out.status || 400).json({ ok: false, error: out.error });
      return;
    }
    res.status(201).json({ ok: true, review: out.review, productId: out.productId });
  });

  router.get('/trace/:codeOrSlug', async (req, res) => {
    const result = await db.traceLot(req.params.codeOrSlug);
    if (!result) {
      res.status(404).json({ ok: false, error: 'Không tìm thấy mã lô phù hợp.' });
      return;
    }
    res.json({ ok: true, ...result });
  });

  router.get('/maps/locations', async (_req, res) => {
    const products = await db.getAllProducts();
    const cfg = configManager.getPublicConfig();
    res.json({
      ok: true,
      googleMapsEnabled: cfg.googleMapsEnabled,
      locations: getMapLocations(products),
    });
  });

  router.get('/maps/distance', async (req, res) => {
    const secrets = configManager.getSecrets();
    const result = await calculateRegionDistance({
      region: String(req.query.region || 'Long Khánh'),
      destAddress: String(req.query.dest || 'TP. Biên Hòa, Đồng Nai'),
      googleMapsApiKey: secrets.googleMapsApiKey,
      fetchImpl,
    });
    res.json({ ok: true, ...result });
  });

  router.post('/ai/parse-listing', async (req, res) => {
    const text = String(req.body?.text || '').trim();
    if (text.length < 5) {
      res.status(400).json({ ok: false, error: 'Hãy nhập mô tả tối thiểu 5 ký tự.' });
      return;
    }
    const secrets = configManager.getSecrets();
    const groqOut = await parseListingWithGroq({
      text,
      user: req.body?.user || null,
      groqApiKey: secrets.groqApiKey,
      groqModel: secrets.groqModel,
      fetchImpl,
    });
    if (groqOut) {
      res.json({ ok: true, ...groqOut });
      return;
    }
    const parsed = parseAiListing(text, req.body?.user || null);
    res.json({ ok: true, provider: 'local-fallback', model: 'rule-engine', listing: parsed });
  });

  router.post('/ai/chat', async (req, res) => {
    const query = String(req.body?.query || '').trim();
    if (!query) {
      res.status(400).json({ ok: false, error: 'Vui lòng nhập câu hỏi.' });
      return;
    }
    const boot = await db.getBootstrap();
    const secrets = configManager.getSecrets();
    const groqOut = await askGroqChat({
      query,
      products: boot.products,
      orders: boot.orders,
      user: req.body?.user || null,
      groqApiKey: secrets.groqApiKey,
      groqModel: secrets.groqModel,
      fetchImpl,
    });
    if (groqOut) {
      res.json({ ok: true, ...groqOut });
      return;
    }
    const response = buildSimulatedAiResponse({
      rawQuery: query,
      products: boot.products,
      orders: boot.orders,
      user: req.body?.user || null,
    });
    res.json({ ok: true, provider: 'local-fallback', model: 'rule-engine', applyVoucher: /giảm giá|voucher|ocopdn|freeship/i.test(query), response });
  });

  router.get('/orders', async (req, res) => {
    const shop = String(req.query.shop || '').trim();
    const items = await db.getOrders(shop);
    res.json({ ok: true, orders: items });
  });

  router.post('/orders', async (req, res) => {
    const out = await db.createOrders(req.body);
    if (out.error) {
      res.status(out.status || 400).json({ ok: false, error: out.error });
      return;
    }
    res.status(201).json({ ok: true, orders: out.orders, totals: out.totals || null });
  });

  router.patch('/orders/:id', async (req, res) => {
    const out = await db.updateOrder(req.params.id, req.body);
    if (out.error) {
      res.status(out.status || 400).json({ ok: false, error: out.error });
      return;
    }
    res.json({ ok: true, order: out.order });
  });

  router.get('/auth/accounts', async (_req, res) => {
    const accounts = await db.getAccounts();
    res.json({ ok: true, accounts });
  });

  router.post('/auth/login', async (req, res) => {
    const out = await db.login(req.body || {});
    if (out.error) {
      res.status(out.status || 400).json({ ok: false, error: out.error });
      return;
    }
    res.json({ ok: true, user: out.user });
  });

  router.post('/auth/register', async (req, res) => {
    const out = await db.register(req.body || {});
    if (out.error) {
      res.status(out.status || 400).json({ ok: false, error: out.error });
      return;
    }
    res.status(201).json({ ok: true, user: out.user, accounts: out.accounts });
  });

  router.post('/help-requests', async (req, res) => {
    const out = await db.addHelpRequest(req.body || {});
    if (out.error) {
      res.status(out.status || 400).json({ ok: false, error: out.error });
      return;
    }
    res.status(201).json({ ok: true, request: out.request });
  });

  router.post('/live-reminders', async (req, res) => {
    const result = await db.setLiveReminder(req.body || {});
    res.json({ ok: true, ...result });
  });

  router.use((req, res) => {
    res.status(404).json({ ok: false, error: `Endpoint không tồn tại: ${req.method} ${req.originalUrl}` });
  });

  return router;
}
