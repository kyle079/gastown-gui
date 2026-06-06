/**
 * Terminal surface — browser shell into gt agent tmux sessions.
 *
 * ⚠ SECURITY: This surface gives full shell access to agent sessions.
 * The app has no authentication (see gg-2wt). Keep the server bound to
 * 127.0.0.1 or a trusted LAN interface only. Never expose publicly.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
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
  const closedRef = useRef(false);

  const sendResize = useCallback((cols: number, rows: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'resize', cols, rows }));
    }
  }, []);

  // Initialize terminal once on mount
  useEffect(() => {
    if (!containerRef.current) return;
    closedRef.current = false;

    const term = new Terminal({
      theme: XTERM_THEME,
      fontFamily: "'JetBrains Mono', 'Fira Mono', 'Cascadia Code', ui-monospace, monospace",
      fontSize: 13,
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
      closedRef.current = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
  }, []);

  // Connect / reconnect WebSocket whenever session changes
  useEffect(() => {
    closedRef.current = false;
    let ws: WebSocket | null = null;

    const connect = () => {
      if (closedRef.current) return;
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
        if (!closedRef.current && connState !== 'error') {
          setConnState('disconnected');
          reconnectTimer.current = setTimeout(() => {
            if (!closedRef.current) connect();
          }, 3000);
        }
      };

      ws.onerror = () => ws?.close();
    };

    connect();

    return () => {
      closedRef.current = true;
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
    <div className="flex h-full flex-col">
      {/* Pane header */}
      <div className="flex items-center justify-between border-b border-line bg-surface px-3 py-1.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-accent">{roleGlyph(session.role)}</span>
          <span className="font-mono text-sm text-fg">{session.name}</span>
          <span className="font-mono text-xs text-faint">{session.rig}</span>
        </div>
        <div className="flex items-center gap-2">
          {connBadge}
          {connState === 'error' && errorMsg && (
            <span className="font-mono text-xs text-danger">{errorMsg}</span>
          )}
          <Button variant="ghost" size="sm" onClick={onDetach}>detach</Button>
        </div>
      </div>
      {/* xterm.js mount point — fills remaining height */}
      <div
        ref={containerRef}
        className="min-h-0 flex-1 overflow-hidden bg-ink p-1"
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

  const groups = data?.groups ?? [];
  const sortedGroups = [...groups].sort(
    (a, b) => roleSortKey(a.role) - roleSortKey(b.role),
  );

  const handleSelect = useCallback((s: TerminalSession) => {
    setActive(s);
  }, []);

  const handleDetach = useCallback(() => {
    setActive(null);
  }, []);

  return (
    <Surface
      title="Terminal"
      description={active ? `attached: ${active.name}` : 'select a session to attach'}
      actions={
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs text-warn">⚠ no-auth LAN-only</span>
        </div>
      }
    >
      {/* Security notice */}
      <div className="mb-3 rounded border border-warn/30 bg-warn/5 px-3 py-2 font-mono text-xs text-warn">
        Browser shell — full interactive access to agent sessions. Server has no authentication (
        <span className="text-faint">gg-2wt</span>). Keep this interface LAN-only; do not expose
        publicly.
      </div>

      <div className="flex h-[calc(100vh-220px)] min-h-[400px] gap-3">
        {/* Session picker sidebar */}
        <div className="flex w-52 shrink-0 flex-col gap-1 overflow-y-auto">
          {isLoading && (
            <Panel className="flex items-center justify-center gap-2 py-8 text-sm text-muted">
              <Spinner />
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
          {sortedGroups.map((group) => (
            <div key={group.role}>
              <div className="mb-0.5 px-2 py-0.5 font-mono text-2xs uppercase tracking-widest text-faint">
                {roleGlyph(group.role)} {group.role}
              </div>
              {group.sessions.map((s) => (
                <button
                  key={s.name}
                  onClick={() => handleSelect(s)}
                  className={cn(
                    'flex w-full items-center gap-1.5 rounded px-2 py-1 text-left font-mono text-xs transition-colors',
                    active?.name === s.name
                      ? 'bg-accent/15 text-accent'
                      : 'text-muted hover:bg-raised hover:text-fg',
                  )}
                >
                  <span className="text-[10px] opacity-60">{roleGlyph(s.role)}</span>
                  <span className="truncate">{s.name}</span>
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Terminal pane */}
        <div className="min-w-0 flex-1 overflow-hidden rounded border border-line">
          {active ? (
            <XtermPane key={active.name} session={active} onDetach={handleDetach} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 bg-ink">
              <span className="font-mono text-2xl text-faint">⌗</span>
              <p className="font-mono text-xs text-faint">select a session to attach</p>
            </div>
          )}
        </div>
      </div>
    </Surface>
  );
}
