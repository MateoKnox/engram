export type LayerName = 'buffer' | 'episode' | 'graph' | 'skill' | 'residue' | 'core';

export type DecayFunction = 'exponential' | 'linear' | 'step';

export type BufferStrategy = 'lru' | 'fifo';

export interface MemoryEntry {
  id: string;
  content: string;
  layer: LayerName;
  metadata: Record<string, unknown>;
  createdAt: number;   // unix ms
  updatedAt: number;
  weight: number;       // 0–1, current relevance after decay
  tags: string[];
}

export interface BufferEntry extends MemoryEntry {
  layer: 'buffer';
  expiresAt: number;   // unix ms
  ttlMs: number;
}

export interface EpisodeEntry extends MemoryEntry {
  layer: 'episode';
  halfLifeMs: number;
  eventAt: number;
}

export interface GraphEntry extends MemoryEntry {
  layer: 'graph';
  key: string;         // semantic key for lookup
  persistent: boolean;
}

export interface SkillEntry extends MemoryEntry {
  layer: 'skill';
  procedure: string;
  triggerPattern?: string;
}

export interface ResidueEntry extends MemoryEntry {
  layer: 'residue';
  summary: string;
  sourceLayer: LayerName;
  sourceIds: string[];
}

export interface CoreEntry extends MemoryEntry {
  layer: 'core';
  immutable: true;
}

export type AnyEntry = BufferEntry | EpisodeEntry | GraphEntry | SkillEntry | ResidueEntry | CoreEntry;

// Config types
export interface BufferConfig {
  ttl?: string;           // e.g. "5m", "30s", "1h"
  capacity?: number;
  strategy?: BufferStrategy;
}

export interface EpisodeConfig {
  half_life?: string;     // e.g. "2h", "1d"
  max_entries?: number;
  decay?: DecayFunction;
}

export interface GraphConfig {
  persistent?: boolean;
  storage?: 'json' | 'memory';
  storage_path?: string;
}

export interface SkillConfig {
  persistent?: boolean;
  storage?: 'json' | 'memory';
  storage_path?: string;
}

export interface ResidueConfig {
  max_summaries?: number;
  compression_ratio?: number;
}

export interface CoreConfig {
  immutable?: boolean;
  storage?: 'json' | 'memory';
  storage_path?: string;
}

export interface AgentConfig {
  id?: string;
  version?: string;
}

export interface MemoryConfig {
  buffer?: BufferConfig;
  episode?: EpisodeConfig;
  graph?: GraphConfig;
  skill?: SkillConfig;
  residue?: ResidueConfig;
  core?: CoreConfig;
}

export interface EngramConfig {
  agent?: AgentConfig;
  memory?: MemoryConfig;
}

export interface StoreOptions {
  metadata?: Record<string, unknown>;
  tags?: string[];
  importance?: number;  // 0–1, affects initial weight
  key?: string;         // for graph layer
  procedure?: string;   // for skill layer
  triggerPattern?: string;
  eventAt?: number;
}

export interface RecallOptions {
  layers?: LayerName[];
  limit?: number;
  minWeight?: number;
  tags?: string[];
  key?: string;         // for graph lookup by key
}

export interface RecallResult {
  entries: AnyEntry[];
  resolvedLayer: LayerName;
  query: string;
}

export interface DecayResult {
  layer: LayerName;
  processed: number;
  expired: number;
  decayed: number;
}

export interface ConsolidateResult {
  bufferToEpisode: number;
  episodeToGraph: number;
  graphToResidue: number;
  total: number;
}
