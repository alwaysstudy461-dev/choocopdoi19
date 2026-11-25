import { BASE_PRODUCTS, DN_MAP_REGIONS } from '../../src/data/catalog.js';
import { getProductBySlugOrId } from '../../src/utils/format.js';

export const DONG_NAI_MAP_COORDS = {
  all: {
    region: 'all',
    lat: 10.957,
    lng: 106.842,
    zoom: 9,
    address: 'Tỉnh Đồng Nai, Việt Nam',
    deliveryTime: '2 giờ nội tỉnh',
  },
  'TP. Biên Hòa': {
    region: 'TP. Biên Hòa',
    lat: 10.9465,
    lng: 106.8235,
    zoom: 12,
    address: 'TP. Biên Hòa, Tỉnh Đồng Nai',
    deliveryTime: 'Giao nhanh 1–2 giờ',
  },
  'Tân Triều': {
    region: 'Tân Triều',
    lat: 10.9852,
    lng: 106.8271,
    zoom: 13,
    address: 'Làng Bưởi Tân Triều, Xã Tân Bình, H. Vĩnh Cửu, Đồng Nai',
    deliveryTime: 'Giao nhanh 1.5–2 giờ',
  },
  'Long Khánh': {
    region: 'Long Khánh',
    lat: 10.9284,
    lng: 107.2429,
    zoom: 12,
    address: 'TP. Long Khánh, Tỉnh Đồng Nai',
    deliveryTime: 'Hái sáng giao chiều (2–3 giờ)',
  },
  'Bình Long': {
    region: 'Bình Long',
    lat: 11.6486,
    lng: 106.6054,
    zoom: 12,
    address: 'Vùng chuyên canh Bình Long, Miền Đông Nam Bộ',
    deliveryTime: 'Giao nhanh trong ngày / Toàn quốc',
  },
  'Định Quán': {
    region: 'Định Quán',
    lat: 11.1965,
    lng: 107.3592,
    zoom: 12,
    address: 'Huyện Định Quán, Tỉnh Đồng Nai',
    deliveryTime: 'Giao nhanh 2.5–4 giờ',
  },
  'Xuân Lộc': {
    region: 'Xuân Lộc',
    lat: 10.9275,
    lng: 107.4058,
    zoom: 12,
    address: 'Chân núi Chứa Chan, H. Xuân Lộc, Tỉnh Đồng Nai',
    deliveryTime: 'Giao nhanh trong ngày / Toàn quốc',
  },
};

export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function getMapLocations(products = BASE_PRODUCTS) {
  return Object.entries(DN_MAP_REGIONS).map(([key, info]) => {
    const geo = DONG_NAI_MAP_COORDS[key] || DONG_NAI_MAP_COORDS.all;
    const count =
      key === 'all' || key === 'TP. Biên Hòa'
        ? products.length
        : products.filter((p) => p.region === key).length;
    const featured = getProductBySlugOrId(products, info.highlightSlug);
    return {
      key,
      ...info,
      lat: geo.lat,
      lng: geo.lng,
      zoom: geo.zoom,
      address: geo.address,
      deliveryTime: geo.deliveryTime,
      productCount: count,
      featuredProduct: featured
        ? { id: featured.id, name: featured.name, price: featured.price, image: featured.image }
        : null,
    };
  });
}

export async function calculateRegionDistance({
  region = 'Long Khánh',
  destAddress = 'TP. Biên Hòa, Đồng Nai',
  googleMapsApiKey = '',
  fetchImpl = globalThis.fetch,
}) {
  const originGeo = DONG_NAI_MAP_COORDS[region] || DONG_NAI_MAP_COORDS['Long Khánh'];
  const bienHoa = DONG_NAI_MAP_COORDS['TP. Biên Hòa'];

  if (googleMapsApiKey) {
    try {
      const originParam = `${originGeo.lat},${originGeo.lng}`;
      const destParam = encodeURIComponent(destAddress || bienHoa.address);
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originParam}&destinations=${destParam}&language=vi&region=VN&key=${encodeURIComponent(googleMapsApiKey)}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 7000);
      try {
        const res = await fetchImpl(url, { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          const element = data?.rows?.[0]?.elements?.[0];
          if (element?.status === 'OK') {
            return {
              provider: 'google-maps',
              origin: region,
              destination: data.destination_addresses?.[0] || destAddress,
              distanceKm: Math.round((element.distance.value / 1000) * 10) / 10,
              distanceText: element.distance.text,
              durationText: element.duration.text,
            };
          }
        }
      } finally {
        clearTimeout(timer);
      }
    } catch {
      // Fallback gracefully below
    }
  }

  const straightKm = haversineKm(originGeo.lat, originGeo.lng, bienHoa.lat, bienHoa.lng);
  const roadKm = Math.max(2, Math.round(straightKm * 1.24 * 10) / 10);
  const minutes = Math.max(15, Math.round((roadKm / 42) * 60));
  return {
    provider: 'haversine-fallback',
    origin: region,
    destination: destAddress || bienHoa.address,
    distanceKm: roadKm,
    distanceText: `${roadKm} km`,
    durationText: minutes >= 60 ? `${Math.floor(minutes / 60)} giờ ${minutes % 60} phút` : `${minutes} phút`,
  };
}

