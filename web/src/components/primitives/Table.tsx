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
  /**
   * Mark this column as the primary content for the mobile card layout.
   * The primary column renders prominently at the top (line-clamped); all
   * other columns collapse into a compact metadata strip below it.
   * Exactly one column should be marked primary per table.
   */
  primary?: boolean;
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
 * title-first card — the primary column renders prominently with line-clamp,
 * and the remaining columns collapse into a compact inline metadata strip.
 * Both modes render from one column schema.
 */
export function Table<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  empty = 'No data',
  className,
}: TableProps<T>) {
  const primaryCol = columns.find((c) => c.primary) ?? columns[0];
  const metaCols = columns.filter((c) => c !== primaryCol);

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

      {/* Mobile: title-first card — primary content prominent, metadata compact below. */}
      <div className="divide-hairline md:hidden">
        {rows.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-faint">{empty}</div>
        ) : (
          rows.map((row, i) => (
            <div
              key={rowKey(row, i)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                'px-4 py-3 transition-colors',
                onRowClick && 'cursor-pointer hover:bg-raised',
              )}
            >
              {/* Primary: the title/main content, line-clamped to 2 lines. */}
              <div className="line-clamp-2 text-sm">{primaryCol.cell(row)}</div>
              {/* Metadata: all other columns in a compact horizontal strip. */}
              {metaCols.length > 0 && (
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                  {metaCols.map((col) => (
                    <span key={col.key} className="text-xs">
                      {col.cell(row)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}
