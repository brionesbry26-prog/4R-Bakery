import { API_BASE_URL, API_TIMEOUT_MS } from './config.js';

export class ApiError extends Error {
  constructor(message, { status = 0, fieldErrors = [], isNetworkError = false } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.isNetworkError = isNetworkError;
  }
}

const STATUS_MESSAGES = {
  404: 'We could not find what you were looking for.',
  409: 'Something changed while you were ordering. Please review your bag.',
  413: 'The request is too large.',
  422: 'Some details need fixing.',
  429: 'Too many requests. Please wait a minute and try again.',
  500: 'The bakery server had a problem. Please try again shortly.',
  502: 'The bakery server is unreachable right now.',
  503: 'The bakery server is temporarily unavailable.',
};

async function request(path, { method = 'GET', body, headers = {}, timeout = API_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    const timedOut = err?.name === 'AbortError';
    throw new ApiError(
      timedOut
        ? 'The bakery server took too long to respond. Please try again.'
        : 'We can’t reach the bakery right now. Check your connection and try again.',
      { isNetworkError: true }
    );
  } finally {
    clearTimeout(timer);
  }

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }
  if (!response.ok) {
    const detail = typeof data?.detail === 'string' ? data.detail : null;
    throw new ApiError(detail || STATUS_MESSAGES[response.status] || `Request failed (${response.status}).`, {
      status: response.status,
      fieldErrors: Array.isArray(data?.errors) ? data.errors : [],
    });
  }
  if (data === null) throw new ApiError('The server sent an unexpected response.', { status: response.status });
  return data;
}

export const api = {
  getBakeryInfo: () => request('/bakery/info'),
  getProducts: () => request('/bakery/products?limit=100'),
  getProduct: (id) => request(`/bakery/products/${encodeURIComponent(id)}`),
  createOrder: (payload, idempotencyKey) =>
    request('/bakery/orders', {
      method: 'POST',
      body: payload,
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
      timeout: 20000,
    }),
  getOrder: (reference, phone) =>
    request(`/bakery/orders/${encodeURIComponent(reference)}`, { headers: { 'X-Contact-Phone': phone } }),
};
