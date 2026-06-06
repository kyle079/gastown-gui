import type { SetupStatus } from '@/lib/api/types';

/**
 * One row in the first-run readiness check. `detail` is a short mono descriptor
 * when satisfied (a version, a path, a count); `fix` is the command/step to run
 * when it isn't. Kept separate from the view so the logic is unit-testable.
 */
export interface ReadinessCheck {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
  fix?: string;
}

/** Derive the readiness rows from the live setup probe. Order is fixed. */
export function deriveChecks(setup: SetupStatus): ReadinessCheck[] {
  const rigCount = setup.rigs?.length ?? 0;

  return [
    {
      id: 'gt',
      label: 'gt CLI',
      ok: setup.gt_installed,
      detail: setup.gt_installed ? setup.gt_version || 'installed' : 'not found',
      fix: 'Install the gt CLI, then restart the bridge.',
    },
    {
      id: 'bd',
      label: 'bd CLI',
      ok: setup.bd_installed,
      detail: setup.bd_installed ? setup.bd_version || 'installed' : 'not found',
      fix: 'Install the bd (beads) CLI.',
    },
    {
      id: 'workspace',
      label: 'Workspace',
      ok: setup.workspace_initialized,
      detail: setup.workspace_path || '—',
      fix: 'Initialize the town: gt install <path>.',
    },
    {
      id: 'rigs',
      label: 'Projects',
      ok: rigCount > 0,
      detail: rigCount > 0 ? `${rigCount} rig${rigCount === 1 ? '' : 's'}` : 'none yet',
      fix: 'Connect a project: gt rig add <name> <git-url>.',
    },
  ];
}

/** True once every check passes — the town is ready to drive. */
export function allReady(checks: ReadinessCheck[]): boolean {
  return checks.every((c) => c.ok);
}

/** Checks that still need the operator, most-fundamental first (order preserved). */
export function pendingChecks(checks: ReadinessCheck[]): ReadinessCheck[] {
  return checks.filter((c) => !c.ok);
}
