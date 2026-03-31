# Contributing to @MateoKnox/engram

Thank you for your interest in contributing to ENGRAM. This document covers development setup, testing, code style, and the pull request process.

---

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git

### Clone and install

```bash
git clone https://github.com/MateoKnox/engram.git
cd engram
npm install
```

### Build

```bash
npm run build
```

This compiles TypeScript to `dist/` using `tsc`. The build output targets ESM (`"module": "NodeNext"`).

### Watch mode

```bash
npm run dev
```

Runs `tsc --watch` for incremental compilation during development.

---

## Running Tests

ENGRAM uses the built-in `node:test` runner. No additional test framework is required.

### Run all tests

```bash
npm test
```

### Run a specific test file

```bash
node --import tsx/esm tests/buffer.test.ts
node --import tsx/esm tests/decay.test.ts
node --import tsx/esm tests/engine.test.ts
```

### Run tests with coverage

```bash
npm run test:coverage
```

This uses Node's built-in `--experimental-test-coverage` flag and outputs a summary to stdout.

### Test output

The test runner uses `node:test`'s TAP reporter. Passing tests emit a dot; failing tests print a diff. Example:

```
TAP version 13
ok 1 - BufferLayer > stores and retrieves an entry
ok 2 - BufferLayer > search finds matching entries
ok 3 - BufferLayer > expires entries after TTL
...
# tests 18
# pass  18
# fail  0
```

---

## Project Structure

```
packages/engram/
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ index.ts          â† public exports
â”‚   â”œâ”€â”€ engine.ts         â† EngramEngine
â”‚   â”œâ”€â”€ config.ts         â† config loading and defaults
â”‚   â”œâ”€â”€ decay.ts          â† decay math and parseDuration
â”‚   â”œâ”€â”€ types.ts          â† shared TypeScript interfaces
â”‚   â””â”€â”€ layers/
â”‚       â”œâ”€â”€ buffer.ts
â”‚       â”œâ”€â”€ episode.ts
â”‚       â”œâ”€â”€ graph.ts
â”‚       â”œâ”€â”€ skill.ts
â”‚       â”œâ”€â”€ residue.ts
â”‚       â””â”€â”€ core.ts
â”œâ”€â”€ tests/
â”‚   â”œâ”€â”€ engine.test.ts
â”‚   â”œâ”€â”€ buffer.test.ts
â”‚   â””â”€â”€ decay.test.ts
â”œâ”€â”€ examples/
â”‚   â”œâ”€â”€ engram.toml
â”‚   â”œâ”€â”€ basic-usage.ts
â”‚   â””â”€â”€ with-openai.ts
â”œâ”€â”€ docs/
â”‚   â”œâ”€â”€ QUICKSTART.md
â”‚   â”œâ”€â”€ ARCHITECTURE.md
â”‚   â”œâ”€â”€ LAYERS.md
â”‚   â”œâ”€â”€ CONFIG.md
â”‚   â””â”€â”€ CHANGELOG.md
â”œâ”€â”€ spec/
â”‚   â””â”€â”€ ENGRAM.md
â””â”€â”€ package.json
```

---

## Code Style

### TypeScript

- Target: ES2022, module: NodeNext
- Strict mode is enabled (`"strict": true`)
- No `any` types unless strictly necessary. Use `unknown` and narrow with type guards.
- Prefer `interface` over `type` for object shapes
- Use `const` by default; `let` only when reassignment is needed
- Arrow functions for callbacks and short utilities; named `function` declarations for top-level functions

### Naming conventions

| Thing | Convention | Example |
|---|---|---|
| Classes | PascalCase | `EngramEngine`, `BufferLayer` |
| Interfaces | PascalCase | `MemoryEntry`, `RecallResult` |
| Functions | camelCase | `parseDuration`, `applyDecay` |
| Constants | UPPER_SNAKE_CASE | `LAYER_PRIORITY` |
| Files | kebab-case | `buffer.ts`, `decay.ts` |

### Formatting

ENGRAM uses Prettier with default settings. Run before committing:

```bash
npm run format
```

To check without writing:

```bash
npm run format:check
```

### Linting

```bash
npm run lint
```

Uses ESLint with the `@typescript-eslint` plugin. All lint errors must be resolved before merging. Warnings are allowed but should be minimized.

---

## Submitting Pull Requests

### Before opening a PR

1. Fork the repository and create a feature branch from `main`:
   ```bash
   git checkout -b feat/my-feature
   ```

2. Make your changes. Add tests for any new behavior.

3. Ensure all tests pass:
   ```bash
   npm test
   ```

4. Ensure the build succeeds:
   ```bash
   npm run build
   ```

5. Run format and lint:
   ```bash
   npm run format && npm run lint
   ```

6. Update `docs/CHANGELOG.md` with a brief description of your change under `[Unreleased]`.

### PR title format

Use the conventional commits format:

```
feat: add JSON storage backend for graph layer
fix: correct LRU eviction when capacity is 1
docs: improve QUICKSTART example
test: add coverage for step decay edge cases
refactor: extract parseDuration into own module
chore: update dependencies
```

### PR description

Include:
- What problem does this solve?
- How does it solve it?
- Any trade-offs or design decisions worth discussing?
- How was it tested?

### Review process

- All PRs require at least one approving review
- CI must pass (build, test, lint)
- The PR author is responsible for resolving review comments
- Squash-merge is preferred to keep a clean history

---

## Reporting Issues

### Bug reports

Please include:
- Node.js version (`node --version`)
- ENGRAM version
- Minimal reproduction (code snippet or test case)
- Expected behavior
- Actual behavior
- Stack trace if applicable

### Feature requests

Describe:
- The use case you are trying to solve
- Your proposed API (if you have one)
- Any alternatives you considered

### Security issues

Do not open a public GitHub issue for security vulnerabilities. Email `security@github.com/MateoKnox/engram` with details. We will respond within 48 hours.

---

## Versioning

ENGRAM follows [Semantic Versioning](https://semver.org/):

- **Patch** (`0.1.x`): Bug fixes, documentation updates, no API changes
- **Minor** (`0.x.0`): New features, backward-compatible API additions
- **Major** (`x.0.0`): Breaking API changes

Breaking changes require:
1. A migration guide in `docs/`
2. A deprecation notice in the previous minor version
3. Clear documentation in `CHANGELOG.md`

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
