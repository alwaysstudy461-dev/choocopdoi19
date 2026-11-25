import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import OcopIcon from '../components/OcopIcon.jsx';
import { normalizeAssetPath } from '../components/ProductImage.jsx';
import SeoHead from '../components/SeoHead.jsx';
import { useOcop } from '../context/OcopContext.jsx';
import {
  copyToClipboard,
  formatVND,
  getProductUrl,
  splitCartToShopOrders,
} from '../utils/format.js';
import { gsap, isReducedMotion, useGSAP } from '../utils/gsapConfig.js';
import { dictateToValue } from '../utils/speech.js';

export default function OrdersCartPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    products,
    cart,
    setCart,
    orders,
    addOrders,
    user,
    voucher,
    setVoucherState,
    cartTotals,
    showToast,
  } = useOcop();

  const [activeTab, setActiveTab] = useState(() =>
    searchParams.get('tab') === 'orders' ? 'orders' : 'cart'
  );
  const [voucherInput, setVoucherInput] = useState(voucher.applied ? 'OCOPDN' : '');
  const [coName, setCoName] = useState(user?.name || '');
  const [coPhone, setCoPhone] = useState(user?.phone || '');
  const [coAddr, setCoAddr] = useState(user?.address || '');
  const [coNote, setCoNote] = useState('');
  const [payment, setPayment] = useState('COD');

  const viewWrapRef = useRef(null);
  const firstTabRef = useRef(true);
  const prevUserPhoneRef = useRef(user?.phone || '');

  useEffect(() => {
    const t = searchParams.get('tab');
    setActiveTab(t === 'orders' ? 'orders' : 'cart');
  }, [searchParams]);

  useEffect(() => {
    if (voucher.applied) setVoucherInput('OCOPDN');
  }, [voucher.applied]);

  useEffect(() => {
    const nextPhone = user?.phone || '';
    if (nextPhone !== prevUserPhoneRef.current) {
      prevUserPhoneRef.current = nextPhone;
      setCoName(user?.name || '');
      setCoPhone(user?.phone || '');
      setCoAddr(user?.address || '');
    }
  }, [user]);

  useGSAP(
    () => {
      if (firstTabRef.current) {
        firstTabRef.current = false;
        return;
      }
      if (!viewWrapRef.current || isReducedMotion()) return;
      gsap.fromTo(
        viewWrapRef.current,
        { opacity: 0.45, y: 8 },
        { opacity: 1, y: 0, duration: 0.24, ease: 'power2.out', clearProps: 'transform,opacity' }
      );
    },
    { dependencies: [activeTab] }
  );

  const seoJsonLd = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Giỏ Hàng & Đơn Hàng – Chợ OCOP Thanh Niên Đồng Nai',
      url: `${origin}/don-hang`,
    };
  }, []);

  const switchTab = (t) => {
    setActiveTab(t);
    setSearchParams({ tab: t }, { replace: true });
  };

  const changeQty = (idx, delta) => {
    setCart((prev) => {
      const next = prev.map((item) => ({ ...item }));
      if (!next[idx]) return next;
      next[idx].qty += delta;
      if (next[idx].qty <= 0) next.splice(idx, 1);
      return next;
    });
  };

  const handleApplyVoucher = () => {
    const code = voucherInput.trim().toUpperCase();
    if (!code) {
      if (voucher.applied) {
        setVoucherState({ saved: false, applied: false });
        showToast('Đã bỏ mã giảm giá.', 'info');
      } else {
        showToast('Nhập mã OCOPDN để nhận giảm 20.000đ nhé!', 'alert');
      }
      return;
    }
    if (code === 'OCOPDN') {
      setVoucherState({ saved: true, applied: true });
      showToast('Áp dụng mã OCOPDN thành công!', 'party');
    } else {
      showToast('Mã chưa đúng. Thử nhập mã OCOPDN nhé!', 'alert');
    }
  };

  const handleCheckoutSubmit = (e) => {
    e.preventDefault();
    if (!cart.length) {
      showToast('Giỏ hàng đang trống!', 'alert');
      return;
    }
    const name = coName.trim();
    const phone = coPhone.trim();
    const addr = coAddr.trim();
    const note = coNote.trim();
    if (!name || phone.replace(/\s+/g, '').length < 9 || !addr) {
      showToast('Điền đủ Họ tên, SĐT và Địa chỉ nhé!', 'alert');
      return;
    }

    const newOrders = splitCartToShopOrders({
      cart,
      products,
      shipping: cartTotals.shipping,
      discount: cartTotals.discount,
      customerName: name,
      customerPhone: phone,
      address: addr,
      note,
      payment,
      existingIds: orders.map((o) => o.id),
    });

    addOrders(newOrders, {
      cart,
      voucherCode: voucher.applied ? 'OCOPDN' : '',
      customerName: name,
      customerPhone: phone,
      address: addr,
      note,
      payment,
    });
    setCart([]);
    setCoNote('');
    switchTab('orders');
    showToast(`Đặt hàng thành công (${newOrders.map((o) => o.id).join(', ')})! Đã gửi tới nhà vườn.`, 'party');
  };

  const handleCopyZalo = async () => {
    await copyToClipboard('02513888999');
    showToast('Đã sao chép Zalo hỗ trợ: 0251 3888 999', 'check-circle');
  };

  const { subtotal, shipping, discount, total } = cartTotals;

  return (
    <>
      <SeoHead
        title="Giỏ Hàng & Đơn Hàng – Chợ OCOP Thanh Niên Đồng Nai"
        description="Giỏ hàng, thanh toán COD/VietQR, áp mã giảm giá OCOPDN và theo dõi đơn hàng trên Chợ OCOP Thanh Niên Đồng Nai."
        canonicalPath="/don-hang"
        robots="noindex, nofollow"
        jsonLd={seoJsonLd}
      />

      <main className="max-w-6xl mx-auto px-3 sm:px-6 py-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-forest">
              <OcopIcon name="cart" className="w-4 h-4" />
              <span>Mua sắm &amp; Giao nhận nông sản tươi</span>
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-forest-dark mt-0.5">
              Giỏ Hàng, Thanh Toán &amp; Đơn Hàng
            </h1>
          </div>
          <div className="inline-flex p-1 rounded-2xl bg-white border border-forest-dark/10 shadow-soft">
            <button
              type="button"
              id="tab-cart"
              onClick={() => switchTab('cart')}
              className={
                activeTab === 'cart'
                  ? 'inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold bg-forest-dark text-white'
                  : 'inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-forest-dark/70'
              }
            >
              <OcopIcon name="cart" className="w-4 h-4" />
              <span>Giỏ hàng &amp; Đặt hàng</span>
            </button>
            <button
              type="button"
              id="tab-orders"
              onClick={() => switchTab('orders')}
              className={
                activeTab === 'orders'
                  ? 'inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold bg-forest-dark text-white'
                  : 'inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-forest-dark/70'
              }
            >
              <OcopIcon name="clipboard" className="w-4 h-4" />
              <span>Đơn hàng của tôi</span>
            </button>
          </div>
        </div>

        <div ref={viewWrapRef}>
          {activeTab === 'cart' ? (
            <section id="view-cart" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-7 space-y-4">
                <div id="freeship-bar" className="bg-mint rounded-2xl px-4 py-3 border border-forest/20 text-xs sm:text-sm font-bold text-forest-dark flex items-center gap-2">
                  <OcopIcon name={subtotal >= 300000 ? 'party' : 'truck'} className="w-4 h-4 text-forest shrink-0" />
                  <span>
                    {subtotal === 0 ? (
                      <>
                        Miễn phí vận chuyển nội tỉnh cho đơn từ <strong>300.000đ</strong>.
                      </>
                    ) : subtotal >= 300000 ? (
                      <>
                        Tuyệt vời! Đơn hàng của bạn được <strong>MIỄN PHÍ VẬN CHUYỂN</strong>.
                      </>
                    ) : (
                      <>
                        Mua thêm <strong className="text-sale">{formatVND(300000 - subtotal)}</strong> để được{' '}
                        <strong>Freeship nội tỉnh</strong>!
                      </>
                    )}
                  </span>
                </div>

                <div id="cart-list" className="space-y-3">
                  {!cart.length ? (
                    <div className="bg-white rounded-panel p-10 text-center border border-forest-dark/10 shadow-soft">
                      <div className="w-16 h-16 mx-auto rounded-2xl bg-mint text-forest flex items-center justify-center mb-3">
                        <OcopIcon name="basket" className="w-8 h-8" />
                      </div>
                      <h3 className="text-lg font-extrabold text-forest-dark mb-1">Giỏ hàng đang trống</h3>
                      <p className="text-sm text-forest-dark/70 mb-4">Hãy chọn thêm nông sản tươi sạch Đồng Nai nhé!</p>
                      <Link to="/san-pham" className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-forest-dark text-white font-bold text-sm">
                        <span>Đi chợ ngay</span>
                        <OcopIcon name="arrow-right" className="w-4 h-4" />
                      </Link>
                    </div>
                  ) : (
                    cart.map((item, i) => {
                      const p = products.find((x) => x.id === item.productId);
                      if (!p) return null;
                      const src = normalizeAssetPath(p.image);
                      return (
                        <div key={`${item.productId}-${item.variantIndex}`} className="bg-white rounded-2xl p-4 border border-forest-dark/10 shadow-soft flex gap-3.5">
                          <div className="w-20 h-20 rounded-xl overflow-hidden img-fallback-box shrink-0 relative flex items-center justify-center">
                            <span aria-hidden="true" className="text-forest/70 flex items-center justify-center">
                              <OcopIcon name={p.icon || p.emoji} className="w-7 h-7" />
                            </span>
                            {src ? (
                              <img
                                src={src}
                                alt={p.name}
                                className="absolute inset-0 w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : null}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between gap-2">
                              <Link to={getProductUrl(p)} className="font-extrabold text-sm text-forest-dark hover:text-forest line-clamp-2">
                                {p.name}
                              </Link>
                              <button
                                type="button"
                                aria-label={`Xóa ${p.name} khỏi giỏ`}
                                onClick={() => changeQty(i, -999)}
                                className="text-forest-dark/40 hover:text-sale font-bold p-1"
                              >
                                <OcopIcon name="x" className="w-4 h-4" />
                              </button>
                            </div>
                            <span className="inline-block text-[11px] font-bold text-forest bg-mint px-2 py-0.5 rounded mt-1">
                              {item.variantLabel}
                            </span>
                            <div className="flex items-center justify-between mt-2.5">
                              <div className="inline-flex items-center gap-1.5 bg-bgsoft rounded-lg p-0.5 border border-forest-dark/10">
                                <button
                                  type="button"
                                  aria-label={`Giảm số lượng ${p.name}`}
                                  onClick={() => changeQty(i, -1)}
                                  className="w-7 h-7 rounded bg-white font-extrabold"
                                >
                                  −
                                </button>
                                <span className="text-xs font-extrabold min-w-[20px] text-center">{item.qty}</span>
                                <button
                                  type="button"
                                  aria-label={`Tăng số lượng ${p.name}`}
                                  onClick={() => changeQty(i, 1)}
                                  className="w-7 h-7 rounded bg-white font-extrabold"
                                >
                                  +
                                </button>
                              </div>
                              <div className="text-base font-extrabold text-sale">
                                {formatVND(item.unitPrice * item.qty)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="lg:col-span-5 bg-white rounded-panel p-5 sm:p-6 border border-forest-dark/10 shadow-soft space-y-4">
                <h2 className="text-lg font-extrabold text-forest-dark inline-flex items-center gap-2">
                  <OcopIcon name="package" className="w-5 h-5 text-forest" />
                  <span>Thanh toán nhanh</span>
                </h2>

                <div className="bg-bgsoft rounded-2xl p-3.5 border border-forest-dark/10 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-extrabold inline-flex items-center gap-1">
                      <OcopIcon name="ticket" className="w-4 h-4 text-harvest" />
                      <span>Mã giảm giá</span>
                    </span>
                    <button
                      type="button"
                      id="btn-quick-ocopdn"
                      onClick={() => {
                        setVoucherState({ saved: true, applied: true });
                        setVoucherInput('OCOPDN');
                        showToast('Đã áp dụng mã OCOPDN (-20.000đ)!', 'ticket');
                      }}
                      className="font-bold text-forest hover:underline"
                    >
                      Áp nhanh OCOPDN (-20k)
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      id="voucher-input"
                      aria-label="Mã giảm giá"
                      value={voucherInput}
                      onChange={(e) => setVoucherInput(e.target.value)}
                      placeholder="Nhập mã OCOPDN"
                      className="flex-1 px-3 py-2 rounded-xl bg-white border border-forest-dark/15 text-sm font-bold uppercase"
                    />
                    <button
                      type="button"
                      id="btn-apply-voucher"
                      onClick={handleApplyVoucher}
                      className="px-4 py-2 rounded-xl bg-forest-dark text-white text-xs font-extrabold"
                    >
                      Áp dụng
                    </button>
                  </div>
                  {voucher.applied ? (
                    <div
                      id="voucher-msg"
                      className={`inline-flex items-center gap-1 text-xs font-bold ${subtotal >= 150000 ? 'text-forest' : 'text-harvest'}`}
                    >
                      <OcopIcon name={subtotal >= 150000 ? 'check' : 'info'} className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {subtotal >= 150000
                          ? 'Đã áp dụng mã OCOPDN (-20.000đ)'
                          : `Mã OCOPDN cần đơn từ 150.000đ (thiếu ${formatVND(150000 - subtotal)}).`}
                      </span>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-1.5 text-sm border-b border-forest-dark/10 pb-3">
                  <div className="flex justify-between text-forest-dark/75">
                    <span>Tạm tính:</span>
                    <strong id="sum-sub">{formatVND(subtotal)}</strong>
                  </div>
                  <div className="flex justify-between text-forest-dark/75">
                    <span>Phí vận chuyển:</span>
                    <strong id="sum-ship" className="inline-flex items-center gap-1">
                      {subtotal === 0 ? '0đ' : shipping === 0 ? (
                        <>
                          <span>Miễn phí</span>
                          <OcopIcon name="party" className="w-3.5 h-3.5 text-forest" />
                        </>
                      ) : formatVND(shipping)}
                    </strong>
                  </div>
                  {discount > 0 ? (
                    <div id="sum-disc-row" className="flex justify-between text-forest">
                      <span>Giảm giá (OCOPDN):</span>
                      <strong>-20.000đ</strong>
                    </div>
                  ) : null}
                  <div className="flex justify-between items-baseline pt-2 border-t border-forest-dark/10">
                    <span className="font-extrabold">Tổng thanh toán:</span>
                    <span id="sum-total" className="text-2xl font-extrabold text-sale">
                      {formatVND(total)}
                    </span>
                  </div>
                </div>

                <form id="checkout-form" onSubmit={handleCheckoutSubmit} className="space-y-3" noValidate>
                  <input
                    type="text"
                    id="co-name"
                    aria-label="Họ và tên người nhận"
                    required
                    value={coName}
                    onChange={(e) => setCoName(e.target.value)}
                    placeholder="Họ và tên người nhận *"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-bgsoft border border-forest-dark/20 text-sm font-medium"
                  />
                  <input
                    type="tel"
                    id="co-phone"
                    aria-label="Số điện thoại người nhận"
                    required
                    value={coPhone}
                    onChange={(e) => setCoPhone(e.target.value)}
                    placeholder="Số điện thoại *"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-bgsoft border border-forest-dark/20 text-sm font-medium"
                  />
                  <div className="relative">
                    <input
                      type="text"
                      id="co-addr"
                      aria-label="Địa chỉ giao hàng chi tiết"
                      required
                      value={coAddr}
                      onChange={(e) => setCoAddr(e.target.value)}
                      placeholder="Địa chỉ giao hàng chi tiết *"
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-bgsoft border border-forest-dark/20 text-sm font-medium"
                    />
                    <button
                      type="button"
                      id="btn-mic-co-addr"
                      title="Đọc địa chỉ giao hàng"
                      aria-label="Đọc địa chỉ giao hàng"
                      onClick={() => dictateToValue({ onToast: (m) => showToast(m, 'mic'), onInterim: setCoAddr, onDone: setCoAddr })}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-mint hover:bg-forest hover:text-white text-forest flex items-center justify-center"
                    >
                      <OcopIcon name="mic" className="w-4 h-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    id="co-note"
                    aria-label="Ghi chú cho nhà vườn"
                    value={coNote}
                    onChange={(e) => setCoNote(e.target.value)}
                    placeholder="Ghi chú cho nhà vườn (tùy chọn: giao chiều, chọn trái già...)"
                    className="w-full px-3.5 py-2 rounded-xl bg-bgsoft border border-forest-dark/15 text-xs font-medium"
                  />
                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <label
                      className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer font-bold transition-colors ${
                        payment === 'COD' ? 'border-forest bg-mint/60' : 'border-forest-dark/15'
                      }`}
                    >
                      <input
                        type="radio"
                        name="pay"
                        value="COD"
                        checked={payment === 'COD'}
                        onChange={() => setPayment('COD')}
                        className="accent-forest"
                      />
                      <OcopIcon name="banknote" className="w-4 h-4 text-forest shrink-0" />
                      <span>Tiền mặt (COD)</span>
                    </label>
                    <label
                      className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer font-bold transition-colors ${
                        payment === 'VietQR' ? 'border-forest bg-mint/60' : 'border-forest-dark/15'
                      }`}
                    >
                      <input
                        type="radio"
                        name="pay"
                        value="VietQR"
                        checked={payment === 'VietQR'}
                        onChange={() => setPayment('VietQR')}
                        className="accent-forest"
                      />
                      <OcopIcon name="landmark" className="w-4 h-4 text-forest shrink-0" />
                      <span>VietQR</span>
                    </label>
                  </div>
                  {payment === 'VietQR' ? (
                    <div id="vietqr-info" className="bg-mint rounded-xl p-3 text-xs text-center border border-forest/25">
                      <strong>Vietcombank – STK: 1028 6688 9999</strong>
                      <br />
                      Chủ TK: CHỢ OCOP THANH NIÊN ĐỒNG NAI
                    </div>
                  ) : null}
                  <button type="submit" className="w-full py-3.5 rounded-xl bg-sale hover:bg-sale-hover text-white font-extrabold text-base shadow-lg inline-flex items-center justify-center gap-1.5">
                    <span>Xác nhận đặt hàng</span>
                    <OcopIcon name="check" className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </section>
          ) : (
            <section id="view-orders" className="space-y-4">
              <div id="orders-list" className="space-y-4">
                {orders.map((o) => {
                  const isCanceled = o.step === 0;
                  const badgeClass = isCanceled
                    ? 'bg-sale/10 text-sale border-sale/25'
                    : o.step === 1
                      ? 'bg-harvest-light text-harvest-dark border-harvest/30'
                      : 'bg-mint text-forest border-forest/25';

                  return (
                    <div key={o.id} className="bg-white rounded-panel p-5 border border-forest-dark/10 shadow-soft space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-forest-dark/10">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="text-forest-dark">{o.id}</strong>
                          <span className="text-xs text-forest-dark/60">{o.date}</span>
                          {o.shop ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-harvest-dark bg-harvest-light px-2 py-0.5 rounded-full">
                              <OcopIcon name="home" className="w-3 h-3" />
                              <span>{o.shop}</span>
                            </span>
                          ) : null}
                        </div>
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs font-extrabold ${badgeClass}`}>
                          <OcopIcon name={isCanceled ? 'x' : 'leaf'} className="w-3.5 h-3.5" />
                          <span>{o.status}</span>
                        </span>
                      </div>
                      <div className="text-sm font-medium text-forest-dark/85">{o.itemsText}</div>
                      {isCanceled ? (
                        <div className="py-2 px-3 rounded-xl bg-sale/10 text-sale text-xs font-extrabold inline-flex items-center gap-1.5">
                          <OcopIcon name="x" className="w-3.5 h-3.5" />
                          <span>Đơn hàng đã bị hủy.</span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-4 gap-1.5 text-[11px] font-bold text-center pt-1">
                          <div className="py-1.5 rounded-lg bg-forest text-white">1. Đã đặt</div>
                          <div className={`py-1.5 rounded-lg ${(o.step || 1) >= 2 ? 'bg-forest text-white' : 'bg-bgsoft text-forest-dark/50'}`}>
                            2. Hái tại vườn
                          </div>
                          <div className={`py-1.5 rounded-lg ${(o.step || 1) >= 3 ? 'bg-forest text-white' : 'bg-bgsoft text-forest-dark/50'}`}>
                            3. Đang giao
                          </div>
                          <div className={`py-1.5 rounded-lg ${(o.step || 1) >= 4 ? 'bg-forest text-white' : 'bg-bgsoft text-forest-dark/50'}`}>
                            4. Hoàn tất
                          </div>
                        </div>
                      )}
                      <div className="flex flex-wrap justify-between text-xs text-forest-dark/70 pt-2 border-t border-forest-dark/10">
                        <span>
                          Người nhận: <strong>{o.customer}</strong> • Thanh toán: <strong>{o.payment}</strong>
                        </span>
                        <span className="text-base font-extrabold text-sale">{formatVND(o.total)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        <section className="bg-white rounded-panel p-5 border border-forest-dark/10 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase text-forest">
              <OcopIcon name="handshake" className="w-4 h-4" />
              <span>Hỗ trợ đặt hàng 1 chạm cho người lớn tuổi</span>
            </div>
            <div className="text-sm sm:text-base font-extrabold text-forest-dark mt-0.5">
              Cô chú ngại điền thông tin? Gọi hoặc nhắn Zalo, Đoàn Thanh Niên đặt giúp ngay!
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <a href="tel:02513888999" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sale text-white font-extrabold text-xs sm:text-sm">
              <OcopIcon name="phone" className="w-4 h-4" />
              <span>0251 3888 999</span>
            </a>
            <button
              type="button"
              id="btn-copy-zalo"
              onClick={handleCopyZalo}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-mint text-forest-dark font-extrabold text-xs sm:text-sm border border-forest/20"
            >
              <OcopIcon name="chat" className="w-4 h-4 text-forest" />
              <span>Chép Zalo</span>
            </button>
          </div>
        </section>
      </main>
    </>
  );
}
