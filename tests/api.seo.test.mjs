import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { createServerApp } from '../server/index.js';

let tmpDir;
let server;
let baseUrl;

const mockExternalFetch = async (url) => {
  const target = String(url);
  if (target.includes('api.groq.com/openai/v1/chat/completions')) {
    return {
      ok: true,
      async json() {
        return {
          model: 'llama-3.3-70b-versatile',
          choices: [
            {
              message: {
                content: JSON.stringify({
                  text: 'Gợi ý từ Groq AI: Bưởi Đường Lá Cam Tân Triều rất hợp làm quà biếu sức khỏe.',
                  productIds: ['p2', 'p10'],
                  actionHref: 'javascript:alert(1)',
                  actionLabel: 'Xem quà OCOP',
                  actionIcon: 'gift',
                  name: 'Chôm Chôm Nhãn Groq Chuẩn OCOP',
                  price: 52000,
                  unit: 'Gói 1kg',
                  cat: 'fresh',
                  region: 'Long Khánh',
                  cert: 'OCOP 4 sao',
                }),
              },
            },
          ],
        };
      },
    };
  }
  if (target.includes('maps.googleapis.com/maps/api/distancematrix/json')) {
    return {
      ok: true,
      async json() {
        return {
          destination_addresses: ['TP. Biên Hòa, Đồng Nai'],
          rows: [
            {
              elements: [
                {
                  status: 'OK',
                  distance: { value: 48200, text: '48,2 km' },
                  duration: { value: 3900, text: '1 giờ 5 phút' },
                },
              ],
            },
          ],
        };
      },
    };
  }
  throw new Error(`Unexpected external fetch in test: ${target}`);
};

before(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'choocop-srv-'));
  const dbPath = path.join(tmpDir, 'db.json');
  const runtimeConfigPath = path.join(tmpDir, 'runtime-config.json');
  const { app } = await createServerApp({ dbPath, runtimeConfigPath, fetchImpl: mockExternalFetch });
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => resolve());
  });
  const addr = server.address();
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(() => resolve()));
  }
  if (tmpDir) {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('API health and tokenized product search work cleanly', async () => {
  const h = await fetch(`${baseUrl}/api/health`);
  assert.equal(h.status, 200);
  const hJson = await h.json();
  assert.equal(hJson.ok, true);
  assert.ok(hJson.counts.products >= 10);

  const search = await fetch(`${baseUrl}/api/products?q=${encodeURIComponent('Bưởi Tân Triều')}`);
  assert.equal(search.status, 200);
  const sJson = await search.json();
  assert.ok(sJson.items.some((p) => p.id === 'p2'));
});

test('POST /api/products validates input, persists custom listing, and updates dynamic sitemap', async () => {
  const bad = await fetch(`${baseUrl}/api/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'X', price: 1000 }),
  });
  assert.equal(bad.status, 400);

  const createRes = await fetch(`${baseUrl}/api/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Bơ Sáp 034 Kiểm Chứng API',
      price: 70000,
      region: 'Xuân Lộc',
      category: 'fresh',
      cert: 'VietGAP',
      reqName: 'Cô Tư',
      reqPhone: '0918222333',
    }),
  });
  assert.equal(createRes.status, 201);
  const { product } = await createRes.json();
  assert.ok(product.slug.includes('bo-sap-034'));

  const sitemapRes = await fetch(`${baseUrl}/sitemap-products.xml`);
  assert.equal(sitemapRes.status, 200);
  const xml = await sitemapRes.text();
  assert.ok(xml.includes(product.slug));
});

test('POST /api/orders authoritatively calculates totals server-side even with tampered unitPrice', async () => {
  const res = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cart: [
        { productId: 'p1', variantIndex: 0, unitPrice: 1, qty: 2 },
        { productId: 'p2', variantIndex: 1, unitPrice: 1, qty: 1 },
      ],
      voucherCode: 'OCOPDN',
      customerName: 'Nguyễn Minh Anh',
      customerPhone: '0912345678',
      address: 'TP. Biên Hòa, Đồng Nai',
      payment: 'COD',
    }),
  });
  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.orders.length, 2);
  // p1 (45000*2=90000) + p2 variant 1 (75000*2.85=213750) = 303750 (>=300k freeship) - 20000 = 283750
  assert.equal(data.totals.total, 283750);
  const sum = data.orders.reduce((acc, o) => acc + o.total, 0);
  assert.equal(sum, 283750);

  const patch = await fetch(`${baseUrl}/api/orders/${encodeURIComponent(data.orders[0].id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ step: 2, status: 'Đang hái tươi & đóng gói' }),
  });
  assert.equal(patch.status, 200);
  const patched = await patch.json();
  assert.equal(patched.order.step, 2);
});

test('Auth registration hashes passwords and never exposes sensitive fields', async () => {
  const reg = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      role: 'customer',
      name: 'Anh Minh Kiểm Thử',
      phone: '0988776655',
      password: 'secretpassword',
      address: 'Long Thành, Đồng Nai',
    }),
  });
  assert.equal(reg.status, 201);
  const regJson = await reg.json();
  assert.equal('password' in regJson.user, false);
  assert.equal('passwordHash' in regJson.user, false);

  const badLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '0988776655', password: 'wrongpassword' }),
  });
  assert.equal(badLogin.status, 401);

  const goodLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '0988776655', password: 'secretpassword' }),
  });
  assert.equal(goodLogin.status, 200);
});

test('Enterprise SEO endpoints serve valid sitemaps, robots.txt, SSR meta, JSON-LD, and HTTP 404 on missing pages', async () => {
  const robots = await fetch(`${baseUrl}/robots.txt`);
  assert.equal(robots.status, 200);
  const robotsTxt = await robots.text();
  assert.ok(robotsTxt.includes('Disallow: /api/'));
  assert.ok(robotsTxt.includes(`Sitemap: ${baseUrl}/sitemap.xml`));

  const idx = await fetch(`${baseUrl}/sitemap.xml`);
  assert.equal(idx.status, 200);
  const idxXml = await idx.text();
  assert.ok(idxXml.includes('<sitemapindex'));
  assert.ok(idxXml.includes('/sitemap-regions.xml'));
  assert.ok(idxXml.includes('/sitemap-products.xml'));

  const prodHtmlRes = await fetch(`${baseUrl}/san-pham/buoi-duong-la-cam`);
  assert.equal(prodHtmlRes.status, 200);
  const prodHtml = await prodHtmlRes.text();
  assert.ok(prodHtml.includes('<link rel="canonical" href="' + baseUrl + '/san-pham/buoi-duong-la-cam" />'));
  assert.ok(prodHtml.includes('property="og:type" content="product"'));
  assert.ok(prodHtml.includes('"@type":"Product"'));
  assert.ok(prodHtml.includes('<h1>Bưởi Đường Lá Cam Tân Triều Tuyển Chọn</h1>'));

  const missingProdRes = await fetch(`${baseUrl}/san-pham/san-pham-khong-ton-tai-xyz`);
  assert.equal(missingProdRes.status, 404);
  const missingHtml = await missingProdRes.text();
  assert.ok(missingHtml.includes('content="noindex, follow"'));

  const noindexRes = await fetch(`${baseUrl}/don-hang`);
  assert.equal(noindexRes.status, 200);
  assert.equal(noindexRes.headers.get('x-robots-tag'), 'noindex, nofollow');
});

test('Groq AI and Google Maps API endpoints mask secrets, sanitize actions, and support distance matrix', async () => {
  const locRes = await fetch(`${baseUrl}/api/maps/locations`);
  assert.equal(locRes.status, 200);
  const locData = await locRes.json();
  assert.ok(locData.locations.length >= 6);
  assert.equal(typeof locData.locations[0].lat, 'number');

  // Offline Haversine fallback before Google Maps key is set
  const distFallbackRes = await fetch(`${baseUrl}/api/maps/distance?region=${encodeURIComponent('Long Khánh')}`);
  const distFallback = await distFallbackRes.json();
  assert.equal(distFallback.provider, 'haversine-fallback');
  assert.ok(distFallback.distanceKm > 10);

  // Configure runtime API keys and verify secret masking
  const cfgRes = await fetch(`${baseUrl}/api/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      groqApiKey: 'gsk_test_secret_9876543210',
      groqModel: 'llama-3.3-70b-versatile',
      googleMapsApiKey: 'AIzaSy_Test_Google_Maps_Key',
    }),
  });
  assert.equal(cfgRes.status, 200);
  const cfgJson = await cfgRes.json();
  assert.equal(cfgJson.groqEnabled, true);
  assert.equal(cfgJson.googleMapsEnabled, true);
  assert.equal(cfgJson.groqKeyPreview, 'gsk_...3210');
  assert.equal('groqApiKey' in cfgJson, false);

  // Groq chat verifies grounded product resolution & XSS URL sanitization
  const chatRes = await fetch(`${baseUrl}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'Tư vấn quà biếu Tân Triều' }),
  });
  const chatJson = await chatRes.json();
  assert.equal(chatJson.provider, 'groq');
  assert.equal(chatJson.response.products.length, 2);
  assert.equal(chatJson.response.action.href, '/san-pham');

  // Groq listing parser
  const parseRes = await fetch(`${baseUrl}/api/ai/parse-listing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'Chú Ba ở Long Khánh bán chôm chôm giá 52k' }),
  });
  const parseJson = await parseRes.json();
  assert.equal(parseJson.provider, 'groq');
  assert.equal(parseJson.listing.price, 52000);

  // Google Distance Matrix API
  const distRealRes = await fetch(`${baseUrl}/api/maps/distance?region=${encodeURIComponent('Long Khánh')}`);
  const distReal = await distRealRes.json();
  assert.equal(distReal.provider, 'google-maps');
  assert.equal(distReal.distanceText, '48,2 km');
});

