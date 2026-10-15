import { API_BASE_URL, API_TIMEOUT_MS } from '../constants/config';

export class ApiError extends Error {
  constructor(message, { status = 0, fieldErrors = [], isNetworkError = false, isTimeout = false } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.isNetworkError = isNetworkError;
    this.isTimeout = isTimeout;
  }
}

const STATUS_MESSAGES = {
  400: 'The request could not be processed.',
  404: 'We could not find what you were looking for.',
  409: 'Something changed while you were ordering. Please review your bag.',
  413: 'The request is too large.',
  422: 'Some details need fixing.',
  429: 'Too many requests. Please wait a minute and try again.',
  500: 'The bakery server had a problem. Please try again shortly.',
  502: 'The bakery server is unreachable right now.',
  503: 'The bakery server is temporarily unavailable.',
};

async function request(path, { method = 'GET', body, headers = {}, timeout = API_TIMEOUT_MS, signal } = {}) {
  if (!API_BASE_URL) {
    throw new ApiError('The app is not configured with a server address (EXPO_PUBLIC_API_BASE_URL).', {
      isNetworkError: true,
    });
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const onExternalAbort = () => controller.abort();
  signal?.addEventListener?.('abort', onExternalAbort);

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
    if (signal?.aborted) throw err; // caller cancelled; let them ignore it
    const isTimeout = err?.name === 'AbortError';
    throw new ApiError(
      isTimeout
        ? 'The bakery server took too long to respond. Check your connection and try again.'
        : 'Cannot reach the bakery server. Check your internet connection and try again.',
      { isNetworkError: true, isTimeout }
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener?.('abort', onExternalAbort);
  }

  let data = null;
  const text = await response.text();
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
  if (data === null) {
    throw new ApiError('The server sent an unexpected response.', { status: response.status });
  }
  return data;
}

export const api = {
  health: (opts) => request('/health', opts),
  getBakeryInfo: (opts) => request('/bakery/info', opts),
  /** Returns { items, total, limit, offset, categories }. */
  getProducts: (params = {}, opts) => {
    const query = Object.entries({ limit: 100, ...params })
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    return request(`/bakery/products${query ? `?${query}` : ''}`, opts);
  },
  getProduct: (id, opts) => request(`/bakery/products/${encodeURIComponent(id)}`, opts),
  /** payload matches the backend OrderCreate schema. */
  createOrder: (payload, idempotencyKey, opts) =>
    request('/bakery/orders', {
      method: 'POST',
      body: payload,
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
      timeout: 20000,
      ...opts,
    }),
  getOrder: (reference, phone, opts) =>
    request(`/bakery/orders/${encodeURIComponent(reference)}`, {
      headers: { 'X-Contact-Phone': phone },
      ...opts,
    }),
};

export default api;
