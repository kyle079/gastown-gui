import { describe, expect, it } from 'vitest';
import { withRefresh } from './refresh';

describe('withRefresh', () => {
  it('adds refresh=true to paths without a query string', () => {
    expect(withRefresh('/api/status')).toBe('/api/status?refresh=true');
  });

  it('appends refresh=true to paths with existing query params', () => {
    expect(withRefresh('/api/beads?status=open')).toBe('/api/beads?status=open&refresh=true');
  });
});
