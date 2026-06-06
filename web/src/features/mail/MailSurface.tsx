import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/primitives';
import { useMail } from '@/lib/query/hooks';
import type { MailMessage } from '@/lib/api/types';
import { EscalationsPanel } from './EscalationsPanel';
import { InboxPanel } from './InboxPanel';
import { MailLoading, MailError } from './MailStates';
import { ComposeDialog, type ComposePrefill } from './ComposeDialog';
import { consumePendingCompose, subscribeCompose } from './composeBus';

/**
 * Mail surface — one job: triage the inbox. Escalations lead (signal over noise),
 * then the full inbox. Clicking a message navigates to /mail/$messageId.
 */
export function MailSurface() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error, refetch } = useMail();
  const [compose, setCompose] = useState<{ open: boolean; prefill?: ComposePrefill }>({
    open: false,
  });

  const openCompose = (prefill?: ComposePrefill) => setCompose({ open: true, prefill });
  const closeCompose = () => setCompose({ open: false });

  const openMessage = (m: MailMessage) =>
    void navigate({ to: '/mail/$messageId', params: { messageId: m.id } });

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
      <Surface title="Mail" actions={actions}>
        <MailLoading label="Loading inbox…" />
      </Surface>
    );
  }

  if (isError || !data) {
    return (
      <Surface title="Mail" actions={actions}>
        <MailError error={error} onRetry={() => void refetch()} />
      </Surface>
    );
  }

  return (
    <>
      <Surface
        title="Mail"
        description="Agent mail and escalations — what needs you, first."
        actions={actions}
      >
        <div className="flex flex-col gap-4">
          <EscalationsPanel mail={data} onOpen={openMessage} hideWhenEmpty />
          <InboxPanel mail={data} onOpen={openMessage} />
        </div>
      </Surface>

      <ComposeDialog open={compose.open} onClose={closeCompose} prefill={compose.prefill} />
    </>
  );
}
