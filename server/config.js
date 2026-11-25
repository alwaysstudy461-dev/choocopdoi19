import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT_DIR, '.env');
const RUNTIME_CFG_PATH = path.join(__dirname, 'data', 'runtime-config.json');

function parseEnvFile(raw) {
  const out = {};
  for (const line of String(raw || '').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

export function maskSecret(secret) {
  const s = String(secret || '').trim();
  if (!s) return '';
  if (s.length <= 8) return '****';
  return `${s.slice(0, 4)}...${s.slice(-4)}`;
}

export function createConfigManager(runtimePath = RUNTIME_CFG_PATH) {
  let runtime = {};

  try {
    if (fs.existsSync(ENV_PATH)) {
      const parsed = parseEnvFile(fs.readFileSync(ENV_PATH, 'utf8'));
      for (const [k, v] of Object.entries(parsed)) {
        if (!(k in process.env)) process.env[k] = v;
      }
    }
  } catch {
    // ignore missing .env
  }

  try {
    if (fs.existsSync(runtimePath)) {
      runtime = JSON.parse(fs.readFileSync(runtimePath, 'utf8')) || {};
    }
  } catch {
    runtime = {};
  }

  const getSecrets = () => ({
    groqApiKey: String(runtime.groqApiKey ?? process.env.GROQ_API_KEY ?? '').trim(),
    groqModel: String(runtime.groqModel ?? process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile').trim() || 'llama-3.3-70b-versatile',
    googleMapsApiKey: String(runtime.googleMapsApiKey ?? process.env.GOOGLE_MAPS_API_KEY ?? '').trim(),
  });

  const getPublicConfig = () => {
    const s = getSecrets();
    return {
      groqEnabled: Boolean(s.groqApiKey),
      groqModel: s.groqModel,
      groqKeyPreview: maskSecret(s.groqApiKey),
      googleMapsEnabled: Boolean(s.googleMapsApiKey),
      googleMapsApiKey: s.googleMapsApiKey,
      googleMapsKeyPreview: maskSecret(s.googleMapsApiKey),
    };
  };

  const updateRuntimeConfig = async ({ groqApiKey, groqModel, googleMapsApiKey } = {}) => {
    if (typeof groqApiKey === 'string') runtime.groqApiKey = groqApiKey.trim();
    if (typeof groqModel === 'string' && groqModel.trim()) runtime.groqModel = groqModel.trim().slice(0, 80);
    if (typeof googleMapsApiKey === 'string') runtime.googleMapsApiKey = googleMapsApiKey.trim();
    await fsp.mkdir(path.dirname(runtimePath), { recursive: true });
    await fsp.writeFile(runtimePath, JSON.stringify(runtime, null, 2), 'utf8');
    return getPublicConfig();
  };

  return {
    getSecrets,
    getPublicConfig,
    updateRuntimeConfig,
  };
}

