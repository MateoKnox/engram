import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { EngramConfig } from './types.js';

/** Minimal TOML parser for engram.toml format */
function parseToml(source: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  let current: Record<string, unknown> = result;
  let currentPath: string[] = [];

  const lines = source.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();

    if (!line || line.startsWith('#')) continue;

    // Section header: [memory.buffer] or [[array]]
    if (line.startsWith('[')) {
      const inner = line.replace(/^\[+/, '').replace(/\]+$/, '').trim();
      currentPath = inner.split('.');
      // Navigate/create nested structure
      current = result;
      for (const part of currentPath) {
        if (typeof current[part] !== 'object' || current[part] === null) {
          current[part] = {};
        }
        current = current[part] as Record<string, unknown>;
      }
      continue;
    }

    // Key = Value
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    const rawVal = line.slice(eqIdx + 1).trim();

    // Strip inline comment
    let valStr = rawVal;
    const commentIdx = rawVal.search(/\s+#/);
    if (commentIdx !== -1) valStr = rawVal.slice(0, commentIdx).trim();

    let value: unknown;
    if (valStr === 'true') value = true;
    else if (valStr === 'false') value = false;
    else if (valStr.startsWith('"') || valStr.startsWith("'")) {
      value = valStr.slice(1, -1);
    } else if (!isNaN(Number(valStr))) {
      value = Number(valStr);
    } else {
      value = valStr;
    }

    current[key] = value;
  }

  return result;
}

const DEFAULTS: EngramConfig = {
  agent: { id: 'engram-agent', version: '0.1.0' },
  memory: {
    buffer: { ttl: '5m', capacity: 1000, strategy: 'lru' },
    episode: { half_life: '2h', max_entries: 500, decay: 'exponential' },
    graph: { persistent: false, storage: 'memory' },
    skill: { persistent: false, storage: 'memory' },
    residue: { max_summaries: 200, compression_ratio: 0.3 },
    core: { immutable: true, storage: 'memory' },
  },
};

function deepMerge<T extends Record<string, unknown>>(base: T, override: Partial<T>): T {
  const result = { ...base };
  for (const key of Object.keys(override) as (keyof T)[]) {
    const ov = override[key];
    const bs = base[key];
    if (ov !== undefined && ov !== null && typeof ov === 'object' && !Array.isArray(ov) &&
        bs !== undefined && bs !== null && typeof bs === 'object' && !Array.isArray(bs)) {
      result[key] = deepMerge(bs as Record<string, unknown>, ov as Record<string, unknown>) as T[keyof T];
    } else if (ov !== undefined) {
      result[key] = ov as T[keyof T];
    }
  }
  return result;
}

export function loadConfig(configPath?: string): EngramConfig {
  const resolvedPath = resolve(configPath ?? 'engram.toml');

  if (!existsSync(resolvedPath)) {
    return DEFAULTS;
  }

  const source = readFileSync(resolvedPath, 'utf-8');
  const parsed = parseToml(source) as Partial<EngramConfig>;
  return deepMerge(DEFAULTS as Record<string, unknown>, parsed as Record<string, unknown>) as EngramConfig;
}

export { DEFAULTS };
