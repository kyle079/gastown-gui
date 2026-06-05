import { describe, it, expect } from 'vitest';
import { duration, humanize, pluralize, relativeTime } from './format';

describe('relativeTime', () => {
  it('handles nullish input', () => {
    expect(relativeTime(null)).toBe('—');
    expect(relativeTime(undefined)).toBe('—');
    expect(relativeTime('not-a-date')).toBe('—');
  });

  it('reports recent times compactly', () => {
    expect(relativeTime(new Date())).toBe('now');
    expect(relativeTime(new Date(Date.now() - 90_000))).toBe('2m');
    expect(relativeTime(new Date(Date.now() - 2 * 3600_000))).toBe('2h');
  });
});

describe('duration', () => {
  it('formats h/m/s', () => {
    expect(duration(null)).toBe('—');
    expect(duration(12)).toBe('12s');
    expect(duration(90)).toBe('1m 30s');
    expect(duration(3700)).toBe('1h 01m');
  });
});

describe('humanize', () => {
  it('title-cases kebab/snake ids', () => {
    expect(humanize('health-check')).toBe('Health Check');
    expect(humanize('mol_polecat_work')).toBe('Mol Polecat Work');
  });
});

describe('pluralize', () => {
  it('pluralizes by count', () => {
    expect(pluralize(1, 'rig')).toBe('1 rig');
    expect(pluralize(3, 'rig')).toBe('3 rigs');
    expect(pluralize(2, 'refinery', 'refineries')).toBe('2 refineries');
  });
});
