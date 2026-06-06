import { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type Edge,
  type NodeTypes,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Badge, Dialog, Spinner } from '@/components/primitives';
import { DetailField } from '@/features/catalog/DetailField';
import { priorityLabel, priorityTone, statusLabel, statusTone } from '@/features/catalog/catalogMeta';
import { relativeTime } from '@/lib/utils/format';
import { useBeadGraph } from '@/lib/query/hooks';
import type { BeadNode as ApiBeadNode } from '@/lib/api/types';
import { nodeColor, edgeMeta, rigLabel } from './graphMeta';
import { BeadGraphNode, type BeadFlowNode, type BeadNodeData } from './BeadGraphNode';

const NODE_TYPES: NodeTypes = { bead: BeadGraphNode };

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'hooked', label: 'Hooked' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'closed', label: 'Closed' },
  { value: 'deferred', label: 'Deferred' },
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'All priorities' },
  { value: '0', label: 'P0' },
  { value: '1', label: 'P1' },
  { value: '2', label: 'P2' },
  { value: '3', label: 'P3' },
];

function autoLayout(nodes: BeadFlowNode[]): BeadFlowNode[] {
  const cols = Math.ceil(Math.sqrt(nodes.length)) || 1;
  const W = 220;
  const H = 90;
  return nodes.map((n, i) => ({
    ...n,
    position: { x: (i % cols) * W, y: Math.floor(i / cols) * H },
  }));
}

function collectNeighbors(
  focusedId: string,
  edges: { source: string; target: string }[],
): Set<string> {
  const s = new Set<string>();
  for (const e of edges) {
    if (e.source === focusedId) s.add(e.target);
    if (e.target === focusedId) s.add(e.source);
  }
  return s;
}

export function BeadGraph() {
  const { data, isLoading, isError } = useBeadGraph();

  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterRig, setFilterRig] = useState('');
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<ApiBeadNode | null>(null);

  const allRigs = useMemo(() => {
    if (!data) return [];
    const s = new Set<string>();
    data.nodes.forEach((n) => n.rig && s.add(n.rig));
    return [...s].sort();
  }, [data]);

  const neighbors = useMemo(() => {
    if (!focusedId || !data) return new Set<string>();
    return collectNeighbors(focusedId, data.edges);
  }, [focusedId, data]);

  const flowNodes = useMemo((): BeadFlowNode[] => {
    if (!data) return [];

    const filtered = data.nodes.filter((n) => {
      if (filterStatus && n.status !== filterStatus) return false;
      if (filterPriority && String(n.priority) !== filterPriority) return false;
      if (filterRig && n.rig !== filterRig) return false;
      return true;
    });

    const raw: BeadFlowNode[] = filtered.map((n) => {
      const dimmed =
        focusedId != null && n.id !== focusedId && !neighbors.has(n.id);
      const nodeData: BeadNodeData = {
        ...n,
        focused: n.id === focusedId,
        dimmed,
      };
      return {
        id: n.id,
        type: 'bead' as const,
        data: nodeData,
        position: { x: 0, y: 0 },
        selected: n.id === focusedId,
      };
    });

    return autoLayout(raw);
  }, [data, focusedId, neighbors, filterStatus, filterPriority, filterRig]);

  const flowEdges = useMemo((): Edge[] => {
    if (!data) return [];
    const visibleIds = new Set(flowNodes.map((n) => n.id));
    return data.edges
      .filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target))
      .map((e) => {
        const meta = edgeMeta(e.type);
        const dimmed =
          focusedId != null &&
          e.source !== focusedId &&
          e.target !== focusedId &&
          !neighbors.has(e.source) &&
          !neighbors.has(e.target);
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          label: meta.label,
          animated: e.type === 'blocks',
          style: {
            stroke: dimmed
              ? 'rgb(46 57 64)'
              : e.type === 'blocks'
              ? 'rgb(210 153 34)'
              : 'rgb(46 57 64 / 0.8)',
            strokeWidth: e.type === 'blocks' ? 1.5 : 1,
            strokeDasharray: meta.dash,
            opacity: dimmed ? 0.2 : 1,
          },
          labelStyle: { fill: 'rgb(92 103 108)', fontSize: 9 },
          labelBgStyle: { fill: 'rgb(16 20 23)', fillOpacity: 0.85 },
        } satisfies Edge;
      });
  }, [data, flowNodes, focusedId, neighbors]);

  const handleNodeClick = useCallback<NodeMouseHandler<BeadFlowNode>>(
    (_e, node) => {
      const bead = data?.nodes.find((n) => n.id === node.id) ?? null;
      setSelected(bead);
    },
    [data],
  );

  const handlePaneClick = useCallback(() => {
    setFocusedId(null);
  }, []);

  const handleNodeDoubleClick = useCallback<NodeMouseHandler<BeadFlowNode>>(
    (_e, node) => {
      setFocusedId((prev) => (prev === node.id ? null : node.id));
    },
    [],
  );

  const toggleFocus = useCallback((id: string) => {
    setFocusedId((prev) => (prev === id ? null : id));
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center gap-2">
        <Spinner />
        <span className="text-sm text-muted">Loading graph…</span>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-danger">Failed to load bead graph.</p>
      </div>
    );
  }

  const nodeCount = flowNodes.length;
  const edgeCount = flowEdges.length;

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface px-4 py-2">
        <span className="font-mono text-xs text-faint">
          {nodeCount} node{nodeCount !== 1 ? 's' : ''} · {edgeCount} edge{edgeCount !== 1 ? 's' : ''}
        </span>

        <select
          className="rounded border border-line bg-base px-2 py-1 font-mono text-xs text-muted focus:outline-none focus:ring-1 focus:ring-accent"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          aria-label="Filter by status"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select
          className="rounded border border-line bg-base px-2 py-1 font-mono text-xs text-muted focus:outline-none focus:ring-1 focus:ring-accent"
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          aria-label="Filter by priority"
        >
          {PRIORITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {allRigs.length > 1 && (
          <select
            className="rounded border border-line bg-base px-2 py-1 font-mono text-xs text-muted focus:outline-none focus:ring-1 focus:ring-accent"
            value={filterRig}
            onChange={(e) => setFilterRig(e.target.value)}
            aria-label="Filter by rig"
          >
            <option value="">All rigs</option>
            {allRigs.map((r) => (
              <option key={r} value={r}>{rigLabel(r)}</option>
            ))}
          </select>
        )}

        {focusedId && (
          <button
            className="rounded border border-accent/40 px-2 py-1 font-mono text-xs text-accent hover:bg-accent/10 focus:outline-none focus:ring-1 focus:ring-accent"
            onClick={() => setFocusedId(null)}
          >
            ✕ clear focus
          </button>
        )}
      </div>

      {/* Graph canvas — fills remaining height */}
      <div className="flex-1" style={{ background: 'rgb(10 13 15)' }}>
        <ReactFlow<BeadFlowNode, Edge>
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={NODE_TYPES}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
          maxZoom={3}
          proOptions={{ hideAttribution: true }}
          colorMode="dark"
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1}
            color="rgb(33 41 46)"
          />
          <Controls
            className="!border-line !bg-surface [&_button]:!border-line [&_button]:!bg-surface [&_button]:!text-muted"
            showInteractive={false}
          />
          <MiniMap
            nodeColor={(n) => nodeColor((n.data as BeadNodeData).status)}
            maskColor="rgba(10,13,15,0.7)"
            style={{ background: 'rgb(16 20 23)', border: '1px solid rgb(33 41 46)' }}
          />
        </ReactFlow>
      </div>

      {/* Node detail dialog */}
      <Dialog
        open={selected != null}
        onClose={() => setSelected(null)}
        title={
          selected ? (
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted">{selected.id}</span>
              <button
                className="ml-auto rounded border border-line px-1.5 py-0.5 font-mono text-[9px] text-faint hover:border-accent/40 hover:text-accent focus:outline-none focus:ring-1 focus:ring-accent"
                onClick={() => {
                  toggleFocus(selected.id);
                  setSelected(null);
                }}
              >
                focus subgraph
              </button>
            </div>
          ) : undefined
        }
        description={selected?.title}
      >
        {selected && (
          <div className="flex flex-col gap-4">
            <div>
              <DetailField label="Status">
                <Badge tone={statusTone(selected.status)}>{statusLabel(selected.status)}</Badge>
              </DetailField>
              <DetailField label="Priority">
                <Badge tone={priorityTone(selected.priority ?? undefined)}>
                  {priorityLabel(selected.priority ?? undefined)}
                </Badge>
              </DetailField>
              <DetailField label="Type">{selected.issue_type ?? '—'}</DetailField>
              <DetailField label="Rig">{rigLabel(selected.rig)}</DetailField>
              <DetailField label="Owner">
                <span className="font-mono text-xs">{selected.owner ?? '—'}</span>
              </DetailField>
              {selected.assignee && (
                <DetailField label="Assignee">
                  <span className="font-mono text-xs">{selected.assignee}</span>
                </DetailField>
              )}
              <DetailField label="Updated">{relativeTime(selected.updated_at)}</DetailField>
            </div>
            {selected.description && (
              <div>
                <p className="mb-1.5 font-mono text-2xs uppercase tracking-wider text-faint">
                  Description
                </p>
                <p className="max-h-60 overflow-y-auto whitespace-pre-wrap text-xs text-muted">
                  {selected.description.slice(0, 600)}
                  {selected.description.length > 600 ? '…' : ''}
                </p>
              </div>
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
}
