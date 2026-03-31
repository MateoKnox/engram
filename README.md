```
 ██████╗ ██╗  ██╗ ██████╗ ███████╗████████╗    ██████╗ ██████╗  ██████╗ ████████╗ ██████╗  ██████╗ ██████╗ ██╗
██╔════╝ ██║  ██║██╔═══██╗██╔════╝╚══██╔══╝    ██╔══██╗██╔══██╗██╔═══██╗╚══██╔══╝██╔═══██╗██╔════╝██╔═══██╗██║
██║  ███╗███████║██║   ██║███████╗   ██║       ██████╔╝██████╔╝██║   ██║   ██║   ██║   ██║██║     ██║   ██║██║
██║   ██║██╔══██║██║   ██║╚════██║   ██║       ██╔═══╝ ██╔══██╗██║   ██║   ██║   ██║   ██║██║     ██║   ██║██║
╚██████╔╝██║  ██║╚██████╔╝███████║   ██║       ██║     ██║  ██║╚██████╔╝   ██║   ╚██████╔╝╚██████╗╚██████╔╝███████╗
 ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝   ╚═╝       ╚═╝     ╚═╝  ╚═╝ ╚═════╝    ╚═╝    ╚═════╝  ╚═════╝ ╚═════╝ ╚══════╝
```

<div align="center">

*Home of the ENGRAM Agent Memory Engine*

[![license](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4%2B-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![node](https://img.shields.io/node/v/@MateoKnox/engram.svg?style=flat-square)](https://nodejs.org)

</div>

---

## What's here

This is the monorepo for [`@MateoKnox/engram`](https://www.npmjs.com/package/@MateoKnox/engram) — a structured, layered memory engine for AI agents. Six purpose-built memory layers, explicit priority-ordered recall, configurable decay, and zero dependencies.

---

## Packages

| Package | Path | Description |
|---|---|---|
| [`@MateoKnox/engram`](https://www.npmjs.com/package/@MateoKnox/engram) | [`packages/engram/`](./packages/engram/) | The Agent Memory Engine — six-layer structured memory for AI agents |

---

## Quick links

| | |
|---|---|
| [packages/engram/README.md](./packages/engram/README.md) | Full library docs — install, API, layers, config, examples |
| [packages/engram/docs/QUICKSTART.md](./packages/engram/docs/QUICKSTART.md) | 5-minute getting started guide |
| [packages/engram/docs/ARCHITECTURE.md](./packages/engram/docs/ARCHITECTURE.md) | System design and data flow |
| [packages/engram/docs/LAYERS.md](./packages/engram/docs/LAYERS.md) | Deep dive into each of the six layers |
| [packages/engram/docs/CONFIG.md](./packages/engram/docs/CONFIG.md) | Full `engram.toml` configuration reference |
| [packages/engram/spec/ENGRAM.md](./packages/engram/spec/ENGRAM.md) | Formal specification |

---

## At a glance

```
  CORE  >  RESIDUE  >  SKILL  >  GRAPH  >  EPISODE  >  BUFFER
  ────────────────────────────────────────────────────────────
  immutable   compressed   procedural   semantic   timestamped   transient
  identity    traces       behaviors    facts      event log     context
```

Six layers. Each with distinct persistence, decay, and recall priority. Together they give your agent a memory system that's transparent, auditable, and behaves predictably in production.

---

## Install

```bash
npm install @MateoKnox/engram
```

Requires Node.js >= 18. No other dependencies.

See the [full README](./packages/engram/README.md) for the complete API reference, layer documentation, configuration guide, and integration examples.

---

## License

MIT — Copyright © 2026 MateoKnox

[github.com/MateoKnox/engram](https://github.com/MateoKnox/engram)
