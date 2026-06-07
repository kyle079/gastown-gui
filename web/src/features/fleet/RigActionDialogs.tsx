import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Dialog, Input, useToast } from '@/components/primitives';
import { ApiError } from '@/lib/api/client';
import { useAddRig, useRemoveRig } from '@/lib/query/hooks';

function mutationErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

export function NewRigDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (name: string) => void;
}) {
  const addRig = useAddRig();
  const { notify } = useToast();
  const addRigResetRef = useRef(addRig.reset);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');

  addRigResetRef.current = addRig.reset;

  useEffect(() => {
    if (!open) {
      setName('');
      setUrl('');
      addRigResetRef.current();
    }
  }, [open]);

  const error = useMemo(
    () => mutationErrorMessage(addRig.error, 'Could not add rig'),
    [addRig.error],
  );

  function submit() {
    const rigName = name.trim();
    const rigUrl = url.trim();
    if (!rigName || !rigUrl) return;
    addRig.mutate(
      { name: rigName, url: rigUrl },
      {
        onSuccess: () => {
          notify(`Queued rig add for ${rigName}`, 'accent');
          onCreated?.(rigName);
          onClose();
        },
      },
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add rig"
      description="Connect a project workspace so the town can inspect and operate it."
      footer={
        <>
          <Button size="sm" variant="ghost" onClick={onClose} disabled={addRig.isPending}>
            Cancel
          </Button>
          <Button size="sm" variant="primary" onClick={submit} disabled={!name.trim() || !url.trim() || addRig.isPending}>
            {addRig.isPending ? 'Adding…' : 'Add rig'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-2xs uppercase tracking-wider text-faint">Rig name</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="gastown_gui" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-2xs uppercase tracking-wider text-faint">Git URL</span>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/org/repo"
          />
        </label>
      </div>
      {addRig.error && <p className="mt-4 text-sm text-danger">{error}</p>}
    </Dialog>
  );
}

export function RemoveRigDialog({
  rigName,
  open,
  onClose,
  onRemoved,
}: {
  rigName: string;
  open: boolean;
  onClose: () => void;
  onRemoved?: () => void;
}) {
  const removeRig = useRemoveRig();
  const { notify } = useToast();
  const removeRigResetRef = useRef(removeRig.reset);
  const [confirmation, setConfirmation] = useState('');

  removeRigResetRef.current = removeRig.reset;

  useEffect(() => {
    if (!open) {
      setConfirmation('');
      removeRigResetRef.current();
    }
  }, [open]);

  const error = useMemo(
    () => mutationErrorMessage(removeRig.error, `Could not remove ${rigName}`),
    [removeRig.error, rigName],
  );

  function submit() {
    removeRig.mutate(rigName, {
      onSuccess: () => {
        notify(`Removed ${rigName}`, 'danger');
        onRemoved?.();
        onClose();
      },
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Remove ${rigName}`}
      description="This disconnects the rig from the operator console. Type the rig name to confirm."
      footer={
        <>
          <Button size="sm" variant="ghost" onClick={onClose} disabled={removeRig.isPending}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={submit}
            disabled={confirmation.trim() !== rigName || removeRig.isPending}
          >
            {removeRig.isPending ? 'Removing…' : 'Remove rig'}
          </Button>
        </>
      }
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-2xs uppercase tracking-wider text-faint">Confirm rig name</span>
        <Input
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          autoFocus
          className="font-mono"
          placeholder={rigName}
        />
      </label>
      {removeRig.error && <p className="mt-4 text-sm text-danger">{error}</p>}
    </Dialog>
  );
}
