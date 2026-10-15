// Product & section photography.
//
// The photos are AI-generated (Higgsfield, z_image model) as realistic
// stand-ins: they are NOT photographs of 4R Bakery's actual products or shop.
// Replace them with real photos when available (see web/images/README.md).
//
// Each photo is loaded from web/images/<file> first. If that file is missing,
// the remote copy is used; if that fails too, the drawn illustration is shown.
const CDN = 'https://d8j0ntlcm91z4.cloudfront.net/user_3JWZUW7cHzraRiGR6PZd87nOsLC/';

export const PHOTOS = {
  hero: { file: 'hero.webp', remote: `${CDN}hf_20261015_131739_75885d17-861b-431b-937d-ec532bf9a49b_min.webp`, alt: 'An assortment of freshly baked breads and pastries on a wooden board' },
  pandesal: { file: 'pandesal.webp', remote: `${CDN}hf_20261015_131617_07f56d70-a40d-49ad-a58f-cb68407bcbc2_min.webp`, alt: 'Pandesal rolls in a woven basket' },
  'spanish bread': { file: 'spanish-bread.webp', remote: `${CDN}hf_20261015_131757_3db5fc81-222f-4e96-b87c-1b642110c631_min.webp`, alt: 'Spanish bread rolls on parchment paper' },
  'cheese bread': { file: 'cheese-bread.webp', remote: `${CDN}hf_20261015_131716_c1914f0e-9acc-4a01-bf92-a2d4e26c24a6_min.webp`, alt: 'Soft cheese bread buns with a sugar-dusted top' },
  'loaf bread': { file: 'loaf-bread.webp', remote: `${CDN}hf_20261015_131716_18adc46a-e9b9-44bb-9a85-fc2664844531_min.webp`, alt: 'A sliced white sandwich loaf on a cutting board' },
  ensaymada: { file: 'ensaymada.webp', remote: `${CDN}hf_20261015_131716_cb58eb1e-b0c5-446e-9ec8-a3114372bda9_min.webp`, alt: 'Ensaymada topped with butter, sugar and grated cheese' },
  'cinnamon rolls': { file: 'cinnamon-rolls.webp', remote: `${CDN}hf_20261015_131836_a4994107-d059-4499-ac10-4542689cc692_min.webp`, alt: 'Glazed cinnamon rolls in a baking tray' },
  'birthday cake': { file: 'birthday-cake.webp', remote: `${CDN}hf_20261015_131716_1db0232d-d6fb-4d81-85a5-00588bade4f0_min.webp`, alt: 'A pink frosted birthday cake with a candle' },
  'special occasion cake': { file: 'special-occasion-cake.webp', remote: `${CDN}hf_20261015_131716_2d5016a7-cb16-4049-9d8a-a1217b623425_min.webp`, alt: 'A two-tier white celebration cake with flowers' },
  dough: { file: 'dough.webp', remote: `${CDN}hf_20261015_131940_c8341d04-a543-48cc-801e-c578a5b27c28_min.webp`, alt: 'Hands kneading bread dough on a floured table' },
};

export function photoFor(key) {
  return PHOTOS[String(key || '').toLowerCase()] || null;
}

/** <img> that falls back local → remote → illustration (handled in app.js). */
export function photoTag(key, { cls = '', eager = false, alt } = {}) {
  const p = photoFor(key);
  if (!p) return '';
  const a = (alt ?? p.alt).replace(/"/g, '&quot;');
  return `<img class="photo ${cls}" src="images/${p.file}" alt="${a}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" data-photo="${key}"${p.remote ? ` data-remote="${p.remote}"` : ''}>`;
}
