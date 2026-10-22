import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage, type Module, type Person, type Project, type State } from './api';

/** Load async data once (and on reload()), tracking loading + error state. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = [], opts: { live?: boolean } = {}) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps);

  useEffect(() => {
    let alive = true;
    run()
      .then((d) => { if (alive) { setData(d); setError(''); } })
      .catch((e) => { if (alive) setError(errorMessage(e, 'Could not load data.')); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [run, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  // Pages that opt in refresh themselves when the server announces a change (see Layout / realtime.ts).
  useEffect(() => {
    if (!opts.live) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onChange = () => { clearTimeout(timer); timer = setTimeout(reload, 800); };
    window.addEventListener('cp:workspace-update', onChange);
    return () => { clearTimeout(timer); window.removeEventListener('cp:workspace-update', onChange); };
  }, [opts.live, reload]);

  return { data, loading, error, reload };
}


export interface TaskOptions { projects: Project[]; states: State[]; modules: Module[]; people: Person[] }

/** Dropdown data shared by the task screens. */
export function useTaskOptions() {
  return useLoad<TaskOptions>(async () => {
    const [projects, states, modules, people] = await Promise.all([
      api.projects(), api.states(), api.modules(), api.assignable().catch(() => [] as Person[]),
    ]);
    return { projects, states, modules, people };
  });
}
