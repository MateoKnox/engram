import { randomUUID } from 'node:crypto';
import type { SkillEntry, SkillConfig, StoreOptions } from '../types.js';

export class SkillLayer {
  private _map = new Map<string, SkillEntry>();
  private config: Required<SkillConfig>;

  constructor(config: SkillConfig = {}) {
    this.config = {
      persistent: config.persistent ?? false,
      storage: config.storage ?? 'memory',
      storage_path: config.storage_path ?? './engram-skills.json',
    };
  }

  store(content: string, options: StoreOptions = {}): SkillEntry {
    const now = Date.now();
    const id = randomUUID();
    const entry: SkillEntry = {
      id,
      content,
      layer: 'skill',
      metadata: options.metadata ?? {},
      createdAt: now,
      updatedAt: now,
      weight: options.importance ?? 1.0,
      tags: options.tags ?? [],
      procedure: options.procedure ?? content,
      triggerPattern: options.triggerPattern,
    };
    this._map.set(id, entry);
    return entry;
  }

  getAll(): SkillEntry[] { return [...this._map.values()]; }

  search(query: string): SkillEntry[] {
    const q = query.toLowerCase();
    return [...this._map.values()].filter(e =>
      e.content.toLowerCase().includes(q) ||
      e.procedure.toLowerCase().includes(q) ||
      (e.triggerPattern && e.triggerPattern.toLowerCase().includes(q)) ||
      e.tags.some(t => t.toLowerCase().includes(q))
    );
  }

  matchTrigger(input: string): SkillEntry[] {
    return [...this._map.values()].filter(e => {
      if (!e.triggerPattern) return false;
      try {
        const re = new RegExp(e.triggerPattern, 'i');
        return re.test(input);
      } catch { return false; }
    });
  }

  size(): number { return this._map.size; }
  clear(): void { this._map.clear(); }
}
