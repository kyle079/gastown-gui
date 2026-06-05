import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

const selectBase =
  'h-8 w-full appearance-none rounded border border-line bg-ink/60 pl-2.5 pr-8 text-sm text-fg ' +
  'transition-colors duration-100 hover:border-line-strong ' +
  'focus:border-accent focus-visible:ring-1 focus-visible:ring-accent ' +
  'disabled:opacity-40 disabled:pointer-events-none ' +
  // Caret drawn with a CSS chevron — no icon dependency.
  "bg-[length:9px] bg-[right_0.6rem_center] bg-no-repeat " +
  "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath fill='none' stroke='%238a969b' stroke-width='1.5' d='M2 4l4 4 4-4'/%3E%3C/svg%3E\")]";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <select ref={ref} className={cn(selectBase, className)} {...props}>
      {children}
    </select>
  );
});
