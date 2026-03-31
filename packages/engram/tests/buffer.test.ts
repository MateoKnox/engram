import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { BufferLayer } from '../src/layers/buffer.js';

describe('BufferLayer', () => {
  test('stores and retrieves an entry', () => {
    const buf = new BufferLayer({ ttl: '1h', capacity: 100 });
    const entry = buf.store('hello world', { tags: ['greeting'] });
    assert.equal(entry.layer, 'buffer');
    assert.equal(entry.content, 'hello world');
    assert.deepEqual(entry.tags, ['greeting']);

    const retrieved = buf.get(entry.id);
    assert.ok(retrieved);
    assert.equal(retrieved.id, entry.id);
  });

  test('search finds matching entries', () => {
    const buf = new BufferLayer({ ttl: '1h' });
    buf.store('photosynthesis is a process');
    buf.store('mitosis divides cells');
    buf.store('quantum entanglement is spooky');

    const results = buf.search('photosynthesis');
    assert.equal(results.length, 1);
    assert.ok(results[0].content.includes('photosynthesis'));
  });

  test('expires entries after TTL', async () => {
    const buf = new BufferLayer({ ttl: '50ms', capacity: 10 });
    const entry = buf.store('short-lived');
    assert.ok(buf.get(entry.id));
    await new Promise(r => setTimeout(r, 100));
    assert.equal(buf.get(entry.id), undefined);
  });

  test('enforces capacity with LRU eviction', () => {
    const buf = new BufferLayer({ ttl: '1h', capacity: 3, strategy: 'lru' });
    buf.store('A');
    buf.store('B');
    buf.store('C');
    assert.equal(buf.size(), 3);
    buf.store('D'); // should evict oldest
    assert.equal(buf.size(), 3);
  });

  test('flush returns all entries and clears', () => {
    const buf = new BufferLayer({ ttl: '1h' });
    buf.store('one');
    buf.store('two');
    const flushed = buf.flush();
    assert.equal(flushed.length, 2);
    assert.equal(buf.size(), 0);
  });

  test('decay reports expired count', async () => {
    const buf = new BufferLayer({ ttl: '50ms' });
    buf.store('soon gone');
    await new Promise(r => setTimeout(r, 100));
    const result = buf.decay();
    assert.equal(result.expired, 1);
  });
});
