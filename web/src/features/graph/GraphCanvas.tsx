import { useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { BeadGraphData, BeadGraphNode } from '@/lib/api/types';
import { BeadNode } from './BeadNode';
import { applyLayout } from './layout';
import { edgeColor, rigColor } from './graphMeta';

const NODE_TYPES = { bead: BeadNode };

interface GraphCanvasProps {
  data: BeadGraphData;
}

export function GraphCanvas({ data }: GraphCanvasProps) {
  const { nodes: laid, edges: laidEdges } = useMemo(() => applyLayout(data), [data]);

  const styled = useMemo(() => {
    return laid.map((n) => ({
      ...n,
      draggable: false,
      selectable: false,
    }));
  }, [laid]);

  const styledEdges = useMemo(() => {
    return laidEdges.map((e) => {
      return {
        ...e,
        selectable: false,
        style: {
          stroke: edgeColor((e.data as { depType?: string })?.depType ?? ''),
          strokeWidth: 1.5,
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
  }, [laidEdges]);

  const [nodes, setNodes, onNodesChange] = useNodesState(styled);
  const [edges, setEdges, onEdgesChange] = useEdgesState(styledEdges);

  useEffect(() => { setNodes(styled); }, [styled, setNodes]);
  useEffect(() => { setEdges(styledEdges); }, [styledEdges, setEdges]);

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        fitViewOptions={{ padding: 0.1 }}
        minZoom={0.1}
        maxZoom={2}
        nodesDraggable={false}
        nodesConnectable={false}
        nodesFocusable={false}
        edgesFocusable={false}
        elementsSelectable={false}
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
          nodeColor={(n) => rigColor((n.data as unknown as BeadGraphNode).rig)}
          maskColor="rgb(var(--c-ink) / 0.7)"
        />
      </ReactFlow>
    </div>
  );
}
