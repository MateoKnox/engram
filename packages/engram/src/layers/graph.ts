import { randomUUID } from 'node:crypto';
import type { GraphEntry, GraphConfig, StoreOptions } from '../types.js';

export class GraphLayer {
  private _map = new Map<string, GraphEntry>(); // keyed by .key field
  private byId = new Map<string, GraphEntry>();
  private config: Required<GraphConfig>;

  constructor(config: GraphConfig = {}) {
    this.config = {
      persistent: config.persistent ?? false,
      storage: config.storage ?? 'memory',
      storage_path: config.storage_path ?? './engram-graph.json',
    };
  }

  store(content: string, options: StoreOptions = {}): GraphEntry {
    const now = Date.now();
    const key = options.key ?? content.slice(0, 64).toLowerCase().replace(/\s+/g, '-');
    const existing = this._map.get(key);

    if (existing) {
      // Update existing node
      existing.content = content;
      existing.metadata = { ...existing.metadata, ...options.metadata };
      existing.tags = [...new Set([...existing.tags, ...(options.tags ?? [])])];
      existing.updatedAt = now;
      existing.weight = Math.min(1, existing.weight + (options.importance ?? 0.1));
      return existing;
    }

    const entry: GraphEntry = {
      id: randomUUID(),
      content,
      layer: 'graph',
      metadata: options.metadata ?? {},
      createdAt: now,
      updatedAt: now,
      weight: options.importance ?? 1.0,
      tags: options.tags ?? [],
      key,
      persistent: this.config.persistent,
    };

    this._map.set(key, entry);
    this.byId.set(entry.id, entry);
    return entry;
  }

  get(key: string): GraphEntry | undefined { return this._map.get(key); }
  getById(id: string): GraphEntry | undefined { return this.byId.get(id); }
  getAll(): GraphEntry[] { return [...this._map.values()]; }

  search(query: string): GraphEntry[] {
    const q = query.toLowerCase();
    return [...this._map.values()]
      .filter(e =>
        e.key.includes(q) ||
        e.content.toLowerCase().includes(q) ||
        e.tags.some(t => t.toLowerCase().includes(q))
      )
      .sort((a, b) => b.weight - a.weight);
  }

  delete(key: string): boolean {
    const entry = this._map.get(key);
    if (!entry) return false;
    this._map.delete(key);
    this.byId.delete(entry.id);
    return true;
  }

  size(): number { return this._map.size; }
  clear(): void { this._map.clear(); this.byId.clear(); }
}
