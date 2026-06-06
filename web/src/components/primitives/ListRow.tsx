import type { HTMLAttributes, ReactNode } from 'react';
import { ListRow as TronListRow, ListGroup } from 'tronvercel-ui';
import { cn } from '@/lib/utils/cn';

export { ListGroup };

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
 * Adapter that wraps tronvercel-ui ListRow with the legacy title/subtitle API.
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
    <TronListRow
      leading={leading}
      trailing={trailing}
      interactive={interactive}
      className={cn(active && 'bg-raised', className)}
      {...props}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-fg">{title}</div>
        {subtitle != null && <div className="truncate text-xs text-muted">{subtitle}</div>}
      </div>
    </TronListRow>
  );
}
