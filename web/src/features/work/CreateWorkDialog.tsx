import { useEffect, useState, type ChangeEvent } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Badge,
  Button,
  Dialog,
  Input,
  Panel,
  Select,
  Textarea,
  useToast,
} from '@/components/primitives';
import { ApiError } from '@/lib/api/client';
import type { CreateWorkResult } from '@/lib/api/types';
import { useCreateWorkWorkflow, useSling, useTargets } from '@/lib/query/hooks';
import { priorityLabel, priorityTone } from '@/features/catalog/catalogMeta';
import { blankBeadDraft, labelList, normalizeDrafts, type BeadDraft, type CreateWorkMode, type DispatchMode } from './createWorkModel';

const priorityOptions: Array<BeadDraft['priority']> = ['urgent', 'high', 'normal', 'low', 'backlog'];

function ModeButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button size="sm" variant={active ? 'primary' : 'ghost'} onClick={onClick}>
      {label}
    </Button>
  );
}

function draftPayload(draft: BeadDraft) {
  return {
    title: draft.title.trim(),
    description: draft.description.trim(),
    priority: draft.priority,
    labels: labelList(draft.labels),
  };
}

function textareaValue(event: ChangeEvent<HTMLTextAreaElement>) {
  return event.target.value;
}

function dispatchBadge(bead: NonNullable<CreateWorkResult['beads']>[number]) {
  if (bead.workflow_state === 'slung') return <Badge tone="accent">slung</Badge>;
  if (bead.workflow_state === 'dispatch_failed') return <Badge tone="warn">dispatch failed</Badge>;
  return <Badge>created</Badge>;
}

export function CreateWorkDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { notify } = useToast();
  const { data: targets } = useTargets();
  const createWorkflow = useCreateWorkWorkflow();
  const sling = useSling();

  const [mode, setMode] = useState<CreateWorkMode>('single');
  const [single, setSingle] = useState<BeadDraft>(blankBeadDraft);
  const [convoyName, setConvoyName] = useState('');
  const [notifyAddress, setNotifyAddress] = useState('');
  const [drafts, setDrafts] = useState<BeadDraft[]>([blankBeadDraft(), blankBeadDraft()]);
  const [singleDispatchNow, setSingleDispatchNow] = useState(true);
  const [dispatchMode, setDispatchMode] = useState<DispatchMode>('none');
  const [target, setTarget] = useState('');
  const [molecule, setMolecule] = useState('');
  const [args, setArgs] = useState('');
  const [result, setResult] = useState<CreateWorkResult | null>(null);

  useEffect(() => {
    if (open) return;
    createWorkflow.reset();
    sling.reset();
    setResult(null);
  }, [open, createWorkflow, sling]);

  function resetAll() {
    setMode('single');
    setSingle(blankBeadDraft());
    setConvoyName('');
    setNotifyAddress('');
    setDrafts([blankBeadDraft(), blankBeadDraft()]);
    setSingleDispatchNow(true);
    setDispatchMode('none');
    setTarget('');
    setMolecule('');
    setArgs('');
    setResult(null);
    createWorkflow.reset();
    sling.reset();
  }

  function close() {
    resetAll();
    onClose();
  }

  function addDraft() {
    setDrafts((current) => [...current, blankBeadDraft()]);
  }

  function removeDraft(clientId: string) {
    setDrafts((current) => (current.length <= 1 ? current : current.filter((draft) => draft.clientId !== clientId)));
  }

  function updateDraft(clientId: string, patch: Partial<BeadDraft>) {
    setDrafts((current) => current.map((draft) => (draft.clientId === clientId ? { ...draft, ...patch } : draft)));
  }

  function submit() {
    if (mode === 'single') {
      createWorkflow.mutate(
        {
          mode: 'single',
          bead: draftPayload(single),
          dispatch: {
            sling: singleDispatchNow,
            target: target || undefined,
            molecule: molecule || undefined,
            args: args || undefined,
          },
        },
        {
          onSuccess: (response) => {
            setResult(response.data);
            notify(response.data.outcome === 'partial' ? 'Bead created; dispatch needs follow-through.' : 'Bead created.', 'accent');
          },
        },
      );
      return;
    }

    createWorkflow.mutate(
      {
        mode: 'convoy',
        convoy: {
          name: convoyName.trim(),
          notify: notifyAddress.trim() || undefined,
        },
        beads: normalizeDrafts(drafts).map(draftPayload),
        dispatch: {
          mode: dispatchMode,
          target: target || undefined,
          molecule: molecule || undefined,
          args: args || undefined,
        },
      },
      {
        onSuccess: (response) => {
          setResult(response.data);
          notify(response.data.outcome === 'partial' ? 'Convoy created; some dispatches need follow-through.' : 'Convoy created.', 'accent');
        },
      },
    );
  }

  const error =
    createWorkflow.error instanceof ApiError
      ? createWorkflow.error.message
      : createWorkflow.error
        ? 'Could not create work'
        : null;

  const dispatchError =
    sling.error instanceof ApiError ? sling.error.message : sling.error ? 'Dispatch failed' : null;

  const busy = createWorkflow.isPending || sling.isPending;
  const convoyDrafts = normalizeDrafts(drafts);

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Create work"
      description="Build work the way an operator actually runs it: shape the bead, group related tasks, then launch follow-through from one place."
      className="sm:max-w-5xl"
      footer={
        result ? (
          <>
            <Button size="sm" variant="ghost" onClick={close}>
              Close
            </Button>
            <Button size="sm" variant="primary" onClick={resetAll}>
              Create another
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="ghost" onClick={close} disabled={busy}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={submit}
              disabled={
                busy ||
                (mode === 'single' && !single.title.trim()) ||
                (mode === 'convoy' && (!convoyName.trim() || convoyDrafts.length === 0))
              }
            >
              {createWorkflow.isPending ? 'Creating…' : mode === 'single' ? 'Create bead' : 'Create convoy'}
            </Button>
          </>
        )
      }
    >
      {result ? (
        <div className="flex flex-col gap-4">
          <Panel className="border-accent/30 bg-accent/5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={result.outcome === 'partial' ? 'warn' : 'accent'}>
                {result.mode}
              </Badge>
              <Badge tone={result.outcome === 'partial' ? 'warn' : 'ok'}>{result.outcome}</Badge>
              {result.convoy && <Badge tone="info">{result.convoy.id}</Badge>}
            </div>
            <p className="mt-3 text-sm text-fg">
              {result.mode === 'single'
                ? 'The bead exists now. Use the follow-through actions below to inspect or re-dispatch it immediately.'
                : 'The convoy and its beads are live. Review dispatch state below, then jump straight into the convoy or any individual bead.'}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {result.convoy && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    void navigate({ to: '/work/$convoyId', params: { convoyId: result.convoy!.id } });
                    close();
                  }}
                >
                  Open convoy
                </Button>
              )}
              {result.bead && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => {
                    void navigate({ to: '/issues', search: { status: 'all', id: result.bead!.id } });
                    close();
                  }}
                >
                  Inspect bead
                </Button>
              )}
            </div>
          </Panel>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {result.beads.map((bead) => (
              <Panel key={bead.id} className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm text-fg">{bead.title}</div>
                    <div className="mt-1 font-mono text-2xs text-faint">{bead.id}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {typeof bead.priority === 'number' && (
                      <Badge tone={priorityTone(bead.priority)}>{priorityLabel(bead.priority)}</Badge>
                    )}
                    {dispatchBadge(bead)}
                  </div>
                </div>
                {bead.description && (
                  <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-xs text-muted">{bead.description}</p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void navigate({ to: '/issues', search: { status: 'all', id: bead.id } })}
                  >
                    Open bead
                  </Button>
                  {bead.dispatch?.ok ? (
                    <Badge tone="accent">{bead.dispatch.target || 'auto target'}</Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="default"
                      disabled={sling.isPending}
                      onClick={() =>
                        sling.mutate(
                          { bead: bead.id, target: target || undefined, molecule: molecule || undefined, args: args || undefined },
                          {
                            onSuccess: () => {
                              setResult((current) =>
                                current
                                  ? {
                                      ...current,
                                      outcome: 'slung',
                                      bead: current.bead?.id === bead.id
                                        ? {
                                            ...current.bead,
                                            workflow_state: 'slung',
                                            dispatch: { ok: true, target: target || null, error: null },
                                          }
                                        : current.bead,
                                      beads: current.beads.map((item) =>
                                        item.id === bead.id
                                          ? {
                                              ...item,
                                              workflow_state: 'slung',
                                              dispatch: { ok: true, target: target || null, error: null },
                                            }
                                          : item,
                                      ),
                                    }
                                  : current,
                              );
                              notify(`Dispatched ${bead.id}`, 'accent');
                            },
                          },
                        )
                      }
                    >
                      Dispatch now
                    </Button>
                  )}
                </div>
                {bead.dispatch?.error && (
                  <p className="mt-2 font-mono text-2xs text-warn">{bead.dispatch.error}</p>
                )}
              </Panel>
            ))}
          </div>

          {dispatchError && <p className="font-mono text-xs text-danger">{dispatchError}</p>}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2 border-b border-line pb-3">
            <ModeButton active={mode === 'single'} label="Single bead" onClick={() => setMode('single')} />
            <ModeButton active={mode === 'convoy'} label="Multi-bead convoy" onClick={() => setMode('convoy')} />
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.3fr_0.9fr]">
            <div className="flex flex-col gap-4">
              {mode === 'single' ? (
                <Panel className="p-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-1.5 sm:col-span-2">
                      <span className="text-2xs uppercase tracking-wider text-faint">Title</span>
                      <Input
                        value={single.title}
                        onChange={(e) => setSingle((current) => ({ ...current, title: e.target.value }))}
                        placeholder="Tight, actionable issue title"
                        autoFocus
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 sm:col-span-2">
                      <span className="text-2xs uppercase tracking-wider text-faint">Context</span>
                      <Textarea
                        value={single.description}
                        onChange={(e) => setSingle((current) => ({ ...current, description: textareaValue(e) }))}
                        placeholder="Operator context, constraints, or acceptance notes"
                        rows={5}
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-2xs uppercase tracking-wider text-faint">Priority</span>
                      <Select
                        value={single.priority}
                        onChange={(e) =>
                          setSingle((current) => ({ ...current, priority: e.target.value as BeadDraft['priority'] }))
                        }
                      >
                        {priorityOptions.map((priority) => (
                          <option key={priority} value={priority}>
                            {priority}
                          </option>
                        ))}
                      </Select>
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-2xs uppercase tracking-wider text-faint">Labels</span>
                      <Input
                        value={single.labels}
                        onChange={(e) => setSingle((current) => ({ ...current, labels: e.target.value }))}
                        placeholder="bug, ux, launch"
                      />
                    </label>
                  </div>
                </Panel>
              ) : (
                <>
                  <Panel className="p-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <label className="flex flex-col gap-1.5 sm:col-span-2">
                        <span className="text-2xs uppercase tracking-wider text-faint">Convoy name</span>
                        <Input
                          value={convoyName}
                          onChange={(e) => setConvoyName(e.target.value)}
                          placeholder="Feature rollout, incident cleanup, launch prep"
                          autoFocus
                        />
                      </label>
                      <label className="flex flex-col gap-1.5 sm:col-span-2">
                        <span className="text-2xs uppercase tracking-wider text-faint">Notify</span>
                        <Input
                          value={notifyAddress}
                          onChange={(e) => setNotifyAddress(e.target.value)}
                          placeholder="mayor/ or ops/"
                        />
                      </label>
                    </div>
                  </Panel>

                  <div className="flex flex-col gap-3">
                    {drafts.map((draft, index) => (
                      <Panel key={draft.clientId} className="p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <Badge tone="info">bead {index + 1}</Badge>
                          <Button size="sm" variant="ghost" onClick={() => removeDraft(draft.clientId)}>
                            Remove
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <label className="flex flex-col gap-1.5 sm:col-span-2">
                            <span className="text-2xs uppercase tracking-wider text-faint">Title</span>
                            <Input
                              value={draft.title}
                              onChange={(e) => updateDraft(draft.clientId, { title: e.target.value })}
                              placeholder="Concrete unit of work"
                            />
                          </label>
                          <label className="flex flex-col gap-1.5 sm:col-span-2">
                            <span className="text-2xs uppercase tracking-wider text-faint">Context</span>
                            <Textarea
                              value={draft.description}
                              onChange={(e) => updateDraft(draft.clientId, { description: textareaValue(e) })}
                              placeholder="Short operator-facing context"
                              rows={3}
                            />
                          </label>
                          <label className="flex flex-col gap-1.5">
                            <span className="text-2xs uppercase tracking-wider text-faint">Priority</span>
                            <Select
                              value={draft.priority}
                              onChange={(e) =>
                                updateDraft(draft.clientId, { priority: e.target.value as BeadDraft['priority'] })
                              }
                            >
                              {priorityOptions.map((priority) => (
                                <option key={priority} value={priority}>
                                  {priority}
                                </option>
                              ))}
                            </Select>
                          </label>
                          <label className="flex flex-col gap-1.5">
                            <span className="text-2xs uppercase tracking-wider text-faint">Labels</span>
                            <Input
                              value={draft.labels}
                              onChange={(e) => updateDraft(draft.clientId, { labels: e.target.value })}
                              placeholder="ops, cleanup"
                            />
                          </label>
                        </div>
                      </Panel>
                    ))}
                    <Button size="sm" variant="default" onClick={addDraft}>
                      Add bead
                    </Button>
                  </div>
                </>
              )}
            </div>

            <Panel className="p-4">
              <div className="border-b border-line pb-3">
                <h3 className="text-sm font-medium text-fg">Follow-through</h3>
                <p className="mt-1 text-sm text-muted">
                  Decide whether this work launches immediately or leaves a clean queue for the next operator move.
                </p>
              </div>

              <div className="mt-4 flex flex-col gap-4">
                {mode === 'single' ? (
                  <label className="flex items-start gap-3 rounded-md border border-line p-3">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={singleDispatchNow}
                      onChange={(e) => setSingleDispatchNow(e.target.checked)}
                    />
                    <span className="text-sm text-muted">
                      Sling this bead as soon as it is created. If it fails, the bead still exists and the success state will expose a repair action.
                    </span>
                  </label>
                ) : (
                  <label className="flex flex-col gap-1.5">
                    <span className="text-2xs uppercase tracking-wider text-faint">Dispatch mode</span>
                    <Select value={dispatchMode} onChange={(e) => setDispatchMode(e.target.value as DispatchMode)}>
                      <option value="none">Create convoy only</option>
                      <option value="first">Create convoy and sling first bead</option>
                      <option value="all">Create convoy and sling all beads</option>
                    </Select>
                  </label>
                )}

                <label className="flex flex-col gap-1.5">
                  <span className="text-2xs uppercase tracking-wider text-faint">Target</span>
                  <Select value={target} onChange={(e) => setTarget(e.target.value)}>
                    <option value="">Auto (let gt choose)</option>
                    {(targets ?? []).map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </Select>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-2xs uppercase tracking-wider text-faint">Molecule</span>
                  <Input
                    value={molecule}
                    onChange={(e) => setMolecule(e.target.value)}
                    placeholder="Optional formula / molecule"
                    className="font-mono"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-2xs uppercase tracking-wider text-faint">Args</span>
                  <Input
                    value={args}
                    onChange={(e) => setArgs(e.target.value)}
                    placeholder="base_branch=master"
                    className="font-mono"
                  />
                </label>

                <div className="rounded-md border border-line bg-ink/40 p-3">
                  <div className="font-mono text-2xs uppercase tracking-wider text-faint">Preview</div>
                  <div className="mt-2 text-sm text-fg">
                    {mode === 'single'
                      ? single.title.trim() || 'Single bead title'
                      : convoyName.trim() || 'Convoy name'}
                  </div>
                  <div className="mt-1 text-xs text-muted">
                    {mode === 'single'
                      ? singleDispatchNow
                        ? `Create bead and sling${target ? ` → ${target}` : ''}.`
                        : 'Create bead and leave it queued.'
                      : dispatchMode === 'none'
                        ? `${convoyDrafts.length} bead${convoyDrafts.length === 1 ? '' : 's'} grouped into a convoy.`
                        : dispatchMode === 'first'
                          ? `Convoy plus ${convoyDrafts.length} bead${convoyDrafts.length === 1 ? '' : 's'}; first bead launches immediately.`
                          : `Convoy plus ${convoyDrafts.length} bead${convoyDrafts.length === 1 ? '' : 's'}; all beads launch immediately.`}
                  </div>
                </div>

                {error && <p className="font-mono text-xs text-danger">{error}</p>}
              </div>
            </Panel>
          </div>
        </div>
      )}
    </Dialog>
  );
}
