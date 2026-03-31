import { loadConfig } from './config.js';
import { BufferLayer } from './layers/buffer.js';
import { EpisodeLayer } from './layers/episode.js';
import { GraphLayer } from './layers/graph.js';
import { SkillLayer } from './layers/skill.js';
import { ResidueLayer } from './layers/residue.js';
import { CoreLayer } from './layers/core.js';
import { recall as recallFn, PRIORITY_ORDER } from './retrieval.js';
import type {
  EngramConfig, LayerName, AnyEntry,
  StoreOptions, RecallOptions, RecallResult,
  DecayResult, ConsolidateResult
} from './types.js';

export class EngramEngine {
  private config!: EngramConfig;
  private configPath?: string;

  buffer!: BufferLayer;
  episode!: EpisodeLayer;
  graph!: GraphLayer;
  skill!: SkillLayer;
  residue!: ResidueLayer;
  core!: CoreLayer;

  private initialized = false;

  constructor(configPath?: string) {
    this.configPath = configPath;
  }

  async init(): Promise<this> {
    this.config = loadConfig(this.configPath);
    const mc = this.config.memory ?? {};

    this.buffer = new BufferLayer(mc.buffer);
    this.episode = new EpisodeLayer(mc.episode);
    this.graph = new GraphLayer(mc.graph);
    this.skill = new SkillLayer(mc.skill);
    this.residue = new ResidueLayer(mc.residue);
    this.core = new CoreLayer(mc.core);

    this.initialized = true;
    return this;
  }

  private assertInit(): void {
    if (!this.initialized) {
      throw new Error('EngramEngine not initialized. Call await engine.init() first.');
    }
  }

  /**
   * Store a memory in the specified layer.
   */
  async store(layer: LayerName, content: string, options: StoreOptions = {}): Promise<AnyEntry> {
    this.assertInit();
    switch (layer) {
      case 'buffer':  return this.buffer.store(content, options);
      case 'episode': return this.episode.store(content, options);
      case 'graph':   return this.graph.store(content, options);
      case 'skill':   return this.skill.store(content, options);
      case 'core':    return this.core.store(content, options);
      case 'residue':
        throw new Error('Use engine.consolidate() to write to residue layer.');
      default:
        throw new Error(`Unknown layer: ${layer as string}`);
    }
  }

  /**
   * Recall memories across layers with priority resolution.
   */
  async recall(query: string, options: RecallOptions = {}): Promise<RecallResult> {
    this.assertInit();
    return recallFn(query, {
      buffer:  (q) => this.buffer.search(q),
      episode: (q) => this.episode.search(q),
      graph:   (q) => this.graph.search(q),
      skill:   (q) => this.skill.search(q),
      residue: (q) => this.residue.search(q),
      core:    (q) => this.core.search(q),
    }, options);
  }

  /**
   * Run a decay pass across all time-sensitive layers.
   */
  async decay(): Promise<DecayResult[]> {
    this.assertInit();
    const results: DecayResult[] = [];

    const bufferResult = this.buffer.decay();
    results.push({
      layer: 'buffer',
      processed: bufferResult.expired + bufferResult.remaining,
      expired: bufferResult.expired,
      decayed: 0,
    });

    const episodeResult = this.episode.decay();
    results.push({
      layer: 'episode',
      processed: episodeResult.processed,
      expired: 0,
      decayed: episodeResult.decayed,
    });

    // Graph, skill, core don't decay
    for (const layer of ['graph', 'skill', 'residue', 'core'] as LayerName[]) {
      results.push({ layer, processed: 0, expired: 0, decayed: 0 });
    }

    return results;
  }

  /**
   * Consolidate memories between layers:
   * - buffer → episode (flush active buffer to episode log)
   * - episode (low weight) → residue (compress decayed episodes)
   */
  async consolidate(): Promise<ConsolidateResult> {
    this.assertInit();
    let bufferToEpisode = 0;
    let episodeToGraph = 0;
    let graphToResidue = 0;

    // 1. Flush buffer → episode
    const flushed = this.buffer.flush();
    for (const entry of flushed) {
      this.episode.store(entry.content, {
        metadata: { ...entry.metadata, consolidatedFrom: 'buffer' },
        tags: entry.tags,
        importance: entry.weight,
        eventAt: entry.createdAt,
      });
      bufferToEpisode++;
    }

    // 2. Compress low-weight episodes → residue
    const decayed = this.episode.getExpired(0.1);
    if (decayed.length >= 3) {
      this.residue.compress(decayed, {
        tags: ['consolidated'],
        metadata: { sourceCount: decayed.length },
      });
      this.episode.removeByIds(decayed.map(e => e.id));
      graphToResidue = decayed.length;
    }

    return {
      bufferToEpisode,
      episodeToGraph,
      graphToResidue,
      total: bufferToEpisode + episodeToGraph + graphToResidue,
    };
  }

  /**
   * Get current memory statistics.
   */
  stats(): Record<LayerName, number> {
    this.assertInit();
    return {
      buffer: this.buffer.size(),
      episode: this.episode.size(),
      graph: this.graph.size(),
      skill: this.skill.size(),
      residue: this.residue.size(),
      core: this.core.size(),
    };
  }

  getConfig(): EngramConfig {
    this.assertInit();
    return this.config;
  }
}

// Suppress unused import warning — PRIORITY_ORDER is re-exported via index.ts
void PRIORITY_ORDER;
