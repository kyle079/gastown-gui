import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

/** A keycap. The keyboard-first tool wears its shortcuts on its sleeve. */
export function Kbd({ className, children, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded border border-line ' +
          'bg-ink px-1.5 font-mono text-2xs text-muted',
        className,
      )}
      {...props}
    >
      {children}
    </kbd>
  );
}
