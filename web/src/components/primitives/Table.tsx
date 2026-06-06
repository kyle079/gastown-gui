import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export interface Column<T> {
  key: string;
  header: ReactNode;
  /** Cell renderer. */
  cell: (row: T) => ReactNode;
  className?: string;
  align?: 'left' | 'right' | 'center';
  width?: string;
}

export interface TableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  empty?: ReactNode;
  className?: string;
}

const alignClass = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
} as const;

/**
 * A dense, technical table. Hairline rows, mono-friendly.
 *
 * Responsive: a real `<table>` at `md+`; below `md` each row reflows into a
 * stacked card (label/value pairs keyed off each column header) so the page
 * never scrolls horizontally on a phone. Both modes render from one schema.
 */
export function Table<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  empty = 'No data',
  className,
}: TableProps<T>) {
  return (
    <>
      {/* Desktop / tablet: the dense table. */}
      <table className={cn('hidden w-full border-collapse text-sm md:table', className)}>
        <thead>
          <tr className="border-b border-line">
            {columns.map((col) => (
              <th
                key={col.key}
                style={col.width ? { width: col.width } : undefined}
                className={cn(
                  'px-4 py-2 text-2xs font-medium uppercase tracking-wider text-faint',
                  alignClass[col.align ?? 'left'],
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-faint">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr
                key={rowKey(row, i)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'border-b border-line/60 transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-raised',
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-4 py-2 text-fg',
                      alignClass[col.align ?? 'left'],
                      col.className,
                    )}
                  >
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Mobile: stacked cards — no horizontal scroll. */}
      <div className="divide-hairline md:hidden">
        {rows.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-faint">{empty}</div>
        ) : (
          rows.map((row, i) => (
            <div
              key={rowKey(row, i)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                'flex flex-col gap-1.5 px-4 py-3 transition-colors',
                onRowClick && 'cursor-pointer hover:bg-raised',
              )}
            >
              {columns.map((col) => (
                <div key={col.key} className="flex items-center justify-between gap-3">
                  <span className="shrink-0 text-2xs font-medium uppercase tracking-wider text-faint">
                    {col.header}
                  </span>
                  <span className={cn('min-w-0 text-right text-fg', col.className)}>
                    {col.cell(row)}
                  </span>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </>
  );
}
