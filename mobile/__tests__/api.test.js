jest.mock('../src/constants/config', () => ({
  API_BASE_URL: 'http://api.test/api',
  API_ORIGIN: 'http://api.test',
  API_TIMEOUT_MS: 50,
}));

import api, { ApiError } from '../src/services/api';

const jsonResponse = (status, body) => ({ ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) });

afterEach(() => {
  global.fetch = undefined;
});

test('GET products builds the query string', async () => {
  global.fetch = jest.fn().mockResolvedValue(jsonResponse(200, { items: [], total: 0 }));
  await api.getProducts({ category: 'Cakes', search: 'ube cake' });
  expect(global.fetch.mock.calls[0][0]).toBe('http://api.test/api/bakery/products?limit=100&category=Cakes&search=ube%20cake');
});

test('createOrder sends the idempotency key and JSON body', async () => {
  global.fetch = jest.fn().mockResolvedValue(jsonResponse(201, { reference: '4R-AAAA-BBBB' }));
  const res = await api.createOrder({ items: [] }, 'chk-123456');
  expect(res.reference).toBe('4R-AAAA-BBBB');
  const [, init] = global.fetch.mock.calls[0];
  expect(init.method).toBe('POST');
  expect(init.headers['Idempotency-Key']).toBe('chk-123456');
  expect(init.headers['Content-Type']).toBe('application/json');
  expect(JSON.parse(init.body)).toEqual({ items: [] });
});

test('getOrder passes the phone as a header, not in the URL', async () => {
  global.fetch = jest.fn().mockResolvedValue(jsonResponse(200, { reference: '4R-X' }));
  await api.getOrder('4R-AAAA-BBBB', '+639171234567');
  const [url, init] = global.fetch.mock.calls[0];
  expect(url).not.toContain('639');
  expect(init.headers['X-Contact-Phone']).toBe('+639171234567');
});

test('HTTP errors surface server detail and field errors', async () => {
  global.fetch = jest.fn().mockResolvedValue(
    jsonResponse(422, { detail: 'Pickup date and time must be in the future.', errors: [{ field: 'pickup_date', message: 'x' }] })
  );
  const err = await api.createOrder({}).catch((e) => e);
  expect(err).toBeInstanceOf(ApiError);
  expect(err.status).toBe(422);
  expect(err.message).toMatch(/future/);
  expect(err.fieldErrors).toHaveLength(1);
});

test('non-JSON error pages fall back to a friendly message', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 502, text: async () => '<html>Bad gateway</html>' });
  const err = await api.health().catch((e) => e);
  expect(err.message).toMatch(/unreachable/);
});

test('network failures are flagged', async () => {
  global.fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
  const err = await api.getBakeryInfo().catch((e) => e);
  expect(err.isNetworkError).toBe(true);
  expect(err.message).toMatch(/Cannot reach/);
});

test('requests time out', async () => {
  global.fetch = jest.fn((_url, { signal }) => new Promise((_res, rej) => {
    signal.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' })));
  }));
  const err = await api.getBakeryInfo().catch((e) => e);
  expect(err.isTimeout).toBe(true);
});
