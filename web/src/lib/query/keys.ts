/** Central registry of query keys — one place to invalidate from mutations. */
export const queryKeys = {
  status: ['status'] as const,
  agents: ['agents'] as const,
  mail: ['mail'] as const,
  rigs: ['rigs'] as const,
  health: ['health'] as const,
};
