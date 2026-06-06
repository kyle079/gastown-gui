/**
 * A one-line pub/sub so the command palette can trigger "Compose" while the
 * dialog itself lives on the mail surface. The palette navigates to `/mail` and
 * fires `requestCompose()`; the surface opens the dialog — immediately if it's
 * already mounted (via the listener), or on mount (via the pending flag) if the
 * navigation is what mounted it.
 */
type Listener = () => void;

let pending = false;
const listeners = new Set<Listener>();

export function requestCompose(): void {
  pending = true;
  listeners.forEach((l) => l());
}

/** Returns true once if a compose was requested before the surface mounted. */
export function consumePendingCompose(): boolean {
  if (!pending) return false;
  pending = false;
  return true;
}

export function subscribeCompose(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
