import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useOcop } from '../context/OcopContext.jsx';
import { formatVND, getProductLotCode, getProductSummary } from '../utils/format.js';
import { gsap, isReducedMotion, useGSAP } from '../utils/gsapConfig.js';
import OcopIcon from './OcopIcon.jsx';
import ProductImage from './ProductImage.jsx';

export default function ProductQuickModal({ product, onClose }) {
  const { addToCart, speakVietnamese } = useOcop();
  const navigate = useNavigate();
  const [varIdx, setVarIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const modalRef = useRef(null);

  useGSAP(
    () => {
      if (!product || !modalRef.current || isReducedMotion()) return;
      gsap.from(modalRef.current, {
        opacity: 0,
        y: 12,
        scale: 0.97,
        duration: 0.24,
        ease: 'power2.out',
        clearProps: 'transform,opacity',
      });
    },
    { dependencies: [product?.id] }
  );

  useEffect(() => {
    setVarIdx(0);
    setQty(1);
  }, [product?.id]);

  useEffect(() => {
    if (!product) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [product, onClose]);

  if (!product) return null;

  const p = product;
  const v = p.variants[varIdx] || p.variants[0];
  const price = Math.round(p.price * v.multiplier);
  const lot = getProductLotCode(p);
  const sum = getProductSummary(p);
  const originInfo = p.originDetail || {
    region: `${p.region}, Đồng Nai`,
    harvestTime: 'Thu hoạch tươi trong ngày',
  };
  const inspInfo = p.inspectionDetail || { cert: p.cert, lotCode: `#${lot}` };
  const reqInfo = p.requesterInfo || {
    name: p.shop,
    phone: '0251 3888 999',
    verifier: `Đoàn TN ${p.region}`,
  };
  const topReview = (p.reviews && p.reviews[0]) || null;

  return (
    <div
      id="product-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-forest-dark/65 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={p.name}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={modalRef} className="bg-white rounded-panel max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-forest-dark/15 relative">
        <button
          type="button"
          id="btn-close-product"
          aria-label="Đóng chi tiết nhanh"
          onClick={onClose}
          className="sticky top-3 float-right mr-3 z-20 w-10 h-10 rounded-full bg-white/90 hover:bg-sale hover:text-white text-forest-dark font-extrabold text-xl shadow-md flex items-center justify-center"
        >
          <OcopIcon name="x" className="w-5 h-5" />
        </button>

        <div id="product-modal-body" className="p-5 sm:p-7 clear-both">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            <div className="md:col-span-5 space-y-3">
              <div className="rounded-2xl overflow-hidden shadow-soft relative">
                <ProductImage product={p} heightClass="h-52 sm:h-60" />
                <span className="absolute top-2.5 left-2.5 bg-sunny text-forest-dark text-xs font-extrabold px-2.5 py-0.5 rounded-lg inline-flex items-center gap-1">
                  <OcopIcon name="star-filled" className="w-3.5 h-3.5" />
                  <span>{p.cert}</span>
                </span>
                {p.discount > 0 ? (
                  <span className="absolute top-2.5 right-2.5 bg-sale text-white text-xs font-extrabold px-2 py-0.5 rounded-lg">
                    -{p.discount}%
                  </span>
                ) : null}
              </div>

              <div className="bg-bgsoft rounded-2xl p-3.5 border border-forest-dark/10 text-xs space-y-2">
                <div className="flex items-start gap-2">
                  <OcopIcon name="pin" className="w-4 h-4 text-sale shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-forest-dark">Nguồn gốc:</strong> {originInfo.region} • {originInfo.harvestTime}
                  </div>
                </div>
                <div className="flex items-start gap-2 pt-2 border-t border-forest-dark/10">
                  <OcopIcon name="shield-check" className="w-4 h-4 text-forest shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-harvest-dark">Kiểm định:</strong> {inspInfo.cert} • Lô{' '}
                    <strong>{inspInfo.lotCode}</strong>
                  </div>
                </div>
                <div className="flex items-start gap-2 pt-2 border-t border-forest-dark/10">
                  <OcopIcon name="farmer" className="w-4 h-4 text-harvest-dark shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-forest-dark">Chủ vườn:</strong> {reqInfo.name}{' '}
                    <span className="text-forest font-semibold inline-flex items-center gap-0.5">
                      (<OcopIcon name="check" className="w-3 h-3" /> {reqInfo.verifier})
                    </span>
                  </div>
                </div>
              </div>

              <Link
                to={`/truy-xuat?code=${encodeURIComponent(lot)}`}
                onClick={onClose}
                className="inline-flex items-center justify-center gap-1.5 w-full text-center py-2.5 rounded-xl bg-forest-dark hover:bg-forest text-white font-extrabold text-xs transition-colors"
              >
                <OcopIcon name="qr" className="w-4 h-4 text-sunny" />
                <span>Mở Hộ Chiếu Truy Xuất &amp; QR Lô Hàng →</span>
              </Link>
            </div>

            <div className="md:col-span-7 flex flex-col justify-between space-y-4">
              <div className="space-y-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-forest mb-0.5 inline-flex items-center gap-1 flex-wrap">
                      <OcopIcon name="check" className="w-3.5 h-3.5" />
                      <span>{p.shop} •</span>
                      <OcopIcon name="star-filled" className="w-3.5 h-3.5 text-sunny" />
                      <span>{p.rating} ({p.soldText} đã bán)</span>
                    </div>
                    <h3 className="text-lg sm:text-2xl font-extrabold text-forest-dark leading-snug">{p.name}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      speakVietnamese(`${p.name}, giá ${formatVND(p.price)}. Kết luận nhanh: ${sum.verdict}`)
                    }
                    title="Nghe tóm tắt sản phẩm"
                    className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-mint hover:bg-forest hover:text-white text-forest-dark text-xs font-extrabold border border-forest/20 transition-colors"
                  >
                    <OcopIcon name="volume" className="w-3.5 h-3.5" />
                    <span>Nghe</span>
                  </button>
                </div>

                <div className="bg-mint rounded-2xl p-3.5 sm:p-4 border-l-4 border-forest space-y-2">
                  <div className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-forest">
                    <OcopIcon name="pin" className="w-3.5 h-3.5" />
                    <span>Kết luận nhanh</span>
                  </div>
                  <p className="text-sm sm:text-[15px] font-extrabold text-forest-dark leading-snug">{sum.verdict}</p>
                  <ul className="space-y-1 text-xs sm:text-[13px] text-forest-dark/85 pt-1">
                    {sum.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-1.5">
                        <span className="text-forest font-extrabold">•</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 bg-bgsoft rounded-2xl px-4 py-3 border border-forest-dark/10">
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-2xl sm:text-3xl font-extrabold text-sale">{formatVND(price)}</span>
                    {p.oldPrice > p.price ? (
                      <span className="text-xs text-forest-dark/45 line-through">
                        {formatVND(Math.round(p.oldPrice * v.multiplier))}
                      </span>
                    ) : null}
                  </div>
                  <div className="inline-flex items-center gap-1.5 bg-white rounded-xl p-1 border border-forest-dark/15">
                    <button
                      type="button"
                      aria-label="Giảm số lượng"
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      className="w-8 h-8 rounded-lg bg-bgsoft font-extrabold"
                    >
                      −
                    </button>
                    <span className="font-extrabold min-w-[26px] text-center text-sm">{qty}</span>
                    <button
                      type="button"
                      aria-label="Tăng số lượng"
                      onClick={() => setQty((q) => q + 1)}
                      className="w-8 h-8 rounded-lg bg-bgsoft font-extrabold"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-extrabold uppercase text-forest-dark/60 mb-1.5">Chọn quy cách:</div>
                  <div className="flex flex-wrap gap-2">
                    {p.variants.map((vr, i) => (
                      <button
                        key={vr.label}
                        type="button"
                        onClick={() => setVarIdx(i)}
                        className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold border-2 transition-colors ${
                          i === varIdx
                            ? 'border-forest-dark bg-forest-dark text-white'
                            : 'border-forest-dark/15 bg-white text-forest-dark hover:border-forest'
                        }`}
                      >
                        {vr.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      addToCart(p.id, varIdx, qty);
                      onClose();
                    }}
                    className="inline-flex items-center justify-center gap-1.5 py-3 rounded-xl bg-mint hover:bg-forest/20 text-forest-dark border-2 border-forest-dark/20 font-extrabold text-sm"
                  >
                    <OcopIcon name="cart" className="w-4 h-4" />
                    <span>Thêm vào giỏ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      addToCart(p.id, varIdx, qty);
                      onClose();
                      navigate('/don-hang?tab=cart');
                    }}
                    className="inline-flex items-center justify-center gap-1.5 py-3 rounded-xl bg-sale hover:bg-sale-hover text-white font-extrabold text-sm shadow-lg"
                  >
                    <OcopIcon name="zap" className="w-4 h-4 text-sunny" />
                    <span>Mua ngay ({formatVND(price * qty)})</span>
                  </button>
                </div>
              </div>

              {topReview ? (
                <div className="pt-3 border-t border-forest-dark/10 text-xs flex items-start gap-2.5 text-forest-dark/80">
                  <span className="shrink-0 inline-flex items-center gap-0.5 bg-sunny/20 text-harvest-dark font-extrabold px-2 py-0.5 rounded-md">
                    <OcopIcon name="star-filled" className="w-3 h-3 text-sunny" />
                    <span>{topReview.rating}.0</span>
                  </span>
                  <p className="leading-snug">
                    <strong>{topReview.user}:</strong> “{topReview.text}”
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
