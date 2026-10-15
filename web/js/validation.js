// Mirrors the backend rules for instant feedback; the server re-validates everything.
const PH_MOBILE_RE = /^(?:\+?63|0)(9\d{9})$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizePhone(raw) {
  const match = String(raw || '').replace(/[\s\-().]/g, '').match(PH_MOBILE_RE);
  return match ? `+63${match[1]}` : null;
}

export function validateName(name) {
  const value = String(name || '').trim().replace(/\s+/g, ' ');
  if (value.length < 2) return 'Please enter your full name.';
  if (value.length > 120) return 'Name is too long.';
  if (!/[A-Za-zÀ-ÿñÑ]/.test(value)) return 'Name must contain letters.';
  return null;
}

export function validatePhone(phone) {
  if (!String(phone || '').trim()) return 'Contact number is required.';
  return normalizePhone(phone) ? null : 'Enter a valid PH mobile number, e.g. 0917 123 4567.';
}

export function validateEmail(email) {
  const value = String(email || '').trim();
  if (!value) return null;
  return value.length > 254 || !EMAIL_RE.test(value) ? 'Enter a valid email address or leave it blank.' : null;
}

/** Pickup is interpreted in bakery time (Asia/Manila, UTC+8). */
export function validatePickup({ date, time }, rules, now = new Date()) {
  const errors = {};
  if (!date) errors.date = 'Choose a pickup date.';
  if (!time) errors.time = 'Choose a pickup time.';
  if (errors.date || errors.time) return errors;
  const pickupAt = new Date(`${date}T${time}:00+08:00`);
  if (Number.isNaN(pickupAt.getTime())) return { date: 'Invalid pickup date or time.' };
  const lead = rules?.min_lead_minutes ?? 60;
  const maxDays = rules?.max_advance_days ?? 60;
  if (pickupAt <= now) errors.time = 'Pickup must be in the future.';
  else if (pickupAt.getTime() < now.getTime() + lead * 60000) errors.time = `Please allow at least ${lead} minutes for preparation.`;
  else if (pickupAt.getTime() > now.getTime() + (maxDays + 1) * 86400000) errors.date = `Pickup can be scheduled up to ${maxDays} days ahead.`;
  if (!errors.time && rules?.open_time && rules?.close_time && (time < rules.open_time || time > rules.close_time)) {
    errors.time = `Pickup time must be between ${rules.open_time} and ${rules.close_time}.`;
  }
  return errors;
}
