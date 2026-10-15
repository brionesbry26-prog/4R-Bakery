// Browser E2E against the web build. See README "Testing" for setup.
// Requires: backend on :8000, web export served on :8081, Playwright installed.
const { chromium } = require('playwright');
const out = process.env.SCREENSHOT_DIR || __dirname + '/screenshots';
const APP_URL = process.env.APP_URL || 'http://localhost:8081/';
(async () => {
  require('fs').mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const logs = [];
  page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  page.on('dialog', (d) => { logs.push(`[dialog] ${d.message().replace(/\n/g,' | ')}`); d.accept(); });
  const shot = (n) => page.screenshot({ path: `${out}/${n}.png` });

  await page.goto(APP_URL, { waitUntil: 'networkidle' });
  await page.getByText('Featured Favorites').waitFor();
  await page.waitForTimeout(1500);
  await shot('01-home');
  await page.mouse.wheel(0, 700); await page.waitForTimeout(600); await shot('02-home-scrolled');
  await page.mouse.wheel(0, 1400); await page.waitForTimeout(600); await shot('03-home-bottom');

  await page.getByRole('tab', { name: /Menu/ }).click();
  await page.getByRole('heading', { name: 'Our Menu' }).waitFor();
  await page.waitForTimeout(500);
  await shot('04-menu');
  await page.getByLabel('Search products').fill('pandesal');
  await page.waitForTimeout(500);
  await shot('05-menu-search');

  await page.getByRole('button', { name: /^Pandesal,/ }).click();
  await page.getByText('Add to bag').waitFor();
  await page.waitForTimeout(500);
  for (let i = 0; i < 4; i++) await page.getByLabel('Increase Pandesal quantity').click();
  await shot('06-details');
  await page.getByRole('button', { name: 'Add to bag' }).click();
  await page.getByText(/Added 5 to your bag/).waitFor();
  await shot('07-details-added');
  await page.getByRole('button', { name: 'View bag' }).click();
  await page.getByRole('heading', { name: 'Your Bag' }).waitFor();
  await page.waitForTimeout(800);
  await page.getByLabel('Increase Pandesal quantity').locator('visible=true').click();
  await page.waitForTimeout(300);
  await shot('08-bag');

  await page.getByRole('button', { name: 'Proceed to pre-order' }).click();
  await page.getByText('Your details', { exact: true }).waitFor();
  await shot('09-checkout-empty');
  // Submit empty form to see validation
  await page.getByTestId('submit-order').click();
  await page.waitForTimeout(400);
  await shot('10-checkout-errors');
  await page.getByLabel('Full name').fill('Juan Dela Cruz');
  await page.getByLabel('Contact number').fill('0917 123 4567');
  await page.getByLabel('Pickup time').fill('10:00');
  await page.getByTestId('submit-order').click();
  await page.getByText('Request sent!').waitFor({ timeout: 15000 });
  await page.waitForTimeout(400);
  await shot('11-confirmation');
  const ref = (await page.locator('text=/4R-[A-Z0-9]{4}-[A-Z0-9]{4}/').first().innerText()).trim();
  console.log('REFERENCE', ref);

  await page.getByRole('button', { name: 'View my orders' }).click();
  await page.getByRole('heading', { name: 'My Orders' }).waitFor();
  await page.waitForTimeout(1000);
  await shot('12-orders');
  await page.getByRole('tab', { name: /Store/ }).click();
  await page.waitForTimeout(800);
  await shot('13-store');
  await page.getByRole('tab', { name: /Bag/ }).click();
  await page.waitForTimeout(400);
  await shot('14-bag-empty-after-order');
  console.log(logs.join('\n'));
  await browser.close();
})().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
