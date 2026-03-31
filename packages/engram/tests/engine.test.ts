import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { EngramEngine } from '../src/engine.js';

describe('EngramEngine', () => {
  test('initializes without a config file', async () => {
    const engine = new EngramEngine();
    await engine.init();
    assert.ok(engine.buffer);
    assert.ok(engine.episode);
    assert.ok(engine.graph);
    assert.ok(engine.skill);
    assert.ok(engine.residue);
    assert.ok(engine.core);
  });

  test('store and recall from buffer', async () => {
    const engine = new EngramEngine();
    await engine.init();

    await engine.store('buffer', 'User asked about photosynthesis', {
      tags: ['biology'],
      importance: 0.9,
    });

    const result = await engine.recall('photosynthesis');
    assert.equal(result.entries.length, 1);
    assert.equal(result.entries[0].layer, 'buffer');
    assert.ok(result.entries[0].content.includes('photosynthesis'));
  });

  test('store and recall from episode', async () => {
    const engine = new EngramEngine();
    await engine.init();

    await engine.store('episode', 'Meeting with user about Q3 planning', {
      tags: ['meeting', 'planning'],
      importance: 0.8,
    });

    const result = await engine.recall('Q3 planning');
    assert.equal(result.entries.length, 1);
    assert.equal(result.entries[0].layer, 'episode');
  });

  test('store and recall from graph with key', async () => {
    const engine = new EngramEngine();
    await engine.init();

    await engine.store('graph', 'Photosynthesis converts sunlight to energy', {
      key: 'photosynthesis',
      tags: ['biology', 'chemistry'],
    });

    const result = await engine.recall('photosynthesis', {
      layers: ['graph'],
      key: 'photosynthesis',
    });
    assert.equal(result.entries.length, 1);
    assert.equal(result.entries[0].layer, 'graph');
  });

  test('store and recall from core', async () => {
    const engine = new EngramEngine();
    await engine.init();

    await engine.store('core', 'Agent ID: research-assistant-001', {
      tags: ['identity'],
    });

    const result = await engine.recall('Agent ID');
    assert.equal(result.entries[0].layer, 'core');
    assert.equal(result.entries[0].weight, 1.0);
  });

  test('priority resolution: core beats buffer', async () => {
    const engine = new EngramEngine();
    await engine.init();

    await engine.store('buffer', 'Agent name is ALPHA (temporary override)', {
      tags: ['identity'],
    });
    await engine.store('core', 'Agent name is BETA (permanent)', {
      tags: ['identity'],
    });

    const result = await engine.recall('Agent name', { limit: 10 });
    // Core should appear first
    assert.equal(result.entries[0].layer, 'core');
  });

  test('decay reduces episode weights', async () => {
    const engine = new EngramEngine();
    await engine.init();

    // Store an episode with a very short half life by overriding config
    const entry = engine.episode.store('Old memory', {
      importance: 1.0,
    });
    // Manually set eventAt to far in the past
    (entry as { eventAt: number }).eventAt = Date.now() - 1000 * 60 * 60 * 24 * 30; // 30 days ago

    await engine.decay();

    const all = engine.episode.getAll();
    assert.ok(all[0].weight < 0.99, `Expected weight < 0.99, got ${all[0].weight}`);
  });

  test('consolidate flushes buffer to episode', async () => {
    const engine = new EngramEngine();
    await engine.init();

    await engine.store('buffer', 'Temporary thought A');
    await engine.store('buffer', 'Temporary thought B');
    assert.equal(engine.buffer.size(), 2);

    const result = await engine.consolidate();
    assert.equal(result.bufferToEpisode, 2);
    assert.equal(engine.buffer.size(), 0);
    assert.equal(engine.episode.size(), 2);
  });

  test('stats returns counts per layer', async () => {
    const engine = new EngramEngine();
    await engine.init();

    await engine.store('buffer', 'buf1');
    await engine.store('episode', 'ep1');
    await engine.store('graph', 'graph1', { key: 'g1' });
    await engine.store('core', 'core1');

    const stats = engine.stats();
    assert.equal(stats.buffer, 1);
    assert.equal(stats.episode, 1);
    assert.equal(stats.graph, 1);
    assert.equal(stats.core, 1);
  });

  test('throws if not initialized', async () => {
    const engine = new EngramEngine();
    await assert.rejects(
      () => engine.store('buffer', 'test'),
      /not initialized/i
    );
  });

  test('cannot store directly to residue layer', async () => {
    const engine = new EngramEngine();
    await engine.init();
    await assert.rejects(
      () => engine.store('residue' as Parameters<typeof engine.store>[0], 'test'),
      /consolidate/i
    );
  });
});
