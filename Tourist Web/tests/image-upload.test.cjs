const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('image upload enforces admin access, type, size and serves saved bytes', async () => {
  let user = null;
  const saved = new Map();
  const code = fs.readFileSync('netlify/functions/package-image.mjs', 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace('export default', 'globalThis.handler =');
  const context = { Response, URL, Uint8Array, process: { env: { ADMIN_EMAIL: 'admin@example.com' } },
    getUser: async () => user,
    randomUUID: () => '12345678-1234-1234-1234-123456789abc',
    getStore: () => ({ set: async (id, value) => saved.set(id, value), get: async id => saved.get(id) }) };
  vm.createContext(context);
  vm.runInContext(code, context);
  const send = (body, origin = 'https://site.test') => context.handler(new Request('https://site.test/.netlify/functions/package-image', {
    method: 'POST', headers: { origin }, body
  }));
  const photo = Uint8Array.from([137,80,78,71,13,10,26,10,0]);
  assert.equal((await send(photo)).status, 401);
  user = { email: 'visitor@example.com', roles: ['admin'] };
  assert.equal((await send(photo)).status, 403);
  user = { email: 'admin@example.com', roles: [] };
  assert.equal((await send(photo)).status, 403);
  user.roles = ['admin'];
  assert.equal((await send(photo, 'https://other.test')).status, 403);
  assert.equal((await send('<svg onload="alert(1)"></svg>')).status, 400);
  assert.equal((await send(new Uint8Array(3 * 1024 * 1024 + 1))).status, 413);
  assert.equal(saved.size, 0);
  const result = await send(photo);
  assert.equal(result.status, 200);
  const { image } = await result.json();
  user = null;
  const read = await context.handler(new Request('https://site.test' + image));
  assert.equal(read.headers.get('content-type'), 'image/png');
  assert.deepEqual(new Uint8Array(await read.arrayBuffer()), photo);
  assert.equal((await context.handler(new Request('https://site.test/.netlify/functions/package-image?id=invalid'))).status, 404);
});
