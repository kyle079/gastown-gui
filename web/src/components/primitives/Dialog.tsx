import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils/cn';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/**
 * A lightweight modal dialog — portal + scrim + Escape-to-close.
 * Sharp-cornered overlay surface, no glow. Focus moves into the panel on open.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center overflow-y-auto sm:items-start sm:p-4 sm:pt-[12vh]"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 animate-fade-in bg-ink/70 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          // Full-screen sheet on mobile; centered modal at sm+.
          'relative flex min-h-full w-full animate-scale-in flex-col border-line-strong ' +
            'bg-overlay outline-none ' +
            'sm:min-h-0 sm:max-w-md sm:rounded-md sm:border sm:shadow-overlay',
          className,
        )}
      >
        {(title != null || description != null) && (
          <div className="border-b border-line px-4 py-3">
            {title != null && <h2 className="text-sm font-medium text-fg">{title}</h2>}
            {description != null && <p className="mt-1 text-xs text-muted">{description}</p>}
          </div>
        )}
        {children != null && <div className="flex-1 px-4 py-4">{children}</div>}
        {footer != null && (
          <div className="flex items-center justify-end gap-2 border-t border-line px-4 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
