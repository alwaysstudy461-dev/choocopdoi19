import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const lucide = require('@iconify-json/lucide/icons.json');
const mdi = require('@iconify-json/mdi/icons.json');

const ICON_MAP = {
  leaf: ['lucide', 'leaf'],
  sprout: ['lucide', 'sprout'],
  wheat: ['lucide', 'wheat'],
  sparkles: ['lucide', 'sparkles'],
  flame: ['lucide', 'flame'],
  sun: ['lucide', 'sun'],
  bot: ['lucide', 'bot'],
  cherry: ['mdi', 'fruit-cherries'],
  citrus: ['mdi', 'fruit-citrus'],
  peanut: ['mdi', 'peanut'],
  honey: ['lucide', 'droplet'],
  durian: ['mdi', 'fruit-pineapple'],
  cacao: ['lucide', 'candy'],
  coffee: ['mdi', 'coffee'],
  pepper: ['mdi', 'chili-mild'],
  mango: ['mdi', 'food-apple'],
  avocado: ['mdi', 'seed'],
  gift: ['lucide', 'gift'],
  healthy: ['lucide', 'heart'],
  'heart-filled': ['mdi', 'heart'],
  star: ['lucide', 'star'],
  'star-filled': ['mdi', 'star'],
  'star-outline': ['mdi', 'star-outline'],
  utensils: ['lucide', 'utensils'],
  zap: ['lucide', 'zap'],
  package: ['lucide', 'package'],
  search: ['lucide', 'search'],
  pin: ['lucide', 'map-pin'],
  truck: ['lucide', 'truck'],
  award: ['lucide', 'award'],
  dollar: ['lucide', 'badge-dollar-sign'],
  store: ['lucide', 'store'],
  'shield-check': ['lucide', 'shield-check'],
  shield: ['lucide', 'shield'],
  mic: ['lucide', 'mic'],
  volume: ['lucide', 'volume-2'],
  stop: ['lucide', 'square'],
  cart: ['lucide', 'shopping-cart'],
  basket: ['mdi', 'basket-outline'],
  clipboard: ['lucide', 'clipboard-list'],
  home: ['lucide', 'house'],
  compass: ['lucide', 'compass'],
  refresh: ['lucide', 'refresh-cw'],
  qr: ['lucide', 'qr-code'],
  scan: ['mdi', 'qrcode-scan'],
  clock: ['lucide', 'clock'],
  calendar: ['lucide', 'calendar'],
  user: ['lucide', 'user'],
  farmer: ['lucide', 'tractor'],
  city: ['lucide', 'building'],
  map: ['lucide', 'map'],
  logout: ['lucide', 'log-out'],
  lock: ['lucide', 'lock'],
  eye: ['lucide', 'eye'],
  'eye-off': ['lucide', 'eye-off'],
  check: ['lucide', 'check'],
  'check-circle': ['lucide', 'circle-check'],
  x: ['lucide', 'x'],
  'x-circle': ['lucide', 'circle-x'],
  alert: ['mdi', 'alert-outline'],
  lightbulb: ['lucide', 'lightbulb'],
  info: ['lucide', 'info'],
  party: ['lucide', 'party-popper'],
  handshake: ['mdi', 'handshake-outline'],
  phone: ['lucide', 'phone'],
  chat: ['lucide', 'message-circle'],
  banknote: ['lucide', 'banknote'],
  landmark: ['lucide', 'landmark'],
  pen: ['lucide', 'pen-line'],
  link: ['lucide', 'link-2'],
  'file-text': ['lucide', 'file-text'],
  factory: ['lucide', 'factory'],
  microscope: ['lucide', 'microscope'],
  rocket: ['lucide', 'rocket'],
  radio: ['lucide', 'radio'],
  ticket: ['lucide', 'ticket'],
  sliders: ['lucide', 'sliders-horizontal'],
  pointer: ['lucide', 'mouse-pointer-click'],
  'arrow-right': ['lucide', 'arrow-right'],
  'chevron-left': ['lucide', 'chevron-left'],
  'chevron-right': ['lucide', 'chevron-right'],
  bell: ['lucide', 'bell'],
  droplet: ['lucide', 'droplet'],
  navigation: ['lucide', 'navigation'],
  layers: ['lucide', 'layers'],
  'external-link': ['lucide', 'external-link'],
  settings: ['lucide', 'settings'],
};

const sets = { lucide, mdi };
const icons = {};
const aliases = {};

for (const [key, [packName, iconName]] of Object.entries(ICON_MAP)) {
  const pack = sets[packName];
  const raw = pack.icons[iconName];
  if (!raw) {
    throw new Error(`Missing icon ${packName}:${iconName} for key ${key}`);
  }
  const fullId = `${packName}:${iconName}`;
  icons[fullId] = {
    body: raw.body,
    width: raw.width || pack.width || 24,
    height: raw.height || pack.height || 24,
  };
  aliases[key] = fullId;
}

const outPath = path.resolve('src/components/iconifyRegistry.js');
const content = `// Generated from official @iconify-json/lucide & @iconify-json/mdi packages.
import { addIcon } from '@iconify/react';

export const ICONIFY_DATA = ${JSON.stringify(icons, null, 2)};

export const OCOP_ICON_IDS = ${JSON.stringify(aliases, null, 2)};

let registered = false;
export function ensureOcopIconsRegistered() {
  if (registered) return;
  registered = true;
  Object.entries(ICONIFY_DATA).forEach(([id, data]) => {
    addIcon(id, data);
  });
}

ensureOcopIconsRegistered();
`;

fs.writeFileSync(outPath, content, 'utf8');
console.log(`Generated ${Object.keys(icons).length} Iconify icons -> ${outPath}`);

