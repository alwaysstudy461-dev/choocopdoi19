import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useOcop } from '../context/OcopContext.jsx';
import { NAV_PAGES } from '../data/catalog.js';
import AiAssistantDrawer from './AiAssistantDrawer.jsx';
import AuthModal from './AuthModal.jsx';
import OcopIcon from './OcopIcon.jsx';
import VoiceSearchModal from './VoiceSearchModal.jsx';

const QUICK_KEYWORDS = ['Chôm chôm', 'Bưởi Tân Triều', 'Hạt điều', 'Mật ong'];

function getActivePageKey(pathname) {
  const clean = pathname.replace(/\.html$/, '');
  if (clean === '/' || clean === '/index' || clean === '') return 'home';
  if (clean === '/san-pham' || clean.startsWith('/san-pham/') || clean.startsWith('/vung/') || clean === '/chi-tiet-san-pham') {
    return 'products';
  }
  if (clean === '/truy-xuat') return 'trace';
  if (clean === '/dang-ban-ai') return 'ai-sell';
  if (clean === '/quan-ly-don') return 'farmer-orders';
  if (clean === '/don-hang') return 'orders';
  return 'home';
}

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    user,
    orders,
    cartTotals,
    fontSize,
    applyFontSize,
    logoutUser,
    openAuthModal,
    openVoiceModal,
    executeVoiceSearch,
    toast,
    showToast,
  } = useOcop();

  const activePageKey = getActivePageKey(location.pathname);
  const [searchValue, setSearchValue] = useState(() => {
    const sp = new URLSearchParams(location.search);
    return sp.get('q') || '';
  });

  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const q = sp.get('q') || '';
    setSearchValue(q);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.slice(1);
      const scrollToTarget = () => {
        const target = document.getElementById(id);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return true;
        }
        return false;
      };
      if (!scrollToTarget()) {
        const raf = requestAnimationFrame(scrollToTarget);
        return () => cancelAnimationFrame(raf);
      }
      return undefined;
    }
    window.scrollTo(0, 0);
    return undefined;
  }, [location.pathname, location.hash, location.key]);

  const isFarmer = user?.role === 'farmer';

  const handleSearchChange = (val) => {
    setSearchValue(val);
    const clean = location.pathname.replace(/\.html$/, '');
    if (clean === '/san-pham') {
      const sp = new URLSearchParams(location.search);
      if (val) sp.set('q', val);
      else sp.delete('q');
      const qs = sp.toString();
      navigate(`/san-pham${qs ? `?${qs}` : ''}`, { replace: true });
    } else if (clean === '/quan-ly-don' && isFarmer) {
      const sp = new URLSearchParams(location.search);
      if (val) sp.set('q', val);
      else sp.delete('q');
      const qs = sp.toString();
      navigate(`/quan-ly-don${qs ? `?${qs}` : ''}`, { replace: true });
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const q = searchValue.trim();
    const clean = location.pathname.replace(/\.html$/, '');
    if (clean === '/quan-ly-don' && isFarmer) {
      navigate(`/quan-ly-don${q ? `?q=${encodeURIComponent(q)}` : ''}`);
      return;
    }
    navigate(`/san-pham${q ? `?q=${encodeURIComponent(q)}` : ''}`);
  };

  return (
    <>
      <div id="app-header">
        {/* 1. COMPACT TOP UTILITY BAR (pruned duplicate route shortcuts already in nav bar) */}
        <div className="bg-forest-dark text-white text-xs">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-1.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-medium text-white/95 min-w-0">
              <OcopIcon name="leaf" className="w-3.5 h-3.5 text-sunny shrink-0" />
              <span className="truncate">
                Nông sản thật. Câu chuyện thật. <strong className="text-sunny">Thanh niên Đồng Nai</strong> đồng hành cùng nhà vườn.
              </span>
            </div>
            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
              <div id="top-user-badge" className="inline-flex items-center gap-1.5">
                {!user ? (
                  <>
                    <button
                      type="button"
                      onClick={() => openAuthModal('login')}
                      className="font-bold text-white hover:text-sunny transition-colors"
                    >
                      Đăng nhập
                    </button>
                    <span className="text-white/35">/</span>
                    <button
                      type="button"
                      onClick={() => openAuthModal('register')}
                      className="px-2 py-0.5 rounded-full bg-sunny hover:bg-amber-400 text-forest-dark font-extrabold text-[10px] transition-colors"
                    >
                      Đăng ký mới
                    </button>
                  </>
                ) : (
                  <Link
                    to={isFarmer ? '/quan-ly-don' : '/don-hang?tab=orders'}
                    className="inline-flex items-center gap-1.5 font-bold text-white hover:text-sunny transition-colors"
                  >
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        isFarmer ? 'bg-sunny text-forest-dark' : 'bg-white/15 text-sunny'
                      }`}
                    >
                      <OcopIcon name={isFarmer ? 'farmer' : 'cart'} className="w-3 h-3" />
                      <span>{isFarmer ? 'Nhà vườn' : 'Khách hàng'}</span>
                    </span>
                    <span className="hidden sm:inline truncate max-w-[130px]">{user.name}</span>
                  </Link>
                )}
              </div>
              <span className="text-white/25">|</span>
              <div className="inline-flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-full border border-white/15">
                <span className="text-[11px] text-white/80 hidden sm:inline">Cỡ chữ:</span>
                <button
                  type="button"
                  id="btn-font-down"
                  aria-label="Thu nhỏ cỡ chữ"
                  onClick={() => {
                    const next = applyFontSize(fontSize - 1);
                    showToast(`Đã thu nhỏ cỡ chữ (${Math.round((next / 16) * 100)}%)`, 'info');
                  }}
                  className="px-1.5 py-0.5 rounded bg-white/15 hover:bg-sunny hover:text-forest-dark font-extrabold text-[11px] transition-colors"
                >
                  A-
                </button>
                <span className="text-white/40">|</span>
                <button
                  type="button"
                  id="btn-font-up"
                  aria-label="Phóng to cỡ chữ"
                  onClick={() => {
                    const next = applyFontSize(fontSize + 1);
                    showToast(`Đã phóng to cỡ chữ (${Math.round((next / 16) * 100)}%)`, 'info');
                  }}
                  className="px-1.5 py-0.5 rounded bg-white/15 hover:bg-sunny hover:text-forest-dark font-extrabold text-[11px] transition-colors"
                >
                  A+
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 2. STICKY HEADER + SỰ KIỆN ĐỒNG NAI */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-forest-dark/10 shadow-soft">
          <div className="bg-gradient-to-r from-mint via-emerald-50 to-harvest-light/70 border-b border-forest/15 text-xs">
            <div className="max-w-7xl mx-auto px-3 sm:px-6 py-1 flex items-center gap-2.5">
              <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sale text-white font-extrabold text-[10px] uppercase tracking-wide shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span>Sự kiện</span>
              </span>
              <div className="ocop-marquee-wrap flex-1 min-w-0">
                <div className="ocop-marquee-track gap-6 font-bold text-forest-dark">
                  {[1, 2].map((dup) => (
                    <div key={dup} className="flex items-center gap-6 shrink-0 pr-6" aria-hidden={dup === 2 ? 'true' : undefined}>
                      <Link to="/#flash-sale" className="inline-flex items-center gap-1.5 hover:text-sale transition-colors whitespace-nowrap">
                        <OcopIcon name="radio" className="w-3.5 h-3.5 text-sale" />
                        <span>
                          <strong>LIVE 19:00 Hôm nay:</strong> Hái chôm chôm tróc tại Vườn Chú Ba Long Khánh — Giảm đến 30%
                        </span>
                      </Link>
                      <span className="text-forest/35">•</span>
                      <Link to="/don-hang?tab=cart" className="inline-flex items-center gap-1.5 hover:text-forest transition-colors whitespace-nowrap">
                        <OcopIcon name="ticket" className="w-3.5 h-3.5 text-harvest" />
                        <span>
                          <strong>Tuần lễ OCOP Thanh Niên Đồng Nai:</strong> Nhập mã <strong className="text-sale">OCOPDN</strong> giảm ngay 20.000đ
                        </span>
                      </Link>
                      <span className="text-forest/35">•</span>
                      <Link to="/san-pham/buoi-duong-la-cam" className="inline-flex items-center gap-1.5 hover:text-forest transition-colors whitespace-nowrap">
                        <OcopIcon name="citrus" className="w-3.5 h-3.5 text-harvest" />
                        <span>
                          <strong>Mùa Bưởi Đường Lá Cam Tân Triều:</strong> Hái sáng giao nhanh 2h nội tỉnh
                        </span>
                      </Link>
                      <span className="text-forest/35">•</span>
                      <Link to="/truy-xuat" className="inline-flex items-center gap-1.5 hover:text-forest transition-colors whitespace-nowrap">
                        <OcopIcon name="shield-check" className="w-3.5 h-3.5 text-forest" />
                        <span>
                          <strong>100% nông sản có mã QR Truy xuất 5 bước</strong> xác thực bởi Đoàn Thanh Niên
                        </span>
                      </Link>
                      <span className="text-forest/35">•</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3">
            <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-2.5 sm:gap-3 lg:gap-5">
              <Link to="/" className="flex items-center gap-2 sm:gap-2.5 shrink-0 group">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-br from-forest-dark to-forest text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                  <OcopIcon name="leaf" className="w-5 h-5 sm:w-6 sm:h-6 text-sunny" />
                </div>
                <div className="leading-tight">
                  <div className="text-lg sm:text-xl font-extrabold text-forest-dark tracking-tight">Chợ OCOP</div>
                  <div className="text-[9px] sm:text-[10px] font-extrabold text-forest tracking-widest uppercase">
                    THANH NIÊN ĐỒNG NAI
                  </div>
                </div>
              </Link>

              <div className="order-3 lg:order-2 w-full lg:flex-1 max-w-2xl">
                <form id="global-search-form" onSubmit={handleSearchSubmit} noValidate>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      id="global-search-input"
                      aria-label="Tìm kiếm nông sản OCOP"
                      value={searchValue}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      placeholder="Tìm chôm chôm, bưởi Tân Triều, hạt điều... hoặc bấm micro"
                      className="w-full pl-3.5 sm:pl-4 pr-[136px] sm:pr-[176px] py-2.5 rounded-2xl bg-bgsoft border-2 border-forest-dark/15 focus:border-forest focus:bg-white focus:outline-none focus:ring-2 focus:ring-forest/20 text-sm sm:text-base font-medium text-forest-dark transition-all"
                    />
                    <div className="absolute right-1.5 inset-y-0 flex items-center">
                      <button
                        type="button"
                        id="btn-global-voice"
                        title="Tìm kiếm bằng giọng nói (Tiếng Việt)"
                        aria-label="Tìm kiếm bằng giọng nói"
                        onClick={openVoiceModal}
                        className="w-9 h-9 rounded-xl bg-mint hover:bg-forest text-forest hover:text-white border border-forest/20 flex items-center justify-center transition-all active:scale-95 shrink-0"
                      >
                        <OcopIcon name="mic" className="w-4 h-4" />
                      </button>
                      <button
                        type="submit"
                        aria-label="Tìm kiếm"
                        className="ml-2 sm:ml-2.5 bg-forest hover:bg-forest-dark text-white px-3 sm:px-4 py-2 rounded-xl font-bold text-sm transition-colors inline-flex items-center gap-1.5 shrink-0"
                      >
                        <OcopIcon name="search" className="w-4 h-4" />
                        <span className="hidden sm:inline">Tìm</span>
                      </button>
                    </div>
                  </div>
                </form>

                <div className="flex items-center gap-2 mt-1.5 overflow-x-auto no-scrollbar text-xs">
                  <button
                    type="button"
                    id="btn-global-voice-hint"
                    onClick={openVoiceModal}
                    className="shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-mint text-forest font-bold hover:bg-forest hover:text-white transition-colors"
                  >
                    <OcopIcon name="mic" className="w-3.5 h-3.5" />
                    <span>Nói để tìm</span>
                  </button>
                  <span className="text-forest-dark/30 shrink-0">|</span>
                  {QUICK_KEYWORDS.map((kw) => (
                    <button
                      key={kw}
                      type="button"
                      onClick={() => executeVoiceSearch(kw)}
                      className="global-qk shrink-0 text-forest-dark/75 hover:text-forest font-medium hover:underline"
                    >
                      {kw}
                    </button>
                  ))}
                </div>
              </div>

              <div className="order-2 lg:order-3 flex items-center gap-1.5 sm:gap-2 shrink-0">
                {!user ? (
                  <button
                    type="button"
                    id="header-user-link"
                    onClick={() => openAuthModal('login')}
                    className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-2 rounded-xl sm:rounded-2xl bg-bgsoft hover:bg-mint text-forest-dark font-bold text-xs sm:text-sm border border-forest-dark/15 cursor-pointer transition-all"
                  >
                    <span className="w-7 h-7 rounded-full bg-forest/15 text-forest flex items-center justify-center text-sm shrink-0">
                      <OcopIcon name="user" className="w-4 h-4" />
                    </span>
                    <span className="hidden sm:inline leading-tight text-left">
                      <span className="block text-xs font-extrabold text-forest-dark">Đăng nhập</span>
                      <span className="block text-[10px] font-semibold text-forest-dark/60">Hoặc tạo TK mới</span>
                    </span>
                  </button>
                ) : (
                  <>
                    <Link
                      id="header-user-link"
                      to={isFarmer ? '/quan-ly-don' : '/don-hang?tab=orders'}
                      title={isFarmer ? 'Quản lý đơn hàng nhà vườn' : 'Đơn hàng của tôi'}
                      className={
                        isFarmer
                          ? 'inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 rounded-xl sm:rounded-2xl bg-harvest-light hover:bg-amber-200/80 text-harvest-dark font-bold text-xs sm:text-sm border-2 border-harvest/35 transition-all'
                          : 'inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 rounded-xl sm:rounded-2xl bg-mint hover:bg-forest/15 text-forest-dark font-bold text-xs sm:text-sm border-2 border-forest/30 transition-all'
                      }
                    >
                      <span
                        className={`w-7 h-7 rounded-full ${
                          isFarmer ? 'bg-harvest' : 'bg-forest'
                        } text-white flex items-center justify-center text-sm shrink-0`}
                      >
                        <OcopIcon name={isFarmer ? 'farmer' : 'cart'} className="w-4 h-4" />
                      </span>
                      <span className="hidden sm:inline leading-tight text-left">
                        <span
                          className={`block text-[10px] font-extrabold uppercase tracking-wider ${
                            isFarmer ? 'text-harvest' : 'text-forest'
                          }`}
                        >
                          {isFarmer ? 'Nhà vườn' : 'Khách hàng'}
                        </span>
                        <span className="block text-xs font-extrabold truncate max-w-[110px]">{user.name}</span>
                      </span>
                    </Link>
                    <button
                      type="button"
                      id="btn-header-logout"
                      onClick={logoutUser}
                      className="inline-flex items-center gap-1 px-2.5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-sale/10 hover:bg-sale text-sale hover:text-white font-extrabold text-xs border border-sale/25 transition-colors"
                      title="Đăng xuất tài khoản"
                    >
                      <OcopIcon name="logout" className="w-3.5 h-3.5" />
                      <span className="hidden xl:inline">Đăng xuất</span>
                    </button>
                  </>
                )}
                <Link
                  to="/don-hang?tab=orders"
                  className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-mint hover:bg-forest/15 text-forest-dark font-bold text-xs sm:text-sm border border-forest-dark/10 transition-colors"
                  title="Đơn hàng của tôi"
                >
                  <OcopIcon name="clipboard" className="w-4 h-4 text-forest" />
                  <span className="hidden md:inline">Đơn mua</span>
                  <span id="orders-count-badge" className="bg-forest text-white text-[11px] font-extrabold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {orders.length}
                  </span>
                </Link>
                <Link
                  to="/don-hang?tab=cart"
                  className="inline-flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-forest-dark hover:bg-forest text-white font-bold text-xs sm:text-sm shadow-soft transition-all"
                  title="Giỏ hàng"
                >
                  <OcopIcon name="cart" className="w-4 h-4 text-sunny" />
                  <span className="hidden sm:inline">Giỏ hàng</span>
                  <span id="cart-count-badge" className="bg-sunny text-forest-dark text-xs font-extrabold px-1.5 sm:px-2 py-0.5 rounded-full min-w-[20px] sm:min-w-[22px] text-center">
                    {cartTotals.totalQty}
                  </span>
                </Link>
              </div>
            </div>
          </div>

          <nav aria-label="Điều hướng Chợ OCOP" className="bg-bgsoft/90 border-t border-forest-dark/10">
            <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
              {NAV_PAGES.map((pg) => {
                const active = pg.key === activePageKey;
                return (
                  <Link
                    key={pg.key}
                    to={pg.href}
                    className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs sm:text-sm transition-all ${
                      active
                        ? 'bg-forest-dark text-white font-extrabold shadow-sm'
                        : 'bg-white text-forest-dark font-semibold border border-forest-dark/10 hover:bg-mint hover:border-forest/30'
                    }`}
                  >
                    <OcopIcon name={pg.icon} className="w-4 h-4" />
                    <span>{pg.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        </header>

        {/* Hide redundant farmer context bar when already inside farmer order dashboard */}
        {isFarmer && activePageKey !== 'farmer-orders' ? (
          <div id="farmer-workspace-bar" className="bg-harvest-light/85 border-b border-harvest/20">
            <div className="max-w-7xl mx-auto px-3 sm:px-6 py-1.5 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-harvest text-white font-extrabold text-[10px] shrink-0">
                  <OcopIcon name="farmer" className="w-3 h-3" />
                  <span>NHÀ VƯỜN</span>
                </span>
                <span className="font-bold text-harvest-dark truncate">
                  <strong id="farmer-bar-farm-name">{user.farmName || user.name}</strong> •{' '}
                  <span id="farmer-bar-region">
                    {user.region || 'Đồng Nai'} • {user.cert || 'OCOP'}
                  </span>
                </span>
              </div>
              <Link
                to="/quan-ly-don"
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-forest-dark hover:bg-forest text-white font-extrabold text-[11px] shrink-0 transition-colors"
              >
                <span>Kênh nhà vườn</span>
                <OcopIcon name="arrow-right" className="w-3 h-3" />
              </Link>
            </div>
          </div>
        ) : null}
      </div>

      <Outlet />

      <div id="app-footer">
        <footer className="bg-forest-dark text-white/85 mt-12 pt-10 pb-24 sm:pb-10 border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="inline-flex items-center gap-2 text-xl font-extrabold text-white mb-2">
                <OcopIcon name="leaf" className="w-5 h-5 text-sunny" />
                <span>Chợ OCOP Thanh Niên Đồng Nai</span>
              </div>
              <p className="text-sm text-white/75 leading-relaxed max-w-md">
                Sàn thương mại điện tử kết nối trực tiếp nhà vườn Đồng Nai với người tiêu dùng, hỗ trợ tìm kiếm giọng nói, trợ lý AI đăng bán, quản lý đơn hàng theo từng nhà vườn và truy xuất nguồn gốc QR minh bạch.
              </p>
            </div>
            <div>
              <div className="text-sm font-extrabold uppercase tracking-wider text-sunny mb-3">Điều hướng nhanh</div>
              <ul className="space-y-1.5 text-sm text-white/80">
                <li>
                  <Link to="/" className="inline-flex items-center gap-1.5 hover:text-sunny">
                    <OcopIcon name="home" className="w-3.5 h-3.5" />
                    <span>Trang chủ Chợ OCOP</span>
                  </Link>
                </li>
                <li>
                  <Link to="/san-pham" className="inline-flex items-center gap-1.5 hover:text-sunny">
                    <OcopIcon name="basket" className="w-3.5 h-3.5" />
                    <span>Sàn nông sản &amp; Bộ lọc</span>
                  </Link>
                </li>
                <li>
                  <Link to="/san-pham/buoi-duong-la-cam" className="inline-flex items-center gap-1.5 hover:text-sunny">
                    <OcopIcon name="citrus" className="w-3.5 h-3.5" />
                    <span>Chi tiết Bưởi Tân Triều</span>
                  </Link>
                </li>
                <li>
                  <Link to="/truy-xuat" className="inline-flex items-center gap-1.5 hover:text-sunny">
                    <OcopIcon name="shield-check" className="w-3.5 h-3.5" />
                    <span>Truy xuất nguồn gốc QR</span>
                  </Link>
                </li>
                <li>
                  <Link to="/dang-ban-ai" className="inline-flex items-center gap-1.5 hover:text-sunny">
                    <OcopIcon name="sparkles" className="w-3.5 h-3.5" />
                    <span>Nhà nông đăng bán AI</span>
                  </Link>
                </li>
                <li>
                  <Link to="/quan-ly-don" className="inline-flex items-center gap-1.5 hover:text-sunny">
                    <OcopIcon name="package" className="w-3.5 h-3.5" />
                    <span>Quản lý đơn hàng nhà vườn</span>
                  </Link>
                </li>
                <li>
                  <Link to="/don-hang" className="inline-flex items-center gap-1.5 hover:text-sunny">
                    <OcopIcon name="cart" className="w-3.5 h-3.5" />
                    <span>Giỏ hàng &amp; Đơn mua</span>
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <div className="text-sm font-extrabold uppercase tracking-wider text-sunny mb-3">Hỗ trợ đặt hàng 1 chạm</div>
              <ul className="space-y-2 text-sm text-white/80">
                <li className="flex items-center gap-2">
                  <OcopIcon name="phone" className="w-4 h-4 text-sunny" />
                  <span>Hotline: <strong>0251 3888 999</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <OcopIcon name="chat" className="w-4 h-4 text-sunny" />
                  <span>Zalo đặt hộ: <strong>0251 3888 999</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <OcopIcon name="truck" className="w-4 h-4 text-sunny" />
                  <span>Freeship nội tỉnh đơn từ 300.000đ</span>
                </li>
              </ul>
            </div>
          </div>
        </footer>

        <nav
          aria-label="Điều hướng nhanh điện thoại"
          className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-forest-dark/15 shadow-2xl px-1 pt-1.5 pb-[max(0.4rem,env(safe-area-inset-bottom))]"
        >
          <div className="grid grid-cols-5 items-center text-center">
            <Link
              to="/"
              className={`flex flex-col items-center justify-center py-1 ${
                activePageKey === 'home' ? 'text-forest font-extrabold' : 'text-forest-dark'
              }`}
            >
              <OcopIcon name="home" className="w-5 h-5" />
              <span className="text-[10px] font-bold mt-1">Trang chủ</span>
            </Link>
            <Link
              to="/san-pham"
              className={`flex flex-col items-center justify-center py-1 ${
                activePageKey === 'products' ? 'text-forest font-extrabold' : 'text-forest-dark'
              }`}
            >
              <OcopIcon name="basket" className="w-5 h-5" />
              <span className="text-[10px] font-bold mt-1">Nông sản</span>
            </Link>
            <button type="button" id="mob-nav-voice-btn" onClick={openVoiceModal} className="flex flex-col items-center justify-center -mt-4">
              <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-forest to-forest-dark text-white shadow-lg flex items-center justify-center border-2 border-white">
                <OcopIcon name="mic" className="w-5 h-5" />
              </span>
              <span className="text-[10px] font-extrabold text-forest mt-0.5">Giọng nói</span>
            </button>
            <Link
              to="/quan-ly-don"
              className={`flex flex-col items-center justify-center py-1 ${
                activePageKey === 'farmer-orders' ? 'text-harvest font-extrabold' : 'text-forest-dark'
              }`}
            >
              <OcopIcon name="package" className="w-5 h-5" />
              <span className="text-[10px] font-bold mt-1">Đơn vườn</span>
            </Link>
            <Link
              to="/don-hang?tab=cart"
              className={`relative flex flex-col items-center justify-center py-1 ${
                activePageKey === 'orders' ? 'text-forest font-extrabold' : 'text-forest-dark'
              }`}
            >
              <OcopIcon name="cart" className="w-5 h-5" />
              <span id="mob-cart-badge" className="absolute top-0 right-2 bg-sale text-white text-[9px] font-extrabold px-1.5 rounded-full min-w-[16px]">
                {cartTotals.totalQty}
              </span>
              <span className="text-[10px] font-bold mt-1">Giỏ hàng</span>
            </Link>
          </div>
        </nav>

        <VoiceSearchModal />
        <AiAssistantDrawer />
        <AuthModal />

        <div
          id="ocop-toast"
          role="status"
          aria-live="polite"
          className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-forest-dark text-white border-2 border-sunny px-5 py-3 rounded-full text-sm font-bold shadow-2xl transition-all duration-300 text-center max-w-[92vw] inline-flex items-center gap-2 ${
            toast.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'
          }`}
        >
          {toast.visible ? <OcopIcon name={toast.icon || 'check-circle'} className="w-4 h-4 text-sunny" /> : null}
          <span>{toast.message}</span>
        </div>
      </div>
    </>
  );
}
