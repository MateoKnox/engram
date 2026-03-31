import { randomUUID } from 'node:crypto';
import type { CoreEntry, CoreConfig, StoreOptions } from '../types.js';

export class CoreLayer {
  private _entries: CoreEntry[] = [];
  private config: Required<CoreConfig>;

  constructor(config: CoreConfig = {}) {
    this.config = {
      immutable: config.immutable ?? true,
      storage: config.storage ?? 'memory',
      storage_path: config.storage_path ?? './engram-core.json',
    };
  }

  store(content: string, options: StoreOptions = {}): CoreEntry {
    const now = Date.now();
    const entry: CoreEntry = {
      id: randomUUID(),
      content,
      layer: 'core',
      metadata: { ...options.metadata, immutable: true },
      createdAt: now,
      updatedAt: now,
      weight: 1.0,
      tags: options.tags ?? [],
      immutable: true,
    };
    this.store.push(entry);
    return entry;
  }

  getAll(): CoreEntry[] { return [...this.store]; }

  search(query: string): CoreEntry[] {
    const q = query.toLowerCase();
    return this.store.filter(e =>
      e.content.toLowerCase().includes(q) ||
      e.tags.some(t => t.toLowerCase().includes(q))
    );
  }

  /** Core entries cannot be deleted (immutable) — this is a no-op */
  delete(_id: string): false { return false; }

  size(): number { return this.store.length; }

  /** Core is never cleared — provides persistent read-only access */
  clear(): void { /* intentionally no-op */ }
}
