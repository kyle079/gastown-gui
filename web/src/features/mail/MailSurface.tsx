import { useEffect } from 'react';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/primitives';
import { useMail } from '@/lib/query/hooks';
import { EscalationsPanel } from './EscalationsPanel';
import { InboxPanel } from './InboxPanel';
import { useMailDialogs } from './useMailDialogs';
import { MailLoading, MailError } from './MailStates';
import { consumePendingCompose, subscribeCompose } from './composeBus';

/**
 * Mail surface — one job: triage the inbox. Escalations lead (signal over noise),
 * then the full inbox. Both feed the same read/respond/compose dialogs.
 */
export function MailSurface() {
  const { data, isLoading, isError, error, refetch } = useMail();
  const { openMessage, openCompose, dialogs } = useMailDialogs();

  // Let the command palette's "Compose" open the dialog here — on mount if it
  // requested before we existed, and live while we're shown.
  useEffect(() => {
    if (consumePendingCompose()) openCompose();
    return subscribeCompose(() => openCompose());
  }, [openCompose]);

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
    <Surface
      title="Mail"
      description="Agent mail and escalations — what needs you, first."
      actions={actions}
    >
      <div className="flex flex-col gap-4">
        {/* Signal first: only present when something is escalating. */}
        <EscalationsPanel mail={data} onOpen={openMessage} hideWhenEmpty />
        <InboxPanel mail={data} onOpen={openMessage} />
      </div>
      {dialogs}
    </Surface>
  );
}
