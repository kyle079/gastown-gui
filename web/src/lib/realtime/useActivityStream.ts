import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';

function wsUrl(): string {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws`;
}

/**
 * Opens the gt bridge WebSocket and nudges the activity query to refetch the
 * instant a live event arrives — real-time feel, while the structured
 * `/api/activity` read stays the single source of truth (one event taxonomy,
 * robust across reconnects). Returns whether the socket is currently connected,
 * which drives the surface's "live" indicator.
 */
export function useActivityStream(): { live: boolean } {
  const queryClient = useQueryClient();
  const [live, setLive] = useState(false);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let coalesceTimer: ReturnType<typeof setTimeout> | undefined;
    let pending = false;
    let closed = false;

    // Leading-edge refetch, then coalesce a burst of events into one trailing
    // refetch so a flurry of activity doesn't hammer the bridge.
    const nudge = () => {
      if (coalesceTimer) {
        pending = true;
        return;
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.activity });
      coalesceTimer = setTimeout(() => {
        coalesceTimer = undefined;
        if (pending) {
          pending = false;
          nudge();
        }
      }, 1500);
    };

    const scheduleReconnect = () => {
      if (closed || reconnectTimer) return;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = undefined;
        connect();
      }, 3000);
    };

    const connect = () => {
      if (closed) return;
      try {
        ws = new WebSocket(wsUrl());
      } catch {
        scheduleReconnect();
        return;
      }
      ws.onopen = () => setLive(true);
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg?.type === 'activity') nudge();
        } catch {
          // Ignore non-JSON frames.
        }
      };
      ws.onclose = () => {
        setLive(false);
        scheduleReconnect();
      };
      ws.onerror = () => ws?.close();
    };

    connect();

    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (coalesceTimer) clearTimeout(coalesceTimer);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, [queryClient]);

  return { live };
}
