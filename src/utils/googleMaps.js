let loadedKey = '';
let loadPromise = null;

export const DONG_NAI_CLIENT_COORDS = {
  all: {
    lat: 11.24,
    lng: 107.02,
    zoom: 9,
    deliveryTime: '2 giờ nội tỉnh',
    address: 'TP. Biên Hòa & 5 vùng đặc sản Đồng Nai',
    shortSpecialty: 'Toàn tỉnh Đồng Nai',
    adminQuery: 'Tỉnh Đồng Nai, Việt Nam',
  },
  'TP. Biên Hòa': {
    lat: 10.9465,
    lng: 106.8235,
    zoom: 12,
    deliveryTime: 'Giao nhanh 1–2 giờ',
    address: 'Thành phố Biên Hòa, Tỉnh Đồng Nai',
    shortSpecialty: 'Trung tâm & Giao 2h',
    adminQuery: 'Thành phố Biên Hòa, Đồng Nai, Việt Nam',
    pinPos: { left: '31%', top: '81%' },
    pinTone: 'dark',
    boundaryColor: '#D97706',
    boundaryPolygon: [
      { lat: 11.005, lng: 106.795 },
      { lat: 10.998, lng: 106.925 },
      { lat: 10.922, lng: 106.952 },
      { lat: 10.865, lng: 106.895 },
      { lat: 10.892, lng: 106.788 },
      { lat: 10.962, lng: 106.775 },
    ],
  },
  'Tân Triều': {
    lat: 10.9852,
    lng: 106.8271,
    zoom: 13,
    deliveryTime: 'Giao nhanh 1.5–2 giờ',
    address: 'Làng Bưởi Tân Triều, Xã Tân Bình, H. Vĩnh Cửu, Đồng Nai',
    shortSpecialty: 'Bưởi đường lá cam',
    adminQuery: 'Xã Tân Bình, Vĩnh Cửu, Đồng Nai, Việt Nam',
    pinPos: { left: '32%', top: '62%' },
    pinTone: 'citrus',
    boundaryColor: '#059669',
    boundaryPolygon: [
      { lat: 11.022, lng: 106.792 },
      { lat: 11.028, lng: 106.858 },
      { lat: 10.988, lng: 106.866 },
      { lat: 10.972, lng: 106.835 },
      { lat: 10.982, lng: 106.795 },
    ],
  },
  'Long Khánh': {
    lat: 10.9284,
    lng: 107.2429,
    zoom: 12,
    deliveryTime: 'Hái sáng giao chiều (2–3 giờ)',
    address: 'Thành phố Long Khánh, Tỉnh Đồng Nai',
    shortSpecialty: 'Chôm chôm & Ri6',
    adminQuery: 'Thành phố Long Khánh, Đồng Nai, Việt Nam',
    pinPos: { left: '56%', top: '75%' },
    pinTone: 'cherry',
    boundaryColor: '#16A34A',
    boundaryPolygon: [
      { lat: 11.015, lng: 107.185 },
      { lat: 11.008, lng: 107.318 },
      { lat: 10.922, lng: 107.335 },
      { lat: 10.858, lng: 107.272 },
      { lat: 10.875, lng: 107.168 },
      { lat: 10.955, lng: 107.162 },
    ],
  },
  'Bình Long': {
    lat: 11.6486,
    lng: 106.6054,
    zoom: 12,
    deliveryTime: 'Giao nhanh trong ngày',
    address: 'Thị xã Bình Long, Tỉnh Bình Phước',
    shortSpecialty: 'Hạt điều & Tiêu sạch',
    adminQuery: 'Thị xã Bình Long, Bình Phước, Việt Nam',
    pinPos: { left: '19%', top: '21%' },
    pinTone: 'peanut',
    boundaryColor: '#15803D',
    boundaryPolygon: [
      { lat: 11.718, lng: 106.568 },
      { lat: 11.705, lng: 106.678 },
      { lat: 11.615, lng: 106.695 },
      { lat: 11.572, lng: 106.632 },
      { lat: 11.588, lng: 106.542 },
      { lat: 11.668, lng: 106.535 },
    ],
  },
  'Định Quán': {
    lat: 11.1965,
    lng: 107.3592,
    zoom: 12,
    deliveryTime: 'Giao nhanh 2.5–4 giờ',
    address: 'Huyện Định Quán, Tỉnh Đồng Nai',
    shortSpecialty: 'Ca cao & Xoài Cát',
    adminQuery: 'Huyện Định Quán, Đồng Nai, Việt Nam',
    pinPos: { left: '72%', top: '47%' },
    pinTone: 'cacao',
    boundaryColor: '#0D9488',
    boundaryPolygon: [
      { lat: 11.335, lng: 107.215 },
      { lat: 11.318, lng: 107.468 },
      { lat: 11.168, lng: 107.502 },
      { lat: 11.065, lng: 107.382 },
      { lat: 11.102, lng: 107.185 },
      { lat: 11.245, lng: 107.152 },
    ],
  },
  'Xuân Lộc': {
    lat: 10.9275,
    lng: 107.4058,
    zoom: 12,
    deliveryTime: 'Giao nhanh trong ngày',
    address: 'Huyện Xuân Lộc, Tỉnh Đồng Nai',
    shortSpecialty: 'Mật ong & Cà phê',
    adminQuery: 'Huyện Xuân Lộc, Đồng Nai, Việt Nam',
    pinPos: { left: '79%', top: '75%' },
    pinTone: 'honey',
    boundaryColor: '#65A30D',
    boundaryPolygon: [
      { lat: 11.055, lng: 107.345 },
      { lat: 11.032, lng: 107.548 },
      { lat: 10.892, lng: 107.585 },
      { lat: 10.785, lng: 107.452 },
      { lat: 10.822, lng: 107.325 },
      { lat: 10.965, lng: 107.328 },
    ],
  },
};

export const TRI_AN_LAKE_LANDMARK = {
  label: 'Hồ Trị An',
  lat: 11.116,
  lng: 107.032,
  pinPos: { left: '54%', top: '59%' },
};

export function loadGoogleMapsSdk(apiKey) {
  const key = String(apiKey || '').trim();
  if (!key || typeof window === 'undefined') return Promise.resolve(null);
  if (window.google?.maps && loadedKey === key) return Promise.resolve(window.google.maps);

  if (loadPromise && loadedKey === key) return loadPromise;

  loadedKey = key;
  loadPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById('ocop-gmaps-sdk');
    if (existing) existing.remove();

    window.gm_authFailure = () => {
      reject(new Error('GOOGLE_MAPS_AUTH_FAILED'));
    };

    const script = document.createElement('script');
    script.id = 'ocop-gmaps-sdk';
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&language=vi&region=VN&v=weekly`;
    script.onload = () => {
      if (window.google?.maps) resolve(window.google.maps);
      else reject(new Error('GOOGLE_MAPS_LOAD_FAILED'));
    };
    script.onerror = () => reject(new Error('GOOGLE_MAPS_NETWORK_ERROR'));
    document.head.appendChild(script);
  }).catch((err) => {
    loadPromise = null;
    throw err;
  });

  return loadPromise;
}

export function buildGoogleMapsExternalUrl(lat, lng, label, adminQuery = '') {
  const query = adminQuery || (label ? `${lat},${lng} (${label})` : `${lat},${lng}`);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function buildGoogleMapsDirectionsUrl(lat, lng, adminQuery = '') {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(adminQuery || `${lat},${lng}`)}`;
}

export function buildGoogleMapsEmbedUrl(lat, lng, zoom = 11, mapType = 'roadmap', apiKey = '', adminQuery = '') {
  const key = String(apiKey || '').trim();
  if (key) {
    const q = adminQuery || `${lat},${lng}`;
    return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(key)}&q=${encodeURIComponent(q)}&maptype=${mapType === 'satellite' ? 'satellite' : 'roadmap'}&language=vi`;
  }
  const t = mapType === 'satellite' ? 'k' : 'm';
  // On province-wide overview without fixed query pin, frame Đồng Nai cleanly so all 6 regional overlays align.
  if (!adminQuery || adminQuery === 'Tỉnh Đồng Nai, Việt Nam') {
    return `https://maps.google.com/maps?ll=${lat},${lng}&t=${t}&z=${zoom}&hl=vi&ie=UTF8&output=embed`;
  }
  // Using administrative place query (omitting manual &z) lets Google Maps auto-fit and draw the real red boundary polygon.
  return `https://maps.google.com/maps?q=${encodeURIComponent(adminQuery)}&t=${t}&hl=vi&ie=UTF8&output=embed`;
}
