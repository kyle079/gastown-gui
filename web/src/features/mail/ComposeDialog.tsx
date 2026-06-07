import { useEffect, useState } from 'react';
import { Dialog, Button, Input, Select, useToast } from '@/components/primitives';
import { useSendMail } from '@/lib/query/hooks';

export interface ComposePrefill {
  to?: string;
  subject?: string;
}

export interface ComposeDialogProps {
  open: boolean;
  onClose: () => void;
  /** Seeds the form — used by "Respond" to prefill recipient + Re: subject. */
  prefill?: ComposePrefill;
}

/**
 * Compose or respond. One small form — recipient, subject, message — backed by
 * the send-mail mutation. "Do less, well": no rich text, no cc, just the fields
 * the operator needs to fire off a reply or a directive.
 */
export function ComposeDialog({ open, onClose, prefill }: ComposeDialogProps) {
  const { notify } = useToast();
  const send = useSendMail();
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('normal');

  // Reseed each time the dialog opens so a fresh compose and a reply don't bleed.
  useEffect(() => {
    if (!open) return;
    setTo(prefill?.to ?? '');
    setSubject(prefill?.subject ?? '');
    setMessage('');
    setPriority('normal');
  }, [open, prefill?.to, prefill?.subject]);

  const canSend = to.trim() && subject.trim() && message.trim() && !send.isPending;

  const submit = () => {
    if (!canSend) return;
    send.mutate(
      { to: to.trim(), subject: subject.trim(), message: message.trim(), priority },
      {
        onSuccess: () => {
          notify(`Sent to ${to.trim()}`, 'ok');
          onClose();
        },
        onError: (err) => notify(err instanceof Error ? err.message : 'Send failed', 'danger'),
      },
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Compose"
      description="Message an agent or the operator."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={send.isPending}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={submit} disabled={!canSend}>
            {send.isPending ? 'Sending…' : 'Send'}
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-2xs font-medium uppercase tracking-wider text-faint">To</span>
          <Input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="rig/role e.g. gastown_gui/witness"
            className="font-mono"
            autoFocus
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-2xs font-medium uppercase tracking-wider text-faint">Subject</span>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-2xs font-medium uppercase tracking-wider text-faint">Priority</span>
          <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </Select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-2xs font-medium uppercase tracking-wider text-faint">Message</span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            placeholder="Write your message…"
            className="w-full resize-y rounded border border-line bg-ink/60 px-2.5 py-2 text-sm text-fg placeholder:text-faint transition-colors duration-100 hover:border-line-strong focus:border-accent focus-visible:ring-1 focus-visible:ring-accent"
          />
        </label>
      </form>
    </Dialog>
  );
}
