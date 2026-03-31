# ENGRAM Specification

**Version**: 0.1.0
**Status**: Draft
**Authors**: MateoKnox

---

## Preamble

### Motivation

Modern AI agents need memory that is structured, auditable, and semantically typed. The dominant approach — storing all memory as vector embeddings in a flat similarity index — has fundamental limitations:

1. **Opacity**: You cannot tell why a particular memory was retrieved. Was it semantically close? Was it recent? Was it important? The vector score collapses all of these into a single opaque number.

2. **Homogeneity**: Not all memories are alike. A fact about the world ("water boils at 100°C") is different from a conversation event ("user asked about boiling points"), which is different from an agent instruction ("always cite sources"). Treating them identically loses information.

3. **Stability**: Identity-level facts (the agent's name, purpose, constraints) should not be subject to the same retrieval competition as transient context. An agent should never "forget" who it is because a user's message happened to be more semantically similar to a relevant embedding.

4. **Decay**: Real memories fade. An event from three months ago should carry less weight than one from this morning. Vector stores do not model time-based decay without extra infrastructure.

ENGRAM addresses these limitations by imposing a six-layer memory model with explicit semantics, priority ordering, and configurable decay. The result is a memory system that is transparent, predictable, and appropriate for production agent deployments.

---

## Definitions

**Agent**: A software process that uses ENGRAM to maintain memory across interactions.

**Memory Entry**: A single unit of stored information, with a content string, metadata, and a weight.

**Layer**: One of the six named memory stores (BUFFER, EPISODE, GRAPH, SKILL, RESIDUE, CORE), each with distinct semantics and behavior.

**Weight**: A float in `[0.0, 1.0]` representing the current relevance or salience of a memory entry. Weight 1.0 is maximum salience. Weight 0.0 means the entry has fully decayed.

**Importance**: The initial weight assigned to a memory entry at store time. The weight starts at `importance` and may decay over time.

**Decay**: The process of reducing the weight of time-sensitive entries to reflect their receding relevance.

**Consolidation**: The process of moving entries between layers — specifically, flushing BUFFER to EPISODE and compressing low-weight EPISODES into RESIDUE.

**TTL (Time-to-Live)**: A hard expiry duration after which a BUFFER entry is permanently removed, regardless of weight.

**Half-Life**: The duration after which an EPISODE entry's weight is halved (for exponential decay).

**Priority**: The recall order precedence of a layer. Lower priority number = higher precedence. CORE has priority 1 (highest), BUFFER has priority 6 (lowest).

**Engine**: The `EngramEngine` class, which owns all six layers and provides the public API.

---

## The Six-Layer Specification

### Layer 1: BUFFER

**Purpose**: Transient working memory for the current interaction context.

**Formal properties**:
- P1.1: Every BUFFER entry has an `expiresAt` timestamp equal to `createdAt + TTL`.
- P1.2: A BUFFER entry is invalid (must not be returned by any read operation) if `now >= expiresAt`.
- P1.3: When the number of live BUFFER entries reaches `capacity`, one entry must be evicted before the new entry is inserted.
- P1.4: Under LRU strategy, the evicted entry is the one with the smallest `accessedAt` value.
- P1.5: Under FIFO strategy, the evicted entry is the one with the smallest `createdAt` value.
- P1.6: BUFFER entries are never persisted to disk.
- P1.7: BUFFER weight does not change after insertion. Entries either exist (above TTL) or do not.

**Priority**: 6 (lowest)

---

### Layer 2: EPISODE

**Purpose**: Timestamped event log with time-based weight decay.

**Formal properties**:
- P2.1: Every EPISODE entry has an `eventAt` timestamp, set to `Date.now()` at store time unless overridden.
- P2.2: Every EPISODE entry has a `weight` initialized to `importance` (default: 1.0).
- P2.3: On each `decay()` call, the weight of every EPISODE entry is updated:
  ```
  elapsed = now - entry.eventAt
  entry.weight = entry.weight × decayFactor(elapsed, halfLife, decayFunction)
  ```
- P2.4: Weight is bounded to `[0.0, 1.0]` and never increases after insertion.
- P2.5: EPISODE entries are not removed by decay alone. Removal happens during consolidation when `weight < consolidationThreshold`.
- P2.6: If `max_entries` is exceeded, the lowest-weight entries are dropped.

**Priority**: 5

---

### Layer 3: GRAPH

**Purpose**: Persistent semantic fact store with optional key-based lookup.

**Formal properties**:
- P3.1: GRAPH entries may carry an optional `key` string. Keys are unique within the GRAPH layer.
- P3.2: Recall by key returns the entry with an exact key match, bypassing content search.
- P3.3: GRAPH entry weights do not decay.
- P3.4: GRAPH entries persist across decay and consolidation cycles unless explicitly removed.

**Priority**: 4

---

### Layer 4: SKILL

**Purpose**: Procedural memory with optional trigger-pattern activation.

**Formal properties**:
- P4.1: SKILL entries may carry an optional `triggerPattern` string, interpreted as a JavaScript `RegExp` pattern.
- P4.2: During recall, if `query` matches `new RegExp(entry.triggerPattern)`, the entry is included in results regardless of content similarity.
- P4.3: SKILL entry weights do not decay.
- P4.4: SKILL entries with a `procedure` field can be retrieved by exact procedure identifier.

**Priority**: 3

---

### Layer 5: RESIDUE

**Purpose**: Compressed traces of expired or heavily-decayed episodes.

**Formal properties**:
- P5.1: RESIDUE is not directly writable via `engine.store()`. Attempting to do so throws an error.
- P5.2: RESIDUE entries are created only by the consolidation pipeline.
- P5.3: Each RESIDUE entry records `sourceIds` — the IDs of the original entries that were compressed.
- P5.4: Content compression: `residue.content = episode.content.slice(0, floor(len × compressionRatio))`.
- P5.5: Tags and metadata from source entries are preserved in full.
- P5.6: RESIDUE entry weights do not change after creation.
- P5.7: When `max_summaries` is exceeded, the oldest RESIDUE entries (smallest `compressedAt`) are dropped.

**Priority**: 2

---

### Layer 6: CORE

**Purpose**: Immutable foundational identity and constraint store.

**Formal properties**:
- P6.1: CORE entry weight is always exactly `1.0`. It cannot be set to any other value.
- P6.2: CORE entries are write-once. Once stored, they cannot be updated or deleted via any public API.
- P6.3: CORE entries do not decay.
- P6.4: CORE entries are always returned first in recall results, before entries from any other layer.
- P6.5: Multiple CORE entries matching the same query are all returned, sorted by `createdAt` descending.

**Priority**: 1 (highest)

---

## Decay Formulas

Let:
- `t` = elapsed time in milliseconds since `entry.eventAt`
- `h` = half-life in milliseconds
- `w₀` = weight at the previous decay step
- `w(t)` = new weight after decay

### Exponential Decay

```
w(t) = w₀ × 2^(−t / h)     if h > 0
w(t) = w₀                   if h = 0
```

Properties:
- `w(0) = w₀` — weight is unchanged at t=0
- `w(h) = w₀ / 2` — weight is halved at t=halfLife
- `w(2h) = w₀ / 4` — weight is quartered at t=2×halfLife
- `lim(t→∞) w(t) = 0` — weight approaches zero asymptotically

### Linear Decay

```
w(t) = w₀ × max(0, 1 − t / (2h))
```

Properties:
- `w(0) = w₀`
- `w(h) = w₀ / 2`
- `w(2h) = 0` — fully decayed at t=2×halfLife
- `w(t) = 0` for all `t >= 2h`

### Step Decay

```
w(t) = w₀ × 0.5^floor(t / h)
```

Properties:
- `w(t) = w₀` for `t < h`
- `w(t) = w₀ / 2` for `h <= t < 2h`
- `w(t) = w₀ / 4` for `2h <= t < 3h`
- Halves discretely at each halfLife boundary

### applyDecay

The `applyDecay` function applies the selected decay function to an existing weight:

```
applyDecay(currentWeight, elapsed, halfLife, fn = 'exponential') =
  currentWeight × decayFactor(elapsed, halfLife, fn)
```

This is applied cumulatively: each call to `engine.decay()` updates `entry.weight` based on elapsed time since `entry.eventAt`, not since the last decay call. This ensures idempotency regardless of how frequently decay is called.

---

## Priority Resolution Algorithm

Given a recall query `q` and a set of candidate entries `E` from all searched layers:

```
1. For each layer L in searchOrder:
     candidates_L = L.search(q)
     for each entry e in candidates_L:
       e.layerPriority = PRIORITY[e.layer]

2. Filter: remove entries where e.weight < minWeight

3. Sort E by (e.layerPriority ASC, e.weight DESC)
   — lower layerPriority = higher precedence
   — within same priority, higher weight first

4. Apply limit: E = E.slice(0, limit)

5. resolvedLayer = E[0].layer if |E| > 0 else null

6. Return RecallResult { entries: E, resolvedLayer, query: q }
```

Priority values:
```
CORE    = 1
RESIDUE = 2
SKILL   = 3
GRAPH   = 4
EPISODE = 5
BUFFER  = 6
```

---

## Consolidation Rules

Consolidation is an explicit operation called by the host application. It does not run automatically.

### Rule C1: Buffer Flush

```
for each entry e in buffer.flush():
  episode.store(e.content, {
    importance: e.importance,
    tags: e.tags,
    eventAt: e.createdAt,
  })
  bufferToEpisode++
```

After flush, `buffer.size() = 0`.

### Rule C2: Episode Compression

```
threshold = config.consolidation.weightThreshold  // default: 0.1

for each entry e in episode.getAll():
  if e.weight < threshold:
    residue.compress(e)
    episode.remove(e.id)
    graphToResidue++
```

The variable `graphToResidue` is a historical naming artifact. It counts episodes compressed to residue, not graph entries.

### Rule C3: Residue Cap

After consolidation, if `residue.size() > max_summaries`:
```
toRemove = residue.size() - max_summaries
drop the toRemove oldest entries (smallest compressedAt)
```

---

## Config Schema

The canonical config schema, expressed as TypeScript types:

```typescript
interface EngramConfig {
  agent: {
    id: string;           // default: "unnamed-agent"
    version: string;      // default: "0.0.0"
  };
  memory: {
    buffer: {
      ttl: string;           // duration string, default: "5m"
      capacity: number;      // default: 1000
      strategy: 'lru' | 'fifo'; // default: "lru"
    };
    episode: {
      half_life: string;     // duration string, default: "2h"
      max_entries: number;   // default: 500
      decay: 'exponential' | 'linear' | 'step'; // default: "exponential"
      persistent: boolean;   // default: false
      storage: 'memory' | 'json'; // default: "memory"
      storage_path: string;  // default: "./"
    };
    graph: {
      persistent: boolean;
      storage: 'memory' | 'json';
      storage_path: string;
    };
    skill: {
      persistent: boolean;
      storage: 'memory' | 'json';
      storage_path: string;
    };
    residue: {
      max_summaries: number;      // default: 200
      compression_ratio: number;  // default: 0.3
      persistent: boolean;
      storage: 'memory' | 'json';
      storage_path: string;
    };
    core: {
      immutable: true;            // always true
      persistent: boolean;
      storage: 'memory' | 'json';
      storage_path: string;
    };
  };
}
```

---

## API Contract

### `engine.store(layer, content, options?)`

Store a memory entry in the specified layer.

**Preconditions**:
- Engine must be initialized (`engine.init()` must have been called)
- `layer` must be one of: `'buffer' | 'episode' | 'graph' | 'skill' | 'core'`
- Calling with `layer = 'residue'` throws `Error` with message matching `/consolidate/i`

**Postconditions**:
- A new `MemoryEntry` is created and stored in the target layer
- The entry is immediately available via `recall()` and `layer.get()`

**Returns**: `Promise<MemoryEntry>`

---

### `engine.recall(query, options?)`

Retrieve memory entries matching a query string.

**Options**:
```typescript
{
  layers?: LayerName[];   // layers to search; default: all layers
  limit?: number;         // max entries to return; default: 10
  minWeight?: number;     // minimum weight filter; default: 0
  key?: string;           // exact key lookup (graph/skill only)
}
```

**Returns**: `Promise<RecallResult>`

```typescript
interface RecallResult {
  entries: MemoryEntry[];
  resolvedLayer: LayerName | null;
  query: string;
}
```

**Guarantees**:
- Results are sorted by priority (CORE first) then weight (highest first)
- CORE entries always appear before non-CORE entries when both match the query
- Weight filtering is applied before limit

---

### `engine.decay()`

Run a decay pass on all layers.

**Returns**: `Promise<DecayResult[]>`

```typescript
interface DecayResult {
  layer: LayerName;
  processed: number;   // entries examined
  expired: number;     // entries removed (BUFFER TTL expiry)
  decayed: number;     // entries whose weight was reduced (EPISODE)
}
```

**Guarantees**:
- One `DecayResult` is returned per layer, in priority order
- CORE and GRAPH layers always return `{ expired: 0, decayed: 0 }`
- BUFFER returns only `expired` (no weight reduction)
- EPISODE returns only `decayed` (no hard expiry)

---

### `engine.consolidate()`

Flush BUFFER to EPISODE and compress low-weight EPISODES to RESIDUE.

**Returns**: `Promise<ConsolidateResult>`

```typescript
interface ConsolidateResult {
  bufferToEpisode: number;   // entries moved buffer → episode
  graphToResidue: number;    // episodes compressed → residue
}
```

**Guarantees**:
- After consolidation, `engine.buffer.size() === 0`
- All flushed buffer entries appear in the episode layer
- Episodes with `weight < consolidationThreshold` are removed from episode and appear in residue

---

### `engine.stats()`

Return the current entry count per layer.

**Returns**: `EngineStats` (synchronous)

```typescript
interface EngineStats {
  buffer: number;
  episode: number;
  graph: number;
  skill: number;
  residue: number;
  core: number;
}
```

---

## Implementation Notes

### Thread safety

ENGRAM is designed for single-threaded Node.js use. Layer operations are synchronous and not protected against concurrent modification. If you need concurrent access, serialize calls to the engine externally.

### ID generation

Entry IDs are generated using `crypto.randomUUID()`. This requires Node.js >= 14.17.0. The `engine.init()` check will throw if `crypto.randomUUID` is unavailable.

### Memory usage

With default config (capacity 1000 buffer, 500 episodes, etc.), ENGRAM's in-memory footprint for typical string content is well under 10MB. For very large content strings (>10KB per entry), reduce capacity accordingly.

### JSON storage atomicity

When using `storage = "json"`, writes are not atomic at the file system level. If the process crashes mid-write, the JSON file may be corrupted. For production use, consider wrapping the JSON backend with a write-then-rename pattern, or use a proper database backend.

### Idempotency of decay

Because decay is computed relative to `entry.eventAt` (not relative to the last decay call), calling `engine.decay()` multiple times without waiting for time to pass is safe — weights will converge to the same value regardless of how many decay calls are made in a single millisecond.

### Compatibility

ENGRAM requires Node.js >= 18.0.0 for:
- `node:test` (test runner)
- `crypto.randomUUID()` (stable API)
- Top-level await in ESM modules
