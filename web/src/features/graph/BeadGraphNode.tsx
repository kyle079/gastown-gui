import { memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils/cn';
import { nodeColor, nodeBorderWidth } from './graphMeta';

export interface BeadNodeData extends Record<string, unknown> {
  id: string;
  title: string;
  status: string;
  priority: number | null;
  issue_type: string | null;
  owner: string | null;
  assignee: string | null;
  description: string | null;
  created_at: string | null;
  updated_at: string | null;
  rig: string | null;
  focused: boolean;
  dimmed: boolean;
}

export type BeadFlowNode = Node<BeadNodeData, 'bead'>;

function BeadGraphNodeInner({ data, selected }: NodeProps<BeadFlowNode>) {
  const color = nodeColor(data.status);
  const bw = nodeBorderWidth(data.priority);
  const shortTitle = data.title.length > 32 ? data.title.slice(0, 30) + '…' : data.title;

  return (
    <div
      className={cn(
        'relative flex flex-col gap-0.5 rounded px-2.5 py-1.5 text-left',
        'bg-surface transition-opacity duration-100',
        selected && 'ring-1 ring-accent',
        data.dimmed && 'opacity-30',
      )}
      style={{
        border: `${bw}px solid ${color}`,
        minWidth: 140,
        maxWidth: 180,
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!size-1.5 !rounded-none !border-0"
        style={{ background: color }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!size-1.5 !rounded-none !border-0"
        style={{ background: color }}
      />

      <span className="font-mono text-[10px] leading-none text-faint">{data.id}</span>
      <span className="text-[11px] leading-snug text-fg" title={data.title}>
        {shortTitle}
      </span>
      <div className="mt-0.5 flex items-center gap-1.5">
        <span
          className="rounded-sm px-1 py-px font-mono text-[9px] leading-none"
          style={{ background: `${color}22`, color }}
        >
          {data.status.replace(/_/g, ' ')}
        </span>
        {data.priority != null && (
          <span className="font-mono text-[9px] leading-none text-faint">
            P{data.priority}
          </span>
        )}
      </div>
    </div>
  );
}

export const BeadGraphNode = memo(BeadGraphNodeInner);
