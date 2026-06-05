import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export interface ListRowProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Leading slot — a StatusDot, avatar, or index. */
  leading?: ReactNode;
  /** Trailing slot — counts, timestamps, actions. */
  trailing?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  interactive?: boolean;
  active?: boolean;
}

/**
 * A horizontal record row — the workhorse for queues, agent lists, mail.
 * Compose many inside a `divide-hairline` container.
 */
export function ListRow({
  leading,
  trailing,
  title,
  subtitle,
  interactive = false,
  active = false,
  className,
  ...props
}: ListRowProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-2.5',
        interactive && 'cursor-pointer transition-colors hover:bg-raised',
        active && 'bg-raised',
        className,
      )}
      {...props}
    >
      {leading != null && <div className="flex shrink-0 items-center">{leading}</div>}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-fg">{title}</div>
        {subtitle != null && <div className="truncate text-xs text-muted">{subtitle}</div>}
      </div>
      {trailing != null && (
        <div className="flex shrink-0 items-center gap-2 text-xs text-muted">{trailing}</div>
      )}
    </div>
  );
}
