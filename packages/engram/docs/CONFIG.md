# ENGRAM Configuration Reference

ENGRAM is configured via a `engram.toml` file. The file is optional — all options have defaults. Pass the path to `EngramEngine` at construction time, or omit it to use defaults.

```typescript
// Explicit config path
const engine = new EngramEngine('./engram.toml');

// Default config (no file)
const engine = new EngramEngine();
```

---

## Full Example

```toml
# engram.toml — Full configuration reference

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
persistent = false
storage = "memory"
storage_path = "./"

[memory.graph]
persistent = false
storage = "memory"
storage_path = "./"

[memory.skill]
persistent = false
storage = "memory"
storage_path = "./"

[memory.residue]
max_summaries = 200
compression_ratio = 0.3
persistent = false
storage = "memory"
storage_path = "./"

[memory.core]
immutable = true
persistent = false
storage = "memory"
storage_path = "./"
```

---

## [agent] Section

| Option | Type | Default | Description |
|---|---|---|---|
| `id` | string | `"unnamed-agent"` | Unique identifier for this agent instance. Used in log output and persisted storage filenames. |
| `version` | string | `"0.0.0"` | Semantic version string for the agent configuration. Informational only. |

---

## [memory.buffer] Section

The buffer is the short-term working memory layer. Entries expire automatically after `ttl` and are evicted when `capacity` is reached.

| Option | Type | Default | Description |
|---|---|---|---|
| `ttl` | duration string | `"5m"` | Time-to-live for each buffer entry. After this duration elapses, the entry is expired and removed. |
| `capacity` | integer | `1000` | Maximum number of live entries in the buffer. When this limit is reached, entries are evicted according to `strategy`. |
| `strategy` | `"lru"` \| `"fifo"` | `"lru"` | Eviction strategy when capacity is exceeded. `lru` evicts the least recently accessed entry. `fifo` evicts the oldest entry by insertion order. |

### Notes

- Buffer entries are never persisted to disk. Setting `persistent = true` on buffer has no effect.
- TTL expiry is enforced lazily (on `get()`) and eagerly (on `decay()`).
- Setting `ttl` to a very small value (e.g., `"50ms"`) is supported and useful for testing.

---

## [memory.episode] Section

The episode layer is a timestamped event log with configurable weight decay.

| Option | Type | Default | Description |
|---|---|---|---|
| `half_life` | duration string | `"2h"` | The half-life for weight decay. After this duration, an entry's weight is halved (for exponential decay). Controls how quickly old episodes become less relevant. |
| `max_entries` | integer | `500` | Maximum number of episode entries to retain. When exceeded, the lowest-weight entries are dropped during decay or consolidation. |
| `decay` | `"exponential"` \| `"linear"` \| `"step"` | `"exponential"` | The decay function to apply to entry weights. See the Decay Functions section below. |
| `persistent` | boolean | `false` | Whether to persist episode entries to disk on change. Requires `storage = "json"`. |
| `storage` | `"memory"` \| `"json"` | `"memory"` | Storage backend. `memory` is in-process only. `json` writes to a JSON file at `storage_path`. |
| `storage_path` | string | `"./"` | Directory path for JSON storage files. Used when `storage = "json"`. |

---

## [memory.graph] Section

The graph layer is a persistent key-value store for semantic facts.

| Option | Type | Default | Description |
|---|---|---|---|
| `persistent` | boolean | `false` | Whether to persist graph entries to disk. |
| `storage` | `"memory"` \| `"json"` | `"memory"` | Storage backend. |
| `storage_path` | string | `"./"` | Directory path for JSON storage files. |

### Notes

- Graph entries do not decay. Once stored, they remain at their original weight indefinitely.
- Entries with a `key` field can be retrieved by exact key lookup via `engine.recall('', { key: '...' })`.

---

## [memory.skill] Section

The skill layer stores procedural behaviors and trigger-pattern rules.

| Option | Type | Default | Description |
|---|---|---|---|
| `persistent` | boolean | `false` | Whether to persist skill entries to disk. |
| `storage` | `"memory"` \| `"json"` | `"memory"` | Storage backend. |
| `storage_path` | string | `"./"` | Directory path for JSON storage files. |

### Notes

- Skill entries with a `triggerPattern` field are matched against recall queries using `new RegExp(triggerPattern)`.
- Skill entries do not decay.

---

## [memory.residue] Section

The residue layer holds compressed traces of expired episodes. It is not directly writable — entries are created only by the consolidation pipeline.

| Option | Type | Default | Description |
|---|---|---|---|
| `max_summaries` | integer | `200` | Maximum number of residue entries to retain. When exceeded, the oldest entries are dropped. |
| `compression_ratio` | float (0–1) | `0.3` | Proportion of content to retain when compressing an episode into residue. `0.3` retains approximately 30% of the original text. |
| `persistent` | boolean | `false` | Whether to persist residue entries to disk. |
| `storage` | `"memory"` \| `"json"` | `"memory"` | Storage backend. |
| `storage_path` | string | `"./"` | Directory path for JSON storage files. |

---

## [memory.core] Section

The core layer holds immutable foundational identity facts. Entries are write-once and have a fixed weight of 1.0.

| Option | Type | Default | Description |
|---|---|---|---|
| `immutable` | boolean | `true` | Always true. This field is read-only and cannot be set to `false`. It is accepted in config for documentation purposes only. |
| `persistent` | boolean | `false` | Whether to persist core entries to disk. Recommended `true` for production agents. |
| `storage` | `"memory"` \| `"json"` | `"memory"` | Storage backend. |
| `storage_path` | string | `"./"` | Directory path for JSON storage files. |

---

## Duration Format Reference

Duration strings are used for `ttl` and `half_life` values. The format is a number followed immediately by a unit suffix, with no spaces.

| Suffix | Unit | Example | Milliseconds |
|---|---|---|---|
| `ms` | milliseconds | `"500ms"` | 500 |
| `s` | seconds | `"30s"` | 30,000 |
| `m` | minutes | `"5m"` | 300,000 |
| `h` | hours | `"2h"` | 7,200,000 |
| `d` | days | `"1d"` | 86,400,000 |
| `w` | weeks | `"1w"` | 604,800,000 |

### Examples

```
"50ms"   →  50 milliseconds  (useful for testing)
"30s"    →  30 seconds
"5m"     →  5 minutes
"2h"     →  2 hours
"1d"     →  1 day
"7d"     →  1 week
"1w"     →  1 week
"24h"    →  1 day
```

### Invalid formats

The parser throws `Error: Invalid duration: "5x"` for unrecognized suffixes. Valid suffixes are exactly: `ms`, `s`, `m`, `h`, `d`, `w`.

---

## Storage Backends

### `memory` (default)

All data is stored in-process in JavaScript `Map` structures. This is the default for all layers.

- No I/O overhead
- Data is lost when the process exits
- Appropriate for ephemeral agents or testing

### `json`

Data is persisted to a JSON file in the configured `storage_path` directory. The filename is derived from the agent ID and layer name:

```
{storage_path}/{agent.id}.{layer}.json
```

For example, with `agent.id = "research-assistant"` and `storage_path = "./"`:

```
./research-assistant.episode.json
./research-assistant.graph.json
./research-assistant.skill.json
./research-assistant.residue.json
./research-assistant.core.json
```

JSON storage writes synchronously after each mutation. For high-frequency writes (e.g., storing every buffer entry), prefer `memory` storage and use JSON only for layers that change infrequently (GRAPH, SKILL, CORE).

---

## Config Merging

ENGRAM deep-merges the file config over the default config. You only need to specify the options you want to override. For example:

```toml
# Minimal config — only change episode half-life
[memory.episode]
half_life = "12h"
```

All other options remain at their defaults.

If no config file is found at the specified path, ENGRAM logs a warning and continues with defaults. This is intentional — the engine should not crash because a config file is missing.

---

## Environment Variable Overrides

ENGRAM respects the following environment variables, which take precedence over file config:

| Variable | Overrides | Example |
|---|---|---|
| `ENGRAM_AGENT_ID` | `agent.id` | `ENGRAM_AGENT_ID=prod-agent-1` |
| `ENGRAM_BUFFER_TTL` | `memory.buffer.ttl` | `ENGRAM_BUFFER_TTL=10m` |
| `ENGRAM_EPISODE_HALF_LIFE` | `memory.episode.half_life` | `ENGRAM_EPISODE_HALF_LIFE=4h` |
| `ENGRAM_STORAGE` | All `storage` fields | `ENGRAM_STORAGE=json` |
| `ENGRAM_STORAGE_PATH` | All `storage_path` fields | `ENGRAM_STORAGE_PATH=/var/data/engram` |
