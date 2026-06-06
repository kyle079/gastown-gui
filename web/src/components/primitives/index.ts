/** Barrel for the primitive component library. */
// Simple primitives now come from tronvercel-ui
export { Button, type ButtonProps, type ButtonVariant, type ButtonSize } from 'tronvercel-ui';
export { Input, type InputProps } from 'tronvercel-ui';
export {
  Badge,
  StatusDot,
  StatusPill,
  type BadgeProps,
  type StatusDotProps,
  type StatusPillProps,
  type Tone,
} from 'tronvercel-ui';
export { Panel, PanelHeader, PanelBody, type PanelProps, type PanelHeaderProps } from 'tronvercel-ui';
export { Kbd } from 'tronvercel-ui';
export { Spinner } from 'tronvercel-ui';
// Local adapters (keep these until per-surface follow-up beads)
export { ListRow, ListGroup, type ListRowProps } from './ListRow';
export { Table, type Column, type TableProps } from './Table';
export { Select, type SelectProps } from './Select';
export { Dialog, type DialogProps } from './Dialog';
export { ToastProvider, useToast, type Toast } from './Toast';
