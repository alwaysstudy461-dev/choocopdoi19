import React, { useState } from 'react';
import OcopIcon from './OcopIcon.jsx';

export function normalizeAssetPath(src) {
  if (!src) return '';
  if (src.startsWith('/') || src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
    return src;
  }
  return `/${src}`;
}

export default function ProductImage({ product, heightClass = 'h-48' }) {
  const [imgFailed, setImgFailed] = useState(false);
  const src = normalizeAssetPath(product?.image);

  return (
    <div className={`relative ${heightClass} img-fallback-box overflow-hidden flex items-center justify-center`}>
      <span aria-hidden="true" className="text-forest/70 flex items-center justify-center select-none">
        <OcopIcon name={product?.icon || product?.emoji || 'leaf'} className="w-12 h-12" />
      </span>
      {src && !imgFailed ? (
        <img
          src={src}
          alt={product?.name || 'Nông sản OCOP'}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={() => setImgFailed(true)}
        />
      ) : null}
    </div>
  );
}
