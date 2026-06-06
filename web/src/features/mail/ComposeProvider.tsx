import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Dialog, Button, Input, Select, useToast } from '@/components/primitives';
import { cn } from '@/lib/utils/cn';
import { useSendMail } from '@/lib/query/hooks';
import type { MailPriority } from '@/lib/api/types';

/** Optional starting values — Respond pre-fills recipient + subject. */
export interface ComposePrefill {
  to?: string;
  subject?: string;
  message?: string;
  priority?: MailPriority;
}

interface ComposeContextValue {
  open: (prefill?: ComposePrefill) => void;
}

const ComposeContext = createContext<ComposeContextValue | null>(null);

const textareaClass =
  'min-h-[7rem] w-full rounded border border-line bg-ink/60 px-2.5 py-2 text-sm text-fg ' +
  'placeholder:text-faint transition-colors duration-100 ' +
  'hover:border-line-strong focus:border-accent focus-visible:ring-1 focus-visible:ring-accent ' +
  'disabled:opacity-40 disabled:pointer-events-none';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-2xs font-medium uppercase tracking-wider text-faint">{label}</span>
      {children}
    </label>
  );
}

/**
 * Compose lives at the app root so it can be opened from anywhere — the command
 * palette, a surface button, or a Respond action — true to the keyboard-first
 * brief. One dialog instance, driven by context. Sending mutates and invalidates
 * the inbox; the form resets on close so the next compose starts clean.
 */
export function ComposeProvider({ children }: { children: ReactNode }) {
  const [prefill, setPrefill] = useState<ComposePrefill | null>(null);
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<MailPriority>('normal');

  const { notify } = useToast();
  const sendMail = useSendMail();

  const open = useCallback((next?: ComposePrefill) => {
    setTo(next?.to ?? '');
    setSubject(next?.subject ?? '');
    setMessage(next?.message ?? '');
    setPriority(next?.priority ?? 'normal');
    setPrefill(next ?? {});
  }, []);

  const close = useCallback(() => setPrefill(null), []);

  const canSend = to.trim() !== '' && subject.trim() !== '' && message.trim() !== '';

  const submit = useCallback(() => {
    if (!canSend || sendMail.isPending) return;
    sendMail.mutate(
      { to: to.trim(), subject: subject.trim(), message: message.trim(), priority },
      {
        onSuccess: () => {
          notify(`Mail sent to ${to.trim()}`, 'ok');
          close();
        },
        onError: (err) => {
          notify(err instanceof Error ? err.message : 'Failed to send mail', 'danger');
        },
      },
    );
  }, [canSend, sendMail, to, subject, message, priority, notify, close]);

  const value = useMemo(() => ({ open }), [open]);

  return (
    <ComposeContext.Provider value={value}>
      {children}
      <Dialog
        open={prefill !== null}
        onClose={close}
        className="sm:max-w-lg"
        title="Compose mail"
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button variant="primary" disabled={!canSend || sendMail.isPending} onClick={submit}>
              {sendMail.isPending ? 'Sending…' : 'Send'}
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
            <Field label="To">
              <Input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="rig/role/name"
                autoFocus
                className="font-mono"
              />
            </Field>
            <Field label="Priority">
              <Select
                value={priority}
                onChange={(e) => setPriority(e.target.value as MailPriority)}
                className="sm:w-32"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </Select>
            </Field>
          </div>
          <Field label="Subject">
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Short, scannable subject"
            />
          </Field>
          <Field label="Message">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Plaintext body…"
              className={cn(textareaClass)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  submit();
                }
              }}
            />
          </Field>
          <p className="text-2xs text-faint">
            ⌘/Ctrl + Enter to send. Every message is a permanent record.
          </p>
        </form>
      </Dialog>
    </ComposeContext.Provider>
  );
}

export function useCompose(): ComposeContextValue {
  const ctx = useContext(ComposeContext);
  if (!ctx) throw new Error('useCompose must be used within <ComposeProvider>');
  return ctx;
}
