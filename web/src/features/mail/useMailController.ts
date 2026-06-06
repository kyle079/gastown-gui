import { useCallback, useState } from 'react';
import { useMarkMailRead } from '@/lib/query/hooks';
import { useToast } from '@/components/primitives';
import type { MailMessage } from '@/lib/api/types';
import { useCompose } from './ComposeProvider';

/**
 * Shared selection + action wiring for the mail surfaces. Both /mail and
 * /escalations open the same detail dialog, ack the same way, and respond
 * through the same global composer — so the glue lives here, once.
 */
export function useMailController() {
  const [selected, setSelected] = useState<MailMessage | null>(null);
  const markRead = useMarkMailRead();
  const { open: openCompose } = useCompose();
  const { notify } = useToast();

  const setRead = useCallback(
    (mail: MailMessage, read: boolean) => {
      markRead.mutate(
        { id: mail.id, read },
        {
          onError: (err) =>
            notify(err instanceof Error ? err.message : 'Failed to update mail', 'danger'),
        },
      );
    },
    [markRead, notify],
  );

  /** Ack from a list — mark read without opening it. */
  const ack = useCallback((mail: MailMessage) => setRead(mail, true), [setRead]);

  /** Toggle from the detail view. */
  const toggleRead = useCallback(
    (mail: MailMessage) => {
      setRead(mail, !mail.read);
      // Reflect the flip in the open dialog without waiting for the refetch.
      setSelected((cur) => (cur && cur.id === mail.id ? { ...cur, read: !mail.read } : cur));
    },
    [setRead],
  );

  const respond = useCallback(
    (mail: MailMessage) => {
      const subject = mail.subject?.toLowerCase().startsWith('re:')
        ? mail.subject
        : `Re: ${mail.subject ?? ''}`.trim();
      openCompose({ to: mail.from, subject });
      setSelected(null);
    },
    [openCompose],
  );

  return {
    selected,
    select: setSelected,
    clearSelected: () => setSelected(null),
    ack,
    toggleRead,
    respond,
    busyId: markRead.isPending ? markRead.variables?.id ?? null : null,
  };
}
