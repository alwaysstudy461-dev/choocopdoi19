import React, { useEffect, useState } from 'react';
import { useOcop } from '../context/OcopContext.jsx';
import OcopIcon from './OcopIcon.jsx';

export default function ApiConfigModal({ open, onClose }) {
  const { apiConfig, updateApiConfig } = useOcop();
  const [groqKey, setGroqKey] = useState('');
  const [groqModel, setGroqModel] = useState(apiConfig.groqModel || 'llama-3.3-70b-versatile');
  const [mapsKey, setMapsKey] = useState(apiConfig.googleMapsApiKey || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    setGroqModel(apiConfig.groqModel || 'llama-3.3-70b-versatile');
    setMapsKey(apiConfig.googleMapsApiKey || '');
    setGroqKey('');
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [apiConfig.googleMapsApiKey, apiConfig.groqModel, onClose, open]);

  if (!open) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = { groqModel: groqModel.trim() || 'llama-3.3-70b-versatile' };
    if (groqKey.trim()) payload.groqApiKey = groqKey.trim();
    if (mapsKey.trim() || apiConfig.googleMapsEnabled) payload.googleMapsApiKey = mapsKey.trim();
    await updateApiConfig(payload);
    setSaving(false);
    onClose();
  };

  return (
    <div
      id="ocop-api-config-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-forest-dark/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Cấu hình Groq AI & Google Maps API"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-panel max-w-md w-full p-5 sm:p-6 shadow-2xl border border-forest-dark/15 space-y-4">
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-forest-dark/10">
          <div className="inline-flex items-center gap-2 font-extrabold text-forest-dark text-base">
            <OcopIcon name="settings" className="w-5 h-5 text-forest" />
            <span>Cấu hình Groq &amp; Google Maps API</span>
          </div>
          <button
            type="button"
            aria-label="Đóng hộp thoại cấu hình API"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-bgsoft hover:bg-sale hover:text-white flex items-center justify-center transition-colors"
          >
            <OcopIcon name="x" className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-3.5 text-xs sm:text-sm">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="cfg-groq-key" className="font-extrabold text-forest-dark">
                Groq API Key
              </label>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${apiConfig.groqEnabled ? 'bg-mint text-forest' : 'bg-bgsoft text-forest-dark/60'}`}>
                {apiConfig.groqEnabled ? `Đã gắn (${apiConfig.groqKeyPreview})` : 'Đang dùng AI mô phỏng'}
              </span>
            </div>
            <input
              type="password"
              id="cfg-groq-key"
              value={groqKey}
              onChange={(e) => setGroqKey(e.target.value)}
              placeholder={apiConfig.groqEnabled ? 'Nhập key mới nếu muốn thay đổi (giữ trên server)...' : 'gsk_...'}
              className="w-full px-3 py-2 rounded-xl bg-bgsoft border border-forest-dark/15 focus:border-forest focus:bg-white focus:outline-none text-xs"
            />
          </div>

          <div>
            <label htmlFor="cfg-groq-model" className="block font-extrabold text-forest-dark mb-1">
              Groq Model
            </label>
            <select
              id="cfg-groq-model"
              value={groqModel}
              onChange={(e) => setGroqModel(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-bgsoft border border-forest-dark/15 text-xs font-semibold"
            >
              <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (Khuyên dùng)</option>
              <option value="llama-3.1-8b-instant">llama-3.1-8b-instant (Siêu nhanh)</option>
              <option value="qwen/qwen3-32b">qwen/qwen3-32b</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="cfg-gmaps-key" className="font-extrabold text-forest-dark">
                Google Maps API Key
              </label>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${apiConfig.googleMapsEnabled ? 'bg-mint text-forest' : 'bg-bgsoft text-forest-dark/60'}`}>
                {apiConfig.googleMapsEnabled ? `Đã gắn (${apiConfig.googleMapsKeyPreview})` : 'Đang dùng bản đồ nhúng / sơ đồ'}
              </span>
            </div>
            <input
              type="text"
              id="cfg-gmaps-key"
              value={mapsKey}
              onChange={(e) => setMapsKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-3 py-2 rounded-xl bg-bgsoft border border-forest-dark/15 focus:border-forest focus:bg-white focus:outline-none text-xs"
            />
          </div>

          <p className="text-[11px] text-forest-dark/65 leading-relaxed">
            Groq Key được lưu và gọi hoàn toàn ở backend Express (không lộ xuống trình duyệt). Bạn cũng có thể cấu hình qua file <code className="bg-bgsoft px-1 rounded">.env</code>.
          </p>

          <div className="flex justify-end gap-2 pt-2 border-t border-forest-dark/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-bgsoft hover:bg-mint text-forest-dark font-bold text-xs"
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-forest-dark hover:bg-forest text-white font-extrabold text-xs"
            >
              {saving ? 'Đang lưu...' : 'Lưu cấu hình API'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

