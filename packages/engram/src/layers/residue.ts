import { randomUUID } from 'node:crypto';
import type { ResidueEntry, ResidueConfig, StoreOptions, LayerName } from '../types.js';

export class ResidueLayer {
  private _entries: ResidueEntry[] = [];
  private config: Required<ResidueConfig>;

  constructor(config: ResidueConfig = {}) {
    this.config = {
      max_summaries: config.max_summaries ?? 200,
      compression_ratio: config.compression_ratio ?? 0.3,
    };
  }

  /**
   * Compress multiple entries from another layer into a residue summary.
   */
  compress(
    entries: Array<{ id: string; content: string; layer: LayerName }>,
    options: StoreOptions = {}
  ): ResidueEntry | null {
    if (entries.length === 0) return null;

    const now = Date.now();
    const summary = this.summarize(entries.map(e => e.content));
    const entry: ResidueEntry = {
      id: randomUUID(),
      content: summary,
      layer: 'residue',
      metadata: options.metadata ?? {},
      createdAt: now,
      updatedAt: now,
      weight: options.importance ?? 0.5,
      tags: options.tags ?? [],
      summary,
      sourceLayer: entries[0].layer,
      sourceIds: entries.map(e => e.id),
    };

    this._entries.push(entry);
    if (this._entries.length > this.config.max_summaries) {
      this._entries.shift();
    }
    return entry;
  }

  /** Basic extractive summarization: take first N chars of each entry, join */
  private summarize(contents: string[]): string {
    const maxPerEntry = Math.max(40, Math.floor(200 / Math.max(1, contents.length)));
    return contents
      .map(c => c.slice(0, maxPerEntry).replace(/\s+/g, ' ').trim())
      .join(' | ');
  }

  getAll(): ResidueEntry[] { return [...this._entries]; }

  search(query: string): ResidueEntry[] {
    const q = query.toLowerCase();
    return this._entries.filter(e =>
      e.summary.toLowerCase().includes(q) ||
      e.content.toLowerCase().includes(q) ||
      e.tags.some(t => t.toLowerCase().includes(q))
    );
  }

  size(): number { return this._entries.length; }
  clear(): void { this._entries = []; }
}
