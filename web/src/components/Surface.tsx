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
    <div
      className={cn(
        // Tighter gutters on phones; a touch more room at 4k without letting
        // content sprawl past a readable measure.
        'mx-auto w-full max-w-[1200px] px-4 py-4 sm:px-6 sm:py-6 2xl:max-w-[1440px]',
        className,
      )}
      {...props}
    >
      {(title != null || actions != null) && (
        <div className="mb-4 flex items-start justify-between gap-4 sm:mb-5">
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
