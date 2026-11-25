import {
  AI_LISTING_CATALOG,
  PRODUCT_CONCLUSIONS,
  PRODUCT_HIGHLIGHTS,
  PRODUCT_SLUGS,
  REGION_HUB_BY_SLUG,
  REGION_SLUG_BY_NAME,
} from '../data/catalog.js';

export function formatVND(num) {
  return Math.round(Number(num) || 0).toLocaleString('vi-VN') + 'đ';
}

export function slugifyVN(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getProductLotCode(p) {
  if (p && p.inspectionDetail && p.inspectionDetail.lotCode) {
    return p.inspectionDetail.lotCode.replace(/^#/, '').trim().toUpperCase();
  }
  return `DN-OCOP-${String(p.id).toUpperCase()}`;
}

export function getProductSlug(p) {
  if (!p) return '';
  if (p.slug) return p.slug;
  if (PRODUCT_SLUGS[p.id]) return PRODUCT_SLUGS[p.id];
  return `${slugifyVN(p.name)}-${p.id}`;
}

export function getProductUrl(p) {
  return `/san-pham/${encodeURIComponent(getProductSlug(p))}`;
}

export function normalizeTextVN(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase();
}

export function matchesSearchQuery(product, query) {
  const clean = String(query || '').trim();
  if (!clean) return true;
  const meta = getProductMeta(product);
  const hayRaw = `${product.name} ${product.region} ${product.shop} ${product.cert} ${meta.highlight}`.toLowerCase();
  const hayNorm = normalizeTextVN(hayRaw);
  const lower = clean.toLowerCase();
  if (hayRaw.includes(lower)) return true;
  const tokens = normalizeTextVN(lower).split(/\s+/).filter(Boolean);
  return tokens.length > 0 && tokens.every((tok) => hayNorm.includes(tok));
}

export function getProductBySlugOrId(products, slugOrId) {
  const q = String(slugOrId || '').trim().toLowerCase();
  if (!q) return products.find((p) => p.id === 'p2') || products[0] || null;
  return (
    products.find((p) => p.id.toLowerCase() === q || getProductSlug(p).toLowerCase() === q) ||
    products.find((p) => getProductSlug(p).toLowerCase().includes(q)) ||
    null
  );
}

export function getProductMeta(p) {
  if (PRODUCT_HIGHLIGHTS[p.id]) return PRODUCT_HIGHLIGHTS[p.id];
  const isFresh = p.category === 'fresh';
  const isSpice = /tiêu|ớt|muối|gia vị/i.test(p.name);
  const isHealthy = p.category === 'drink' || /mật ong|hạt điều|bơ|bưởi|ca cao/i.test(p.name);
  const purposes = ['daily'];
  if (isFresh) purposes.push('seasonal');
  if (p.isGift) purposes.push('gift');
  if (isHealthy) purposes.push('healthy');
  return {
    isSeasonal: isFresh,
    isHealthy,
    isSpice,
    delivery: isFresh ? 'same_day' : 'nationwide',
    purposes,
    highlightIcon: p.aiGenerated ? 'sparkles' : isFresh ? 'leaf' : 'package',
    highlight: p.aiGenerated
      ? `Chuẩn hóa AI • ${isFresh ? 'Hái tươi tại vườn' : 'Đặc sản nguyên chất'}`
      : isFresh
        ? 'Thu hoạch tươi trong ngày'
        : 'Đóng gói chuẩn giao toàn quốc',
  };
}

export function getProductSummary(p) {
  if (PRODUCT_CONCLUSIONS[p.id]) return PRODUCT_CONCLUSIONS[p.id];
  const meta = getProductMeta(p);
  return {
    verdict: `Nông sản ${p.cert} trực tiếp từ ${p.shop} (${p.region}) — ${meta.highlight}.`,
    bullets: [
      `Điểm nổi bật: ${p.story.slice(0, 100)}${p.story.length > 100 ? '…' : ''}`,
      `Nguồn gốc: Canh tác & thu hoạch trực tiếp tại ${p.region}, Đồng Nai.`,
      `Giao nhận: ${meta.delivery === 'same_day' ? 'Hái sáng giao chiều trong ngày.' : 'Đóng gói kỹ, giao toàn quốc.'}`,
    ],
    stock: 60,
    reviewCount: (p.reviews || []).length + 24,
    shelfLife: p.category === 'fresh' ? '4–7 ngày ngăn mát' : '6–12 tháng kể từ NSX',
  };
}

export function getProductDetailData(p, customReviews = []) {
  const meta = getProductMeta(p);
  const lot = getProductLotCode(p);
  const catNames = { fresh: 'Trái cây tươi', dry: 'Đặc sản khô & Hạt', drink: 'Đồ uống & Mật ong' };
  const baseConc = getProductSummary(p);

  const isFresh = p.category === 'fresh';
  const hashSeed = String(p.id).replace(/[^a-z0-9]/gi, '').padEnd(4, '7');
  const blockchainHash = `0x7a4e${hashSeed}9b2c1d8f0e3a5c6b`;
  const today = new Date();
  const fmtDate = (d) =>
    `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  const minusDays = (n) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return fmtDate(d);
  };

  const certs = [p.cert];
  if (p.cert !== 'VietGAP') certs.push('VietGAP');
  certs.push('Xác thực Đoàn TN');

  const trace = {
    traceCode: lot,
    batchCode: `LOT-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}-${String(p.id).toUpperCase()}`,
    originRegion: p.originDetail ? p.originDetail.region : `${p.region}, Đồng Nai`,
    productionDate: minusDays(isFresh ? 0 : 3),
    expiryDate: baseConc.shelfLife,
    certifications: certs,
    blockchainHash,
    verifier: p.requesterInfo ? p.requesterInfo.verifier : `Đoàn Thanh Niên ${p.region}`,
    events: [
      {
        step: 1,
        icon: 'sprout',
        title: 'Thu hoạch tại vườn',
        desc: p.originDetail
          ? `${p.originDetail.harvestTime} tại ${p.shop}.`
          : `Thu hoạch đúng độ chín tự nhiên tại ${p.shop} (${p.region}).`,
        date: minusDays(isFresh ? 1 : 6),
      },
      {
        step: 2,
        icon: 'factory',
        title: isFresh ? 'Tuyển chọn & Làm sạch' : 'Sơ chế & Chế biến thủ công',
        desc: isFresh
          ? 'Phân loại trái loại 1 đồng đều kích cỡ, loại bỏ trái sâu dập.'
          : 'Sơ chế đảm bảo vệ sinh ATTP, giữ trọn hương vị nguyên bản không phụ gia.',
        date: minusDays(isFresh ? 1 : 5),
      },
      {
        step: 3,
        icon: 'microscope',
        title: 'Kiểm định chất lượng',
        desc: `Đạt chuẩn ${p.cert}, kiểm tra cảm quan & độ an toàn bởi Đoàn Thanh Niên ${p.region}.`,
        date: minusDays(isFresh ? 0 : 4),
      },
      {
        step: 4,
        icon: 'package',
        title: 'Đóng gói & Dán tem QR',
        desc: `Đóng gói chống sốc chuyên dụng, dán tem truy xuất nguồn gốc #${lot}.`,
        date: minusDays(isFresh ? 0 : 3),
      },
      {
        step: 5,
        icon: 'truck',
        title: 'Xuất kho giao đến tay khách',
        desc:
          meta.delivery === 'same_day'
            ? 'Giao hỏa tốc trong 2h nội tỉnh Đồng Nai, đảm bảo tươi ngon.'
            : 'Bàn giao vận chuyển nhanh toàn quốc, kiểm tra trước khi nhận.',
        date: fmtDate(today),
      },
    ],
  };

  const baseReviews = (p.reviews || []).map((r, i) => ({
    user: r.user,
    rating: r.rating || 5,
    date: r.date || (i === 0 ? '2 ngày trước' : '5 ngày trước'),
    text: r.text,
  }));
  const reviews = [...customReviews, ...baseReviews];

  return {
    slug: getProductSlug(p),
    categoryName: catNames[p.category] || 'Đặc sản OCOP',
    verdict: baseConc.verdict,
    bullets: baseConc.bullets,
    stock: baseConc.stock,
    reviewCount: baseConc.reviewCount + Math.max(0, reviews.length - (p.reviews || []).length),
    ratingBars: [
      { stars: 5, pct: 84 },
      { stars: 4, pct: 12 },
      { stars: 3, pct: 3 },
      { stars: 2, pct: 1 },
      { stars: 1, pct: 0 },
    ],
    trace,
    reviews,
    meta,
  };
}

export function calculateCartTotals(cart, voucher) {
  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
  const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
  const shipping = subtotal === 0 ? 0 : subtotal >= 300000 ? 0 : 30000;
  const discount = voucher?.applied && subtotal >= 150000 ? 20000 : 0;
  const total = Math.max(0, subtotal + shipping - discount);
  return { subtotal, totalQty, shipping, discount, total, voucher };
}

export function getOrdersForShop(orders, shopName) {
  const target = (shopName || '').trim().toLowerCase();
  if (!target) return [];
  return orders.filter((o) => (o.shop || '').trim().toLowerCase() === target);
}

export function splitCartToShopOrders({ cart, products, shipping, discount, customerName, customerPhone, address, note, payment, existingIds = [] }) {
  const byShop = new Map();
  cart.forEach((c) => {
    const p = products.find((x) => x.id === c.productId);
    const shop = p ? p.shop : 'Vườn Chú Ba - Long Khánh';
    if (!byShop.has(shop)) byShop.set(shop, []);
    byShop.get(shop).push({ item: c, product: p });
  });

  const usedIds = new Set(existingIds);
  const nextOrderId = () => {
    let candidate = '';
    do {
      candidate = '#OCOP-' + Math.floor(1000 + Math.random() * 9000);
    } while (usedIds.has(candidate));
    usedIds.add(candidate);
    return candidate;
  };

  const created = [];
  let remainingDiscount = discount;
  let isFirstShop = true;

  byShop.forEach((entries, shopName) => {
    const shopSub = entries.reduce((s, e) => s + e.item.unitPrice * e.item.qty, 0);
    const shopShipping = isFirstShop ? shipping : 0;
    isFirstShop = false;
    const gross = shopSub + shopShipping;
    const appliedDiscount = Math.min(gross, remainingDiscount);
    remainingDiscount -= appliedDiscount;
    const shopTotal = Math.max(0, gross - appliedDiscount);
    const itemsText = entries
      .map((e) => `${e.product ? e.product.name : 'Nông sản'} (${e.item.variantLabel} × ${e.item.qty})`)
      .join(', ');

    created.push({
      id: nextOrderId(),
      date: 'Vừa xong',
      status: 'Chờ nhà vườn xác nhận',
      step: 1,
      shop: shopName,
      productId: entries[0].item.productId,
      customer: `${customerName} (${customerPhone})`,
      customerPhone: customerPhone.replace(/\s+/g, ''),
      address,
      note,
      payment,
      total: shopTotal,
      itemsText,
    });
  });

  return created;
}

export function cleanVoiceQuery(raw) {
  return (raw || '')
    .trim()
    .replace(/^(tôi muốn mua|cho tôi mua|cho tôi xem|tìm kiếm|tìm giúp|tìm|mua|xem|bán)\s+/i, '')
    .replace(/[.?!,]+$/g, '')
    .trim();
}

export function generateTraceHash(str) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  const hex = (Math.abs(h1).toString(16).padStart(8, '0') + Math.abs(h2).toString(16).padStart(8, '0')).toUpperCase();
  return `0x${hex.slice(0, 6)}...${hex.slice(-6)}`;
}

export function buildQrCells(code) {
  const size = 21;
  const cell = 5;
  const pad = 10;
  const dim = size * cell + pad * 2;
  let hash = 2166136261;
  for (let i = 0; i < code.length; i++) {
    hash ^= code.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const isFinder = (r, c) => (r < 7 && c < 7) || (r < 7 && c >= size - 7) || (r >= size - 7 && c < 7);
  const isFinderFilled = (r, c) => {
    const lr = r >= size - 7 ? r - (size - 7) : r;
    const lc = c >= size - 7 ? c - (size - 7) : c;
    return lr === 0 || lr === 6 || lc === 0 || lc === 6 || (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4);
  };
  const cells = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const filled = isFinder(r, c)
        ? isFinderFilled(r, c)
        : r === 6 || c === 6
          ? (r + c) % 2 === 0
          : ((Math.imul(hash ^ (r * 31 + c * 17), 2246822519) >>> 0) % 100) < 47;
      if (filled) {
        cells.push({ x: pad + c * cell, y: pad + r * cell, width: cell, height: cell });
      }
    }
  }
  return { dim, cells };
}

const toTitleVN = (s) =>
  s
    .trim()
    .split(/\s+/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ''))
    .join(' ');

export function parseAiListing(raw, user) {
  const text = raw.trim();
  const lower = text.toLowerCase();
  const item = AI_LISTING_CATALOG.find((c) => c.kw.some((k) => lower.includes(k)));
  const regions = ['Long Khánh', 'Tân Triều', 'Bình Long', 'Xuân Lộc', 'Định Quán'];
  const region = regions.find((r) => lower.includes(r.toLowerCase())) || (user && user.region) || 'Long Khánh';

  let price = 65000;
  const km = lower.match(/(\d+(?:[.,]\d+)?)\s*(k|nghìn|ngàn|nghin|ngan)\b/i);
  const fm = lower.match(/(\d{2,3}[.,]\d{3})/);
  const rawPriceM = lower.match(/\b(\d{5,7})\s*(?:đ|vnd|đồng)?\b/i);
  if (km) price = Math.round(parseFloat(km[1].replace(',', '.')) * 1000);
  else if (fm) price = parseInt(fm[1].replace(/[.,]/g, ''), 10);
  else if (rawPriceM) price = parseInt(rawPriceM[1], 10);

  let unit = item ? item.unit : 'Gói 1kg';
  if (/500\s*ml/i.test(lower)) unit = 'Chai thủy tinh 500ml';
  else if (/trái|quả/i.test(lower)) unit = '1 Trái tuyển chọn';

  let cert = 'Chờ Đoàn TN kiểm định';
  if (/ocop\s*4|4\s*sao/i.test(lower)) cert = 'OCOP 4 sao';
  else if (/ocop\s*3|3\s*sao/i.test(lower)) cert = 'OCOP 3 sao';
  else if (/vietgap|hữu cơ/i.test(lower)) cert = 'VietGAP';

  const phoneM = text.match(/(0\d{2,3}[\s.-]?\d{3}[\s.-]?\d{3,4})/);
  const reqPhone = phoneM
    ? phoneM[1].replace(/[^\d]/g, '').replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3')
    : (user && user.phone) || '0987 654 321';
  const personM = text.match(/(chú|cô|bác|anh|chị)\s+([A-ZÀ-Ỹ][a-zà-ỹ]+(?:\s+[A-ZÀ-Ỹ][a-zà-ỹ]+)?)/i);
  const farmM = text.match(/(vườn|htx|hợp tác xã|trại ong|cơ sở)\s+([^\d,.;]+?)(?=\s+(?:ở|tại|bán|vừa|mới|thu hoạch|giá|chuyên|có)\b|[,.;\d]|$)/i);

  const reqName = personM ? toTitleVN(personM[0]) : (user && user.name) || `Đại diện Nhà vườn ${region}`;
  const rawFarm = farmM ? `${farmM[1]} ${farmM[2]}`.trim() : '';
  const reqFarm = rawFarm ? rawFarm.charAt(0).toUpperCase() + rawFarm.slice(1) : (user && user.farmName) || `Nhà vườn ${reqName} - ${region}`;

  const name = item
    ? item.name.toLowerCase().includes(region.toLowerCase())
      ? item.name
      : `${item.name} ${region}`
    : `Nông Sản Sạch ${region} Tuyển Chọn`;
  const harvest = /sáng nay|hôm nay|mới hái|vừa quay/i.test(lower)
    ? 'Hái / thu hoạch mới trong ngày hôm nay'
    : 'Thu hoạch tươi theo đơn đặt hàng';
  const lot = `#DN-OCOP-${Math.floor(1000 + Math.random() * 9000)}`;

  return {
    name,
    price,
    unit,
    cat: item ? item.cat : 'fresh',
    emoji: item ? item.emoji : 'leaf',
    img: item ? item.img : '/images/vuon-dong-nai-live.jpg',
    desc: `${name} do ${reqFarm} trực tiếp canh tác và thu hoạch. Đặc trưng: ${item ? item.taste : 'tươi ngon tự nhiên tại vườn Đồng Nai'}. Đóng gói cẩn thận, giao nhanh giữ trọn độ tươi ngon.`,
    region,
    harvest,
    origin: `Trồng và thu hoạch trực tiếp tại vùng chuyên canh ${region}, Tỉnh Đồng Nai bởi ${reqFarm}. Nhật ký vườn minh bạch, không chất bảo quản.`,
    cert,
    lot,
    inspection:
      cert === 'Chờ Đoàn TN kiểm định'
        ? `Hồ sơ đã chuyển Đoàn Thanh Niên khu vực ${region} ghé vườn xác thực chất lượng và cấp tem QR trong 24h.`
        : `Đạt tiêu chuẩn ${cert} tại Đồng Nai, được Đoàn Thanh Niên khu vực ${region} kiểm duyệt cảm quan & xác thực tại vườn.`,
    reqName,
    reqPhone,
    reqFarm,
    verifier: `Đoàn Thanh Niên ${region} - Đồng Nai`,
  };
}

export function getRegionHubBySlugOrName(slugOrName) {
  const s = String(slugOrName || '').trim().toLowerCase();
  if (!s) return null;
  if (REGION_HUB_BY_SLUG[s]) return REGION_HUB_BY_SLUG[s];
  const matchedEntry = Object.entries(REGION_SLUG_BY_NAME).find(
    ([name]) => name.toLowerCase() === s || normalizeTextVN(name) === normalizeTextVN(s)
  );
  return matchedEntry ? REGION_HUB_BY_SLUG[matchedEntry[1]] : null;
}

export function buildSimulatedAiResponse({ rawQuery, products, orders, user, onApplyVoucher }) {
  const q = (rawQuery || '').trim();
  const lower = q.toLowerCase();

  if (/đơn hàng|đơn vườn|quản lý đơn|doanh thu/.test(lower)) {
    const farm = (user && user.farmName) || 'Vườn Chú Ba - Long Khánh';
    const mine = getOrdersForShop(orders, farm);
    const pending = mine.filter((o) => o.step === 1).length;
    return {
      text: `Kết luận nhanh cho ${farm}: hiện có ${mine.length} đơn hàng (${pending} đơn chờ xác nhận). Bạn bấm nút bên dưới để duyệt hái tươi & cập nhật giao hàng ngay nhé!`,
      products: [],
      action: { href: '/quan-ly-don', icon: 'package', label: 'Mở trang Quản lý đơn vườn →' },
    };
  }

  if (/đăng bán|bán nông sản|nhà nông đăng/.test(lower)) {
    return {
      text: 'Nhà vườn chỉ cần nói hoặc nhập vài dòng về nông sản (tên, giá, vùng trồng), Trợ lý AI sẽ tự tạo mô tả, Nguồn gốc, Kiểm định, mã lô QR và chọn sẵn ảnh minh họa phù hợp!',
      products: [],
      action: { href: '/dang-ban-ai', icon: 'sparkles', label: 'Mở công cụ Đăng bán AI →' },
    };
  }

  if (/truy xuất|mã qr|nguồn gốc|kiểm định/.test(lower)) {
    return {
      text: 'Mỗi lô nông sản trên Chợ OCOP đều có tem QR xác thực 5 bước từ lúc thu hoạch đến khi giao khách. Bạn có thể nhập mã lô (VD: DN-OCOP-P2) để kiểm tra ngay:',
      products: [],
      action: { href: '/truy-xuat?code=DN-OCOP-P2', icon: 'shield-check', label: 'Mở Hộ chiếu Truy xuất QR →' },
    };
  }

  if (/giảm giá|voucher|khuyến mãi|ocopdn|freeship/.test(lower)) {
    onApplyVoucher?.();
    return {
      text: 'Mình đã tự động lưu & áp dụng mã OCOPDN (-20.000đ cho đơn từ 150.000đ) vào giỏ hàng giúp bạn rồi nhé! Ngoài ra đơn từ 300.000đ được Freeship nội tỉnh Đồng Nai.',
      products: products.filter((p) => p.flashSale).slice(0, 2),
      action: { href: '/don-hang?tab=cart', icon: 'cart', label: 'Xem Giỏ hàng & Thanh toán →' },
    };
  }

  const directMatches = products.filter((p) => {
    const hay = `${p.name} ${p.region} ${p.shop}`.toLowerCase();
    return (
      lower.includes(p.name.toLowerCase()) ||
      (lower.includes('chôm chôm') && hay.includes('chôm chôm')) ||
      (lower.includes('bưởi') && hay.includes('bưởi')) ||
      (lower.includes('hạt điều') && hay.includes('hạt điều')) ||
      (lower.includes('mật ong') && hay.includes('mật ong')) ||
      (lower.includes('sầu riêng') && hay.includes('sầu riêng')) ||
      ((lower.includes('ca cao') || lower.includes('cacao')) && hay.includes('ca cao')) ||
      (lower.includes('cà phê') && hay.includes('cà phê')) ||
      (lower.includes('tiêu') && hay.includes('tiêu')) ||
      (lower.includes('xoài') && hay.includes('xoài')) ||
      (lower.includes('combo') && hay.includes('combo'))
    );
  });
  if (directMatches.length) {
    const first = directMatches[0];
    const detail = getProductSummary(first);
    return {
      text: `Kết luận về ${first.name}: ${detail.verdict} Giá tận vườn chỉ ${formatVND(first.price)}, chuẩn ${first.cert}.`,
      products: directMatches.slice(0, 3),
      action: { href: getProductUrl(first), icon: 'search', label: 'Xem chi tiết & Chuỗi truy xuất →' },
    };
  }

  const budgetMatch = lower.match(/(\d{2,3})\s*k/);
  const maxBudget = budgetMatch ? parseInt(budgetMatch[1], 10) * 1000 : null;
  if (/quà|biếu|tặng/.test(lower)) {
    let gifts = products.filter((p) => p.isGift);
    if (maxBudget) gifts = gifts.filter((p) => p.price <= maxBudget);
    if (!gifts.length) gifts = products.filter((p) => p.isGift);
    return {
      text: `Gợi ý quà biếu chuẩn OCOP Đồng Nai${maxBudget ? ` dưới ${formatVND(maxBudget)}` : ''}: Hộp quà đóng đẹp, kèm tem QR nguồn gốc rõ ràng — tặng ông bà hay đối tác đều rất sang!`,
      products: gifts.slice(0, 3),
      action: { href: '/san-pham?cat=gift', icon: 'gift', label: 'Xem tất cả Quà biếu OCOP →' },
    };
  }

  if (/lớn tuổi|ông bà|bố mẹ|healthy|ít đường|sức khỏe|ăn kiêng/.test(lower)) {
    const healthy = products.filter((p) => getProductMeta(p).isHealthy);
    return {
      text: 'Top đặc sản lành mạnh, ít đường & giàu dinh dưỡng rất hợp cho người lớn tuổi: Bưởi đường lá cam Tân Triều, Mật ong nguyên chất Xuân Lộc và Hạt điều rang củi không tẩm dầu.',
      products: healthy.slice(0, 3),
      action: { href: '/san-pham?cat=healthy', icon: 'healthy', label: 'Xem danh sách Healthy →' },
    };
  }

  if (/rộ mùa|trái cây|tươi|hôm nay|ăn ngon/.test(lower)) {
    const seasonal = products.filter((p) => getProductMeta(p).isSeasonal);
    return {
      text: 'Các loại trái cây Đồng Nai đang vào chính vụ ngon nhất hôm nay — hái 5h sáng tại vườn, giao nhanh 2h nội tỉnh:',
      products: seasonal.slice(0, 3),
      action: { href: '/san-pham?cat=seasonal', icon: 'flame', label: 'Xem toàn bộ Trái cây rộ mùa →' },
    };
  }

  const matchedRegion = ['Long Khánh', 'Tân Triều', 'Bình Long', 'Xuân Lộc', 'Định Quán'].find((r) =>
    lower.includes(r.toLowerCase())
  );
  if (matchedRegion) {
    const regProds = products.filter((p) => p.region === matchedRegion);
    const hub = getRegionHubBySlugOrName(matchedRegion);
    return {
      text: `Đặc sản nổi bật tại vùng ${matchedRegion}, Đồng Nai — đạt chuẩn OCOP & VietGAP, giao trực tiếp từ vườn:`,
      products: regProds.slice(0, 3),
      action: {
        href: hub ? `/vung/${hub.slug}` : `/san-pham?region=${encodeURIComponent(matchedRegion)}`,
        icon: 'pin',
        label: `Xem hết đặc sản ${matchedRegion} →`,
      },
    };
  }

  if (maxBudget) {
    const under = products.filter((p) => p.price <= maxBudget).sort((a, b) => b.sold - a.sold);
    return {
      text: `Dưới ${formatVND(maxBudget)}, bạn có thể chọn ngay các đặc sản bán chạy nhất tại Chợ OCOP Đồng Nai:`,
      products: (under.length ? under : products).slice(0, 3),
      action: { href: '/san-pham', icon: 'basket', label: 'Xem toàn bộ sàn nông sản →' },
    };
  }

  return {
    text: 'Mình là Trợ lý AI Chợ OCOP Đồng Nai! Dựa trên nhu cầu của bạn, đây là 3 đặc sản OCOP 4 sao được khách đặt nhiều nhất hôm nay (nhập mã OCOPDN giảm thêm 20k):',
    products: products.filter((p) => p.isOcop4).slice(0, 3),
    action: { href: '/san-pham', icon: 'basket', label: 'Khám phá Sàn nông sản →' },
  };
}

export function getStepMeta(step) {
  if (step === 1) return { label: 'Chờ nhà vườn xác nhận', badge: 'bg-sale/10 text-sale border-sale/25', icon: 'bell' };
  if (step === 2) return { label: 'Đang hái tươi & đóng gói', badge: 'bg-harvest-light text-harvest-dark border-harvest/30', icon: 'basket' };
  if (step === 3) return { label: 'Đang giao đến khách', badge: 'bg-sky-50 text-sky-800 border-sky-200', icon: 'truck' };
  if (step === 4) return { label: 'Giao hàng thành công', badge: 'bg-mint text-forest border-forest/25', icon: 'check-circle' };
  return { label: 'Đã hủy đơn', badge: 'bg-bgsoft text-forest-dark/55 border-forest-dark/15', icon: 'x' };
}

export async function copyToClipboard(text) {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback below
  }
  try {
    const el = document.createElement('input');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

