import { useState } from 'react';
import { Dialog, Button, Input, Select, useToast } from '@/components/primitives';
import { ApiError } from '@/lib/api/client';
import { useSling, useTargets } from '@/lib/query/hooks';

/**
 * Dispatch a bead onto a target's hook. Deliberately minimal: either an existing
 * bead id or a new title (and optional description) to create-on-dispatch.
 */
export function DispatchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: targets } = useTargets();
  const sling = useSling();
  const { notify } = useToast();
  const [bead, setBead] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [target, setTarget] = useState('');

  function reset() {
    setBead('');
    setTitle('');
    setDescription('');
    setTarget('');
    sling.reset();
  }

  function close() {
    reset();
    onClose();
  }

  function submit() {
    const id = bead.trim();
    const resolvedTitle = title.trim();
    if (!id && !resolvedTitle) return;

    const payload = {
      target: target || undefined,
      ...(id
        ? { bead: id }
        : {
            title: resolvedTitle,
            ...(description.trim() ? { description: description.trim() } : {}),
          }),
    };

    sling.mutate(payload, {
      onSuccess: (data) => {
        const beaded = data?.data?.bead || id || resolvedTitle;
        notify(`Dispatched ${beaded}${target ? ` → ${target}` : ''}`, 'accent');
        close();
      },
    });
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
      description="Sling a bead onto an agent's hook."
      footer={
        <>
          <Button size="sm" variant="ghost" onClick={close} disabled={sling.isPending}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={submit}
            disabled={(!bead.trim() && !title.trim()) || sling.isPending}
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
          <span className="text-2xs uppercase tracking-wider text-faint">Bead</span>
          <Input
            value={bead}
            onChange={(e) => setBead(e.target.value)}
            placeholder="e.g. gg-071"
            className="font-mono"
            autoFocus
          />
        </label>

        {!bead.trim() && (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="text-2xs uppercase tracking-wider text-faint">Title</span>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="A descriptive title"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-2xs uppercase tracking-wider text-faint">Description (optional)</span>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional details"
              />
            </label>
          </>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-2xs uppercase tracking-wider text-faint">Target</span>
          <Select value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="">Auto (let gt choose)</option>
            {(targets ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.type !== 'agent' ? ` — ${t.type}` : t.role ? ` — ${t.role}` : ''}
              </option>
            ))}
          </Select>
        </label>

        {error && <p className="font-mono text-xs text-danger">{error}</p>}
      </form>
    </Dialog>
  );
}
