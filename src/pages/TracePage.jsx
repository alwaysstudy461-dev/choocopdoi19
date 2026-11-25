import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import OcopIcon from '../components/OcopIcon.jsx';
import SeoHead from '../components/SeoHead.jsx';
import { useOcop } from '../context/OcopContext.jsx';
import { REGION_GPS } from '../data/catalog.js';
import {
  DONG_NAI_CLIENT_COORDS,
  buildGoogleMapsExternalUrl,
} from '../utils/googleMaps.js';
import {
  buildQrCells,
  copyToClipboard,
  formatVND,
  generateTraceHash,
  getProductLotCode,
  getProductUrl,
} from '../utils/format.js';
import { gsap, isReducedMotion, useGSAP } from '../utils/gsapConfig.js';

export default function TracePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { products, showToast } = useOcop();

  const [traceInput, setTraceInput] = useState(searchParams.get('code') || 'DN-OCOP-P1');
  const [selectedProduct, setSelectedProduct] = useState(() => products[0] || null);
  const [notFound, setNotFound] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('Đang nhận diện mã lô sản phẩm...');
  const scanTimerRef = useRef(null);
  const scanTimer2Ref = useRef(null);
  const passportRef = useRef(null);
  const firstRenderRef = useRef(true);

  const lookup = useCallback(
    (q, silent = false, syncUrl = false) => {
      setScanning(false);
      clearTimeout(scanTimerRef.current);
      clearTimeout(scanTimer2Ref.current);
      const clean = (q || '').trim().replace(/^#/, '').toLowerCase();
      if (!clean) {
        const first = products[0] || null;
        setSelectedProduct(first);
        setNotFound(!first);
        if (first) {
          const lot = getProductLotCode(first);
          setTraceInput(lot);
          if (syncUrl) setSearchParams({ code: lot }, { replace: true });
        }
        return;
      }
      const found = products.find((p) => {
        const lot = getProductLotCode(p).toLowerCase();
        return (
          lot === clean ||
          p.id.toLowerCase() === clean ||
          lot.includes(clean) ||
          p.name.toLowerCase().includes(clean)
        );
      });
      setSelectedProduct(found || null);
      setNotFound(!found);
      if (found) {
        const lot = getProductLotCode(found);
        setTraceInput(lot);
        if (syncUrl) setSearchParams({ code: lot }, { replace: true });
        if (!silent) showToast(`Đã xác thực mã lô #${lot}`, 'shield-check');
      }
    },
    [products, setSearchParams, showToast]
  );

  const startScan = useCallback(() => {
    clearTimeout(scanTimerRef.current);
    clearTimeout(scanTimer2Ref.current);
    setScanning(true);
    setScanStatus('Đang lấy nét tem QR trên bao bì nông sản...');
    scanTimerRef.current = setTimeout(() => {
      const pick = products[Math.floor(Math.random() * Math.min(products.length, 4))];
      if (!pick) {
        setScanning(false);
        return;
      }
      const lot = getProductLotCode(pick);
      setScanStatus(`Đã quét thành công mã #${lot}!`);
      scanTimer2Ref.current = setTimeout(() => {
        setScanning(false);
        setSelectedProduct(pick);
        setNotFound(false);
        setTraceInput(lot);
        setSearchParams({ code: lot }, { replace: true });
        showToast(`Quét QR thành công: #${lot}`, 'scan');
      }, 420);
    }, 950);
  }, [products, setSearchParams, showToast]);

  useEffect(() => {
    const scanParam = searchParams.get('scan');
    const codeParam = searchParams.get('code');
    if (scanParam === '1') {
      setSelectedProduct(products[0] || null);
      setNotFound(false);
      if (products[0]) setTraceInput(getProductLotCode(products[0]));
      startScan();
    } else {
      lookup(codeParam || 'DN-OCOP-P1', true, false);
    }
    return () => {
      clearTimeout(scanTimerRef.current);
      clearTimeout(scanTimer2Ref.current);
    };
  }, [searchParams, products, lookup, startScan]);

  const activeLotCode = selectedProduct && !notFound ? getProductLotCode(selectedProduct) : '';
  const qrData = useMemo(() => (activeLotCode ? buildQrCells(activeLotCode) : null), [activeLotCode]);

  useGSAP(
    () => {
      if (firstRenderRef.current) {
        firstRenderRef.current = false;
        return;
      }
      if (!passportRef.current || isReducedMotion()) return;
      gsap.fromTo(
        passportRef.current,
        { opacity: 0.4, y: 10 },
        { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out', clearProps: 'transform,opacity' }
      );
    },
    { dependencies: [activeLotCode, notFound] }
  );

  const traceJsonLd = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebPage',
          name: 'Truy Xuất Nguồn Gốc QR – Chợ OCOP Thanh Niên Đồng Nai',
          url: `${origin}/truy-xuat${activeLotCode ? `?code=${encodeURIComponent(activeLotCode)}` : ''}`,
        },
        {
          '@type': 'FAQPage',
          mainEntity: [
            {
              '@type': 'Question',
              name: 'Làm sao kiểm tra nguồn gốc nông sản trên Chợ OCOP Đồng Nai?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Bạn chỉ cần nhập mã lô in trên bao bì (ví dụ DN-OCOP-P1) hoặc quét tem QR để xem đầy đủ tọa độ GPS vùng trồng và đơn vị Đoàn Thanh Niên kiểm định.',
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
    };
  }, [activeLotCode]);

  const handleCopyCode = async (code) => {
    const ok = await copyToClipboard(code);
    showToast(ok ? `Đã sao chép mã lô: ${code}` : `Mã lô: ${code}`, 'clipboard');
  };

  let passportContent = null;
  if (notFound || !selectedProduct) {
    passportContent = (
      <div className="bg-white rounded-panel p-10 text-center border border-forest-dark/10 shadow-soft">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-mint text-forest flex items-center justify-center mb-3">
          <OcopIcon name="search" className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-extrabold text-forest-dark mb-1">Không tìm thấy mã lô phù hợp</h2>
        <p className="text-sm text-forest-dark/70 mb-4">
          Bạn hãy thử mã <strong>DN-OCOP-P1</strong> hoặc chọn 1 mã lô sẵn có phía trên.
        </p>
        <button type="button" onClick={() => lookup('DN-OCOP-P1', false, true)} className="px-5 py-2.5 rounded-xl bg-forest-dark text-white text-sm font-bold">
          Xem mẫu DN-OCOP-P1
        </button>
      </div>
    );
  } else {
    const p = selectedProduct;
    const lotCode = activeLotCode;
    const geo = REGION_GPS[p.region] || REGION_GPS['Long Khánh'];
    const origin = p.originDetail || {
      region: `${p.region}, Tỉnh Đồng Nai`,
      harvestTime: 'Hái tươi lúc 05:30 sáng nay',
      note: `Canh tác trực tiếp tại ${p.shop}, minh bạch nhật ký vườn.`,
    };
    const insp = p.inspectionDetail || {
      cert: p.cert,
      lotCode: `#${lotCode}`,
      note: `Đạt chuẩn ${p.cert}, xác thực nguồn gốc trực tiếp bởi Đoàn Thanh Niên ${p.region}.`,
    };
    const req = p.requesterInfo || {
      name: p.shop,
      phone: '0251 3888 999',
      farm: p.shop,
      verifier: `Đoàn Thanh Niên ${p.region} - Đồng Nai`,
    };
    const hash = generateTraceHash(`${lotCode}|${p.name}|${p.shop}`);
    const quality =
      p.category === 'fresh'
        ? 'Độ ngọt Brix 16.5° • Tươi loại 1'
        : p.category === 'drink'
          ? 'Nguyên chất 100% • Không pha tạp'
          : 'Độ ẩm chuẩn < 4.5% • Giòn tự nhiên';

    const steps = [
      {
        step: 'Chặng 1 • Canh tác tại vườn',
        icon: 'sprout',
        time: 'Nhật ký vụ mùa 2026',
        title: `${req.farm} (${p.region}, Đồng Nai)`,
        desc: `${geo.soil}. Tọa độ vùng trồng: ${geo.gps} (độ cao ${geo.altitude}). ${origin.note}`,
      },
      {
        step: 'Chặng 2 • Thu hoạch & Tuyển chọn',
        icon: 'basket',
        time: origin.harvestTime,
        title: 'Thu hái chín cây & tuyển chọn loại 1',
        desc: 'Chỉ chọn sản phẩm đạt chuẩn kích thước, độ tươi và hương vị tự nhiên, không ngâm ủ hóa chất.',
      },
      {
        step: 'Chặng 3 • Kiểm định & Cấp tem QR',
        icon: 'shield-check',
        time: 'Đã niêm phong hồ sơ điện tử',
        title: `Xác thực bởi ${req.verifier}`,
        desc: `${insp.note} Mã lô niêm phong: #${lotCode}.`,
      },
      {
        step: 'Chặng 4 • Đóng gói & Giao tươi',
        icon: 'truck',
        time: 'Sẵn sàng giao nhanh trong ngày',
        title: 'Đóng gói chống sốc • Dán tem truy xuất QR',
        desc: 'Mỗi gói/thùng đều dán tem QR để khách hàng kiểm tra trước khi thanh toán.',
      },
    ];

    passportContent = (
      <div className="space-y-5">
        <div className="bg-white rounded-panel p-5 sm:p-6 border-2 border-forest/25 shadow-soft flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div className="flex flex-col items-center shrink-0">
            {qrData ? (
              <svg
                viewBox={`0 0 ${qrData.dim} ${qrData.dim}`}
                className="w-36 h-36 bg-white rounded-xl p-1 border border-forest-dark/15 shadow-sm"
                role="img"
                aria-label={`Mã QR truy xuất lô ${lotCode}`}
              >
                <rect width={qrData.dim} height={qrData.dim} fill="#FFF" rx="8" />
                {qrData.cells.map((cell, idx) => (
                  <rect key={idx} x={cell.x} y={cell.y} width={cell.width} height={cell.height} rx="0.8" fill="#183D2B" />
                ))}
              </svg>
            ) : null}
            <span className="mt-2 text-xs font-extrabold text-forest-dark tracking-wider">#{lotCode}</span>
          </div>
          <div className="flex-1 text-center sm:text-left space-y-2.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-forest text-white text-xs font-extrabold">
              <OcopIcon name="check" className="w-3.5 h-3.5 text-sunny" />
              <span>ĐÃ XÁC THỰC CHÍNH HÃNG OCOP ĐỒNG NAI</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-forest-dark">{p.name}</h2>
            <div className="text-xs sm:text-sm text-forest-dark/80 font-semibold inline-flex items-center gap-1.5 flex-wrap justify-center sm:justify-start">
              <OcopIcon name="home" className="w-4 h-4 text-forest" />
              <span>{req.farm} •</span>
              <OcopIcon name="pin" className="w-4 h-4 text-sale" />
              <span>{geo.gps}</span>
              <a
                href={buildGoogleMapsExternalUrl(
                  (DONG_NAI_CLIENT_COORDS[p.region] || DONG_NAI_CLIENT_COORDS['Long Khánh']).lat,
                  (DONG_NAI_CLIENT_COORDS[p.region] || DONG_NAI_CLIENT_COORDS['Long Khánh']).lng,
                  req.farm
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-extrabold text-forest hover:underline ml-1"
              >
                <OcopIcon name="external-link" className="w-3 h-3" />
                <span>Xem Google Maps</span>
              </a>
            </div>
            <div className="text-xs font-mono bg-mint inline-block px-3 py-1 rounded-lg border border-forest/15">
              Mã băm xác thực: <strong>{hash}</strong>
            </div>
            <div className="flex flex-wrap justify-center sm:justify-start gap-2.5 pt-1">
              <button type="button" onClick={() => handleCopyCode(lotCode)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-mint hover:bg-forest-dark hover:text-white text-forest-dark text-xs font-extrabold">
                <OcopIcon name="clipboard" className="w-4 h-4" />
                <span>Chép mã lô</span>
              </button>
              <Link to={getProductUrl(p)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sale hover:bg-sale-hover text-white text-xs font-extrabold shadow-sm">
                <OcopIcon name="cart" className="w-4 h-4" />
                <span>Mua ngay lô này ({formatVND(p.price)})</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-forest-dark/10 shadow-soft">
            <div className="flex justify-between mb-1">
              <span className="text-xs font-bold text-forest-dark/65">Dư lượng thuốc BVTV</span>
              <span className="px-2 py-0.5 rounded bg-forest/15 text-forest text-[10px] font-extrabold">ĐẠT</span>
            </div>
            <div className="text-sm font-extrabold text-forest-dark">0.00 mg/kg (An toàn)</div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-forest-dark/10 shadow-soft">
            <div className="flex justify-between mb-1">
              <span className="text-xs font-bold text-forest-dark/65">Chỉ số chất lượng</span>
              <span className="px-2 py-0.5 rounded bg-forest/15 text-forest text-[10px] font-extrabold">LOẠI A+</span>
            </div>
            <div className="text-sm font-extrabold text-forest-dark">{quality}</div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-forest-dark/10 shadow-soft">
            <div className="flex justify-between mb-1">
              <span className="text-xs font-bold text-forest-dark/65">Chứng nhận xác thực</span>
              <span className="px-2 py-0.5 rounded bg-forest/15 text-forest text-[10px] font-extrabold">XÁC THỰC</span>
            </div>
            <div className="text-sm font-extrabold text-forest-dark">{insp.cert}</div>
          </div>
        </div>

        <div className="bg-white rounded-panel p-5 sm:p-6 border border-forest-dark/10 shadow-soft">
          <h3 className="text-base sm:text-lg font-extrabold text-forest-dark mb-4 inline-flex items-center gap-2">
            <OcopIcon name="compass" className="w-5 h-5 text-forest" />
            <span>Hành trình truy xuất minh bạch (4 chặng từ vườn đến tay bạn)</span>
          </h3>
          <div className="relative pl-7 space-y-4 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-forest/25">
            {steps.map((s) => (
              <div key={s.step} className="relative">
                <span className="absolute -left-7 top-0.5 w-6 h-6 rounded-full bg-mint border-2 border-forest flex items-center justify-center text-forest">
                  <OcopIcon name={s.icon} className="w-3.5 h-3.5" />
                </span>
                <div className="bg-bgsoft rounded-2xl p-4 border border-forest-dark/10">
                  <div className="flex flex-wrap justify-between gap-1 mb-1">
                    <span className="text-[11px] font-extrabold uppercase text-forest">{s.step}</span>
                    <span className="text-xs font-semibold text-forest-dark/60">{s.time}</span>
                  </div>
                  <div className="text-sm font-extrabold text-forest-dark mb-0.5">{s.title}</div>
                  <p className="text-xs text-forest-dark/80 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-harvest-light/70 rounded-panel p-5 border border-harvest/25 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
          <div>
            <div className="font-extrabold text-harvest-dark uppercase text-[11px] mb-1 inline-flex items-center gap-1">
              <OcopIcon name="farmer" className="w-3.5 h-3.5" />
              <span>Thông tin người yêu cầu &amp; chủ vườn</span>
            </div>
            <div className="font-bold text-forest-dark">
              {req.name} — {req.farm}
            </div>
            <div className="text-forest-dark/80 mt-0.5">
              Điện thoại: <strong>{req.phone}</strong>
            </div>
          </div>
          <div>
            <div className="font-extrabold text-forest uppercase text-[11px] mb-1 inline-flex items-center gap-1">
              <OcopIcon name="landmark" className="w-3.5 h-3.5" />
              <span>Đơn vị kiểm duyệt &amp; bảo trợ tem QR</span>
            </div>
            <div className="font-bold text-forest-dark">{req.verifier}</div>
            <div className="text-forest-dark/80 mt-0.5">Cổng dữ liệu nông sản sạch Chợ OCOP Đồng Nai</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <SeoHead
        title={
          selectedProduct && !notFound
            ? `Truy Xuất ${selectedProduct.name} (#${activeLotCode}) – Chợ OCOP Đồng Nai`
            : 'Truy Xuất Nguồn Gốc QR – Chợ OCOP Thanh Niên Đồng Nai'
        }
        description="Hệ thống truy xuất nguồn gốc nông sản số Đồng Nai – Tra cứu mã lô, quét tem QR OCOP, xem tọa độ GPS vùng trồng và chỉ số kiểm định."
        keywords="truy xuất nguồn gốc QR, hộ chiếu nông sản số Đồng Nai, tem QR OCOP"
        canonicalPath="/truy-xuat"
        robots={searchParams.get('code') ? 'noindex, follow' : 'index, follow, max-image-preview:large'}
        jsonLd={traceJsonLd}
      />

      <main className="max-w-5xl mx-auto px-3 sm:px-6 py-6 space-y-6">
        <section className="bg-gradient-to-r from-forest-dark via-forest to-forest-dark text-white rounded-panel p-6 sm:p-8 shadow-soft relative overflow-hidden">
          <div className="pointer-events-none absolute -right-12 -bottom-12 w-56 h-56 rounded-full bg-sunny/15 blur-2xl" />
          <div className="relative z-10 max-w-3xl">
            <span className="inline-flex items-center gap-1.5 bg-white/15 text-sunny text-xs font-extrabold px-3 py-1 rounded-full uppercase mb-3">
              <OcopIcon name="shield-check" className="w-3.5 h-3.5" />
              <span>Cổng Truy Xuất Nguồn Gốc Số • OCOP Đồng Nai</span>
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight mb-2">
              Hộ Chiếu Nông Sản Số &amp; Nhật Ký Canh Tác
            </h1>
            <p className="text-sm text-white/85 mb-5">
              Nhập mã lô in trên tem OCOP hoặc quét mã QR để kiểm tra vùng trồng GPS, kết quả kiểm định an toàn và đơn vị xác thực.
            </p>

            <form
              id="trace-form"
              onSubmit={(e) => {
                e.preventDefault();
                lookup(traceInput, false, true);
              }}
              className="flex flex-col sm:flex-row gap-2.5"
              noValidate
            >
              <input
                type="text"
                id="trace-input"
                aria-label="Mã lô hoặc tên nông sản"
                value={traceInput}
                onChange={(e) => setTraceInput(e.target.value)}
                placeholder="Nhập mã lô (VD: DN-OCOP-P1, DN-OCOP-P2) hoặc tên nông sản..."
                className="flex-1 px-4 py-3 rounded-xl bg-white text-forest-dark font-bold text-sm uppercase focus:outline-none focus:ring-2 focus:ring-sunny"
              />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl bg-sunny hover:bg-amber-400 text-forest-dark font-extrabold text-sm">
                  <OcopIcon name="search" className="w-4 h-4" />
                  <span>Tra cứu mã lô</span>
                </button>
                <button type="button" id="btn-scan-qr" onClick={startScan} className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 font-extrabold text-sm">
                  <OcopIcon name="scan" className="w-4 h-4" />
                  <span>Quét mã QR</span>
                </button>
              </div>
            </form>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs mt-4">
              <span className="text-white/75 font-semibold shrink-0">Mã lô sẵn có:</span>
              <div id="trace-quick-lots" className="flex items-center gap-1.5">
                {products.slice(0, 7).map((p) => {
                  const code = getProductLotCode(p);
                  const active = code === activeLotCode;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => lookup(code, false, true)}
                      className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-extrabold transition-colors ${
                        active ? 'bg-sunny text-forest-dark' : 'bg-white/15 hover:bg-white/25 text-white'
                      }`}
                    >
                      <OcopIcon name={p.icon || p.emoji} className="w-3.5 h-3.5" />
                      <span>{code}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {scanning ? (
          <section id="qr-scanner-box" className="bg-forest-dark rounded-panel p-6 text-white text-center shadow-soft">
            <div className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-sunny mb-3">
              <OcopIcon name="scan" className="w-4 h-4" />
              <span>Đang kích hoạt khung quét tem QR OCOP (Mô phỏng)</span>
            </div>
            <div className="relative w-56 h-56 mx-auto rounded-2xl border-2 border-sunny/75 bg-black/40 overflow-hidden flex items-center justify-center">
              <span className="absolute top-2 left-2 w-6 h-6 border-t-4 border-l-4 border-sunny rounded-tl" />
              <span className="absolute top-2 right-2 w-6 h-6 border-t-4 border-r-4 border-sunny rounded-tr" />
              <span className="absolute bottom-2 left-2 w-6 h-6 border-b-4 border-l-4 border-sunny rounded-bl" />
              <span className="absolute bottom-2 right-2 w-6 h-6 border-b-4 border-r-4 border-sunny rounded-br" />
              <div className="qr-scan-line absolute top-3 inset-x-3 h-0.5 bg-gradient-to-r from-transparent via-sunny to-transparent shadow-[0_0_12px_#F59E0B]" />
              <div className="text-white/75 text-xs font-semibold px-4">
                Đưa tem QR trên bao bì nông sản vào giữa khung...
              </div>
            </div>
            <p id="qr-scan-status" className="text-xs text-white/85 font-semibold mt-3">
              {scanStatus}
            </p>
          </section>
        ) : null}

        <section ref={passportRef} id="passport-container">{passportContent}</section>
      </main>
    </>
  );
}
