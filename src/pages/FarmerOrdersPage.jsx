import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import OcopIcon from '../components/OcopIcon.jsx';
import SeoHead from '../components/SeoHead.jsx';
import { useOcop } from '../context/OcopContext.jsx';
import { formatVND, getProductLotCode, getStepMeta } from '../utils/format.js';
import { gsap, useGSAP } from '../utils/gsapConfig.js';
import { dictateToValue } from '../utils/speech.js';

const FARM_ICONS = ['cherry', 'citrus', 'peanut'];

export default function FarmerOrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    user,
    accounts,
    products,
    orders,
    setUser,
    restoreDefaultUser,
    openAuthModal,
    logoutUser,
    getFarmerOrders,
    addOrder,
    updateOrder,
    speakVietnamese,
    showToast,
  } = useOcop();

  const [statusFilter, setStatusFilter] = useState('all');
  const [searchText, setSearchText] = useState(() => searchParams.get('q') || '');
  const ordersListRef = useRef(null);
  const firstOrdersRenderRef = useRef(true);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q !== null) setSearchText(q);
  }, [searchParams]);

  useGSAP(
    () => {
      if (firstOrdersRenderRef.current) {
        firstOrdersRenderRef.current = false;
        return;
      }
      const cards = ordersListRef.current?.querySelectorAll('article');
      if (!cards?.length) return;
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from(Array.from(cards).slice(0, 6), {
          opacity: 0,
          y: 8,
          duration: 0.24,
          stagger: 0.04,
          ease: 'power2.out',
          clearProps: 'transform,opacity',
        });
      });
      return () => mm.revert();
    },
    { scope: ordersListRef, dependencies: [statusFilter, user?.phone] }
  );

  const seoJsonLd = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Quản Lý Đơn Hàng Nhà Vườn – Chợ OCOP Thanh Niên Đồng Nai',
      url: `${origin}/quan-ly-don`,
    };
  }, []);

  const demoFarmers = accounts.filter((a) => a.role === 'farmer');

  const loginAsFarmer = (phone) => {
    const target = demoFarmers.find((f) => f.phone === phone);
    if (!target) return;
    setUser(target);
    setStatusFilter('all');
    setSearchText('');
    setSearchParams({}, { replace: true });
    showToast(`Đã chuyển sang tài khoản: ${target.farmName}`, 'farmer');
  };

  if (!user || user.role !== 'farmer') {
    return (
      <>
        <SeoHead
          title="Quản Lý Đơn Hàng Nhà Vườn – Chợ OCOP Thanh Niên Đồng Nai"
          description="Trang dành riêng cho Nhà vườn / HTX trực tiếp quản lý đơn hàng bán ra theo từng tài khoản."
          canonicalPath="/quan-ly-don"
          robots="noindex, nofollow"
          jsonLd={seoJsonLd}
        />

        <main className="max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6">
          <section id="logged-out-notice" className="max-w-2xl mx-auto bg-white rounded-panel p-6 sm:p-8 border border-forest-dark/15 shadow-soft text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-harvest-light text-harvest-dark flex items-center justify-center">
              <OcopIcon name="farmer" className="w-8 h-8" />
            </div>
            <div>
              <h1 id="notice-title" className="text-xl sm:text-2xl font-extrabold text-forest-dark">
                {!user ? 'Bạn đã đăng xuất tài khoản' : `Đang ở tài khoản Khách hàng (${user.name})`}
              </h1>
              <p id="notice-sub" className="text-sm text-forest-dark/70 mt-1">
                {!user
                  ? 'Đăng nhập, tạo tài khoản Nhà vườn mới hoặc chọn nhanh 1 nhà vườn bên dưới để tiếp tục quản lý đơn bán ra:'
                  : 'Trang này dành riêng cho Nhà vườn quản lý đơn bán ra. Bạn có thể tạo tài khoản Nhà vườn mới hoặc chọn nhanh 1 nhà vườn bên dưới:'}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => openAuthModal('login', 'farmer')}
                className="inline-flex items-center gap-1.5 px-5 py-3 rounded-xl bg-forest-dark hover:bg-forest text-white font-extrabold text-sm shadow-sm transition-colors"
              >
                <OcopIcon name="lock" className="w-4 h-4 text-sunny" />
                <span>Đăng nhập tài khoản</span>
              </button>
              <button
                type="button"
                onClick={() => openAuthModal('register', 'farmer')}
                className="inline-flex items-center gap-1.5 px-5 py-3 rounded-xl bg-harvest hover:bg-harvest-dark text-white font-extrabold text-sm shadow-sm transition-colors"
              >
                <OcopIcon name="sparkles" className="w-4 h-4" />
                <span>Đăng ký tài khoản mới</span>
              </button>
            </div>
            <div className="pt-3 border-t border-forest-dark/10">
              <div className="inline-flex items-center gap-1 text-xs font-extrabold uppercase text-forest-dark/55 mb-2.5">
                <OcopIcon name="zap" className="w-3.5 h-3.5 text-sunny" />
                <span>Hoặc chọn nhanh nhà vườn có sẵn:</span>
              </div>
              <div id="resume-farms-grid" className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-left">
                {demoFarmers.slice(0, 3).map((f, idx) => (
                  <button
                    key={f.phone}
                    type="button"
                    onClick={() => restoreDefaultUser(f.phone)}
                    className="p-3.5 rounded-2xl bg-bgsoft hover:bg-harvest-light border border-forest-dark/15 hover:border-harvest transition-all"
                  >
                    <div className="text-forest mb-1">
                      <OcopIcon name={FARM_ICONS[idx] || 'wheat'} className="w-5 h-5" />
                    </div>
                    <div className="font-extrabold text-xs sm:text-sm text-forest-dark line-clamp-1">{f.farmName}</div>
                    <div className="text-[11px] text-forest-dark/65 mt-0.5 inline-flex items-center gap-1 flex-wrap">
                      <span>{f.name} •</span>
                      <OcopIcon name="pin" className="w-3 h-3 text-sale" />
                      <span>{f.region || 'Đồng Nai'}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="pt-1">
              <Link to="/" className="inline-block px-4 py-2 rounded-xl bg-mint hover:bg-forest/15 text-forest-dark font-bold text-xs">
                ← Quay về Trang chủ Chợ OCOP
              </Link>
            </div>
          </section>
        </main>
      </>
    );
  }

  const farmName = user.farmName || user.name;
  const allMine = getFarmerOrders(farmName);
  const countByStep = {
    all: allMine.length,
    1: allMine.filter((o) => o.step === 1).length,
    2: allMine.filter((o) => o.step === 2).length,
    3: allMine.filter((o) => o.step === 3).length,
    4: allMine.filter((o) => o.step === 4).length,
    0: allMine.filter((o) => o.step === 0).length,
  };
  const revenue = allMine
    .filter((o) => o.step !== 0)
    .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  const q = searchText.trim().toLowerCase();
  const filtered = allMine.filter((o) => {
    if (statusFilter !== 'all' && String(o.step) !== statusFilter) return false;
    if (q) {
      const hay = `${o.id} ${o.customer} ${o.customerPhone || ''} ${o.address || ''} ${o.itemsText} ${o.status} ${o.note || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const createSampleOrderForCurrentFarm = () => {
    const myProds = products.filter((p) => p.shop === farmName);
    const prod = myProds[0] || products[0];
    const sampleCustomers = [
      { name: 'Chị Ngọc Lan', phone: '0918 552 301', addr: 'KDC Hiệp Thành, TP. Biên Hòa, Đồng Nai', note: 'Giao buổi chiều giúp em nhé.' },
      { name: 'Anh Hoàng Phúc', phone: '0909 441 820', addr: 'Phường Xuân Trung, TP. Long Khánh, Đồng Nai', note: 'Chọn trái già đều, để biếu ông bà.' },
      { name: 'Cô Thanh Mai', phone: '0977 210 665', addr: 'Thị trấn Long Thành, H. Long Thành, Đồng Nai', note: 'Gọi điện trước 15 phút khi giao.' },
    ];
    const c = sampleCustomers[Math.floor(Math.random() * sampleCustomers.length)];
    const qty = 2;
    const unitPrice = prod ? prod.price : 85000;
    const usedIds = new Set(orders.map((o) => o.id));
    let newId = '';
    do {
      newId = '#OCOP-' + Math.floor(2000 + Math.random() * 7999);
    } while (usedIds.has(newId));

    const newOrder = {
      id: newId,
      date: 'Vừa xong',
      status: 'Chờ nhà vườn xác nhận',
      step: 1,
      shop: farmName,
      productId: prod ? prod.id : 'p1',
      customer: `${c.name} (${c.phone})`,
      customerPhone: c.phone.replace(/\s+/g, ''),
      address: c.addr,
      note: c.note,
      payment: Math.random() > 0.4 ? 'COD' : 'VietQR (Đã thanh toán)',
      total: unitPrice * qty,
      qty,
      itemsText: `${prod ? prod.name : 'Nông sản tươi tại vườn'} (Gói tiêu chuẩn × ${qty})`,
    };
    addOrder(newOrder);
    showToast(`Có đơn mới ${newOrder.id} gửi tới ${farmName}!`, 'bell');
  };

  const handleUpdateOrderStatus = (orderId, nextStep, nextStatusText) => {
    updateOrder(orderId, { step: nextStep, status: nextStatusText });
    showToast(`Đơn ${orderId} đã cập nhật: ${nextStatusText}`, 'check-circle');
  };

  const speakOrder = (order) => {
    const txt = `Đơn hàng ${order.id.replace('#', '')}. Trạng thái: ${order.status}. Sản phẩm: ${order.itemsText}. Khách nhận: ${order.customer}. Địa chỉ: ${order.address || 'Đồng Nai'}. Tổng tiền ${formatVND(order.total)}, thanh toán ${order.payment}.`;
    speakVietnamese(txt);
  };

  const speakDashboardSummary = () => {
    speakVietnamese(
      `Xin chào ${farmName}. Hiện vườn có tổng cộng ${allMine.length} đơn hàng, trong đó ${countByStep[1]} đơn đang chờ xác nhận, ${countByStep[2]} đơn đang hái và đóng gói, ${countByStep[3]} đơn đang giao. Tổng doanh thu đạt ${formatVND(revenue)}.`
    );
  };

  const resetFilters = () => {
    setStatusFilter('all');
    setSearchText('');
    setSearchParams({}, { replace: true });
  };

  const statusTabs = [
    { key: 'all', icon: null, label: `Tất cả (${countByStep.all})`, idleCls: 'bg-bgsoft text-forest-dark hover:bg-mint' },
    { key: '1', icon: 'bell', label: `Chờ duyệt (${countByStep[1]})`, idleCls: 'bg-sale/10 text-sale hover:bg-sale hover:text-white' },
    { key: '2', icon: 'basket', label: `Hái & gói (${countByStep[2]})`, idleCls: 'bg-harvest-light text-harvest-dark hover:bg-harvest hover:text-white' },
    { key: '3', icon: 'truck', label: `Đang giao (${countByStep[3]})`, idleCls: 'bg-bgsoft text-forest-dark hover:bg-mint' },
    { key: '4', icon: 'check-circle', label: `Hoàn tất (${countByStep[4]})`, idleCls: 'bg-bgsoft text-forest-dark hover:bg-mint' },
    { key: '0', icon: 'x', label: `Đã hủy (${countByStep[0]})`, idleCls: 'bg-bgsoft text-forest-dark hover:bg-mint' },
  ];

  return (
    <>
      <SeoHead
        title="Quản Lý Đơn Hàng Nhà Vườn – Chợ OCOP Thanh Niên Đồng Nai"
        description="Trang dành riêng cho Nhà vườn / HTX trực tiếp quản lý đơn hàng bán ra theo từng tài khoản, cập nhật trạng thái hái tươi - giao hàng và hỗ trợ giọng nói."
        canonicalPath="/quan-ly-don"
        robots="noindex, nofollow"
        jsonLd={seoJsonLd}
      />

      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6">
        <section id="farmer-dashboard" className="space-y-6">
          <div className="bg-gradient-to-br from-harvest-dark via-harvest to-amber-700 text-white rounded-panel p-5 sm:p-7 shadow-soft">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="inline-flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/15 text-sunny text-xs font-extrabold uppercase">
                    <OcopIcon name="package" className="w-3.5 h-3.5" />
                    <span>Quản Lý Đơn Bán Ra</span>
                  </span>
                  <span id="fd-cert" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-forest-dark/70 text-white text-xs font-bold">
                    <OcopIcon name="star-filled" className="w-3.5 h-3.5 text-sunny" />
                    <span>{user.cert || 'OCOP Đồng Nai'}</span>
                  </span>
                </div>
                <h1 id="fd-farm-name" className="text-2xl sm:text-3xl font-extrabold leading-tight">
                  {farmName}
                </h1>
                <p className="text-xs sm:text-sm text-white/90 inline-flex items-center gap-1.5 flex-wrap">
                  <span>
                    Chủ vườn: <strong id="fd-owner-name">{user.name || 'Chủ vườn'}</strong> • SĐT:{' '}
                    <strong id="fd-owner-phone">{user.phone || '0251 3888 999'}</strong> •
                  </span>
                  <OcopIcon name="pin" className="w-3.5 h-3.5 text-sunny" />
                  <span id="fd-region">{user.region || 'Đồng Nai'}, Đồng Nai</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  id="btn-speak-summary"
                  onClick={speakDashboardSummary}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 font-extrabold text-xs sm:text-sm transition-colors"
                >
                  <OcopIcon name="volume" className="w-4 h-4" />
                  <span>Đọc tóm tắt</span>
                </button>
                <Link
                  to="/dang-ban-ai"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sunny hover:bg-amber-400 text-forest-dark font-extrabold text-xs sm:text-sm transition-colors"
                >
                  <OcopIcon name="sparkles" className="w-4 h-4" />
                  <span>Đăng bán AI</span>
                </Link>
                <Link
                  id="fd-shop-link"
                  to={`/san-pham?shop=${encodeURIComponent(farmName)}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-forest-dark hover:bg-forest text-white font-bold text-xs sm:text-sm transition-colors"
                >
                  <OcopIcon name="store" className="w-4 h-4 text-sunny" />
                  <span>Gian hàng</span>
                </Link>
                <button
                  type="button"
                  onClick={logoutUser}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sale hover:bg-sale-hover text-white font-extrabold text-xs sm:text-sm shadow-sm transition-colors"
                >
                  <OcopIcon name="logout" className="w-4 h-4" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            </div>

            <div className="mt-4 pt-3.5 border-t border-white/20 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-white/80 inline-flex items-center gap-1">
                <OcopIcon name="refresh" className="w-3.5 h-3.5 text-sunny" />
                <span>Chọn nhà vườn đang quản lý:</span>
              </span>
              <div id="fd-quick-switch" className="flex flex-wrap gap-1.5">
                {demoFarmers.slice(0, 3).map((f) => {
                  const isCurrent = f.farmName === farmName;
                  const cnt = getFarmerOrders(f.farmName).length;
                  return (
                    <button
                      key={f.phone}
                      type="button"
                      onClick={() => loginAsFarmer(f.phone)}
                      className={`px-2.5 py-1 rounded-full font-bold transition-colors ${
                        isCurrent ? 'bg-sunny text-forest-dark shadow-sm' : 'bg-white/15 hover:bg-white/25 text-white'
                      }`}
                    >
                      {f.region || f.name} ({cnt})
                    </button>
                  );
                })}
              </div>
              <Link to="/don-hang?tab=orders" className="ml-auto text-sunny font-extrabold hover:underline">
                Xem đơn phía khách mua →
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => setStatusFilter('1')}
              className="kpi-card text-left bg-white rounded-card p-4 sm:p-5 border-2 border-sale/25 hover:border-sale shadow-soft transition-all"
            >
              <div className="flex items-center justify-between text-xs font-extrabold text-sale uppercase">
                <span className="inline-flex items-center gap-1">
                  <OcopIcon name="bell" className="w-3.5 h-3.5" />
                  <span>Chờ xác nhận</span>
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-sale animate-pulse" />
              </div>
              <div id="kpi-pending" className="text-2xl sm:text-3xl font-extrabold text-forest-dark mt-1.5">
                {countByStep[1]}
              </div>
              <div className="text-[11px] text-forest-dark/65 mt-0.5">Cần bấm duyệt hái tươi</div>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('2')}
              className="kpi-card text-left bg-white rounded-card p-4 sm:p-5 border border-forest-dark/10 hover:border-harvest shadow-soft transition-all"
            >
              <div className="inline-flex items-center gap-1 text-xs font-extrabold text-harvest uppercase">
                <OcopIcon name="basket" className="w-3.5 h-3.5" />
                <span>Đang hái &amp; đóng gói</span>
              </div>
              <div id="kpi-packing" className="text-2xl sm:text-3xl font-extrabold text-forest-dark mt-1.5">
                {countByStep[2]}
              </div>
              <div className="text-[11px] text-forest-dark/65 mt-0.5">Chuẩn bị giao shipper</div>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('3')}
              className="kpi-card text-left bg-white rounded-card p-4 sm:p-5 border border-forest-dark/10 hover:border-forest shadow-soft transition-all"
            >
              <div className="inline-flex items-center gap-1 text-xs font-extrabold text-forest uppercase">
                <OcopIcon name="truck" className="w-3.5 h-3.5" />
                <span>Đang giao khách</span>
              </div>
              <div id="kpi-shipping" className="text-2xl sm:text-3xl font-extrabold text-forest-dark mt-1.5">
                {countByStep[3]}
              </div>
              <div className="text-[11px] text-forest-dark/65 mt-0.5">Đang trên đường vận chuyển</div>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className="kpi-card text-left bg-mint rounded-card p-4 sm:p-5 border border-forest/20 hover:border-forest shadow-soft transition-all"
            >
              <div className="inline-flex items-center gap-1 text-xs font-extrabold text-forest-dark uppercase">
                <OcopIcon name="dollar" className="w-3.5 h-3.5 text-forest" />
                <span>Doanh thu bán ra</span>
              </div>
              <div id="kpi-revenue" className="text-xl sm:text-2xl font-extrabold text-forest mt-1.5">
                {formatVND(revenue)}
              </div>
              <div id="kpi-done-sub" className="text-[11px] text-forest-dark/70 mt-0.5">
                {countByStep[4]} đơn đã hoàn tất
              </div>
            </button>
          </div>

          <div className="bg-white rounded-panel p-4 sm:p-5 border border-forest-dark/10 shadow-soft space-y-3.5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div id="status-tabs" className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 md:pb-0">
                {statusTabs.map((tab) => {
                  const active = statusFilter === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setStatusFilter(tab.key)}
                      className={
                        active
                          ? 'status-tab shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold bg-forest-dark text-white shadow-sm'
                          : `status-tab shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold ${tab.idleCls}`
                      }
                    >
                      {tab.icon ? <OcopIcon name={tab.icon} className="w-3.5 h-3.5" /> : null}
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="relative flex-1 sm:w-64">
                  <input
                    type="search"
                    id="order-search-input"
                    aria-label="Tìm mã đơn, tên khách hoặc số điện thoại"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Tìm mã đơn, tên khách, SĐT..."
                    className="w-full pl-3.5 pr-10 py-2 rounded-xl bg-bgsoft border border-forest-dark/15 focus:border-forest focus:bg-white focus:outline-none focus:ring-2 focus:ring-forest/20 text-xs sm:text-sm font-medium"
                  />
                  <button
                    type="button"
                    id="btn-voice-order-search"
                    title="Đọc tên khách hoặc mã đơn bằng giọng nói"
                    aria-label="Đọc tên khách hoặc mã đơn bằng giọng nói"
                    onClick={() =>
                      dictateToValue({
                        onToast: (m) => showToast(m, 'mic'),
                        onInterim: (val) => setSearchText(val),
                        onDone: (val) => {
                          setSearchText(val || '');
                          if (val) showToast(`Đang tìm đơn chứa: “${val}”`, 'mic');
                        },
                      })
                    }
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-mint hover:bg-forest hover:text-white text-forest flex items-center justify-center transition-colors"
                  >
                    <OcopIcon name="mic" className="w-4 h-4" />
                  </button>
                </div>
                <button
                  type="button"
                  id="btn-add-sample-order"
                  onClick={createSampleOrderForCurrentFarm}
                  className="px-3 py-2 rounded-xl bg-harvest-light hover:bg-amber-200 text-harvest-dark font-extrabold text-xs border border-harvest/25 shrink-0"
                  title="Tạo nhanh 1 đơn khách mới đặt vào vườn này để thử nghiệm"
                >
                  + Đơn mẫu
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-forest-dark/65 pt-2 border-t border-forest-dark/10">
              <span id="order-result-summary">
                Đang hiển thị <strong>{filtered.length} / {allMine.length}</strong> đơn hàng riêng của{' '}
                <strong>{farmName}</strong>
                {searchText.trim() ? ` (lọc: “${searchText.trim()}”)` : ''}.
              </span>
              <span className="inline-flex items-center gap-1">
                <OcopIcon name="lightbulb" className="w-3.5 h-3.5 text-sunny shrink-0" />
                <span>
                  Mọi cập nhật trạng thái đồng bộ ngay sang trang{' '}
                  <Link to="/don-hang?tab=orders" className="font-bold text-forest hover:underline">
                    Đơn mua của khách →
                  </Link>
                </span>
              </span>
            </div>
          </div>

          <div ref={ordersListRef} id="farmer-orders-list" className="space-y-4">
            {!filtered.length ? (
              <div className="bg-white rounded-panel p-8 sm:p-10 text-center border border-forest-dark/10 shadow-soft">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-mint text-forest flex items-center justify-center mb-3">
                  <OcopIcon name={allMine.length === 0 ? 'sprout' : 'search'} className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-extrabold text-forest-dark mb-1">
                  {allMine.length === 0
                    ? `Vườn “${farmName}” chưa có đơn hàng nào`
                    : 'Không có đơn hàng khớp bộ lọc hiện tại'}
                </h3>
                <p className="text-sm text-forest-dark/70 mb-5 max-w-md mx-auto">
                  {allMine.length === 0
                    ? 'Khi khách đặt mua sản phẩm của vườn bạn ở trang Giỏ hàng, đơn sẽ tự động đổ về đây. Bạn cũng có thể tạo 1 đơn mẫu để thử thao tác duyệt đơn ngay!'
                    : 'Hãy bấm xem “Tất cả” hoặc xóa từ khóa tìm kiếm để xem toàn bộ đơn hàng của vườn.'}
                </p>
                <div className="flex flex-wrap justify-center gap-2.5">
                  {allMine.length === 0 ? (
                    <button
                      type="button"
                      onClick={createSampleOrderForCurrentFarm}
                      className="px-5 py-2.5 rounded-xl bg-harvest hover:bg-harvest-dark text-white font-extrabold text-sm"
                    >
                      + Tạo 1 đơn mẫu cho vườn mình
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="px-5 py-2.5 rounded-xl bg-forest-dark text-white font-extrabold text-sm"
                    >
                      Xem tất cả đơn của vườn
                    </button>
                  )}
                  <Link
                    to="/dang-ban-ai"
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-mint text-forest-dark font-bold text-sm border border-forest/20"
                  >
                    <OcopIcon name="sparkles" className="w-4 h-4 text-forest" />
                    <span>Đăng thêm nông sản AI</span>
                  </Link>
                </div>
              </div>
            ) : (
              filtered.map((o) => {
                const meta = getStepMeta(o.step);
                const prod = products.find((p) => p.id === o.productId);
                const lotCode = prod ? getProductLotCode(prod) : '';
                const telHref = o.customerPhone
                  ? `tel:${o.customerPhone.replace(/\s+/g, '')}`
                  : 'tel:02513888999';

                return (
                  <article
                    key={o.id}
                    className={`bg-white rounded-panel p-5 border ${
                      o.step === 1 ? 'border-sale/35 ring-1 ring-sale/10' : 'border-forest-dark/10'
                    } shadow-soft space-y-3.5`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-forest-dark/10">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-base text-forest-dark">{o.id}</strong>
                        <span className="inline-flex items-center gap-1 text-xs text-forest-dark/60">
                          <OcopIcon name="clock" className="w-3.5 h-3.5" />
                          <span>{o.date}</span>
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${meta.badge}`}>
                          <OcopIcon name={meta.icon} className="w-3.5 h-3.5" />
                          <span>{o.status}</span>
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-lg sm:text-xl font-extrabold text-sale">{formatVND(o.total)}</div>
                        <div className="text-[11px] font-bold text-forest-dark/60">{o.payment || 'COD'}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-sm">
                      <div className="md:col-span-7 bg-mint/55 rounded-2xl p-3.5 border border-forest/15">
                        <div className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase text-forest mb-1">
                          <OcopIcon name="basket" className="w-3.5 h-3.5" />
                          <span>Nông sản khách đặt</span>
                        </div>
                        <div className="font-bold text-forest-dark leading-snug">{o.itemsText}</div>
                        {o.note ? (
                          <div className="mt-2 text-xs font-semibold text-harvest-dark bg-harvest-light/80 px-2.5 py-1.5 rounded-lg inline-flex items-start gap-1.5">
                            <OcopIcon name="file-text" className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>Ghi chú: {o.note}</span>
                          </div>
                        ) : null}
                      </div>
                      <div className="md:col-span-5 bg-bgsoft rounded-2xl p-3.5 border border-forest-dark/10 text-xs space-y-1">
                        <div className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase text-forest-dark/60">
                          <OcopIcon name="user" className="w-3.5 h-3.5" />
                          <span>Thông tin khách nhận</span>
                        </div>
                        <div className="font-extrabold text-sm text-forest-dark">{o.customer}</div>
                        <div className="text-forest-dark/80 inline-flex items-start gap-1">
                          <OcopIcon name="pin" className="w-3.5 h-3.5 text-sale shrink-0 mt-0.5" />
                          <span>{o.address || 'Nhận hàng tại Đồng Nai'}</span>
                        </div>
                      </div>
                    </div>

                    {o.step === 0 ? (
                      <div className="py-2 px-3 rounded-xl bg-sale/10 text-sale text-xs font-extrabold inline-flex items-center gap-1.5">
                        <OcopIcon name="x" className="w-3.5 h-3.5" />
                        <span>Đơn hàng này đã được hủy — không tính vào doanh thu bán ra.</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-1.5 text-[11px] font-bold text-center">
                        <div className={`py-1.5 rounded-lg ${o.step >= 1 ? 'bg-forest text-white' : 'bg-bgsoft text-forest-dark/45'}`}>
                          1. Chờ duyệt
                        </div>
                        <div className={`py-1.5 rounded-lg ${o.step >= 2 ? 'bg-forest text-white' : 'bg-bgsoft text-forest-dark/45'}`}>
                          2. Hái &amp; gói
                        </div>
                        <div className={`py-1.5 rounded-lg ${o.step >= 3 ? 'bg-forest text-white' : 'bg-bgsoft text-forest-dark/45'}`}>
                          3. Đang giao
                        </div>
                        <div className={`py-1.5 rounded-lg ${o.step >= 4 ? 'bg-forest text-white' : 'bg-bgsoft text-forest-dark/45'}`}>
                          4. Hoàn tất
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-forest-dark/10">
                      <div className="flex flex-wrap items-center gap-2">
                        {o.step === 1 ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleUpdateOrderStatus(o.id, 2, 'Đang hái tươi & đóng gói')}
                              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-forest hover:bg-forest-dark text-white font-extrabold text-xs sm:text-sm shadow-sm transition-colors"
                            >
                              <OcopIcon name="check" className="w-4 h-4" />
                              <span>Xác nhận &amp; Hái tươi</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateOrderStatus(o.id, 0, 'Nhà vườn đã hủy')}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-sale/10 hover:bg-sale hover:text-white text-sale font-bold text-xs sm:text-sm transition-colors"
                            >
                              <OcopIcon name="x" className="w-4 h-4" />
                              <span>Hủy đơn</span>
                            </button>
                          </>
                        ) : null}
                        {o.step === 2 ? (
                          <button
                            type="button"
                            onClick={() => handleUpdateOrderStatus(o.id, 3, 'Đang giao đến khách')}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-harvest hover:bg-harvest-dark text-white font-extrabold text-xs sm:text-sm shadow-sm transition-colors"
                          >
                            <OcopIcon name="truck" className="w-4 h-4" />
                            <span>Bàn giao cho shipper</span>
                          </button>
                        ) : null}
                        {o.step === 3 ? (
                          <button
                            type="button"
                            onClick={() => handleUpdateOrderStatus(o.id, 4, 'Giao hàng thành công')}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-forest-dark hover:bg-forest text-white font-extrabold text-xs sm:text-sm shadow-sm transition-colors"
                          >
                            <OcopIcon name="party" className="w-4 h-4 text-sunny" />
                            <span>Xác nhận đã giao xong</span>
                          </button>
                        ) : null}
                        {o.step === 4 ? (
                          <span className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-mint text-forest font-extrabold text-xs">
                            <OcopIcon name="check-circle" className="w-4 h-4" />
                            <span>Đã hoàn tất &amp; đối soát</span>
                          </span>
                        ) : null}
                        {o.step === 0 ? (
                          <button
                            type="button"
                            onClick={() => handleUpdateOrderStatus(o.id, 1, 'Chờ nhà vườn xác nhận')}
                            className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-bgsoft hover:bg-mint text-forest-dark font-bold text-xs"
                          >
                            <OcopIcon name="refresh" className="w-3.5 h-3.5" />
                            <span>Khôi phục đơn</span>
                          </button>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <button
                          type="button"
                          onClick={() => speakOrder(o)}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-mint hover:bg-forest hover:text-white text-forest-dark font-bold transition-colors"
                        >
                          <OcopIcon name="volume" className="w-3.5 h-3.5" />
                          <span>Đọc đơn</span>
                        </button>
                        <a
                          href={telHref}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-bgsoft hover:bg-forest/15 text-forest-dark font-bold transition-colors"
                        >
                          <OcopIcon name="phone" className="w-3.5 h-3.5 text-forest" />
                          <span>Gọi khách</span>
                        </a>
                        {lotCode ? (
                          <Link
                            to={`/truy-xuat?code=${encodeURIComponent(lotCode)}`}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-bgsoft hover:bg-forest-dark hover:text-sunny text-forest-dark font-bold transition-colors"
                          >
                            <OcopIcon name="shield-check" className="w-3.5 h-3.5 text-forest" />
                            <span>QR lô</span>
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </main>
    </>
  );
}
