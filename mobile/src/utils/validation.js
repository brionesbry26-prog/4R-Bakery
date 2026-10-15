// Client-side validation mirrors the backend rules for fast feedback.
// The backend remains the source of truth and re-validates everything.

const PH_MOBILE_RE = /^(?:\+?63|0)(9\d{9})$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizePhone(raw) {
  const cleaned = String(raw || '').replace(/[\s\-().]/g, '');
  const match = cleaned.match(PH_MOBILE_RE);
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
  if (!value) return null; // optional
  if (value.length > 254 || !EMAIL_RE.test(value)) return 'Enter a valid email address or leave it blank.';
  return null;
}

/**
 * pickup: { date: 'YYYY-MM-DD', time: 'HH:MM' } interpreted as bakery local time.
 * rules: pickup rules from GET /bakery/info (may be null while loading).
 * now: injectable for tests.
 */
export function validatePickup(pickup, rules, now = new Date()) {
  const errors = {};
  if (!pickup?.date) errors.date = 'Choose a pickup date.';
  if (!pickup?.time) errors.time = 'Choose a pickup time.';
  if (errors.date || errors.time) return errors;

  // Bakery is in Asia/Manila (UTC+8, no DST); compare in that offset.
  const pickupAt = new Date(`${pickup.date}T${pickup.time}:00+08:00`);
  if (Number.isNaN(pickupAt.getTime())) {
    errors.date = 'Invalid pickup date or time.';
    return errors;
  }
  const leadMinutes = rules?.min_lead_minutes ?? 60;
  const maxDays = rules?.max_advance_days ?? 60;

  if (pickupAt <= now) {
    errors.time = 'Pickup must be in the future.';
  } else if (pickupAt.getTime() < now.getTime() + leadMinutes * 60000) {
    errors.time = `Please allow at least ${leadMinutes} minutes for preparation.`;
  } else if (pickupAt.getTime() > now.getTime() + (maxDays + 1) * 86400000) {
    errors.date = `Pickup can be scheduled up to ${maxDays} days ahead.`;
  }
  if (!errors.time && rules?.open_time && rules?.close_time) {
    if (pickup.time < rules.open_time || pickup.time > rules.close_time) {
      errors.time = `Pickup time must be between ${rules.open_time} and ${rules.close_time}.`;
    }
  }
  return errors;
}

export function validateQuantity(quantity, max = 500) {
  return Number.isInteger(quantity) && quantity >= 1 && quantity <= max;
}
