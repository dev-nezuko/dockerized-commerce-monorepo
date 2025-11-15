require('./helpers/register-ts.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { formatPrice } = require('../lib/format.ts');
const { resolveProductImageUrl } = require('../lib/images.ts');

test('prices render the same regardless of the visitor locale', () => {
  assert.equal(formatPrice(1499), '$14.99');
  assert.equal(formatPrice(250000), '$2,500.00');
  assert.equal(formatPrice(0), '$0.00');
});

test('product images resolve local paths, absolute URLs and Cloudinary ids', () => {
  assert.equal(resolveProductImageUrl('/bottle-placeholder.svg'), '/bottle-placeholder.svg');
  assert.equal(resolveProductImageUrl('https://res.cloudinary.com/demo/image/upload/a.jpg'), 'https://res.cloudinary.com/demo/image/upload/a.jpg');
  assert.equal(resolveProductImageUrl('catalog/flask-01', 800), 'https://res.cloudinary.com/demo/image/upload/q_auto,f_auto,w_800/catalog/flask-01.jpg');
  assert.equal(resolveProductImageUrl(''), '/bottle-placeholder.svg');
  // Hosts next/image is not configured for, and odd shapes, fall back to the placeholder.
  for (const unsupported of ['https://images.example.com/a.jpg', 'http://res.cloudinary.com/a.jpg', '//evil.example/x.png', '../x']) {
    assert.equal(resolveProductImageUrl(unsupported), '/bottle-placeholder.svg', unsupported);
  }
});
