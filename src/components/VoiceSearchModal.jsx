import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useOcop } from '../context/OcopContext.jsx';
import { gsap, isReducedMotion, useGSAP } from '../utils/gsapConfig.js';
import { getSpeechRecognitionAPI } from '../utils/speech.js';
import OcopIcon from './OcopIcon.jsx';

const VOICE_SAMPLES = [
  { text: 'Chôm chôm Long Khánh', label: '“Chôm chôm”', cls: 'bg-mint hover:bg-forest hover:text-white text-forest-dark' },
  { text: 'Bưởi Tân Triều', label: '“Bưởi Tân Triều”', cls: 'bg-mint hover:bg-forest hover:text-white text-forest-dark' },
  { text: 'Mật ong Xuân Lộc', label: '“Mật ong”', cls: 'bg-mint hover:bg-forest hover:text-white text-forest-dark' },
  { text: 'Quản lý đơn vườn', label: '“Quản lý đơn vườn”', cls: 'bg-harvest-light hover:bg-harvest hover:text-white text-harvest-dark' },
];

export default function VoiceSearchModal() {
  const { voiceModalOpen, closeVoiceModal, voiceHistory, executeVoiceSearch } = useOcop();

  const [listening, setListening] = useState(false);
  const [statusText, setStatusText] = useState('VD: “Chôm chôm Long Khánh”, “Quản lý đơn vườn”, “Truy xuất QR”');
  const [transcript, setTranscript] = useState('Chạm micro để bắt đầu nói...');
  const [fallbackMsg, setFallbackMsg] = useState('');
  const [fallbackIcon, setFallbackIcon] = useState('lightbulb');

  const recRef = useRef(null);
  const simTimerRef = useRef(null);
  const autoDoneTimerRef = useRef(null);
  const panelRef = useRef(null);

  useGSAP(
    () => {
      if (!voiceModalOpen || !panelRef.current || isReducedMotion()) return;
      gsap.from(panelRef.current, {
        opacity: 0,
        y: 12,
        scale: 0.97,
        duration: 0.24,
        ease: 'power2.out',
        clearProps: 'transform,opacity',
      });
    },
    { dependencies: [voiceModalOpen] }
  );

  const stopListening = useCallback(() => {
    clearTimeout(simTimerRef.current);
    clearTimeout(autoDoneTimerRef.current);
    if (recRef.current) {
      try {
        recRef.current.onresult = null;
        recRef.current.onerror = null;
        recRef.current.onend = null;
        recRef.current.stop();
      } catch {
        // Ignore
      }
      recRef.current = null;
    }
    setListening(false);
  }, []);

  const startListening = useCallback(() => {
    setFallbackMsg('');
    const SpeechRecognitionAPI = getSpeechRecognitionAPI();
    if (!SpeechRecognitionAPI) {
      setListening(false);
      setStatusText('Trình duyệt hiện tại chưa bật micro trực tiếp.');
      setTranscript('Chạm nhanh một mẫu câu bên dưới để thử ngay!');
      setFallbackIcon('lightbulb');
      setFallbackMsg('Hỗ trợ tốt nhất trên Chrome / Edge / Safari. Bạn có thể bấm các mẫu câu gợi ý bên dưới để trải nghiệm.');
      return;
    }

    stopListening();
    try {
      const rec = new SpeechRecognitionAPI();
      rec.lang = 'vi-VN';
      rec.interimResults = true;
      rec.continuous = false;
      let finalText = '';

      rec.onstart = () => {
        setListening(true);
        setStatusText('Đang lắng nghe giọng nói tiếng Việt...');
        setTranscript('Hãy nói tên nông sản hoặc lệnh (VD: “Chôm chôm”, “Quản lý đơn”)...');
      };
      rec.onresult = (ev) => {
        let interim = '';
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          if (ev.results[i].isFinal) finalText += ev.results[i][0].transcript;
          else interim += ev.results[i][0].transcript;
        }
        const preview = (finalText || interim).trim();
        if (preview) setTranscript(`“${preview}”`);
        if (finalText.trim()) {
          autoDoneTimerRef.current = setTimeout(() => executeVoiceSearch(finalText), 420);
        }
      };
      rec.onerror = () => {
        setListening(false);
        setStatusText('Chưa nhận được micro. Chạm mẫu câu bên dưới để thử nhanh nhé!');
        setFallbackIcon('lock');
        setFallbackMsg('Vui lòng cho phép quyền Micro hoặc chọn mẫu câu gợi ý bên dưới.');
      };
      rec.onend = () => setListening(false);
      recRef.current = rec;
      rec.start();
    } catch {
      setListening(false);
    }
  }, [executeVoiceSearch, stopListening]);

  useEffect(() => {
    if (voiceModalOpen) {
      startListening();
    } else {
      stopListening();
    }
    return () => stopListening();
  }, [voiceModalOpen, startListening, stopListening]);

  const simulateVoiceSample = (text) => {
    stopListening();
    setListening(true);
    setStatusText('Đang nhận diện giọng nói...');
    setTranscript(`“${text}...”`);
    simTimerRef.current = setTimeout(() => {
      executeVoiceSearch(text);
    }, 600);
  };

  if (!voiceModalOpen) return null;

  return (
    <div
      id="ocop-voice-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-forest-dark/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeVoiceModal();
      }}
    >
      <div ref={panelRef} className="bg-white rounded-panel max-w-md w-full p-6 shadow-2xl border border-forest-dark/15 relative text-center">
        <button
          type="button"
          id="btn-close-global-voice"
          aria-label="Đóng hộp thoại giọng nói"
          onClick={closeVoiceModal}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-mint hover:bg-sale hover:text-white font-extrabold text-lg flex items-center justify-center transition-colors"
        >
          <OcopIcon name="x" className="w-5 h-5" />
        </button>
        <div className="inline-flex items-center gap-1.5 bg-mint text-forest font-extrabold text-xs px-3 py-1 rounded-full uppercase mb-3">
          <OcopIcon name="mic" className="w-3.5 h-3.5" />
          <span>Trợ lý Giọng Nói Tiếng Việt</span>
        </div>
        <h3 id="voice-modal-title" className="text-xl font-extrabold text-forest-dark mb-1">
          Nói tên nông sản hoặc lệnh cần mở
        </h3>
        <p id="ocop-voice-status" className="text-sm text-forest-dark/70 mb-4">
          {statusText}
        </p>

        <div id="ocop-voice-stage" className={`relative flex flex-col items-center justify-center my-4 ${listening ? 'voice-listening' : ''}`}>
          <div className="relative flex items-center justify-center w-28 h-28">
            <span className="voice-ring absolute inset-0 rounded-full bg-sale/20 pointer-events-none" />
            <span className="voice-ring-delay absolute inset-0 rounded-full bg-sale/15 pointer-events-none" />
            <button
              type="button"
              id="ocop-voice-toggle"
              aria-label={listening ? 'Dừng lắng nghe' : 'Bắt đầu lắng nghe'}
              onClick={() => (listening ? stopListening() : startListening())}
              className={
                listening
                  ? 'relative z-10 w-20 h-20 rounded-full bg-sale hover:bg-sale-hover text-white shadow-2xl flex items-center justify-center transition-all active:scale-95'
                  : 'relative z-10 w-20 h-20 rounded-full bg-forest hover:bg-forest-dark text-white shadow-float flex items-center justify-center transition-all active:scale-95'
              }
            >
              <OcopIcon name="mic" className="w-9 h-9" />
            </button>
          </div>
          <div className="flex items-end justify-center gap-1.5 h-7 mt-4">
            <span className="eq-bar w-1.5 h-6 rounded-full bg-forest" />
            <span className="eq-bar w-1.5 h-7 rounded-full bg-forest" />
            <span className="eq-bar w-1.5 h-5 rounded-full bg-sale" />
            <span className="eq-bar w-1.5 h-7 rounded-full bg-forest" />
            <span className="eq-bar w-1.5 h-6 rounded-full bg-forest" />
          </div>
        </div>

        <div className="bg-bgsoft rounded-2xl p-3 border border-forest-dark/15 min-h-[52px] flex items-center justify-center mb-3">
          <p id="ocop-voice-transcript" className="text-sm font-bold text-forest-dark/65 italic">
            {transcript}
          </p>
        </div>

        {fallbackMsg ? (
          <div id="ocop-voice-fallback" className="text-xs font-semibold text-harvest-dark bg-harvest-light border border-harvest/25 rounded-xl px-3 py-2 mb-3 text-left flex items-start gap-2">
            <OcopIcon name={fallbackIcon} className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{fallbackMsg}</span>
          </div>
        ) : null}

        <div className="flex flex-wrap justify-center gap-1.5">
          {VOICE_SAMPLES.map((s) => (
            <button
              key={s.text}
              type="button"
              onClick={() => simulateVoiceSample(s.text)}
              className={`global-vs-btn px-3 py-1.5 rounded-full text-xs font-bold ${s.cls}`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {voiceHistory.length > 0 ? (
          <div id="ocop-voice-history-wrap" className="text-left mt-4 pt-3 border-t border-forest-dark/10">
            <div className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase text-forest-dark/55 mb-1.5">
              <OcopIcon name="clock" className="w-3.5 h-3.5" />
              <span>Vừa nói gần đây:</span>
            </div>
            <div id="ocop-voice-history-list" className="flex flex-wrap gap-1.5">
              {voiceHistory.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => executeVoiceSearch(term)}
                  className="ocop-vh-btn inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-bgsoft hover:bg-mint text-forest-dark text-xs font-semibold border border-forest-dark/15"
                >
                  <OcopIcon name="search" className="w-3 h-3 text-forest" />
                  <span>{term}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
