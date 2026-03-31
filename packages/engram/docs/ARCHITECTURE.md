# ENGRAM Architecture

## System Overview

ENGRAM is a structured, layered memory engine for AI agents. It models agent memory as six discrete layers with different persistence characteristics, decay behaviors, and priority levels. Rather than treating memory as a flat vector store, ENGRAM enforces explicit semantics: you know what kind of memory you are reading or writing at every point.

The design is inspired by cognitive science models of human memory — working memory, episodic memory, semantic memory, procedural memory — and maps them onto a practical, composable TypeScript API.

### Core design principles

1. **Structure over search.** Retrieval is layer-aware and priority-ordered, not purely similarity-based.
2. **Decay over deletion.** Memories fade by weight, not by hard cutoffs. Low-weight entries survive until consolidation removes them.
3. **Immutability at the core.** The CORE layer is write-once. It cannot be overwritten, only extended. This guarantees agent identity stability.
4. **Explicit consolidation.** Moving memories between layers is an intentional operation, not a background side effect.
5. **Minimal dependencies.** The engine has no runtime dependencies. All persistence, if enabled, uses standard JSON files.

---

## The 6-Layer Stack

```
┌─────────────────────────────────────────────────────┐
│                   RECALL PRIORITY                   │
│   CORE  >  RESIDUE  >  SKILL  >  GRAPH  >  EP  >  BUF │
└─────────────────────────────────────────────────────┘

 ┌──────────┐   highest priority — immutable foundational facts
 │   CORE   │   weight: always 1.0 — never decays
 └──────────┘
      ↑
 ┌──────────┐   compressed traces of expired episodes
 │  RESIDUE │   lossy but searchable summaries
 └──────────┘
      ↑
 ┌──────────┐   learned procedures and behavioral patterns
 │  SKILL   │   trigger-pattern matching, no decay
 └──────────┘
      ↑
 ┌──────────┐   persistent semantic facts
 │  GRAPH   │   key-value store, no decay by default
 └──────────┘
      ↑
 ┌──────────┐   timestamped events with half-life decay
 │ EPISODE  │   sorted by recency × importance
 └──────────┘
      ↑
 ┌──────────┐   lowest priority — TTL-based working memory
 │  BUFFER  │   expires on TTL, evicts on capacity
 └──────────┘
```

### Layer summary

| Layer | Decay | Persistence | Writable | Priority |
|---|---|---|---|---|
| BUFFER | TTL expiry | No | Yes | 6 (lowest) |
| EPISODE | Half-life weight | Optional | Yes | 5 |
| GRAPH | None (default) | Optional | Yes | 4 |
| SKILL | None | Optional | Yes | 3 |
| RESIDUE | Compression | Optional | No (auto only) | 2 |
| CORE | None | Optional | Yes (write-once) | 1 (highest) |

---

## Data Flow Diagram

### Store operation

```
engine.store(layer, content, options)
         │
         ├─ validate layer (rejects 'residue')
         ├─ check initialized guard
         │
         ▼
  ┌─────────────┐
  │ Target Layer│  ← BufferLayer | EpisodeLayer | GraphLayer
  │   .store()  │    SkillLayer  | CoreLayer
  └─────────────┘
         │
         ▼
   MemoryEntry { id, layer, content, tags, weight,
                 importance, createdAt, eventAt, ... }
```

### Recall operation

```
engine.recall(query, options)
         │
         ├─ determine layer search order (priority-descending)
         ├─ for each layer: layer.search(query)
         ├─ merge results
         ├─ filter by minWeight
         ├─ sort: by layer priority, then weight descending
         ├─ apply limit
         │
         ▼
   RecallResult { entries[], resolvedLayer, query }
```

### Decay pipeline

```
engine.decay()
         │
         ├─ buffer.decay()   → expire TTL entries, return { expired }
         ├─ episode.decay()  → apply half-life to all entries, return { decayed }
         ├─ graph.decay()    → no-op (returns { processed: n, decayed: 0 })
         ├─ skill.decay()    → no-op
         ├─ residue.decay()  → no-op
         ├─ core.decay()     → no-op
         │
         ▼
   DecayResult[]  [{ layer, processed, expired, decayed }, ...]
```

### Consolidation pipeline

```
engine.consolidate()
         │
         ├─ 1. buffer.flush()
         │      └─ for each flushed entry:
         │           episode.store(entry.content, { importance: entry.importance })
         │           bufferToEpisode++
         │
         ├─ 2. episode.getAll()
         │      └─ for each entry where weight < threshold:
         │           residue.compress(entry)
         │           episode.remove(entry.id)
         │           graphToResidue++
         │
         ▼
   ConsolidateResult { bufferToEpisode, graphToResidue }
```

---

## Priority Resolution

When `recall()` is called, results from all searched layers are collected and sorted. The sort order is:

1. **Layer priority** (ascending priority number = first in results):
   - CORE (priority 1) beats RESIDUE (priority 2) beats SKILL (3) beats GRAPH (4) beats EPISODE (5) beats BUFFER (6)

2. **Within the same layer**: entries are sorted by `weight` descending.

This means a CORE entry with weight 1.0 will always appear before a BUFFER entry with weight 1.0 — even if the buffer entry is a more recent match for the query string.

The rationale: CORE holds immutable identity facts. These are authoritative. If a buffer entry contradicts a core entry, the CORE entry is the truth that the agent should rely on.

```
Example:
  buffer  → "Agent name is ALPHA"  weight: 1.0
  core    → "Agent name is BETA"   weight: 1.0

  recall("Agent name") →
    [0] { layer: 'core',   content: 'Agent name is BETA',  weight: 1.0 }
    [1] { layer: 'buffer', content: 'Agent name is ALPHA', weight: 1.0 }
```

---

## Decay Pipeline

### Buffer decay

Buffer uses wall-clock TTL expiry. Each entry records a `expiresAt` timestamp at store time:

```
expiresAt = createdAt + parseDuration(config.buffer.ttl)
```

On `decay()` (or on any `get()` call), entries past `expiresAt` are removed and not returned. There is no weight reduction — buffer entries either exist or they do not.

### Episode decay

Episode uses a configurable decay function applied to the entry's `weight` field. The weight starts at `importance` (default 1.0) and is reduced each time `decay()` is called.

Three decay functions are supported:

**Exponential** (default):
```
w(t) = w₀ × 2^(−t / halfLife)
```

**Linear**:
```
w(t) = w₀ × max(0, 1 − t / (2 × halfLife))
```

**Step** (halves at each halfLife interval):
```
w(t) = w₀ × 0.5^floor(t / halfLife)
```

Where `t` is elapsed time since `eventAt`, and `halfLife` is the configured value (default `2h`).

### Decay scheduling

ENGRAM does not self-schedule decay. You call `engine.decay()` at appropriate points in your agent loop — typically once per session, or on a background timer. This gives the host application full control over when aging occurs.

---

## Consolidation Pipeline

Consolidation has two phases:

### Phase 1: Buffer → Episode

All entries in the buffer layer are flushed and promoted to the episode layer. This is appropriate at the end of a conversation turn or session, when short-term working context should be committed to the event log.

Buffer entries lose their TTL on promotion — they become timestamped episodes, subject to episode decay (half-life) rather than hard expiry.

### Phase 2: Episode → Residue

Episodes whose weight has fallen below a threshold (default: 0.1) are compressed into residue summaries. The compression is lossy: the original content may be truncated, but the key semantic content (tags, key phrases) is preserved in the residue entry.

Residue entries are still searchable, but they carry less weight than active episodes and do not participate in decay.

---

## Design Decisions

### Why not a vector database?

Vector similarity search is powerful but opaque. When an agent recalls a memory, you cannot tell at a glance why a particular entry was returned. ENGRAM's layer model makes retrieval auditable: you always know which layer a result came from and what its weight is.

Additionally, vector databases require embedding models, which introduce latency, cost, and dependency. ENGRAM's text search is simple substring/keyword matching — fast, synchronous, and transparent.

The two approaches are complementary. You can wrap ENGRAM around a vector store for the GRAPH or EPISODE layers if you need semantic similarity for those layers.

### Why TOML for config?

TOML is readable without documentation. An `engram.toml` file is self-describing: `ttl = "5m"` means what it says. JSON lacks comments. YAML has footguns. TOML is a reasonable middle ground for developer-facing configuration.

### Why is RESIDUE not directly writable?

Residue represents compressed, degraded memory — the kind of thing you vaguely recall but cannot precisely reconstruct. Allowing direct writes to RESIDUE would undermine this semantic. If you have precise information to store, it belongs in GRAPH, EPISODE, or CORE. RESIDUE is a destination, not a source.

### Why write-once for CORE?

Agent identity should not be mutable at runtime. If a user message can overwrite a CORE entry, the agent's fundamental sense of purpose can be manipulated. Write-once semantics ensure that CORE entries set during initialization remain stable for the lifetime of the engine instance.

### Why no async in layer internals?

All layer operations (`store`, `get`, `search`, `flush`) are synchronous. Only the engine-level methods (`engine.store`, `engine.recall`, `engine.decay`, `engine.consolidate`) are async, to allow future layer implementations backed by async storage (databases, remote APIs) without changing the public API contract.

---

## Module Structure

```
packages/engram/src/
├── index.ts          ← public exports
├── engine.ts         ← EngramEngine class
├── config.ts         ← TOML parsing and defaults
├── decay.ts          ← decay functions and parseDuration
├── types.ts          ← shared TypeScript interfaces
└── layers/
    ├── buffer.ts     ← BufferLayer
    ├── episode.ts    ← EpisodeLayer
    ├── graph.ts      ← GraphLayer
    ← skill.ts      ← SkillLayer
    ├── residue.ts    ← ResidueLayer
    └── core.ts       ← CoreLayer
```
