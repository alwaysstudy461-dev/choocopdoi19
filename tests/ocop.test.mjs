import assert from 'node:assert/strict';
import test from 'node:test';
import { BASE_PRODUCTS, DEFAULT_ORDERS } from '../src/data/catalog.js';
import {
  buildQrCells,
  buildSimulatedAiResponse,
  calculateCartTotals,
  cleanVoiceQuery,
  formatVND,
  generateTraceHash,
  getOrdersForShop,
  getProductBySlugOrId,
  getProductUrl,
  getRegionHubBySlugOrName,
  matchesSearchQuery,
  parseAiListing,
  slugifyVN,
  splitCartToShopOrders,
} from '../src/utils/format.js';

test('formatVND, slugifyVN, and product URL helpers generate clean SEO routes', () => {
  assert.equal(formatVND(45000), '45.000đ');
  assert.equal(slugifyVN('Bưởi Đường Lá Cam Tân Triều'), 'buoi-duong-la-cam-tan-trieu');
  assert.equal(getProductUrl(BASE_PRODUCTS[1]), '/san-pham/buoi-duong-la-cam');
  assert.equal(getRegionHubBySlugOrName('long-khanh')?.region, 'Long Khánh');
});

test('matchesSearchQuery supports multi-token Vietnamese and unaccented searches', () => {
  const pomelo = BASE_PRODUCTS.find((p) => p.id === 'p2');
  assert.equal(matchesSearchQuery(pomelo, 'Bưởi Tân Triều'), true);
  assert.equal(matchesSearchQuery(pomelo, 'buoi tan trieu'), true);
  assert.equal(matchesSearchQuery(pomelo, 'sầu riêng'), false);
});

test('getProductBySlugOrId resolves exact slug, id, and fallback', () => {
  const bySlug = getProductBySlugOrId(BASE_PRODUCTS, 'chom-chom-troc-nhan-long-khanh');
  assert.equal(bySlug?.id, 'p1');
  const byId = getProductBySlugOrId(BASE_PRODUCTS, 'p3');
  assert.equal(byId?.id, 'p3');
  const missing = getProductBySlugOrId(BASE_PRODUCTS, 'khong-ton-tai-xyz');
  assert.equal(missing, null);
});

test('calculateCartTotals applies shipping threshold and OCOPDN discount accurately', () => {
  const below150 = calculateCartTotals([{ unitPrice: 45000, qty: 2 }], { applied: true });
  assert.deepEqual(
    { subtotal: below150.subtotal, shipping: below150.shipping, discount: below150.discount, total: below150.total },
    { subtotal: 90000, shipping: 30000, discount: 0, total: 120000 }
  );

  const at200 = calculateCartTotals([{ unitPrice: 100000, qty: 2 }], { applied: true });
  assert.equal(at200.discount, 20000);
  assert.equal(at200.shipping, 30000);
  assert.equal(at200.total, 210000);

  const at350 = calculateCartTotals([{ unitPrice: 350000, qty: 1 }], { applied: true });
  assert.equal(at350.shipping, 0);
  assert.equal(at350.discount, 20000);
  assert.equal(at350.total, 330000);
});

test('splitCartToShopOrders preserves exact cart total across multiple shops', () => {
  const cart = [
    { productId: 'p1', variantLabel: 'Gói 1kg', unitPrice: 10000, qty: 1 },
    { productId: 'p2', variantLabel: 'Combo 3 Trái', unitPrice: 200000, qty: 1 },
  ];
  const totals = calculateCartTotals(cart, { applied: true });
  const created = splitCartToShopOrders({
    cart,
    products: BASE_PRODUCTS,
    shipping: totals.shipping,
    discount: totals.discount,
    customerName: 'Nguyễn Minh Anh',
    customerPhone: '0912345678',
    address: 'Biên Hòa',
    note: '',
    payment: 'COD',
    existingIds: DEFAULT_ORDERS.map((o) => o.id),
  });
  assert.equal(created.length, 2);
  const sumOrders = created.reduce((s, o) => s + o.total, 0);
  assert.equal(sumOrders, totals.total);
  const existingSet = new Set(DEFAULT_ORDERS.map((o) => o.id));
  created.forEach((o) => assert.equal(existingSet.has(o.id), false));
});

test('getOrdersForShop matches exact shop without substring cross-leakage', () => {
  const chuBaOrders = getOrdersForShop(DEFAULT_ORDERS, 'Vườn Chú Ba - Long Khánh');
  assert.equal(chuBaOrders.length, 2);
  const partialName = getOrdersForShop(DEFAULT_ORDERS, 'Long Khánh');
  assert.equal(partialName.length, 0);
});

test('parseAiListing extracts product, price, region, cert, and contact', () => {
  const parsed = parseAiListing(
    'Cô Tư ở Xuân Lộc thu hoạch bơ sáp 034 chín cây, giá 65 nghìn 1 ký, VietGAP, SĐT 0918222333',
    null
  );
  assert.equal(parsed.price, 65000);
  assert.equal(parsed.region, 'Xuân Lộc');
  assert.equal(parsed.cert, 'VietGAP');
  assert.equal(parsed.reqPhone, '0918 222 333');

  const plainPrice = parseAiListing('Bán chôm chôm Long Khánh giá 55000đ mỗi ký', null);
  assert.equal(plainPrice.price, 55000);
});

test('buildSimulatedAiResponse and cleanVoiceQuery return structured answers', () => {
  assert.equal(cleanVoiceQuery('tôi muốn mua chôm chôm!'), 'chôm chôm');
  const giftRes = buildSimulatedAiResponse({
    rawQuery: 'quà biếu dưới 200k',
    products: BASE_PRODUCTS,
    orders: DEFAULT_ORDERS,
    user: null,
  });
  assert.ok(giftRes.products.length > 0);
  assert.ok(giftRes.products.every((p) => p.price <= 200000));
});

test('QR generator and trace hash are deterministic', () => {
  assert.equal(generateTraceHash('DN-OCOP-P1'), generateTraceHash('DN-OCOP-P1'));
  const qr = buildQrCells('DN-OCOP-P1');
  assert.equal(qr.dim, 125);
  assert.ok(qr.cells.length > 50);
});
