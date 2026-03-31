# Changelog

All notable changes to @MateoKnox/engram are documented here.

## [0.1.0] — 2025-06-01

### Added
- Initial release of ENGRAM: The Agent Memory Engine
- Six-layer memory architecture: BUFFER, EPISODE, GRAPH, SKILL, RESIDUE, CORE
- TOML-based configuration via `engram.toml`
- `EngramEngine` class with `store()`, `recall()`, `decay()`, `consolidate()`, `stats()`
- Priority-ordered cross-layer retrieval (CORE > RESIDUE > SKILL > GRAPH > EPISODE > BUFFER)
- Exponential, linear, and step decay functions
- Buffer layer with TTL timers, LRU/FIFO eviction, and auto-expiry
- Episode layer with configurable half-life decay
- Graph layer as key-value semantic store
- Skill layer with trigger pattern matching
- Residue layer for compressed memory traces
- Core layer as immutable, write-once foundational store
- Duration string parsing ("5m", "2h", "1d", etc.)
- Deep-merge config with sensible defaults
- Full TypeScript types and declarations
- `examples/basic-usage.ts` and `examples/with-openai.ts`
- Test suite using `node:test`
