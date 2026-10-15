import { api } from '../api.js';
import { esc, formatCents, formatDate, formatPeso, formatTime, toCents, toDateInput } from '../format.js';
import { icon } from '../icons.js';
import { productVisual } from '../illustrations.js';
import { cartTotals, clearCart, loadProducts, rememberOrder, state, syncCart } from '../store.js';
import { emptyState } from '../ui.js';
import { normalizePhone, validateEmail, validateName, validatePhone, validatePickup } from '../validation.js';
import { navigate } from '../router.js';

const FIELD_MAP = { 'customer.full_name': 'name', 'customer.phone': 'phone', 'customer.email': 'email', pickup_date: 'date', pickup_time: 'time', notes: 'notes' };
let idem = { fingerprint: null, key: null };
let submitting = false;

const newKey = () => `web-${Date.now().toString(36)}-${crypto.getRandomValues(new Uint32Array(2)).join('')}`;

function summary() {
  const { subtotalCents, blocked } = cartTotals();
  return `
    <h2 class="h3">Order summary</h2>
    <div style="margin-top:12px">
      ${state.cart.map((i) => `<div class="summary-line">
        <div class="line-thumb">${productVisual({ name: i.name, category: i.category, image_url: i.imageUrl })}</div>
        <div><div style="font-weight:600">${esc(i.name)}</div><div class="muted small">${i.quantity} × ${formatPeso(i.price)}${i.isAvailable ? '' : ' · <span style="color:var(--danger)">unavailable</span>'}</div></div>
        <strong>${formatCents(toCents(i.price) * i.quantity)}</strong></div>`).join('')}
    </div>
    <div class="total-row" style="margin-top:18px"><span>Estimated total</span><span class="amount">${formatCents(subtotalCents)}</span></div>
    <p class="muted small" style="margin-top:6px">Pickup only — no delivery fee. The bakery’s server calculates the final total from current prices.</p>
    ${blocked ? `<div class="alert alert--error" style="margin-top:14px">${icon('alert')}<span>Remove unavailable items from your bag to continue.</span></div>` : ''}
    <a class="link" style="margin-top:16px" href="#/menu">${icon('plus', { size: 16 })} Add more items</a>`;
}

function field(id, label, input, { required, hint, span } = {}) {
  return `<div class="field${span ? ' span-2' : ''}" data-field="${id}">
    <label for="f-${id}">${label}${required ? ' <span class="req">*</span>' : ''}</label>
    ${input}
    <span class="field-error" id="e-${id}" aria-live="polite"></span>
    ${hint ? `<span class="field-hint">${hint}</span>` : ''}
  </div>`;
}

export const checkout = {
  title: 'Pre-order',
  render() {
    if (!state.cart.length) {
      return `<div class="container" style="padding:64px 24px 96px">${emptyState({ title: 'Your bag is empty', text: 'Add breads, pastries or cakes to your bag before placing a pre-order.', actionHref: '#/menu', actionLabel: 'Browse the menu' })}</div>`;
    }
    const rules = state.info?.pickup;
    const today = new Date();
    const tomorrow = new Date(Date.now() + 86400000);
    const maxDate = new Date(Date.now() + (rules?.max_advance_days ?? 60) * 86400000);
    return `
    <header class="page-head"><div class="container">
      <nav class="crumbs" aria-label="Breadcrumb"><a href="#/">Home</a><span>/</span><a href="#/menu">Menu</a><span>/</span><span>Pre-order</span></nav>
      <h1 class="h1">Complete your pre-order</h1>
      <p class="lead">Tell us who’s picking up and when. Your request stays pending until the bakery confirms it.</p>
    </div></header>
    <div class="container checkout">
      <form id="checkout-form" novalidate>
        <div id="form-alert"></div>
        <section class="card form-card">
          <h2><span class="num">1</span> Your details</h2>
          <p class="sub">The bakery uses your mobile number to confirm your order.</p>
          <div class="form-grid">
            ${field('name', 'Full name', '<input id="f-name" name="name" class="input" autocomplete="name" maxlength="120" placeholder="Juan Dela Cruz">', { required: true, span: true })}
            ${field('phone', 'Mobile number', '<input id="f-phone" name="phone" class="input" type="tel" inputmode="tel" autocomplete="tel" maxlength="20" placeholder="0917 123 4567">', { required: true, hint: 'Philippine mobile number' })}
            ${field('email', 'Email <span class="muted">(optional)</span>', '<input id="f-email" name="email" class="input" type="email" autocomplete="email" maxlength="254" placeholder="you@example.com">')}
          </div>
        </section>
        <section class="card form-card">
          <h2><span class="num">2</span> Pickup schedule</h2>
          <p class="sub">Pickup at ${esc(state.info?.address || 'Brgy. Bachawan, San Agustin, Romblon')}.${rules ? ` Allow at least ${rules.min_lead_minutes} minutes for preparation.` : ''}${rules?.open_time && rules?.close_time ? ` Pickup hours ${formatTime(rules.open_time)}–${formatTime(rules.close_time)}.` : ''}</p>
          <div class="form-grid">
            ${field('date', 'Pickup date', `<input id="f-date" name="date" class="input" type="date" value="${toDateInput(tomorrow)}" min="${toDateInput(today)}" max="${toDateInput(maxDate)}">`, { required: true })}
            ${field('time', 'Pickup time', `<input id="f-time" name="time" class="input" type="time" step="300"${rules?.open_time ? ` min="${rules.open_time}"` : ''}${rules?.close_time ? ` max="${rules.close_time}"` : ''}>`, { required: true })}
            ${field('notes', 'Special instructions <span class="muted">(optional)</span>', '<textarea id="f-notes" name="notes" class="textarea" maxlength="500" placeholder="e.g. Cake greeting: Happy Birthday, Lola!"></textarea>', { span: true, hint: '<span id="notes-count">0</span>/500 characters' })}
          </div>
        </section>
        <div class="alert alert--info" style="margin-top:24px">${icon('info')}<span>This is a <strong>pre-order request</strong>, not a confirmed order. No payment is collected online — the bakery will confirm your order and payment details with you.</span></div>
        <button class="btn btn--lg btn--block" style="margin-top:24px" type="submit" id="submit-btn">${icon('clipboard')} Submit pre-order request</button>
      </form>
      <aside class="card summary" id="summary" aria-label="Order summary">${summary()}</aside>
    </div>`;
  },
  update(root) {
    if (!state.cart.length && !submitting) {
      root.innerHTML = checkout.render();
      return;
    }
    const s = root.querySelector('#summary');
    if (s) s.innerHTML = summary();
  },
  mount(root) {
    const form = root.querySelector('#checkout-form');
    if (!form) return undefined;
    const btn = root.querySelector('#submit-btn');
    const alertBox = root.querySelector('#form-alert');
    const notes = form.querySelector('#f-notes');
    notes.addEventListener('input', () => (root.querySelector('#notes-count').textContent = notes.value.length));

    const setErrors = (errors) => {
      for (const el of form.querySelectorAll('[data-field]')) {
        const key = el.dataset.field;
        el.classList.toggle('has-error', !!errors[key]);
        el.querySelector('.field-error').textContent = errors[key] || '';
        el.querySelector('input,textarea')?.setAttribute('aria-invalid', errors[key] ? 'true' : 'false');
      }
    };
    const showAlert = (tone, title, lines = []) => {
      alertBox.innerHTML = `<div class="alert alert--${tone}" role="alert" style="margin-bottom:24px">${icon(tone === 'warning' ? 'info' : 'alert')}<div><strong>${esc(title)}</strong>${lines.length ? `<ul>${lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}</div></div>`;
      alertBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    form.addEventListener('input', (e) => {
      const f = e.target.closest('[data-field]');
      if (f?.classList.contains('has-error')) {
        f.classList.remove('has-error');
        f.querySelector('.field-error').textContent = '';
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (submitting) return; // no double submissions
      alertBox.innerHTML = '';
      const v = Object.fromEntries(new FormData(form));
      const errors = {
        name: validateName(v.name),
        phone: validatePhone(v.phone),
        email: validateEmail(v.email),
        ...validatePickup({ date: v.date, time: v.time }, state.info?.pickup),
      };
      Object.keys(errors).forEach((k) => errors[k] || delete errors[k]);
      setErrors(errors);
      if (Object.keys(errors).length) {
        showAlert('error', 'Please check the highlighted fields.');
        form.querySelector('.has-error input, .has-error textarea')?.focus();
        return;
      }
      if (cartTotals().blocked) return showAlert('error', 'Remove unavailable items from your bag to continue.');

      submitting = true;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Submitting…';
      try {
        // Re-validate prices & availability against the server before ordering.
        const fresh = await loadProducts();
        if (fresh) {
          const changes = syncCart(fresh);
          if (changes.length) {
            root.querySelector('#summary').innerHTML = summary();
            showAlert('warning', 'Your bag was updated with the latest menu. Please review it before submitting.', changes);
            return;
          }
        }
        const payload = {
          customer: { full_name: v.name.trim().replace(/\s+/g, ' '), phone: normalizePhone(v.phone), email: v.email.trim() || null },
          items: state.cart.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
          pickup_date: v.date,
          pickup_time: v.time,
          notes: v.notes.trim() || null,
        };
        const fingerprint = JSON.stringify(payload);
        if (idem.fingerprint !== fingerprint) idem = { fingerprint, key: newKey() };
        const order = await api.createOrder(payload, idem.key);
        // Only clear the bag after the server confirmed creation.
        rememberOrder(order.reference, payload.customer.phone, order);
        sessionStorage.setItem('4r.lastOrder', JSON.stringify(order));
        clearCart();
        idem = { fingerprint: null, key: null };
        navigate(`#/order/${order.reference}`);
      } catch (err) {
        const fieldErrors = {};
        for (const fe of err.fieldErrors || []) if (FIELD_MAP[fe.field]) fieldErrors[FIELD_MAP[fe.field]] = fe.message;
        if (Object.keys(fieldErrors).length) setErrors(fieldErrors);
        showAlert('error', err.isNetworkError ? 'Your request was not sent.' : 'We couldn’t submit your pre-order.', [
          err.message,
          ...(err.isNetworkError ? ['Your bag is still saved. Check your connection and submit again.'] : []),
        ]);
      } finally {
        submitting = false;
        if (btn.isConnected) {
          btn.disabled = false;
          btn.innerHTML = `${icon('clipboard')} Submit pre-order request`;
        }
      }
    });
    return undefined;
  },
};
