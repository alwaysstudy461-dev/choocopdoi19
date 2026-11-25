import React from 'react';
import { Icon } from '@iconify/react';
import { OCOP_ICON_IDS } from './iconifyRegistry.js';

const EMOJI_TO_KEY = {
  '🍒': 'cherry',
  '🍊': 'citrus',
  '🥜': 'peanut',
  '🍯': 'honey',
  '🍈': 'durian',
  '🍫': 'cacao',
  '☕': 'coffee',
  '🌶️': 'pepper',
  '🌶': 'pepper',
  '🥭': 'mango',
  '🥑': 'avocado',
  '🎁': 'gift',
  '🌿': 'leaf',
  '🌱': 'sprout',
  '🌾': 'wheat',
  '✨': 'sparkles',
  '🔥': 'flame',
  '💚': 'healthy',
  '❤️': 'heart-filled',
  '❤': 'heart-filled',
  '🤍': 'healthy',
  '⭐': 'star',
  '★': 'star-filled',
  '☆': 'star-outline',
  '🍽️': 'utensils',
  '⚡': 'zap',
  '📦': 'package',
  '🔍': 'search',
  '🔎': 'search',
  '📍': 'pin',
  '🚚': 'truck',
  '🏅': 'award',
  '💰': 'dollar',
  '🏪': 'store',
  '🛡️': 'shield-check',
  '🛡': 'shield-check',
  '🎙️': 'mic',
  '🎙': 'mic',
  '🎤': 'mic',
  '🔊': 'volume',
  '⏹️': 'stop',
  '🛒': 'cart',
  '🧺': 'basket',
  '📋': 'clipboard',
  '🏠': 'home',
  '🏡': 'home',
  '🧭': 'compass',
  '🔄': 'refresh',
  '📷': 'scan',
  '🕒': 'clock',
  '📅': 'calendar',
  '👤': 'user',
  '👨‍🌾': 'farmer',
  '🏙️': 'city',
  '🗺️': 'map',
  '🚪': 'logout',
  '🔐': 'lock',
  '🔒': 'lock',
  '👁️': 'eye',
  '🙈': 'eye-off',
  '✓': 'check',
  '✅': 'check-circle',
  '✕': 'x',
  '⚠️': 'alert',
  '⚠': 'alert',
  '💡': 'lightbulb',
  'ℹ️': 'info',
  '🎉': 'party',
  '🤝': 'handshake',
  '📞': 'phone',
  '💬': 'chat',
  '💵': 'banknote',
  '🏦': 'landmark',
  '📝': 'file-text',
  '✍️': 'pen',
  '🔗': 'link',
  '🏭': 'factory',
  '🔬': 'microscope',
  '🚀': 'rocket',
  '🔔': 'bell',
  '🎟️': 'ticket',
  '🎛️': 'sliders',
  '🛍️': 'cart',
  '📌': 'pin',
  '🤖': 'bot',
  '💧': 'droplet',
  '🏷️': 'ticket',
  '👆': 'pointer',
  '🔴': 'radio',
  '🎯': 'compass',
  '👀': 'eye',
};

export function resolveIconId(name) {
  if (!name) return OCOP_ICON_IDS.leaf;
  const mapped = EMOJI_TO_KEY[name] || name;
  return OCOP_ICON_IDS[mapped] || mapped;
}

export default function OcopIcon({ name, className = 'w-4 h-4', inline = true, ...rest }) {
  const iconId = resolveIconId(name);
  return (
    <Icon
      icon={iconId}
      inline={inline}
      aria-hidden="true"
      className={`inline-block shrink-0 ${className}`}
      {...rest}
    />
  );
}

