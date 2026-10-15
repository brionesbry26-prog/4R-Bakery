// End-to-end check of the customer website against a running backend.
//   cd backend && uvicorn main:app --port 8000      (serves the site at /)
//   NODE_PATH=$(npm root -g) node web/e2e/website.e2e.js
// Env: SITE_URL (default http://localhost:8000/), SCREENSHOT_DIR, VIEWPORT=desktop|mobile
const { chromium } = require('playwright');
const fs = require('fs');

const SITE = process.env.SITE_URL || 'http://localhost:8000/';
const out = process.env.SCREENSHOT_DIR || `${__dirname}/screenshots`;
const mobile = process.env.VIEWPORT === 'mobile';
fs.mkdirSync(out, { recursive: true });

const ok = (cond, msg) => {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
  console.log(`ok - ${msg}`);
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => d.accept());
  const tag = mobile ? 'm' : 'd';
  const shot = async (n, full = false) => {
    // Full-page captures stitch the viewport, which repeats sticky headers; pin it to the top while capturing.
    const style = full ? await page.addStyleTag({ content: '.site-header{position:absolute!important;left:0;right:0}' }) : null;
    await page.screenshot({ path: `${out}/${tag}-${n}.png`, fullPage: full });
    if (style) await style.evaluate((el) => el.remove());
  };
  const go = async (hash) => {
    await page.goto(SITE + hash, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(700);
  };

  // Menu: data comes from the API, search + filter + sort work locally
  await go('#/menu');
  await page.getByRole('heading', { name: 'Pandesal' }).waitFor();
  ok((await page.locator('.product-card').count()) === 8, 'menu shows all 8 products from the API');
  await page.locator('#menu-search').fill('pandesal');
  await page.waitForTimeout(400);
  ok((await page.locator('.product-card').count()) === 1, 'search narrows to pandesal');
  await page.locator('#menu-search').fill('');
  await page.getByRole('button', { name: /^Cakes/ }).click();
  ok((await page.locator('.product-card').count()) === 2, 'category filter shows 2 cakes');
  ok(await page.getByRole('button', { name: 'Special Occasion Cake is unavailable' }).isDisabled(), 'unavailable product cannot be added');
  await page.getByRole('button', { name: /^All products/ }).click();
  await page.locator('#sort').selectOption('-price');
  ok((await page.locator('.product-name').first().innerText()) === 'Special Occasion Cake', 'sort by price high→low');
  await page.locator('#sort').selectOption('featured');
  await shot('menu', true);

  // Product detail → add 5
  await page.getByRole('link', { name: 'Pandesal' }).click();
  await page.getByRole('button', { name: 'Add to bag' }).waitFor();
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Increase Pandesal quantity' }).click();
  ok((await page.locator('#line-total').innerText()) === '₱15.00', 'detail line total updates (5 × ₱3.00)');
  await page.getByRole('button', { name: 'Add to bag' }).click();
  await page.getByText('Added 5 × Pandesal to your bag').waitFor();
  await shot('product');

  // Bag drawer
  await page.getByRole('button', { name: 'View bag' }).click();
  await page.waitForTimeout(500);
  await page.locator('#drawer').getByRole('button', { name: 'Increase Pandesal quantity' }).click();
  ok((await page.locator('#cart-count').innerText()) === '6', 'bag badge shows 6');
  await shot('bag');
  await page.locator('#drawer').getByRole('link', { name: /Proceed to pre-order/ }).click();

  // Checkout validation then submit
  await page.getByRole('heading', { name: 'Complete your pre-order' }).waitFor();
  await page.getByRole('button', { name: /Submit pre-order request/ }).click();
  await page.getByText('Please check the highlighted fields.').waitFor();
  ok((await page.locator('.field.has-error').count()) >= 3, 'empty form shows field errors');
  await shot('checkout-errors', true);
  await page.locator('#f-name').fill('Juan Dela Cruz');
  await page.locator('#f-phone').fill('0917 123 4567');
  await page.locator('#f-time').fill('10:00');

  // Simulate a network failure: bag must be kept
  await page.route('**/api/bakery/orders', (r) => r.abort('internetdisconnected'));
  await page.getByRole('button', { name: /Submit pre-order request/ }).click();
  await page.getByText('Your request was not sent.').waitFor();
  ok((await page.locator('#cart-count').innerText()) === '6', 'failed submission keeps the bag');
  await shot('checkout-offline');
  await page.unroute('**/api/bakery/orders');

  await page.getByRole('button', { name: /Submit pre-order request/ }).click();
  await page.getByRole('heading', { name: 'Pre-order request sent!' }).waitFor({ timeout: 15000 });
  const ref = (await page.locator('.ref').first().innerText()).trim();
  ok(/^4R-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(ref), `real server reference shown (${ref})`);
  ok((await page.locator('.status').first().innerText()) === 'Pending', 'status is Pending');
  ok((await page.locator('.order-total').first().innerText()).includes('₱18.00'), 'server-computed total ₱18.00');
  ok((await page.locator('#cart-count').innerText()) === '0', 'bag cleared after confirmed order');
  await shot('confirmation', true);

  // Track page refreshes the saved order from the API
  await page.getByRole('link', { name: /View my orders/ }).click();
  await page.locator('.order-card .ref', { hasText: ref }).waitFor();
  ok(true, 'order appears on Track page');
  await shot('track', true);

  // Home + visit
  await go('#/');
  await page.evaluate(() => document.querySelectorAll('.reveal').forEach((e) => e.classList.add('is-visible')));
  await shot('home');
  await shot('home-full', true);
  await go('#/visit');
  await shot('visit');

  // API down → retry state, then recovery
  await page.route('**/api/**', (r) => r.abort('connectionrefused'));
  await go('#/menu');
  await page.reload({ waitUntil: 'domcontentloaded' }); // fresh visit while the API is down
  await page.getByText('We can’t reach the bakery right now').first().waitFor();
  ok(true, 'API outage shows a retry state');
  await shot('api-down');
  await page.unroute('**/api/**');
  await page.getByRole('button', { name: 'Try again' }).click();
  await page.getByRole('heading', { name: 'Pandesal' }).waitFor();
  ok(true, 'retry recovers when the API is back');

  ok(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);
  await browser.close();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
