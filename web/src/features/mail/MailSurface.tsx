import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/primitives';
import { useMail, useEscalations, useAckEscalation, useCloseEscalation } from '@/lib/query/hooks';
import type { MailMessage } from '@/lib/api/types';
import { MailLoading, MailError } from './MailStates';
import { ComposeDialog, type ComposePrefill } from './ComposeDialog';
import { consumePendingCompose, subscribeCompose } from './composeBus';
import { MailQueuePanel } from './MailQueuePanel';
import type { QueueFilter } from './queueModel';

/**
 * Unified queue surface. Structured escalations and ordinary mail share one
 * triage list, with explicit action states instead of separate panels.
 */
export function MailSurface({ defaultFilter = 'all' }: { defaultFilter?: QueueFilter } = {}) {
  const navigate = useNavigate();
  const { data, isLoading, isError, error, refetch } = useMail();
  const { data: escalations } = useEscalations();
  const ackMutation = useAckEscalation();
  const closeMutation = useCloseEscalation();
  const [compose, setCompose] = useState<{ open: boolean; prefill?: ComposePrefill }>({
    open: false,
  });

  const openCompose = (prefill?: ComposePrefill) => setCompose({ open: true, prefill });
  const closeCompose = () => setCompose({ open: false });

  const openMessage = (m: MailMessage) =>
    void navigate({ to: '/attention/$messageId', params: { messageId: m.id } });

  // Let the command palette's "Compose" open the dialog here.
  useEffect(() => {
    if (consumePendingCompose()) openCompose();
    return subscribeCompose(() => openCompose());
  }, []);

  const actions = (
    <Button variant="primary" size="sm" onClick={() => openCompose()}>
      Compose
    </Button>
  );

  if (isLoading) {
    return (
      <Surface title="Needs Attention" actions={actions}>
        <MailLoading label="Loading queue…" />
      </Surface>
    );
  }

  if (isError || !data) {
    return (
      <Surface title="Needs Attention" actions={actions}>
        <MailError error={error} onRetry={() => void refetch()} />
      </Surface>
    );
  }

  return (
    <>
      <Surface
        title="Needs Attention"
        description="Unified queue for mail, escalations, and blocked work — ranked by what needs action now."
        actions={actions}
      >
        <MailQueuePanel
          mail={data}
          escalations={escalations ?? []}
          defaultFilter={defaultFilter}
          onOpenMail={openMessage}
          onAckEscalation={(id) => void ackMutation.mutate(id)}
          onCloseEscalation={(id) => void closeMutation.mutate({ id })}
        />
      </Surface>

      <ComposeDialog open={compose.open} onClose={closeCompose} prefill={compose.prefill} />
    </>
  );
}
