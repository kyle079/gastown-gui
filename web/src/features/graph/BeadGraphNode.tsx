import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils/cn';
import type { BeadNode } from '@/lib/api/types';
import { nodeColor, nodeBorderWidth } from './graphMeta';

export type BeadNodeData = BeadNode & { focused: boolean; dimmed: boolean };

function BeadGraphNodeInner({ data, selected }: NodeProps) {
  const d = data as BeadNodeData;
  const color = nodeColor(d.status);
  const bw = nodeBorderWidth(d.priority);

  const shortTitle =
    d.title.length > 32 ? d.title.slice(0, 30) + '…' : d.title;

  return (
    <div
      className={cn(
        'relative flex flex-col gap-0.5 rounded px-2.5 py-1.5 text-left',
        'bg-surface transition-opacity duration-100',
        selected && 'ring-1 ring-accent',
        d.dimmed && 'opacity-30',
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

      <span className="font-mono text-[10px] leading-none text-faint">{d.id}</span>
      <span
        className="text-[11px] leading-snug text-fg"
        title={d.title}
      >
        {shortTitle}
      </span>
      <div className="mt-0.5 flex items-center gap-1.5">
        <span
          className="rounded-sm px-1 py-px font-mono text-[9px] leading-none"
          style={{ background: `${color}22`, color }}
        >
          {d.status.replace(/_/g, ' ')}
        </span>
        {d.priority != null && (
          <span className="font-mono text-[9px] leading-none text-faint">
            P{d.priority}
          </span>
        )}
      </div>
    </div>
  );
}

export const BeadGraphNode = memo(BeadGraphNodeInner);
