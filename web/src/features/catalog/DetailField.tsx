import type { ReactNode } from 'react';

/** A hairline-separated label/value row for the detail dialogs. */
export function DetailField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line/60 py-2 last:border-0">
      <span className="shrink-0 font-mono text-2xs uppercase tracking-wider text-faint">{label}</span>
      <span className="min-w-0 text-right text-sm text-fg">{children}</span>
    </div>
  );
}
