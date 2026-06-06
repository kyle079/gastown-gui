import dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/react';
import type { BeadGraphData, BeadGraphNode } from '@/lib/api/types';

const NODE_W = 220;
const NODE_H = 72;

/**
 * Convert raw graph data to React Flow nodes+edges with dagre layout applied.
 * Returns top-down layered layout — natural for a dependency DAG.
 */
export function applyLayout(data: BeadGraphData): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 60, marginx: 20, marginy: 20 });

  const nodeIds = new Set(data.nodes.map((n) => n.id));

  for (const node of data.nodes) {
    g.setNode(node.id, { width: NODE_W, height: NODE_H });
  }

  // Only add edges where both endpoints exist in our node set.
  for (const edge of data.edges) {
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  }

  dagre.layout(g);

  const nodes: Node[] = data.nodes.map((n: BeadGraphNode) => {
    const pos = g.node(n.id);
    return {
      id: n.id,
      type: 'bead',
      position: { x: (pos?.x ?? 0) - NODE_W / 2, y: (pos?.y ?? 0) - NODE_H / 2 },
      data: n as unknown as Record<string, unknown>,
    };
  });

  const edges: Edge[] = data.edges
    .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
    .map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.type,
      type: 'smoothstep',
      animated: e.type === 'blocks',
      data: { depType: e.type },
    }));

  return { nodes, edges };
}
