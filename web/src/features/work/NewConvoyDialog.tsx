import { useState } from 'react';
import { Dialog, Button, Input, useToast } from '@/components/primitives';
import { useCreateConvoy } from '@/lib/query/hooks';

/** Split a free-text bead-id field on whitespace/commas into clean ids. */
function parseIssues(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Dispatch a convoy — name plus the beads it should track. Deliberately small:
 * the surface's job is the queue; this is the one action that adds to it. On
 * success it selects the new convoy so the operator lands on what they just made.
 */
export function NewConvoyDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (convoyId: string) => void;
}) {
  const [name, setName] = useState('');
  const [issues, setIssues] = useState('');
  const { notify } = useToast();
  const create = useCreateConvoy();

  const reset = () => {
    setName('');
    setIssues('');
  };

  const close = () => {
    if (create.isPending) return;
    reset();
    onClose();
  };

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    create.mutate(
      { name: trimmed, issues: parseIssues(issues) },
      {
        onSuccess: (res) => {
          notify('Convoy dispatched', 'accent');
          if (res?.convoy_id) onCreated?.(res.convoy_id);
          reset();
          onClose();
        },
        onError: (err) => {
          notify(err instanceof Error ? err.message : 'Failed to dispatch convoy', 'danger');
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Dispatch convoy"
      description="Start a convoy to track a unit of work through to completion."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={close} disabled={create.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={submit}
            disabled={!name.trim() || create.isPending}
          >
            {create.isPending ? 'Dispatching…' : 'Dispatch'}
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
          <span className="text-xs text-muted">Name</span>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="What this convoy delivers"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">
            Beads <span className="text-faint">(optional — ids, space or comma separated)</span>
          </span>
          <Input
            value={issues}
            onChange={(e) => setIssues(e.target.value)}
            placeholder="gg-abc gg-xyz"
            className="font-mono"
          />
        </label>
      </form>
    </Dialog>
  );
}
