import { esc } from '../format.js';
import { icon } from '../icons.js';
import { art } from '../illustrations.js';
import { state } from '../store.js';
import { errorState, productCard, skeletonGrid } from '../ui.js';

function featuredSection() {
  if (state.productsStatus === 'error' && !state.products.length) return errorState(state.productsError, { title: 'Couldn’t load the menu', retry: 'reload-products' });
  if (!state.products.length) return skeletonGrid(4);
  const featured = state.products.filter((p) => p.is_featured && p.is_available).slice(0, 4);
  const list = featured.length ? featured : state.products.slice(0, 4);
  return `<div class="grid grid--4">${list.map(productCard).join('')}</div>`;
}

export const home = {
  title: 'Freshly baked in Bachawan',
  render() {
    const info = state.info;
    return `
    <section class="hero">
      <div class="container hero-grid">
        <div class="hero-copy">
          <span class="eyebrow">Neighborhood bakery · San Agustin, Romblon</span>
          <h1 class="display" style="margin-top:20px">Freshly baked,<br><em>made with love.</em></h1>
          <p class="lead">Warm pandesal for breakfast, soft ensaymada for merienda, and celebration cakes for the moments that matter — baked in Brgy. Bachawan. Pre-order online and pick up fresh.</p>
          <div class="hero-cta">
            <a class="btn btn--lg" href="#/menu">Explore our menu ${icon('arrowRight')}</a>
            <a class="btn btn--lg btn--ghost" href="#/track">Track a pre-order</a>
          </div>
          <div class="hero-meta">
            <div><span class="icon-badge">${icon('wheat')}</span><span><strong>Baked fresh</strong>Local favorites daily</span></div>
            <div><span class="icon-badge">${icon('clipboard')}</span><span><strong>Pre-order online</strong>Reserve before you go</span></div>
            <div><span class="icon-badge">${icon('store')}</span><span><strong>Pickup in store</strong>Brgy. Bachawan</span></div>
          </div>
        </div>
        <div class="hero-visual" aria-hidden="true" data-parallax>
          <div class="hero-plate"></div>
          <div class="layer layer--b" data-depth="0.5"><div class="float float--slow">${art('spanish bread')}</div></div>
          <div class="layer layer--c" data-depth="0.6"><div class="float float--late">${art('birthday cake')}</div></div>
          <div class="layer layer--a" data-depth="1"><div class="float">${art('ensaymada')}</div></div>
          <div class="layer layer--d" data-depth="0.8"><div class="float float--late">${art('pandesal')}</div></div>
          <div class="layer layer--e" data-depth="0.7"><div class="float float--slow">${art('cinnamon rolls')}</div></div>
          <span class="sparkle" style="left:46%;top:4%">${icon('sparkle', { size: 22 })}</span>
          <span class="sparkle" style="right:10%;top:52%">${icon('sparkle', { size: 14 })}</span>
          <span class="sparkle" style="left:12%;top:52%">${icon('sparkle', { size: 16 })}</span>
          <div class="hero-tag"><span class="dot"></span> Pre-orders open</div>
        </div>
      </div>
    </section>

    <div class="strip" aria-hidden="true"><div class="strip-track">
      ${Array(2).fill(['Pandesal', 'Ensaymada', 'Spanish Bread', 'Cheese Bread', 'Cinnamon Rolls', 'Loaf Bread', 'Birthday Cakes', 'Special Occasion Cakes'].map((t) => `<span>${t}</span>`).join('')).join('')}
    </div></div>

    <section class="section">
      <div class="container">
        <div class="section-head reveal">
          <div><span class="eyebrow">Bestsellers</span><h2 class="h2">Our featured favorites</h2></div>
          <a class="link" href="#/menu">View full menu ${icon('arrowRight', { size: 18 })}</a>
        </div>
        <div id="featured" class="reveal">${featuredSection()}</div>
      </div>
    </section>

    <section class="section section--white">
      <div class="container">
        <div class="section-head reveal">
          <div><span class="eyebrow">How it works</span><h2 class="h2">Pre-order in three easy steps</h2></div>
        </div>
        <div class="steps">
          <div class="card step reveal"><span class="icon-badge">${icon('bag', { size: 24 })}</span><h3 class="h3">Fill your bag</h3><p>Browse breads, pastries and cakes, then add what you’d like to pick up.</p></div>
          <div class="card step reveal"><span class="icon-badge">${icon('calendar', { size: 24 })}</span><h3 class="h3">Choose a pickup time</h3><p>Tell us when you’re coming and add notes — like a cake greeting.</p></div>
          <div class="card step reveal"><span class="icon-badge">${icon('checkCircle', { size: 24 })}</span><h3 class="h3">We confirm & bake</h3><p>Your request stays <strong>pending</strong> until the bakery confirms it. Track it anytime.</p></div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container split">
        <div class="about-art reveal" aria-hidden="true">${art('special occasion cake')}</div>
        <div class="reveal">
          <span class="eyebrow">Our story</span>
          <h2 class="h2" style="margin-top:12px">A neighborhood bakery for everyday merienda and big celebrations.</h2>
          <p class="lead" style="margin-top:18px">${esc(info?.description || 'A neighborhood bakery in Bachawan serving freshly baked bread, pastries, and cakes.')}</p>
          <ul class="checklist">
            <li>${icon('check')}<span>Classic Filipino breads, baked in small batches</span></li>
            <li>${icon('check')}<span>Custom cakes for birthdays, christenings and fiestas</span></li>
            <li>${icon('check')}<span>Simple online pre-orders with in-store pickup</span></li>
          </ul>
          <a class="btn btn--soft" style="margin-top:32px" href="#/visit">Visit the bakery ${icon('arrowRight')}</a>
        </div>
      </div>
    </section>

    <section class="section--tight" style="padding-bottom:96px">
      <div class="container">
        <div class="cta-band reveal">
          <div>
            <h2 class="h2">Planning a celebration?</h2>
            <p>Pre-order a birthday or special occasion cake and add your design notes. The bakery will review your request and confirm the details with you.</p>
          </div>
          <div class="actions">
            <a class="btn btn--white btn--lg" href="#/menu?category=Cakes">Browse cakes</a>
            <a class="btn btn--ghost btn--lg" href="#/visit">Contact us</a>
          </div>
        </div>
      </div>
    </section>`;
  },
  update(root) {
    const el = root.querySelector('#featured');
    if (el) el.innerHTML = featuredSection();
  },
  mount(root) {
    // Mouse-driven depth parallax for the hero artwork (skipped for reduced motion / touch).
    const visual = root.querySelector('[data-parallax]');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!visual || reduce) return undefined;
    const layers = [...visual.querySelectorAll('[data-depth]')];
    let mx = 0;
    let my = 0;
    let frame = 0;
    // Layers drift at different rates on scroll (parallax) and follow the pointer by depth.
    const apply = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const sy = Math.min(window.scrollY, 900);
        for (const l of layers) {
          const d = Number(l.dataset.depth);
          l.style.transform = `translate3d(${(-mx * 26 * d).toFixed(1)}px, ${(-my * 26 * d + sy * 0.09 * d).toFixed(1)}px, 0)`;
        }
      });
    };
    const onMove = (e) => {
      const r = visual.getBoundingClientRect();
      mx = (e.clientX - (r.left + r.width / 2)) / r.width;
      my = (e.clientY - (r.top + r.height / 2)) / r.height;
      apply();
    };
    const onScroll = apply;
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  },
};
