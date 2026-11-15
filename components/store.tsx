'use client';

import {
  createContext, useCallback, useContext, useEffect, useRef, useState
} from 'react';
import { DEFAULT_WEIGHTS, Idea, Person, Task, Weights } from '@/lib/types';

type Opts = { debounce?: boolean };

type Store = {
  ideas: Idea[];
  people: Person[];
  looseTasks: Task[];
  weights: Weights;
  loading: boolean;
  error: string | null;
  toast: string | null;
  say: (m: string) => void;
  reload: () => void;
  createIdea: (p: Partial<Idea>) => Promise<Idea | null>;
  patchIdea: (id: string, p: Partial<Idea>, o?: Opts) => void;
  deleteIdea: (id: string) => void;
  touchIdea: (id: string) => void;
  addTask: (ideaId: string | null, title: string) => void;
  patchTask: (id: number, p: Partial<Task>, o?: Opts) => void;
  deleteTask: (id: number) => void;
  createPerson: (p: Partial<Person>) => Promise<boolean>;
  patchPerson: (id: string, p: Partial<Person>, o?: Opts) => void;
  deletePerson: (id: string) => void;
  setWeights: (w: Weights) => void;
};

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore must be used inside <StoreProvider>');
  return v;
}

const DEBOUNCE_MS = 600;

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [looseTasks, setLooseTasks] = useState<Task[]>([]);
  const [weights, setW] = useState<Weights>(DEFAULT_WEIGHTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const say = useCallback((m: string) => {
    setToast(m);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const queued = useRef<Record<string, Record<string, unknown>>>({});

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/data', { cache: 'no-store' });
      if (res.status === 401) { window.location.href = '/unlock'; return; }
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      setIdeas(body.ideas ?? []);
      setPeople(body.people ?? []);
      setLooseTasks(body.looseTasks ?? []);
      setW({ ...DEFAULT_WEIGHTS, ...(body.weights ?? {}) });
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /** Fire a request; on failure tell the user and resync from the server. */
  const send = useCallback(async (url: string, method: string, body?: unknown) => {
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined
      });
      if (res.status === 401) { window.location.href = '/unlock'; return null; }
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out.error || `HTTP ${res.status}`);
      return out;
    } catch (e) {
      say(`Not saved: ${(e as Error).message}`);
      load();
      return null;
    }
  }, [say, load]);

  /** Coalesce rapid edits to one document into a single request. */
  const push = useCallback((key: string, url: string, patch: Record<string, unknown>, debounce?: boolean) => {
    if (!debounce) { send(url, 'PATCH', patch); return; }
    queued.current[key] = { ...(queued.current[key] ?? {}), ...patch };
    if (timers.current[key]) clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => {
      const body = queued.current[key];
      delete queued.current[key];
      delete timers.current[key];
      if (body && Object.keys(body).length) send(url, 'PATCH', body);
    }, DEBOUNCE_MS);
  }, [send]);

  useEffect(() => () => {
    Object.values(timers.current).forEach(clearTimeout);
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const createIdea = useCallback(async (p: Partial<Idea>) => {
    const made = await send('/api/ideas', 'POST', p);
    if (!made?.id) return null;
    const idea = { ...made, slots: made.slots ?? [], tasks: [] } as Idea;
    setIdeas(prev => [idea, ...prev]);
    return idea;
  }, [send]);

  const patchIdea = useCallback((id: string, p: Partial<Idea>, o?: Opts) => {
    setIdeas(prev => prev.map(i => (i.id === id ? { ...i, ...p } : i)));
    push(`idea:${id}`, `/api/ideas/${id}`, p as Record<string, unknown>, o?.debounce);
  }, [push]);

  const deleteIdea = useCallback((id: string) => {
    setIdeas(prev => prev.filter(i => i.id !== id));
    send(`/api/ideas/${id}`, 'DELETE');
  }, [send]);

  const touchIdea = useCallback((id: string) => {
    const patch: Partial<Idea> = { touched_at: new Date().toISOString() };
    setIdeas(prev => prev.map(i => {
      if (i.id !== id) return i;
      if (i.status === 'idea') patch.status = 'next';
      return { ...i, ...patch };
    }));
    send(`/api/ideas/${id}`, 'PATCH', patch);
    say('Marked touched — clock reset');
  }, [send, say]);

  const addTask = useCallback(async (ideaId: string | null, title: string) => {
    const made = await send('/api/tasks', 'POST', { idea_id: ideaId, title });
    if (!made?.id) return;
    const task = made as Task;
    if (ideaId) {
      setIdeas(prev => prev.map(i => (i.id === ideaId ? { ...i, tasks: [...i.tasks, task] } : i)));
    } else {
      setLooseTasks(prev => [...prev, task]);
    }
  }, [send]);

  const patchTask = useCallback((id: number, p: Partial<Task>, o?: Opts) => {
    setIdeas(prev => prev.map(i => ({
      ...i,
      tasks: i.tasks.map(t => (t.id === id ? { ...t, ...p } : t))
    })));
    setLooseTasks(prev => prev.map(t => (t.id === id ? { ...t, ...p } : t)));
    push(`task:${id}`, `/api/tasks/${id}`, p as Record<string, unknown>, o?.debounce);
  }, [push]);

  const deleteTask = useCallback((id: number) => {
    setIdeas(prev => prev.map(i => ({ ...i, tasks: i.tasks.filter(t => t.id !== id) })));
    setLooseTasks(prev => prev.filter(t => t.id !== id));
    send(`/api/tasks/${id}`, 'DELETE');
  }, [send]);

  const createPerson = useCallback(async (p: Partial<Person>) => {
    const made = await send('/api/people', 'POST', p);
    if (!made?.id) return false;
    setPeople(prev => [...prev, made as Person]);
    return true;
  }, [send]);

  const patchPerson = useCallback((id: string, p: Partial<Person>, o?: Opts) => {
    setPeople(prev => prev.map(x => (x.id === id ? { ...x, ...p } : x)));
    push(`person:${id}`, `/api/people/${id}`, p as Record<string, unknown>, o?.debounce);
  }, [push]);

  const deletePerson = useCallback((id: string) => {
    setPeople(prev => prev.filter(x => x.id !== id));
    send(`/api/people/${id}`, 'DELETE');
  }, [send]);

  const setWeights = useCallback((w: Weights) => {
    setW(w);
    push('settings', '/api/settings', w as unknown as Record<string, unknown>, true);
  }, [push]);

  const value: Store = {
    ideas, people, looseTasks, weights, loading, error, toast,
    say, reload: load,
    createIdea, patchIdea, deleteIdea, touchIdea,
    addTask, patchTask, deleteTask,
    createPerson, patchPerson, deletePerson,
    setWeights
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
