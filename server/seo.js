import {
  BASE_PRODUCTS,
  DN_MAP_REGIONS,
  REGION_HUB_BY_SLUG,
  REGION_HUBS,
  REGION_SLUG_BY_NAME,
} from '../src/data/catalog.js';
import {
  formatVND,
  getProductBySlugOrId,
  getProductDetailData,
  getProductLotCode,
  getProductMeta,
  getProductSlug,
  getProductUrl,
  getRegionHubBySlugOrName,
} from '../src/utils/format.js';

const SITE_NAME = 'Chợ OCOP Thanh Niên Đồng Nai';

const CATEGORY_SEO = {
  seasonal: {
    title: 'Trái Cây Đang Rộ Mùa Đồng Nai – Hái Sáng Giao Chiều',
    desc: 'Đặc sản trái cây chín cây Đồng Nai đang vào chính vụ: Chôm chôm Long Khánh, Bưởi Tân Triều, Sầu riêng Ri6, Xoài Cát Hòa Lộc hái 5h sáng.',
  },
  fresh: {
    title: 'Trái Cây Chín Cây Đồng Nai – Giao Tươi Trong Ngày',
    desc: 'Mua trái cây tươi tại vườn Long Khánh, Tân Triều, Định Quán chuẩn OCOP & VietGAP, hái sáng giao chiều trong 2 giờ nội tỉnh.',
  },
  dry: {
    title: 'Hạt Điều & Đặc Sản Khô Đồng Nai Chuẩn OCOP',
    desc: 'Hạt điều rang củi vỏ lụa Bình Long A+, tiêu đen hữu cơ và đặc sản khô đóng gói kỹ giao nhanh toàn quốc.',
  },
  drink: {
    title: 'Mật Ong, Cà Phê & Ca Cao Nguyên Chất Đồng Nai',
    desc: 'Mật ong hoa chôm chôm Xuân Lộc, cà phê Robusta rang mộc và bột ca cao Trọng Đức Định Quán 100% nguyên chất.',
  },
  spice: {
    title: 'Gia Vị Bếp Việt Sạch Từ Đồng Nai – Chuẩn VietGAP',
    desc: 'Tiêu đen hữu cơ hạt chắc Bình Long phơi nắng sân gạch, đảm bảo sạch không tạp chất cho gian bếp gia đình.',
  },
  ocop4: {
    title: 'Đặc Sản Đạt Chuẩn OCOP 4 Sao Tỉnh Đồng Nai',
    desc: 'Tuyển chọn các sản phẩm nông nghiệp tiêu biểu đạt chứng nhận OCOP 4 sao của tỉnh Đồng Nai với tem QR truy xuất nguồn gốc.',
  },
  gift: {
    title: 'Hộp Quà Biếu Đặc Sản Quê Hương OCOP Đồng Nai',
    desc: 'Combo hộp quà biếu đặc sản Đồng Nai thiết kế xanh trang trọng, kèm tem QR và thiệp cảm ơn từ Đoàn Thanh Niên.',
  },
  healthy: {
    title: 'Nông Sản Sạch Lành Mạnh Cho Sức Khỏe – Chợ OCOP Đồng Nai',
    desc: 'Bưởi Tân Triều ít calo, mật ong nguyên chất, ca cao lên men và hạt điều rang củi không dầu tốt cho người lớn tuổi.',
  },
};

export function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeXml(str) {
  return escapeHtml(str);
}

export function getSiteOrigin(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/+$/, '');
  const protoHeader = String(req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3000').split(',')[0].trim();
  return `${protoHeader}://${host}`;
}

function buildOrgAndWebsite(origin) {
  return [
    {
      '@type': 'Organization',
      '@id': `${origin}/#organization`,
      name: SITE_NAME,
      url: origin,
      logo: {
        '@type': 'ImageObject',
        url: `${origin}/favicon.svg`,
      },
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: '+84-251-3888-999',
        contactType: 'customer service',
        areaServed: 'VN',
        availableLanguage: ['Vietnamese'],
      },
    },
    {
      '@type': 'GroceryStore',
      '@id': `${origin}/#store`,
      name: SITE_NAME,
      url: origin,
      image: `${origin}/images/chom-chom.jpg`,
      telephone: '+84-251-3888-999',
      priceRange: '45.000đ - 550.000đ',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'TP. Biên Hòa',
        addressRegion: 'Đồng Nai',
        addressCountry: 'VN',
      },
    },
    {
      '@type': 'WebSite',
      '@id': `${origin}/#website`,
      name: SITE_NAME,
      url: origin,
      inLanguage: 'vi-VN',
      publisher: { '@id': `${origin}/#organization` },
      potentialAction: {
        '@type': 'SearchAction',
        target: `${origin}/san-pham?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
  ];
}

export function resolveRouteSeo(req, { products = BASE_PRODUCTS, reviewsByProduct = {} } = {}) {
  const origin = getSiteOrigin(req);
  const rawPath = req.path || '/';
  const cleanPath = rawPath !== '/' ? rawPath.replace(/\.html$/, '').replace(/\/+$/, '') : '/';
  const query = req.query || {};

  // 1. Homepage
  if (cleanPath === '/' || cleanPath === '/index') {
    const featured = products.slice(0, 8);
    return {
      statusCode: 200,
      title: `Trang Chủ – ${SITE_NAME}`,
      description:
        'Trang chủ Chợ OCOP Thanh Niên Đồng Nai – Sàn thương mại điện tử nông sản xanh, Flash Sale tại vườn, bản đồ 5 vùng đặc sản và truy xuất nguồn gốc QR.',
      keywords:
        'Chợ OCOP Đồng Nai, nông sản Đồng Nai, bưởi Tân Triều, chôm chôm Long Khánh, hạt điều Bình Long, truy xuất QR nông sản',
      canonicalUrl: `${origin}/`,
      robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
      ogType: 'website',
      imageUrl: `${origin}/images/chom-chom.jpg`,
      ssrHeading: 'Mùa Chôm Chôm Tróc Long Khánh & Đặc Sản OCOP Đồng Nai',
      ssrSummary:
        'Sàn thương mại điện tử kết nối trực tiếp nhà vườn Đồng Nai với người tiêu dùng: Flash Sale tại vườn, bản đồ 5 vùng đặc sản và hộ chiếu truy xuất QR 5 bước.',
      ssrLinks: [
        ...REGION_HUBS.map((r) => ({ href: `/vung/${r.slug}`, label: r.title })),
        ...featured.map((p) => ({ href: getProductUrl(p), label: `${p.name} - ${formatVND(p.price)}` })),
      ],
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          ...buildOrgAndWebsite(origin),
          {
            '@type': 'ItemList',
            name: 'Nông sản nổi bật Chợ OCOP Đồng Nai',
            numberOfItems: featured.length,
            itemListElement: featured.map((p, idx) => ({
              '@type': 'ListItem',
              position: idx + 1,
              name: p.name,
              url: `${origin}${getProductUrl(p)}`,
            })),
          },
        ],
      },
    };
  }

  // 2. Regional Hub (/vung/:regionSlug)
  if (cleanPath.startsWith('/vung/')) {
    const slug = cleanPath.slice('/vung/'.length).toLowerCase();
    const hub = REGION_HUB_BY_SLUG[slug] || getRegionHubBySlugOrName(slug);
    if (!hub) {
      return {
        statusCode: 404,
        title: `Không tìm thấy vùng đặc sản – ${SITE_NAME}`,
        description: 'Vùng trồng không tồn tại trên hệ thống Chợ OCOP Thanh Niên Đồng Nai.',
        keywords: 'Chợ OCOP Đồng Nai',
        canonicalUrl: `${origin}/san-pham`,
        robots: 'noindex, follow',
        ogType: 'website',
        imageUrl: `${origin}/images/chom-chom.jpg`,
        ssrHeading: 'Không tìm thấy vùng đặc sản',
        ssrSummary: 'Khám phá toàn bộ đặc sản 5 vùng trồng Đồng Nai trên Sàn Nông Sản OCOP.',
        ssrLinks: REGION_HUBS.map((r) => ({ href: `/vung/${r.slug}`, label: r.title })),
        jsonLd: null,
      };
    }

    const regionProducts = products.filter((p) => p.region === hub.region);
    const mapInfo = DN_MAP_REGIONS[hub.region] || DN_MAP_REGIONS.all;
    const firstImg = regionProducts[0]?.image || '/images/buoi-tan-trieu.jpg';
    const fullImg = firstImg.startsWith('http') ? firstImg : `${origin}${firstImg.startsWith('/') ? '' : '/'}${firstImg}`;

    return {
      statusCode: 200,
      title: `${hub.title} – ${SITE_NAME}`,
      description: hub.description,
      keywords: hub.keywords,
      canonicalUrl: `${origin}/vung/${hub.slug}`,
      robots: 'index, follow, max-image-preview:large',
      ogType: 'website',
      imageUrl: fullImg,
      ssrHeading: mapInfo.title || hub.title,
      ssrSummary: `${mapInfo.verdict} ${hub.description}`,
      ssrLinks: regionProducts.map((p) => ({ href: getProductUrl(p), label: `${p.name} - ${formatVND(p.price)}` })),
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'CollectionPage',
            name: hub.title,
            description: hub.description,
            url: `${origin}/vung/${hub.slug}`,
            about: {
              '@type': 'Place',
              name: `${hub.region}, Tỉnh Đồng Nai`,
              description: mapInfo.specialty,
            },
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: `${origin}/` },
              { '@type': 'ListItem', position: 2, name: 'Sàn nông sản', item: `${origin}/san-pham` },
              { '@type': 'ListItem', position: 3, name: hub.region, item: `${origin}/vung/${hub.slug}` },
            ],
          },
          {
            '@type': 'ItemList',
            numberOfItems: regionProducts.length,
            itemListElement: regionProducts.map((p, idx) => ({
              '@type': 'ListItem',
              position: idx + 1,
              name: p.name,
              url: `${origin}${getProductUrl(p)}`,
            })),
          },
        ],
      },
    };
  }

  // 3. Product detail (/san-pham/:slug OR /chi-tiet-san-pham)
  if (cleanPath.startsWith('/san-pham/') || cleanPath === '/chi-tiet-san-pham') {
    const slugFromPath = cleanPath.startsWith('/san-pham/') ? decodeURIComponent(cleanPath.slice('/san-pham/'.length)) : '';
    const requested = slugFromPath || String(query.slug || query.id || '').trim();
    const hasExplicitParam = Boolean(slugFromPath || query.slug || query.id);
    const product = requested ? getProductBySlugOrId(products, requested) : getProductBySlugOrId(products, 'buoi-duong-la-cam');

    if (hasExplicitParam && !product) {
      return {
        statusCode: 404,
        title: `Không tìm thấy sản phẩm – ${SITE_NAME}`,
        description: 'Sản phẩm không tồn tại hoặc đã ngừng kinh doanh trên Chợ OCOP Thanh Niên Đồng Nai.',
        keywords: 'Chợ OCOP Đồng Nai, nông sản sạch',
        canonicalUrl: `${origin}/san-pham`,
        robots: 'noindex, follow',
        ogType: 'website',
        imageUrl: `${origin}/images/chom-chom.jpg`,
        ssrHeading: 'Không tìm thấy sản phẩm',
        ssrSummary: 'Khám phá hàng chục đặc sản Đồng Nai chuẩn OCOP tại Sàn Nông Sản.',
        ssrLinks: products.slice(0, 6).map((p) => ({ href: getProductUrl(p), label: p.name })),
        jsonLd: null,
      };
    }

    const customReviews = Array.isArray(reviewsByProduct[product.id]) ? reviewsByProduct[product.id] : [];
    const detail = getProductDetailData(product, customReviews);
    const canonicalSlug = detail.slug || getProductSlug(product);
    const canonicalUrl = `${origin}/san-pham/${encodeURIComponent(canonicalSlug)}`;
    const imgPath = product.image?.startsWith('http')
      ? product.image
      : `${origin}${product.image?.startsWith('/') ? '' : '/'}${product.image || 'images/chom-chom.jpg'}`;
    const desc = `${detail.verdict} Giá tận vườn ${formatVND(product.price)}, chuẩn ${product.cert}, truy xuất nguồn gốc #${detail.trace.traceCode} tại ${product.shop}.`;

    return {
      statusCode: 200,
      title: `${product.name} – Chợ OCOP Đồng Nai`,
      description: desc,
      keywords: `${product.name}, ${product.region}, ${product.cert}, ${product.shop}, Chợ OCOP Đồng Nai`,
      canonicalUrl,
      robots: 'index, follow, max-image-preview:large',
      ogType: 'product',
      imageUrl: imgPath,
      productMeta: {
        price: product.price,
        currency: 'VND',
        availability: 'in stock',
        brand: product.shop,
      },
      ssrHeading: product.name,
      ssrSummary: desc,
      ssrLinks: [
        { href: `/truy-xuat?code=${encodeURIComponent(detail.trace.traceCode)}`, label: `Truy xuất QR #${detail.trace.traceCode}` },
        { href: '/san-pham', label: 'Quay lại Sàn nông sản Đồng Nai' },
      ],
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Product',
            name: product.name,
            description: `${detail.verdict} ${product.story}`,
            image: [imgPath],
            sku: detail.trace.traceCode,
            mpn: detail.trace.batchCode,
            category: detail.categoryName,
            brand: { '@type': 'Brand', name: product.shop },
            offers: {
              '@type': 'Offer',
              url: canonicalUrl,
              priceCurrency: 'VND',
              price: String(product.price),
              availability: 'https://schema.org/InStock',
              itemCondition: 'https://schema.org/NewCondition',
              seller: { '@type': 'Organization', name: product.shop },
            },
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: String(product.rating),
              reviewCount: String(detail.reviewCount),
              bestRating: '5',
              worstRating: '1',
            },
            review: detail.reviews.slice(0, 3).map((r) => ({
              '@type': 'Review',
              author: { '@type': 'Person', name: r.user },
              reviewRating: { '@type': 'Rating', ratingValue: String(r.rating), bestRating: '5' },
              reviewBody: r.text,
            })),
            additionalProperty: [
              { '@type': 'PropertyValue', name: 'Vùng trồng', value: `${product.region}, Đồng Nai` },
              { '@type': 'PropertyValue', name: 'Chứng nhận', value: product.cert },
              { '@type': 'PropertyValue', name: 'Mã truy xuất QR', value: detail.trace.traceCode },
            ],
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: `${origin}/` },
              { '@type': 'ListItem', position: 2, name: 'Sàn nông sản', item: `${origin}/san-pham` },
              { '@type': 'ListItem', position: 3, name: product.name, item: canonicalUrl },
            ],
          },
        ],
      },
    };
  }

  // 4. Marketplace Listing (/san-pham)
  if (cleanPath === '/san-pham') {
    const q = String(query.q || '').trim();
    const region = String(query.region || '').trim();
    const cat = String(query.cat || '').trim();
    const hasSearchOrBloat =
      Boolean(q) ||
      Boolean(query.sort) ||
      Boolean(query.price) ||
      Boolean(query.product) ||
      Boolean(query.shop) ||
      cat === 'favorites' ||
      Object.keys(query).length > 1;

    const hub = region ? getRegionHubBySlugOrName(region) : null;
    const catSeo = CATEGORY_SEO[cat] || null;
    let title = `Sàn Nông Sản – ${SITE_NAME}`;
    let description =
      'Sàn nông sản OCOP Đồng Nai với 10 danh mục chi tiết, bộ lọc 5 chiều, yêu thích và hồ sơ minh bạch Nguồn gốc – Kiểm định.';
    let canonicalUrl = `${origin}/san-pham`;

    if (hub && !hasSearchOrBloat) {
      title = `${hub.title} – ${SITE_NAME}`;
      description = hub.description;
      canonicalUrl = `${origin}/vung/${hub.slug}`;
    } else if (catSeo && !hasSearchOrBloat) {
      title = `${catSeo.title} – ${SITE_NAME}`;
      description = catSeo.desc;
      canonicalUrl = `${origin}/san-pham?cat=${encodeURIComponent(cat)}`;
    } else if (q) {
      title = `Tìm kiếm "${q}" – Sàn Nông Sản OCOP Đồng Nai`;
    }

    const robots = hasSearchOrBloat ? 'noindex, follow' : 'index, follow, max-image-preview:large';

    return {
      statusCode: 200,
      title,
      description,
      keywords: 'Sàn nông sản OCOP Đồng Nai, mua đặc sản Đồng Nai, bưởi Tân Triều, chôm chôm Long Khánh',
      canonicalUrl,
      robots,
      ogType: 'website',
      imageUrl: `${origin}/images/buoi-tan-trieu.jpg`,
      ssrHeading: 'Khám Phá Đặc Sản Chuẩn OCOP Tại Vườn Đồng Nai',
      ssrSummary: description,
      ssrLinks: products.slice(0, 10).map((p) => ({ href: getProductUrl(p), label: `${p.name} - ${formatVND(p.price)}` })),
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'CollectionPage',
            name: title,
            description,
            url: canonicalUrl,
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: `${origin}/` },
              { '@type': 'ListItem', position: 2, name: 'Sàn nông sản', item: `${origin}/san-pham` },
            ],
          },
          {
            '@type': 'ItemList',
            numberOfItems: products.length,
            itemListElement: products.slice(0, 12).map((p, idx) => ({
              '@type': 'ListItem',
              position: idx + 1,
              name: p.name,
              url: `${origin}${getProductUrl(p)}`,
            })),
          },
        ],
      },
    };
  }

  // 5. Traceability (/truy-xuat)
  if (cleanPath === '/truy-xuat') {
    const code = String(query.code || '').trim();
    const cleanCode = code.replace(/^#/, '').toLowerCase();
    const matchedProd = cleanCode
      ? products.find((p) => getProductLotCode(p).toLowerCase() === cleanCode || p.id.toLowerCase() === cleanCode)
      : null;

    const title = matchedProd
      ? `Truy Xuất ${matchedProd.name} (#${getProductLotCode(matchedProd)}) – Chợ OCOP Đồng Nai`
      : `Truy Xuất Nguồn Gốc QR – ${SITE_NAME}`;
    const description =
      'Hệ thống truy xuất nguồn gốc nông sản số Đồng Nai – Tra cứu mã lô, quét tem QR OCOP, xem tọa độ GPS vùng trồng và chỉ số kiểm định.';

    return {
      statusCode: 200,
      title,
      description,
      keywords: 'truy xuất nguồn gốc QR, hộ chiếu nông sản số Đồng Nai, tem QR OCOP',
      canonicalUrl: `${origin}/truy-xuat`,
      robots: code ? 'noindex, follow' : 'index, follow, max-image-preview:large',
      ogType: 'website',
      imageUrl: `${origin}/images/vuon-dong-nai-live.jpg`,
      ssrHeading: 'Hộ Chiếu Nông Sản Số & Nhật Ký Canh Tác OCOP Đồng Nai',
      ssrSummary: description,
      ssrLinks: products.slice(0, 5).map((p) => ({
        href: `/truy-xuat?code=${encodeURIComponent(getProductLotCode(p))}`,
        label: `Lô #${getProductLotCode(p)} - ${p.name}`,
      })),
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          { '@type': 'WebPage', name: title, description, url: `${origin}/truy-xuat` },
          {
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'Làm sao kiểm tra nguồn gốc nông sản trên Chợ OCOP Đồng Nai?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Bạn chỉ cần nhập mã lô in trên bao bì (ví dụ DN-OCOP-P1) hoặc quét tem QR để xem đầy đủ tọa độ GPS vùng trồng, thời gian thu hoạch và đơn vị Đoàn Thanh Niên kiểm định.',
                },
              },
              {
                '@type': 'Question',
                name: 'Quy trình truy xuất nông sản gồm mấy bước?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Mỗi lô nông sản được xác thực minh bạch qua 4 chặng chính: Canh tác tại vườn, Thu hoạch tuyển chọn, Kiểm định Đoàn Thanh Niên & cấp tem QR, và Đóng gói giao tươi.',
                },
              },
            ],
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: `${origin}/` },
              { '@type': 'ListItem', position: 2, name: 'Truy xuất QR', item: `${origin}/truy-xuat` },
            ],
          },
        ],
      },
    };
  }

  // 6. AI Sell Page (/dang-ban-ai)
  if (cleanPath === '/dang-ban-ai') {
    const title = `Kênh Nhà Nông & Đăng Bán AI – ${SITE_NAME}`;
    const description =
      'Kênh Nhà Nông Chợ OCOP Đồng Nai – Trợ lý AI đăng bán nông sản bằng giọng nói hoặc văn bản, tự tạo Mô tả, Nguồn gốc, Kiểm định và Thông tin người yêu cầu.';
    return {
      statusCode: 200,
      title,
      description,
      keywords: 'đăng bán nông sản AI, kênh nhà nông Đồng Nai, số hóa OCOP thanh niên',
      canonicalUrl: `${origin}/dang-ban-ai`,
      robots: 'index, follow, max-image-preview:large',
      ogType: 'website',
      imageUrl: `${origin}/images/vuon-dong-nai-live.jpg`,
      ssrHeading: 'Đăng Bán Nông Sản Bằng Giọng Nói Hoặc Văn Bản Với Trợ Lý AI',
      ssrSummary: description,
      ssrLinks: [
        { href: '/san-pham', label: 'Xem Sàn nông sản Đồng Nai' },
        { href: '/truy-xuat', label: 'Tra cứu mã lô QR' },
      ],
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          { '@type': 'WebApplication', name: title, applicationCategory: 'BusinessApplication', url: `${origin}/dang-ban-ai` },
          {
            '@type': 'HowTo',
            name: 'Cách đăng bán nông sản chuẩn OCOP bằng Trợ lý AI',
            step: [
              { '@type': 'HowToStep', position: 1, name: 'Nói hoặc nhập mô tả', text: 'Nhà nông nói hoặc nhập tên nông sản, giá bán, vùng trồng và SĐT.' },
              { '@type': 'HowToStep', position: 2, name: 'AI biên tập 4 phần', text: 'Hệ thống tự bóc tách Mô tả bán hàng, Nguồn gốc, Kiểm định và Chủ vườn.' },
              { '@type': 'HowToStep', position: 3, name: 'Xuất bản và cấp mã QR', text: 'Sản phẩm xuất hiện ngay trên Sàn nông sản kèm tem QR truy xuất nguồn gốc.' },
            ],
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: `${origin}/` },
              { '@type': 'ListItem', position: 2, name: 'Đăng bán AI', item: `${origin}/dang-ban-ai` },
            ],
          },
        ],
      },
    };
  }

  // 7. Transactional noindex pages
  if (cleanPath === '/don-hang') {
    return {
      statusCode: 200,
      title: `Giỏ Hàng & Đơn Hàng – ${SITE_NAME}`,
      description: 'Giỏ hàng, thanh toán COD/VietQR, áp mã giảm giá OCOPDN và theo dõi đơn hàng trên Chợ OCOP Thanh Niên Đồng Nai.',
      keywords: 'giỏ hàng OCOP Đồng Nai, thanh toán VietQR',
      canonicalUrl: `${origin}/don-hang`,
      robots: 'noindex, nofollow',
      ogType: 'website',
      imageUrl: `${origin}/images/chom-chom.jpg`,
      ssrHeading: 'Giỏ Hàng, Thanh Toán & Đơn Hàng',
      ssrSummary: 'Kiểm tra giỏ hàng, áp mã OCOPDN và theo dõi tiến độ giao nông sản tươi.',
      ssrLinks: [{ href: '/san-pham', label: 'Tiếp tục mua sắm nông sản' }],
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: `Giỏ Hàng & Đơn Hàng – ${SITE_NAME}`,
        url: `${origin}/don-hang`,
      },
    };
  }

  if (cleanPath === '/quan-ly-don') {
    return {
      statusCode: 200,
      title: `Quản Lý Đơn Hàng Nhà Vườn – ${SITE_NAME}`,
      description: 'Trang dành riêng cho Nhà vườn / HTX trực tiếp quản lý đơn hàng bán ra theo từng tài khoản.',
      keywords: 'quản lý đơn nhà vườn OCOP',
      canonicalUrl: `${origin}/quan-ly-don`,
      robots: 'noindex, nofollow',
      ogType: 'website',
      imageUrl: `${origin}/images/vuon-dong-nai-live.jpg`,
      ssrHeading: 'Quản Lý Đơn Bán Ra Cho Nhà Vườn Đồng Nai',
      ssrSummary: 'Cập nhật trạng thái hái tươi, đóng gói và giao vận cho từng đơn hàng tại vườn.',
      ssrLinks: [{ href: '/dang-ban-ai', label: 'Đăng thêm nông sản bằng AI' }],
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: `Quản Lý Đơn Hàng Nhà Vườn – ${SITE_NAME}`,
        url: `${origin}/quan-ly-don`,
      },
    };
  }

  // 8. Unknown path -> true HTTP 404 (prevents Soft 404!)
  return {
    statusCode: 404,
    title: `Không tìm thấy trang (404) – ${SITE_NAME}`,
    description: 'Trang bạn yêu cầu không tồn tại trên hệ thống Chợ OCOP Thanh Niên Đồng Nai.',
    keywords: 'Chợ OCOP Đồng Nai',
    canonicalUrl: `${origin}/`,
    robots: 'noindex, follow',
    ogType: 'website',
    imageUrl: `${origin}/images/chom-chom.jpg`,
    ssrHeading: 'Không tìm thấy trang (404)',
    ssrSummary: 'Quay về Trang chủ hoặc Sàn nông sản Chợ OCOP Thanh Niên Đồng Nai.',
    ssrLinks: [
      { href: '/', label: 'Trang chủ Chợ OCOP' },
      { href: '/san-pham', label: 'Sàn nông sản Đồng Nai' },
    ],
    jsonLd: null,
  };
}

export function injectSeoHtml(templateHtml, seoData, reqOrigin) {
  const safeTitle = escapeHtml(seoData.title);
  const safeDesc = escapeHtml(seoData.description);
  const safeKeywords = escapeHtml(seoData.keywords || SITE_NAME);
  const safeCanonical = escapeHtml(seoData.canonicalUrl);
  const safeRobots = escapeHtml(seoData.robots || 'index, follow');
  const safeImg = escapeHtml(seoData.imageUrl);
  const safeOgType = escapeHtml(seoData.ogType || 'website');

  const extraHeadTags = [
    `<meta name="keywords" content="${safeKeywords}" />`,
    `<meta name="geo.region" content="VN-39" />`,
    `<meta name="geo.placename" content="Đồng Nai, Việt Nam" />`,
    `<meta name="geo.position" content="10.9465;106.8235" />`,
    `<meta name="ICBM" content="10.9465, 106.8235" />`,
    `<link rel="canonical" href="${safeCanonical}" />`,
    `<link rel="alternate" hreflang="vi-VN" href="${safeCanonical}" />`,
    `<link rel="alternate" hreflang="x-default" href="${safeCanonical}" />`,
    `<link rel="manifest" href="/site.webmanifest" />`,
    `<meta property="og:url" content="${safeCanonical}" />`,
    `<meta property="og:image:alt" content="${safeTitle}" />`,
    `<meta name="twitter:title" content="${safeTitle}" />`,
    `<meta name="twitter:description" content="${safeDesc}" />`,
    `<meta name="twitter:image" content="${safeImg}" />`,
  ];

  if (seoData.productMeta) {
    extraHeadTags.push(
      `<meta property="product:price:amount" content="${escapeHtml(seoData.productMeta.price)}" />`,
      `<meta property="product:price:currency" content="${escapeHtml(seoData.productMeta.currency)}" />`,
      `<meta property="product:availability" content="${escapeHtml(seoData.productMeta.availability)}" />`,
      `<meta property="product:brand" content="${escapeHtml(seoData.productMeta.brand)}" />`
    );
  }

  if (seoData.jsonLd) {
    const rawJson = JSON.stringify(seoData.jsonLd).replace(/<\/script/gi, '<\\/script');
    extraHeadTags.push(`<script id="ocop-jsonld" type="application/ld+json">${rawJson}</script>`);
  }

  // Semantic initial HTML inside #root for bots & zero-JS curl inspection; replaced seamlessly on React mount
  const linksHtml = (seoData.ssrLinks || [])
    .slice(0, 12)
    .map((l) => `<li><a href="${escapeHtml(l.href)}">${escapeHtml(l.label)}</a></li>`)
    .join('');

  const ssrFallback = `<div id="root"><main class="max-w-7xl mx-auto px-4 py-8 font-sans text-forest-dark"><article><header><h1>${escapeHtml(
    seoData.ssrHeading
  )}</h1><p>${escapeHtml(seoData.ssrSummary)}</p></header><nav aria-label="Liên kết nổi bật"><ul>${linksHtml}</ul></nav></article></main></div>`;

  let out = templateHtml
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${safeTitle}</title>`)
    .replace(
      /<meta\s+name="description"[\s\S]*?content="[^"]*"\s*\/?>/i,
      `<meta name="description" content="${safeDesc}" />`
    )
    .replace(
      /<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="robots" content="${safeRobots}" />`
    )
    .replace(
      /<meta\s+property="og:type"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:type" content="${safeOgType}" />`
    )
    .replace(
      /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:title" content="${safeTitle}" />`
    )
    .replace(
      /<meta\s+property="og:description"[\s\S]*?content="[^"]*"\s*\/?>/i,
      `<meta property="og:description" content="${safeDesc}" />`
    )
    .replace(
      /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:image" content="${safeImg}" />`
    )
    .replace('</head>', `  ${extraHeadTags.join('\n  ')}\n</head>`)
    .replace('<div id="root"></div>', ssrFallback);

  if (reqOrigin && !out.includes('name="theme-color"')) {
    out = out.replace('</head>', `  <meta name="theme-color" content="#183D2B" />\n</head>`);
  }
  return out;
}

export function renderRobotsTxt(origin) {
  return [
    'User-agent: *',
    'Allow: /',
    'Allow: /images/',
    'Disallow: /api/',
    'Disallow: /don-hang',
    'Disallow: /quan-ly-don',
    'Disallow: /*?q=',
    'Disallow: /*?sort=',
    'Disallow: /*?price=',
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n');
}

export function renderSitemapIndex(origin, lastMod = new Date().toISOString().slice(0, 10)) {
  const subs = ['sitemap-pages.xml', 'sitemap-regions.xml', 'sitemap-products.xml'];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${subs
    .map((f) => `  <sitemap><loc>${escapeXml(origin)}/${f}</loc><lastmod>${lastMod}</lastmod></sitemap>`)
    .join('\n')}\n</sitemapindex>\n`;
}

export function renderSitemapPages(origin, lastMod = new Date().toISOString().slice(0, 10)) {
  const pages = [
    { path: '/', changefreq: 'daily', priority: '1.0' },
    { path: '/san-pham', changefreq: 'daily', priority: '0.9' },
    { path: '/truy-xuat', changefreq: 'weekly', priority: '0.8' },
    { path: '/dang-ban-ai', changefreq: 'weekly', priority: '0.8' },
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages
    .map(
      (p) =>
        `  <url><loc>${escapeXml(origin + p.path)}</loc><lastmod>${lastMod}</lastmod><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>`
    )
    .join('\n')}\n</urlset>\n`;
}

export function renderSitemapRegions(origin, lastMod = new Date().toISOString().slice(0, 10)) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${REGION_HUBS.map(
    (r) =>
      `  <url><loc>${escapeXml(`${origin}/vung/${r.slug}`)}</loc><lastmod>${lastMod}</lastmod><changefreq>weekly</changefreq><priority>0.85</priority></url>`
  ).join('\n')}\n</urlset>\n`;
}

export function renderSitemapProducts(origin, products = BASE_PRODUCTS, lastMod = new Date().toISOString().slice(0, 10)) {
  const entries = products.map((p) => {
    const url = `${origin}${getProductUrl(p)}`;
    const rawImg = p.image || '/images/chom-chom.jpg';
    const imgUrl = rawImg.startsWith('http') ? rawImg : `${origin}${rawImg.startsWith('/') ? '' : '/'}${rawImg}`;
    return `  <url>
    <loc>${escapeXml(url)}</loc>
    <lastmod>${escapeXml((p.createdAt || lastMod).slice(0, 10))}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
    <image:image>
      <image:loc>${escapeXml(imgUrl)}</image:loc>
      <image:title>${escapeXml(p.name)}</image:title>
    </image:image>
  </url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${entries.join(
    '\n'
  )}\n</urlset>\n`;
}
