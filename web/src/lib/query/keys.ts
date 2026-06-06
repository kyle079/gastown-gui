/** Central registry of query keys — one place to invalidate from mutations. */
export const queryKeys = {
  status: ['status'] as const,
  agents: ['agents'] as const,
  mail: ['mail'] as const,
  rigs: ['rigs'] as const,
  health: ['health'] as const,
  setup: ['setup'] as const,
  activity: ['activity'] as const,
  convoys: ['convoys'] as const,
  targets: ['targets'] as const,
  beads: (status: string) => ['beads', status] as const,
  beadGraph: ['bead-graph'] as const,
  pullRequests: (state: string) => ['pull-requests', state] as const,
  formulas: ['formulas'] as const,
};
