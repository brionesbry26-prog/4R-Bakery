import { api } from '../api.js';
import { esc, formatDate, formatDateTime, formatPeso, formatTime } from '../format.js';
import { icon } from '../icons.js';
import { forgetOrder, rememberOrder, state, updateOrderSnapshot } from '../store.js';
import { toast } from '../ui.js';
import { normalizePhone, validatePhone } from '../validation.js';

export function orderCard(order, { stale = false, actions = '' } = {}) {
  return `<article class="card order-card">
    <div class="order-top">
      <div><div class="muted small">Order reference</div><div class="ref">${esc(order.reference)}</div></div>
      <span class="status status--${esc(order.status)}">${esc(order.status_label)}</span>
    </div>
    <div class="order-meta">
      <span>${icon('calendar', { size: 16 })} Pickup ${esc(formatDate(order.pickup_date))}, ${esc(formatTime(order.pickup_time))}</span>
      <span>${icon('clock', { size: 16 })} Submitted ${esc(formatDateTime(order.created_at))}</span>
    </div>
    ${stale ? `<p class="small" style="color:var(--warning);margin-top:10px">Showing the last known status — couldn’t refresh.</p>` : ''}
    <div class="order-items">
      ${order.items.map((i) => `<div><span>${i.quantity} × ${esc(i.product_name)}</span><span>${formatPeso(i.line_subtotal)}</span></div>`).join('')}
      <div class="order-total" style="border:none"><span>Total</span><span>${formatPeso(order.total)}</span></div>
    </div>
    ${order.notes ? `<p class="muted small" style="margin-top:10px">Notes: ${esc(order.notes)}</p>` : ''}
    <div class="alert alert--info" style="margin-top:18px">${icon('info')}<span>${esc(order.message)}</span></div>
    ${actions}
  </article>`;
}

// ---------- Confirmation ----------
export const confirmation = {
  title: 'Pre-order received',
  render(params) {
    let order = null;
    try {
      order = JSON.parse(sessionStorage.getItem('4r.lastOrder') || 'null');
    } catch {
      order = null;
    }
    if (!order || order.reference !== params.ref) {
      order = state.orders.find((o) => o.reference === params.ref)?.snapshot || null;
    }
    if (!order) {
      return `<div class="container" style="padding:96px 24px"><div class="state"><div class="icon-badge">${icon('receipt', { size: 30 })}</div>
        <h1 class="h3">Look up your order</h1><p>Enter your reference and mobile number on the tracking page to see this order.</p>
        <a class="btn" href="#/track">Track an order</a></div></div>`;
    }
    return `<section class="section"><div class="container" style="max-width:760px">
      <div class="confirm-hero">
        <div class="icon-badge">${icon('clipboard', { size: 38 })}</div>
        <h1 class="h1">Pre-order request sent!</h1>
        <p class="lead" style="margin:16px auto 0">4R Bakery received your request. It is <strong style="color:var(--warning)">pending confirmation</strong> — not yet confirmed or paid. Keep your reference number to check its status.</p>
      </div>
      ${orderCard(order)}
      <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-top:28px">
        <button class="btn btn--soft" data-action="copy-ref" data-ref="${esc(order.reference)}">${icon('copy')} Copy reference</button>
        <a class="btn" href="#/track">${icon('receipt')} View my orders</a>
        <a class="btn btn--ghost" href="#/menu">Continue browsing</a>
      </div>
    </div></section>`;
  },
  mount(root) {
    const onClick = async (e) => {
      const btn = e.target.closest('[data-action="copy-ref"]');
      if (!btn) return;
      try {
        await navigator.clipboard.writeText(btn.dataset.ref);
        toast('Reference copied');
      } catch {
        toast(`Your reference: ${btn.dataset.ref}`);
      }
    };
    root.addEventListener('click', onClick);
    return () => root.removeEventListener('click', onClick);
  },
};

// ---------- Track ----------
const remote = {}; // reference -> { order, error }

function savedList() {
  if (!state.orders.length) {
    return `<div class="card state"><div class="icon-badge">${icon('clipboard', { size: 30 })}</div><h3 class="h3">No orders on this device yet</h3>
      <p>When you submit a pre-order it appears here so you can follow its status.</p><a class="btn" href="#/menu">Start an order</a></div>`;
  }
  return state.orders
    .map((entry) => {
      const r = remote[entry.reference];
      const order = r?.order || entry.snapshot;
      const actions = `<div style="display:flex;justify-content:flex-end;margin-top:14px"><button class="remove-btn" data-action="forget" data-ref="${esc(entry.reference)}">Hide from this device</button></div>`;
      if (!order) return `<article class="card order-card"><div class="ref">${esc(entry.reference)}</div><p class="muted">${r?.error ? esc(r.error.message) : 'Loading status…'}</p>${actions}</article>`;
      return orderCard(order, { stale: !!r?.error, actions });
    })
    .join('<div style="height:20px"></div>');
}

async function refreshAll(root) {
  await Promise.all(
    state.orders.map(async (entry) => {
      try {
        const order = await api.getOrder(entry.reference, entry.phone);
        remote[entry.reference] = { order, error: null };
        updateOrderSnapshot(entry.reference, order);
      } catch (error) {
        remote[entry.reference] = { order: null, error };
      }
    })
  );
  const el = root.querySelector('#saved-orders');
  if (el) el.innerHTML = savedList();
}

export const track = {
  title: 'Track your order',
  render() {
    return `<header class="page-head"><div class="container">
      <nav class="crumbs" aria-label="Breadcrumb"><a href="#/">Home</a><span>/</span><span>Track order</span></nav>
      <h1 class="h1">Track your pre-order</h1>
      <p class="lead">See the latest status of your requests — from pending to ready for pickup.</p>
    </div></header>
    <div class="container track-layout">
      <section aria-label="Your orders">
        <div class="toolbar"><h2 class="h3">Orders from this device</h2>
          <button class="btn btn--soft btn--sm" data-action="refresh-orders">${icon('refresh', { size: 16 })} Refresh</button></div>
        <div id="saved-orders">${savedList()}</div>
      </section>
      <aside class="card form-card" style="position:sticky;top:calc(var(--header-h) + 24px)">
        <h2 class="h3">Find an order</h2>
        <p class="sub">Use the reference from your confirmation and the mobile number you ordered with.</p>
        <form id="lookup" novalidate style="display:grid;gap:16px">
          <div class="field" data-field="ref"><label for="l-ref">Order reference</label>
            <input id="l-ref" class="input" placeholder="4R-ABCD-EFGH" autocapitalize="characters" maxlength="32"><span class="field-error"></span></div>
          <div class="field" data-field="phone"><label for="l-phone">Mobile number</label>
            <input id="l-phone" class="input" type="tel" placeholder="0917 123 4567" maxlength="20"><span class="field-error"></span></div>
          <div id="lookup-msg" aria-live="polite"></div>
          <button class="btn btn--block" type="submit">${icon('search')} Find order</button>
        </form>
      </aside>
    </div>`;
  },
  update(root) {
    const el = root.querySelector('#saved-orders');
    if (el) el.innerHTML = savedList();
  },
  mount(root) {
    refreshAll(root);
    const form = root.querySelector('#lookup');
    const setErr = (key, msg) => {
      const f = form.querySelector(`[data-field="${key}"]`);
      f.classList.toggle('has-error', !!msg);
      f.querySelector('.field-error').textContent = msg || '';
    };
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const ref = form.querySelector('#l-ref').value.trim().toUpperCase();
      const phoneRaw = form.querySelector('#l-phone').value;
      const refErr = /^[A-Z0-9-]{6,32}$/.test(ref) ? null : 'Enter the reference, e.g. 4R-ABCD-EFGH.';
      const phoneErr = validatePhone(phoneRaw);
      setErr('ref', refErr);
      setErr('phone', phoneErr);
      if (refErr || phoneErr) return;
      const msg = root.querySelector('#lookup-msg');
      const btn = form.querySelector('button');
      btn.disabled = true;
      try {
        const phone = normalizePhone(phoneRaw);
        const order = await api.getOrder(ref, phone);
        remote[order.reference] = { order, error: null };
        rememberOrder(order.reference, phone, order);
        form.reset();
        msg.innerHTML = `<div class="alert alert--success">${icon('checkCircle')}<span>Found order ${esc(order.reference)}.</span></div>`;
      } catch (err) {
        msg.innerHTML = `<div class="alert alert--error">${icon('alert')}<span>${esc(err.status === 404 ? 'No order matches that reference and mobile number.' : err.message)}</span></div>`;
      } finally {
        btn.disabled = false;
      }
    });
    const onClick = (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      if (btn.dataset.action === 'refresh-orders') refreshAll(root).then(() => toast('Order status refreshed'));
      if (btn.dataset.action === 'forget' && window.confirm(`Hide ${btn.dataset.ref} from this device? The order itself is not cancelled.`)) forgetOrder(btn.dataset.ref);
    };
    root.addEventListener('click', onClick);
    return () => root.removeEventListener('click', onClick);
  },
};
