import type { ReactNode } from 'react';
import {
  DialogRoot,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from 'tronvercel-ui';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/** Modal dialog. Uses tronvercel-ui DialogRoot/DialogContent internally. */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: DialogProps) {
  return (
    <DialogRoot open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className={className}>
        {(title != null || description != null) && (
          <div className="border-b border-line px-4 py-3">
            {title != null && <DialogTitle>{title}</DialogTitle>}
            {description != null && <DialogDescription className="mt-1">{description}</DialogDescription>}
          </div>
        )}
        {children != null && <div className="flex-1 px-4 py-4">{children}</div>}
        {footer != null && (
          <div className="flex items-center justify-end gap-2 border-t border-line px-4 py-3">
            {footer}
          </div>
        )}
      </DialogContent>
    </DialogRoot>
  );
}
