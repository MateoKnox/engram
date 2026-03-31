import type { DecayFunction } from './types.js';

/** Returns fraction of weight remaining after `elapsedMs` with given `halfLifeMs` */
export function exponentialDecay(elapsedMs: number, halfLifeMs: number): number {
  if (halfLifeMs <= 0) return 1;
  return Math.pow(0.5, elapsedMs / halfLifeMs);
}

export function linearDecay(elapsedMs: number, halfLifeMs: number): number {
  if (halfLifeMs <= 0) return 1;
  return Math.max(0, 1 - elapsedMs / (halfLifeMs * 2));
}

export function stepDecay(elapsedMs: number, halfLifeMs: number): number {
  if (halfLifeMs <= 0) return 1;
  const steps = Math.floor(elapsedMs / halfLifeMs);
  return Math.pow(0.5, steps);
}

export function applyDecay(
  currentWeight: number,
  elapsedMs: number,
  halfLifeMs: number,
  fn: DecayFunction = 'exponential'
): number {
  let fraction: number;
  switch (fn) {
    case 'linear':    fraction = linearDecay(elapsedMs, halfLifeMs); break;
    case 'step':      fraction = stepDecay(elapsedMs, halfLifeMs); break;
    case 'exponential':
    default:          fraction = exponentialDecay(elapsedMs, halfLifeMs); break;
  }
  return Math.max(0, currentWeight * fraction);
}

/** Parse duration strings like "5m", "2h", "1d", "30s" to milliseconds */
export function parseDuration(duration: string): number {
  const match = duration.trim().match(/^(\d+(?:\.\d+)?)(ms|s|m|h|d|w)$/i);
  if (!match) throw new Error(`Invalid duration: "${duration}"`);
  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers: Record<string, number> = {
    ms: 1,
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
    w: 604_800_000,
  };
  return value * multipliers[unit];
}
