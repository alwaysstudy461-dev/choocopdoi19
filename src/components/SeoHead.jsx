import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE_NAME = 'Chợ OCOP Thanh Niên Đồng Nai';
const DEFAULT_IMAGE = '/images/chom-chom.jpg';

function upsertMeta(attrName, attrValue, content) {
  let el = document.head.querySelector(`meta[${attrName}="${attrValue}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function removeMeta(attrName, attrValue) {
  const el = document.head.querySelector(`meta[${attrName}="${attrValue}"]`);
  if (el) el.remove();
}

function upsertLink(rel, href, extra = {}) {
  const extraSelector = Object.entries(extra)
    .map(([k, v]) => `[${k}="${v}"]`)
    .join('');
  let el = document.head.querySelector(`link[rel="${rel}"]${extraSelector}`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    Object.entries(extra).forEach(([k, v]) => el.setAttribute(k, v));
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export default function SeoHead({
  title,
  description,
  keywords,
  canonicalPath,
  image = DEFAULT_IMAGE,
  type = 'website',
  robots = 'index, follow, max-image-preview:large',
  productMeta = null,
  jsonLd = null,
}) {
  const location = useLocation();

  useEffect(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const resolvedPath = canonicalPath ?? `${location.pathname}${location.search}`;
    const canonicalUrl = resolvedPath.startsWith('http') ? resolvedPath : `${origin}${resolvedPath}`;
    const imageUrl = image.startsWith('http') ? image : `${origin}${image}`;

    if (title) document.title = title;
    if (description) upsertMeta('name', 'description', description);
    if (keywords) upsertMeta('name', 'keywords', keywords);
    upsertMeta('name', 'robots', robots);
    upsertMeta('name', 'geo.region', 'VN-39');
    upsertMeta('name', 'geo.placename', 'Đồng Nai, Việt Nam');

    upsertLink('canonical', canonicalUrl);
    upsertLink('alternate', canonicalUrl, { hreflang: 'vi-VN' });
    upsertLink('manifest', '/site.webmanifest');

    upsertMeta('property', 'og:site_name', SITE_NAME);
    upsertMeta('property', 'og:locale', 'vi_VN');
    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:title', title || SITE_NAME);
    if (description) upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', canonicalUrl);
    upsertMeta('property', 'og:image', imageUrl);
    upsertMeta('property', 'og:image:alt', title || SITE_NAME);

    if (productMeta) {
      upsertMeta('property', 'product:price:amount', String(productMeta.price));
      upsertMeta('property', 'product:price:currency', productMeta.currency || 'VND');
      upsertMeta('property', 'product:availability', productMeta.availability || 'in stock');
    } else {
      removeMeta('property', 'product:price:amount');
      removeMeta('property', 'product:price:currency');
      removeMeta('property', 'product:availability');
    }

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', title || SITE_NAME);
    if (description) upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', imageUrl);

    const scriptId = 'ocop-jsonld';
    let ldEl = document.getElementById(scriptId);
    if (jsonLd) {
      if (!ldEl) {
        ldEl = document.createElement('script');
        ldEl.id = scriptId;
        ldEl.type = 'application/ld+json';
        document.head.appendChild(ldEl);
      }
      ldEl.textContent = JSON.stringify(jsonLd);
    } else if (ldEl) {
      ldEl.remove();
    }
  }, [canonicalPath, description, image, jsonLd, keywords, location.pathname, location.search, productMeta, robots, title, type]);

  return null;
}
