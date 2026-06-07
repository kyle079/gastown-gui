import type { ReactNode } from 'react';
import { Panel, PanelHeader, Kbd } from '@/components/primitives';
import { NAV_ITEMS } from '@/app/navigation';

/**
 * Keyboard reference. The console is a keyboard-first power tool, so its
 * shortcuts are documented as first-class content — and the navigation
 * sequences read straight from NAV_ITEMS, so this never drifts from the rail.
 */
export function KeyboardPanel() {
  return (
    <Panel flush>
      <PanelHeader title="Keyboard" hint="drive by key" />

      <div className="divide-hairline">
        <ShortcutRow label="Command palette">
          <Kbd>⌘K</Kbd>
        </ShortcutRow>
        <ShortcutRow label="Close / cancel">
          <Kbd>Esc</Kbd>
        </ShortcutRow>
      </div>

      <div className="border-t border-line px-4 py-3">
        <h3 className="mb-2 font-mono text-2xs tracking-wider text-faint">Go to a surface</h3>
        <div className="divide-hairline">
          {NAV_ITEMS.map((item) => (
            <div key={item.path} className="flex items-center justify-between gap-3 py-1.5">
              <span className="min-w-0">
                <span className="block text-sm text-muted">{item.label}</span>
                <span className="block truncate font-mono text-2xs text-faint">
                  {item.objectLabel}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1">
                <Kbd>g</Kbd>
                <Kbd>{item.seq}</Kbd>
              </span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function ShortcutRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <span className="text-sm text-muted">{label}</span>
      <span className="flex shrink-0 items-center gap-1">{children}</span>
    </div>
  );
}
