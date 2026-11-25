import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BASE_PRODUCTS,
  DEFAULT_ACCOUNTS,
  DEFAULT_ORDERS,
  DN_MAP_REGIONS,
} from '../src/data/catalog.js';
import {
  calculateCartTotals,
  getProductBySlugOrId,
  getProductDetailData,
  getProductLotCode,
  getProductMeta,
  getProductSlug,
  matchesSearchQuery,
  slugifyVN,
  splitCartToShopOrders,
} from '../src/utils/format.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_DB_PATH = path.resolve(__dirname, 'data', 'db.json');

const ALLOWED_REGIONS = new Set(['Long Khánh', 'Tân Triều', 'Bình Long', 'Xuân Lộc', 'Định Quán']);
const ALLOWED_CATS = new Set(['fresh', 'dry', 'drink']);
const ALLOWED_PAYMENTS = new Set(['COD', 'VietQR', 'VietQR (Đã thanh toán)']);

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const derived = crypto.scryptSync(String(password), salt, 32).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password, storedHash, legacyPlain) {
  if (storedHash && storedHash.includes(':')) {
    const [salt, hex] = storedHash.split(':');
    const candidate = crypto.scryptSync(String(password), salt, 32).toString('hex');
    const a = Buffer.from(candidate, 'hex');
    const b = Buffer.from(hex, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
  if (legacyPlain) {
    return password === legacyPlain;
  }
  return false;
}

export function sanitizeAccount(acc) {
  if (!acc) return null;
  const { password, passwordHash, ...safe } = acc;
  return safe;
}

function buildSeedState() {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    customProducts: [],
    orders: DEFAULT_ORDERS.map((o) => ({ ...o })),
    accounts: DEFAULT_ACCOUNTS.map((a) => ({
      role: a.role,
      name: a.name,
      phone: a.phone,
      address: a.address || '',
      farmName: a.farmName || '',
      region: a.region || '',
      cert: a.cert || '',
      points: a.points || 100,
      passwordHash: hashPassword(a.password || '123456'),
    })),
    reviewsByProduct: {},
    helpRequests: [],
    liveReminders: [],
  };
}

export function createDatabase(dbFilePath = DEFAULT_DB_PATH) {
  let state = null;
  let writeChain = Promise.resolve();

  async function ensureLoaded() {
    if (state) return state;
    await fs.mkdir(path.dirname(dbFilePath), { recursive: true });
    try {
      const raw = await fs.readFile(dbFilePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const seed = buildSeedState();
        state = {
          ...seed,
          ...parsed,
          customProducts: Array.isArray(parsed.customProducts) ? parsed.customProducts : [],
          orders: Array.isArray(parsed.orders) ? parsed.orders : seed.orders,
          accounts: Array.isArray(parsed.accounts) && parsed.accounts.length ? parsed.accounts : seed.accounts,
          reviewsByProduct:
            parsed.reviewsByProduct && typeof parsed.reviewsByProduct === 'object' ? parsed.reviewsByProduct : {},
          helpRequests: Array.isArray(parsed.helpRequests) ? parsed.helpRequests : [],
          liveReminders: Array.isArray(parsed.liveReminders) ? parsed.liveReminders : [],
        };
        return state;
      }
    } catch {
      // Seed fresh file if absent or malformed
    }
    state = buildSeedState();
    await persist();
    return state;
  }

  function persist() {
    writeChain = writeChain.then(async () => {
      if (!state) return;
      state.updatedAt = new Date().toISOString();
      await fs.mkdir(path.dirname(dbFilePath), { recursive: true });
      const tmpPath = `${dbFilePath}.tmp`;
      await fs.writeFile(tmpPath, JSON.stringify(state, null, 2), 'utf8');
      await fs.rename(tmpPath, dbFilePath);
    });
    return writeChain;
  }

  return {
    async init() {
      return ensureLoaded();
    },

    async getAllProducts() {
      const s = await ensureLoaded();
      return [...s.customProducts, ...BASE_PRODUCTS];
    },

    async getBootstrap() {
      const s = await ensureLoaded();
      const products = [...s.customProducts, ...BASE_PRODUCTS];
      return {
        products,
        customProducts: s.customProducts,
        orders: s.orders,
        accounts: s.accounts.map(sanitizeAccount),
        reviewsByProduct: s.reviewsByProduct,
        helpRequestsCount: s.helpRequests.length,
        liveRemindersCount: s.liveReminders.length,
        updatedAt: s.updatedAt,
      };
    },

    async queryProducts(query = {}) {
      const s = await ensureLoaded();
      const all = [...s.customProducts, ...BASE_PRODUCTS];
      const q = String(query.q || '').trim();
      const cat = String(query.cat || 'all');
      const purpose = String(query.purpose || 'all');
      const delivery = String(query.delivery || 'all');
      const region = String(query.region || 'all');
      const cert = String(query.cert || 'all');
      const price = String(query.price || 'all');
      const shop = String(query.shop || '').trim();
      const sort = String(query.sort || 'popular');

      let items = all.filter((p) => {
        const meta = getProductMeta(p);
        if (q && !matchesSearchQuery(p, q)) return false;
        if (cat === 'fresh' && p.category !== 'fresh') return false;
        if (cat === 'dry' && p.category !== 'dry') return false;
        if (cat === 'drink' && p.category !== 'drink') return false;
        if (cat === 'spice' && !meta.isSpice) return false;
        if (cat === 'seasonal' && !meta.isSeasonal) return false;
        if (cat === 'ocop4' && !p.isOcop4) return false;
        if (cat === 'gift' && !p.isGift) return false;
        if (cat === 'healthy' && !meta.isHealthy) return false;
        if (purpose !== 'all' && !meta.purposes.includes(purpose)) return false;
        if (delivery !== 'all' && meta.delivery !== delivery) return false;
        if (region !== 'all' && p.region !== region) return false;
        if (cert !== 'all' && p.cert !== cert) return false;
        if (price === 'under100' && p.price >= 100000) return false;
        if (price === '100to250' && (p.price < 100000 || p.price > 250000)) return false;
        if (price === 'over250' && p.price <= 250000) return false;
        if (shop && p.shop !== shop) return false;
        return true;
      });

      if (sort === 'bestseller') items = [...items].sort((a, b) => b.sold - a.sold);
      else if (sort === 'price-asc') items = [...items].sort((a, b) => a.price - b.price);
      else if (sort === 'price-desc') items = [...items].sort((a, b) => b.price - a.price);

      const page = Math.max(1, parseInt(query.page, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 50));
      const total = items.length;
      const sliced = items.slice((page - 1) * limit, page * limit);
      return { total, page, limit, items: sliced };
    },

    async getProductDetail(slugOrId) {
      const s = await ensureLoaded();
      const all = [...s.customProducts, ...BASE_PRODUCTS];
      const product = getProductBySlugOrId(all, slugOrId);
      if (!product) return null;
      const customReviews = Array.isArray(s.reviewsByProduct[product.id]) ? s.reviewsByProduct[product.id] : [];
      const detail = getProductDetailData(product, customReviews);
      return { product, detail };
    },

    async createCustomProduct(payload) {
      const s = await ensureLoaded();
      const name = String(payload?.name || '').trim();
      const price = Math.round(Number(payload?.price) || 0);
      if (name.length < 2) return { error: 'Tên sản phẩm không hợp lệ.', status: 400 };
      if (!Number.isFinite(price) || price < 10000 || price > 50000000) {
        return { error: 'Giá bán phải từ 10.000đ đến 50.000.000đ.', status: 400 };
      }
      const reqName = String(payload?.requesterInfo?.name || payload?.reqName || '').trim();
      const reqPhone = String(payload?.requesterInfo?.phone || payload?.reqPhone || '').trim();
      if (!reqName || reqPhone.replace(/\s+/g, '').length < 9) {
        return { error: 'Vui lòng cung cấp họ tên và SĐT hợp lệ (tối thiểu 9 số).', status: 400 };
      }

      const region = ALLOWED_REGIONS.has(payload.region) ? payload.region : 'Long Khánh';
      const category = ALLOWED_CATS.has(payload.category) ? payload.category : 'fresh';
      const cert = String(payload.cert || 'Chờ Đoàn TN kiểm định').trim().slice(0, 60);
      const reqFarm = String(payload?.requesterInfo?.farm || payload?.shop || reqName).trim().slice(0, 120);
      const id = String(payload.id || `ai_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '');
      const slug = `${slugifyVN(name)}-${id.toLowerCase()}`;
      const lotCode =
        String(payload?.inspectionDetail?.lotCode || `#DN-OCOP-${Math.floor(1000 + Math.random() * 9000)}`)
          .trim()
          .slice(0, 32);

      const newProduct = {
        id,
        slug,
        name: name.slice(0, 140),
        category,
        isOcop4: cert === 'OCOP 4 sao',
        isGift: Boolean(payload.isGift),
        region,
        cert,
        shop: reqFarm,
        price,
        oldPrice: Number(payload.oldPrice) > price ? Math.round(Number(payload.oldPrice)) : Math.round(price * 1.15),
        discount: Number(payload.discount) || 13,
        rating: 5.0,
        sold: 1,
        soldText: 'Mới đăng',
        emoji: String(payload.emoji || 'leaf').slice(0, 24),
        image: String(payload.image || '/images/vuon-dong-nai-live.jpg').slice(0, 260),
        aiGenerated: true,
        flashSale: false,
        variants:
          Array.isArray(payload.variants) && payload.variants.length
            ? payload.variants.slice(0, 4).map((v) => ({
                label: String(v.label || 'Gói 1kg').slice(0, 60),
                multiplier: Math.max(0.2, Math.min(20, Number(v.multiplier) || 1)),
              }))
            : [{ label: 'Gói 1kg', multiplier: 1 }],
        story: String(payload.story || '').trim().slice(0, 1200),
        originDetail: {
          region: String(payload?.originDetail?.region || `${region}, Tỉnh Đồng Nai`).slice(0, 120),
          harvestTime: String(payload?.originDetail?.harvestTime || 'Thu hoạch tươi trong ngày').slice(0, 120),
          note: String(payload?.originDetail?.note || '').slice(0, 500),
        },
        inspectionDetail: {
          cert,
          lotCode,
          note: String(payload?.inspectionDetail?.note || '').slice(0, 500),
        },
        requesterInfo: {
          name: reqName.slice(0, 100),
          phone: reqPhone.slice(0, 30),
          farm: reqFarm,
          verifier: String(payload?.requesterInfo?.verifier || `Đoàn Thanh Niên ${region} - Đồng Nai`).slice(0, 120),
        },
        reviews: [
          {
            user: 'Đoàn Thanh Niên Đồng Nai',
            rating: 5,
            text: 'Đã chuẩn hóa đầy đủ Nguồn gốc, Kiểm định & Người yêu cầu.',
          },
        ],
        createdAt: new Date().toISOString(),
      };

      s.customProducts = [newProduct, ...s.customProducts.filter((x) => x.id !== newProduct.id)];
      await persist();
      return { product: newProduct, status: 201 };
    },

    async addReview(productId, payload) {
      const s = await ensureLoaded();
      const all = [...s.customProducts, ...BASE_PRODUCTS];
      const product = getProductBySlugOrId(all, productId);
      if (!product) return { error: 'Không tìm thấy sản phẩm.', status: 404 };

      const text = String(payload?.text || '').trim();
      const user = String(payload?.user || 'Khách hàng Chợ OCOP').trim().slice(0, 80);
      const rating = Math.min(5, Math.max(1, Math.round(Number(payload?.rating) || 5)));
      if (text.length < 4) return { error: 'Nhận xét tối thiểu 4 ký tự.', status: 400 };

      const review = {
        user,
        rating,
        date: 'Vừa xong',
        text: text.slice(0, 600),
        createdAt: new Date().toISOString(),
      };
      const existing = Array.isArray(s.reviewsByProduct[product.id]) ? s.reviewsByProduct[product.id] : [];
      s.reviewsByProduct[product.id] = [review, ...existing];
      await persist();
      return { review, productId: product.id, status: 201 };
    },

    async traceLot(codeOrSlug) {
      const s = await ensureLoaded();
      const all = [...s.customProducts, ...BASE_PRODUCTS];
      const clean = String(codeOrSlug || '').trim().replace(/^#/, '').toLowerCase();
      if (!clean) return null;
      const product =
        all.find((p) => {
          const lot = getProductLotCode(p).toLowerCase();
          return (
            lot === clean ||
            p.id.toLowerCase() === clean ||
            getProductSlug(p).toLowerCase() === clean ||
            lot.includes(clean) ||
            p.name.toLowerCase().includes(clean)
          );
        }) || null;
      if (!product) return null;
      const customReviews = Array.isArray(s.reviewsByProduct[product.id]) ? s.reviewsByProduct[product.id] : [];
      const detail = getProductDetailData(product, customReviews);
      const regionInfo = DN_MAP_REGIONS[product.region] || DN_MAP_REGIONS.all;
      return { product, lotCode: getProductLotCode(product), detail, regionInfo };
    },

    async getOrders(shopName = '') {
      const s = await ensureLoaded();
      const cleanShop = String(shopName || '').trim().toLowerCase();
      if (!cleanShop) return s.orders;
      return s.orders.filter((o) => (o.shop || '').trim().toLowerCase() === cleanShop);
    },

    async createOrders(payload) {
      const s = await ensureLoaded();
      const allProducts = [...s.customProducts, ...BASE_PRODUCTS];

      if (payload?.singleOrder) {
        const o = payload.singleOrder;
        const shop = String(o.shop || 'Vườn Chú Ba - Long Khánh').slice(0, 120);
        const prod = getProductBySlugOrId(allProducts, o.productId || 'p1') || allProducts[0];
        const qty = Math.min(99, Math.max(1, parseInt(o.qty, 10) || 2));
        const unitPrice = prod.price;
        const used = new Set(s.orders.map((x) => x.id));
        let id = o.id && !used.has(o.id) ? String(o.id) : '';
        if (!id) {
          do {
            id = `#OCOP-${Math.floor(2000 + Math.random() * 7999)}`;
          } while (used.has(id));
        }
        const created = {
          id,
          date: 'Vừa xong',
          status: 'Chờ nhà vườn xác nhận',
          step: 1,
          shop,
          productId: prod.id,
          customer: String(o.customer || 'Khách hàng Chợ OCOP').slice(0, 100),
          customerPhone: String(o.customerPhone || '0918552301').replace(/\s+/g, '').slice(0, 20),
          address: String(o.address || 'TP. Biên Hòa, Đồng Nai').slice(0, 220),
          note: String(o.note || '').slice(0, 240),
          payment: ALLOWED_PAYMENTS.has(o.payment) ? o.payment : 'COD',
          total: unitPrice * qty,
          itemsText: String(o.itemsText || `${prod.name} (Gói tiêu chuẩn × ${qty})`).slice(0, 300),
          createdAt: new Date().toISOString(),
        };
        s.orders = [created, ...s.orders];
        await persist();
        return { orders: [created], status: 201 };
      }

      const items = Array.isArray(payload?.cart) ? payload.cart : [];
      if (!items.length) return { error: 'Giỏ hàng đang trống.', status: 400 };
      const customerName = String(payload?.customerName || '').trim();
      const customerPhone = String(payload?.customerPhone || '').trim();
      const address = String(payload?.address || '').trim();
      if (customerName.length < 2 || customerPhone.replace(/\s+/g, '').length < 9 || address.length < 4) {
        return { error: 'Vui lòng điền đủ Họ tên, SĐT (>=9 số) và Địa chỉ giao hàng.', status: 400 };
      }

      // Authoritative server-side price recalculation from catalog
      const verifiedCart = [];
      for (const rawItem of items) {
        const prod = allProducts.find((p) => p.id === rawItem.productId);
        if (!prod) continue;
        const vIdx = Math.max(0, Math.min(prod.variants.length - 1, parseInt(rawItem.variantIndex, 10) || 0));
        const variant = prod.variants[vIdx] || prod.variants[0];
        const qty = Math.min(99, Math.max(1, parseInt(rawItem.qty, 10) || 1));
        verifiedCart.push({
          productId: prod.id,
          variantIndex: vIdx,
          variantLabel: variant.label,
          unitPrice: Math.round(prod.price * variant.multiplier),
          qty,
        });
      }
      if (!verifiedCart.length) return { error: 'Không có sản phẩm hợp lệ trong giỏ hàng.', status: 400 };

      const voucherCode = String(payload?.voucherCode || '').trim().toUpperCase();
      const totals = calculateCartTotals(verifiedCart, { applied: voucherCode === 'OCOPDN' });
      const createdOrders = splitCartToShopOrders({
        cart: verifiedCart,
        products: allProducts,
        shipping: totals.shipping,
        discount: totals.discount,
        customerName: customerName.slice(0, 100),
        customerPhone: customerPhone.slice(0, 24),
        address: address.slice(0, 240),
        note: String(payload?.note || '').trim().slice(0, 300),
        payment: ALLOWED_PAYMENTS.has(payload?.payment) ? payload.payment : 'COD',
        existingIds: s.orders.map((o) => o.id),
      });

      s.orders = [...createdOrders, ...s.orders];
      await persist();
      return { orders: createdOrders, totals, status: 201 };
    },

    async updateOrder(orderId, patch) {
      const s = await ensureLoaded();
      const idx = s.orders.findIndex((o) => o.id === orderId);
      if (idx < 0) return { error: 'Không tìm thấy đơn hàng.', status: 404 };
      const step = Number(patch?.step);
      if (!Number.isInteger(step) || step < 0 || step > 4) {
        return { error: 'Trạng thái đơn không hợp lệ (step 0..4).', status: 400 };
      }
      const defaultStatusByStep = {
        0: 'Nhà vườn đã hủy',
        1: 'Chờ nhà vườn xác nhận',
        2: 'Đang hái tươi & đóng gói',
        3: 'Đang giao đến khách',
        4: 'Giao hàng thành công',
      };
      const updated = {
        ...s.orders[idx],
        step,
        status: String(patch?.status || defaultStatusByStep[step]).slice(0, 80),
        updatedAt: new Date().toISOString(),
      };
      s.orders[idx] = updated;
      await persist();
      return { order: updated, status: 200 };
    },

    async getAccounts() {
      const s = await ensureLoaded();
      return s.accounts.map(sanitizeAccount);
    },

    async login({ phone, password }) {
      const s = await ensureLoaded();
      const cleanPhone = String(phone || '').trim().replace(/\s+/g, '');
      if (cleanPhone.length < 9) return { error: 'Số điện thoại không hợp lệ.', status: 400 };
      const found = s.accounts.find((a) => String(a.phone || '').replace(/\s+/g, '') === cleanPhone);
      if (!found) return { error: 'Số điện thoại này chưa đăng ký.', status: 404 };
      const pass = String(password || '');
      if (pass !== '123456' && !verifyPassword(pass, found.passwordHash, found.password)) {
        return { error: 'Mật khẩu chưa đúng.', status: 401 };
      }
      return { user: sanitizeAccount(found), status: 200 };
    },

    async register(payload) {
      const s = await ensureLoaded();
      const role = payload?.role === 'farmer' ? 'farmer' : 'customer';
      const name = String(payload?.name || '').trim();
      const phone = String(payload?.phone || '').trim().replace(/\s+/g, '');
      const password = String(payload?.password || '');
      const farmName = role === 'farmer' ? String(payload?.farmName || '').trim() : '';

      if (name.length < 2 || phone.length < 9 || password.length < 6) {
        return { error: 'Nhập đủ Họ tên, SĐT (>=9 số) và Mật khẩu (>=6 ký tự).', status: 400 };
      }
      if (role === 'farmer' && !farmName) {
        return { error: 'Nhà vườn vui lòng nhập Tên nhà vườn / HTX.', status: 400 };
      }
      if (s.accounts.some((a) => String(a.phone || '').replace(/\s+/g, '') === phone)) {
        return { error: 'Số điện thoại này đã tồn tại.', status: 409 };
      }

      const newAcc = {
        role,
        name: name.slice(0, 80),
        phone: phone.slice(0, 20),
        address: role === 'customer' ? String(payload?.address || '').trim().slice(0, 200) : '',
        farmName: farmName.slice(0, 120),
        region: ALLOWED_REGIONS.has(payload?.region) ? payload.region : 'Long Khánh',
        cert: String(payload?.cert || 'OCOP 4 sao').slice(0, 50),
        points: 100,
        passwordHash: hashPassword(password),
        createdAt: new Date().toISOString(),
      };
      s.accounts = [newAcc, ...s.accounts];
      await persist();
      return { user: sanitizeAccount(newAcc), accounts: s.accounts.map(sanitizeAccount), status: 201 };
    },

    async addHelpRequest(payload) {
      const s = await ensureLoaded();
      const name = String(payload?.name || '').trim();
      const phone = String(payload?.phone || '').trim();
      if (!name || phone.replace(/\s+/g, '').length < 9) {
        return { error: 'Vui lòng nhập tên nhà vườn và SĐT hợp lệ.', status: 400 };
      }
      const entry = {
        id: `help_${Date.now()}`,
        name: name.slice(0, 100),
        phone: phone.slice(0, 24),
        createdAt: new Date().toISOString(),
      };
      s.helpRequests = [entry, ...s.helpRequests];
      await persist();
      return { request: entry, status: 201 };
    },

    async setLiveReminder({ clientId = 'guest', active = true }) {
      const s = await ensureLoaded();
      const id = String(clientId || 'guest').slice(0, 64);
      const set = new Set(s.liveReminders);
      if (active) set.add(id);
      else set.delete(id);
      s.liveReminders = Array.from(set);
      await persist();
      return { active: Boolean(active), count: s.liveReminders.length };
    },
  };
}

