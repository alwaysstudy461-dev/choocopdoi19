import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DongNaiMap from '../components/DongNaiMap.jsx';
import OcopIcon from '../components/OcopIcon.jsx';
import ProductImage from '../components/ProductImage.jsx';
import SeoHead from '../components/SeoHead.jsx';
import { useOcop } from '../context/OcopContext.jsx';
import { formatVND, getProductUrl } from '../utils/format.js';
import { gsap, ScrollTrigger, useGSAP } from '../utils/gsapConfig.js';

const HERO_SLIDES = [
  {
    img: '/images/chom-chom.jpg',
    alt: 'Mùa Chôm Chôm Long Khánh',
    overlay: 'bg-gradient-to-r from-forest-dark/90 via-forest-dark/65 to-forest-dark/20',
    badgeIcon: 'cherry',
    badge: 'Đặc sản đúng mùa',
    badgeCls: 'inline-flex items-center gap-1.5 bg-sunny text-forest-dark text-xs font-extrabold px-3 py-1 rounded-full uppercase mb-3',
    headingTag: 'h1',
    title: 'Mùa Chôm Chôm Tróc Long Khánh',
    desc: 'Hái sáng giao chiều, ngọt lịm tại vườn. Đóng thùng cẩn thận bởi đội ngũ Đoàn Thanh Niên.',
    ctaHref: '/san-pham/chom-chom-troc-nhan-long-khanh',
    ctaCls: 'inline-flex items-center gap-2 bg-sale hover:bg-sale-hover text-white font-extrabold px-6 py-3 rounded-xl shadow-lg transition-transform active:scale-95',
    ctaLabel: 'Mua ngay giá tại vườn',
    ctaIcon: 'arrow-right',
  },
  {
    img: '/images/vuon-dong-nai-live.jpg',
    alt: 'Phiên Live Thanh Niên 19:00 tại vườn Đồng Nai',
    overlay: 'bg-gradient-to-r from-forest-dark/92 via-forest/70 to-forest-dark/25',
    badge: 'Phát trực tiếp từ vườn',
    liveDot: true,
    badgeCls: 'inline-flex items-center gap-1.5 bg-sale text-white text-xs font-extrabold px-3 py-1 rounded-full uppercase mb-3',
    headingTag: 'h2',
    title: 'Phiên Live Thanh Niên 19:00 Tối Nay',
    desc: 'Săn deal đồng giá & nghe chuyện nhà vườn chân thật ngay dưới tán bưởi Tân Triều.',
    ctaHref: '#flash-sale',
    ctaCls: 'inline-flex items-center gap-2 bg-sunny hover:bg-amber-400 text-forest-dark font-extrabold px-6 py-3 rounded-xl shadow-lg',
    ctaLabel: 'Săn Deal Flash Sale ngay',
    ctaIcon: 'zap',
  },
  {
    img: '/images/qua-bieu-ocop.jpg',
    alt: 'Combo Quà Biếu OCOP Đồng Nai',
    overlay: 'bg-gradient-to-r from-forest-dark/92 via-forest-dark/70 to-forest-dark/25',
    badgeIcon: 'gift',
    badge: 'Chuẩn OCOP 4 Sao',
    badgeCls: 'inline-flex items-center gap-1.5 bg-mint text-forest-dark text-xs font-extrabold px-3 py-1 rounded-full uppercase mb-3',
    headingTag: 'h2',
    title: 'Combo Quà Biếu Đặc Sản Đồng Nai',
    desc: 'Hạt điều rang củi Bình Long, ca cao Trọng Đức & mật ong rừng đóng hộp trang trọng.',
    ctaHref: '/san-pham?cat=gift',
    ctaCls: 'inline-flex items-center gap-2 bg-white hover:bg-mint text-forest-dark font-extrabold px-6 py-3 rounded-xl shadow-lg',
    ctaLabel: 'Xem hộp quà OCOP',
    ctaIcon: 'arrow-right',
  },
];

function pad2(n) {
  return String(n).padStart(2, '0');
}

export default function HomePage() {
  const navigate = useNavigate();
  const {
    products,
    addToCart,
    voucher,
    setVoucherState,
    liveReminded,
    toggleLiveReminder,
    flashSaleDeadline,
    resetFlashSaleDeadline,
    openAiAssistant,
    showToast,
  } = useOcop();

  const [currentSlide, setCurrentSlide] = useState(0);
  const [carouselPaused, setCarouselPaused] = useState(false);
  const [traceCode, setTraceCode] = useState('');
  const [liveTime, setLiveTime] = useState({ h: '04', m: '32', s: '15' });
  const [fsSec, setFsSec] = useState(() =>
    Math.max(0, Math.floor((flashSaleDeadline - Date.now()) / 1000))
  );

  const mainRef = useRef(null);
  const slideTimerRef = useRef(null);
  const prevSlideRef = useRef(0);

  const resetSlideInterval = useCallback(() => {
    clearInterval(slideTimerRef.current);
    if (carouselPaused) return;
    slideTimerRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5500);
  }, [carouselPaused]);

  useEffect(() => {
    resetSlideInterval();
    return () => clearInterval(slideTimerRef.current);
  }, [resetSlideInterval]);

  const goToSlide = (idx) => {
    setCurrentSlide((idx + HERO_SLIDES.length) % HERO_SLIDES.length);
    resetSlideInterval();
  };

  useEffect(() => {
    let activeDeadline = flashSaleDeadline;
    function tick() {
      const now = new Date();
      const target = new Date();
      target.setHours(19, 0, 0, 0);
      if (now >= target) target.setDate(target.getDate() + 1);
      const diff = Math.max(0, Math.floor((target - now) / 1000));
      setLiveTime({
        h: pad2(Math.floor(diff / 3600)),
        m: pad2(Math.floor((diff % 3600) / 60)),
        s: pad2(diff % 60),
      });

      const fsDiff = Math.floor((activeDeadline - Date.now()) / 1000);
      if (fsDiff <= 0) {
        activeDeadline = resetFlashSaleDeadline();
        setFsSec(Math.floor((activeDeadline - Date.now()) / 1000));
      } else {
        setFsSec(fsDiff);
      }
    }
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [flashSaleDeadline, resetFlashSaleDeadline]);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.utils.toArray('.home-reveal').forEach((section) => {
          gsap.from(section, {
            opacity: 0,
            y: 14,
            duration: 0.42,
            ease: 'power2.out',
            clearProps: 'transform,opacity',
            scrollTrigger: {
              trigger: section,
              start: 'top 92%',
              once: true,
            },
          });
        });
      });
      return () => mm.revert();
    },
    { scope: mainRef }
  );

  useGSAP(
    () => {
      if (prevSlideRef.current === currentSlide) return;
      prevSlideRef.current = currentSlide;
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const copyEl = mainRef.current?.querySelector(`.hero-slide[data-slide-idx="${currentSlide}"] .hero-slide-copy`);
        if (copyEl) {
          gsap.fromTo(
            copyEl,
            { opacity: 0.4, y: 10 },
            { opacity: 1, y: 0, duration: 0.36, ease: 'power2.out', clearProps: 'transform,opacity' }
          );
        }
      });
      return () => mm.revert();
    },
    { scope: mainRef, dependencies: [currentSlide] }
  );

  useEffect(() => {
    ScrollTrigger.refresh();
  }, [products.length]);

  const fsProducts = products.filter((p) => p.flashSale);
  const fsH = pad2(Math.floor(fsSec / 3600));
  const fsM = pad2(Math.floor((fsSec % 3600) / 60));
  const fsS = pad2(fsSec % 60);

  const homeJsonLd = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          name: 'Chợ OCOP Thanh Niên Đồng Nai',
          url: origin || '/',
          logo: `${origin}/favicon.svg`,
          contactPoint: {
            '@type': 'ContactPoint',
            telephone: '+84-251-3888-999',
            contactType: 'customer service',
            areaServed: 'VN',
            availableLanguage: 'Vietnamese',
          },
        },
        {
          '@type': 'WebSite',
          name: 'Chợ OCOP Thanh Niên Đồng Nai',
          url: origin || '/',
          potentialAction: {
            '@type': 'SearchAction',
            target: `${origin}/san-pham?q={search_term_string}`,
            'query-input': 'required name=search_term_string',
          },
        },
      ],
    };
  }, []);

  const handleTraceSubmit = (e) => {
    e.preventDefault();
    const code = traceCode.trim() || 'DN-OCOP-P1';
    navigate(`/truy-xuat?code=${encodeURIComponent(code)}`);
  };

  return (
    <>
      <SeoHead
        title="Trang Chủ – Chợ OCOP Thanh Niên Đồng Nai"
        description="Trang chủ Chợ OCOP Thanh Niên Đồng Nai – Sàn thương mại điện tử nông sản xanh, Flash Sale tại vườn, bản đồ 5 vùng đặc sản và truy xuất nguồn gốc QR."
        keywords="Chợ OCOP Đồng Nai, nông sản Đồng Nai, bưởi Tân Triều, chôm chôm Long Khánh, hạt điều Bình Long, truy xuất QR"
        canonicalPath="/"
        jsonLd={homeJsonLd}
      />

      <main ref={mainRef} className="max-w-7xl mx-auto px-3 sm:px-6 py-5 sm:py-6 space-y-8">
        {/* 1. HERO BANNER 65% / 35% */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          <div
            className="lg:col-span-8 relative rounded-panel overflow-hidden shadow-soft min-h-[290px] sm:min-h-[340px] bg-forest-dark"
            onMouseEnter={() => setCarouselPaused(true)}
            onMouseLeave={() => setCarouselPaused(false)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') goToSlide(currentSlide - 1);
              if (e.key === 'ArrowRight') goToSlide(currentSlide + 1);
            }}
          >
            <div id="hero-slides" className="relative w-full h-full min-h-[290px] sm:min-h-[340px]">
              {HERO_SLIDES.map((s, i) => {
                const active = i === currentSlide;
                const Heading = s.headingTag;
                return (
                  <div
                    key={s.title}
                    data-slide-idx={i}
                    className={`hero-slide absolute inset-0 transition-opacity duration-500 flex items-center ${
                      active ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'
                    }`}
                  >
                    <img
                      src={s.img}
                      alt={s.alt}
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <div className={`absolute inset-0 ${s.overlay}`} />
                    <div className="hero-slide-copy relative z-10 p-6 sm:p-10 max-w-xl text-white">
                      <span className={s.badgeCls}>
                        {s.liveDot ? <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> : null}
                        {s.badgeIcon ? <OcopIcon name={s.badgeIcon} className="w-3.5 h-3.5" /> : null}
                        <span>{s.badge}</span>
                      </span>
                      <Heading className="text-2xl sm:text-4xl font-extrabold leading-tight mb-3">{s.title}</Heading>
                      <p className="text-sm sm:text-base text-white/90 mb-5">{s.desc}</p>
                      {s.ctaHref.startsWith('#') ? (
                        <a href={s.ctaHref} className={s.ctaCls}>
                          <span>{s.ctaLabel}</span>
                          <OcopIcon name={s.ctaIcon} className="w-4 h-4" />
                        </a>
                      ) : (
                        <Link to={s.ctaHref} className={s.ctaCls}>
                          <span>{s.ctaLabel}</span>
                          <OcopIcon name={s.ctaIcon} className="w-4 h-4" />
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              id="slide-prev"
              aria-label="Slide trước"
              onClick={() => goToSlide(currentSlide - 1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/35 hover:bg-black/60 text-white flex items-center justify-center"
            >
              <OcopIcon name="chevron-left" className="w-5 h-5" />
            </button>
            <button
              type="button"
              id="slide-next"
              aria-label="Slide sau"
              onClick={() => goToSlide(currentSlide + 1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/35 hover:bg-black/60 text-white flex items-center justify-center"
            >
              <OcopIcon name="chevron-right" className="w-5 h-5" />
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
              {HERO_SLIDES.map((s, i) => (
                <button
                  key={s.title}
                  type="button"
                  aria-label={`Chọn slide ${i + 1}`}
                  aria-current={i === currentSlide ? 'true' : undefined}
                  onClick={() => goToSlide(i)}
                  className={
                    i === currentSlide
                      ? 'slide-dot w-7 h-2.5 rounded-full bg-sunny transition-all'
                      : 'slide-dot w-2.5 h-2.5 rounded-full bg-white/50 hover:bg-white transition-all'
                  }
                />
              ))}
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="flex-1 bg-gradient-to-br from-forest-dark to-forest text-white rounded-panel p-5 shadow-soft flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase bg-sale px-2.5 py-1 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                    <span>Live 19:00 Hôm nay</span>
                  </span>
                  <span className="text-xs text-white/80 font-semibold">Vườn chú Ba</span>
                </div>
                <h3 className="text-base sm:text-lg font-extrabold leading-snug mb-3">
                  Hái chôm chôm &amp; bưởi tận vườn – Săn deal giảm 30%
                </h3>
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-black/30 rounded-xl px-3 py-1.5 text-center min-w-[54px]">
                    <div id="live-h" className="text-lg font-extrabold text-sunny leading-none">{liveTime.h}</div>
                    <div className="text-[10px] text-white/75 mt-0.5">Giờ</div>
                  </div>
                  <span className="font-extrabold text-sunny">:</span>
                  <div className="bg-black/30 rounded-xl px-3 py-1.5 text-center min-w-[54px]">
                    <div id="live-m" className="text-lg font-extrabold text-sunny leading-none">{liveTime.m}</div>
                    <div className="text-[10px] text-white/75 mt-0.5">Phút</div>
                  </div>
                  <span className="font-extrabold text-sunny">:</span>
                  <div className="bg-black/30 rounded-xl px-3 py-1.5 text-center min-w-[54px]">
                    <div id="live-s" className="text-lg font-extrabold text-white leading-none">{liveTime.s}</div>
                    <div className="text-[10px] text-white/75 mt-0.5">Giây</div>
                  </div>
                </div>
              </div>
              <button
                type="button"
                id="btn-remind-live"
                aria-pressed={liveReminded}
                onClick={toggleLiveReminder}
                className="w-full py-2.5 rounded-xl bg-sunny hover:bg-amber-400 text-forest-dark font-extrabold text-sm transition-all inline-flex items-center justify-center gap-1.5"
              >
                <OcopIcon name={liveReminded ? 'check' : 'bell'} className="w-4 h-4" />
                <span>{liveReminded ? 'Đã đặt lịch nhắc' : 'Nhắc tôi xem Live'}</span>
              </button>
            </div>

            <div className="flex-1 bg-white rounded-panel p-5 border-2 border-dashed border-forest/35 shadow-soft flex flex-col justify-between">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="inline-flex items-center gap-1 bg-sale/10 text-sale text-[11px] font-extrabold px-2.5 py-0.5 rounded-full uppercase mb-1.5">
                    <OcopIcon name="ticket" className="w-3.5 h-3.5" />
                    <span>Mã Giảm Giá Thanh Niên</span>
                  </span>
                  <h3 className="text-lg font-extrabold text-forest-dark">
                    Giảm ngay <span className="text-sale">20.000đ</span>
                  </h3>
                  <p className="text-xs text-forest-dark/70 mt-1">
                    Áp dụng cho mọi đơn hàng từ <strong>150.000đ</strong>.
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-mint text-forest flex items-center justify-center shrink-0">
                  <OcopIcon name="gift" className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-forest-dark/10 flex items-center justify-between gap-2">
                <div className="text-xs font-extrabold text-forest bg-mint px-3 py-1.5 rounded-lg border border-forest/20 tracking-wider">
                  OCOPDN
                </div>
                <button
                  type="button"
                  id="btn-save-voucher"
                  onClick={() => {
                    setVoucherState({ saved: true, applied: true });
                    showToast('Đã lưu & tự động áp dụng mã OCOPDN (-20.000đ) vào giỏ hàng!', 'ticket');
                  }}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-forest hover:bg-forest-dark text-white font-extrabold text-xs sm:text-sm transition-all"
                >
                  {voucher.saved ? (
                    <>
                      <span>Đã lưu</span>
                      <OcopIcon name="check" className="w-3.5 h-3.5" />
                      <span>(Dùng ở Giỏ)</span>
                    </>
                  ) : (
                    <span>Lưu mã OCOPDN</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 2. DẢI CAM KẾT & CỔNG TRUY XUẤT QR NHANH */}
        <section className="home-reveal bg-gradient-to-r from-forest-dark via-forest to-forest-dark text-white rounded-panel p-4 sm:p-5 shadow-soft flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center shrink-0 text-sunny">
              <OcopIcon name="shield-check" className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-sunny">
                Hệ thống Truy xuất Nguồn gốc Số • Đồng Nai
              </div>
              <h2 className="text-base sm:text-lg font-extrabold">Kiểm tra hành trình từ vườn đến tay bạn trong 3 giây</h2>
              <p className="text-xs text-white/80 mt-0.5">
                Thử mã:{' '}
                <Link to="/truy-xuat?code=DN-OCOP-P1" className="underline font-bold text-sunny">
                  DN-OCOP-P1
                </Link>
                ,{' '}
                <Link to="/truy-xuat?code=DN-OCOP-P2" className="underline font-bold text-sunny">
                  DN-OCOP-P2
                </Link>{' '}
                hoặc quét tem QR.
              </p>
            </div>
          </div>
          <form id="home-trace-form" onSubmit={handleTraceSubmit} className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto lg:min-w-[420px]">
            <input
              type="text"
              id="home-trace-input"
              aria-label="Nhập mã lô truy xuất nguồn gốc"
              value={traceCode}
              onChange={(e) => setTraceCode(e.target.value)}
              placeholder="Nhập mã lô (VD: DN-OCOP-P1)..."
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-white text-forest-dark font-bold text-sm uppercase focus:outline-none focus:ring-2 focus:ring-sunny"
            />
            <div className="flex gap-2">
              <button type="submit" className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-sunny hover:bg-amber-400 text-forest-dark font-extrabold text-xs sm:text-sm">
                <OcopIcon name="search" className="w-4 h-4" />
                <span>Tra cứu</span>
              </button>
              <Link to="/truy-xuat?scan=1" className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 text-center px-3.5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 font-extrabold text-xs sm:text-sm">
                <OcopIcon name="scan" className="w-4 h-4" />
                <span>Quét QR</span>
              </Link>
            </div>
          </form>
        </section>

        {/* 3. BẢN ĐỒ TƯƠNG TÁC TỈNH ĐỒNG NAI */}
        <div className="home-reveal">
          <DongNaiMap />
        </div>

        {/* 4. FLASH SALE TẠI VƯỜN */}
        <section id="flash-sale" className="home-reveal bg-white rounded-panel p-5 sm:p-6 border-2 border-sale/20 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-5 border-b border-forest-dark/10">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl sm:text-2xl font-extrabold text-sale tracking-tight inline-flex items-center gap-1.5">
                <OcopIcon name="zap" className="w-6 h-6" />
                <span>FLASH SALE TẠI VƯỜN</span>
              </h2>
              <div className="inline-flex items-center gap-1.5 text-sm font-extrabold">
                <span id="fs-h" className="bg-forest-dark text-white px-2.5 py-1 rounded-lg">{fsH}</span>
                <span className="text-sale">:</span>
                <span id="fs-m" className="bg-forest-dark text-white px-2.5 py-1 rounded-lg">{fsM}</span>
                <span className="text-sale">:</span>
                <span id="fs-s" className="bg-sale text-white px-2.5 py-1 rounded-lg">{fsS}</span>
              </div>
            </div>
            <Link to="/san-pham" className="text-sm font-bold text-forest hover:text-sale inline-flex items-center gap-1">
              <span>Xem tất cả nông sản</span>
              <OcopIcon name="arrow-right" className="w-4 h-4" />
            </Link>
          </div>
          <div id="flash-sale-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {fsProducts.map((p) => {
              const pct = Math.min(100, Math.round((p.fsSold / p.fsTotal) * 100));
              const detailUrl = getProductUrl(p);
              return (
                <article key={p.id} className="group bg-bgsoft rounded-card border border-sale/15 hover:border-sale/40 hover:shadow-hover transition-all overflow-hidden flex flex-col">
                  <Link to={detailUrl} className="relative block">
                    <ProductImage product={p} heightClass="h-44" />
                    <span className="absolute top-2.5 left-2.5 bg-sale text-white text-xs font-extrabold px-2.5 py-1 rounded-lg">
                      -{p.discount}%
                    </span>
                    <span className="absolute top-2.5 right-2.5 bg-sunny text-forest-dark text-[11px] font-extrabold px-2 py-0.5 rounded-lg">
                      {p.cert}
                    </span>
                  </Link>
                  <div className="p-3.5 flex-1 flex flex-col justify-between bg-white">
                    <div>
                      <Link to={detailUrl} className="block text-sm font-bold text-forest-dark line-clamp-2 hover:text-forest mb-2 min-h-[40px]">
                        {p.name}
                      </Link>
                      <div className="flex items-baseline gap-2 mb-2.5">
                        <span className="text-lg font-extrabold text-sale">{formatVND(p.price)}</span>
                        <span className="text-xs text-forest-dark/45 line-through">{formatVND(p.oldPrice)}</span>
                      </div>
                      <div className="relative w-full h-5 rounded-full bg-sale/15 overflow-hidden mb-3">
                        <div className="h-full bg-gradient-to-r from-sale to-orange-500 rounded-full" style={{ width: `${pct}%` }} />
                        <div className="absolute inset-0 flex items-center justify-center gap-1 text-[11px] font-extrabold text-white drop-shadow">
                          <OcopIcon name="flame" className="w-3 h-3" />
                          <span>Đã bán {p.fsSold}/{p.fsTotal} {p.fsUnit}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link to={detailUrl} className="flex-1 text-center py-2 rounded-xl bg-mint hover:bg-forest/15 text-forest-dark text-xs font-bold">
                        Chi tiết
                      </Link>
                      <button
                        type="button"
                        onClick={() => addToCart(p.id)}
                        className="flex-1 py-2 rounded-xl bg-sale hover:bg-sale-hover text-white text-xs font-extrabold"
                      >
                        + Giỏ ngay
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* 5. BỘ SƯU TẬP THEO MÙA & NHU CẦU */}
        <section className="home-reveal grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/san-pham?cat=seasonal" className="group relative rounded-panel overflow-hidden shadow-soft hover:shadow-hover hover:-translate-y-1 transition-all min-h-[195px] flex flex-col justify-between p-5 text-white bg-forest-dark">
            <img src="/images/chom-chom.jpg" alt="Trái cây đang rộ mùa Đồng Nai" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/25" />
            <div className="relative z-10">
              <span className="inline-flex items-center gap-1 bg-sale text-white text-[11px] font-extrabold px-2.5 py-0.5 rounded-full uppercase mb-2">
                <OcopIcon name="flame" className="w-3 h-3" />
                <span>Mùa nào thức nấy</span>
              </span>
              <h3 className="text-lg font-extrabold leading-snug">Trái Cây Đang Rộ Mùa • Hái Sáng Giao Chiều</h3>
              <p className="text-xs text-white/90 mt-1">Chôm chôm tróc, Bưởi Tân Triều, Sầu riêng Ri6 &amp; Xoài Cát hái tươi từ 5h sáng.</p>
            </div>
            <span className="relative z-10 inline-flex items-center gap-1 text-xs font-extrabold text-sunny mt-3">
              <span>Khám phá ngay</span>
              <OcopIcon name="arrow-right" className="w-3.5 h-3.5" />
            </span>
          </Link>
          <Link to="/san-pham?cat=gift" className="group relative rounded-panel overflow-hidden shadow-soft hover:shadow-hover hover:-translate-y-1 transition-all min-h-[195px] flex flex-col justify-between p-5 text-white bg-forest-dark">
            <img src="/images/qua-bieu-ocop.jpg" alt="Hộp quà OCOP 4 sao Đồng Nai" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute inset-0 bg-gradient-to-t from-forest-dark/90 via-forest-dark/50 to-forest-dark/25" />
            <div className="relative z-10">
              <span className="inline-flex items-center gap-1 bg-sunny text-forest-dark text-[11px] font-extrabold px-2.5 py-0.5 rounded-full uppercase mb-2">
                <OcopIcon name="star-filled" className="w-3 h-3" />
                <span>Chuẩn OCOP 4 Sao</span>
              </span>
              <h3 className="text-lg font-extrabold leading-snug">Hộp Quà Quê Hương Biếu Tặng Trang Trọng</h3>
              <p className="text-xs text-white/90 mt-1">Đóng hộp xanh sang trọng, kèm tem truy xuất QR &amp; thiệp cảm ơn từ Đoàn Thanh Niên.</p>
            </div>
            <span className="relative z-10 inline-flex items-center gap-1 text-xs font-extrabold text-sunny mt-3">
              <span>Chọn quà biếu</span>
              <OcopIcon name="arrow-right" className="w-3.5 h-3.5" />
            </span>
          </Link>
          <Link to="/san-pham?cat=healthy" className="group relative rounded-panel overflow-hidden shadow-soft hover:shadow-hover hover:-translate-y-1 transition-all min-h-[195px] flex flex-col justify-between p-5 text-white bg-harvest-dark">
            <img src="/images/mat-ong.jpg" alt="Thực phẩm sạch cho người lớn tuổi" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute inset-0 bg-gradient-to-t from-harvest-dark/90 via-harvest-dark/50 to-black/25" />
            <div className="relative z-10">
              <span className="inline-flex items-center gap-1 bg-mint text-forest-dark text-[11px] font-extrabold px-2.5 py-0.5 rounded-full uppercase mb-2">
                <OcopIcon name="healthy" className="w-3 h-3 text-forest" />
                <span>Lành mạnh • Ít đường</span>
              </span>
              <h3 className="text-lg font-extrabold leading-snug">Thực Phẩm Vàng Cho Người Lớn Tuổi</h3>
              <p className="text-xs text-white/90 mt-1">Mật ong nguyên chất, hạt điều rang củi không dầu, ca cao mộc &amp; bưởi thanh mát.</p>
            </div>
            <span className="relative z-10 inline-flex items-center gap-1 text-xs font-extrabold text-sunny mt-3">
              <span>Xem danh sách sạch</span>
              <OcopIcon name="arrow-right" className="w-3.5 h-3.5" />
            </span>
          </Link>
        </section>

        {/* 5B. DẢI TRỢ LÝ AI TƯ VẤN MUA SẮM */}
        <section className="home-reveal bg-gradient-to-r from-forest-dark via-forest to-emerald-800 text-white rounded-panel p-5 sm:p-6 shadow-soft flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-sunny text-forest-dark flex items-center justify-center shrink-0 shadow-md">
              <OcopIcon name="sparkles" className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase text-sunny">
                <span>Trợ lý AI Chợ OCOP (Giả định)</span>
                <span className="px-2 py-0.5 rounded-full bg-white/15 text-white">Hỗ trợ giọng nói</span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold mt-0.5">Chưa biết chọn món gì biếu tặng hoặc nấu ăn hôm nay?</h2>
              <p className="text-xs sm:text-sm text-white/85 mt-0.5">
                Hỏi Trợ lý AI theo ngân sách, vùng trồng hoặc nhu cầu — gợi ý ngay đặc sản kèm ảnh thật &amp; giá tận vườn.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              type="button"
              onClick={() => openAiAssistant('Tư vấn quà biếu đặc sản Đồng Nai dưới 350k')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-sunny hover:bg-amber-400 text-forest-dark font-extrabold text-xs sm:text-sm transition-colors"
            >
              <OcopIcon name="gift" className="w-4 h-4" />
              <span>Hỏi AI chọn quà biếu</span>
            </button>
            <button
              type="button"
              onClick={() => openAiAssistant('Trái cây tươi nào đang rộ mùa hôm nay?')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 font-bold text-xs sm:text-sm transition-colors"
            >
              <OcopIcon name="cherry" className="w-4 h-4 text-sunny" />
              <span>Hỏi món rộ mùa</span>
            </button>
            <button
              type="button"
              onClick={() => openAiAssistant('Nông sản lành mạnh tốt cho người lớn tuổi')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 font-bold text-xs sm:text-sm transition-colors"
            >
              <OcopIcon name="healthy" className="w-4 h-4 text-mint" />
              <span>Chọn cho ông bà</span>
            </button>
          </div>
        </section>

        {/* 6. GIAN HÀNG NHÀ VƯỜN UY TÍN */}
        <section className="home-reveal space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="inline-flex items-center gap-1 text-xs font-extrabold uppercase tracking-wider text-forest">
                <OcopIcon name="award" className="w-4 h-4" />
                <span>Official Mall Đồng Nai</span>
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-forest-dark mt-0.5">Gian Hàng Nhà Vườn Uy Tín</h2>
            </div>
            <Link to="/dang-ban-ai" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-harvest-light hover:bg-amber-200 text-harvest-dark font-extrabold text-xs sm:text-sm border border-harvest/25">
              <OcopIcon name="sparkles" className="w-4 h-4" />
              <span>Bạn là nhà nông? Đăng bán bằng AI</span>
              <OcopIcon name="arrow-right" className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-card overflow-hidden border border-forest-dark/10 shadow-soft hover:shadow-hover transition-all flex flex-col justify-between">
              <div className="h-32 relative overflow-hidden">
                <img src="/images/sau-rieng.jpg" alt="Vườn Chú Ba - Long Khánh" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                <span className="absolute bottom-2.5 left-3 px-2.5 py-0.5 rounded-full bg-sunny text-forest-dark text-[10px] font-extrabold inline-flex items-center gap-1">
                  <OcopIcon name="star-filled" className="w-3 h-3" />
                  <span>4.9 • 2,4k lượt mua</span>
                </span>
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                <div>
                  <h3 className="font-extrabold text-forest-dark truncate inline-flex items-center gap-1">
                    <span>Vườn Chú Ba - Long Khánh</span>
                    <OcopIcon name="check-circle" className="w-4 h-4 text-forest shrink-0" />
                  </h3>
                  <p className="text-xs text-forest-dark/70 mt-0.5">Chuyên Chôm chôm tróc nhãn &amp; Sầu riêng Ri6 chín cây</p>
                </div>
                <Link to="/san-pham?shop=V%C6%B0%E1%BB%9Dn%20Ch%C3%BA%20Ba%20-%20Long%20Kh%C3%A1nh" className="inline-flex items-center justify-center gap-1 text-center py-2.5 rounded-xl bg-mint hover:bg-forest-dark hover:text-white text-forest-dark font-bold text-sm transition-colors">
                  <span>Xem gian hàng</span>
                  <OcopIcon name="arrow-right" className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="bg-white rounded-card overflow-hidden border border-forest-dark/10 shadow-soft hover:shadow-hover transition-all flex flex-col justify-between">
              <div className="h-32 relative overflow-hidden">
                <img src="/images/buoi-tan-trieu.jpg" alt="HTX Bưởi Đường Lá Cam Tân Triều" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                <span className="absolute bottom-2.5 left-3 px-2.5 py-0.5 rounded-full bg-sunny text-forest-dark text-[10px] font-extrabold inline-flex items-center gap-1">
                  <OcopIcon name="star-filled" className="w-3 h-3" />
                  <span>5.0 • 3,1k lượt mua</span>
                </span>
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                <div>
                  <h3 className="font-extrabold text-forest-dark truncate inline-flex items-center gap-1">
                    <span>HTX Bưởi Đường Lá Cam</span>
                    <OcopIcon name="check-circle" className="w-4 h-4 text-forest shrink-0" />
                  </h3>
                  <p className="text-xs text-forest-dark/70 mt-0.5">Chuẩn OCOP 4 sao cù lao Tân Triều &amp; Hộp quà biếu</p>
                </div>
                <Link to="/san-pham?shop=HTX%20B%C6%B0%E1%BB%9Fi%20%C4%90%C6%B0%E1%BB%9Dng%20L%C3%A1%20Cam%20-%20T%C3%A2n%20Tri%E1%BB%81u" className="inline-flex items-center justify-center gap-1 text-center py-2.5 rounded-xl bg-mint hover:bg-forest-dark hover:text-white text-forest-dark font-bold text-sm transition-colors">
                  <span>Xem gian hàng</span>
                  <OcopIcon name="arrow-right" className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="bg-white rounded-card overflow-hidden border border-forest-dark/10 shadow-soft hover:shadow-hover transition-all flex flex-col justify-between">
              <div className="h-32 relative overflow-hidden">
                <img src="/images/hat-dieu.jpg" alt="Hạt Điều Rang Củi Bình Long" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                <span className="absolute bottom-2.5 left-3 px-2.5 py-0.5 rounded-full bg-sunny text-forest-dark text-[10px] font-extrabold inline-flex items-center gap-1">
                  <OcopIcon name="star-filled" className="w-3 h-3" />
                  <span>4.9 • 1,8k lượt mua</span>
                </span>
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                <div>
                  <h3 className="font-extrabold text-forest-dark truncate inline-flex items-center gap-1">
                    <span>Hạt Điều Rang Củi Bình Long</span>
                    <OcopIcon name="check-circle" className="w-4 h-4 text-forest shrink-0" />
                  </h3>
                  <p className="text-xs text-forest-dark/70 mt-0.5">Hạt điều vỏ lụa A+, tiêu đen hữu cơ &amp; quà biếu cao cấp</p>
                </div>
                <Link to="/san-pham?shop=C%C6%A1%20s%E1%BB%9F%20H%E1%BA%A1t%20%C4%90i%E1%BB%81u%20Rang%20C%E1%BB%A7i%20-%20B%C3%ACnh%20Long" className="inline-flex items-center justify-center gap-1 text-center py-2.5 rounded-xl bg-mint hover:bg-forest-dark hover:text-white text-forest-dark font-bold text-sm transition-colors">
                  <span>Xem gian hàng</span>
                  <OcopIcon name="arrow-right" className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
