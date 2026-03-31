import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  exponentialDecay, linearDecay, stepDecay,
  applyDecay, parseDuration
} from '../src/decay.js';

describe('parseDuration', () => {
  const cases: [string, number][] = [
    ['1ms',  1],
    ['30s',  30_000],
    ['5m',   300_000],
    ['2h',   7_200_000],
    ['1d',   86_400_000],
    ['1w',   604_800_000],
  ];
  for (const [input, expected] of cases) {
    test(`parses "${input}" → ${expected}ms`, () => {
      assert.equal(parseDuration(input), expected);
    });
  }

  test('throws on invalid duration', () => {
    assert.throws(() => parseDuration('5x'), /Invalid duration/);
  });
});

describe('exponentialDecay', () => {
  test('returns 1 at t=0', () => {
    assert.equal(exponentialDecay(0, 60_000), 1);
  });

  test('returns 0.5 at t=halfLife', () => {
    const hl = 3_600_000;
    assert.ok(Math.abs(exponentialDecay(hl, hl) - 0.5) < 1e-10);
  });

  test('returns 0.25 at t=2*halfLife', () => {
    const hl = 3_600_000;
    assert.ok(Math.abs(exponentialDecay(2 * hl, hl) - 0.25) < 1e-10);
  });

  test('returns 1 when halfLife is 0', () => {
    assert.equal(exponentialDecay(1000, 0), 1);
  });
});

describe('linearDecay', () => {
  test('returns 1 at t=0', () => {
    assert.equal(linearDecay(0, 60_000), 1);
  });

  test('returns 0 at t=2*halfLife', () => {
    const hl = 60_000;
    assert.equal(linearDecay(2 * hl, hl), 0);
  });

  test('never goes below 0', () => {
    assert.equal(linearDecay(999_999_999, 60_000), 0);
  });
});

describe('stepDecay', () => {
  test('returns 1 before first step', () => {
    assert.equal(stepDecay(59_999, 60_000), 1);
  });

  test('returns 0.5 after first step', () => {
    assert.equal(stepDecay(60_000, 60_000), 0.5);
  });

  test('returns 0.25 after second step', () => {
    assert.equal(stepDecay(120_000, 60_000), 0.25);
  });
});

describe('applyDecay', () => {
  test('delegates to exponential by default', () => {
    const hl = 3_600_000;
    const result = applyDecay(1.0, hl, hl);
    assert.ok(Math.abs(result - 0.5) < 1e-10);
  });

  test('applies to existing weight', () => {
    const hl = 3_600_000;
    const result = applyDecay(0.5, hl, hl);
    assert.ok(Math.abs(result - 0.25) < 1e-10);
  });
});
