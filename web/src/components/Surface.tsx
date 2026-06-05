import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export interface SurfaceProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Optional page-level heading row. */
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

/**
 * Page container — consistent max width and rhythm for every surface.
 * "One surface, one job": the header states the job, the body does it.
 */
export function Surface({ title, description, actions, className, children, ...props }: SurfaceProps) {
  return (
    <div className={cn('mx-auto w-full max-w-[1200px] px-6 py-6', className)} {...props}>
      {(title != null || actions != null) && (
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            {title != null && <h1 className="text-lg font-medium text-fg">{title}</h1>}
            {description != null && <p className="mt-1 text-sm text-muted">{description}</p>}
          </div>
          {actions != null && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
