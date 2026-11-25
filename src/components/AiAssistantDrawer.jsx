import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useOcop } from '../context/OcopContext.jsx';
import { apiClient } from '../utils/api.js';
import { buildSimulatedAiResponse, formatVND, getProductUrl } from '../utils/format.js';
import { gsap, isReducedMotion, useGSAP } from '../utils/gsapConfig.js';
import { dictateToValue } from '../utils/speech.js';
import ApiConfigModal from './ApiConfigModal.jsx';
import OcopIcon from './OcopIcon.jsx';
import { normalizeAssetPath } from './ProductImage.jsx';

const AI_CHIPS = [
  { query: 'Tư vấn quà biếu dưới 350k', icon: 'gift', label: 'Quà biếu <350k', cls: 'bg-mint hover:bg-forest hover:text-white text-forest-dark' },
  { query: 'Trái cây tươi nào đang rộ mùa?', icon: 'cherry', label: 'Rộ mùa', cls: 'bg-mint hover:bg-forest hover:text-white text-forest-dark' },
  { query: 'Chọn nông sản tốt cho người lớn tuổi', icon: 'healthy', label: 'Cho ông bà', cls: 'bg-mint hover:bg-forest hover:text-white text-forest-dark' },
  { query: 'Kiểm tra nhanh đơn hàng nhà vườn', icon: 'package', label: 'Đơn vườn', cls: 'bg-harvest-light hover:bg-harvest hover:text-white text-harvest-dark' },
];

export default function AiAssistantDrawer() {
  const {
    aiDrawerState,
    openAiAssistant,
    closeAiAssistant,
    products,
    orders,
    user,
    apiConfig,
    setVoucherState,
    addToCart,
    speakVietnamese,
    showToast,
  } = useOcop();

  const [messages, setMessages] = useState([
    { id: 'welcome', type: 'welcome' },
  ]);
  const [inputVal, setInputVal] = useState('');
  const [configOpen, setConfigOpen] = useState(false);
  const listRef = useRef(null);
  const timerRef = useRef(null);
  const drawerRef = useRef(null);

  useGSAP(
    () => {
      if (!aiDrawerState.open || !drawerRef.current || isReducedMotion()) return;
      gsap.from(drawerRef.current, {
        opacity: 0,
        y: 16,
        scale: 0.96,
        duration: 0.25,
        ease: 'power2.out',
        clearProps: 'transform,opacity',
      });
    },
    { dependencies: [aiDrawerState.open] }
  );

  const sendQuery = useCallback(
    async (queryText) => {
      const clean = (queryText || '').trim();
      if (!clean) return;
      const msgSeed = Date.now() + Math.random();
      const typingId = `typing-${msgSeed}`;

      setMessages((prev) => [
        ...prev,
        { id: `user-${msgSeed}`, type: 'user', text: clean },
        { id: typingId, type: 'typing' },
      ]);

      const remote = await apiClient.askAiChat(clean, user);
      clearTimeout(timerRef.current);

      const finish = (response, provider) => {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== typingId),
          { id: `ai-${msgSeed}`, type: 'assistant', response, provider },
        ]);
      };

      if (remote?.ok && remote.response) {
        if (remote.applyVoucher || /giảm giá|voucher|khuyến mãi|ocopdn|freeship/i.test(clean)) {
          setVoucherState({ saved: true, applied: true });
        }
        timerRef.current = setTimeout(() => finish(remote.response, remote.provider), 140);
        return;
      }

      timerRef.current = setTimeout(() => {
        const res = buildSimulatedAiResponse({
          rawQuery: clean,
          products,
          orders,
          user,
          onApplyVoucher: () => setVoucherState({ saved: true, applied: true }),
        });
        finish(res, 'local-fallback');
      }, 320);
    },
    [orders, products, setVoucherState, user]
  );

  useEffect(() => {
    if (aiDrawerState.open && aiDrawerState.prefill) {
      sendQuery(aiDrawerState.prefill);
    }
  }, [aiDrawerState.open, aiDrawerState.triggerId, aiDrawerState.prefill, sendQuery]);

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, aiDrawerState.open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const q = inputVal.trim();
    if (!q) return;
    setInputVal('');
    sendQuery(q);
  };

  return (
    <>
      <button
        type="button"
        id="btn-open-ai-chat"
        aria-label="Mở Trợ lý AI Chợ OCOP"
        onClick={() => openAiAssistant()}
        className="fixed bottom-20 sm:bottom-6 right-3 sm:right-6 z-40 inline-flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-forest-dark to-forest hover:from-forest hover:to-forest-dark text-white font-extrabold text-xs sm:text-sm shadow-2xl border-2 border-sunny transition-all hover:scale-105 active:scale-95"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sunny opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sunny" />
        </span>
        <span className="inline-flex items-center gap-1">
          <OcopIcon name="sparkles" className="w-4 h-4 text-sunny" />
          <span>Trợ lý AI</span>
        </span>
      </button>

      {aiDrawerState.open ? (
        <div
          ref={drawerRef}
          id="ocop-ai-drawer"
          className="fixed bottom-20 sm:bottom-20 right-3 sm:right-6 z-50 flex w-[calc(100vw-24px)] max-w-[390px] bg-white rounded-panel shadow-2xl border-2 border-forest/25 overflow-hidden flex-col"
          style={{ maxHeight: 'min(76vh,560px)' }}
          role="dialog"
          aria-label="Trợ lý AI Chợ OCOP"
        >
          <div className="bg-gradient-to-r from-forest-dark to-forest text-white px-4 py-3.5 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-sunny text-forest-dark flex items-center justify-center shrink-0 shadow-sm">
                <OcopIcon name="sparkles" className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-extrabold truncate flex items-center gap-1.5">
                  <span>Trợ lý AI Chợ OCOP</span>
                  <span className="text-[10px] font-bold bg-white/15 px-1.5 py-0.5 rounded-full">
                    {apiConfig.groqEnabled ? 'Groq' : 'Sẵn sàng'}
                  </span>
                </div>
                <div className="text-[11px] text-white/80 truncate">
                  Gợi ý nông sản, quà biếu &amp; hỗ trợ nhà vườn
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                aria-label="Cấu hình Groq API"
                onClick={() => setConfigOpen(true)}
                className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors"
                title="Cấu hình Groq API & Google Maps"
              >
                <OcopIcon name="settings" className="w-4 h-4" />
              </button>
              <button
                type="button"
                id="btn-close-ai-chat"
                aria-label="Đóng Trợ lý AI"
                onClick={closeAiAssistant}
                className="w-8 h-8 rounded-full bg-white/15 hover:bg-sale text-white font-extrabold flex items-center justify-center shrink-0 transition-colors"
              >
                <OcopIcon name="x" className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div ref={listRef} id="ocop-ai-messages" className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-bgsoft text-xs sm:text-sm">
            {messages.map((m) => {
              if (m.type === 'welcome') {
                return (
                  <div key={m.id} className="flex items-start gap-2">
                    <div className="w-7 h-7 rounded-full bg-sunny text-forest-dark flex items-center justify-center shrink-0">
                      <OcopIcon name="sparkles" className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 bg-white border border-forest/15 rounded-2xl rounded-tl-sm p-3 shadow-sm space-y-1.5">
                      <p className="text-xs sm:text-[13px] font-bold text-forest-dark inline-flex items-center gap-1 flex-wrap">
                        <span>Xin chào! Mình là <strong>Trợ lý AI Chợ OCOP Đồng Nai</strong></span>
                        <OcopIcon name="leaf" className="w-3.5 h-3.5 text-forest" />
                      </p>
                      <p className="text-xs text-forest-dark/75 leading-relaxed">
                        Bạn có thể bấm micro hoặc chọn nhanh bên dưới để mình gợi ý đặc sản theo ngân sách, vùng trồng hoặc kiểm tra đơn nhà vườn nhé!
                      </p>
                    </div>
                  </div>
                );
              }
              if (m.type === 'user') {
                return (
                  <div key={m.id} className="flex justify-end">
                    <div className="max-w-[85%] bg-forest-dark text-white rounded-2xl rounded-br-sm px-3.5 py-2.5 text-xs sm:text-[13px] font-semibold leading-snug shadow-sm">
                      {m.text}
                    </div>
                  </div>
                );
              }
              if (m.type === 'typing') {
                return (
                  <div key={m.id} className="flex items-start gap-2">
                    <div className="w-7 h-7 rounded-full bg-sunny text-forest-dark flex items-center justify-center shrink-0">
                      <OcopIcon name="sparkles" className="w-3.5 h-3.5" />
                    </div>
                    <div className="bg-white border border-forest/15 rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-xs text-forest font-bold animate-pulse inline-flex items-center gap-1.5">
                      <OcopIcon name="sparkles" className="w-3.5 h-3.5" />
                      <span>{apiConfig.groqEnabled ? 'Groq AI đang phân tích nông sản...' : 'AI đang phân tích nông sản phù hợp...'}</span>
                    </div>
                  </div>
                );
              }

              const { response } = m;
              return (
                <div key={m.id} className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-full bg-sunny text-forest-dark flex items-center justify-center shrink-0">
                    <OcopIcon name="sparkles" className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0 bg-white border border-forest/15 rounded-2xl rounded-tl-sm p-3 shadow-sm space-y-2">
                    <p className="text-xs sm:text-[13px] text-forest-dark leading-relaxed font-medium">
                      {response.text}
                    </p>
                    {response.products?.length > 0 ? (
                      <div className="space-y-2 mt-2">
                        {response.products.slice(0, 3).map((p) => {
                          const url = getProductUrl(p);
                          const src = normalizeAssetPath(p.image);
                          return (
                            <div key={p.id} className="bg-bgsoft rounded-xl p-2 border border-forest-dark/10 flex items-center gap-2.5">
                              <Link
                                to={url}
                                onClick={closeAiAssistant}
                                className="w-12 h-12 rounded-lg overflow-hidden img-fallback-box shrink-0 relative flex items-center justify-center"
                              >
                                <span aria-hidden="true" className="text-forest/70 flex items-center justify-center">
                                  <OcopIcon name={p.icon || p.emoji} className="w-6 h-6" />
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
                              </Link>
                              <div className="min-w-0 flex-1">
                                <Link
                                  to={url}
                                  onClick={closeAiAssistant}
                                  className="block text-xs font-extrabold text-forest-dark hover:text-forest line-clamp-1"
                                >
                                  {p.name}
                                </Link>
                                <div className="text-[11px] text-forest-dark/65 inline-flex items-center gap-1 flex-wrap">
                                  <OcopIcon name="pin" className="w-3 h-3 text-sale" />
                                  <span>{p.region} •</span>
                                  <OcopIcon name="star-filled" className="w-3 h-3 text-sunny" />
                                  <span>{p.cert}</span>
                                </div>
                                <div className="flex items-center justify-between mt-0.5">
                                  <span className="text-xs font-extrabold text-sale">{formatVND(p.price)}</span>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => addToCart(p.id)}
                                      className="px-2 py-0.5 rounded-lg bg-forest-dark hover:bg-forest text-white text-[10px] font-extrabold"
                                    >
                                      + Giỏ
                                    </button>
                                    <Link
                                      to={url}
                                      onClick={closeAiAssistant}
                                      className="px-2 py-0.5 rounded-lg bg-mint text-forest-dark text-[10px] font-bold"
                                    >
                                      Xem
                                    </Link>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      {response.action ? (
                        <Link
                          to={response.action.href}
                          onClick={closeAiAssistant}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-mint hover:bg-forest hover:text-white text-forest-dark text-[11px] font-extrabold transition-colors"
                        >
                          <OcopIcon name={response.action.icon || 'arrow-right'} className="w-3.5 h-3.5" />
                          <span>{response.action.label}</span>
                        </Link>
                      ) : (
                        <span />
                      )}
                      <button
                        type="button"
                        onClick={() => speakVietnamese(response.text)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-bgsoft hover:bg-mint text-forest-dark text-[10px] font-bold"
                      >
                        <OcopIcon name="volume" className="w-3 h-3" />
                        <span>Nghe</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-3 py-2 bg-white border-t border-forest-dark/10 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            {AI_CHIPS.map((c) => (
              <button
                key={c.query}
                type="button"
                onClick={() => sendQuery(c.query)}
                className={`ocop-ai-chip shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${c.cls}`}
              >
                <OcopIcon name={c.icon} className="w-3.5 h-3.5" />
                <span>{c.label}</span>
              </button>
            ))}
          </div>

          <form id="ocop-ai-form" onSubmit={handleSubmit} className="p-2.5 bg-white border-t border-forest-dark/10 flex items-center gap-1.5 shrink-0" noValidate>
            <button
              type="button"
              id="btn-ai-chat-mic"
              title="Nói câu hỏi cho Trợ lý AI"
              aria-label="Nói câu hỏi cho Trợ lý AI"
              onClick={() =>
                dictateToValue({
                  onToast: (msg) => showToast(msg, 'mic'),
                  onInterim: (val) => setInputVal(val),
                  onDone: (val) => {
                    if (val && val.trim().length > 2) {
                      setInputVal('');
                      sendQuery(val.trim());
                    }
                  },
                })
              }
              className="w-9 h-9 rounded-xl bg-mint hover:bg-forest text-forest hover:text-white flex items-center justify-center shrink-0 transition-colors"
            >
              <OcopIcon name="mic" className="w-4 h-4" />
            </button>
            <input
              type="text"
              id="ocop-ai-input"
              aria-label="Câu hỏi cho Trợ lý AI"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Hỏi AI: bưởi Tân Triều, quà 200k..."
              className="flex-1 px-3 py-2 rounded-xl bg-bgsoft border border-forest-dark/15 focus:border-forest focus:bg-white focus:outline-none focus:ring-2 focus:ring-forest/20 text-xs sm:text-sm font-medium"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-xl bg-forest-dark hover:bg-forest text-white font-extrabold text-xs sm:text-sm shrink-0 transition-colors"
            >
              Gửi
            </button>
          </form>
        </div>
      ) : null}

      <ApiConfigModal open={configOpen} onClose={() => setConfigOpen(false)} />
    </>
  );
}
