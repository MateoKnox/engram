# ENGRAM Quickstart

Get from zero to working agent memory in five minutes.

---

## Installation

```bash
npm install @MateoKnox/engram
```

ENGRAM has zero runtime dependencies. It runs in any Node.js environment >= 18.

---

## Create engram.toml

Place an `engram.toml` file in your project root (or wherever you initialize the engine from). This file is optional — ENGRAM ships with sensible defaults — but it lets you tune every layer.

```toml
[agent]
id = "my-agent"
version = "0.1.0"

[memory.buffer]
ttl = "5m"
capacity = 1000
strategy = "lru"

[memory.episode]
half_life = "2h"
max_entries = 500
decay = "exponential"

[memory.graph]
persistent = false
storage = "memory"

[memory.skill]
persistent = false
storage = "memory"

[memory.residue]
max_summaries = 200
compression_ratio = 0.3

[memory.core]
immutable = true
storage = "memory"
```

See [CONFIG.md](./CONFIG.md) for the full reference.

---

## Basic Engine Usage

### Initialize

```typescript
import { EngramEngine } from '@MateoKnox/engram';

const engine = new EngramEngine('./engram.toml'); // config path is optional
await engine.init();
```

`init()` reads the config file (if present), deep-merges it with defaults, and boots all six memory layers. It is safe to call multiple times — subsequent calls are no-ops.

---

### Store a Memory

```typescript
// Buffer: working memory for the current turn
await engine.store('buffer', 'User is asking about renewable energy', {
  tags: ['context', 'energy'],
  importance: 0.8,
});

// Episode: timestamped event
await engine.store('episode', 'User completed onboarding flow', {
  tags: ['onboarding', 'event'],
  importance: 0.9,
});

// Graph: persistent semantic fact
await engine.store('graph', 'Solar panels convert photons into electricity via the photoelectric effect', {
  key: 'solar-panel-definition',
  tags: ['energy', 'physics'],
  importance: 0.95,
});

// Skill: procedural behavior
await engine.store('skill', 'When asked about energy sources: enumerate renewables first', {
  procedure: 'energy-source-ranking',
  triggerPattern: 'energy|power|electricity',
  tags: ['procedure'],
});

// Core: immutable foundational identity
await engine.store('core', 'Agent name: EnergyBot. Purpose: renewable energy advisor.', {
  tags: ['identity'],
});
```

The `store` method accepts:

| Parameter | Type | Description |
|-----------|------|-------------|
| `layer` | `'buffer' \| 'episode' \| 'graph' \| 'skill' \| 'core'` | Target layer |
| `content` | `string` | The memory content |
| `options` | `StoreOptions` | Optional metadata (tags, key, importance, etc.) |

> Note: You cannot store directly to the `residue` layer. Residue entries are created automatically by the consolidation pipeline.

---

### Recall Memories

```typescript
// Simple recall — searches all layers, returns best matches
const result = await engine.recall('solar energy');

console.log(result.entries);
// [
//   { layer: 'core', content: 'Agent name: EnergyBot...', weight: 1.0 },
//   { layer: 'graph', content: 'Solar panels convert...', weight: 0.95 },
//   { layer: 'episode', content: 'User completed onboarding...', weight: 0.87 },
//   ...
// ]
```

Recall options:

```typescript
const result = await engine.recall('solar energy', {
  layers: ['core', 'graph', 'episode'],  // restrict to specific layers
  limit: 5,                               // max entries to return
  minWeight: 0.3,                         // filter out low-weight entries
  key: 'solar-panel-definition',          // exact key lookup (graph/skill)
});
```

Results are sorted by priority: CORE > RESIDUE > SKILL > GRAPH > EPISODE > BUFFER, then by weight descending within each tier.

---

### Run Decay

Decay reduces the weight of time-sensitive entries. Call it periodically (e.g., once per session, or on a timer).

```typescript
const results = await engine.decay();

for (const r of results) {
  console.log(`${r.layer}: processed=${r.processed}, expired=${r.expired}, decayed=${r.decayed}`);
}
// buffer:  processed=12, expired=3, decayed=0
// episode: processed=45, expired=0, decayed=12
// graph:   processed=8,  expired=0, decayed=0
```

Decay behavior per layer:

- **Buffer**: Entries past their TTL are permanently removed (`expired`)
- **Episode**: Weights are reduced according to the configured decay function (`decayed`)
- **Graph, Skill, Core**: Not decayed (persistent or immutable)
- **Residue**: Compression ratio may be applied during consolidation

---

### Consolidate

Consolidation moves data between layers — flushing short-term memory into long-term storage and compressing decayed episodes into residue.

```typescript
const result = await engine.consolidate();

console.log(result.bufferToEpisode);  // entries moved from buffer → episode
console.log(result.graphToResidue);   // decayed episodes compressed into residue
```

A typical agent loop looks like:

```
per turn:
  recall() → build context → store() buffer entries

end of session:
  consolidate() → flush buffer → compress old episodes
  decay()       → age weights on episodes
```

---

## Layer Selection Guide

Choose the right layer for each type of information:

| You want to store... | Use layer |
|---|---|
| The current user's message or active topic | `buffer` |
| A conversation turn or event that happened | `episode` |
| A fact the agent should remember long-term | `graph` |
| A behavior or procedure the agent should follow | `skill` |
| The agent's identity, purpose, or hard constraints | `core` |
| (Compressed old episodes — auto-managed) | `residue` |

### Decision tree

```
Is it permanent and identity-level?        → core
Is it a reusable procedure or behavior?    → skill
Is it a factual claim about the world?     → graph
Is it something that happened (an event)?  → episode
Is it relevant only for the current turn?  → buffer
```

---

## Five Minutes to Working Memory

Here is a complete, runnable agent memory setup:

```typescript
import { EngramEngine } from '@MateoKnox/engram';

const engine = new EngramEngine();
await engine.init();

// 1. Seed identity
await engine.store('core', 'I am a helpful coding assistant.', { tags: ['identity'] });

// 2. Store a fact
await engine.store('graph', 'TypeScript 5.0 introduced const type parameters', {
  key: 'ts5-const-params',
  tags: ['typescript', 'language'],
  importance: 0.85,
});

// 3. Record what happened
await engine.store('episode', 'User asked about TypeScript generics', {
  tags: ['user-query', 'typescript'],
  importance: 0.7,
});

// 4. Set working context
await engine.store('buffer', 'Active topic: TypeScript type system', {
  tags: ['context'],
});

// 5. Recall at query time
const result = await engine.recall('TypeScript generics');
console.log('Relevant memories:', result.entries.map(e => `[${e.layer}] ${e.content}`));

// 6. Housekeeping (run periodically)
await engine.decay();
await engine.consolidate();

console.log('Stats:', engine.stats());
```

Output:
```
Relevant memories:
  [core]    I am a helpful coding assistant.
  [graph]   TypeScript 5.0 introduced const type parameters
  [episode] User asked about TypeScript generics
  [buffer]  Active topic: TypeScript type system

Stats: { buffer: 0, episode: 2, graph: 1, skill: 0, residue: 0, core: 1 }
```

---

## Next Steps

- [LAYERS.md](./LAYERS.md) — Deep dive into each memory layer
- [CONFIG.md](./CONFIG.md) — Full configuration reference
- [ARCHITECTURE.md](./ARCHITECTURE.md) — System design and data flow
- [../examples/basic-usage.ts](../examples/basic-usage.ts) — Runnable example
- [../examples/with-openai.ts](../examples/with-openai.ts) — OpenAI integration pattern
