/**
 * Basic usage example for @MateoKnox/engram
 * Run with: npx tsx examples/basic-usage.ts
 */

import { EngramEngine } from '../src/index.js';

async function main() {
  // Initialize the engine (reads engram.toml if present)
  const engine = new EngramEngine('./examples/engram.toml');
  await engine.init();

  console.log('=== ENGRAM Basic Usage ===\n');

  // Store memories in different layers
  console.log('Storing memories...');

  // Core memory — never decays
  await engine.store('core', 'Agent purpose: research assistant for biology topics', {
    tags: ['identity', 'purpose'],
  });

  // Skill — learned procedure
  await engine.store('skill', 'When asked about plants: check graph layer for existing facts first', {
    procedure: 'check-graph-before-answering',
    triggerPattern: 'plant|photosynthesis|botany',
    tags: ['procedure'],
  });

  // Graph — semantic fact
  await engine.store('graph', 'Photosynthesis is the process by which plants convert sunlight into glucose', {
    key: 'photosynthesis-definition',
    tags: ['biology', 'plants'],
    importance: 0.95,
  });

  // Episode — timestamped event
  await engine.store('episode', 'User asked: What is photosynthesis?', {
    tags: ['user-query', 'biology'],
    importance: 0.7,
  });

  // Buffer — short-term working memory
  await engine.store('buffer', 'Current context: explaining cellular biology', {
    tags: ['context'],
    importance: 1.0,
  });

  console.log('Stored 5 memories across 5 layers.\n');

  // Show stats
  const stats = engine.stats();
  console.log('Memory stats:', stats);
  console.log();

  // Recall across layers
  console.log('Recalling "photosynthesis"...');
  const result = await engine.recall('photosynthesis', {
    layers: ['core', 'graph', 'episode', 'skill', 'buffer'],
    limit: 5,
  });

  console.log(`Found ${result.entries.length} memories (resolved via: ${result.resolvedLayer}):`);
  for (const entry of result.entries) {
    console.log(`  [${entry.layer.toUpperCase()}] (weight: ${entry.weight.toFixed(2)}) ${entry.content.slice(0, 60)}...`);
  }
  console.log();

  // Run decay
  console.log('Running decay pass...');
  const decayResults = await engine.decay();
  for (const r of decayResults) {
    if (r.processed > 0 || r.expired > 0 || r.decayed > 0) {
      console.log(`  ${r.layer}: processed=${r.processed}, expired=${r.expired}, decayed=${r.decayed}`);
    }
  }
  console.log();

  // Consolidate
  console.log('Consolidating buffer → episode...');
  const consolidated = await engine.consolidate();
  console.log(`  Moved ${consolidated.bufferToEpisode} buffer entries to episode`);
  console.log(`  Compressed ${consolidated.graphToResidue} decayed episodes to residue`);
  console.log();

  console.log('Final stats:', engine.stats());
}

main().catch(console.error);
