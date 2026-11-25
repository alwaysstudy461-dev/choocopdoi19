export function getSpeechRecognitionAPI() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function speakVietnamese(text, onToast) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onToast?.('Trình duyệt chưa hỗ trợ đọc giọng nói.');
    return;
  }
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'vi-VN';
    utter.rate = 0.96;
    window.speechSynthesis.speak(utter);
    onToast?.('Đang đọc to thông tin...');
  } catch {
    onToast?.('Không thể phát giọng nói lúc này.');
  }
}

export function dictateToValue({ onToast, onInterim, onDone }) {
  const SpeechRecognitionAPI = getSpeechRecognitionAPI();
  if (!SpeechRecognitionAPI) {
    onToast?.('Trình duyệt chưa bật micro trực tiếp. Vui lòng nhập bàn phím hoặc thử Chrome/Edge/Safari.');
    return null;
  }
  try {
    const rec = new SpeechRecognitionAPI();
    rec.lang = 'vi-VN';
    rec.interimResults = true;
    rec.continuous = false;
    let latest = '';
    let hadError = false;
    onToast?.('Đang nghe... Hãy nói rõ nội dung cần điền!');
    rec.onresult = (ev) => {
      let s = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) s += ev.results[i][0].transcript;
      latest = s.trim();
      if (latest) onInterim?.(latest);
    };
    rec.onend = () => {
      if (!hadError && latest) {
        onDone?.(latest);
      }
    };
    rec.onerror = () => {
      hadError = true;
      onToast?.('Chưa nhận được micro. Vui lòng cấp quyền micro trên trình duyệt.');
    };
    rec.start();
    return rec;
  } catch {
    onToast?.('Không thể bật micro lúc này.');
    return null;
  }
}
