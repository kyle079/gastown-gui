import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Dialog,
  Select,
  Textarea,
  useToast,
} from '@/components/primitives';
import { ApiError } from '@/lib/api/client';
import type { TrackedBead } from '@/lib/api/types';
import {
  useMarkWorkDone,
  useParkWork,
  useReassign,
  useReleaseWork,
  useTargets,
} from '@/lib/query/hooks';

export type TrackedBeadAction = 'done' | 'park' | 'release' | 'reassign';

function mutationErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

function dialogMeta(action: TrackedBeadAction) {
  switch (action) {
    case 'done':
      return {
        title: 'Mark work done',
        description: 'Close the bead and capture a completion summary for the ledger.',
        button: 'Mark done',
        tone: 'primary' as const,
      };
    case 'park':
      return {
        title: 'Park work',
        description: 'Move the bead out of the active lane with a reason operators can read later.',
        button: 'Park bead',
        tone: 'default' as const,
      };
    case 'release':
      return {
        title: 'Release work',
        description: 'Return the bead to an open, unassigned state.',
        button: 'Release bead',
        tone: 'danger' as const,
      };
    default:
      return {
        title: 'Reassign work',
        description: 'Move the bead onto another operator or rig target.',
        button: 'Reassign bead',
        tone: 'primary' as const,
      };
  }
}

export function TrackedBeadActionDialog({
  bead,
  action,
  open,
  onClose,
}: {
  bead: TrackedBead | null;
  action: TrackedBeadAction | null;
  open: boolean;
  onClose: () => void;
}) {
  const { data: targets } = useTargets();
  const done = useMarkWorkDone();
  const park = useParkWork();
  const release = useReleaseWork();
  const reassign = useReassign();
  const { notify } = useToast();
  const doneResetRef = useRef(done.reset);
  const parkResetRef = useRef(park.reset);
  const releaseResetRef = useRef(release.reset);
  const reassignResetRef = useRef(reassign.reset);
  const [notes, setNotes] = useState('');
  const [target, setTarget] = useState('');

  doneResetRef.current = done.reset;
  parkResetRef.current = park.reset;
  releaseResetRef.current = release.reset;
  reassignResetRef.current = reassign.reset;

  useEffect(() => {
    if (!open) {
      setNotes('');
      setTarget('');
      doneResetRef.current();
      parkResetRef.current();
      releaseResetRef.current();
      reassignResetRef.current();
    }
  }, [open]);

  const meta = action ? dialogMeta(action) : null;
  const pending =
    done.isPending || park.isPending || release.isPending || reassign.isPending;
  const activeError = done.error ?? park.error ?? release.error ?? reassign.error;
  const error = useMemo(
    () => mutationErrorMessage(activeError, bead ? `Could not update ${bead.id}` : 'Could not update work'),
    [activeError, bead],
  );

  function submit() {
    if (!bead || !action) return;
    if (action === 'done') {
      done.mutate(
        { beadId: bead.id, summary: notes.trim() || undefined },
        {
          onSuccess: () => {
            notify(`Marked ${bead.id} done`, 'accent');
            onClose();
          },
        },
      );
      return;
    }

    if (action === 'park') {
      park.mutate(
        { beadId: bead.id, reason: notes.trim() || undefined },
        {
          onSuccess: () => {
            notify(`Parked ${bead.id}`, 'warn');
            onClose();
          },
        },
      );
      return;
    }

    if (action === 'release') {
      release.mutate(bead.id, {
        onSuccess: () => {
          notify(`Released ${bead.id}`, 'danger');
          onClose();
        },
      });
      return;
    }

    if (!target) return;
    reassign.mutate(
      { beadId: bead.id, target },
      {
        onSuccess: () => {
          notify(`Reassigned ${bead.id}`, 'accent');
          onClose();
        },
      },
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={meta?.title}
      description={bead ? `${bead.id} · ${bead.title}` : meta?.description}
      footer={
        <>
          <Button size="sm" variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant={meta?.tone ?? 'default'}
            onClick={submit}
            disabled={!bead || !action || (action === 'reassign' && !target) || pending}
          >
            {pending ? 'Working…' : meta?.button}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {action === 'reassign' ? (
          <label className="flex flex-col gap-1.5">
            <span className="text-2xs uppercase tracking-wider text-faint">Target</span>
            <Select value={target} onChange={(e) => setTarget(e.target.value)} autoFocus>
              <option value="">Choose a target…</option>
              {(targets ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </label>
        ) : action === 'release' ? (
          <div className="rounded-md border border-line bg-surface-alt px-3 py-3 text-sm text-muted">
            The bead will be reopened and unassigned. Use this when the current hook should be cleared without closing the work.
          </div>
        ) : (
          <label className="flex flex-col gap-1.5">
            <span className="text-2xs uppercase tracking-wider text-faint">
              {action === 'done' ? 'Completion summary' : 'Reason'}
            </span>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              autoFocus
              rows={5}
              placeholder={
                action === 'done'
                  ? 'What changed, what landed, or what closes this work?'
                  : 'Why is this work being parked?'
              }
            />
          </label>
        )}
      </div>
      {activeError && <p className="mt-4 text-sm text-danger">{error}</p>}
    </Dialog>
  );
}
