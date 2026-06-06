import type { Tone } from '@/components/primitives';
import { cn } from '@/lib/utils/cn';

const fill: Record<Tone, string> = {
  neutral: 'bg-muted',
  accent: 'bg-accent',
  ok: 'bg-ok',
  warn: 'bg-warn',
  danger: 'bg-danger',
  info: 'bg-info',
};

/**
 * A flat, hairline-thin completion bar — restrained-Tron: a solid fill on an
 * inset track, no gradient, no glow. `value` is a 0–1 fraction.
 */
export function ProgressBar({
  value,
  tone = 'accent',
  className,
}: {
  value: number;
  tone?: Tone;
  className?: string;
}) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      className={cn('h-1 w-full overflow-hidden rounded-full bg-ink', className)}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-300', fill[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
