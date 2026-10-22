import type { Role, State } from './api';

/**
 * The live workflow. Mirrors `is_valid_state_transition` in tms/access.py and the per-role limits in
 * tms/views.py, so the screens only offer moves the server will accept.
 */
export const NEXT: Record<string, string[]> = {
  backlog: ['in-progress'],
  'in-progress': ['client-review'],
  'client-review': ['completed-launched', 'rework-revision'],
  'rework-revision': ['in-progress'],
  'completed-launched': [],
};

const CAPS: Partial<Record<Role, string[]>> = {
  specialist: ['in-progress', 'client-review'],
  team_head: ['in-progress', 'client-review', 'rework-revision'],
  client: ['client-review', 'completed-launched', 'rework-revision'],
};

/** Stages this role may move a task into from its current stage. Admins and PMs may move anywhere. */
export function allowedStates(role: Role | undefined, currentSlug: string, states: State[]): State[] {
  if (role === 'admin' || role === 'project_manager') return states;
  const cap = role ? CAPS[role] : undefined;
  if (!cap) return states.filter((s) => s.slug === currentSlug);
  const next = (NEXT[currentSlug] ?? []).filter((slug) => cap.includes(slug));
  return states.filter((s) => s.slug === currentSlug || next.includes(s.slug));
}

/** One-tap actions shown on Home: label, target stage, and which roles see them. */
export interface QuickAction { label: string; to: string; primary?: boolean }

export function quickActions(role: Role | undefined, slug: string, isMine: boolean): QuickAction[] {
  const out: QuickAction[] = [];
  const can = (to: string) => allowedStates(role, slug, [{ slug: to } as State]).some((s) => s.slug === to) && (NEXT[slug] ?? []).includes(to);
  if (role === 'client') {
    if (slug === 'client-review') {
      out.push({ label: 'Request changes', to: 'rework-revision' }, { label: 'Approve', to: 'completed-launched', primary: true });
    }
    return out;
  }
  if (!isMine && role !== 'team_head') return out;
  if (can('in-progress')) out.push({ label: slug === 'rework-revision' ? 'Restart' : 'Start', to: 'in-progress', primary: true });
  if (can('client-review')) out.push({ label: 'Send to client', to: 'client-review', primary: true });
  if (role === 'team_head' && slug === 'client-review') out.push({ label: 'Send back', to: 'rework-revision' });
  return out;
}
