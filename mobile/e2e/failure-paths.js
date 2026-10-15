// Browser E2E against the web build. See README "Testing" for setup.
// Requires: backend on :8000, web export served on :8081, Playwright installed.
const { chromium } = require('playwright');
const out = process.env.SCREENSHOT_DIR || __dirname + '/screenshots';
const APP_URL = process.env.APP_URL || 'http://localhost:8081/';
(async () => {
  require('fs').mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2 });
  const logs = [];
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && logs.push(`[console.error] ${m.text()}`));
  page.on('dialog', (d) => d.accept());
  const shot = (n) => page.screenshot({ path: `${out}/${n}.png` });
  const assert = (c, msg) => { if (!c) throw new Error('ASSERT ' + msg); console.log('ok -', msg); };

  await page.goto(APP_URL, { waitUntil: 'networkidle' });
  await page.getByText('Featured Favorites').waitFor();
  await page.waitForTimeout(1200);
  await shot('20-home-small');
  await page.mouse.move(180, 400);
  await page.mouse.wheel(0, 500); await page.waitForTimeout(700); await shot('21-home-parallax');
  await page.mouse.wheel(0, 3000); await page.waitForTimeout(700); await shot('22-home-bottom');

  // Unavailable product cannot be added
  await page.getByRole('tab', { name: /Menu/ }).click();
  await page.getByLabel('Search products').fill('special');
  await page.waitForTimeout(400);
  const unavailableBtn = page.getByRole('button', { name: 'Special Occasion Cake is unavailable' });
  assert(await unavailableBtn.isDisabled(), 'unavailable product add button disabled');
  await shot('23-unavailable');
  await page.getByLabel('Clear search').click();

  // Sort by price high->low
  await page.getByLabel(/^Sort:/).click();
  await page.getByRole('radio', { name: 'Price: High to Low' }).click();
  await page.waitForTimeout(300);
  const first = await page.getByRole('button', { name: /, ₱/ }).first().getAttribute('aria-label');
  assert(first.startsWith('Special Occasion Cake'), `sorted high->low first is ${first}`);
  await page.getByRole('button', { name: 'Cakes, 2 items' }).click();
  await page.waitForTimeout(300);
  assert((await page.getByText('2 items', { exact: false }).count()) > 0, 'category filter shows 2 items');
  await shot('24-filter-sort');

  // Add Birthday cake, go to checkout, simulate network failure on submit
  await page.getByRole('button', { name: 'Add Birthday Cake to bag' }).click();
  await page.getByRole('tab', { name: /Bag/ }).click();
  await page.getByRole('button', { name: 'Proceed to pre-order' }).click();
  await page.getByLabel('Full name').fill('Maria Clara');
  await page.getByLabel('Contact number').fill('09181234567');
  await page.getByLabel('Pickup time').fill('09:30');
  await page.route('**/api/bakery/orders', (r) => r.abort('internetdisconnected'));
  await page.getByTestId('submit-order').click();
  await page.getByText('Your request was not sent.').waitFor();
  await shot('25-submit-network-error');
  await page.unroute('**/api/bakery/orders');
  await page.getByRole('button', { name: 'Edit bag' }).click();
  await page.waitForTimeout(500);
  assert((await page.getByText('Birthday Cake').locator('visible=true').count()) > 0, 'bag kept after failed submission');

  // Retry succeeds
  await page.getByRole('button', { name: 'Proceed to pre-order' }).click();
  await page.getByLabel('Full name').locator('visible=true').fill('Maria Clara');
  await page.getByLabel('Contact number').locator('visible=true').fill('09181234567');
  await page.getByLabel('Pickup time').locator('visible=true').fill('09:30');
  await page.getByTestId('submit-order').locator('visible=true').click();
  await page.getByText('Request sent!').waitFor({ timeout: 15000 });
  const ref = (await page.locator('text=/4R-[A-Z0-9]{4}-[A-Z0-9]{4}/').first().innerText()).trim();
  console.log('REFERENCE2', ref);
  assert((await page.getByText('₱650.00').count()) > 0, 'server total 650.00 shown');

  // Whole API down -> menu error state with retry
  await page.route('**/api/**', (r) => r.abort('connectionrefused'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('tab', { name: /Menu/ }).click();
  await page.getByText('Can’t reach the bakery').locator('visible=true').first().waitFor();
  await shot('26-api-down');
  await page.unroute('**/api/**');
  await page.getByRole('button', { name: 'Try again' }).locator('visible=true').first().click();
  await page.getByRole('heading', { name: 'Our Menu' }).waitFor();
  await page.getByText('Pandesal').locator('visible=true').first().waitFor();
  console.log('ok - retry recovers after API comes back');
  console.log(logs.join('\n') || 'no page errors');
  await browser.close();
})().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
