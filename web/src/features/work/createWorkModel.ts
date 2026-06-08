export type CreateWorkMode = 'single' | 'convoy';
export type DispatchMode = 'none' | 'first' | 'all';

export interface BeadDraft {
  clientId: string;
  title: string;
  description: string;
  priority: 'urgent' | 'high' | 'normal' | 'low' | 'backlog';
  labels: string;
}

let beadCounter = 0;

export function blankBeadDraft(): BeadDraft {
  beadCounter += 1;
  return {
    clientId: `draft-${beadCounter}`,
    title: '',
    description: '',
    priority: 'normal',
    labels: '',
  };
}

export function normalizeDrafts(drafts: BeadDraft[]): BeadDraft[] {
  return drafts.filter((draft) => draft.title.trim());
}

export function labelList(labels: string): string[] {
  return labels
    .split(/[\n,]/)
    .map((label) => label.trim())
    .filter(Boolean);
}
