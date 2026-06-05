import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

const inputBase =
  'h-8 w-full rounded border border-line bg-ink/60 px-2.5 text-sm text-fg ' +
  'placeholder:text-faint transition-colors duration-100 ' +
  'hover:border-line-strong focus:border-accent focus-visible:ring-1 focus-visible:ring-accent ' +
  'disabled:opacity-40 disabled:pointer-events-none';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, type = 'text', ...props },
  ref,
) {
  return <input ref={ref} type={type} className={cn(inputBase, className)} {...props} />;
});
