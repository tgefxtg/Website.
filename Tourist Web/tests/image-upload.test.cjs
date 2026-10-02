// Regression coverage for server-verified Identity roles and persistent uploads.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function setup(name = 'package-image') {
  const saved = new Map();
  const state = { user: { email: 'admin@example.com', app_metadata: { roles: ['admin'] } }, status: 200, calls: [] };
  const context = { Response, URL, Uint8Array, AbortSignal,
    process: { env: { ADMIN_EMAIL: 'admin@example.com', URL: 'https://site.test' } },
    fetch: async (url, options) => {
      state.calls.push({ url: String(url), options });
      if (state.offline) throw new Error('offline');
      return Response.json(state.user, { status: state.status });
    }, defaultPackages: [], randomUUID: () => '12345678-1234-1234-1234-123456789abc',
    getStore: () => ({ set: async (id, value) => saved.set(id, value), get: async id => saved.get(id), setJSON: async (id, value) => saved.set(id, value) }) };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('netlify/functions/lib/admin-auth.mjs', 'utf8').replace('export async function', 'async function'), context);
  vm.runInContext(fs.readFileSync(`netlify/functions/${name}.mjs`, 'utf8').replace(/^import .*;\r?\n/gm, '').replace('export default', 'globalThis.handler ='), context);
  const send = (body, headers = {}) => context.handler(new Request(`https://site.test/.netlify/functions/${name}`, {
    method: name === 'packages' ? 'PUT' : 'POST', headers: { origin: 'https://site.test', authorization: 'Bearer test-token', ...headers }, body
  }));
  return { context, state, saved, send };
}
const photo = Uint8Array.from([137,80,78,71,13,10,26,10,0]);
test('invalid sessions never write images', async () => {
  const h = setup();
  assert.equal((await h.send(photo, { authorization: '' })).status, 401);
  assert.equal(h.state.calls.length, 0);
  for (const status of [401, 403]) { h.state.status = status; assert.equal((await h.send(photo)).status, 401); }
  assert.equal(h.saved.size, 0);
});
test('configured email AND server-managed admin role required, never user_metadata', async () => {
  const h = setup();
  h.state.user.email = 'visitor@example.com';
  assert.equal((await h.send(photo)).status, 403);
  h.state.user = { email: 'admin@example.com', user_metadata: { roles: ['admin'] } };
  assert.equal((await h.send(photo)).status, 403);
  h.state.user.app_metadata = { roles: 'admin' };
  assert.equal((await h.send(photo)).status, 403);
  h.state.user.app_metadata.roles = ['admin'];
  h.context.process.env.ADMIN_EMAIL = ' ADMIN@example.com ';
  assert.equal((await h.send(photo)).status, 200);
  assert.equal(h.state.calls[0].url, 'https://site.test/.netlify/identity/user');
  assert.equal(h.state.calls[0].options.redirect, 'error');
  assert.equal(h.state.calls[0].options.headers.Authorization, 'Bearer test-token');
});
test('missing configuration and outages fail closed with helpful errors', async () => {
  const h = setup();
  delete h.context.process.env.ADMIN_EMAIL;
  const result = await h.send(photo);
  assert.equal(result.status, 503);
  assert.match((await result.json()).error, /ADMIN_EMAIL/);
  h.context.process.env.ADMIN_EMAIL = 'admin@example.com';
  delete h.context.process.env.URL;
  assert.equal((await h.send(photo)).status, 503);
  h.context.process.env.URL = 'https://site.test';
  h.state.offline = true;
  assert.equal((await h.send(photo)).status, 503);
  h.state.offline = false; h.state.status = 500;
  assert.equal((await h.send(photo)).status, 503);
  assert.equal(h.saved.size, 0);
});
test('reject cross-origin requests, invalid bytes and oversized uploads', async () => {
  const h = setup();
  assert.equal((await h.send(photo, { origin: 'https://other.test' })).status, 403);
  assert.equal(h.state.calls.length, 0);
  assert.equal((await h.send('<svg onload="alert(1)"></svg>')).status, 400);
  assert.equal((await h.send(new Uint8Array(3 * 1024 * 1024 + 1))).status, 413);
  assert.equal((await h.send(photo, { 'content-length': 4 * 1024 * 1024 })).status, 413);
  assert.equal(h.saved.size, 0);
});
test('saved photos are publicly readable without allowing public writes', async () => {
  const h = setup();
  const result = await h.send(photo);
  assert.equal(result.status, 200);
  const { image } = await result.json();
  const read = await h.context.handler(new Request('https://site.test' + image));
  assert.equal(read.headers.get('content-type'), 'image/png');
  assert.deepEqual(new Uint8Array(await read.arrayBuffer()), photo);
  assert.equal(h.state.calls.length, 1);
  assert.equal((await h.context.handler(new Request('https://site.test/.netlify/functions/package-image?id=invalid'))).status, 404);
});
test('package saves share the auth fix and retain uploaded photo URLs', async () => {
  const h = setup('packages');
  const item = { name: 'Trivandrum', region: 'KERALA', image: '/.netlify/functions/package-image?id=12345678-1234-1234-1234-123456789abc.jpg', alt: 'Beach', description: 'Tour', best: 'slow travel', duration: '3 days', package: 'Escape' };
  const body = JSON.stringify({ packages: [item] });
  h.state.user.app_metadata.roles = [];
  assert.equal((await h.send(body)).status, 403);
  assert.equal(h.saved.size, 0);
  h.state.user.app_metadata.roles = ['admin'];
  const result = await h.send(body);
  assert.equal(result.status, 200);
  assert.equal((await result.json()).packages[0].image, item.image);
  assert.equal(h.saved.get('packages')[0].name, item.name);
});
