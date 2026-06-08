import { useState } from 'react';
import {
  Badge,
  Button,
  Panel,
  PanelBody,
  PanelHeader,
  Select,
  Textarea,
  useToast,
} from '@/components/primitives';
import { ApiError } from '@/lib/api/client';
import type { MayorRequestItem, MayorRequestResponse } from '@/lib/api/types';
import { useMayorRequest, useTargets } from '@/lib/query/hooks';
import { compactAddress, rankTargets } from './opsModel';

function toneForItem(item: MayorRequestItem) {
  if (item.stage === 'dispatched') return 'ok';
  if (item.stage === 'dispatch_failed') return 'warn';
  return 'danger';
}

function labelForItem(item: MayorRequestItem) {
  if (item.stage === 'dispatched') return 'Dispatched';
  if (item.stage === 'dispatch_failed') return 'Created only';
  return 'Failed';
}

function toneForStatus(status: MayorRequestResponse['status']) {
  if (status === 'ok') return 'ok';
  if (status === 'partial') return 'warn';
  return 'danger';
}

export function AskMayorPanel({
  selectedFormula,
  formulaArgs,
}: {
  selectedFormula: string;
  formulaArgs: string;
}) {
  const { notify } = useToast();
  const { data: targets } = useTargets();
  const mayorRequest = useMayorRequest();
  const [prompt, setPrompt] = useState('');
  const [target, setTarget] = useState('');
  const [lastResult, setLastResult] = useState<MayorRequestResponse | null>(null);

  const sortedTargets = rankTargets(targets ?? []);
  const canSubmit = prompt.trim().length > 0 && !mayorRequest.isPending;
  const error =
    mayorRequest.error instanceof ApiError
      ? mayorRequest.error.message
      : mayorRequest.error
        ? 'Mayor request failed'
        : null;

  function submit() {
    const trimmed = prompt.trim();
    if (!trimmed) return;

    mayorRequest.mutate(
      {
        prompt: trimmed,
        target: target || undefined,
        molecule: selectedFormula || undefined,
        args: formulaArgs.trim() || undefined,
      },
      {
        onSuccess: (result) => {
          setLastResult(result);
          notify(
            result.status === 'ok'
              ? `Mayor dispatched ${result.summary.dispatched} item${result.summary.dispatched === 1 ? '' : 's'}`
              : 'Mayor request completed with follow-up needed',
            result.status === 'ok' ? 'ok' : 'warn',
          );
          setPrompt('');
        },
      },
    );
  }

  return (
    <Panel flush>
      <PanelHeader title="Ask Mayor" hint="prompt → bead(s) → sling" />
      <PanelBody className="flex flex-col gap-4 border-b border-line">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
          <label className="flex flex-col gap-1.5">
            <span className="text-2xs uppercase tracking-wider text-faint">Operator Request</span>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={6}
              placeholder={
                'Example:\n- Add the mayor prompt workflow to the operator UI\n- Write tests for the new route\n\nOptional target markers: "dispatch to gastown_gui" or "-> gastown_gui".'
              }
            />
          </label>
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-2xs uppercase tracking-wider text-faint">Default Target</span>
              <Select value={target} onChange={(e) => setTarget(e.target.value)}>
                <option value="">Auto (let gt choose)</option>
                {sortedTargets.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </label>

            <div className="rounded-md border border-line bg-surface-alt p-3">
              <div className="font-mono text-2xs uppercase tracking-wider text-faint">Dispatch Defaults</div>
              <div className="mt-2 text-sm text-muted">
                Formula: <span className="font-mono text-fg">{selectedFormula || 'auto'}</span>
              </div>
              <div className="mt-1 text-sm text-muted">
                Target: <span className="font-mono text-fg">{target ? compactAddress(target) : 'auto'}</span>
              </div>
              <div className="mt-1 text-sm text-muted">
                Args: <span className="font-mono text-fg">{formulaArgs.trim() || 'none'}</span>
              </div>
            </div>

            <Button variant="primary" disabled={!canSubmit} onClick={submit}>
              {mayorRequest.isPending ? 'Dispatching…' : 'Create And Sling'}
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 font-mono text-xs text-danger">
            {error}
          </div>
        )}
      </PanelBody>

      <PanelBody className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium text-fg">Execution Result</h2>
            <p className="mt-1 text-sm text-muted">Created beads and dispatch outcomes are reflected here immediately.</p>
          </div>
          {lastResult && <Badge tone={toneForStatus(lastResult.status)}>{lastResult.status}</Badge>}
        </div>

        {!lastResult ? (
          <div className="rounded-md border border-dashed border-line px-4 py-6 text-sm text-faint">
            No mayor request submitted yet.
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-md border border-line bg-surface-alt px-3 py-2">
                <div className="font-mono text-2xs uppercase tracking-wider text-faint">Created</div>
                <div className="mt-1 text-lg text-fg">{lastResult.summary.created}</div>
              </div>
              <div className="rounded-md border border-line bg-surface-alt px-3 py-2">
                <div className="font-mono text-2xs uppercase tracking-wider text-faint">Dispatched</div>
                <div className="mt-1 text-lg text-fg">{lastResult.summary.dispatched}</div>
              </div>
              <div className="rounded-md border border-line bg-surface-alt px-3 py-2">
                <div className="font-mono text-2xs uppercase tracking-wider text-faint">Needs Follow-Up</div>
                <div className="mt-1 text-lg text-fg">{lastResult.summary.failed}</div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {lastResult.items.map((item, index) => (
                <div key={`${item.title}-${index}`} className="rounded-md border border-line bg-surface-alt px-3 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm text-fg">{item.title}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-xs text-muted">
                        {item.beadId && <span>{item.beadId}</span>}
                        <span>{item.target ? compactAddress(item.target) : 'auto target'}</span>
                      </div>
                    </div>
                    <Badge tone={toneForItem(item)}>{labelForItem(item)}</Badge>
                  </div>
                  {item.error && <div className="mt-2 font-mono text-xs text-danger">{item.error}</div>}
                </div>
              ))}
            </div>
          </>
        )}
      </PanelBody>
    </Panel>
  );
}
