import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import OcopIcon from '../components/OcopIcon.jsx';
import SeoHead from '../components/SeoHead.jsx';
import { useOcop } from '../context/OcopContext.jsx';
import { apiClient } from '../utils/api.js';
import { getProductUrl, parseAiListing, slugifyVN } from '../utils/format.js';
import { gsap, isReducedMotion, useGSAP } from '../utils/gsapConfig.js';
import { getSpeechRecognitionAPI } from '../utils/speech.js';

const AI_SAMPLES = [
  {
    sample: 'Chú Ba ở Long Khánh mới hái 50kg chôm chôm tróc nhãn chín cây sáng nay, cơm giòn ngọt không dính hột, bán 48k một ký, đạt chuẩn OCOP 4 sao, liên hệ vườn chú Ba 0987654321',
    icon: 'cherry',
    title: 'Chôm chôm Long Khánh:',
    sub: '48k/kg, OCOP 4 sao, chú Ba',
  },
  {
    sample: 'Cô Tư ở Xuân Lộc thu hoạch bơ sáp 034 chín cây dẻo béo không xơ, giá 65 nghìn 1 ký, trồng sạch chuẩn VietGAP, số điện thoại cô Tư 0918222333',
    icon: 'avocado',
    title: 'Bơ sáp 034 Xuân Lộc:',
    sub: '65 nghìn/kg, VietGAP, cô Tư',
  },
  {
    sample: 'Trại ong anh Hải ở Định Quán vừa quay mật ong hoa cà phê nguyên chất 100% không pha đường, chai 500ml giá 190k, chứng nhận OCOP 3 sao, SĐT 0909445566',
    icon: 'honey',
    title: 'Mật ong Định Quán:',
    sub: '500ml giá 190k, OCOP 3 sao, anh Hải',
  },
  {
    sample: 'HTX Tân Triều bán bưởi đường lá cam chính gốc cù lao vỏ mỏng ngọt thanh, 75k một trái, chuẩn OCOP 4 sao, người đại diện anh Nam 0933778899',
    icon: 'citrus',
    title: 'Bưởi Tân Triều:',
    sub: '75k/trái, OCOP 4 sao, HTX Tân Triều',
  },
];

export default function AiSellPage() {
  const navigate = useNavigate();
  const { user, addCustomProduct, addHelpRequest, showToast, apiConfig } = useOcop();

  const [promptInput, setPromptInput] = useState('');
  const [stage, setStage] = useState('empty'); // 'empty' | 'loading' | 'form'
  const [listening, setListening] = useState(false);

  const [lastMeta, setLastMeta] = useState({ emoji: 'leaf', img: '/images/vuon-dong-nai-live.jpg' });
  const [outName, setOutName] = useState('');
  const [outPrice, setOutPrice] = useState('');
  const [outUnit, setOutUnit] = useState('');
  const [outCat, setOutCat] = useState('fresh');
  const [outDesc, setOutDesc] = useState('');
  const [outRegion, setOutRegion] = useState('Long Khánh');
  const [outHarvest, setOutHarvest] = useState('');
  const [outOrigin, setOutOrigin] = useState('');
  const [outCert, setOutCert] = useState('OCOP 4 sao');
  const [outLot, setOutLot] = useState('');
  const [outInspection, setOutInspection] = useState('');
  const [outReqName, setOutReqName] = useState('');
  const [outReqPhone, setOutReqPhone] = useState('');
  const [outReqFarm, setOutReqFarm] = useState('');
  const [outReqVerifier, setOutReqVerifier] = useState('');

  const [helpName, setHelpName] = useState('');
  const [helpPhone, setHelpPhone] = useState('');

  const recRef = useRef(null);
  const aiTimerRef = useRef(null);
  const navTimerRef = useRef(null);
  const formRef = useRef(null);

  useEffect(() => {
    return () => {
      clearTimeout(aiTimerRef.current);
      clearTimeout(navTimerRef.current);
      if (recRef.current) {
        try {
          recRef.current.stop();
        } catch {
          // Ignore
        }
      }
    };
  }, []);

  useGSAP(
    () => {
      if (stage !== 'form' || !formRef.current || isReducedMotion()) return;
      gsap.fromTo(
        formRef.current,
        { opacity: 0.4, y: 12 },
        { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out', clearProps: 'transform,opacity' }
      );
    },
    { dependencies: [stage] }
  );

  const seoJsonLd = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebApplication',
          name: 'Kênh Nhà Nông & Đăng Bán AI – Chợ OCOP Thanh Niên Đồng Nai',
          applicationCategory: 'BusinessApplication',
          url: `${origin}/dang-ban-ai`,
        },
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
    };
  }, []);

  const populateParsedResult = (r) => {
    setLastMeta({ emoji: r.emoji, img: r.img });
    setOutName(r.name);
    setOutPrice(String(r.price));
    setOutUnit(r.unit);
    setOutCat(r.cat);
    setOutDesc(r.desc);
    setOutRegion(r.region);
    setOutHarvest(r.harvest);
    setOutOrigin(r.origin);
    setOutCert(r.cert);
    setOutLot(r.lot);
    setOutInspection(r.inspection);
    setOutReqName(r.reqName);
    setOutReqPhone(r.reqPhone);
    setOutReqFarm(r.reqFarm);
    setOutReqVerifier(r.verifier);
    setStage('form');
    showToast('AI đã biên tập xong đầy đủ 4 phần!', 'sparkles');
  };

  const runAI = async (overrideText) => {
    const raw = (typeof overrideText === 'string' ? overrideText : promptInput).trim();
    if (raw.length < 5) {
      showToast('Hãy nói hoặc nhập vài từ về nông sản trước nhé!', 'alert');
      return;
    }
    setStage('loading');
    clearTimeout(aiTimerRef.current);
    const remote = await apiClient.parseAiListing(raw, user);
    if (remote?.ok && remote.listing) {
      aiTimerRef.current = setTimeout(() => populateParsedResult(remote.listing), 220);
      return;
    }
    aiTimerRef.current = setTimeout(() => {
      const r = parseAiListing(raw, user);
      populateParsedResult(r);
    }, 520);
  };

  const handleToggleVoice = () => {
    if (listening && recRef.current) {
      try {
        recRef.current.stop();
      } catch {
        // Ignore
      }
      return;
    }
    const SR = getSpeechRecognitionAPI();
    if (!SR) {
      showToast('Trình duyệt chưa mở micro. Chạm 1 tình huống mẫu ở dưới để thử AI ngay!', 'lightbulb');
      return;
    }
    const rec = new SR();
    rec.lang = 'vi-VN';
    rec.interimResults = true;
    let latest = '';
    let hadError = false;
    rec.onstart = () => setListening(true);
    rec.onresult = (e) => {
      let s = '';
      for (let i = e.resultIndex; i < e.results.length; i++) s += e.results[i][0].transcript;
      latest = s.trim();
      if (latest) setPromptInput(latest);
    };
    rec.onend = () => {
      setListening(false);
      if (!hadError && latest.length > 6) runAI(latest);
    };
    rec.onerror = () => {
      hadError = true;
      setListening(false);
      showToast('Chưa kết nối micro, hãy bấm chọn tình huống mẫu nhé!', 'lightbulb');
    };
    recRef.current = rec;
    rec.start();
  };

  const handlePublishSubmit = (e) => {
    e.preventDefault();
    const name = outName.trim();
    const price = Number(outPrice);
    const unit = outUnit.trim() || 'Gói 1kg';
    const lot = outLot.trim() || `#DN-OCOP-${Math.floor(1000 + Math.random() * 9000)}`;
    const reqName = outReqName.trim();
    const reqPhone = outReqPhone.trim();
    const reqFarm = outReqFarm.trim() || reqName;

    if (!name || !Number.isFinite(price) || price < 10000 || !reqName || reqPhone.replace(/\s+/g, '').length < 9) {
      showToast('Vui lòng điền đủ thông tin (giá tối thiểu 10.000đ, SĐT hợp lệ).', 'alert');
      return;
    }

    const newId = 'ai_' + Date.now();
    const slug = `${slugifyVN(name)}-${newId.toLowerCase()}`;
    const newProduct = {
      id: newId,
      slug,
      name,
      category: outCat,
      isOcop4: outCert === 'OCOP 4 sao',
      isGift: false,
      region: outRegion,
      cert: outCert,
      shop: reqFarm,
      price,
      oldPrice: Math.round(price * 1.15),
      discount: 13,
      rating: 5.0,
      sold: 1,
      soldText: 'Mới đăng',
      emoji: lastMeta.emoji,
      image: lastMeta.img,
      aiGenerated: true,
      flashSale: false,
      variants: [
        { label: unit, multiplier: 1 },
        { label: `Combo 2 × (${unit})`, multiplier: 1.9 },
      ],
      story: outDesc.trim(),
      originDetail: {
        region: `${outRegion}, Tỉnh Đồng Nai`,
        harvestTime: outHarvest.trim(),
        note: outOrigin.trim(),
      },
      inspectionDetail: {
        cert: outCert,
        lotCode: lot,
        note: outInspection.trim(),
      },
      requesterInfo: {
        name: reqName,
        phone: reqPhone,
        farm: reqFarm,
        verifier: outReqVerifier.trim(),
      },
      reviews: [
        {
          user: 'Đoàn Thanh Niên Đồng Nai',
          rating: 5,
          text: 'Đã chuẩn hóa đầy đủ Nguồn gốc, Kiểm định & Người yêu cầu.',
        },
      ],
    };

    addCustomProduct(newProduct);
    showToast(`Đã đăng “${name}”! Đang mở hồ sơ sản phẩm...`, 'rocket');
    navTimerRef.current = setTimeout(() => {
      navigate(getProductUrl(newProduct));
    }, 550);
  };

  const handleSellerHelpSubmit = async (e) => {
    e.preventDefault();
    const n = helpName.trim();
    const p = helpPhone.trim();
    if (!n || p.replace(/\s+/g, '').length < 9) {
      showToast('Nhập tên nhà vườn và SĐT hợp lệ nhé!', 'alert');
      return;
    }
    await addHelpRequest({ name: n, phone: p });
    setHelpName('');
    setHelpPhone('');
    showToast(`Đã ghi nhận "${n}"! Đoàn Thanh Niên sẽ gọi ${p} trong 24h.`, 'check-circle');
  };

  return (
    <>
      <SeoHead
        title="Kênh Nhà Nông & Đăng Bán AI – Chợ OCOP Thanh Niên Đồng Nai"
        description="Kênh Nhà Nông Chợ OCOP Đồng Nai – Trợ lý AI đăng bán nông sản bằng giọng nói hoặc văn bản, tự tạo Mô tả, Nguồn gốc, Kiểm định và Thông tin người yêu cầu."
        keywords="đăng bán nông sản AI, kênh nhà nông Đồng Nai, số hóa OCOP"
        canonicalPath="/dang-ban-ai"
        jsonLd={seoJsonLd}
      />

      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-8">
        <section className="bg-gradient-to-r from-harvest-dark via-harvest to-forest-dark text-white rounded-panel p-6 sm:p-8 shadow-soft">
          <div className="inline-flex items-center gap-1.5 bg-white/15 text-sunny text-xs font-extrabold px-3 py-1 rounded-full uppercase mb-2">
            <OcopIcon name="bot" className="w-4 h-4" />
            <span>Trợ lý AI Nhà Nông • {apiConfig.groqEnabled ? 'Groq AI' : 'Tự động biên tập'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight">
            Đăng Bán Nông Sản Bằng Giọng Nói Hoặc Văn Bản
          </h1>
          <p className="text-sm text-white/90 mt-1 max-w-2xl">
            Cô chú chỉ cần nói hoặc nhập ngắn gọn, AI sẽ tự động bóc tách và biên tập đầy đủ 4 phần:{' '}
            <strong>Mô tả bán hàng, Nguồn gốc, Kiểm định &amp; Thông tin người yêu cầu</strong> rồi đưa thẳng lên Sàn Nông Sản và Cổng Truy Xuất QR.
          </p>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-panel p-5 border border-forest-dark/10 shadow-soft space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-forest-dark">
                  Bước 1: Nói hoặc mô tả nông sản
                </span>
                {listening ? (
                  <span id="ai-voice-badge" className="px-2 py-0.5 rounded-full bg-sale text-white text-[10px] font-extrabold animate-pulse">
                    ● Đang nghe...
                  </span>
                ) : null}
              </div>

              <button
                type="button"
                id="btn-ai-voice"
                onClick={handleToggleVoice}
                className="w-full py-3.5 px-4 rounded-2xl bg-mint hover:bg-forest hover:text-white text-forest-dark border-2 border-forest/25 font-extrabold text-sm flex items-center justify-center gap-2 transition-all"
              >
                <OcopIcon name={listening ? 'stop' : 'mic'} className="w-4 h-4 shrink-0" />
                <span id="btn-ai-voice-text">
                  {listening ? 'Đang nghe... (Bấm để dừng)' : 'Bấm để nói tên nông sản, giá, vùng trồng...'}
                </span>
              </button>

              <div>
                <label htmlFor="ai-prompt-input" className="block text-xs font-bold text-forest-dark/75 mb-1">
                  Hoặc gõ tự nhiên bằng tiếng Việt:
                </label>
                <textarea
                  id="ai-prompt-input"
                  rows={4}
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  placeholder="VD: Chú Ba ở Long Khánh mới hái 50kg chôm chôm tróc nhãn chín cây sáng nay, bán 48k một ký, OCOP 4 sao, SĐT 0987654321..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bgsoft border-2 border-forest-dark/15 focus:border-harvest focus:bg-white focus:outline-none focus:ring-2 focus:ring-harvest/25 text-sm font-medium"
                />
              </div>

              <div>
                <div className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase text-forest-dark/55 mb-2">
                  <OcopIcon name="lightbulb" className="w-3.5 h-3.5 text-sunny" />
                  <span>Chạm nhanh tình huống mẫu để thử AI:</span>
                </div>
                <div className="space-y-1.5">
                  {AI_SAMPLES.map((s) => (
                    <button
                      key={s.title}
                      type="button"
                      onClick={() => {
                        setPromptInput(s.sample);
                        runAI(s.sample);
                      }}
                      className="sample-btn w-full text-left px-3 py-2 rounded-xl bg-bgsoft hover:bg-harvest-light border border-forest-dark/10 text-xs font-semibold flex items-center gap-2"
                    >
                      <OcopIcon name={s.icon} className="w-4 h-4 text-forest shrink-0" />
                      <span>
                        <strong>{s.title}</strong> {s.sub}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                id="btn-ai-generate"
                onClick={() => runAI()}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-harvest to-forest text-white font-extrabold text-sm sm:text-base shadow-soft hover:opacity-95 transition-all inline-flex items-center justify-center gap-1.5"
              >
                <OcopIcon name="sparkles" className="w-4 h-4 text-sunny" />
                <span>AI phân tích &amp; viết bài chuẩn OCOP</span>
              </button>
            </div>

            <div className="bg-mint rounded-2xl p-4 border border-forest/15 text-xs text-forest-dark/80 leading-relaxed">
              <strong className="inline-flex items-center gap-1 text-forest-dark">
                <OcopIcon name="info" className="w-3.5 h-3.5 text-forest" />
                <span>Ghi chú:</span>
              </strong>{' '}
              Bài đăng sau khi xuất bản sẽ đồng bộ lên hệ thống, hiển thị ngay ở trang{' '}
              <Link to="/san-pham" className="underline font-bold text-forest">
                Sàn nông sản
              </Link>{' '}
              và cấp mã QR ở trang{' '}
              <Link to="/truy-xuat" className="underline font-bold text-forest">
                Truy xuất QR
              </Link>
              .
            </div>
          </div>

          <div className="lg:col-span-7">
            {stage === 'empty' ? (
              <div id="ai-empty" className="bg-white rounded-panel border-2 border-dashed border-forest-dark/15 p-8 text-center min-h-[360px] flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-2xl bg-harvest-light text-harvest-dark flex items-center justify-center mb-3">
                  <OcopIcon name="wheat" className="w-8 h-8" />
                </div>
                <h2 className="text-lg font-extrabold text-forest-dark mb-1">
                  Hồ sơ nông sản do AI biên tập sẽ hiện tại đây
                </h2>
                <p className="text-sm text-forest-dark/70 max-w-md mb-5">
                  Bấm micro để nói hoặc chọn 1 mẫu bên trái, AI sẽ tự tách chính xác 4 khối thông tin:
                </p>
                <div className="grid grid-cols-2 gap-2.5 text-left text-xs w-full max-w-md">
                  <div className="bg-bgsoft p-3 rounded-xl font-bold flex items-center gap-2">
                    <OcopIcon name="file-text" className="w-4 h-4 text-forest shrink-0" />
                    <span>1. Mô tả bán hàng chuẩn sàn</span>
                  </div>
                  <div className="bg-mint p-3 rounded-xl font-bold flex items-center gap-2">
                    <OcopIcon name="pin" className="w-4 h-4 text-sale shrink-0" />
                    <span>2. Nguồn gốc xuất xứ</span>
                  </div>
                  <div className="bg-harvest-light p-3 rounded-xl font-bold flex items-center gap-2">
                    <OcopIcon name="shield-check" className="w-4 h-4 text-harvest-dark shrink-0" />
                    <span>3. Kiểm định &amp; Mã lô QR</span>
                  </div>
                  <div className="bg-bgsoft p-3 rounded-xl font-bold flex items-center gap-2">
                    <OcopIcon name="farmer" className="w-4 h-4 text-forest shrink-0" />
                    <span>4. Thông tin người yêu cầu</span>
                  </div>
                </div>
              </div>
            ) : null}

            {stage === 'loading' ? (
              <div id="ai-loading" className="bg-white rounded-panel border border-forest/20 p-8 text-center min-h-[360px] flex flex-col items-center justify-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-harvest-light text-harvest-dark flex items-center justify-center animate-bounce">
                  <OcopIcon name="sparkles" className="w-7 h-7" />
                </div>
                <div id="ai-loading-step" className="text-base font-extrabold text-forest-dark">
                  Đang phân tích câu nói / văn bản tiếng Việt...
                </div>
                <div className="w-full max-w-sm space-y-2">
                  <div className="h-3 rounded-full ai-shimmer" />
                  <div className="h-3 rounded-full ai-shimmer w-4/5 mx-auto" />
                </div>
              </div>
            ) : null}

            {stage === 'form' ? (
              <form ref={formRef} id="ai-form" onSubmit={handlePublishSubmit} className="bg-white rounded-panel p-5 sm:p-6 border border-forest-dark/10 shadow-soft space-y-4" noValidate>
                <div className="bg-mint rounded-2xl p-3.5 border border-forest/25 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img id="ai-preview-img" src={lastMeta.img} alt="Ảnh minh họa AI gợi ý" className="w-16 h-12 rounded-xl object-cover border border-forest/20 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-forest-dark inline-flex items-center gap-1">
                        <OcopIcon name="check" className="w-3.5 h-3.5 text-forest shrink-0" />
                        <span>AI đã hoàn thiện bài đăng &amp; chọn ảnh minh họa phù hợp</span>
                      </div>
                      <div className="text-[11px] font-bold text-forest truncate">
                        Đầy đủ Mô tả • Nguồn gốc • Kiểm định • Thông tin người yêu cầu
                      </div>
                    </div>
                  </div>
                  <span id="ai-score" className="px-3 py-1 rounded-full bg-forest-dark text-sunny text-xs font-extrabold">
                    99% Đạt chuẩn
                  </span>
                </div>

                <div className="bg-bgsoft rounded-2xl p-4 space-y-3 border border-forest-dark/10">
                  <div className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase text-forest-dark">
                    <OcopIcon name="file-text" className="w-3.5 h-3.5 text-forest" />
                    <span>1. Thông tin &amp; Mô tả nông sản</span>
                  </div>
                  <input
                    type="text"
                    id="out-name"
                    aria-label="Tên sản phẩm"
                    required
                    value={outName}
                    onChange={(e) => setOutName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-forest-dark/15 text-sm font-extrabold"
                    placeholder="Tên sản phẩm"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <input
                      type="number"
                      id="out-price"
                      aria-label="Giá bán"
                      required
                      min={10000}
                      step={1000}
                      value={outPrice}
                      onChange={(e) => setOutPrice(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-white border border-forest-dark/15 text-sm font-extrabold text-sale"
                      placeholder="Giá bán"
                    />
                    <input
                      type="text"
                      id="out-unit"
                      aria-label="Đơn vị"
                      value={outUnit}
                      onChange={(e) => setOutUnit(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-white border border-forest-dark/15 text-sm font-semibold"
                      placeholder="Đơn vị"
                    />
                    <select
                      id="out-cat"
                      aria-label="Danh mục"
                      value={outCat}
                      onChange={(e) => setOutCat(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-white border border-forest-dark/15 text-sm font-semibold"
                    >
                      <option value="fresh">Trái cây tươi</option>
                      <option value="dry">Hạt &amp; Đồ khô</option>
                      <option value="drink">Mật ong &amp; Trà</option>
                    </select>
                  </div>
                  <textarea
                    id="out-desc"
                    aria-label="Mô tả nông sản"
                    rows={3}
                    value={outDesc}
                    onChange={(e) => setOutDesc(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-forest-dark/15 text-sm font-medium"
                  />
                </div>

                <div className="bg-mint/60 rounded-2xl p-4 space-y-2.5 border border-forest/20">
                  <div className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase text-forest">
                    <OcopIcon name="pin" className="w-3.5 h-3.5 text-sale" />
                    <span>2. Nguồn gốc xuất xứ</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <select
                      id="out-region"
                      aria-label="Vùng trồng"
                      value={outRegion}
                      onChange={(e) => setOutRegion(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-white border border-forest/20 text-sm font-bold"
                    >
                      <option value="Long Khánh">Long Khánh</option>
                      <option value="Tân Triều">Tân Triều</option>
                      <option value="Bình Long">Bình Long</option>
                      <option value="Xuân Lộc">Xuân Lộc</option>
                      <option value="Định Quán">Định Quán</option>
                    </select>
                    <input
                      type="text"
                      id="out-harvest"
                      aria-label="Thời điểm thu hoạch"
                      value={outHarvest}
                      onChange={(e) => setOutHarvest(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-white border border-forest/20 text-sm font-semibold"
                      placeholder="Thời điểm thu hoạch"
                    />
                  </div>
                  <textarea
                    id="out-origin"
                    aria-label="Chi tiết nguồn gốc"
                    rows={2}
                    value={outOrigin}
                    onChange={(e) => setOutOrigin(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-forest/20 text-sm font-medium"
                  />
                </div>

                <div className="bg-harvest-light/60 rounded-2xl p-4 space-y-2.5 border border-harvest/25">
                  <div className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase text-harvest-dark">
                    <OcopIcon name="shield-check" className="w-3.5 h-3.5" />
                    <span>3. Kiểm định &amp; Chứng nhận</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <select
                      id="out-cert"
                      aria-label="Chứng nhận chất lượng"
                      value={outCert}
                      onChange={(e) => setOutCert(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-white border border-harvest/25 text-sm font-bold"
                    >
                      <option value="OCOP 4 sao">OCOP 4 sao</option>
                      <option value="OCOP 3 sao">OCOP 3 sao</option>
                      <option value="VietGAP">VietGAP</option>
                      <option value="Chờ Đoàn TN kiểm định">Chờ Đoàn TN kiểm định</option>
                    </select>
                    <input
                      type="text"
                      id="out-lot"
                      aria-label="Mã lô kiểm định"
                      value={outLot}
                      onChange={(e) => setOutLot(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-white border border-harvest/25 text-sm font-extrabold text-harvest-dark"
                      placeholder="Mã lô kiểm định"
                    />
                  </div>
                  <textarea
                    id="out-inspection"
                    aria-label="Ghi chú kiểm định"
                    rows={2}
                    value={outInspection}
                    onChange={(e) => setOutInspection(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-harvest/25 text-sm font-medium"
                  />
                </div>

                <div className="bg-bgsoft rounded-2xl p-4 space-y-2.5 border border-forest-dark/15">
                  <div className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase text-forest-dark">
                    <OcopIcon name="farmer" className="w-3.5 h-3.5 text-forest" />
                    <span>4. Thông tin người yêu cầu đăng bán</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      id="out-req-name"
                      aria-label="Họ tên người yêu cầu"
                      required
                      value={outReqName}
                      onChange={(e) => setOutReqName(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-white border border-forest-dark/15 text-sm font-bold"
                      placeholder="Họ tên người yêu cầu"
                    />
                    <input
                      type="tel"
                      id="out-req-phone"
                      aria-label="Số điện thoại người yêu cầu"
                      required
                      value={outReqPhone}
                      onChange={(e) => setOutReqPhone(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-white border border-forest-dark/15 text-sm font-bold"
                      placeholder="Số điện thoại"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      id="out-req-farm"
                      aria-label="Tên nhà vườn hoặc hợp tác xã"
                      value={outReqFarm}
                      onChange={(e) => setOutReqFarm(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-white border border-forest-dark/15 text-sm font-semibold"
                      placeholder="Tên nhà vườn / HTX"
                    />
                    <input
                      type="text"
                      id="out-req-verifier"
                      aria-label="Đơn vị xác thực"
                      value={outReqVerifier}
                      onChange={(e) => setOutReqVerifier(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-white border border-forest-dark/15 text-sm font-semibold text-forest"
                      placeholder="Đơn vị xác thực"
                    />
                  </div>
                </div>

                <button type="submit" className="w-full py-3.5 rounded-xl bg-sale hover:bg-sale-hover text-white font-extrabold text-base shadow-lg inline-flex items-center justify-center gap-2">
                  <OcopIcon name="rocket" className="w-5 h-5" />
                  <span>Đăng bán lên Chợ OCOP &amp; Cấp mã QR ngay</span>
                </button>
              </form>
            ) : null}
          </div>
        </section>

        <section className="bg-white rounded-panel p-6 border border-forest-dark/10 shadow-soft">
          <h2 className="text-xl font-extrabold text-forest-dark mb-1 inline-flex items-center gap-2">
            <OcopIcon name="handshake" className="w-6 h-6 text-forest" />
            <span>Cô chú cần Đoàn Thanh Niên hỗ trợ trực tiếp tại vườn?</span>
          </h2>
          <p className="text-sm text-forest-dark/70 mb-4">
            Để lại số điện thoại, thanh niên xã/phường sẽ đến tận nơi chụp ảnh, quay Livestream và hỗ trợ mở gian hàng miễn phí.
          </p>
          <form id="seller-help-form" onSubmit={handleSellerHelpSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3" noValidate>
            <input
              type="text"
              id="help-name"
              aria-label="Tên cô chú hoặc nhà vườn"
              required
              value={helpName}
              onChange={(e) => setHelpName(e.target.value)}
              placeholder="Tên cô chú / Nhà vườn *"
              className="px-4 py-3 rounded-xl bg-bgsoft border border-forest-dark/15 text-sm font-medium"
            />
            <input
              type="tel"
              id="help-phone"
              aria-label="Số điện thoại liên hệ"
              required
              value={helpPhone}
              onChange={(e) => setHelpPhone(e.target.value)}
              placeholder="Số điện thoại liên hệ *"
              className="px-4 py-3 rounded-xl bg-bgsoft border border-forest-dark/15 text-sm font-medium"
            />
            <button type="submit" className="py-3 rounded-xl bg-forest-dark hover:bg-forest text-white font-extrabold text-sm inline-flex items-center justify-center gap-1.5">
              <span>Gửi yêu cầu hỗ trợ</span>
              <OcopIcon name="arrow-right" className="w-4 h-4" />
            </button>
          </form>
        </section>
      </main>
    </>
  );
}
