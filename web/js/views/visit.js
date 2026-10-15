import { esc } from '../format.js';
import { icon } from '../icons.js';
import { state } from '../store.js';
import { toast } from '../ui.js';

const FALLBACK_ADDRESS = 'Brgy. Bachawan, San Agustin, Romblon, Philippines';
const safeUrl = (u) => (/^https?:\/\//i.test(u || '') ? u : null);

export const visit = {
  title: 'Visit us',
  render() {
    const info = state.info || {};
    const address = info.address || FALLBACK_ADDRESS;
    const mapUrl = safeUrl(info.map_url) || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`4R Bakery, ${address}`)}`;
    const embed = `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
    const phone = info.phone;
    const socials = [
      ['facebook', 'Facebook', safeUrl(info.social_links?.facebook)],
      ['instagram', 'Instagram', safeUrl(info.social_links?.instagram)],
    ].filter(([, , u]) => u);
    return `<header class="page-head"><div class="container">
      <nav class="crumbs" aria-label="Breadcrumb"><a href="#/">Home</a><span>/</span><span>Visit us</span></nav>
      <h1 class="h1">Visit 4R Bakery</h1>
      <p class="lead">${esc(info.description || 'A neighborhood bakery in Bachawan serving freshly baked bread, pastries, and cakes.')}</p>
    </div></header>
    <section class="section--tight" style="padding-bottom:96px"><div class="container split" style="align-items:start">
      <div class="info-grid">
        <div class="card info-card" style="grid-column:1/-1"><span class="icon-badge">${icon('pin')}</span><div>
          <h3>Address</h3><p>${esc(address)}</p>
          <div class="actions"><a class="btn btn--sm" href="${esc(mapUrl)}" target="_blank" rel="noopener">${icon('map', { size: 16 })} Get directions</a>
          <button class="btn btn--sm btn--ghost" data-action="copy-address" data-address="${esc(address)}">${icon('copy', { size: 16 })} Copy address</button></div></div></div>
        <div class="card info-card"><span class="icon-badge">${icon('clock')}</span><div>
          <h3>Opening hours</h3><p>${info.operating_hours ? esc(info.operating_hours) : 'Not yet published. Please contact the bakery to confirm opening hours.'}</p></div></div>
        <div class="card info-card"><span class="icon-badge">${icon('phone')}</span><div>
          <h3>Phone</h3><p>${phone ? esc(phone) : 'Contact number not yet published.'}</p>
          ${phone ? `<div class="actions"><a class="btn btn--sm btn--soft" href="tel:${esc(phone.replace(/[^\d+]/g, ''))}">Call the bakery</a></div>` : ''}</div></div>
        ${info.email ? `<div class="card info-card"><span class="icon-badge">${icon('mail')}</span><div><h3>Email</h3><p>${esc(info.email)}</p>
          <div class="actions"><a class="btn btn--sm btn--soft" href="mailto:${esc(info.email)}">Send an email</a></div></div></div>` : ''}
        ${socials.length ? `<div class="card info-card"><span class="icon-badge">${icon('heart')}</span><div><h3>Follow us</h3>
          <div class="actions">${socials.map(([ic, label, u]) => `<a class="btn btn--sm btn--soft" href="${esc(u)}" target="_blank" rel="noopener">${icon(ic, { size: 16 })} ${label}</a>`).join('')}</div></div></div>` : ''}
        <div class="alert alert--info" style="grid-column:1/-1">${icon('info')}<span>Pre-orders placed on this website are requests. The bakery reviews each one and updates its status on the <a class="link" href="#/track">Track order</a> page. No payment is collected online.</span></div>
      </div>
      <div class="map-frame"><iframe title="Map showing ${esc(address)}" src="${esc(embed)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>
    </div></section>`;
  },
  mount(root) {
    const onClick = async (e) => {
      const btn = e.target.closest('[data-action="copy-address"]');
      if (!btn) return;
      try {
        await navigator.clipboard.writeText(btn.dataset.address);
        toast('Address copied');
      } catch {
        toast('Couldn’t copy — please select the address text');
      }
    };
    root.addEventListener('click', onClick);
    return () => root.removeEventListener('click', onClick);
  },
};
