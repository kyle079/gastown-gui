import { MailSurface } from './MailSurface';

/**
 * Compatibility surface: same unified queue, pre-filtered to structured escalations.
 */
export function EscalationsSurface() {
  return <MailSurface defaultFilter="escalations" />;
}
