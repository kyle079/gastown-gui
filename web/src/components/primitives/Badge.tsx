import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export type Tone = 'neutral' | 'accent' | 'ok' | 'warn' | 'danger' | 'info';

const toneText: Record<Tone, string> = {
  neutral: 'text-muted',
  accent: 'text-accent',
  ok: 'text-ok',
  warn: 'text-warn',
  danger: 'text-danger',
  info: 'text-info',
};

const toneBg: Record<Tone, string> = {
  neutral: 'bg-raised text-muted border-line',
  accent: 'bg-accent/10 text-accent border-accent/30',
  ok: 'bg-ok/10 text-ok border-ok/30',
  warn: 'bg-warn/10 text-warn border-warn/30',
  danger: 'bg-danger/10 text-danger border-danger/30',
  info: 'bg-info/10 text-info border-info/30',
};

const toneDot: Record<Tone, string> = {
  neutral: 'bg-faint',
  accent: 'bg-accent',
  ok: 'bg-ok',
  warn: 'bg-warn',
  danger: 'bg-danger',
  info: 'bg-info',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

/** A bordered chip for counts and labels. */
export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-2xs leading-none',
        toneBg[tone],
        className,
      )}
      {...props}
    />
  );
}

export interface StatusDotProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  pulse?: boolean;
}

/** A 6px state indicator — calm, no glow; optional pulse for "live". */
export function StatusDot({ tone = 'neutral', pulse = false, className, ...props }: StatusDotProps) {
  return (
    <span
      className={cn(
        'inline-block h-1.5 w-1.5 shrink-0 rounded-full',
        toneDot[tone],
        pulse && 'motion-safe:animate-[pulse_1.8s_ease-in-out_infinite]',
        className,
      )}
      {...props}
    />
  );
}

export interface StatusPillProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  pulse?: boolean;
  label: string;
}

/** Dot + label, for agent/service state. */
export function StatusPill({ tone = 'neutral', pulse, label, className, ...props }: StatusPillProps) {
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 text-xs', toneText[tone], className)}
      {...props}
    >
      <StatusDot tone={tone} pulse={pulse} />
      {label}
    </span>
  );
}
