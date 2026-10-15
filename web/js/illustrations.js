import { photoTag } from './photos.js';

// Flat bakery illustrations (inline SVG) used when a product has no photo.
// Brand palette + a small set of bread tones reserved for artwork only.
const C = {
  crust: '#B8692F',
  golden: '#DE9A4E',
  bake: '#EDB872',
  light: '#F7D9A8',
  cream: '#FFF6EA',
  cheese: '#F5C842',
  plum: '#8E1EA2',
  orchid: '#C654C3',
  accent: '#ED96D7',
  frosting: '#FFC0DE',
  frostLight: '#FFE3F0',
  white: '#FFFFFF',
  shadow: '#2D0A34',
};

const svg = (label, body, vb = '0 0 240 180') =>
  `<svg viewBox="${vb}" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;

const shadow = (cx = 120, cy = 158, rx = 92) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="9" fill="${C.shadow}" opacity="0.07"/>`;

// Deterministic pseudo-random so crumbs don't change between renders.
function rng(seed) {
  let s = seed;
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
}

function crumbs(cx, cy, rx, ry, n, color, seed, size = 1.6) {
  const r = rng(seed);
  let out = '';
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r());
    out += `<circle cx="${(cx + Math.cos(a) * rx * d).toFixed(1)}" cy="${(cy + Math.sin(a) * ry * d).toFixed(1)}" r="${(size * (0.6 + r() * 0.7)).toFixed(1)}" fill="${color}"/>`;
  }
  return out;
}

function roll(cx, cy, r, seed) {
  return `<g>
    <ellipse cx="${cx}" cy="${cy + 4}" rx="${r}" ry="${r * 0.74}" fill="${C.crust}"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${r * 0.96}" ry="${r * 0.7}" fill="${C.golden}"/>
    <ellipse cx="${cx - r * 0.18}" cy="${cy - r * 0.22}" rx="${r * 0.55}" ry="${r * 0.3}" fill="${C.bake}" opacity="0.9"/>
    ${crumbs(cx, cy - r * 0.05, r * 0.8, r * 0.52, 22, C.light, seed)}
  </g>`;
}

const ART = {
  pandesal: () =>
    svg('Pandesal rolls', `${shadow()}${roll(78, 112, 46, 3)}${roll(162, 112, 46, 7)}${roll(120, 86, 50, 11)}`),

  'spanish bread': () => {
    const log = (y, rot, seed) => `<g transform="rotate(${rot} 120 ${y})">
      <rect x="38" y="${y - 22}" width="164" height="46" rx="23" fill="${C.crust}"/>
      <rect x="40" y="${y - 25}" width="160" height="42" rx="21" fill="${C.golden}"/>
      <rect x="54" y="${y - 21}" width="120" height="12" rx="6" fill="${C.bake}" opacity="0.85"/>
      ${crumbs(120, y - 6, 74, 14, 34, C.light, seed, 1.4)}
      <circle cx="190" cy="${y - 4}" r="17" fill="${C.bake}"/>
      <path d="M190 ${y - 4} m-10 0 a10 10 0 1 1 10 10 a6 6 0 1 1 -6 -6" fill="none" stroke="${C.crust}" stroke-width="3" stroke-linecap="round"/>
    </g>`;
    return svg('Spanish bread', `${shadow()}${log(122, -6, 5)}${log(78, 4, 9)}`);
  },

  'cheese bread': () => {
    const bun = (cx, cy, s, seed) => `<g>
      <ellipse cx="${cx}" cy="${cy + 18 * s}" rx="${48 * s}" ry="${16 * s}" fill="${C.crust}"/>
      <path d="M${cx - 48 * s} ${cy + 16 * s} C ${cx - 48 * s} ${cy - 40 * s}, ${cx + 48 * s} ${cy - 40 * s}, ${cx + 48 * s} ${cy + 16 * s} Z" fill="${C.golden}"/>
      <path d="M${cx - 40 * s} ${cy + 2 * s} C ${cx - 36 * s} ${cy - 30 * s}, ${cx + 36 * s} ${cy - 30 * s}, ${cx + 40 * s} ${cy + 2 * s} C ${cx + 20 * s} ${cy + 10 * s}, ${cx - 20 * s} ${cy + 10 * s}, ${cx - 40 * s} ${cy + 2 * s} Z" fill="${C.cream}"/>
      ${crumbs(cx, cy - 10 * s, 30 * s, 10 * s, 18, C.white, seed, 1.8)}
      <ellipse cx="${cx + 20 * s}" cy="${cy + 14 * s}" rx="${10 * s}" ry="${5 * s}" fill="${C.cheese}"/>
    </g>`;
    return svg('Cheese bread', `${shadow()}${bun(80, 112, 0.9, 2)}${bun(160, 112, 0.9, 4)}${bun(120, 82, 1.05, 6)}`);
  },

  'loaf bread': () =>
    svg(
      'Loaf bread',
      `${shadow(118)}
      <path d="M40 150 V86 C40 52 70 40 104 40 H150 C184 40 200 58 200 86 V150 Z" fill="${C.crust}"/>
      <path d="M46 150 V88 C46 58 72 48 104 48 H148 C178 48 192 62 192 88 V150 Z" fill="${C.golden}"/>
      <path d="M58 70 C70 56 92 54 110 56" stroke="${C.bake}" stroke-width="8" stroke-linecap="round" fill="none"/>
      ${[86, 116, 146].map((x) => `<path d="M${x} 58 L${x + 12} 74" stroke="${C.crust}" stroke-width="4" stroke-linecap="round"/>`).join('')}
      <g transform="translate(176 72) rotate(10)">
        <rect x="0" y="0" width="44" height="80" rx="16" fill="${C.crust}"/>
        <rect x="5" y="5" width="34" height="70" rx="12" fill="${C.cream}"/>
        ${crumbs(22, 40, 12, 28, 16, C.light, 8, 1.4)}
      </g>`
    ),

  ensaymada: () => {
    let ring = '';
    for (let i = 0; i < 5; i++) {
      const r = 58 - i * 11;
      ring += `<circle cx="120" cy="92" r="${r}" fill="${i % 2 ? C.bake : C.golden}"/>`;
    }
    const r = rng(12);
    let cheese = '';
    for (let i = 0; i < 30; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * 48;
      cheese += `<rect x="${(120 + Math.cos(a) * d).toFixed(1)}" y="${(88 + Math.sin(a) * d * 0.8).toFixed(1)}" width="9" height="3" rx="1.5" fill="${C.cheese}" transform="rotate(${Math.floor(r() * 180)} ${(120 + Math.cos(a) * d).toFixed(1)} ${(88 + Math.sin(a) * d * 0.8).toFixed(1)})"/>`;
    }
    return svg(
      'Ensaymada',
      `${shadow(120, 160, 80)}
      <ellipse cx="120" cy="100" rx="70" ry="56" fill="${C.crust}"/>
      <g transform="translate(0 4) scale(1 0.86) translate(0 8)">${ring}</g>
      <ellipse cx="120" cy="88" rx="56" ry="40" fill="${C.cream}" opacity="0.55"/>
      ${cheese}${crumbs(120, 86, 46, 32, 26, C.white, 3, 1.3)}`
    );
  },

  'cinnamon rolls': () => {
    const spiral = (cx, cy, turns, maxR) => {
      let d = '';
      for (let t = 0; t <= turns * Math.PI * 2; t += 0.2) {
        const rr = (t / (turns * Math.PI * 2)) * maxR;
        d += `${d ? 'L' : 'M'}${(cx + Math.cos(t) * rr).toFixed(1)} ${(cy + Math.sin(t) * rr * 0.82).toFixed(1)} `;
      }
      return d;
    };
    const bun = (cx, cy, s) => `<g>
      <ellipse cx="${cx}" cy="${cy + 8 * s}" rx="${50 * s}" ry="${38 * s}" fill="${C.crust}"/>
      <ellipse cx="${cx}" cy="${cy}" rx="${48 * s}" ry="${36 * s}" fill="${C.bake}"/>
      <path d="${spiral(cx, cy, 3, 44 * s)}" stroke="${C.crust}" stroke-width="${6 * s}" fill="none" stroke-linecap="round"/>
      <path d="M${cx - 34 * s} ${cy - 14 * s} C ${cx - 20 * s} ${cy - 30 * s}, ${cx + 24 * s} ${cy - 30 * s}, ${cx + 36 * s} ${cy - 10 * s} C ${cx + 30 * s} ${cy + 4 * s}, ${cx + 26 * s} ${cy + 18 * s}, ${cx + 22 * s} ${cy + 6 * s} C ${cx + 12 * s} ${cy - 6 * s}, ${cx - 4 * s} ${cy + 10 * s}, ${cx - 10 * s} ${cy - 2 * s} C ${cx - 18 * s} ${cy - 12 * s}, ${cx - 28 * s} ${cy + 6 * s}, ${cx - 34 * s} ${cy - 14 * s} Z" fill="${C.white}" opacity="0.92"/>
    </g>`;
    return svg('Cinnamon rolls', `${shadow()}${bun(84, 110, 0.82)}${bun(150, 92, 1)}`);
  },

  'birthday cake': () =>
    svg(
      'Birthday cake',
      `${shadow(120, 160, 86)}
      <ellipse cx="120" cy="150" rx="86" ry="12" fill="${C.white}" stroke="${C.accent}" stroke-width="2"/>
      <rect x="50" y="78" width="140" height="70" rx="12" fill="${C.frosting}"/>
      <rect x="50" y="108" width="140" height="10" fill="${C.accent}"/>
      <path d="M50 90 V82 Q50 72 62 72 H178 Q190 72 190 82 V90 Q182 102 174 90 Q166 104 156 90 Q148 102 138 90 Q130 106 120 90 Q110 102 102 90 Q94 104 84 90 Q76 100 68 90 Q60 104 50 90 Z" fill="${C.white}"/>
      ${[70, 96, 144, 170].map((x, i) => `<circle cx="${x}" cy="${130 + (i % 2) * 6}" r="3.5" fill="${i % 2 ? C.plum : C.orchid}"/>`).join('')}
      <rect x="114" y="38" width="12" height="36" rx="4" fill="${C.plum}"/>
      <rect x="114" y="46" width="12" height="5" fill="${C.accent}"/><rect x="114" y="58" width="12" height="5" fill="${C.accent}"/>
      <path d="M120 14 C 130 26, 128 36, 120 38 C 112 36, 110 26, 120 14 Z" fill="${C.cheese}"/>
      <path d="M120 24 C 124 30, 123 34, 120 35 C 117 34, 116 30, 120 24 Z" fill="${C.white}" opacity="0.8"/>`
    ),

  'special occasion cake': () => {
    const flower = (x, y, c) =>
      `<g>${[0, 72, 144, 216, 288].map((a) => `<circle cx="${(x + Math.cos((a * Math.PI) / 180) * 5).toFixed(1)}" cy="${(y + Math.sin((a * Math.PI) / 180) * 5).toFixed(1)}" r="4" fill="${c}"/>`).join('')}<circle cx="${x}" cy="${y}" r="3" fill="${C.cheese}"/></g>`;
    return svg(
      'Special occasion cake',
      `${shadow(120, 162, 80)}
      <ellipse cx="120" cy="154" rx="80" ry="10" fill="${C.white}" stroke="${C.accent}" stroke-width="2"/>
      <rect x="52" y="112" width="136" height="42" rx="8" fill="${C.white}" stroke="${C.frosting}" stroke-width="3"/>
      <rect x="70" y="76" width="100" height="38" rx="8" fill="${C.frostLight}" stroke="${C.frosting}" stroke-width="3"/>
      <rect x="88" y="44" width="64" height="34" rx="8" fill="${C.white}" stroke="${C.frosting}" stroke-width="3"/>
      <path d="M52 124 Q69 134 86 124 Q103 134 120 124 Q137 134 154 124 Q171 134 188 124" stroke="${C.accent}" stroke-width="3" fill="none"/>
      <path d="M70 88 Q87 98 104 88 Q120 98 136 88 Q153 98 170 88" stroke="${C.orchid}" stroke-width="3" fill="none"/>
      ${flower(64, 112, C.orchid)}${flower(176, 112, C.orchid)}${flower(84, 76, C.accent)}${flower(156, 76, C.accent)}${flower(120, 40, C.plum)}`
    );
  },

  croissant: () =>
    svg(
      'Croissant',
      `${shadow()}
      <path d="M38 128 C 30 96, 64 70, 92 66 L 104 116 Z" fill="${C.golden}"/>
      <path d="M202 128 C 210 96, 176 70, 148 66 L 136 116 Z" fill="${C.golden}"/>
      <path d="M86 62 C 96 40, 144 40, 154 62 L 140 120 L 100 120 Z" fill="${C.bake}"/>
      <path d="M100 64 C 108 52, 132 52, 140 64" stroke="${C.light}" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path d="M60 86 L 92 106 M48 108 L 90 116 M180 86 L 148 106 M192 108 L 150 116" stroke="${C.crust}" stroke-width="4" stroke-linecap="round"/>`
    ),
};

const CATEGORY_FALLBACK = { Breads: 'pandesal', Pastries: 'croissant', Cakes: 'birthday cake' };

export function productArt(product) {
  const key = String(product?.name || '').toLowerCase();
  const fn = ART[key] || ART[CATEGORY_FALLBACK[product?.category]] || ART.croissant;
  return fn();
}

export const art = (name) => (ART[name] || ART.croissant)();

/** Product photo if available (uploaded image_url → bundled photo → illustration). */
export function productVisual(product) {
  const url = product?.image_url;
  if (url && (/^https?:\/\//i.test(url) || url.startsWith('/'))) {
    const alt = String(product.name).replace(/"/g, '&quot;');
    return `<img class="photo" src="${url.replace(/"/g, '&quot;')}" alt="${alt}" loading="lazy" decoding="async" data-photo="${String(product.name).toLowerCase().replace(/"/g, '')}">`;
  }
  const key = String(product?.name || '').toLowerCase();
  return photoTag(key, { alt: product?.name }) || productArt(product);
}

/** Illustration used when a photo fails to load. */
export function fallbackArt(key) {
  return (ART[String(key || '').toLowerCase()] || ART.croissant)();
}
