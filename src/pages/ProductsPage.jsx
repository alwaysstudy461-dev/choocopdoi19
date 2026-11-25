import React, { useMemo, useRef } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import OcopIcon from '../components/OcopIcon.jsx';
import ProductImage from '../components/ProductImage.jsx';
import ProductQuickModal from '../components/ProductQuickModal.jsx';
import SeoHead from '../components/SeoHead.jsx';
import { useOcop } from '../context/OcopContext.jsx';
import {
  formatVND,
  getProductLotCode,
  getProductMeta,
  getProductUrl,
  getRegionHubBySlugOrName,
  matchesSearchQuery,
} from '../utils/format.js';
import { gsap, useGSAP } from '../utils/gsapConfig.js';

const CATEGORY_TABS = [
  { key: 'all', icon: 'sparkles', label: 'Tất cả' },
  { key: 'seasonal', icon: 'flame', label: 'Đang rộ mùa' },
  { key: 'fresh', icon: 'cherry', label: 'Trái cây chín cây' },
  { key: 'dry', icon: 'peanut', label: 'Hạt & Đồ khô' },
  { key: 'drink', icon: 'honey', label: 'Mật ong & Thức uống' },
  { key: 'spice', icon: 'pepper', label: 'Gia vị bếp Việt' },
  { key: 'ocop4', icon: 'star-filled', label: 'Chuẩn OCOP 4 sao' },
  { key: 'gift', icon: 'gift', label: 'Quà biếu quê hương' },
  { key: 'healthy', icon: 'healthy', label: 'Tốt sức khỏe' },
  { key: 'favorites', icon: 'heart-filled', label: 'Đã thích' },
];

const PURPOSE_OPTIONS = [
  { key: 'all', icon: null, label: 'Tất cả nhu cầu' },
  { key: 'daily', icon: 'utensils', label: 'Ăn tươi hằng ngày' },
  { key: 'gift', icon: 'gift', label: 'Biếu tặng gia đình' },
  { key: 'healthy', icon: 'healthy', label: 'Tốt cho sức khỏe' },
  { key: 'seasonal', icon: 'flame', label: 'Đặc sản rộ mùa' },
];

const REGION_OPTIONS = ['all', 'Long Khánh', 'Tân Triều', 'Bình Long', 'Xuân Lộc', 'Định Quán'];

const DELIVERY_OPTIONS = [
  { key: 'all', icon: null, label: 'Tất cả hình thức' },
  { key: 'same_day', icon: 'zap', label: 'Hái sáng giao chiều' },
  { key: 'nationwide', icon: 'package', label: 'Giao nhanh toàn quốc' },
];

const CERT_OPTIONS = [
  { key: 'all', icon: null, label: 'Tất cả chứng nhận' },
  { key: 'OCOP 4 sao', icon: 'star-filled', label: 'OCOP 4 sao' },
  { key: 'OCOP 3 sao', icon: 'star', label: 'OCOP 3 sao' },
  { key: 'VietGAP', icon: 'leaf', label: 'Chuẩn VietGAP' },
];

const PRICE_OPTIONS = [
  { key: 'all', label: 'Tất cả mức giá' },
  { key: 'under100', label: 'Dưới 100.000đ' },
  { key: '100to250', label: '100.000đ - 250.000đ' },
  { key: 'over250', label: 'Trên 250.000đ' },
];

const SORT_OPTIONS = [
  { key: 'popular', label: 'Phổ biến' },
  { key: 'bestseller', label: 'Bán chạy nhất' },
  { key: 'price-asc', label: 'Giá thấp → cao' },
  { key: 'price-desc', label: 'Giá cao → thấp' },
];

const CATEGORY_LABELS = Object.fromEntries(CATEGORY_TABS.map((t) => [t.key, t.label]));
const PURPOSE_LABELS = Object.fromEntries(PURPOSE_OPTIONS.map((p) => [p.key, p.label]));
const PRICE_LABELS = Object.fromEntries(PRICE_OPTIONS.map((p) => [p.key, p.label]));

export default function ProductsPage() {
  const { products, favorites, toggleFavorite, addToCart } = useOcop();
  const { regionSlug } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const gridRef = useRef(null);
  const hasAnimatedRef = useRef(false);

  const regionHub = regionSlug ? getRegionHubBySlugOrName(regionSlug) : null;

  const filters = useMemo(
    () => ({
      search: searchParams.get('q') || '',
      category: searchParams.get('cat') || 'all',
      purpose: searchParams.get('purpose') || 'all',
      delivery: searchParams.get('delivery') || 'all',
      region: searchParams.get('region') || (regionHub ? regionHub.region : 'all'),
      cert: searchParams.get('cert') || 'all',
      priceRange: searchParams.get('price') || 'all',
      shop: searchParams.get('shop') || '',
      sort: searchParams.get('sort') || 'popular',
    }),
    [regionHub, searchParams]
  );

  const modalPid = searchParams.get('product') || null;

  const updateFilterParam = (updates) => {
    const next = new URLSearchParams(searchParams);
    const paramMap = {
      search: ['q', ''],
      category: ['cat', 'all'],
      purpose: ['purpose', 'all'],
      delivery: ['delivery', 'all'],
      region: ['region', 'all'],
      cert: ['cert', 'all'],
      priceRange: ['price', 'all'],
      shop: ['shop', ''],
      sort: ['sort', 'popular'],
    };

    Object.entries(updates).forEach(([k, val]) => {
      const [paramName, defaultVal] = paramMap[k] || [k, ''];
      if (!val || val === defaultVal) next.delete(paramName);
      else next.set(paramName, val);
    });

    if (regionSlug) {
      if (updates.region === 'all') {
        const qs = next.toString();
        navigate(`/san-pham${qs ? `?${qs}` : ''}`, { replace: true });
        return;
      }
      if (updates.region && updates.region !== regionHub?.region) {
        const newHub = getRegionHubBySlugOrName(updates.region);
        next.delete('region');
        const qs = next.toString();
        navigate(`${newHub ? `/vung/${newHub.slug}` : '/san-pham'}${qs ? `?${qs}` : ''}`, { replace: true });
        return;
      }
    }

    setSearchParams(next, { replace: true });
  };

  const resetAll = () => {
    if (regionSlug) {
      navigate('/san-pham', { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  const counts = useMemo(
    () => ({
      all: products.length,
      seasonal: products.filter((p) => getProductMeta(p).isSeasonal).length,
      fresh: products.filter((p) => p.category === 'fresh').length,
      dry: products.filter((p) => p.category === 'dry').length,
      drink: products.filter((p) => p.category === 'drink').length,
      spice: products.filter((p) => getProductMeta(p).isSpice).length,
      ocop4: products.filter((p) => p.isOcop4).length,
      gift: products.filter((p) => p.isGift).length,
      healthy: products.filter((p) => getProductMeta(p).isHealthy).length,
      favorites: favorites.length,
    }),
    [favorites.length, products]
  );

  const filteredItems = useMemo(() => {
    const list = products.filter((p) => {
      const meta = getProductMeta(p);
      if (!matchesSearchQuery(p, filters.search)) return false;
      if (filters.category === 'fresh' && p.category !== 'fresh') return false;
      if (filters.category === 'dry' && p.category !== 'dry') return false;
      if (filters.category === 'drink' && p.category !== 'drink') return false;
      if (filters.category === 'spice' && !meta.isSpice) return false;
      if (filters.category === 'seasonal' && !meta.isSeasonal) return false;
      if (filters.category === 'ocop4' && !p.isOcop4) return false;
      if (filters.category === 'gift' && !p.isGift) return false;
      if (filters.category === 'healthy' && !meta.isHealthy) return false;
      if (filters.category === 'favorites' && !favorites.includes(p.id)) return false;
      if (filters.purpose !== 'all' && !meta.purposes.includes(filters.purpose)) return false;
      if (filters.delivery !== 'all' && meta.delivery !== filters.delivery) return false;
      if (filters.region !== 'all' && p.region !== filters.region) return false;
      if (filters.cert !== 'all' && p.cert !== filters.cert) return false;
      if (filters.priceRange === 'under100' && p.price >= 100000) return false;
      if (filters.priceRange === '100to250' && (p.price < 100000 || p.price > 250000)) return false;
      if (filters.priceRange === 'over250' && p.price <= 250000) return false;
      if (filters.shop && p.shop !== filters.shop) return false;
      return true;
    });

    if (filters.sort === 'bestseller') return [...list].sort((a, b) => b.sold - a.sold);
    if (filters.sort === 'price-asc') return [...list].sort((a, b) => a.price - b.price);
    if (filters.sort === 'price-desc') return [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [favorites, filters, products]);

  useGSAP(
    () => {
      if (!hasAnimatedRef.current) {
        hasAnimatedRef.current = true;
        return;
      }
      const cards = gridRef.current?.querySelectorAll('article');
      if (!cards?.length) return;
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from(Array.from(cards).slice(0, 6), {
          opacity: 0,
          y: 10,
          duration: 0.28,
          stagger: 0.035,
          ease: 'power2.out',
          clearProps: 'transform,opacity',
        });
      });
      return () => mm.revert();
    },
    {
      scope: gridRef,
      dependencies: [
        filters.category,
        filters.purpose,
        filters.delivery,
        filters.region,
        filters.cert,
        filters.priceRange,
        filters.shop,
        filters.sort,
      ],
    }
  );

  const activeChips = [];
  if (filters.search.trim()) {
    activeChips.push({
      key: 'search',
      icon: 'search',
      label: `“${filters.search.trim()}”`,
      clear: () => updateFilterParam({ search: '' }),
    });
  }
  if (filters.category !== 'all') {
    activeChips.push({
      key: 'category',
      icon: null,
      label: `Danh mục: ${CATEGORY_LABELS[filters.category] || filters.category}`,
      clear: () => updateFilterParam({ category: 'all' }),
    });
  }
  if (filters.purpose !== 'all') {
    activeChips.push({
      key: 'purpose',
      icon: null,
      label: `Nhu cầu: ${PURPOSE_LABELS[filters.purpose] || filters.purpose}`,
      clear: () => updateFilterParam({ purpose: 'all' }),
    });
  }
  if (filters.region !== 'all') {
    activeChips.push({
      key: 'region',
      icon: 'pin',
      label: filters.region,
      clear: () => updateFilterParam({ region: 'all' }),
    });
  }
  if (filters.delivery !== 'all') {
    activeChips.push({
      key: 'delivery',
      icon: filters.delivery === 'same_day' ? 'zap' : 'package',
      label: filters.delivery === 'same_day' ? 'Hái sáng giao chiều' : 'Giao toàn quốc',
      clear: () => updateFilterParam({ delivery: 'all' }),
    });
  }
  if (filters.cert !== 'all') {
    activeChips.push({
      key: 'cert',
      icon: 'award',
      label: filters.cert,
      clear: () => updateFilterParam({ cert: 'all' }),
    });
  }
  if (filters.priceRange !== 'all') {
    activeChips.push({
      key: 'priceRange',
      icon: 'dollar',
      label: PRICE_LABELS[filters.priceRange] || filters.priceRange,
      clear: () => updateFilterParam({ priceRange: 'all' }),
    });
  }

  const hasSearchOrBloat =
    Boolean(filters.search.trim()) ||
    Boolean(searchParams.get('sort')) ||
    Boolean(searchParams.get('price')) ||
    Boolean(searchParams.get('product')) ||
    Boolean(searchParams.get('shop')) ||
    filters.category === 'favorites';

  const activeRegionHub = regionHub || (filters.region !== 'all' ? getRegionHubBySlugOrName(filters.region) : null);
  const seoTitle = activeRegionHub && !hasSearchOrBloat
    ? `${activeRegionHub.title} – Chợ OCOP Thanh Niên Đồng Nai`
    : 'Sàn Nông Sản – Chợ OCOP Thanh Niên Đồng Nai';
  const seoDescription = activeRegionHub && !hasSearchOrBloat
    ? activeRegionHub.description
    : 'Sàn nông sản OCOP Đồng Nai với 10 danh mục chi tiết, bộ lọc 5 chiều, yêu thích và hồ sơ minh bạch Nguồn gốc – Kiểm định.';
  const canonicalPath = activeRegionHub && !hasSearchOrBloat
    ? `/vung/${activeRegionHub.slug}`
    : '/san-pham';
  const robotsRule = hasSearchOrBloat ? 'noindex, follow' : 'index, follow, max-image-preview:large';

  const seoJsonLd = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const crumbs = [
      { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: `${origin}/` },
      { '@type': 'ListItem', position: 2, name: 'Sàn nông sản', item: `${origin}/san-pham` },
    ];
    if (activeRegionHub) {
      crumbs.push({
        '@type': 'ListItem',
        position: 3,
        name: activeRegionHub.region,
        item: `${origin}/vung/${activeRegionHub.slug}`,
      });
    }
    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'CollectionPage',
          name: seoTitle,
          description: seoDescription,
          url: `${origin}${canonicalPath}`,
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: crumbs,
        },
        {
          '@type': 'ItemList',
          numberOfItems: filteredItems.length,
          itemListElement: filteredItems.slice(0, 12).map((p, idx) => ({
            '@type': 'ListItem',
            position: idx + 1,
            name: p.name,
            url: `${origin}${getProductUrl(p)}`,
          })),
        },
      ],
    };
  }, [activeRegionHub, canonicalPath, filteredItems, seoDescription, seoTitle]);

  const modalProduct = modalPid ? products.find((x) => x.id === modalPid) || null : null;

  return (
    <>
      <SeoHead
        title={seoTitle}
        description={seoDescription}
        keywords={activeRegionHub?.keywords || 'Sàn nông sản OCOP Đồng Nai, bưởi Tân Triều, chôm chôm Long Khánh'}
        canonicalPath={canonicalPath}
        robots={robotsRule}
        jsonLd={seoJsonLd}
      />

      <section className="bg-white border-b border-forest-dark/10">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {CATEGORY_TABS.map((tab) => {
            const active = filters.category === tab.key;
            const isHot = tab.key === 'seasonal';
            const isFav = tab.key === 'favorites';
            let cls =
              'cat-btn shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs sm:text-sm font-semibold bg-mint text-forest-dark hover:bg-forest/15';
            let countCls = 'text-[10px] px-1.5 py-0.5 rounded-full bg-forest/10';
            if (active) {
              cls =
                'cat-btn shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs sm:text-sm font-bold bg-forest-dark text-white shadow-sm';
              countCls = 'text-[10px] px-1.5 py-0.5 rounded-full bg-white/20';
            } else if (isHot) {
              cls =
                'cat-btn shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs sm:text-sm font-semibold bg-sale/10 text-sale hover:bg-sale hover:text-white';
              countCls = 'text-[10px] px-1.5 py-0.5 rounded-full bg-sale/15';
            } else if (isFav) {
              cls =
                'cat-btn shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs sm:text-sm font-semibold bg-bgsoft text-forest-dark hover:bg-sale/10 hover:text-sale';
              countCls = 'text-[10px] px-1.5 py-0.5 rounded-full bg-sale/15 text-sale';
            }

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => updateFilterParam({ category: tab.key })}
                className={cls}
              >
                <OcopIcon name={tab.icon} className="w-4 h-4" />
                <span>{tab.label}</span>
                <span className={countCls}>{counts[tab.key] ?? 0}</span>
              </button>
            );
          })}
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-5 sm:py-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-forest">
              <OcopIcon name="basket" className="w-4 h-4" />
              <span>Sàn Nông Sản Xanh Đồng Nai</span>
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-forest-dark mt-0.5">
              {regionHub ? `${regionHub.region} • Đặc Sản Chuẩn OCOP Tại Vườn` : 'Khám Phá Đặc Sản Chuẩn OCOP Tại Vườn'}
            </h1>
          </div>
          <Link
            to="/dang-ban-ai"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-harvest-light hover:bg-amber-200 text-harvest-dark font-extrabold text-xs sm:text-sm border border-harvest/25"
          >
            <OcopIcon name="sparkles" className="w-4 h-4" />
            <span>Nhà nông đăng bán bằng AI</span>
            <OcopIcon name="arrow-right" className="w-4 h-4" />
          </Link>
        </div>

        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <aside className="lg:col-span-3 bg-white rounded-panel p-5 border border-forest-dark/10 shadow-soft lg:sticky lg:top-32 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-forest-dark/10">
              <h2 className="font-extrabold text-forest-dark inline-flex items-center gap-1.5">
                <OcopIcon name="sliders" className="w-4 h-4 text-forest" />
                <span>Bộ Lọc Chi Tiết</span>
              </h2>
              <button type="button" id="btn-reset-filters" onClick={resetAll} className="text-xs font-bold text-sale hover:underline">
                Xóa lọc
              </button>
            </div>

            <div>
              <div className="text-xs font-extrabold uppercase tracking-wider text-forest-dark/60 mb-2 inline-flex items-center gap-1">
                <OcopIcon name="compass" className="w-3.5 h-3.5 text-forest" />
                <span>Nhu cầu sử dụng</span>
              </div>
              <div className="flex lg:flex-col gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {PURPOSE_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => updateFilterParam({ purpose: opt.key })}
                    className={`purpose-filter shrink-0 inline-flex items-center gap-1.5 text-left px-3 py-2 rounded-xl text-sm ${
                      filters.purpose === opt.key
                        ? 'font-bold bg-forest-dark text-white'
                        : 'font-semibold bg-bgsoft text-forest-dark hover:bg-mint'
                    }`}
                  >
                    {opt.icon ? <OcopIcon name={opt.icon} className="w-4 h-4" /> : null}
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-extrabold uppercase tracking-wider text-forest-dark/60 mb-2 inline-flex items-center gap-1">
                <OcopIcon name="pin" className="w-3.5 h-3.5 text-sale" />
                <span>Vùng trồng</span>
              </div>
              <div className="flex lg:flex-col gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {REGION_OPTIONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => updateFilterParam({ region: r })}
                    className={`region-filter shrink-0 text-left px-3 py-2 rounded-xl text-sm ${
                      filters.region === r
                        ? 'font-bold bg-forest-dark text-white'
                        : 'font-semibold bg-bgsoft text-forest-dark hover:bg-mint'
                    }`}
                  >
                    {r === 'all' ? 'Tất cả vùng' : r}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-extrabold uppercase tracking-wider text-forest-dark/60 mb-2 inline-flex items-center gap-1">
                <OcopIcon name="truck" className="w-3.5 h-3.5 text-forest" />
                <span>Giao hàng &amp; Độ tươi</span>
              </div>
              <div className="flex lg:flex-col gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {DELIVERY_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => updateFilterParam({ delivery: opt.key })}
                    className={`delivery-filter shrink-0 inline-flex items-center gap-1.5 text-left px-3 py-2 rounded-xl text-sm ${
                      filters.delivery === opt.key
                        ? 'font-bold bg-forest-dark text-white'
                        : 'font-semibold bg-bgsoft text-forest-dark hover:bg-mint'
                    }`}
                  >
                    {opt.icon ? <OcopIcon name={opt.icon} className="w-4 h-4" /> : null}
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-extrabold uppercase tracking-wider text-forest-dark/60 mb-2 inline-flex items-center gap-1">
                <OcopIcon name="award" className="w-3.5 h-3.5 text-sunny" />
                <span>Chứng nhận</span>
              </div>
              <div className="flex lg:flex-col gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {CERT_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => updateFilterParam({ cert: opt.key })}
                    className={`cert-filter shrink-0 inline-flex items-center gap-1.5 text-left px-3 py-2 rounded-xl text-sm ${
                      filters.cert === opt.key
                        ? 'font-bold bg-forest-dark text-white'
                        : 'font-semibold bg-bgsoft text-forest-dark hover:bg-mint'
                    }`}
                  >
                    {opt.icon ? <OcopIcon name={opt.icon} className="w-4 h-4" /> : null}
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-extrabold uppercase tracking-wider text-forest-dark/60 mb-2 inline-flex items-center gap-1">
                <OcopIcon name="dollar" className="w-3.5 h-3.5 text-harvest" />
                <span>Khoảng giá</span>
              </div>
              <div className="flex lg:flex-col gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {PRICE_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => updateFilterParam({ priceRange: opt.key })}
                    className={`price-filter shrink-0 text-left px-3 py-2 rounded-xl text-sm ${
                      filters.priceRange === opt.key
                        ? 'font-bold bg-forest-dark text-white'
                        : 'font-semibold bg-bgsoft text-forest-dark hover:bg-mint'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <div className="lg:col-span-9 space-y-4">
            {filters.shop ? (
              <div id="active-shop-banner" className="bg-mint border-2 border-forest/25 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
                <div className="text-sm font-bold text-forest-dark inline-flex items-center gap-1.5">
                  <OcopIcon name="store" className="w-4 h-4 text-forest" />
                  <span>
                    Gian hàng: <span id="active-shop-name" className="text-forest">{filters.shop}</span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => updateFilterParam({ shop: '' })}
                  className="px-3 py-1 rounded-lg bg-white text-xs font-extrabold text-sale border border-sale/25"
                >
                  Xem tất cả sàn
                </button>
              </div>
            ) : null}

            {activeChips.length > 0 ? (
              <div id="active-filters-bar" className="flex flex-wrap items-center gap-2 bg-white rounded-2xl px-4 py-2.5 border border-forest-dark/10 shadow-soft text-xs">
                <span className="font-bold text-forest-dark/60">Đang lọc:</span>
                {activeChips.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={chip.clear}
                    className="chip-rm inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-mint hover:bg-sale/10 text-forest-dark hover:text-sale font-bold border border-forest/20"
                  >
                    {chip.icon ? <OcopIcon name={chip.icon} className="w-3.5 h-3.5" /> : null}
                    <span>{chip.label}</span>
                    <OcopIcon name="x" className="w-3 h-3" />
                  </button>
                ))}
                <button type="button" onClick={resetAll} className="ml-auto text-sale font-extrabold hover:underline">
                  Xóa tất cả
                </button>
              </div>
            ) : null}

            <div className="bg-white rounded-2xl px-4 py-3 border border-forest-dark/10 shadow-soft flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                <span className="text-xs font-bold text-forest-dark/60 shrink-0">Sắp xếp:</span>
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => updateFilterParam({ sort: opt.key })}
                    className={`sort-btn shrink-0 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm ${
                      filters.sort === opt.key
                        ? 'font-bold bg-forest-dark text-white'
                        : 'font-semibold bg-bgsoft text-forest-dark'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div id="result-count" className="text-xs font-bold text-forest-dark/65">
                Hiển thị {filteredItems.length} nông sản
              </div>
            </div>

            <div ref={gridRef} id="products-grid" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {!filteredItems.length ? (
                <div className="col-span-full bg-white rounded-panel p-10 text-center border border-forest-dark/10">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-mint text-forest flex items-center justify-center mb-3">
                    <OcopIcon name={filters.category === 'favorites' ? 'healthy' : 'search'} className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-extrabold text-forest-dark mb-1">Không tìm thấy nông sản phù hợp</h3>
                  <p className="text-sm text-forest-dark/70 mb-4">Bạn hãy thử đổi từ khóa hoặc xóa bớt bộ lọc nhé.</p>
                  <button type="button" onClick={resetAll} className="px-5 py-2.5 rounded-xl bg-forest-dark text-white text-sm font-bold">
                    Xem lại toàn bộ sàn
                  </button>
                </div>
              ) : (
                filteredItems.map((p) => {
                  const meta = getProductMeta(p);
                  const isFav = favorites.includes(p.id);
                  const lot = getProductLotCode(p);
                  const detailUrl = getProductUrl(p);
                  return (
                    <article
                      key={p.id}
                      className="group bg-white rounded-card border border-forest-dark/10 shadow-soft hover:shadow-hover hover:-translate-y-1 transition-all overflow-hidden flex flex-col"
                    >
                      <div className="relative">
                        <Link to={detailUrl} className="block" aria-label={p.name}>
                          <ProductImage product={p} heightClass="h-48" />
                        </Link>
                        <div className="absolute top-2.5 left-2.5 right-12 flex flex-wrap gap-1.5 pointer-events-none">
                          <span className="inline-flex items-center gap-1 bg-sunny text-forest-dark text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg">
                            <OcopIcon name="star-filled" className="w-3 h-3" />
                            <span>{p.cert}</span>
                          </span>
                          {p.aiGenerated ? (
                            <span className="inline-flex items-center gap-1 bg-forest text-white text-[11px] font-extrabold px-2 py-0.5 rounded-lg">
                              <OcopIcon name="sparkles" className="w-3 h-3" />
                              <span>Chuẩn hóa AI</span>
                            </span>
                          ) : null}
                          {p.discount > 0 ? (
                            <span className="bg-sale text-white text-[11px] font-extrabold px-2 py-0.5 rounded-lg">
                              -{p.discount}%
                            </span>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          aria-label={isFav ? `Bỏ thích ${p.name}` : `Lưu yêu thích ${p.name}`}
                          onClick={() => toggleFavorite(p.id)}
                          className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full ${
                            isFav ? 'bg-sale text-white' : 'bg-white/90 text-forest-dark/70 hover:text-sale'
                          } shadow-sm flex items-center justify-center`}
                        >
                          <OcopIcon name={isFav ? 'heart-filled' : 'healthy'} className="w-4 h-4" />
                        </button>
                        <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 bg-black/55 text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-full pointer-events-none">
                          <OcopIcon name="pin" className="w-3 h-3 text-sunny" />
                          <span>{p.region}</span>
                        </span>
                        <Link
                          to={`/truy-xuat?code=${encodeURIComponent(lot)}`}
                          className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 bg-white/95 hover:bg-forest-dark hover:text-sunny text-forest-dark text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-sm"
                        >
                          <OcopIcon name="shield-check" className="w-3 h-3 text-forest" />
                          <span>Truy xuất QR</span>
                        </Link>
                      </div>
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-1 text-[11px] font-bold text-forest mb-1 truncate">
                            <span className="w-3.5 h-3.5 rounded-full bg-forest text-white inline-flex items-center justify-center shrink-0">
                              <OcopIcon name="check" className="w-2.5 h-2.5" />
                            </span>
                            <span className="truncate">{p.shop}</span>
                          </div>
                          <Link
                            to={detailUrl}
                            className="block text-sm sm:text-base font-extrabold text-forest-dark line-clamp-2 hover:text-forest mb-1.5 min-h-[42px]"
                          >
                            {p.name}
                          </Link>
                          <div className="inline-flex items-center gap-1.5 bg-mint/90 text-forest-dark text-[11px] font-bold px-2.5 py-1 rounded-lg border border-forest/15 mb-2.5 max-w-full">
                            <OcopIcon name={meta.highlightIcon || 'leaf'} className="w-3.5 h-3.5 text-forest shrink-0" />
                            <span className="truncate">{meta.highlight}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-forest-dark/70 mb-3">
                            <span className="font-bold text-sunny inline-flex items-center gap-1">
                              <OcopIcon name="star-filled" className="w-3.5 h-3.5" />
                              <span>{p.rating}</span>
                            </span>
                            <span>Đã bán {p.soldText}</span>
                          </div>
                        </div>
                        <div className="pt-3 border-t border-forest-dark/10">
                          <div className="flex items-baseline gap-2 mb-3">
                            <span className="text-lg font-extrabold text-sale">{formatVND(p.price)}</span>
                            {p.oldPrice > p.price ? (
                              <span className="text-xs text-forest-dark/45 line-through">{formatVND(p.oldPrice)}</span>
                            ) : null}
                          </div>
                          <div className="flex gap-2">
                            <Link
                              to={detailUrl}
                              className="flex-1 text-center py-2 rounded-xl bg-mint hover:bg-forest/15 text-forest-dark text-xs font-bold"
                            >
                              Chi tiết
                            </Link>
                            <button
                              type="button"
                              onClick={() => addToCart(p.id)}
                              className="flex-1 py-2 rounded-xl bg-forest-dark hover:bg-forest text-white text-xs font-extrabold"
                            >
                              + Giỏ
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </div>
        </section>
      </main>

      <ProductQuickModal
        product={modalProduct}
        onClose={() => {
          const next = new URLSearchParams(searchParams);
          if (next.has('product')) {
            next.delete('product');
            setSearchParams(next, { replace: true });
          }
        }}
      />
    </>
  );
}
