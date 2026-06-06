import { Link } from '@tanstack/react-router';
import { Panel } from '@/components/primitives';

/**
 * First-run empty state. Shown on the Dashboard only when the town has no rigs
 * configured — the one moment a power tool should explain itself. A single calm
 * line that points at Help; it never nags once a rig exists.
 */
export function FirstRunBanner() {
  return (
    <Panel className="flex flex-col gap-3 border-l-2 border-l-accent sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm text-fg">No rigs yet — this town isn’t driving any projects.</p>
        <p className="mt-0.5 text-sm text-muted">
          Connect a project to put agents to work, or get oriented first.
        </p>
      </div>
      <Link
        to="/help"
        className="shrink-0 self-start font-mono text-xs text-accent hover:underline sm:self-auto"
      >
        Getting started →
      </Link>
    </Panel>
  );
}
