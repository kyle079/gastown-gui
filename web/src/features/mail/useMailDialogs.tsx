import { useCallback, useState } from 'react';
import type { MailMessage } from '@/lib/api/types';
import { MailDetailDialog } from './MailDetailDialog';
import { ComposeDialog, type ComposePrefill } from './ComposeDialog';

/**
 * Shared dialog wiring for the mail surfaces. Both `/mail` and `/escalations`
 * open the same detail + compose dialogs, so the read/respond/compose flow lives
 * here once and each surface just drops `dialogs` into its tree.
 */
export function useMailDialogs() {
  const [selected, setSelected] = useState<MailMessage | null>(null);
  const [compose, setCompose] = useState<{ open: boolean; prefill?: ComposePrefill }>({
    open: false,
  });

  const openMessage = useCallback((m: MailMessage) => setSelected(m), []);
  const openCompose = useCallback((prefill?: ComposePrefill) => setCompose({ open: true, prefill }), []);
  const closeCompose = useCallback(() => setCompose({ open: false }), []);

  const respond = useCallback((m: MailMessage) => {
    setSelected(null);
    const subject = m.subject?.startsWith('Re:') ? m.subject : `Re: ${m.subject ?? ''}`.trim();
    setCompose({ open: true, prefill: { to: m.from, subject } });
  }, []);

  const dialogs = (
    <>
      <MailDetailDialog mail={selected} onClose={() => setSelected(null)} onRespond={respond} />
      <ComposeDialog open={compose.open} onClose={closeCompose} prefill={compose.prefill} />
    </>
  );

  return { openMessage, openCompose, dialogs };
}
