// Run with PLAYWRIGHT_MODULE pointing to an installed Playwright package.
// All network responses are local fixtures; no production data is changed.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const sample = { name: 'Trivandrum', package: 'Escape', region: 'KERALA', duration: '3 days', best: 'Slow travel', image: 'assets/images/munnar.webp', alt: 'Landscape', description: 'Test tour' };
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    for (const width of [1280, 390, 320]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      let saved = null, upload = null, rejectUpload = false;
      await page.route('**/*', async route => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.host === 'identity.netlify.com') return route.fulfill({ contentType: 'text/javascript', body: `window.netlifyIdentity={currentUser:()=>({email:'admin@example.com',app_metadata:{roles:['admin']},jwt:async(force)=>{if(!force)throw Error('Expected fresh session');return 'test-token'}}),on:(event,callback)=>{if(event==='init')setTimeout(()=>callback(window.netlifyIdentity.currentUser()),0)},close(){}};` });
        if (url.pathname.endsWith('/packages')) {
          if (request.method() === 'PUT') saved = request.postDataJSON();
          return route.fulfill({ json: saved || { packages: [sample] } });
        }
        if (url.pathname.endsWith('/package-image') && request.method() === 'POST') {
          upload = request.postDataBuffer();
          return route.fulfill({ status: rejectUpload ? 403 : 200, json: rejectUpload ? { error: 'Check ADMIN_EMAIL for this project.' } : { image: '/.netlify/functions/package-image?id=12345678-1234-1234-1234-123456789abc.jpg' } });
        }
        const filename = path.basename(url.pathname);
        if (filename === 'logo.webp' && fs.existsSync('logo.webp')) return route.fulfill({ path: path.resolve('logo.webp'), contentType: 'image/webp' });
        if (request.resourceType() === 'image') return route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF1sAAAAASUVORK5CYII=', 'base64') });
        if (['admin.html', 'admin.js', 'admin-photo.js', 'styles.css'].includes(filename)) return route.fulfill({ path: path.resolve(filename), contentType: filename.endsWith('.html') ? 'text/html' : filename.endsWith('.css') ? 'text/css' : 'text/javascript' });
        return route.fulfill({ status: 404, body: '' });
      });
      await page.goto('https://site.test/admin.html');
      await page.locator('[data-upload]').waitFor();
      assert.equal(await page.locator('[data-upload]').getAttribute('accept'), 'image/*');
      assert.equal(await page.locator('[data-upload]').getAttribute('capture'), null);
      const input = await page.evaluate(() => {
        const canvas = document.createElement('canvas'); canvas.width = 4032; canvas.height = 3024;
        const ctx = canvas.getContext('2d'); ctx.fillStyle = '#4f8058'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg').split(',')[1];
      });
      const selectedFile = { name: 'gallery-photo.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(input, 'base64') };
      await page.locator('[data-upload]').setInputFiles(selectedFile);
      await page.waitForFunction(() => document.querySelector('[data-upload-status]').textContent.includes('Photo uploaded.'));
      assert.equal(upload[0], 255); assert.equal(upload[1], 216); assert.ok(upload.length < 3 * 1024 * 1024);
      assert.match(await page.locator('[data-field="image"]').inputValue(), /package-image\?id=/);
      await page.locator('[data-save]').click();
      await page.waitForFunction(() => document.querySelector('[data-status]').textContent.startsWith('Saved.'));
      assert.match(saved.packages[0].image, /package-image\?id=/);
      const previousImage = saved.packages[0].image;
      rejectUpload = true;
      await page.locator('[data-upload]').setInputFiles(selectedFile);
      await page.waitForFunction(() => document.querySelector('[data-upload-status]').textContent.includes('ADMIN_EMAIL'));
      assert.equal(await page.locator('[data-field="image"]').inputValue(), previousImage);
      assert.equal(await page.locator('[data-save]').isEnabled(), true);
      assert.equal(await page.locator('[data-upload]').isEnabled(), true);
      if (width === 390) await page.screenshot({ path: 'mobile-upload-test.png', fullPage: true });
      assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1).map(el => `${el.tagName}.${el.className}: ${el.getBoundingClientRect().right}`)), []);
      assert.deepEqual(errors, []);
      if (width === 390) await page.screenshot({ path: 'mobile-upload-test.png', fullPage: true });
      console.log(`PASS ${width}px: native gallery picker, JPEG conversion, save, error recovery, no horizontal overflow`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
