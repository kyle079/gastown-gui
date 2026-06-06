/**
 * Terminal surface — browser shell into gt agent tmux sessions.
 *
 * ⚠ SECURITY: This surface gives full shell access to agent sessions.
 * The app has no authentication (see gg-2wt). Keep the server bound to
 * 127.0.0.1 or a trusted LAN interface only. Never expose publicly.
 */

import { useEffect, useRef, useState, useCallback, type CSSProperties } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { Surface } from '@/components/Surface';
import { Panel, Button, Spinner, Badge } from '@/components/primitives';
import { cn } from '@/lib/utils/cn';
import { useTerminalSessions, type TerminalSession } from './useTerminalSessions';

function wsUrl(session: string): string {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws/terminal?session=${encodeURIComponent(session)}`;
}

type ConnState = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

const ROLE_GLYPHS: Record<string, string> = {
  mayor: '◇',
  witness: '⊙',
  refinery: '⚙',
  deacon: '⊕',
  dog: '◈',
  chrome: '▣',
  polecat: '▷',
};

function roleGlyph(role: string) {
  return ROLE_GLYPHS[role] ?? '·';
}

function getViewportHeight() {
  if (typeof window === 'undefined') return 0;
  return window.visualViewport?.height ?? window.innerHeight;
}

function useViewportHeight() {
  const [height, setHeight] = useState(() => getViewportHeight());

  useEffect(() => {
    const update = () => setHeight(getViewportHeight());
    update();

    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
    };
  }, []);

  return height;
}

/** xterm.js theme matching the Tron/ink design palette */
const XTERM_THEME = {
  background: '#06080a',   // --c-ink
  foreground: '#e2e7e9',   // --c-fg
  cursor: '#34c0d4',       // --c-accent
  cursorAccent: '#06080a',
  selectionBackground: 'rgba(52,192,212,0.25)',
  black: '#1a2026',
  red: '#f85149',
  green: '#3fb950',
  yellow: '#d29922',
  blue: '#58a6ff',
  magenta: '#bc8cff',
  cyan: '#34c0d4',
  white: '#e2e7e9',
  brightBlack: '#2e3940',
  brightRed: '#ff7b72',
  brightGreen: '#56d364',
  brightYellow: '#e3b341',
  brightBlue: '#79c0ff',
  brightMagenta: '#d2a8ff',
  brightCyan: '#76e3ea',
  brightWhite: '#f0f6fc',
};

interface XtermPaneProps {
  session: TerminalSession;
  onDetach: () => void;
}

function XtermPane({ session, onDetach }: XtermPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [connState, setConnState] = useState<ConnState>('connecting');
  const [errorMsg, setErrorMsg] = useState('');
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Separate unmount flag for the terminal init effect (distinct from the WS effect's local closed var)
  const termUnmountedRef = useRef(false);

  const sendResize = useCallback((cols: number, rows: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'resize', cols, rows }));
    }
  }, []);

  // Initialize terminal once on mount
  useEffect(() => {
    termUnmountedRef.current = false;
    if (!containerRef.current) return;

    const term = new Terminal({
      theme: XTERM_THEME,
      fontFamily: "'JetBrains Mono', 'Fira Mono', 'Cascadia Code', ui-monospace, monospace",
      fontSize: 12,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 5000,
      allowProposedApi: true,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);
    fit.fit();

    termRef.current = term;
    fitRef.current = fit;

    term.onData((data) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'input', data }));
      }
    });

    return () => {
      termUnmountedRef.current = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
  }, []);

  // Connect / reconnect WebSocket whenever session changes
  useEffect(() => {
    // Local closed flag — avoids sharing state with the terminal init effect
    let closed = false;
    let ws: WebSocket | null = null;

    const connect = () => {
      if (closed || termUnmountedRef.current) return;
      setConnState('connecting');
      setErrorMsg('');
      termRef.current?.clear();

      try {
        ws = new WebSocket(wsUrl(session.name));
        wsRef.current = ws;
      } catch {
        setConnState('error');
        setErrorMsg('Failed to open WebSocket');
        return;
      }

      // Track whether an error triggered this close so onclose doesn't reconnect
      let closedByError = false;

      ws.onopen = () => {
        // onopen fires before the server sends 'ready' — just wait
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data as string) as {
            type: string;
            data?: string;
            message?: string;
            code?: number;
            session?: string;
          };

          if (msg.type === 'ready') {
            setConnState('connected');
            // Fit and send initial size
            if (fitRef.current && termRef.current) {
              fitRef.current.fit();
              sendResize(termRef.current.cols, termRef.current.rows);
            }
          } else if (msg.type === 'output' && msg.data) {
            termRef.current?.write(msg.data);
          } else if (msg.type === 'exit') {
            setConnState('disconnected');
            termRef.current?.write(`\r\n\x1b[2;33m[session ended]\x1b[0m\r\n`);
          } else if (msg.type === 'error') {
            closedByError = true;
            setConnState('error');
            setErrorMsg(msg.message ?? 'Unknown error');
            termRef.current?.write(`\r\n\x1b[31m[error: ${msg.message}]\x1b[0m\r\n`);
          }
        } catch {
          // ignore non-JSON
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (!closed && !closedByError) {
          setConnState('disconnected');
          reconnectTimer.current = setTimeout(() => {
            if (!closed && !termUnmountedRef.current) connect();
          }, 3000);
        }
      };

      ws.onerror = () => {
        closedByError = true;
        ws?.close();
      };
    };

    connect();

    return () => {
      closed = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      ws?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.name]);

  // Resize observer — refit terminal when container size changes
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => {
      if (fitRef.current && termRef.current) {
        fitRef.current.fit();
        sendResize(termRef.current.cols, termRef.current.rows);
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [sendResize]);

  const connBadge = {
    connected: <Badge tone="ok">live</Badge>,
    connecting: <Badge tone="info">connecting…</Badge>,
    disconnected: <Badge tone="warn">reconnecting…</Badge>,
    error: <Badge tone="danger">error</Badge>,
    idle: null,
  }[connState];

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Pane header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface px-3 py-2 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="font-mono text-xs text-accent">{roleGlyph(session.role)}</span>
          <div className="min-w-0">
            <div className="truncate font-mono text-sm text-fg">{session.name}</div>
            <div className="truncate font-mono text-[11px] text-faint">{session.rig}</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {connBadge}
          {connState === 'error' && errorMsg && (
            <span className="max-w-[18rem] truncate font-mono text-xs text-danger">{errorMsg}</span>
          )}
          <Button variant="ghost" size="sm" onClick={onDetach}>detach</Button>
        </div>
      </div>
      {/* xterm.js mount point — fills remaining height */}
      <div
        ref={containerRef}
        className="min-h-0 flex-1 overflow-hidden bg-ink p-1.5 sm:p-2"
        style={{ fontFamily: 'monospace' }}
      />
    </div>
  );
}

const ROLE_ORDER = ['mayor', 'witness', 'refinery', 'deacon', 'dog', 'chrome', 'polecat'];

function roleSortKey(role: string) {
  const i = ROLE_ORDER.indexOf(role);
  return i === -1 ? 999 : i;
}

export function TerminalSurface() {
  const { data, isLoading, isError, error } = useTerminalSessions();
  const [active, setActive] = useState<TerminalSession | null>(null);
  const viewportHeight = useViewportHeight();

  const groups = data?.groups ?? [];
  const sortedGroups = [...groups].sort(
    (a, b) => roleSortKey(a.role) - roleSortKey(b.role),
  );
  const sessionCount = data?.sessions.length ?? 0;
  const shellStyle: CSSProperties = {
    ['--terminal-vh' as string]: `${Math.max(viewportHeight, 1) * 0.01}px`,
  };

  const handleSelect = useCallback((s: TerminalSession) => {
    setActive(s);
  }, []);

  const handleDetach = useCallback(() => {
    setActive(null);
  }, []);

  return (
    <Surface
      className="max-w-none px-3 py-3 sm:px-6 sm:py-5"
      title="Terminal"
      description={active ? `attached: ${active.name}` : 'select a session to attach'}
      actions={
        <div className="flex items-center gap-1.5">
          <Badge tone="warn">LAN only</Badge>
        </div>
      }
      style={shellStyle}
    >
      <div className="mb-3 rounded border border-warn/30 bg-warn/5 px-3 py-2 font-mono text-[11px] leading-relaxed text-warn sm:text-xs">
        Browser shell — full interactive access to agent sessions. Server has no authentication (
        <span className="text-faint">gg-2wt</span>). Keep this interface LAN-only; do not expose
        publicly.
      </div>

      <div className="grid min-h-[calc(var(--terminal-vh)*100-var(--topbar-h)-8.5rem)] gap-3 lg:grid-cols-[18rem_minmax(0,1fr)]">
        {/* Session picker */}
        <Panel
          flush
          className="flex min-h-0 flex-col overflow-hidden lg:sticky lg:top-3 lg:self-start lg:max-h-[calc(var(--terminal-vh)*100-var(--topbar-h)-7rem)]"
        >
          <div className="flex items-center justify-between border-b border-line px-3 py-2 sm:px-4">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-medium text-fg">Sessions</h2>
              <p className="truncate font-mono text-2xs text-faint">
                {sessionCount} available
              </p>
            </div>
            <Badge tone="neutral">{sessionCount}</Badge>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {isLoading && (
              <Panel className="flex items-center justify-center gap-2 py-8 text-sm text-muted">
                <Spinner />
                Loading sessions…
              </Panel>
            )}
            {isError && (
              <Panel className="py-4 text-center">
                <p className="font-mono text-xs text-danger">
                  {error instanceof Error ? error.message : 'Failed to load sessions'}
                </p>
              </Panel>
            )}
            {!isLoading && !isError && sortedGroups.length === 0 && (
              <Panel className="py-4 text-center">
                <p className="font-mono text-xs text-faint">no sessions found</p>
              </Panel>
            )}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
              {sortedGroups.map((group) => (
                <div key={group.role} className="space-y-1">
                  <div className="px-1 py-0.5 font-mono text-2xs uppercase tracking-widest text-faint">
                    {roleGlyph(group.role)} {group.role}
                  </div>
                  <div className="grid gap-1.5">
                    {group.sessions.map((s) => (
                      <button
                        key={s.name}
                        onClick={() => handleSelect(s)}
                        className={cn(
                          'flex min-h-12 w-full items-start gap-2 rounded border px-3 py-2 text-left transition-colors',
                          active?.name === s.name
                            ? 'border-accent/40 bg-accent/10 text-fg'
                            : 'border-line bg-surface text-muted hover:bg-raised hover:text-fg',
                        )}
                      >
                        <span className="mt-0.5 font-mono text-xs opacity-70">
                          {roleGlyph(s.role)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-mono text-xs">{s.name}</span>
                          <span className="block truncate font-mono text-[11px] text-faint">
                            {s.rig}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        {/* Terminal pane */}
        <Panel flush className="flex min-h-[28rem] flex-col overflow-hidden lg:min-h-0">
          {active ? (
            <XtermPane key={active.name} session={active} onDetach={handleDetach} />
          ) : (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 bg-ink px-4 py-12 text-center">
              <span className="font-mono text-2xl text-faint">⌗</span>
              <p className="font-mono text-xs text-faint">select a session to attach</p>
              <p className="max-w-[22rem] font-mono text-[11px] leading-relaxed text-faint">
                Pick a session on the left. The pane will reconnect automatically if the session
                drops or the mobile keyboard changes the viewport.
              </p>
            </div>
          )}
        </Panel>
      </div>
    </Surface>
  );
}
