import { randomUUID } from 'node:crypto';
import { parseDuration } from '../decay.js';
import type { BufferEntry, BufferConfig, StoreOptions } from '../types.js';

export class BufferLayer {
  private _map = new Map<string, BufferEntry>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private config: Required<BufferConfig>;

  constructor(config: BufferConfig = {}) {
    this.config = {
      ttl: config.ttl ?? '5m',
      capacity: config.capacity ?? 1000,
      strategy: config.strategy ?? 'lru',
    };
  }

  private get ttlMs(): number {
    return parseDuration(this.config.ttl);
  }

  store(content: string, options: StoreOptions = {}): BufferEntry {
    const now = Date.now();
    const ttlMs = this.ttlMs;
    const id = randomUUID();
    const entry: BufferEntry = {
      id,
      content,
      layer: 'buffer',
      metadata: options.metadata ?? {},
      createdAt: now,
      updatedAt: now,
      weight: options.importance ?? 1.0,
      tags: options.tags ?? [],
      expiresAt: now + ttlMs,
      ttlMs,
    };

    // Enforce capacity
    if (this.store.size >= this.config.capacity) {
      this.evict();
    }

    this.store.set(id, entry);

    // Auto-expire
    const timer = setTimeout(() => {
      this.store.delete(id);
      this.timers.delete(id);
    }, ttlMs);
    if (timer.unref) timer.unref(); // don't block process exit
    this.timers.set(id, timer);

    return entry;
  }

  private evict(): void {
    if (this.config.strategy === 'fifo') {
      const firstKey = this.store.keys().next().value;
      if (firstKey) this.delete(firstKey);
    } else {
      // LRU: delete oldest by createdAt
      let oldest: BufferEntry | undefined;
      for (const entry of this.store.values()) {
        if (!oldest || entry.createdAt < oldest.createdAt) oldest = entry;
      }
      if (oldest) this.delete(oldest.id);
    }
  }

  private delete(id: string): void {
    this.store.delete(id);
    const timer = this.timers.get(id);
    if (timer) { clearTimeout(timer); this.timers.delete(id); }
  }

  get(id: string): BufferEntry | undefined {
    const entry = this.store.get(id);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) { this.delete(id); return undefined; }
    return entry;
  }

  getAll(): BufferEntry[] {
    const now = Date.now();
    const valid: BufferEntry[] = [];
    for (const entry of this.store.values()) {
      if (now > entry.expiresAt) { this.delete(entry.id); }
      else { valid.push(entry); }
    }
    return valid;
  }

  search(query: string): BufferEntry[] {
    const q = query.toLowerCase();
    return this.getAll().filter(e =>
      e.content.toLowerCase().includes(q) ||
      e.tags.some(t => t.toLowerCase().includes(q))
    );
  }

  flush(): BufferEntry[] {
    const all = this.getAll();
    for (const e of all) this.delete(e.id);
    return all;
  }

  decay(): { expired: number; remaining: number } {
    const now = Date.now();
    let expired = 0;
    for (const entry of [...this.store.values()]) {
      if (now > entry.expiresAt) { this.delete(entry.id); expired++; }
    }
    return { expired, remaining: this.store.size };
  }

  size(): number { return this.store.size; }

  clear(): void {
    for (const id of [...this.timers.keys()]) this.delete(id);
    this.store.clear();
  }
}
