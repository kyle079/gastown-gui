import { useState } from 'react';
import { Badge, Button, Dialog, Input, Select, Textarea, useToast } from '@/components/primitives';
import { ApiError } from '@/lib/api/client';
import { useCreateBead, useMayorRequest, useTargets } from '@/lib/query/hooks';
import { rankTargets } from '@/features/ops/opsModel';

type Mode = 'file' | 'dispatch';

const PRIORITY_OPTIONS = [
  { value: '', label: 'Default (P2)' },
  { value: '0', label: 'P0 — Urgent' },
  { value: '1', label: 'P1 — High' },
  { value: '2', label: 'P2 — Normal' },
  { value: '3', label: 'P3 — Low' },
  { value: '4', label: 'P4 — Backlog' },
];

export function NewWorkDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { notify } = useToast();
  const { data: targets } = useTargets();
  const createBead = useCreateBead();
  const mayorRequest = useMayorRequest();

  const [mode, setMode] = useState<Mode>('file');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('');
  const [labelsRaw, setLabelsRaw] = useState('');
  const [target, setTarget] = useState('');

  const sortedTargets = rankTargets(targets ?? []);
  const isPending = createBead.isPending || mayorRequest.isPending;
  const canSubmit = title.trim().length > 0 && !isPending;

  const fileError =
    createBead.error instanceof ApiError
      ? createBead.error.message
      : createBead.error
        ? 'Failed to create bead'
        : null;

  const dispatchError =
    mayorRequest.error instanceof ApiError
      ? mayorRequest.error.message
      : mayorRequest.error
        ? 'Failed to dispatch'
        : null;

  const error = fileError ?? dispatchError;

  function reset() {
    setTitle('');
    setDescription('');
    setPriority('');
    setLabelsRaw('');
    setTarget('');
    setMode('file');
    createBead.reset();
    mayorRequest.reset();
  }

  function close() {
    reset();
    onClose();
  }

  function submit() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    if (mode === 'file') {
      const labels = labelsRaw
        .split(',')
        .map((l) => l.trim())
        .filter(Boolean);
      createBead.mutate(
        {
          title: trimmedTitle,
          description: description.trim() || undefined,
          priority: priority !== '' ? Number(priority) : undefined,
          labels: labels.length > 0 ? labels : undefined,
        },
        {
          onSuccess: (result) => {
            notify(`Filed ${result.bead_id}`, 'ok');
            close();
          },
        },
      );
    } else {
      // "File & dispatch" — let the mayor create + sling immediately.
      const prompt = description.trim()
        ? `${trimmedTitle}\n\n${description.trim()}`
        : trimmedTitle;
      mayorRequest.mutate(
        { prompt, target: target || undefined },
        {
          onSuccess: (result) => {
            notify(
              result.status === 'ok'
                ? `Dispatched ${result.summary.dispatched} item${result.summary.dispatched === 1 ? '' : 's'}`
                : 'Created with follow-up needed',
              result.status === 'ok' ? 'ok' : 'warn',
            );
            close();
          },
        },
      );
    }
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title="New work"
      description="File a plain issue to work on later, or file and dispatch it to an agent now."
      footer={
        <>
          <Button size="sm" variant="ghost" onClick={close} disabled={isPending}>
            Cancel
          </Button>
          <Button size="sm" variant="primary" onClick={submit} disabled={!canSubmit}>
            {isPending
              ? mode === 'file'
                ? 'Filing…'
                : 'Dispatching…'
              : mode === 'file'
                ? 'File it'
                : 'File & dispatch'}
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
        {/* Mode toggle */}
        <div className="flex gap-1 rounded-md border border-line bg-surface-alt p-1">
          <button
            type="button"
            onClick={() => setMode('file')}
            className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
              mode === 'file'
                ? 'bg-overlay text-fg shadow-sm'
                : 'text-muted hover:text-fg'
            }`}
          >
            File it
          </button>
          <button
            type="button"
            onClick={() => setMode('dispatch')}
            className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
              mode === 'dispatch'
                ? 'bg-overlay text-fg shadow-sm'
                : 'text-muted hover:text-fg'
            }`}
          >
            File &amp; dispatch
          </button>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">Title</span>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs doing?"
            autoFocus
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">Description</span>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Optional context, acceptance criteria, or notes."
          />
        </label>

        {mode === 'file' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">Priority</span>
                <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
                  {PRIORITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">Labels</span>
                <Input
                  value={labelsRaw}
                  onChange={(e) => setLabelsRaw(e.target.value)}
                  placeholder="bug, frontend"
                />
              </label>
            </div>

            <div className="rounded-md border border-line bg-surface-alt px-3 py-2">
              <p className="text-xs text-faint">
                The issue will be filed as <Badge tone="neutral">open</Badge> and won&apos;t be
                dispatched. You can dispatch it later from the Work surface.
              </p>
            </div>
          </>
        )}

        {mode === 'dispatch' && (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-muted">Target (optional)</span>
              <Select value={target} onChange={(e) => setTarget(e.target.value)}>
                <option value="">Auto (let gt choose)</option>
                {sortedTargets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </label>

            <div className="rounded-md border border-line bg-surface-alt px-3 py-2">
              <p className="text-xs text-faint">
                The mayor will create the bead and sling it immediately. A polecat picks it up
                as soon as a slot is free.
              </p>
            </div>
          </>
        )}

        {error && <p className="font-mono text-xs text-danger">{error}</p>}
      </form>
    </Dialog>
  );
}
