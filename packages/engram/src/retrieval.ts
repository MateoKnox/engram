import type {
  LayerName, AnyEntry, RecallOptions, RecallResult
} from './types.js';

const PRIORITY_ORDER: LayerName[] = ['core', 'residue', 'skill', 'graph', 'episode', 'buffer'];

export interface LayerSearchFn {
  (query: string): AnyEntry[];
}

/**
 * Cross-layer retrieval with priority resolution.
 * Layers are searched in priority order: core > residue > skill > graph > episode > buffer.
 * Results are merged and de-duplicated, with higher-priority layers winning on content overlap.
 */
export function recall(
  query: string,
  layerSearchFns: Record<LayerName, LayerSearchFn>,
  options: RecallOptions = {}
): RecallResult {
  const {
    layers = PRIORITY_ORDER,
    limit = 10,
    minWeight = 0,
    tags,
    key,
  } = options;

  // Filter to requested layers, preserve priority order
  const orderedLayers = PRIORITY_ORDER.filter(l => layers.includes(l));

  const results: AnyEntry[] = [];
  let resolvedLayer: LayerName = 'buffer';

  for (const layer of orderedLayers) {
    const searchFn = layerSearchFns[layer];
    if (!searchFn) continue;

    let entries = searchFn(query);

    // Filter by weight
    if (minWeight > 0) {
      entries = entries.filter(e => e.weight >= minWeight);
    }

    // Filter by tags
    if (tags && tags.length > 0) {
      entries = entries.filter(e => tags.some(t => e.tags.includes(t)));
    }

    // Filter by key for graph lookups
    if (key && layer === 'graph') {
      entries = entries.filter(e => 'key' in e && (e as { key: string }).key === key);
    }

    if (entries.length > 0 && results.length === 0) {
      resolvedLayer = layer;
    }

    results.push(...entries);

    if (results.length >= limit) break;
  }

  // Sort by priority layer then weight
  const layerRank = (l: LayerName) => PRIORITY_ORDER.indexOf(l);
  results.sort((a, b) => {
    const rankDiff = layerRank(a.layer) - layerRank(b.layer);
    if (rankDiff !== 0) return rankDiff;
    return b.weight - a.weight;
  });

  return {
    entries: results.slice(0, limit),
    resolvedLayer,
    query,
  };
}

export { PRIORITY_ORDER };
