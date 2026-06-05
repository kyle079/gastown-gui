import { Surface } from '@/components/Surface';
import { Panel } from '@/components/primitives';

/**
 * Stand-in for surfaces Phase 1 will build. Honest about being scaffolding —
 * it states the intent so the route skeleton is navigable end to end.
 */
export function PlaceholderSurface({ title, intent }: { title: string; intent: string }) {
  return (
    <Surface title={title}>
      <Panel className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <span className="font-mono text-xs uppercase tracking-wider text-faint">Phase 1</span>
        <p className="max-w-md text-sm text-muted">{intent}</p>
      </Panel>
    </Surface>
  );
}
