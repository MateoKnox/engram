import { randomUUID } from 'node:crypto';
import { parseDuration, applyDecay } from '../decay.js';
import type { EpisodeEntry, EpisodeConfig, StoreOptions, DecayFunction } from '../types.js';

export class EpisodeLayer {
  private _entries: EpisodeEntry[] = [];
  private config: Required<EpisodeConfig>;

  constructor(config: EpisodeConfig = {}) {
    this.config = {
      half_life: config.half_life ?? '2h',
      max_entries: config.max_entries ?? 500,
      decay: config.decay ?? 'exponential',
    };
  }

  private get halfLifeMs(): number {
    return parseDuration(this.config.half_life);
  }

  store(content: string, options: StoreOptions = {}): EpisodeEntry {
    const now = Date.now();
    const entry: EpisodeEntry = {
      id: randomUUID(),
      content,
      layer: 'episode',
      metadata: options.metadata ?? {},
      createdAt: now,
      updatedAt: now,
      weight: options.importance ?? 1.0,
      tags: options.tags ?? [],
      halfLifeMs: this.halfLifeMs,
      eventAt: options.eventAt ?? now,
    };

    this.store.push(entry);
    if (this.store.length > this.config.max_entries) {
      this.store.shift(); // FIFO overflow
    }
    return entry;
  }

  getAll(): EpisodeEntry[] { return [...this.store]; }

  search(query: string): EpisodeEntry[] {
    const q = query.toLowerCase();
    return this.store.filter(e =>
      e.content.toLowerCase().includes(q) ||
      e.tags.some(t => t.toLowerCase().includes(q))
    ).sort((a, b) => b.weight - a.weight);
  }

  decay(): { processed: number; decayed: number } {
    const now = Date.now();
    let decayed = 0;
    for (const entry of this.store) {
      const elapsed = now - entry.eventAt;
      const newWeight = applyDecay(entry.weight, elapsed, entry.halfLifeMs, this.config.decay as DecayFunction);
      if (newWeight !== entry.weight) decayed++;
      entry.weight = newWeight;
      entry.updatedAt = now;
    }
    return { processed: this.store.length, decayed };
  }

  /** Returns entries with weight below threshold (candidates for residue compression) */
  getExpired(threshold = 0.1): EpisodeEntry[] {
    return this.store.filter(e => e.weight < threshold);
  }

  removeByIds(ids: string[]): void {
    const idSet = new Set(ids);
    this.store = this.store.filter(e => !idSet.has(e.id));
  }

  size(): number { return this.store.length; }
  clear(): void { this.store = []; }
}
