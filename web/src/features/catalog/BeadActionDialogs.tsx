import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Dialog,
  Input,
  Select,
  Textarea,
  useToast,
} from '@/components/primitives';
import { ApiError } from '@/lib/api/client';
import type { BeadDetail } from '@/lib/api/types';
import { useCreateBead, useUpdateBead } from '@/lib/query/hooks';

const PRIORITY_OPTIONS = ['P0', 'P1', 'P2', 'P3', 'P4'] as const;
const STATUS_OPTIONS = ['open', 'in_progress', 'blocked', 'deferred', 'closed', 'pinned', 'hooked'] as const;

function parseLabels(input: string): string[] {
  return input
    .split(',')
    .map((label) => label.trim())
    .filter(Boolean);
}

function priorityValue(priority?: number): string {
  return typeof priority === 'number' ? `P${priority}` : 'P2';
}

function mutationErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

function BeadFormFields({
  title,
  onTitle,
  description,
  onDescription,
  priority,
  onPriority,
  status,
  onStatus,
  assignee,
  onAssignee,
  labels,
  onLabels,
  showWorkflowFields,
}: {
  title: string;
  onTitle: (value: string) => void;
  description: string;
  onDescription: (value: string) => void;
  priority: string;
  onPriority: (value: string) => void;
  status: string;
  onStatus: (value: string) => void;
  assignee: string;
  onAssignee: (value: string) => void;
  labels: string;
  onLabels: (value: string) => void;
  showWorkflowFields: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-2xs uppercase tracking-wider text-faint">Title</span>
        <Input value={title} onChange={(e) => onTitle(e.target.value)} autoFocus />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-2xs uppercase tracking-wider text-faint">Description</span>
        <Textarea
          value={description}
          onChange={(e) => onDescription(e.target.value)}
          rows={6}
          placeholder="Operator notes, constraints, or acceptance details…"
        />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-2xs uppercase tracking-wider text-faint">Priority</span>
          <Select value={priority} onChange={(e) => onPriority(e.target.value)}>
            {PRIORITY_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </label>

        {showWorkflowFields && (
          <label className="flex flex-col gap-1.5">
            <span className="text-2xs uppercase tracking-wider text-faint">Status</span>
            <Select value={status} onChange={(e) => onStatus(e.target.value)}>
              {STATUS_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </label>
        )}
      </div>

      {showWorkflowFields && (
        <label className="flex flex-col gap-1.5">
          <span className="text-2xs uppercase tracking-wider text-faint">Assignee</span>
          <Input
            value={assignee}
            onChange={(e) => onAssignee(e.target.value)}
            className="font-mono"
            placeholder="gastown_gui/polecats/amber"
          />
        </label>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-2xs uppercase tracking-wider text-faint">Labels</span>
        <Input
          value={labels}
          onChange={(e) => onLabels(e.target.value)}
          placeholder="operator, ui, urgent"
        />
      </label>
    </div>
  );
}

export function CreateBeadDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (beadId?: string) => void;
}) {
  const createBead = useCreateBead();
  const { notify } = useToast();
  const createBeadResetRef = useRef(createBead.reset);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('P2');
  const [labels, setLabels] = useState('');

  createBeadResetRef.current = createBead.reset;

  useEffect(() => {
    if (!open) {
      setTitle('');
      setDescription('');
      setPriority('P2');
      setLabels('');
      createBeadResetRef.current();
    }
  }, [open]);

  const error = useMemo(
    () => mutationErrorMessage(createBead.error, 'Could not create bead'),
    [createBead.error],
  );

  function submit() {
    const nextTitle = title.trim();
    if (!nextTitle) return;
    createBead.mutate(
      {
        title: nextTitle,
        description: description.trim() || undefined,
        priority,
        labels: parseLabels(labels),
      },
      {
        onSuccess: (data) => {
          notify(`Created ${data.bead_id ?? 'new bead'}`, 'accent');
          onCreated?.(data.bead_id);
          onClose();
        },
      },
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Create bead"
      description="Open a new work item without leaving the operator surface."
      footer={
        <>
          <Button size="sm" variant="ghost" onClick={onClose} disabled={createBead.isPending}>
            Cancel
          </Button>
          <Button size="sm" variant="primary" onClick={submit} disabled={!title.trim() || createBead.isPending}>
            {createBead.isPending ? 'Creating…' : 'Create bead'}
          </Button>
        </>
      }
    >
      <BeadFormFields
        title={title}
        onTitle={setTitle}
        description={description}
        onDescription={setDescription}
        priority={priority}
        onPriority={setPriority}
        status="open"
        onStatus={() => {}}
        assignee=""
        onAssignee={() => {}}
        labels={labels}
        onLabels={setLabels}
        showWorkflowFields={false}
      />
      {createBead.error && <p className="mt-4 text-sm text-danger">{error}</p>}
    </Dialog>
  );
}

export function EditBeadDialog({
  bead,
  open,
  onClose,
}: {
  bead: BeadDetail | undefined;
  open: boolean;
  onClose: () => void;
}) {
  const updateBead = useUpdateBead();
  const { notify } = useToast();
  const updateBeadResetRef = useRef(updateBead.reset);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('P2');
  const [status, setStatus] = useState('open');
  const [assignee, setAssignee] = useState('');
  const [labels, setLabels] = useState('');

  updateBeadResetRef.current = updateBead.reset;

  useEffect(() => {
    if (!open || !bead) return;
    setTitle(bead.title ?? '');
    setDescription(bead.description ?? '');
    setPriority(priorityValue(bead.priority));
    setStatus(bead.status ?? 'open');
    setAssignee(bead.assignee ?? '');
    setLabels((bead.labels ?? []).join(', '));
    updateBeadResetRef.current();
  }, [open, bead]);

  const error = useMemo(
    () => mutationErrorMessage(updateBead.error, `Could not update ${bead?.id ?? 'bead'}`),
    [bead?.id, updateBead.error],
  );

  function submit() {
    if (!bead || !title.trim()) return;
    updateBead.mutate(
      {
        beadId: bead.id,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        status,
        assignee: assignee.trim() || '',
        labels: parseLabels(labels),
      },
      {
        onSuccess: () => {
          notify(`Updated ${bead.id}`, 'accent');
          onClose();
        },
      },
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={bead ? `Edit ${bead.id}` : 'Edit bead'}
      description={bead?.title}
      footer={
        <>
          <Button size="sm" variant="ghost" onClick={onClose} disabled={updateBead.isPending}>
            Cancel
          </Button>
          <Button size="sm" variant="primary" onClick={submit} disabled={!bead || !title.trim() || updateBead.isPending}>
            {updateBead.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </>
      }
    >
      <BeadFormFields
        title={title}
        onTitle={setTitle}
        description={description}
        onDescription={setDescription}
        priority={priority}
        onPriority={setPriority}
        status={status}
        onStatus={setStatus}
        assignee={assignee}
        onAssignee={setAssignee}
        labels={labels}
        onLabels={setLabels}
        showWorkflowFields
      />
      {updateBead.error && <p className="mt-4 text-sm text-danger">{error}</p>}
    </Dialog>
  );
}
