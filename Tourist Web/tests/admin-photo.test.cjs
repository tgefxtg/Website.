const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function setup(options = {}) {
  const state = { revoked: [], qualities: [] };
  const canvas = { getContext: () => ({ fillRect() {}, drawImage() {} }), toBlob: (callback, type, quality) => {
    state.qualities.push(quality);
    callback(options.noBlob ? null : { type, size: options.largeBlob ? 4 * 1024 * 1024 : 200000 });
  } };
  const context = {
    URL: { createObjectURL: () => 'blob:test', revokeObjectURL: value => state.revoked.push(value) },
    Image: class { constructor() { this.naturalWidth = options.width || 4032; this.naturalHeight = options.height || 3024; }
      set src(value) { if (options.unreadable) this.onerror(); else this.onload(); } },
    document: { createElement: () => canvas }
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('admin-photo.js', 'utf8'), context);
  return { prepare: context.preparePackagePhoto, canvas, state };
}
const file = { name: 'phone.jpg', type: 'image/jpeg', size: 8 * 1024 * 1024 };
test('large landscape and portrait photos resize and release resources', async () => {
  for (const dimensions of [{ width: 4032, height: 3024 }, { width: 3024, height: 4032 }]) {
    const h = setup(dimensions);
    assert.equal((await h.prepare(file)).type, 'image/jpeg');
    assert.equal(Math.max(h.canvas.width, h.canvas.height), 1920);
    assert.equal(Math.min(h.canvas.width, h.canvas.height), 1440);
    assert.deepEqual(h.state.revoked, ['blob:test']);
  }
});
test('small photos are not enlarged; mobile files with empty MIME are accepted', async () => {
  const h = setup({ width: 800, height: 600 });
  await h.prepare({ ...file, type: '' });
  assert.equal(h.canvas.width, 800); assert.equal(h.canvas.height, 600);
});
test('unreadable HEIC gives JPG export guidance and releases resources', async () => {
  const h = setup({ unreadable: true });
  await assert.rejects(h.prepare({ ...file, name: 'phone.heic', type: 'image/heic' }), /Export it as JPG or PNG/);
  assert.deepEqual(h.state.revoked, ['blob:test']);
});
test('oversized input, SVG and non-images are refused', async () => {
  const h = setup();
  await assert.rejects(h.prepare({ ...file, size: 26 * 1024 * 1024 }), /25 MB/);
  await assert.rejects(h.prepare({ ...file, name: 'script.svg', type: 'image/svg+xml' }), /Choose a photo/);
  await assert.rejects(h.prepare({ ...file, name: 'file.pdf', type: 'application/pdf' }), /Choose a photo/);
});
test('compression failures explain how to recover and release resources', async () => {
  const h = setup({ largeBlob: true });
  await assert.rejects(h.prepare(file), /still too large/);
  assert.deepEqual(h.state.qualities, [0.85, 0.7, 0.55]);
  assert.deepEqual(h.state.revoked, ['blob:test']);
  await assert.rejects(setup({ noBlob: true }).prepare(file), /Could not prepare/);
});
