<div align="center">

# ENGRAM

**The Agent Memory Engine**

A TOML-based structured memory system for AI agents.
Six layers. Explicit decay. Zero amnesia. Model agnostic.

[![version](https://img.shields.io/badge/version-v0.1.0-blue)](spec/ENGRAM.md)
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)](CONTRIBUTING.md)

[Spec](spec/ENGRAM.md) · [Quickstart](docs/QUICKSTART.md) · [Examples](examples/) · [GitHub](https://github.com/MateoKnox/engram)

</div>

---

## The Problem

Agent memory is an afterthought. You stuff everything into a vector database, retrieve by cosine similarity, and hope the right context surfaces. It works — until your agent forgets its own name, retrieves a stale fact over a fresh one, or treats a safety constraint with the same priority as last Tuesday's chat log.

The issue is structural. Not all memories are equal. An agent's identity is not the same kind of thing as a conversation turn from three sessions ago. A safety constraint is not a transient working note. A learned behavior is not a raw observation.

**ENGRAM makes the entire memory system explicit** — six layers with distinct persistence, decay, and retrieval priority. No guesswork. No amnesia.

## Architecture

```
┌─────────────────────────────────────┐
│              CORE                   │  immutable identity & constraints
├─────────────────────────────────────┤
│            RESIDUE                  │  compressed traces of faded memories
├─────────────────────────────────────┤
│             SKILL                   │  procedures & trigger patterns
├─────────────────────────────────────┤
│             GRAPH                   │  semantic facts & knowledge
├─────────────────────────────────────┤
│            EPISODE                  │  timestamped events with decay
├─────────────────────────────────────┤
│            BUFFER                   │  transient working memory
└─────────────────────────────────────┘

Resolution: core > residue > skill > graph > episode > buffer
```

## Quick Start

```bash
npm install @MateoKnox/engram
```

```typescript
import { EngramEngine } from '@MateoKnox/engram';

const engine = new EngramEngine('./engram.toml');
await engine.init();

// Store memories in typed layers
await engine.store('core', 'Agent: Aria. Purpose: customer support.');
await engine.store('graph', 'Refund policy: 30 days from purchase.', { key: 'refund-policy' });
await engine.store('episode', 'User asked about returning a product.', { importance: 0.8 });
await engine.store('buffer', 'Currently handling returns inquiry.');

// Recall — sorted by layer priority, then weight
const result = await engine.recall('refund policy');
for (const entry of result.entries) {
  console.log(`[${entry.layer}] ${entry.content}`);
}

// End of session — age memories, compress old ones
await engine.decay();
await engine.consolidate();
```

## Example Config

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

All options have defaults. The config file is optional.

## The Six Layers

| Layer | What it controls |
|-------|-----------------|
| **Core** | Immutable identity. Agent name, purpose, hard constraints. Write-once — cannot be overridden by runtime input. Always weight 1.0. |
| **Residue** | Compressed traces of faded episodes. Auto-created by consolidation. Lossy but searchable. The ghosts of old context. |
| **Skill** | Procedural memory. Behavioral rules, response procedures. Supports regex trigger patterns that auto-surface on matching input. |
| **Graph** | Semantic fact store. Domain knowledge, user preferences, reference data. Key-value with optional persistence. No decay. |
| **Episode** | Timestamped event log. Conversation turns, tool calls, observations. Configurable half-life decay — memories fade over time. |
| **Buffer** | Transient working memory. Current turn context, active intent. TTL-based expiry. Never persisted. Lowest priority. |

## Decay System

Memories don't get deleted — they fade. Episode weights decrease over time using configurable decay functions:

```
weight
1.0 ┤╲
    │ ╲  exponential (smooth, never reaches zero)
0.5 ┤  ╲___
    │      ╲___________
0.0 ┤
    └──────────────────── time
         T      2T     3T
```

| Function | Behavior |
|----------|----------|
| `exponential` | Smooth, continuous. Halves at each half-life. Default. |
| `linear` | Reaches zero at 2× half-life. Predictable endpoint. |
| `step` | Discrete jumps. Weight drops by half at each half-life boundary. |

When an episode's weight drops below threshold, `consolidate()` compresses it into a residue entry — a lossy summary that's still searchable but takes lower priority.

## Consolidation

The memory lifecycle flows in one direction:

```
BUFFER → EPISODE → RESIDUE
```

- `engine.consolidate()` promotes buffer entries to episode (they gain timestamps, lose TTLs)
- Episodes below the weight threshold get compressed into residue
- Core, Graph, and Skill are stable — they don't move between layers

You control when this happens. ENGRAM never runs background processes.

## Trigger Patterns

Skills can define regex patterns that auto-surface when a recall query matches:

```typescript
await engine.store('skill', 'For refund requests: verify order date, then apply policy.', {
  procedure: 'handle-refund',
  triggerPattern: 'refund|return|exchange',
});

// This recall matches the trigger — skill surfaces even without keyword overlap
const result = await engine.recall('customer wants money back');
```

This means skills fire on *intent patterns*, not just keyword overlap.

## Priority Resolution

When `recall()` runs, results are sorted by layer priority first, then weight descending:

```
CORE (p=1) → RESIDUE (p=2) → SKILL (p=3) → GRAPH (p=4) → EPISODE (p=5) → BUFFER (p=6)
```

A core identity entry always appears before an episode, regardless of weight. You always know *why* a result appeared and *which layer* it came from.

## API

| Method | Description |
|--------|-------------|
| `engine.init()` | Initialize engine and all layers. Must call before anything else. |
| `engine.store(layer, content, options?)` | Store a memory in the specified layer. |
| `engine.recall(query, options?)` | Retrieve memories sorted by priority and weight. |
| `engine.decay()` | Age all time-sensitive layers. Expire buffer TTLs, reduce episode weights. |
| `engine.consolidate()` | Flush buffer → episode. Compress low-weight episodes → residue. |
| `engine.stats()` | Return entry count per layer. |

### Store options

```typescript
{
  tags?: string[];            // metadata tags for filtering
  importance?: number;        // initial weight, 0–1 (default: 1.0)
  key?: string;               // named key for exact lookup (graph)
  procedure?: string;         // procedure identifier (skill)
  triggerPattern?: string;    // regex trigger (skill)
}
```

### Recall options

```typescript
{
  layers?: LayerName[];       // which layers to search (default: all)
  limit?: number;             // max results (default: 10)
  minWeight?: number;         // filter below this weight
  tags?: string[];            // filter by tags
  key?: string;               // exact key lookup (graph)
}
```

## RAG vs ENGRAM

| | Traditional RAG | ENGRAM |
|---|---|---|
| Storage | Flat vector space | Six typed layers |
| Retrieval | Cosine similarity | Substring/trigger match + layer priority |
| Transparency | Opaque | Every result carries layer + weight |
| Identity protection | None | CORE: immutable, always surfaces first |
| Memory decay | Manual deletion | Configurable half-life functions |
| Procedural memory | Not supported | SKILL layer with regex triggers |
| Working memory | Context window | BUFFER: TTL-based, auto-consolidating |
| Dependencies | Vector DB + embedding model | Zero |
| Debuggability | Hard | Trace by layer + weight |

ENGRAM isn't trying to replace vector search for large document corpora. It's for **agent working memory** — the structured things an agent needs to know about itself, its world, and its history.

## Works With

Claude · GPT-4 · Gemini · LLaMA · any model that accepts a system prompt

## Built For

Any agent framework. Drop-in memory layer for your existing agent loop.

## Integration Example

```typescript
async function handleTurn(userMessage: string) {
  // Store current input
  await engine.store('buffer', `User: ${userMessage}`, { tags: ['input'] });

  // Build context from memory
  const memory = await engine.recall(userMessage, { limit: 8 });
  const context = memory.entries.map(e => `[${e.layer}] ${e.content}`).join('\n');

  // Call your LLM with structured memory as context
  const response = await callLLM({ system: context, user: userMessage });

  // Log the exchange
  await engine.store('episode', `User: ${userMessage} | Agent: ${response}`, {
    tags: ['turn'],
    importance: 0.8,
  });

  return response;
}
```

## Philosophy

```
structure > embeddings
decay > deletion
layers > dumps
toml > vibes
```

**Remember it, or the model won't.**

## Documentation

- [Full Specification](spec/ENGRAM.md) — complete field reference
- [Quickstart Guide](docs/QUICKSTART.md) — running in 5 minutes
- [Architecture](docs/ARCHITECTURE.md) — how layers interact
- [Layer Reference](docs/LAYERS.md) — deep dive into each layer
- [Config Reference](docs/CONFIG.md) — full configuration options
- [Changelog](docs/CHANGELOG.md) — version history
- [Examples](examples/) — ready-to-use configs and integration code

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT — see [LICENSE](LICENSE).

---

<div align="center">

*By [MateoKnox](https://github.com/MateoKnox)*

</div>
