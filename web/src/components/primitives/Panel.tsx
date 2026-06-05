import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  /** Removes inner padding so the panel can host edge-to-edge tables/lists. */
  flush?: boolean;
}

/** The base surface container — a single bordered plane, sharp corners. */
export function Panel({ className, flush = false, ...props }: PanelProps) {
  return (
    <div
      className={cn(
        'rounded-md border border-line bg-surface shadow-panel',
        !flush && 'p-4',
        className,
      )}
      {...props}
    />
  );
}

export interface PanelHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title: ReactNode;
  /** Short technical descriptor shown beside/below the title. */
  hint?: ReactNode;
  actions?: ReactNode;
}

export function PanelHeader({ title, hint, actions, className, ...props }: PanelHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 border-b border-line px-4 py-2.5',
        className,
      )}
      {...props}
    >
      <div className="flex min-w-0 items-baseline gap-2.5">
        <h2 className="truncate text-sm font-medium text-fg">{title}</h2>
        {hint != null && <span className="truncate font-mono text-2xs text-faint">{hint}</span>}
      </div>
      {actions != null && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
    </div>
  );
}

/** Convenience body wrapper for a flush Panel that still needs padding somewhere. */
export function PanelBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4', className)} {...props} />;
}
