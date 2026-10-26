import { api } from '../api.js';
import { esc, formatDate, formatDateTime, formatPeso, formatTime } from '../format.js';
import { icon } from '../icons.js';
import { state, updateOrderSnapshot } from '../store.js';
import { toast } from '../ui.js';

/**
 * Order status screen: a single pre-order with its progress, pickup details and
 * contents. Status comes from the order the browser already saved (or from the
 * last confirmation), then is refreshed against the API when possible.
 */
const FLOW = [
  { key: 'pending', label: 'Request sent', hint: 'We received your pre-order request.' },
  { key: 'accepted', label: 'Confirmed', hint: 'The bakery accepted your pre-order.' },
  { key: 'preparing', label: 'Preparing', hint: 'Your order is being baked and packed.' },
  { key: 'ready_for_pickup', label: 'Ready for pickup', hint: 'Come by the bakery to collect it.' },
  { key: 'completed', label: 'Picked up', hint: 'This order is complete. Salamat!' },
];
const CLOSED_HINT = {
  rejected: 'The bakery could not accept this pre-order. Please contact the bakery if you have questions.',
  cancelled: 'This order was cancelled. You can place a new pre-order anytime.',
};

const findEntry = (reference) => state.orders.find((o) => o.reference === reference) || null;

function fromConfirmation(reference) {
  try {
    const order = JSON.parse(sessionStorage.getItem('4r.lastOrder') || 'null');
    return order?.reference === reference ? order : null;
  } catch {
    return null;
  }
}

function timeline(order) {
  if (CLOSED_HINT[order.status]) return ''; // the closed-order message already explains it
  const index = Math.max(
    0,
    FLOW.findIndex((s) => s.key === order.status)
  );
  const current = (i) => i === index && order.status !== 'completed';
  const when = (i) => (i === 0 ? formatDateTime(order.created_at) : current(i) ? formatDateTime(order.updated_at) : '');
  return `<div class="status-progress" role="group" aria-label="Order progress">
      <span>Step ${index + 1} of ${FLOW.length}</span>
      <span class="status-bar"><span style="width:${Math.round(((index + 1) / FLOW.length) * 100)}%"></span></span>
    </div>
    <ol class="timeline">
      ${FLOW.map((step, i) => {
        const cls = i < index || order.status === 'completed' ? 'is-done' : current(i) ? 'is-current' : 'is-upcoming';
        return `<li class="timeline-step ${cls}" ${current(i) ? 'aria-current="step"' : ''}>
          <span class="timeline-dot">${i < index || order.status === 'completed' ? icon('check', { size: 16 }) : `<span class="timeline-num">${i + 1}</span>`}</span>
          <div><strong>${esc(step.label)}</strong><p>${esc(step.hint)}</p></div>
          <span class="timeline-when">${esc(when(i))}</span>
        </li>`;
      }).join('')}
    </ol>`;
}

function itemsCard(order) {
  return `<section class="card status-card" style="margin-top:20px">
    <h2 class="h3">What’s in this order</h2>
    <div class="order-items">
      ${order.items
        .map((i) => `<div><span>${i.quantity} × ${esc(i.product_name)}</span><span>${formatPeso(i.line_subtotal)}</span></div>`)
        .join('')}
      <div class="order-total" style="border:none"><span>Total</span><span>${formatPeso(order.total)}</span></div>
    </div>
    ${order.notes ? `<p class="muted small" style="margin-top:10px">Notes: ${esc(order.notes)}</p>` : ''}
  </section>`;
}

function detail(order, { stale = false } = {}) {
  const info = state.info || {};
  const phone = info.phone;
  return `<div class="status-layout">
    <div>
      <section class="card status-card">
        <div class="status-head">
          <div>
            <div class="muted small">Order reference</div>
            <div class="ref">${esc(order.reference)}</div>
          </div>
          <span class="status status--${esc(order.status)}">${esc(order.status_label)}</span>
        </div>
        <p class="status-lead">${esc(CLOSED_HINT[order.status] || order.message)}</p>
        ${stale ? `<div class="alert alert--warning" style="margin-top:16px">${icon('info')}<span>Showing the last known status — we couldn’t reach the bakery just now.</span></div>` : ''}
        ${timeline(order)}
        <div class="status-actions">
          <button class="btn btn--soft" data-action="refresh-status">${icon('refresh')} Refresh status</button>
          <button class="btn btn--ghost" data-action="copy-status-ref" data-ref="${esc(order.reference)}">${icon('copy')} Copy reference</button>
        </div>
      </section>
      ${itemsCard(order)}
    </div>
    <aside class="status-side">
      <div class="card status-side-card">
        <h2 class="h3">Pickup details</h2>
        <dl class="detail-list">
          <div><dt>${icon('calendar', { size: 16 })} Date</dt><dd>${esc(formatDate(order.pickup_date))}</dd></div>
          <div><dt>${icon('clock', { size: 16 })} Time</dt><dd>${esc(formatTime(order.pickup_time))}</dd></div>
          <div><dt>${icon('user', { size: 16 })} Name</dt><dd>${esc(order.customer_name)}</dd></div>
          <div><dt>${icon('phone', { size: 16 })} Contact</dt><dd>${esc(order.customer_phone_masked)}</dd></div>
          <div><dt>${icon('clipboard', { size: 16 })} Submitted</dt><dd>${esc(formatDateTime(order.created_at))}</dd></div>
        </dl>
        <div class="alert alert--info" style="margin-top:18px">${icon('info')}<span>Pre-orders are requests pending bakery confirmation. No payment is collected online.</span></div>
      </div>
      <div class="card status-side-card">
        <h2 class="h3">Need a hand?</h2>
        <p class="muted small" style="margin-top:6px">${esc(info.address || 'Brgy. Bachawan, San Agustin, Romblon')}</p>
        ${phone ? `<a class="btn btn--soft btn--block" style="margin-top:14px" href="tel:${esc(phone.replace(/[^\d+]/g, ''))}">${icon('phone', { size: 16 })} Call the bakery</a>` : ''}
        <a class="btn btn--ghost btn--block" style="margin-top:10px" href="#/visit">Visit & contact</a>
      </div>
    </aside>
  </div>`;
}

function missing(reference) {
  return `<div class="card state">
    <div class="icon-badge">${icon('receipt', { size: 30 })}</div>
    <h2 class="h3">We can’t show ${esc(reference)} yet</h2>
    <p>Status tracking works for pre-orders saved on this device. Look the order up with its reference and mobile number to add it here.</p>
    <a class="btn" href="#/track">${icon('search')} Find this order</a>
  </div>`;
}

async function refresh(root, reference, { quiet = false } = {}) {
  const entry = findEntry(reference);
  const panel = root.querySelector('#status-view');
  if (!panel) return;
  if (!entry?.phone) {
    if (!quiet) toast('Look this order up from Track order to refresh it');
    return;
  }
  const btn = panel.querySelector('[data-action="refresh-status"]');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner" aria-hidden="true"></span> Refreshing…`;
  }
  try {
    const order = await api.getOrder(reference, entry.phone);
    updateOrderSnapshot(reference, order);
    panel.innerHTML = detail(order);
    if (!quiet) toast('Order status updated');
  } catch (err) {
    const fallback = entry.snapshot || fromConfirmation(reference);
    panel.innerHTML = fallback ? detail(fallback, { stale: true }) : `<div class="card state"><div class="icon-badge">${icon('offline', { size: 30 })}</div><h2 class="h3">Couldn’t load this order</h2><p>${esc(err.message)}</p><button class="btn" data-action="refresh-status">${icon('refresh')} Try again</button></div>`;
  }
}

export const orderStatus = {
  title: 'Order status',
  render(params) {
    const reference = String(params.ref || '').toUpperCase();
    const entry = findEntry(reference);
    const order = entry?.snapshot || fromConfirmation(reference);
    return `<header class="page-head"><div class="container">
      <nav class="crumbs" aria-label="Breadcrumb"><a href="#/">Home</a><span>/</span><a href="#/track">Track order</a><span>/</span><span>Status</span></nav>
      <h1 class="h1">Order status</h1>
      <p class="lead">Follow your pre-order from request to pickup, and keep the details handy.</p>
    </div></header>
    <div class="container" id="status-view">${order ? detail(order) : missing(reference)}</div>`;
  },
  mount(root, params) {
    const reference = String(params.ref || '').toUpperCase();
    const onClick = async (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      if (btn.dataset.action === 'copy-status-ref') {
        try {
          await navigator.clipboard.writeText(btn.dataset.ref);
          toast('Reference copied');
        } catch {
          toast(`Your reference: ${btn.dataset.ref}`);
        }
      }
      if (btn.dataset.action === 'refresh-status') refresh(root, reference);
    };
    root.addEventListener('click', onClick);
    if (findEntry(reference)?.phone) refresh(root, reference, { quiet: true });
    return () => root.removeEventListener('click', onClick);
  },
};
