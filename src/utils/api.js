const API_BASE = '/api';

async function requestJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 14000);
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, status: res.status, error: data?.error || 'Request failed', data };
    }
    return data || { ok: true };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export const apiClient = {
  fetchBootstrap: () => requestJson(`${API_BASE}/bootstrap`, { timeoutMs: 3500 }),
  fetchPublicConfig: () => requestJson(`${API_BASE}/config/public`, { timeoutMs: 3500 }),
  updateApiConfig: (payload) =>
    requestJson(`${API_BASE}/config`, { method: 'POST', body: JSON.stringify(payload) }),
  fetchMapLocations: () => requestJson(`${API_BASE}/maps/locations`, { timeoutMs: 3500 }),
  fetchMapDistance: (region, dest = 'TP. Biên Hòa, Đồng Nai') =>
    requestJson(
      `${API_BASE}/maps/distance?region=${encodeURIComponent(region)}&dest=${encodeURIComponent(dest)}`,
      { timeoutMs: 7000 }
    ),
  createProduct: (product) =>
    requestJson(`${API_BASE}/products`, { method: 'POST', body: JSON.stringify(product) }),
  addReview: (productId, review) =>
    requestJson(`${API_BASE}/products/${encodeURIComponent(productId)}/reviews`, {
      method: 'POST',
      body: JSON.stringify(review),
    }),
  createOrders: (payload) =>
    requestJson(`${API_BASE}/orders`, { method: 'POST', body: JSON.stringify(payload) }),
  updateOrder: (orderId, patch) =>
    requestJson(`${API_BASE}/orders/${encodeURIComponent(orderId)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
  login: (credentials) =>
    requestJson(`${API_BASE}/auth/login`, { method: 'POST', body: JSON.stringify(credentials) }),
  register: (payload) =>
    requestJson(`${API_BASE}/auth/register`, { method: 'POST', body: JSON.stringify(payload) }),
  addHelpRequest: (entry) =>
    requestJson(`${API_BASE}/help-requests`, { method: 'POST', body: JSON.stringify(entry) }),
  setLiveReminder: (payload) =>
    requestJson(`${API_BASE}/live-reminders`, { method: 'POST', body: JSON.stringify(payload) }),
  parseAiListing: (text, user) =>
    requestJson(`${API_BASE}/ai/parse-listing`, {
      method: 'POST',
      body: JSON.stringify({ text, user }),
    }),
  askAiChat: (query, user) =>
    requestJson(`${API_BASE}/ai/chat`, {
      method: 'POST',
      body: JSON.stringify({ query, user }),
    }),
};
