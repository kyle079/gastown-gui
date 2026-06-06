import type { ReactNode } from 'react';
import {
  ToastManager,
  useToast as useTronToast,
} from 'tronvercel-ui';
import type { Tone } from 'tronvercel-ui';

export interface Toast {
  id: string;
  message: string;
  tone: Tone;
}

interface ToastContextValue {
  notify: (message: string, tone?: Tone) => void;
}

/** App toast provider — wraps tronvercel-ui's ToastManager. */
export function ToastProvider({ children }: { children: ReactNode }) {
  return <ToastManager>{children}</ToastManager>;
}

/** Returns `{ notify }` for backward compatibility. */
export function useToast(): ToastContextValue {
  const { toast } = useTronToast();
  return {
    notify: (message: string, tone: Tone = 'neutral') =>
      toast({ title: message, tone }),
  };
}
