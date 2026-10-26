import { esc } from '../format.js';
import { icon } from '../icons.js';
import { photoTag } from '../photos.js';
import { navigate } from '../router.js';
import { signIn, signOut, state } from '../store.js';
import { toast } from '../ui.js';
import { validateEmail, validateName } from '../validation.js';

/**
 * Sign in / account screen. UI prototype only: the form is validated in the
 * browser and the email is remembered on this device — nothing is sent to the
 * server and no account is created.
 */
const PASSWORD_MIN = 6;

const aside = () => `<aside class="auth-aside" aria-hidden="true">
  ${photoTag('hero')}
  <div class="copy">
    <span class="eyebrow">4R Bakery account</span>
    <h2 class="h2">Every pre-order,<br>one warm welcome.</h2>
    <ul class="checklist checklist--light">
      <li>${icon('check')}<span>See the live status of each pre-order</span></li>
      <li>${icon('check')}<span>Keep your pickup details in one place</span></li>
      <li>${icon('check')}<span>Reorder your favorites in a few taps</span></li>
    </ul>
  </div>
</aside>`;

function recentOrders() {
  if (!state.orders.length) {
    return `<p class="muted small">No pre-orders saved on this device yet. Your first order will show up here.</p>`;
  }
  return `<ul class="account-orders">${state.orders
    .slice(0, 3)
    .map((entry) => {
      const order = entry.snapshot;
      const badge = order ? `<span class="status status--${esc(order.status)}">${esc(order.status_label)}</span>` : '<span class="muted small">Tap to view</span>';
      return `<li><a href="#/status/${encodeURIComponent(entry.reference)}"><span class="ref-sm">${esc(entry.reference)}</span>${badge}</a></li>`;
    })
    .join('')}</ul>`;
}

function signedInCard(session) {
  const initial = (session.name || session.email || '?').trim().charAt(0).toUpperCase();
  const since = new Date(session.signedInAt);
  const sinceText = Number.isNaN(since.getTime()) ? '' : since.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  return `<div class="card auth-card">
    <div class="account-hero">
      <span class="account-avatar account-avatar--lg">${esc(initial)}</span>
      <div>
        <span class="status status--accepted">Signed in</span>
        <h2 class="h3" style="margin-top:8px">${esc(session.name)}</h2>
        <p class="muted small">${esc(session.email)}</p>
      </div>
    </div>
    <div class="account-meta">
      <span>${icon('clock', { size: 16 })} Signed in on this device${sinceText ? ` since ${esc(sinceText)}` : ''}</span>
    </div>
    <h3 class="h3" style="margin-top:28px">Recent pre-orders</h3>
    ${recentOrders()}
    <div class="account-actions">
      <a class="btn btn--block" href="#/track">${icon('receipt')} View my orders</a>
      <button class="btn btn--ghost btn--block" data-action="sign-out">${icon('logOut')} Sign out</button>
    </div>
    <p class="muted small" style="margin-top:18px">This is a prototype account: it lives in this browser only and is never sent to the bakery.</p>
  </div>`;
}

function signedOutCard() {
  return `<div class="card auth-card" id="auth-card" data-mode="signin">
    <div class="auth-tabs" role="tablist" aria-label="Account">
      <button class="auth-tab" role="tab" aria-selected="true" aria-controls="auth-form" data-mode="signin">Sign in</button>
      <button class="auth-tab" role="tab" aria-selected="false" aria-controls="auth-form" data-mode="signup">Create account</button>
    </div>
    <h2 class="h3" id="auth-heading">Welcome back</h2>
    <p class="muted small" id="auth-sub">Sign in with your email to keep your pre-orders in one place.</p>
    <form id="auth-form" class="auth-form" novalidate>
      <div class="field" data-field="name" hidden>
        <label for="auth-name">Full name</label>
        <input id="auth-name" class="input" type="text" autocomplete="name" placeholder="Ana Cruz" maxlength="120" />
        <span class="field-error" aria-live="polite"></span>
      </div>
      <div class="field" data-field="email">
        <label for="auth-email">Email address</label>
        <input id="auth-email" class="input" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" maxlength="254" />
        <span class="field-error" aria-live="polite"></span>
      </div>
      <div class="field" data-field="password">
        <label for="auth-password">Password</label>
        <div class="input-wrap">
          <input id="auth-password" class="input" type="password" autocomplete="current-password" placeholder="At least ${PASSWORD_MIN} characters" maxlength="72" />
          <button class="reveal-btn" type="button" data-action="toggle-password" aria-label="Show password" aria-pressed="false">${icon('eye')}</button>
        </div>
        <span class="field-error" aria-live="polite"></span>
      </div>
      <button class="btn btn--lg btn--block" type="submit" id="auth-submit">Sign in</button>
    </form>
    <div class="alert alert--info" style="margin-top:20px">${icon('info')}<span>This is the sign-in screen for the prototype. Details stay in this browser; no account is created and nothing is sent to the bakery.</span></div>
    <p class="muted small" style="margin-top:18px">Just tracking an order? <a class="link" href="#/track">Look it up with your reference</a>.</p>
  </div>`;
}

export const account = {
  title: 'Sign in',
  render() {
    const session = state.session;
    const firstName = session ? String(session.name || session.email || 'there').trim().split(' ')[0] : '';
    return `<header class="page-head"><div class="container">
      <nav class="crumbs" aria-label="Breadcrumb"><a href="#/">Home</a><span>/</span><span>${session ? 'Your account' : 'Sign in'}</span></nav>
      <h1 class="h1">${session ? `Hello, ${esc(firstName)}` : 'Sign in to 4R Bakery'}</h1>
      <p class="lead">${session ? 'Your details and pre-orders, saved on this device.' : 'Pre-order faster, keep your pickup details handy and follow every status update.'}</p>
    </div></header>
    <div class="container auth-layout">
      ${aside()}
      <div id="auth-panel">${session ? signedInCard(session) : signedOutCard()}</div>
    </div>`;
  },
  mount(root) {
    const setMode = (mode) => {
      const card = root.querySelector('#auth-card');
      if (!card || card.dataset.mode === mode) return;
      card.dataset.mode = mode;
      root.querySelectorAll('.auth-tab').forEach((tab) => tab.setAttribute('aria-selected', String(tab.dataset.mode === mode)));
      root.querySelector('[data-field="name"]').hidden = mode !== 'signup';
      root.querySelector('#auth-heading').textContent = mode === 'signup' ? 'Create your account' : 'Welcome back';
      root.querySelector('#auth-sub').textContent =
        mode === 'signup' ? 'One email, one password — that’s all this prototype needs.' : 'Sign in with your email to keep your pre-orders in one place.';
      root.querySelector('#auth-submit').textContent = mode === 'signup' ? 'Create account' : 'Sign in';
      root.querySelector('#auth-password').setAttribute('autocomplete', mode === 'signup' ? 'new-password' : 'current-password');
      root.querySelectorAll('.field.has-error').forEach((f) => {
        f.classList.remove('has-error');
        f.querySelector('.field-error').textContent = '';
      });
    };

    const onClick = (e) => {
      const el = e.target.closest('[data-action], [data-mode]');
      if (!el) return;
      if (el.dataset.mode) return setMode(el.dataset.mode);
      if (el.dataset.action === 'toggle-password') {
        const input = root.querySelector('#auth-password');
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        el.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
        el.setAttribute('aria-pressed', String(show));
        el.innerHTML = icon(show ? 'eyeOff' : 'eye');
        input.focus();
      }
      if (el.dataset.action === 'sign-out') {
        signOut();
        toast('Signed out of this device');
        navigate('#/login');
      }
    };

    const onSubmit = (e) => {
      if (e.target.id !== 'auth-form') return;
      e.preventDefault();
      const card = root.querySelector('#auth-card');
      const signup = card.dataset.mode === 'signup';
      const name = root.querySelector('#auth-name').value;
      const email = root.querySelector('#auth-email').value;
      const password = root.querySelector('#auth-password').value;

      const errors = {
        name: signup ? validateName(name) : null,
        email: validateEmail(email) || (String(email).trim() ? null : 'Enter the email address for your account.'),
        password: password.length >= PASSWORD_MIN ? null : `Use at least ${PASSWORD_MIN} characters.`,
      };
      for (const [key, message] of Object.entries(errors)) {
        const field = root.querySelector(`[data-field="${key}"]`);
        if (!field) continue;
        field.classList.toggle('has-error', !!message);
        field.querySelector('.field-error').textContent = message || '';
      }
      const firstBad = root.querySelector('.field.has-error .input');
      if (firstBad) return firstBad.focus();

      const btn = root.querySelector('#auth-submit');
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner" aria-hidden="true"></span> ${signup ? 'Creating account…' : 'Signing in…'}`;
      // Prototype only: pretend to talk to a server, then keep the session locally.
      setTimeout(() => {
        const session = signIn(email, { name: signup ? name : undefined });
        navigate('#/login');
        toast(signup ? `Account created for ${session.email}` : `Welcome back, ${session.name.split(' ')[0]}`);
      }, 600);
    };

    root.addEventListener('click', onClick);
    root.addEventListener('submit', onSubmit);
    return () => {
      root.removeEventListener('click', onClick);
      root.removeEventListener('submit', onSubmit);
    };
  },
};
