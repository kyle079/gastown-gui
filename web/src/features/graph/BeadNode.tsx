import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils/cn';
import type { BeadGraphNode } from '@/lib/api/types';
import { priorityBorder, rigColor, shortTitle, statusColor } from './graphMeta';

export type BeadNodeData = BeadGraphNode & { selected?: boolean };

/**
 * Custom React Flow node for a single bead.
 * Styled per DESIGN.md: sharp corners, semantic color on the status dot,
 * priority reflected in the border, no glow.
 */
export const BeadNode = memo(function BeadNode({ data, selected }: NodeProps) {
  const node = data as unknown as BeadNodeData;
  const border = priorityBorder(node.priority);
  const dot = statusColor(node.status);
  const rig = rigColor(node.rig);

  return (
    <div
      className={cn(
        'relative flex min-w-[160px] max-w-[220px] flex-col gap-1 rounded bg-surface px-2.5 py-2',
        'border transition-colors',
        selected ? 'ring-1 ring-accent' : '',
      )}
      style={{
        borderColor: selected ? 'rgb(var(--c-accent))' : border,
        borderLeftColor: selected ? 'rgb(var(--c-accent))' : rig,
        borderLeftWidth: 3,
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-line-strong !border-line" />

      {/* ID + status dot */}
      <div className="flex items-center gap-1.5">
        <span
          className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ background: dot }}
          title={node.status}
        />
        <span className="font-mono text-2xs text-faint">{node.id}</span>
        {(node.priority ?? 99) <= 1 && (
          <span className="ml-auto font-mono text-2xs text-warn">P{node.priority}</span>
        )}
      </div>

      {/* Title */}
      <p className="text-xs leading-tight text-fg" title={node.title}>
        {shortTitle(node)}
      </p>

      {/* Type badge */}
      {node.issue_type && (
        <span className="font-mono text-2xs text-faint">{node.issue_type}</span>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-line-strong !border-line" />
    </div>
  );
});
