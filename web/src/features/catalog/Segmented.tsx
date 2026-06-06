import { useRef } from 'react';
import { cn } from '@/lib/utils/cn';

export interface SegmentOption<V extends string> {
  value: V;
  label: string;
  /** Mono glyph shown before the label. */
  glyph?: string;
  /** Optional live count badge. */
  count?: number;
}

export interface SegmentedProps<V extends string> {
  options: SegmentOption<V>[];
  value: V;
  onChange: (value: V) => void;
  'aria-label'?: string;
}

/**
 * A segmented control — the Catalog's view switcher. Hairline-bordered track,
 * flat accent on the active segment (no glow). Full-width segments on a phone,
 * intrinsic width on desktop. Arrow keys move between segments (roving focus).
 */
export function Segmented<V extends string>({
  options,
  value,
  onChange,
  'aria-label': ariaLabel,
}: SegmentedProps<V>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const move = (from: number, delta: number) => {
    const next = (from + delta + options.length) % options.length;
    const opt = options[next];
    onChange(opt.value);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex w-full gap-1 rounded-md border border-line bg-ink/40 p-1 sm:w-auto"
    >
      {options.map((opt, i) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                move(i, 1);
              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                move(i, -1);
              }
            }}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded px-3 py-1.5 text-sm transition-colors duration-100 sm:flex-none',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
              active
                ? 'bg-accent text-accent-fg'
                : 'text-muted hover:bg-raised hover:text-fg',
            )}
          >
            {opt.glyph && (
              <span className={cn('font-mono text-xs', active ? 'text-accent-fg' : 'text-faint')}>
                {opt.glyph}
              </span>
            )}
            {opt.label}
            {opt.count != null && (
              <span
                className={cn(
                  'font-mono text-2xs tabular-nums',
                  active ? 'text-accent-fg/80' : 'text-faint',
                )}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
