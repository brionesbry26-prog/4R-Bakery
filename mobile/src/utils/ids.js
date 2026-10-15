// Idempotency keys only need to be unique per checkout attempt, not secret.
export function createIdempotencyKey() {
  const rand = () => Math.random().toString(36).slice(2, 10);
  return `chk-${Date.now().toString(36)}-${rand()}${rand()}`;
}
