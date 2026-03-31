```
      ░██████████ ░███    ░██   ░██████  ░█████████     ░███    ░███     ░███ 
      ░██         ░████   ░██  ░██   ░██ ░██     ░██   ░██░██   ░████   ░████ 
      ░██         ░██░██  ░██ ░██        ░██     ░██  ░██  ░██  ░██░██ ░██░██ 
      ░█████████  ░██ ░██ ░██ ░██  █████ ░█████████  ░█████████ ░██ ░████ ░██ 
      ░██         ░██  ░██░██ ░██     ██ ░██   ░██   ░██    ░██ ░██  ░██  ░██ 
      ░██         ░██   ░████  ░██  ░███ ░██    ░██  ░██    ░██ ░██       ░██ 
      ░██████████ ░██    ░███   ░█████░█ ░██     ░██ ░██    ░██ ░██       ░██                               
```

<div align="center">

### 🧠 ENGRAM — Agent Memory Engine

*A deterministic, layered memory system for AI agents.*

[![license](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4%2B-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![node](https://img.shields.io/node/v/@MateoKnox/engram.svg?style=flat-square)](https://nodejs.org)

</div>

---

## ✨ Overview

`engram` is a **structured memory engine for AI agents**.

Instead of dumping everything into a vector database or chat history, ENGRAM organizes memory into **six explicit layers**, each with:

- defined **purpose**
- controlled **decay**
- deterministic **recall priority**

This makes agent behavior:
- predictable
- debuggable
- production-safe

---

## 🧩 Why ENGRAM?

Most agent memory today is:
- opaque
- lossy
- hard to reason about

ENGRAM fixes that by making memory:

| Property | ENGRAM |
|--------|--------|
| Transparent | ✅ Fully inspectable layers |
| Deterministic | ✅ Priority-based recall |
| Controllable | ✅ Configurable decay + persistence |
| Lightweight | ✅ Zero dependencies |
| Production-ready | ✅ Designed for real systems |

---

## 🧠 Memory Architecture

```
CORE  >  RESIDUE  >  SKILL  >  GRAPH  >  EPISODE  >  BUFFER
────────────────────────────────────────────────────────────
identity   traces    behaviors   facts    event log   context
immutable  compressed procedural semantic timestamped transient
```

Each layer serves a **specific cognitive role**:

### 1. CORE — Identity
- Immutable truths about the agent
- System-level constraints
- Personality / role definitions

### 2. RESIDUE — Compressed Experience
- Distilled patterns from past interactions
- High-signal, low-noise memory

### 3. SKILL — Procedural Memory
- Learned behaviors and strategies
- Task execution logic

### 4. GRAPH — Semantic Knowledge
- Facts and relationships
- Structured understanding of the world

### 5. EPISODE — Event Log
- Timestamped interactions
- Historical trace of activity

### 6. BUFFER — Working Context
- Short-term memory
- Immediate conversational context

---

## ⚡ Key Features

- **Layered memory model** — no more “everything is context”
- **Priority-based recall** — CORE > BUFFER always
- **Configurable decay** — memory fades predictably
- **Zero dependencies** — minimal, portable
- **Deterministic behavior** — reproducible outputs
- **Auditable state** — inspect exactly what the agent “knows”

---

## 🚀 Installation

```bash
npm install @MateoKnox/engram
```

Requirements:
- Node.js >= 18

---

## ⚡ Quick Start

```ts
import { Engram } from "@MateoKnox/engram";

const memory = new Engram();

// Add memory
memory.remember({
  layer: "EPISODE",
  content: "User prefers concise responses",
});

// Recall memory
const context = memory.recall();
console.log(context);
```

---

## 🔧 Configuration

ENGRAM is fully configurable via `engram.toml`:

```toml
[decay]
buffer = 0.9
episode = 0.7
graph = 0.5

[priority]
core = 100
residue = 80
skill = 60
graph = 40
episode = 20
buffer = 10
```

You control:
- memory lifespan
- recall ordering
- compression behavior

---

## 🧠 Mental Model

Think of ENGRAM like a brain:

| Layer | Analogy |
|------|--------|
| CORE | Personality / identity |
| RESIDUE | Intuition |
| SKILL | Muscle memory |
| GRAPH | Knowledge |
| EPISODE | Memories |
| BUFFER | Thoughts |

---

## 📦 Packages

| Package | Description |
|---|---|
| `@MateoKnox/engram` | Core memory engine |

---

## 📚 Documentation

- [📘 Full Docs](./packages/engram/README.md)
- [⚡ Quickstart](./packages/engram/docs/QUICKSTART.md)
- [🏗 Architecture](./packages/engram/docs/ARCHITECTURE.md)
- [🧠 Layers Deep Dive](./packages/engram/docs/LAYERS.md)
- [⚙️ Config Reference](./packages/engram/docs/CONFIG.md)
- [📐 Specification](./packages/engram/spec/ENGRAM.md)

---

## 🛠 Use Cases

ENGRAM is designed for:

- Autonomous agents
- Chatbots with long-term memory
- AI copilots
- Simulation agents
- On-chain / decentralized agents
- Multi-agent systems

---

## 🔮 Philosophy

> Memory should not be magic.  
> It should be structured, inspectable, and predictable.

ENGRAM treats memory as a **first-class system**, not an afterthought.

---

## 🤝 Contributing

PRs, ideas, and experiments are welcome.

```bash
git clone https://github.com/MateoKnox/engram
cd engram
npm install
```

---

## 📄 License

MIT — Copyright © 2026 MateoKnox

---

## ⭐ Repo

https://github.com/MateoKnox/engram

---

<div align="center">

**ENGRAM → Memory that behaves like a system, not a black box.**

</div>
