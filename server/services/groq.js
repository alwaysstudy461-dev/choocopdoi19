import { AI_LISTING_CATALOG } from '../../src/data/catalog.js';
import { formatVND, getProductSlug, parseAiListing } from '../../src/utils/format.js';

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
const ALLOWED_REGIONS = ['Long Khánh', 'Tân Triều', 'Bình Long', 'Xuân Lộc', 'Định Quán'];
const ALLOWED_CATS = new Set(['fresh', 'dry', 'drink']);

function sanitizeActionHref(href) {
  const s = String(href || '').trim();
  if (!s.startsWith('/') || s.startsWith('//')) return '/san-pham';
  return s;
}

export async function askGroqChat({
  query,
  products,
  orders = [],
  user = null,
  groqApiKey,
  groqModel = 'llama-3.3-70b-versatile',
  fetchImpl = globalThis.fetch,
}) {
  if (!groqApiKey) return null;

  const catalogBrief = products.slice(0, 16).map((p) => ({
    id: p.id,
    slug: getProductSlug(p),
    name: p.name,
    price: p.price,
    region: p.region,
    cert: p.cert,
    shop: p.shop,
    category: p.category,
    isGift: Boolean(p.isGift),
  }));

  const farmOrderCount = user?.farmName
    ? orders.filter((o) => (o.shop || '').toLowerCase() === user.farmName.toLowerCase()).length
    : orders.length;

  const systemPrompt = [
    'Bạn là Trợ lý AI chính thức của Chợ OCOP Thanh Niên Đồng Nai.',
    'Trả lời ngắn gọn, thân thiện, đúng dữ liệu nông sản thật bên dưới (tuyệt đối không bịa sản phẩm hoặc giá ngoài danh mục).',
    'Luôn trả về JSON hợp lệ theo schema:',
    '{',
    '  "text": "câu tư vấn tự nhiên bằng tiếng Việt, tối đa 3 câu",',
    '  "productIds": ["p1", "p2"],',
    '  "actionHref": "/san-pham",',
    '  "actionLabel": "Xem sản phẩm",',
    '  "actionIcon": "basket|gift|flame|healthy|pin|shield-check|package|sparkles|cart|search",',
    '  "applyVoucher": false',
    '}',
    `Nếu khách hỏi mã giảm giá / voucher / OCOPDN / freeship: đặt "applyVoucher": true và giải thích mã OCOPDN (-20.000đ đơn từ 150.000đ, freeship nội tỉnh từ 300.000đ).`,
    `Danh mục hiện có: ${JSON.stringify(catalogBrief)}`,
    `Thống kê đơn hiện tại: ${farmOrderCount} đơn${user?.farmName ? ` của ${user.farmName}` : ''}.`,
  ].join('\n');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetchImpl(GROQ_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: groqModel,
        temperature: 0.35,
        max_tokens: 450,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: String(query || '').slice(0, 500) },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content);

    const byId = new Map(products.map((p) => [p.id, p]));
    const matchedProducts = Array.isArray(parsed.productIds)
      ? parsed.productIds.map((id) => byId.get(String(id))).filter(Boolean).slice(0, 3)
      : [];

    const text = String(parsed.text || '').trim() || `Gợi ý nông sản Đồng Nai phù hợp cho bạn (giá tận vườn từ ${formatVND(products[0]?.price || 45000)}).`;
    return {
      provider: 'groq',
      model: data?.model || groqModel,
      applyVoucher: Boolean(parsed.applyVoucher),
      response: {
        text,
        products: matchedProducts,
        action: {
          href: sanitizeActionHref(parsed.actionHref),
          icon: String(parsed.actionIcon || 'sparkles').slice(0, 24),
          label: String(parsed.actionLabel || 'Khám phá ngay').slice(0, 60),
        },
      },
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function parseListingWithGroq({
  text,
  user = null,
  groqApiKey,
  groqModel = 'llama-3.3-70b-versatile',
  fetchImpl = globalThis.fetch,
}) {
  if (!groqApiKey) return null;

  const fallback = parseAiListing(text, user);
  const systemPrompt = [
    'Bạn là trợ lý biên tập bài đăng nông sản chuẩn OCOP Đồng Nai cho bà con nông dân.',
    'Hãy trích xuất và biên tập mượt mà 4 phần từ câu mô tả thô bên dưới.',
    'Trả về đúng JSON:',
    '{',
    '  "name": "tên sản phẩm rõ ràng",',
    '  "price": 65000,',
    '  "unit": "Gói 1kg",',
    '  "cat": "fresh|dry|drink",',
    '  "region": "Long Khánh|Tân Triều|Bình Long|Xuân Lộc|Định Quán",',
    '  "cert": "OCOP 4 sao|OCOP 3 sao|VietGAP|Chờ Đoàn TN kiểm định",',
    '  "harvest": "thời điểm thu hoạch",',
    '  "desc": "mô tả bán hàng hấp dẫn, chân thật 2-3 câu",',
    '  "origin": "chi tiết nguồn gốc vườn trồng tại Đồng Nai",',
    '  "inspection": "ghi chú kiểm định chất lượng",',
    '  "reqName": "tên người bán",',
    '  "reqPhone": "số điện thoại",',
    '  "reqFarm": "tên nhà vườn hoặc HTX"',
    '}',
  ].join('\n');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetchImpl(GROQ_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: groqModel,
        temperature: 0.25,
        max_tokens: 550,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: String(text || '').slice(0, 800) },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    const rawJson = data?.choices?.[0]?.message?.content;
    if (!rawJson) return null;
    const ai = JSON.parse(rawJson);

    const parsedPrice = Math.round(Number(ai.price));
    const price = Number.isFinite(parsedPrice) && parsedPrice >= 10000 && parsedPrice <= 50000000 ? parsedPrice : fallback.price;
    const region = ALLOWED_REGIONS.includes(ai.region) ? ai.region : fallback.region;
    const cat = ALLOWED_CATS.has(ai.cat) ? ai.cat : fallback.cat;

    const lowerAll = `${ai.name || ''} ${text}`.toLowerCase();
    const matchedAsset = AI_LISTING_CATALOG.find((c) => c.kw.some((k) => lowerAll.includes(k)));

    return {
      provider: 'groq',
      model: data?.model || groqModel,
      listing: {
        ...fallback,
        name: String(ai.name || fallback.name).trim().slice(0, 140),
        price,
        unit: String(ai.unit || fallback.unit).trim().slice(0, 60),
        cat,
        emoji: matchedAsset ? matchedAsset.emoji : fallback.emoji,
        img: matchedAsset ? matchedAsset.img : fallback.img,
        desc: String(ai.desc || fallback.desc).trim().slice(0, 900),
        region,
        harvest: String(ai.harvest || fallback.harvest).trim().slice(0, 120),
        origin: String(ai.origin || fallback.origin).trim().slice(0, 400),
        cert: String(ai.cert || fallback.cert).trim().slice(0, 50),
        inspection: String(ai.inspection || fallback.inspection).trim().slice(0, 400),
        reqName: String(ai.reqName || fallback.reqName).trim().slice(0, 80),
        reqPhone: String(ai.reqPhone || fallback.reqPhone).trim().slice(0, 30),
        reqFarm: String(ai.reqFarm || fallback.reqFarm).trim().slice(0, 120),
        verifier: `Đoàn Thanh Niên ${region} - Đồng Nai`,
      },
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

