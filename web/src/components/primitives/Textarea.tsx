import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

const textareaBase =
  'w-full rounded border border-line bg-ink/60 px-2.5 py-2 text-sm text-fg ' +
  'placeholder:text-faint transition-colors duration-100 ' +
  'hover:border-line-strong focus:border-accent focus-visible:ring-1 focus-visible:ring-accent ' +
  'disabled:pointer-events-none disabled:opacity-40';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, rows = 4, ...props },
  ref,
) {
  return <textarea ref={ref} rows={rows} className={cn(textareaBase, className)} {...props} />;
});
