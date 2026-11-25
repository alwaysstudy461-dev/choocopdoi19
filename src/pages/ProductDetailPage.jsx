import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import OcopIcon from '../components/OcopIcon.jsx';
import ProductImage, { normalizeAssetPath } from '../components/ProductImage.jsx';
import SeoHead from '../components/SeoHead.jsx';
import { useOcop } from '../context/OcopContext.jsx';
import {
  formatVND,
  getProductBySlugOrId,
  getProductDetailData,
  getProductUrl,
  getRegionHubBySlugOrName,
} from '../utils/format.js';
import { gsap, isReducedMotion, useGSAP } from '../utils/gsapConfig.js';
import { dictateToValue } from '../utils/speech.js';

function StarRow({ score, className = 'w-4 h-4' }) {
  const full = Math.max(1, Math.min(5, Math.round(Number(score) || 5)));
  return (
    <span className="inline-flex items-center gap-0.5 text-sunny" aria-label={`${full} trên 5 sao`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <OcopIcon key={i} name={i <= full ? 'star-filled' : 'star-outline'} className={className} />
      ))}
    </span>
  );
}

export default function ProductDetailPage() {
  const { slug: routeSlug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    products,
    favorites,
    reviewsByProduct,
    user,
    toggleFavorite,
    addToCart,
    addProductReview,
    openAiAssistant,
    speakVietnamese,
    showToast,
  } = useOcop();

  const queryKey =
    routeSlug ||
    searchParams.get('slug') ||
    searchParams.get('id') ||
    searchParams.get('product') ||
    'buoi-duong-la-cam';
  const currentProduct = useMemo(() => getProductBySlugOrId(products, queryKey), [products, queryKey]);

  const initialTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(
    initialTab === 'trace' || initialTab === 'reviews' ? initialTab : 'desc'
  );
  const [currentVariantIdx, setCurrentVariantIdx] = useState(0);
  const [currentQty, setCurrentQty] = useState(1);
  const [selectedThumbIdx, setSelectedThumbIdx] = useState(0);
  const [reviewRatingInput, setReviewRatingInput] = useState(5);
  const [revName, setRevName] = useState(user?.name || '');
  const [revNameDirty, setRevNameDirty] = useState(false);
  const [revText, setRevText] = useState('');
  const tabsRef = useRef(null);
  const tabsContentRef = useRef(null);
  const mainImgRef = useRef(null);
  const firstTabMountRef = useRef(true);
  const firstThumbMountRef = useRef(true);

  useEffect(() => {
    setCurrentVariantIdx(0);
    setCurrentQty(1);
    setSelectedThumbIdx(0);
  }, [currentProduct?.id]);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'trace' || t === 'reviews' || t === 'desc') setActiveTab(t);
  }, [searchParams]);

  useEffect(() => {
    if (!revNameDirty && user?.name) setRevName(user.name);
  }, [revNameDirty, user?.name]);

  useGSAP(
    () => {
      if (firstTabMountRef.current) {
        firstTabMountRef.current = false;
        return;
      }
      if (!tabsContentRef.current || isReducedMotion()) return;
      gsap.fromTo(
        tabsContentRef.current,
        { opacity: 0.4, y: 8 },
        { opacity: 1, y: 0, duration: 0.24, ease: 'power2.out', clearProps: 'transform,opacity' }
      );
    },
    { dependencies: [activeTab] }
  );

  useGSAP(
    () => {
      if (firstThumbMountRef.current) {
        firstThumbMountRef.current = false;
        return;
      }
      if (!mainImgRef.current || isReducedMotion()) return;
      gsap.fromTo(
        mainImgRef.current,
        { opacity: 0.55, scale: 0.985 },
        { opacity: 1, scale: 1, duration: 0.25, ease: 'power2.out', clearProps: 'transform,opacity' }
      );
    },
    { dependencies: [selectedThumbIdx] }
  );

  const customReviews =
    currentProduct && Array.isArray(reviewsByProduct[currentProduct.id])
      ? reviewsByProduct[currentProduct.id]
      : [];

  const detail = useMemo(
    () => (currentProduct ? getProductDetailData(currentProduct, customReviews) : null),
    [currentProduct, customReviews]
  );

  const relatedProducts = useMemo(() => {
    if (!currentProduct) return [];
    const all = products.filter((p) => p.id !== currentProduct.id);
    const sameCat = all.filter((p) => p.category === currentProduct.category);
    const others = all.filter((p) => p.category !== currentProduct.category);
    return [...sameCat, ...others].slice(0, 5);
  }, [currentProduct, products]);

  const productJsonLd = useMemo(() => {
    if (!currentProduct || !detail) return null;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const imgUrl = normalizeAssetPath(currentProduct.image) || '/images/chom-chom.jpg';
    const fullImg = imgUrl.startsWith('http') ? imgUrl : `${origin}${imgUrl}`;
    const canonicalUrl = `${origin}${getProductUrl(currentProduct)}`;

    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: `${origin}/` },
            { '@type': 'ListItem', position: 2, name: detail.categoryName, item: `${origin}/san-pham?cat=${encodeURIComponent(currentProduct.category)}` },
            { '@type': 'ListItem', position: 3, name: currentProduct.name, item: canonicalUrl },
          ],
        },
        {
          '@type': 'Product',
          name: currentProduct.name,
          image: [fullImg],
          description: `${detail.verdict} ${currentProduct.story}`,
          sku: detail.trace.traceCode,
          mpn: detail.trace.batchCode,
          category: detail.categoryName,
          brand: { '@type': 'Brand', name: currentProduct.shop },
          offers: {
            '@type': 'Offer',
            url: canonicalUrl,
            priceCurrency: 'VND',
            price: String(currentProduct.price),
            availability: 'https://schema.org/InStock',
            itemCondition: 'https://schema.org/NewCondition',
            seller: { '@type': 'Organization', name: currentProduct.shop },
          },
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: String(currentProduct.rating),
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
        },
      ],
    };
  }, [currentProduct, detail]);

  if (!currentProduct || !detail) {
    return (
      <>
        <SeoHead
          title="Không tìm thấy sản phẩm – Chợ OCOP Thanh Niên Đồng Nai"
          description="Sản phẩm không tồn tại hoặc đã được gỡ khỏi Chợ OCOP Thanh Niên Đồng Nai."
          canonicalPath="/san-pham"
          robots="noindex, follow"
        />
        <main className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6">
          <section id="detailLayout">
            <div className="bg-white rounded-panel p-12 text-center border border-forest-dark/10 shadow-soft">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-mint text-forest flex items-center justify-center mb-3">
                <OcopIcon name="search" className="w-8 h-8" />
              </div>
              <h1 className="text-xl font-extrabold text-forest-dark mb-1">Không tìm thấy sản phẩm này</h1>
              <p className="text-sm text-forest-dark/70 mb-5">Sản phẩm có thể đã đổi tên hoặc chưa được đăng tải.</p>
              <Link to="/san-pham" className="inline-block px-5 py-2.5 rounded-xl bg-forest-dark text-white font-extrabold text-sm">
                ← Quay lại Sàn nông sản
              </Link>
            </div>
          </section>
        </main>
      </>
    );
  }

  const p = currentProduct;
  const galleryList =
    Array.isArray(p.gallery) && p.gallery.length
      ? p.gallery.map(normalizeAssetPath)
      : p.image
        ? [normalizeAssetPath(p.image), '/images/vuon-dong-nai-live.jpg', '/images/qua-bieu-ocop.jpg']
        : [];
  const photoLabels = ['Ảnh sản phẩm', 'Tại vườn', 'Đóng gói', 'Quà OCOP'];
  const thumbItems = galleryList.slice(0, 3).map((src, i) => ({
    type: 'img',
    val: src,
    caption: i === 0 ? p.name : `${p.shop} • ${p.region}`,
    label: photoLabels[i] || 'Ảnh thật',
  }));
  thumbItems.push({
    type: 'icon',
    val: 'qr',
    caption: `Tem QR xác thực #${detail.trace.traceCode} • ${p.cert}`,
    label: 'Tem QR',
  });

  const activeThumb = thumbItems[selectedThumbIdx] || thumbItems[0];
  const v = p.variants[currentVariantIdx] || p.variants[0];
  const curPrice = Math.round(p.price * v.multiplier);
  const oldPrice = p.oldPrice > p.price ? Math.round(p.oldPrice * v.multiplier) : 0;
  const isFav = favorites.includes(p.id);
  const regionHub = getRegionHubBySlugOrName(p.region);

  const jumpToTab = (tabId) => {
    setActiveTab(tabId);
    tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleReviewSubmit = (e) => {
    e.preventDefault();
    const text = revText.trim();
    const who = revName.trim() || 'Khách hàng Chợ OCOP';
    if (text.length < 4) {
      showToast('Hãy nhập nhận xét ngắn gọn nhé!', 'alert');
      return;
    }
    addProductReview(p.id, {
      user: who,
      rating: reviewRatingInput,
      date: 'Vừa xong',
      text,
    });
    setRevText('');
    showToast('Cảm ơn bạn đã gửi đánh giá!', 'star-filled');
  };

  return (
    <>
      <SeoHead
        title={`${p.name} – Chợ OCOP Đồng Nai`}
        description={`${detail.verdict} Giá tận vườn ${formatVND(p.price)}, chuẩn ${p.cert}, truy xuất nguồn gốc QR tại ${p.shop}.`}
        keywords={`${p.name}, ${p.region}, ${p.cert}, ${p.shop}, Chợ OCOP Đồng Nai`}
        canonicalPath={getProductUrl(p)}
        image={normalizeAssetPath(p.image) || '/images/chom-chom.jpg'}
        type="product"
        productMeta={{ price: p.price, currency: 'VND', availability: 'in stock' }}
        jsonLd={productJsonLd}
      />

      <main className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6">
        <section id="detailLayout">
          <nav aria-label="Breadcrumb" className="text-xs text-forest-dark/55 mb-4 flex items-center gap-1.5 flex-wrap font-semibold">
            <Link to="/" className="hover:text-forest">Trang chủ</Link>
            <span>›</span>
            <Link to={`/san-pham?cat=${encodeURIComponent(p.category)}`} className="hover:text-forest">
              {detail.categoryName}
            </Link>
            {regionHub ? (
              <>
                <span>›</span>
                <Link to={`/vung/${regionHub.slug}`} className="hover:text-forest">
                  {p.region}
                </Link>
              </>
            ) : null}
            <span>›</span>
            <span className="text-forest-dark font-bold">{p.name}</span>
          </nav>

          <div className="bg-white rounded-panel p-4 sm:p-6 border border-forest-dark/10 shadow-soft">
            <div className="flex flex-col md:flex-row gap-5 md:gap-8">
              <div className="md:w-[390px] lg:w-[420px] shrink-0">
                <div ref={mainImgRef} className="aspect-square rounded-2xl overflow-hidden mb-3 border border-forest-dark/10 bg-mint/40 relative" id="mainImg">
                  {activeThumb?.type === 'img' ? (
                    <img
                      src={activeThumb.val}
                      alt={p.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : activeThumb ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-mint via-white to-harvest-light/40">
                      <div className="w-24 h-24 rounded-2xl bg-white/90 text-forest-dark border border-forest/20 shadow-sm flex items-center justify-center mb-3">
                        <OcopIcon name={activeThumb.val} className="w-14 h-14" />
                      </div>
                      <span className="text-xs sm:text-sm font-extrabold text-forest-dark bg-white/90 px-3.5 py-1.5 rounded-full border border-forest/15 shadow-sm">
                        {activeThumb.caption || p.name}
                      </span>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-forest bg-mint">
                      <OcopIcon name={p.icon || p.emoji} className="w-20 h-20" />
                    </div>
                  )}
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1" id="thumbs">
                  {thumbItems.map((t, idx) => {
                    const activeCls =
                      idx === selectedThumbIdx
                        ? 'border-forest ring-2 ring-forest/25'
                        : 'border-forest-dark/15 hover:border-forest/60';
                    if (t.type === 'img') {
                      return (
                        <button
                          key={`${t.label}-${idx}`}
                          type="button"
                          onClick={() => setSelectedThumbIdx(idx)}
                          className={`relative shrink-0 w-16 h-16 sm:w-[74px] sm:h-[74px] rounded-xl border-2 ${activeCls} overflow-hidden bg-white transition-all`}
                        >
                          <img src={t.val} alt={t.label} className="w-full h-full object-cover" />
                          <span className="absolute bottom-0 inset-x-0 bg-black/55 text-white text-[8px] font-bold py-0.5 text-center truncate">
                            {t.label}
                          </span>
                        </button>
                      );
                    }
                    return (
                      <button
                        key={`${t.label}-${idx}`}
                        type="button"
                        onClick={() => setSelectedThumbIdx(idx)}
                        className={`shrink-0 w-16 h-16 sm:w-[74px] sm:h-[74px] rounded-xl border-2 ${activeCls} bg-mint/60 flex flex-col items-center justify-center gap-1 transition-all text-forest-dark`}
                      >
                        <OcopIcon name={t.val} className="w-6 h-6 text-forest" />
                        <span className="text-[9px] font-bold text-forest-dark/70">{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex-1 min-w-0" id="detailInfo">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-mint text-forest text-xs font-extrabold rounded-lg border border-forest/20">
                      <OcopIcon name="star-filled" className="w-3.5 h-3.5 text-sunny" />
                      <span>{p.cert}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-50 text-sky-700 text-xs font-extrabold rounded-lg border border-sky-200">
                      <OcopIcon name="shield-check" className="w-3.5 h-3.5" />
                      <span>QR truy xuất</span>
                      <OcopIcon name="check" className="w-3 h-3" />
                    </span>
                    {p.aiGenerated ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-harvest-light text-harvest-dark text-xs font-extrabold rounded-lg">
                        <OcopIcon name="sparkles" className="w-3.5 h-3.5" />
                        <span>Chuẩn hóa AI</span>
                      </span>
                    ) : null}
                    {detail.meta.isSeasonal ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-sale/10 text-sale text-xs font-extrabold rounded-lg">
                        <OcopIcon name="flame" className="w-3.5 h-3.5" />
                        <span>Đang rộ mùa</span>
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openAiAssistant(`Tư vấn chi tiết về ${p.name}`)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-harvest-light hover:bg-harvest hover:text-white text-harvest-dark text-xs font-extrabold border border-harvest/25 transition-colors"
                      title="Hỏi Trợ lý AI về sản phẩm này"
                    >
                      <OcopIcon name="sparkles" className="w-3.5 h-3.5" />
                      <span>Hỏi AI</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        speakVietnamese(`${p.name}, quy cách ${v.label}, giá ${formatVND(curPrice)}. Kết luận nhanh: ${detail.verdict}`)
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-mint hover:bg-forest hover:text-white text-forest-dark text-xs font-extrabold border border-forest/20 transition-colors"
                      title="Nghe đọc kết luận sản phẩm"
                    >
                      <OcopIcon name="volume" className="w-3.5 h-3.5" />
                      <span>Nghe</span>
                    </button>
                    <button
                      type="button"
                      aria-label={isFav ? 'Bỏ lưu yêu thích' : 'Lưu yêu thích'}
                      onClick={() => toggleFavorite(p.id)}
                      className={`w-8 h-8 rounded-xl ${
                        isFav ? 'bg-sale text-white' : 'bg-bgsoft text-forest-dark/70 hover:bg-sale/10 hover:text-sale'
                      } flex items-center justify-center transition-colors`}
                      title="Lưu yêu thích"
                    >
                      <OcopIcon name={isFav ? 'heart-filled' : 'healthy'} className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h1 className="text-xl sm:text-2xl font-extrabold text-forest-dark leading-snug mb-2">{p.name}</h1>

                <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-forest-dark/70 mb-3.5">
                  <StarRow score={p.rating} className="w-4 h-4" />
                  <button type="button" onClick={() => jumpToTab('reviews')} className="font-bold text-forest-dark hover:text-forest hover:underline">
                    {p.rating}/5 ({detail.reviewCount} đánh giá)
                  </button>
                  <span className="text-forest-dark/25">|</span>
                  <span>
                    Đã bán <strong className="text-forest-dark">{p.soldText}</strong>
                  </span>
                  <span className="text-forest-dark/25">|</span>
                  <span className="inline-flex items-center gap-1">
                    <OcopIcon name="pin" className="w-3.5 h-3.5 text-sale" />
                    <strong className="text-forest-dark">{p.region}</strong>
                  </span>
                </div>

                <div className="bg-red-50/90 border border-sale/15 rounded-2xl px-4 py-3.5 mb-3.5 flex flex-wrap items-baseline gap-2.5">
                  <span className="text-2xl sm:text-3xl font-extrabold text-sale">{formatVND(curPrice)}</span>
                  {oldPrice > curPrice ? (
                    <span className="text-sm text-forest-dark/45 line-through">{formatVND(oldPrice)}</span>
                  ) : null}
                  {p.discount > 0 ? (
                    <span className="px-2 py-0.5 bg-sale text-white text-xs font-extrabold rounded-md">-{p.discount}%</span>
                  ) : null}
                  <span className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-forest">
                    <OcopIcon name="check" className="w-3.5 h-3.5" />
                    <span>Giá tận vườn không trung gian</span>
                  </span>
                </div>

                <div className="bg-mint/90 border-l-4 border-forest rounded-r-2xl px-3.5 py-2.5 mb-4">
                  <div className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-forest">
                    <OcopIcon name="pin" className="w-3.5 h-3.5" />
                    <span>Kết luận nhanh</span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-forest-dark leading-snug mt-0.5">{detail.verdict}</p>
                </div>

                <div className="bg-bgsoft rounded-2xl p-4 mb-4 border border-forest/15">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                    <p className="font-extrabold text-xs sm:text-sm text-forest-dark inline-flex items-center gap-1.5">
                      <OcopIcon name="link" className="w-4 h-4 text-forest" />
                      <span>Truy xuất nguồn gốc — Blockchain &amp; Đoàn TN Verified</span>
                    </p>
                    <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-forest bg-mint px-2 py-0.5 rounded-full">
                      <OcopIcon name="check" className="w-3 h-3" />
                      <span>Đã xác thực</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-forest-dark/80">
                    <div><strong className="text-forest-dark">Mã TXNG:</strong> {detail.trace.traceCode}</div>
                    <div><strong className="text-forest-dark">Lô SX:</strong> {detail.trace.batchCode}</div>
                    <div><strong className="text-forest-dark">Nguồn gốc:</strong> {detail.trace.originRegion}</div>
                    <div><strong className="text-forest-dark">Thu hoạch/NSX:</strong> {detail.trace.productionDate}</div>
                    <div><strong className="text-forest-dark">Bảo quản/HSD:</strong> {detail.trace.expiryDate}</div>
                    <div><strong className="text-forest-dark">Chứng nhận:</strong> {detail.trace.certifications.join(', ')}</div>
                  </div>
                  <div className="mt-2.5 pt-2.5 border-t border-forest-dark/10 flex flex-wrap items-center gap-3 text-xs">
                    <button type="button" onClick={() => jumpToTab('trace')} className="text-forest font-extrabold hover:underline">
                      Xem chi tiết chuỗi 5 bước →
                    </button>
                    <Link to={`/truy-xuat?code=${encodeURIComponent(detail.trace.traceCode)}`} className="text-harvest-dark font-extrabold hover:underline">
                      Mở Hộ chiếu QR →
                    </Link>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs sm:text-sm text-forest-dark/80 mb-4">
                  <p className="flex items-center gap-2">
                    <OcopIcon name="truck" className="w-4 h-4 text-forest shrink-0" />
                    <span>
                      {detail.meta.delivery === 'same_day'
                        ? 'Giao hàng nhanh 2h nội tỉnh Đồng Nai (hái sáng giao chiều)'
                        : 'Đóng gói chống sốc cẩn thận • Giao nhanh toàn quốc'}
                    </span>
                  </p>
                  <p className="flex items-center gap-2">
                    <OcopIcon name="refresh" className="w-4 h-4 text-forest shrink-0" />
                    <span>Đổi trả / bù hoàn miễn phí trong 7 ngày nếu không đúng cam kết</span>
                  </p>
                  <p className="flex items-center gap-2 flex-wrap">
                    <OcopIcon name="store" className="w-4 h-4 text-forest shrink-0" />
                    <span>
                      Bán bởi:{' '}
                      <Link to={`/san-pham?shop=${encodeURIComponent(p.shop)}`} className="text-forest font-extrabold hover:underline">
                        {p.shop}
                      </Link>
                    </span>
                  </p>
                </div>

                <div className="mb-4">
                  <div className="text-xs font-extrabold uppercase text-forest-dark/60 mb-1.5">
                    Chọn phân loại / quy cách:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {p.variants.map((vr, idx) => (
                      <button
                        key={vr.label}
                        type="button"
                        onClick={() => setCurrentVariantIdx(idx)}
                        className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border-2 transition-colors ${
                          idx === currentVariantIdx
                            ? 'border-forest-dark bg-forest-dark text-white shadow-sm'
                            : 'border-forest-dark/15 bg-white text-forest-dark hover:border-forest'
                        }`}
                      >
                        {vr.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span className="text-xs sm:text-sm font-bold text-forest-dark">Số lượng:</span>
                  <div className="inline-flex items-center border border-forest-dark/20 rounded-xl bg-white overflow-hidden">
                    <button
                      type="button"
                      aria-label="Giảm số lượng"
                      onClick={() => setCurrentQty((q) => Math.max(1, q - 1))}
                      className="w-9 h-9 text-lg font-bold text-forest-dark hover:bg-mint transition"
                    >
                      −
                    </button>
                    <div className="w-11 h-9 flex items-center justify-center text-sm font-extrabold border-x border-forest-dark/15" id="qtyValue">
                      {currentQty}
                    </div>
                    <button
                      type="button"
                      aria-label="Tăng số lượng"
                      onClick={() => setCurrentQty((q) => Math.min(detail.stock, q + 1))}
                      className="w-9 h-9 text-lg font-bold text-forest-dark hover:bg-mint transition"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-xs text-forest-dark/55 font-medium">
                    Còn <strong>{detail.stock}</strong> sản phẩm tại vườn
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => addToCart(p.id, currentVariantIdx, currentQty)}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-3.5 px-4 border-2 border-forest-dark text-forest-dark bg-mint/60 hover:bg-mint rounded-xl font-extrabold text-sm transition-colors"
                  >
                    <OcopIcon name="cart" className="w-4 h-4" />
                    <span>Thêm vào giỏ hàng</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      addToCart(p.id, currentVariantIdx, currentQty);
                      navigate('/don-hang?tab=cart');
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-3.5 px-4 bg-sale hover:bg-sale-hover text-white rounded-xl font-extrabold text-sm shadow-lg transition-colors"
                  >
                    <OcopIcon name="zap" className="w-4 h-4 text-sunny" />
                    <span>Mua ngay ({formatVND(curPrice * currentQty)})</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div id="tabsSection" ref={tabsRef} className="mt-6 bg-white rounded-panel border border-forest-dark/10 shadow-soft overflow-hidden">
            <div className="flex border-b border-forest-dark/10 overflow-x-auto no-scrollbar" id="tabsHeader" role="tablist">
              {[
                { id: 'desc', icon: 'file-text', label: 'Mô tả sản phẩm' },
                { id: 'trace', icon: 'link', label: 'Truy xuất (5 bước)' },
                { id: 'reviews', icon: 'star-filled', label: `Đánh giá (${detail.reviewCount})` },
              ].map((t) => {
                const isAct = t.id === activeTab;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={isAct}
                    onClick={() => setActiveTab(t.id)}
                    className={`inline-flex items-center gap-1.5 px-4 sm:px-6 py-3.5 text-xs sm:text-sm whitespace-nowrap border-b-2 transition-colors ${
                      isAct
                        ? 'border-forest-dark text-forest-dark font-extrabold bg-mint/40'
                        : 'border-transparent text-forest-dark/60 font-bold hover:text-forest-dark'
                    }`}
                  >
                    <OcopIcon name={t.icon} className={`w-4 h-4 ${t.id === 'reviews' ? 'text-sunny' : 'text-forest'}`} />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            <div ref={tabsContentRef} className="p-4 sm:p-6" id="tabsContent">
              {activeTab === 'desc' ? (
                <div id="pane-desc" className="space-y-4 text-sm text-forest-dark/85">
                  <div className="bg-mint/70 rounded-2xl p-4 border border-forest/15 space-y-2">
                    <div className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase text-forest">
                      <OcopIcon name="pin" className="w-3.5 h-3.5" />
                      <span>Tóm tắt đi thẳng vào kết luận</span>
                    </div>
                    <p className="font-extrabold text-forest-dark text-sm sm:text-base leading-snug">{detail.verdict}</p>
                    <ul className="space-y-1.5 pt-1 text-xs sm:text-sm">
                      {detail.bullets.map((b) => (
                        <li key={b} className="flex items-start gap-2">
                          <OcopIcon name="check" className="w-4 h-4 text-forest shrink-0 mt-0.5" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p className="leading-relaxed text-xs sm:text-sm text-forest-dark/80">{p.story}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs sm:text-sm pt-2 border-t border-forest-dark/10">
                    <div className="bg-bgsoft rounded-xl p-3 flex items-center gap-2">
                      <OcopIcon name="pin" className="w-4 h-4 text-sale shrink-0" />
                      <span><strong>Xuất xứ:</strong> {detail.trace.originRegion}</span>
                    </div>
                    <div className="bg-bgsoft rounded-xl p-3 flex items-center gap-2">
                      <OcopIcon name="home" className="w-4 h-4 text-forest shrink-0" />
                      <span><strong>Nhà cung cấp:</strong> {p.shop}</span>
                    </div>
                    <div className="bg-bgsoft rounded-xl p-3 flex items-center gap-2">
                      <OcopIcon name="award" className="w-4 h-4 text-sunny shrink-0" />
                      <span><strong>Chứng nhận:</strong> {detail.trace.certifications.join(', ')}</span>
                    </div>
                    <div className="bg-bgsoft rounded-xl p-3 flex items-center gap-2">
                      <OcopIcon name="handshake" className="w-4 h-4 text-forest shrink-0" />
                      <span><strong>Đơn vị xác thực:</strong> {detail.trace.verifier}</span>
                    </div>
                  </div>
                </div>
              ) : null}

              {activeTab === 'trace' ? (
                <div id="pane-trace" className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-bgsoft rounded-xl p-3.5 border border-forest-dark/10 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-forest-dark">Blockchain Hash:</strong>
                      <code className="bg-white border border-forest-dark/15 px-2.5 py-0.5 rounded font-mono text-[11px] text-forest-dark">
                        {detail.trace.blockchainHash}
                      </code>
                      <span className="inline-flex items-center gap-1 text-forest font-extrabold">
                        <OcopIcon name="check" className="w-3.5 h-3.5" />
                        <span>Verified</span>
                      </span>
                    </div>
                    <Link
                      to={`/truy-xuat?code=${encodeURIComponent(detail.trace.traceCode)}`}
                      className="px-3 py-1.5 rounded-lg bg-forest-dark hover:bg-forest text-white font-extrabold transition-colors"
                    >
                      Mở Hộ chiếu QR đầy đủ →
                    </Link>
                  </div>
                  <div className="space-y-4">
                    {detail.trace.events.map((ev) => (
                      <div key={ev.step} className="flex gap-3.5 items-start">
                        <div className="w-10 h-10 rounded-full bg-mint border border-forest/25 text-forest flex items-center justify-center shrink-0 shadow-sm">
                          <OcopIcon name={ev.icon} className="w-5 h-5" />
                        </div>
                        <div className="flex-1 pb-3 border-b border-forest-dark/10 last:border-b-0">
                          <div className="flex flex-wrap items-center justify-between gap-1">
                            <p className="text-sm font-extrabold text-forest-dark">
                              Bước {ev.step}: {ev.title}
                            </p>
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-forest-dark/55">
                              <OcopIcon name="calendar" className="w-3.5 h-3.5" />
                              <span>{ev.date}</span>
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-forest-dark/75 mt-0.5">{ev.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {activeTab === 'reviews' ? (
                <div id="pane-reviews" className="space-y-6">
                  <div className="flex flex-col md:flex-row gap-6 pb-5 border-b border-forest-dark/10">
                    <div className="text-center md:pr-8 md:border-r border-forest-dark/10 shrink-0">
                      <div className="text-4xl font-extrabold text-forest-dark">{p.rating}</div>
                      <div className="mt-1 flex justify-center">
                        <StarRow score={p.rating} className="w-4 h-4" />
                      </div>
                      <div className="text-xs text-forest-dark/60 mt-1">{detail.reviewCount} đánh giá đã xác thực</div>
                    </div>
                    <div className="flex-1 space-y-1.5">
                      {detail.ratingBars.map((b) => (
                        <div key={b.stars} className="flex items-center gap-2.5">
                          <span className="text-xs font-bold text-forest-dark/70 w-9 inline-flex items-center gap-0.5">
                            <span>{b.stars}</span>
                            <OcopIcon name="star-filled" className="w-3 h-3 text-sunny" />
                          </span>
                          <div className="flex-1 h-2.5 bg-bgsoft rounded-full overflow-hidden">
                            <div className="h-full bg-sunny rounded-full" style={{ width: `${b.pct}%` }} />
                          </div>
                          <span className="text-xs font-bold text-forest-dark/55 w-9 text-right">{b.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {detail.reviews.map((r, idx) => {
                      const initial = (r.user || 'K').trim().charAt(0).toUpperCase();
                      return (
                        <div key={`${r.user}-${idx}`} className="flex gap-3">
                          <div className="w-9 h-9 rounded-full bg-mint text-forest-dark border border-forest/20 flex items-center justify-center text-sm font-extrabold shrink-0">
                            {initial}
                          </div>
                          <div className="flex-1 bg-bgsoft rounded-2xl p-3.5 border border-forest-dark/10">
                            <div className="flex flex-wrap items-center justify-between gap-1 mb-0.5">
                              <span className="text-sm font-extrabold text-forest-dark">{r.user}</span>
                              <StarRow score={r.rating} className="w-3.5 h-3.5" />
                            </div>
                            <p className="text-[11px] text-forest-dark/50 mb-1.5 inline-flex items-center gap-1">
                              <span>{r.date || 'Vừa xong'} •</span>
                              <OcopIcon name="check" className="w-3 h-3 text-forest" />
                              <span>Đã mua tại Chợ OCOP</span>
                            </p>
                            <p className="text-xs sm:text-sm text-forest-dark/85 leading-relaxed">{r.text}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <form id="new-review-form" onSubmit={handleReviewSubmit} className="bg-mint/55 rounded-2xl p-4 border border-forest/15 space-y-3" noValidate>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-forest-dark">
                        <OcopIcon name="pen" className="w-4 h-4 text-forest" />
                        <span>Viết đánh giá của bạn</span>
                      </div>
                      <div className="inline-flex items-center gap-1" id="review-star-picker">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            aria-label={`Chọn ${n} sao`}
                            onClick={() => setReviewRatingInput(n)}
                            className={`rev-star-btn p-0.5 ${
                              n <= reviewRatingInput ? 'text-sunny' : 'text-forest-dark/25'
                            }`}
                          >
                            <OcopIcon name="star-filled" className="w-5 h-5" />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <input
                        type="text"
                        id="rev-name"
                        aria-label="Tên người đánh giá"
                        value={revName}
                        onChange={(e) => {
                          setRevNameDirty(true);
                          setRevName(e.target.value);
                        }}
                        placeholder="Tên của bạn (VD: Chị Lan - Biên Hòa)"
                        className="px-3 py-2 rounded-xl bg-white border border-forest-dark/15 text-xs sm:text-sm"
                      />
                      <div className="sm:col-span-2 relative">
                        <input
                          type="text"
                          id="rev-text"
                          aria-label="Nội dung cảm nhận về nông sản"
                          required
                          value={revText}
                          onChange={(e) => setRevText(e.target.value)}
                          placeholder="Cảm nhận ngắn gọn về nông sản này..."
                          className="w-full pl-3 pr-10 py-2 rounded-xl bg-white border border-forest-dark/15 text-xs sm:text-sm"
                        />
                        <button
                          type="button"
                          id="btn-mic-review"
                          title="Nói đánh giá bằng giọng nói"
                          aria-label="Nói đánh giá bằng giọng nói"
                          onClick={() =>
                            dictateToValue({
                              onToast: (m) => showToast(m, 'mic'),
                              onInterim: setRevText,
                              onDone: setRevText,
                            })
                          }
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-mint hover:bg-forest hover:text-white text-forest flex items-center justify-center"
                        >
                          <OcopIcon name="mic" className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <button type="submit" className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-forest-dark hover:bg-forest text-white text-xs font-extrabold">
                      <span>Gửi đánh giá</span>
                      <OcopIcon name="check" className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section id="recoSection" className="bg-white rounded-panel p-4 sm:p-6 border border-forest-dark/10 shadow-soft">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h2 className="text-base sm:text-lg font-extrabold text-forest-dark inline-flex items-center gap-1.5">
              <OcopIcon name="leaf" className="w-5 h-5 text-forest" />
              <span>Sản phẩm liên quan tại Chợ OCOP</span>
            </h2>
            <Link to="/san-pham" className="text-xs sm:text-sm font-bold text-forest hover:underline">
              Xem tất cả →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4" id="recoGrid">
            {relatedProducts.map((rp) => (
              <Link
                key={rp.id}
                to={getProductUrl(rp)}
                className="group bg-bgsoft hover:bg-white rounded-card border border-forest-dark/10 hover:border-forest/35 hover:shadow-hover overflow-hidden flex flex-col transition-all"
              >
                <div className="relative">
                  <ProductImage product={rp} heightClass="h-36 sm:h-40" />
                  <span className="absolute top-2 left-2 inline-flex items-center gap-1 bg-sunny text-forest-dark text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                    <OcopIcon name="star-filled" className="w-2.5 h-2.5" />
                    <span>{rp.cert}</span>
                  </span>
                  {rp.discount > 0 ? (
                    <span className="absolute top-2 right-2 bg-sale text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-md">
                      -{rp.discount}%
                    </span>
                  ) : null}
                </div>
                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="text-[11px] font-bold text-forest truncate mb-0.5 inline-flex items-center gap-1">
                      <OcopIcon name="pin" className="w-3 h-3 text-sale shrink-0" />
                      <span className="truncate">{rp.region}</span>
                    </div>
                    <h3 className="text-xs sm:text-sm font-extrabold text-forest-dark group-hover:text-forest line-clamp-2 min-h-[36px]">
                      {rp.name}
                    </h3>
                  </div>
                  <div className="pt-2 mt-2 border-t border-forest-dark/10 flex items-baseline justify-between gap-1">
                    <span className="text-sm sm:text-base font-extrabold text-sale">{formatVND(rp.price)}</span>
                    <span className="text-[10px] font-bold text-forest-dark/60 inline-flex items-center gap-0.5">
                      <OcopIcon name="star-filled" className="w-3 h-3 text-sunny" />
                      <span>{rp.rating}</span>
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
