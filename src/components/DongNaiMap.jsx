import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useOcop } from '../context/OcopContext.jsx';
import { DN_MAP_REGIONS } from '../data/catalog.js';
import { apiClient } from '../utils/api.js';
import { formatVND, getProductBySlugOrId, getProductUrl } from '../utils/format.js';
import {
  DONG_NAI_CLIENT_COORDS,
  TRI_AN_LAKE_LANDMARK,
  buildGoogleMapsDirectionsUrl,
  buildGoogleMapsEmbedUrl,
  buildGoogleMapsExternalUrl,
  loadGoogleMapsSdk,
} from '../utils/googleMaps.js';
import { gsap, isReducedMotion, useGSAP } from '../utils/gsapConfig.js';
import ApiConfigModal from './ApiConfigModal.jsx';
import OcopIcon from './OcopIcon.jsx';
import { normalizeAssetPath } from './ProductImage.jsx';

const MAP_PILLS = [
  { key: 'all', icon: 'map', label: 'Toàn tỉnh' },
  { key: 'TP. Biên Hòa', icon: 'city', label: 'TP. Biên Hòa' },
  { key: 'Tân Triều', icon: 'citrus', label: 'Tân Triều' },
  { key: 'Long Khánh', icon: 'cherry', label: 'Long Khánh' },
  { key: 'Bình Long', icon: 'peanut', label: 'Bình Long' },
  { key: 'Định Quán', icon: 'cacao', label: 'Định Quán' },
  { key: 'Xuân Lộc', icon: 'honey', label: 'Xuân Lộc' },
];

const REGION_MARKER_LIST = MAP_PILLS.filter((p) => p.key !== 'all');

export default function DongNaiMap() {
  const { products, speakVietnamese, apiConfig } = useOcop();
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [mapType, setMapType] = useState('roadmap'); // 'roadmap' | 'satellite'
  const [showLabels, setShowLabels] = useState(true);
  const [sdkError, setSdkError] = useState('');
  const [distanceInfo, setDistanceInfo] = useState(null);
  const [configOpen, setConfigOpen] = useState(false);

  const gmapCanvasRef = useRef(null);
  const gmapInstanceRef = useRef(null);
  const overlaysRef = useRef([]);
  const polygonsRef = useRef([]);
  const routeLineRef = useRef(null);
  const storyRef = useRef(null);
  const isFirstRenderRef = useRef(true);

  const info = DN_MAP_REGIONS[selectedRegion] || DN_MAP_REGIONS.all;
  const geo = DONG_NAI_CLIENT_COORDS[selectedRegion] || DONG_NAI_CLIENT_COORDS.all;
  const showGoogleSdkCanvas = Boolean(apiConfig.googleMapsApiKey) && !sdkError;

  // Query Google Distance Matrix API (or Haversine fallback) for delivery estimate to Biên Hòa
  useEffect(() => {
    let cancelled = false;
    if (selectedRegion === 'all') {
      setDistanceInfo(null);
      return undefined;
    }
    apiClient.fetchMapDistance(selectedRegion, 'TP. Biên Hòa, Đồng Nai').then((res) => {
      if (!cancelled && res?.ok) {
        setDistanceInfo(res);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selectedRegion]);

  // Initialize & sync Real Google Maps JavaScript API SDK with territory Polygons + fitBounds + OverlayView labels
  useEffect(() => {
    if (!apiConfig.googleMapsApiKey || !gmapCanvasRef.current) {
      return undefined;
    }
    let cancelled = false;

    loadGoogleMapsSdk(apiConfig.googleMapsApiKey)
      .then((gmaps) => {
        if (cancelled || !gmaps || !gmapCanvasRef.current) return;
        setSdkError('');

        if (!gmapInstanceRef.current) {
          const map = new gmaps.Map(gmapCanvasRef.current, {
            center: { lat: geo.lat, lng: geo.lng },
            zoom: geo.zoom,
            mapTypeId: mapType === 'satellite' ? 'hybrid' : 'roadmap',
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
          });
          gmapInstanceRef.current = map;

          polygonsRef.current = REGION_MARKER_LIST.map((pill) => {
            const pGeo = DONG_NAI_CLIENT_COORDS[pill.key];
            const poly = new gmaps.Polygon({
              paths: pGeo.boundaryPolygon || [],
              strokeColor: pGeo.boundaryColor || '#15803D',
              strokeOpacity: 0.9,
              strokeWeight: 2,
              fillColor: pGeo.boundaryColor || '#22C55E',
              fillOpacity: 0.16,
              map,
            });
            poly.addListener('click', () => setSelectedRegion(pill.key));
            return { key: pill.key, poly, paths: pGeo.boundaryPolygon || [], baseColor: pGeo.boundaryColor || '#15803D' };
          });

          class RegionLabelOverlay extends gmaps.OverlayView {
            constructor(pos, config) {
              super();
              this.pos = pos;
              this.config = config;
              this.div = null;
            }
            onAdd() {
              const btn = document.createElement('button');
              btn.type = 'button';
              btn.setAttribute('data-gmap-sdk-pin', this.config.key);
              btn.setAttribute('aria-label', `${this.config.label} - ${this.config.specialty}`);
              btn.style.position = 'absolute';
              btn.style.transform = 'translate(-50%, -100%)';
              btn.style.cursor = 'pointer';
              btn.style.zIndex = this.config.isHub ? '3' : '2';

              const card = document.createElement('div');
              card.style.background = this.config.isHub ? 'rgba(24, 61, 43, 0.95)' : 'rgba(255, 255, 255, 0.95)';
              card.style.color = this.config.isHub ? '#FFFFFF' : '#183D2B';
              card.style.border = this.config.isHub ? '2px solid #FDE68A' : '1.5px solid #183D2B';
              card.style.borderRadius = '10px';
              card.style.padding = '4px 8px';
              card.style.boxShadow = '0 4px 12px rgba(24,61,43,0.18)';
              card.style.textAlign = 'left';
              card.style.whiteSpace = 'nowrap';

              const title = document.createElement('div');
              title.textContent = this.config.label;
              title.style.fontSize = '11px';
              title.style.fontWeight = '800';
              title.style.lineHeight = '1.2';

              const sub = document.createElement('div');
              sub.textContent = this.config.specialty;
              sub.style.fontSize = '9px';
              sub.style.fontWeight = '700';
              sub.style.color = this.config.isHub ? '#FDE68A' : '#2E7D32';
              sub.style.lineHeight = '1.2';

              const dot = document.createElement('div');
              dot.style.width = '10px';
              dot.style.height = '10px';
              dot.style.margin = '2px auto 0';
              dot.style.borderRadius = '9999px';
              dot.style.background = '#E03E3E';
              dot.style.border = '2px solid #FFFFFF';
              dot.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';

              card.appendChild(title);
              card.appendChild(sub);
              btn.appendChild(card);
              btn.appendChild(dot);

              btn.addEventListener('click', (e) => {
                e.stopPropagation();
                setSelectedRegion(this.config.key);
              });

              this.div = btn;
              this.card = card;
              this.getPanes()?.overlayMouseTarget.appendChild(btn);
            }
            draw() {
              if (!this.div) return;
              const proj = this.getProjection();
              if (!proj) return;
              const point = proj.fromLatLngToDivPixel(new gmaps.LatLng(this.pos.lat, this.pos.lng));
              if (point) {
                this.div.style.left = `${point.x}px`;
                this.div.style.top = `${point.y}px`;
              }
            }
            setSelected(active, visible) {
              if (!this.div || !this.card) return;
              this.div.style.display = visible ? 'block' : 'none';
              this.div.style.zIndex = active ? '10' : this.config.isHub ? '3' : '2';
              this.card.style.borderColor = active ? '#F59E0B' : this.config.isHub ? '#FDE68A' : '#183D2B';
              this.card.style.transform = active ? 'scale(1.06)' : 'scale(1)';
            }
            onRemove() {
              if (this.div?.parentNode) {
                this.div.parentNode.removeChild(this.div);
              }
              this.div = null;
            }
          }

          overlaysRef.current = REGION_MARKER_LIST.map((pill) => {
            const pGeo = DONG_NAI_CLIENT_COORDS[pill.key];
            const overlay = new RegionLabelOverlay(
              { lat: pGeo.lat, lng: pGeo.lng },
              {
                key: pill.key,
                label: pill.label,
                specialty: pGeo.shortSpecialty || '',
                isHub: pill.key === 'TP. Biên Hòa',
              }
            );
            overlay.setMap(map);
            return { key: pill.key, overlay };
          });
        }

        const map = gmapInstanceRef.current;
        map.setMapTypeId(mapType === 'satellite' ? 'hybrid' : 'roadmap');

        const selectedPolygon = polygonsRef.current.find((p) => p.key === selectedRegion);
        if (selectedPolygon && selectedPolygon.paths.length > 0) {
          const bounds = new gmaps.LatLngBounds();
          selectedPolygon.paths.forEach((pt) => bounds.extend(pt));
          map.fitBounds(bounds, { top: 44, bottom: 44, left: 36, right: 36 });
        } else {
          map.panTo({ lat: geo.lat, lng: geo.lng });
          map.setZoom(geo.zoom);
        }

        polygonsRef.current.forEach(({ key, poly, baseColor }) => {
          const isAll = selectedRegion === 'all';
          const isActive = key === selectedRegion;
          poly.setOptions({
            strokeColor: isActive ? '#E03E3E' : baseColor,
            strokeWeight: isActive ? 3.2 : 1.8,
            strokeOpacity: isAll || isActive ? 0.92 : 0.35,
            fillOpacity: isActive ? 0.28 : isAll ? 0.16 : 0.05,
            zIndex: isActive ? 8 : 2,
          });
        });

        overlaysRef.current.forEach(({ key, overlay }) => {
          overlay.setSelected(selectedRegion === key, showLabels || selectedRegion === key);
        });

        if (routeLineRef.current) {
          routeLineRef.current.setMap(null);
          routeLineRef.current = null;
        }
        const hub = DONG_NAI_CLIENT_COORDS['TP. Biên Hòa'];
        if (selectedRegion !== 'all' && selectedRegion !== 'TP. Biên Hòa' && hub) {
          routeLineRef.current = new gmaps.Polyline({
            path: [
              { lat: geo.lat, lng: geo.lng },
              { lat: hub.lat, lng: hub.lng },
            ],
            geodesic: true,
            strokeColor: '#1E5E3E',
            strokeOpacity: 0.85,
            strokeWeight: 3.5,
            map,
          });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setSdkError(err?.message || 'Không thể tải Google Maps SDK.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [apiConfig.googleMapsApiKey, geo.lat, geo.lng, geo.zoom, mapType, selectedRegion, showLabels]);

  useEffect(() => {
    return () => {
      overlaysRef.current.forEach(({ overlay }) => overlay.setMap(null));
      overlaysRef.current = [];
      polygonsRef.current.forEach(({ poly }) => poly.setMap(null));
      polygonsRef.current = [];
      if (routeLineRef.current) {
        routeLineRef.current.setMap(null);
        routeLineRef.current = null;
      }
      gmapInstanceRef.current = null;
    };
  }, []);

  // Smooth GSAP reveal for region story card on region switch
  useGSAP(
    () => {
      if (isFirstRenderRef.current) {
        isFirstRenderRef.current = false;
        return;
      }
      if (isReducedMotion() || !storyRef.current) return;
      gsap.fromTo(
        storyRef.current,
        { opacity: 0.72, y: 6 },
        {
          opacity: 1,
          y: 0,
          duration: 0.25,
          ease: 'power2.out',
          clearProps: 'transform,opacity',
        }
      );
    },
    { dependencies: [selectedRegion] }
  );

  const countInRegion =
    selectedRegion === 'all' || selectedRegion === 'TP. Biên Hòa'
      ? products.length
      : products.filter((p) => p.region === selectedRegion).length;
  const featuredProd = getProductBySlugOrId(products, info.highlightSlug);
  const featuredImgSrc = normalizeAssetPath(featuredProd?.image);

  return (
    <section id="dong-nai-map" className="bg-white rounded-panel p-5 sm:p-7 border border-forest-dark/10 shadow-soft space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-forest">
            <OcopIcon name="map" className="w-3.5 h-3.5" />
            <span>Bản Đồ Nông Sản Google Maps Đồng Nai</span>
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-forest-dark mt-0.5">
            TP. Biên Hòa &amp; Các Vùng Đặc Sản Trứ Danh Đồng Nai
          </h2>
          <p className="text-xs sm:text-sm text-forest-dark/70 mt-0.5">
            Chạm từng ghim vùng trên Google Maps để khoanh trọn ranh giới hành chính cả vùng trồng &amp; xem tuyến giao nhanh.
          </p>
        </div>
        <button
          type="button"
          id="btn-map-reset"
          onClick={() => setSelectedRegion('all')}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-mint hover:bg-forest-dark hover:text-white text-forest-dark text-xs sm:text-sm font-extrabold border border-forest/20 transition-colors"
        >
          <OcopIcon name="refresh" className="w-4 h-4" />
          <span>Toàn cảnh Đồng Nai</span>
        </button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1" id="map-region-pills">
        {MAP_PILLS.map((pill) => {
          const active = selectedRegion === pill.key;
          return (
            <button
              key={pill.key}
              type="button"
              data-map-btn={pill.key}
              aria-pressed={active}
              onClick={() => setSelectedRegion(pill.key)}
              className={
                active
                  ? 'map-pill shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-forest-dark text-white text-xs sm:text-sm font-extrabold shadow-sm transition-colors'
                  : 'map-pill shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-bgsoft hover:bg-mint text-forest-dark text-xs sm:text-sm font-bold border border-forest-dark/10 transition-colors'
              }
            >
              <OcopIcon name={pill.icon} className="w-4 h-4" />
              <span>{pill.label}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-7 bg-gradient-to-br from-mint via-bgsoft to-emerald-50 rounded-2xl p-3 sm:p-4 border border-forest/15 relative flex flex-col justify-between overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-forest-dark/70 px-1 pb-2">
            <span className="inline-flex items-center gap-1.5">
              <OcopIcon name="pin" className="w-3.5 h-3.5 text-sale" />
              <span>
                {showGoogleSdkCanvas
                  ? 'Google Maps JS API • Ranh giới & Nhãn vùng'
                  : selectedRegion === 'all'
                    ? 'Google Maps • 6 vùng đặc sản Đồng Nai'
                    : `Ranh giới hành chính • ${geo.address}`}
              </span>
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                id="btn-toggle-map-labels"
                onClick={() => setShowLabels((v) => !v)}
                aria-pressed={showLabels}
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border font-extrabold transition-colors ${
                  showLabels
                    ? 'bg-forest text-white border-forest'
                    : 'bg-white hover:bg-mint text-forest-dark border-forest/20'
                }`}
              >
                <OcopIcon name="pin" className="w-3 h-3" />
                <span>{showLabels ? 'Đang hiện nhãn vùng' : 'Hiện nhãn vùng'}</span>
              </button>
              <button
                type="button"
                id="btn-map-type"
                onClick={() => setMapType((t) => (t === 'roadmap' ? 'satellite' : 'roadmap'))}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white hover:bg-mint border border-forest/20 text-forest-dark font-extrabold transition-colors"
              >
                <OcopIcon name="layers" className="w-3 h-3 text-forest" />
                <span>{mapType === 'satellite' ? 'Bản đồ đường' : 'Vệ tinh'}</span>
              </button>
              <button
                type="button"
                aria-label="Cấu hình Google Maps & Groq API"
                onClick={() => setConfigOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white hover:bg-mint border border-forest/20 text-forest-dark font-bold transition-colors"
              >
                <OcopIcon name="settings" className="w-3 h-3 text-forest" />
                <span>API Key</span>
              </button>
              <span id="map-zoom-badge" className="px-2.5 py-0.5 rounded-full bg-white border border-forest/15 text-forest font-extrabold">
                {selectedRegion === 'all' ? 'Toàn cảnh' : `Đang khoanh vùng: ${selectedRegion}`}
              </span>
            </div>
          </div>

          <div className="w-full aspect-[15/11] relative rounded-xl overflow-hidden bg-white border border-forest/10">
            {showGoogleSdkCanvas ? (
              <div ref={gmapCanvasRef} id="google-map-canvas" className="w-full h-full" />
            ) : (
              <>
                <iframe
                  key={`${selectedRegion}-${mapType}`}
                  id="google-map-embed"
                  title={`Google Maps ${selectedRegion === 'all' ? 'Đồng Nai' : geo.address}`}
                  src={buildGoogleMapsEmbedUrl(
                    geo.lat,
                    geo.lng,
                    geo.zoom,
                    mapType,
                    '',
                    selectedRegion === 'all' ? 'Tỉnh Đồng Nai, Việt Nam' : geo.adminQuery
                  )}
                  className="w-full h-full border-0"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />

                {showLabels && selectedRegion === 'all' ? (
                  <div
                    id="google-map-region-pins"
                    aria-label="Các ghim địa điểm đặc sản trên Google Maps Đồng Nai"
                    className="absolute inset-0 pointer-events-none z-10"
                  >
                    {REGION_MARKER_LIST.map((pill) => {
                      const pGeo = DONG_NAI_CLIENT_COORDS[pill.key];
                      const isHub = pill.key === 'TP. Biên Hòa';
                      return (
                        <button
                          key={pill.key}
                          type="button"
                          data-gmap-pin={pill.key}
                          onClick={() => setSelectedRegion(pill.key)}
                          aria-label={`Chọn vùng ${pill.label} - ${pGeo.shortSpecialty}`}
                          style={{ left: pGeo.pinPos.left, top: pGeo.pinPos.top }}
                          className="pointer-events-auto absolute -translate-x-1/2 -translate-y-full group focus:outline-none"
                        >
                          <div
                            className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl border shadow-md transition-transform group-hover:scale-105 group-focus-visible:ring-2 group-focus-visible:ring-harvest text-left ${
                              isHub
                                ? 'bg-forest-dark/95 text-white border-amber-200/80'
                                : 'bg-white/95 backdrop-blur-sm text-forest-dark border-forest/35'
                            }`}
                          >
                            <OcopIcon
                              name={pill.icon}
                              className={`w-3.5 h-3.5 shrink-0 ${isHub ? 'text-amber-200' : 'text-forest'}`}
                            />
                            <div className="leading-tight">
                              <div className="text-[10px] sm:text-xs font-extrabold whitespace-nowrap">{pill.label}</div>
                              <div
                                className={`hidden sm:block text-[9px] font-bold whitespace-nowrap ${
                                  isHub ? 'text-amber-200' : 'text-forest'
                                }`}
                              >
                                {pGeo.shortSpecialty}
                              </div>
                            </div>
                          </div>
                          <div className="w-2.5 h-2.5 mx-auto mt-0.5 rounded-full bg-sale border-2 border-white shadow" />
                        </button>
                      );
                    })}

                    <div
                      style={{ left: TRI_AN_LAKE_LANDMARK.pinPos.left, top: TRI_AN_LAKE_LANDMARK.pinPos.top }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-100/95 border border-sky-600/40 text-sky-800 text-[9px] font-extrabold shadow-sm whitespace-nowrap"
                    >
                      <OcopIcon name="droplet" className="w-2.5 h-2.5 text-sky-700" />
                      <span>{TRI_AN_LAKE_LANDMARK.label}</span>
                    </div>
                  </div>
                ) : null}

                {showLabels && selectedRegion !== 'all' ? (
                  <div
                    id="google-map-active-callout"
                    className="absolute bottom-2.5 left-2.5 right-12 sm:right-auto sm:max-w-[265px] z-10 bg-white/95 backdrop-blur-sm rounded-xl p-2.5 border border-forest/25 shadow-lg space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-forest-dark">
                        <span className="w-2.5 h-2.5 rounded-full bg-sale animate-pulse shrink-0" />
                        <span>{info.title}</span>
                      </span>
                    </div>
                    <div className="text-[11px] font-bold text-forest">{geo.shortSpecialty}</div>
                    <div className="text-[10px] text-forest-dark/70 leading-snug">{geo.address}</div>
                    <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[10px]">
                      <span className="font-mono font-bold text-forest-dark/75">
                        {geo.lat.toFixed(4)}° N, {geo.lng.toFixed(4)}° E
                      </span>
                      <a
                        href={buildGoogleMapsDirectionsUrl(geo.lat, geo.lng, geo.adminQuery)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-extrabold text-sale hover:underline"
                      >
                        <OcopIcon name="navigation" className="w-3 h-3" />
                        <span>Chỉ đường</span>
                      </a>
                    </div>
                  </div>
                ) : null}
              </>
            )}

            {sdkError ? (
              <div className="absolute top-2 left-2 right-2 sm:right-auto z-20 bg-white/95 backdrop-blur-sm text-[11px] font-bold text-sale px-3 py-1.5 rounded-xl border border-sale/25 shadow-sm">
                Google Maps API Key chưa hợp lệ ({sdkError}) — đang dùng chế độ Google Maps chuẩn.
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-forest-dark/65 px-1 pt-2 border-t border-forest/10">
            <span className="inline-flex items-center gap-1 font-mono font-bold text-forest-dark/75">
              <OcopIcon name="compass" className="w-3.5 h-3.5 text-forest" />
              <span>{geo.lat.toFixed(4)}° N, {geo.lng.toFixed(4)}° E</span>
            </span>
            <a
              href={buildGoogleMapsExternalUrl(geo.lat, geo.lng, selectedRegion === 'all' ? 'Đồng Nai' : selectedRegion, geo.adminQuery)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-extrabold text-forest hover:underline"
            >
              <OcopIcon name="external-link" className="w-3 h-3" />
              <span>Mở ranh giới trên Google Maps</span>
            </a>
          </div>
        </div>

        <div ref={storyRef} id="map-story-card" className="lg:col-span-5 bg-bgsoft rounded-2xl p-5 sm:p-6 border border-forest-dark/10 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 bg-mint text-forest text-xs font-extrabold px-3 py-1 rounded-full border border-forest/15">
                <OcopIcon name={info.icon || 'map'} className="w-3.5 h-3.5" />
                <span>{info.badge}</span>
              </span>
              <button
                type="button"
                onClick={() => speakVietnamese(`${info.title}. ${info.verdict}`)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white hover:bg-forest hover:text-white text-forest-dark text-xs font-extrabold border border-forest-dark/15 transition-colors"
                title="Nghe giới thiệu địa phương"
              >
                <OcopIcon name="volume" className="w-3.5 h-3.5" />
                <span>Nghe</span>
              </button>
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold text-forest-dark leading-snug">{info.title}</h3>
            <p className="text-xs sm:text-sm text-forest-dark/80 leading-relaxed">{info.verdict}</p>
            <div className="bg-white rounded-xl p-3 border border-forest/15 text-xs font-bold text-forest leading-relaxed">
              {info.specialty}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-forest-dark/65">
              <span className="inline-flex items-center gap-1">
                <OcopIcon name="pin" className="w-3.5 h-3.5 text-sale" />
                <span>{info.gps}</span>
              </span>
              <span className="font-extrabold text-forest-dark">{countInRegion} nông sản sẵn hàng</span>
            </div>
            {distanceInfo ? (
              <div id="map-distance-badge" className="bg-white rounded-xl px-3 py-2 border border-forest/15 text-xs flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 font-bold text-forest-dark">
                  <OcopIcon name="navigation" className="w-3.5 h-3.5 text-forest" />
                  <span>Tới TP. Biên Hòa: <strong>{distanceInfo.distanceText}</strong></span>
                </span>
                <span className="text-sale font-extrabold">{distanceInfo.durationText}</span>
              </div>
            ) : null}
            {featuredProd ? (
              <Link
                to={getProductUrl(featuredProd)}
                className="flex items-center gap-3 bg-white hover:bg-mint/60 p-2.5 rounded-xl border border-forest-dark/10 transition-colors"
              >
                <div className="w-12 h-12 rounded-lg overflow-hidden img-fallback-box shrink-0 relative flex items-center justify-center">
                  <span aria-hidden="true" className="text-forest/70 flex items-center justify-center">
                    <OcopIcon name={featuredProd.icon || featuredProd.emoji} className="w-6 h-6" />
                  </span>
                  {featuredImgSrc ? (
                    <img
                      src={featuredImgSrc}
                      alt={featuredProd.name}
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-extrabold uppercase text-forest">Đặc sản tiêu biểu</div>
                  <div className="text-xs font-extrabold text-forest-dark truncate">{featuredProd.name}</div>
                  <div className="text-xs font-extrabold text-sale">{formatVND(featuredProd.price)}</div>
                </div>
                <OcopIcon name="arrow-right" className="w-4 h-4 text-forest" />
              </Link>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2 pt-2 border-t border-forest-dark/10">
            <Link
              to={info.ctaHref}
              className="flex-1 inline-flex items-center justify-center gap-1.5 text-center px-4 py-2.5 rounded-xl bg-forest-dark hover:bg-forest text-white font-extrabold text-xs sm:text-sm transition-colors"
            >
              <span>{info.ctaLabel}</span>
              <OcopIcon name="arrow-right" className="w-4 h-4" />
            </Link>
            <button
              type="button"
              onClick={() => setSelectedRegion('all')}
              className="inline-flex items-center gap-1 px-4 py-2.5 rounded-xl bg-white hover:bg-mint text-forest-dark font-bold text-xs sm:text-sm border border-forest-dark/15 transition-colors"
            >
              <OcopIcon name="map" className="w-4 h-4 text-forest" />
              <span>Xem toàn tỉnh</span>
            </button>
          </div>
        </div>
      </div>

      <ApiConfigModal open={configOpen} onClose={() => setConfigOpen(false)} />
    </section>
  );
}
