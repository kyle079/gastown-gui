/** Central registry of query keys — one place to invalidate from mutations. */
export const queryKeys = {
  status: ['status'] as const,
  agents: ['agents'] as const,
  mail: ['mail'] as const,
  rigs: ['rigs'] as const,
  health: ['health'] as const,
  setup: ['setup'] as const,
  // Catalog surface — parameterized so each filter is cached independently.
  beads: (status: string) => ['beads', status] as const,
  prs: (state: string) => ['prs', state] as const,
  formulas: ['formulas'] as const,
};
