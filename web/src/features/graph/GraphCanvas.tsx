import { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge,
  type Node,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { BeadGraphData, BeadGraphNode } from '@/lib/api/types';
import { BeadNode } from './BeadNode';
import { applyLayout } from './layout';
import { edgeColor, statusColor } from './graphMeta';

const NODE_TYPES = { bead: BeadNode };

interface GraphCanvasProps {
  data: BeadGraphData;
  /** When a node is clicked, surface its detail. */
  onNodeClick?: (node: BeadGraphNode) => void;
  /** IDs to highlight (focus subgraph). */
  focused?: Set<string>;
}

/**
 * React Flow canvas. Computes dagre layout once on mount / data change.
 * Parents pass in raw BeadGraphData; this component handles positioning.
 */
export function GraphCanvas({ data, onNodeClick, focused }: GraphCanvasProps) {
  const { nodes: laid, edges: laidEdges } = useMemo(() => applyLayout(data), [data]);

  // Apply focus dimming: unfocused nodes get reduced opacity.
  const styled = useMemo(() => {
    if (!focused?.size) return laid;
    return laid.map((n) => ({
      ...n,
      style: {
        ...n.style,
        opacity: focused.has(n.id) ? 1 : 0.2,
        transition: 'opacity 120ms',
      },
    }));
  }, [laid, focused]);

  const styledEdges = useMemo(() => {
    return laidEdges.map((e) => {
      const active = !focused?.size || (focused.has(e.source) && focused.has(e.target));
      return {
        ...e,
        style: {
          stroke: edgeColor((e.data as { depType?: string })?.depType ?? ''),
          strokeWidth: 1.5,
          opacity: active ? 1 : 0.1,
        },
        labelStyle: {
          fill: 'rgb(var(--c-faint))',
          fontSize: 10,
          fontFamily: 'JetBrains Mono, ui-monospace, monospace',
        },
        labelBgStyle: {
          fill: 'rgb(var(--c-surface))',
          fillOpacity: 0.85,
        },
      };
    });
  }, [laidEdges, focused]);

  const [nodes, , onNodesChange] = useNodesState(styled);
  const [edges, , onEdgesChange] = useEdgesState(styledEdges);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeClick?.(node.data as BeadGraphNode);
    },
    [onNodeClick],
  );

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        fitView
        fitViewOptions={{ padding: 0.1 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={40}
          size={1}
          color="rgb(var(--c-line))"
          style={{ background: 'rgb(var(--c-base))' }}
        />
        <Controls
          style={{
            background: 'rgb(var(--c-surface))',
            border: '1px solid rgb(var(--c-line))',
            borderRadius: 4,
          }}
        />
        <MiniMap
          style={{
            background: 'rgb(var(--c-surface))',
            border: '1px solid rgb(var(--c-line))',
            borderRadius: 4,
          }}
          nodeColor={(n) => statusColor((n.data as BeadGraphNode).status)}
          maskColor="rgb(var(--c-ink) / 0.7)"
        />
      </ReactFlow>
    </div>
  );
}
