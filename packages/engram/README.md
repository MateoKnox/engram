<!-- badges -->
[![npm version](https://img.shields.io/npm/v/@MateoKnox/engram.svg?style=flat-square)](https://www.npmjs.com/package/@MateoKnox/engram)
[![license](https://img.shields.io/npm/l/@MateoKnox/engram.svg?style=flat-square)](./LICENSE)
[![node](https://img.shields.io/node/v/@MateoKnox/engram.svg?style=flat-square)](https://nodejs.org)

# ENGRAM

**The Agent Memory Engine**

ENGRAM gives your AI agent a structured, layered memory system with explicit semantics, priority-ordered recall, and configurable decay. Instead of a flat vector store, you get six purpose-built memory layers â€” each with distinct persistence, decay, and priority behavior.

---

## Why ENGRAM

Most agent memory approaches collapse everything into a similarity search over embeddings. ENGRAM takes a different view: not all memories are equal, and a structured model makes retrieval transparent and predictable.

- **Six typed layers** â€” buffer, episode, graph, skill, residue, core
- **Priority-ordered recall** â€” CORE beats RESIDUE beats SKILL beats GRAPH beats EPISODE beats BUFFER
- **Configurable decay** â€” exponential, linear, or step functions on episode weights
- **Write-once core** â€” identity facts that cannot be overridden by user input
- **Zero dependencies** â€” pure TypeScript, runs anywhere Node >= 18

---

## Layer Diagram

```
  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
  â”‚                     RECALL ORDER                     â”‚
  â”‚  CORE > RESIDUE > SKILL > GRAPH > EPISODE > BUFFER   â”‚
  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  Immutable identity, constraints, agent purpose
  â”‚   CORE   â”‚  Weight: always 1.0 | Decay: none | Write-once
  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
       â†‘
  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  Compressed traces of old episodes
  â”‚  RESIDUE â”‚  Lossy but searchable | Auto-managed by consolidation
  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
       â†‘
  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  Procedures, behaviors, trigger-pattern rules
  â”‚  SKILL   â”‚  No decay | Optional regex trigger matching
  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
       â†‘
  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  Semantic facts about the world
  â”‚  GRAPH   â”‚  Key-value store | No decay | Persistent optional
  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
       â†‘
  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  Timestamped events and conversation turns
  â”‚ EPISODE  â”‚  Half-life decay | Event log | Consolidates to residue
  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
       â†‘
  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  Transient working memory for the current turn
  â”‚  BUFFER  â”‚  TTL expiry | LRU/FIFO eviction | Never persisted
  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

## Install

```bash
npm install @MateoKnox/engram
```

Requires Node.js >= 18.0.0.

---

## Quick Start

```typescript
import { EngramEngine } from '@MateoKnox/engram';

const engine = new EngramEngine('./engram.toml'); // config is optional
await engine.init();

// Store memories in the right layer for each type of information
await engine.store('core', 'Agent name: Aria. Purpose: customer support specialist.', {
  tags: ['identity'],
});

await engine.store('graph', 'Company refund policy: full refund within 30 days of purchase.', {
  key: 'refund-policy',
  tags: ['policy', 'support'],
  importance: 0.95,
});

await engine.store('episode', 'User asked about returning a product purchased 15 days ago.', {
  tags: ['user-query', 'returns'],
  importance: 0.75,
});

await engine.store('buffer', 'Current context: handling returns inquiry.', {
  tags: ['context'],
});

// Recall â€” results sorted by priority, then weight
const result = await engine.recall('refund return policy');
for (const entry of result.entries) {
  console.log(`[${entry.layer}] (${entry.weight.toFixed(2)}) ${entry.content}`);
}
// [core]    (1.00) Agent name: Aria. Purpose: customer support specialist.
// [graph]   (0.95) Company refund policy: full refund within 30 days...
// [episode] (0.75) User asked about returning a product purchased 15 days ago.
// [buffer]  (1.00) Current context: handling returns inquiry.

// Run decay and consolidate at end of session
await engine.decay();
await engine.consolidate();

console.log(engine.stats());
// { buffer: 0, episode: 2, graph: 1, skill: 0, residue: 0, core: 1 }
```

---

## Layer Overview

| Layer | TTL | Decay | Use Case |
|---|---|---|---|
| BUFFER | Configurable (default 5m) | Hard expiry on TTL | Current turn context, tool results, active topic |
| EPISODE | None (weight decays) | Half-life (default 2h) | Conversation turns, events, agent actions |
| GRAPH | None | None | World facts, domain knowledge, user preferences |
| SKILL | None | None | Behavioral rules, response procedures, trigger patterns |
| RESIDUE | None | None (auto-compressed) | Compressed traces of old episodes |
| CORE | None | None (immutable) | Agent identity, purpose, hard constraints |

---

## API Reference

| Method | Signature | Returns | Description |
|---|---|---|---|
| `init` | `(configPath?: string) => Promise<void>` | `void` | Initialize the engine and all layers. Must be called before any other method. |
| `store` | `(layer, content, options?) => Promise<MemoryEntry>` | `MemoryEntry` | Store a memory entry in the specified layer. Cannot store to `residue`. |
| `recall` | `(query, options?) => Promise<RecallResult>` | `RecallResult` | Retrieve entries matching a query, sorted by layer priority then weight. |
| `decay` | `() => Promise<DecayResult[]>` | `DecayResult[]` | Age all layers: expire buffer TTLs, reduce episode weights. |
| `consolidate` | `() => Promise<ConsolidateResult>` | `ConsolidateResult` | Flush buffer to episode; compress low-weight episodes to residue. |
| `stats` | `() => EngineStats` | `EngineStats` | Return current entry count per layer. Synchronous. |

### store options

```typescript
interface StoreOptions {
  tags?: string[];           // Metadata tags for filtering
  importance?: number;       // Initial weight (0â€“1). Default: 1.0
  key?: string;              // Named key (graph/skill layers)
  procedure?: string;        // Procedure identifier (skill layer)
  triggerPattern?: string;   // Regex trigger string (skill layer)
}
```

### recall options

```typescript
interface RecallOptions {
  layers?: LayerName[];      // Layers to search. Default: all
  limit?: number;            // Max results. Default: 10
  minWeight?: number;        // Filter below this weight. Default: 0
  key?: string;              // Exact key lookup (graph/skill)
}
```

---

## Configuration

Create `engram.toml` in your project root:

```toml
[agent]
id = "my-agent"
version = "1.0.0"

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

All options have defaults. The config file is optional. See [docs/CONFIG.md](./docs/CONFIG.md) for the full reference.

---

## Philosophy

### Structure over embeddings

Vector similarity search is powerful but opaque. When an agent retrieves a memory, you should know *why* â€” was it a core identity fact? A recent episode? A learned procedure? ENGRAM makes retrieval semantically explicit. You always know which layer a result came from and what its weight is.

### Decay over deletion

Hard-deleting memories is a blunt instrument. ENGRAM instead decays weights over time, so old memories fade rather than vanish. This mirrors how biological memory works and allows for graceful degradation: a memory from three months ago still exists in residue, just with lower weight than something from today.

### Immutability at the foundation

An agent's identity should be stable. CORE entries are write-once: once you declare the agent's purpose and constraints, they cannot be overwritten by runtime input. This is the primary defense against prompt injection and identity manipulation.

### Explicit over implicit

ENGRAM does not auto-manage memory for you. Decay runs when you call `engine.decay()`. Consolidation runs when you call `engine.consolidate()`. This gives you full control over when memory operations happen â€” critical for deterministic behavior in production agents.

---

## Docs

- [QUICKSTART.md](./docs/QUICKSTART.md) â€” Get running in 5 minutes
- [LAYERS.md](./docs/LAYERS.md) â€” Deep dive into each memory layer
- [CONFIG.md](./docs/CONFIG.md) â€” Full configuration reference
- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) â€” System design and data flow
- [CHANGELOG.md](./docs/CHANGELOG.md) â€” Version history
- [spec/ENGRAM.md](./spec/ENGRAM.md) â€” Formal specification

---

## License

MIT â€” see [LICENSE](./LICENSE)

Copyright (c) 2026 MateoKnox
