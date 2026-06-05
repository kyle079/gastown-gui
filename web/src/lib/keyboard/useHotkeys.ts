import { useEffect } from 'react';

export type HotkeyHandler = (e: KeyboardEvent) => void;

/**
 * Normalize a KeyboardEvent into a comparable chord string, e.g. "mod+k", "shift+?".
 * `mod` maps to Cmd on macOS and Ctrl elsewhere.
 */
function chordFromEvent(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.metaKey || e.ctrlKey) parts.push('mod');
  if (e.altKey) parts.push('alt');
  if (e.shiftKey) parts.push('shift');
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase();
  // Avoid double-listing modifiers as the key.
  if (!['control', 'meta', 'shift', 'alt'].includes(key)) parts.push(key);
  return parts.join('+');
}

function isEditable(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

export interface HotkeyOptions {
  /** Fire even when focus is inside an input/textarea. Default false. */
  enableInInputs?: boolean;
  enabled?: boolean;
}

/**
 * Bind global chord hotkeys. Map keys use the normalized chord form
 * ("mod+k", "shift+/", "escape"). Sequences are handled by useKeySequence.
 */
export function useHotkeys(
  map: Record<string, HotkeyHandler>,
  { enableInInputs = false, enabled = true }: HotkeyOptions = {},
) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (!enableInInputs && isEditable(e.target)) return;
      const handler = map[chordFromEvent(e)];
      if (handler) {
        e.preventDefault();
        handler(e);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [map, enableInInputs, enabled]);
}

/**
 * Two-key sequence handler (e.g. "g d" then go to Dashboard).
 * `prefix` is a single key; `map` keys are the second key.
 */
export function useKeySequence(
  prefix: string,
  map: Record<string, HotkeyHandler>,
  { timeoutMs = 800, enabled = true }: { timeoutMs?: number; enabled?: boolean } = {},
) {
  useEffect(() => {
    if (!enabled) return;
    let armed = false;
    let timer: number | undefined;

    const disarm = () => {
      armed = false;
      if (timer) window.clearTimeout(timer);
    };

    const onKey = (e: KeyboardEvent) => {
      if (isEditable(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (!armed) {
        if (key === prefix) {
          armed = true;
          timer = window.setTimeout(disarm, timeoutMs);
        }
        return;
      }
      disarm();
      const handler = map[key];
      if (handler) {
        e.preventDefault();
        handler(e);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      disarm();
    };
  }, [prefix, map, timeoutMs, enabled]);
}
