import { cn } from '@/lib/utils/cn';

/** A quiet, monochrome activity indicator. */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-block h-3.5 w-3.5 animate-spin rounded-full border border-line-strong border-t-accent',
        className,
      )}
    />
  );
}
