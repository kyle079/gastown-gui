import { describe, it, expect } from 'vitest';
import { allReady, deriveChecks, pendingChecks } from './readiness';
import type { SetupStatus } from '@/lib/api/types';

const ready: SetupStatus = {
  gt_installed: true,
  gt_version: 'gt 1.2.3',
  bd_installed: true,
  bd_version: 'bd 0.9.0',
  workspace_initialized: true,
  workspace_path: '/home/op/gt',
  rigs: [{ name: 'alpha' }, { name: 'beta' }],
};

describe('deriveChecks', () => {
  it('reports a fully provisioned town as all-ready', () => {
    const checks = deriveChecks(ready);
    expect(checks).toHaveLength(4);
    expect(allReady(checks)).toBe(true);
    expect(pendingChecks(checks)).toEqual([]);
  });

  it('shows versions and rig counts as the satisfied detail', () => {
    const checks = deriveChecks(ready);
    expect(checks.find((c) => c.id === 'gt')?.detail).toBe('gt 1.2.3');
    expect(checks.find((c) => c.id === 'rigs')?.detail).toBe('2 rigs');
  });

  it('singularizes a single rig', () => {
    const checks = deriveChecks({ ...ready, rigs: [{ name: 'solo' }] });
    expect(checks.find((c) => c.id === 'rigs')?.detail).toBe('1 rig');
  });

  it('flags a first-run town with no rigs and surfaces a fix', () => {
    const checks = deriveChecks({ ...ready, rigs: [] });
    expect(allReady(checks)).toBe(false);
    const rigs = checks.find((c) => c.id === 'rigs');
    expect(rigs?.ok).toBe(false);
    expect(rigs?.fix).toMatch(/gt rig add/);
    expect(pendingChecks(checks)).toHaveLength(1);
  });

  it('flags missing CLIs as not found', () => {
    const checks = deriveChecks({
      ...ready,
      gt_installed: false,
      gt_version: null,
      bd_installed: false,
      bd_version: null,
    });
    expect(checks.find((c) => c.id === 'gt')?.detail).toBe('not found');
    expect(checks.find((c) => c.id === 'bd')?.detail).toBe('not found');
    expect(pendingChecks(checks).map((c) => c.id)).toEqual(['gt', 'bd']);
  });
});
