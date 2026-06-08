import { useMemo, useState } from 'react';
import { Badge, Button, Dialog, Select, useToast } from '@/components/primitives';
import { BeadPicker } from '@/components/dispatch/BeadPicker';
import { targetOptionLabel } from '@/components/dispatch/beadPickerModel';
import { priorityLabel, priorityTone, statusLabel, statusTone } from '@/features/catalog/catalogMeta';
import { ApiError } from '@/lib/api/client';
import { useBeadDetail, useSling, useTargets } from '@/lib/query/hooks';
import { rankTargets } from '@/features/ops/opsModel';

export function DispatchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: targets } = useTargets();
  const sling = useSling();
  const { notify } = useToast();
  const [beadId, setBeadId] = useState('');
  const [target, setTarget] = useState('');
  const { data: bead } = useBeadDetail(beadId.trim() || undefined);
  const sortedTargets = useMemo(() => rankTargets(targets ?? []), [targets]);

  function reset() {
    setBeadId('');
    setTarget('');
    sling.reset();
  }

  function close() {
    reset();
    onClose();
  }

  function submit() {
    const id = beadId.trim();
    if (!id) return;
    sling.mutate(
      { bead: id, target: target || undefined },
      {
        onSuccess: () => {
          notify(`Dispatched ${id}${target ? ` → ${target}` : ''}`, 'accent');
          close();
        },
      },
    );
  }

  const error =
    sling.error instanceof ApiError
      ? sling.error.message
      : sling.error
        ? 'Dispatch failed'
        : null;

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Dispatch work"
      description="Browse active beads, search by title or id, then sling the selected work onto a target hook."
      footer={
        <>
          <Button size="sm" variant="ghost" onClick={close} disabled={sling.isPending}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={submit}
            disabled={!beadId.trim() || sling.isPending}
          >
            {sling.isPending ? 'Dispatching…' : 'Dispatch'}
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label className="flex flex-col gap-1.5">
          <BeadPicker value={beadId} onChange={setBeadId} autoFocus />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">Target</span>
          <Select value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="">Auto (let gt choose)</option>
            {sortedTargets.map((t) => (
              <option key={t.id} value={t.id}>
                {targetOptionLabel(t)}
              </option>
            ))}
          </Select>
        </label>

        {beadId && (
          <div className="rounded-md border border-line bg-surface-alt p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-mono text-xs text-fg">{bead?.id || beadId}</div>
                <div className="mt-1 text-sm text-muted">
                  {bead?.title || 'Manual bead id will be dispatched exactly as entered.'}
                </div>
              </div>
              {bead && (
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={priorityTone(bead.priority)}>{priorityLabel(bead.priority)}</Badge>
                  <Badge tone={statusTone(bead.status)}>{statusLabel(bead.status)}</Badge>
                </div>
              )}
            </div>
          </div>
        )}

        {error && <p className="font-mono text-xs text-danger">{error}</p>}
      </form>
    </Dialog>
  );
}
