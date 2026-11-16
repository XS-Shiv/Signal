import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { DEFAULT_WEIGHTS, Idea, Person, Task, Weights } from '@/lib/types';
import { configuredPhrase } from '@/lib/token';

export const dynamic = 'force-dynamic';

/** One round trip for the whole board. */
export async function GET() {
  try {
    const sb = db();
    const [ideasRes, tasksRes, peopleRes, settingsRes] = await Promise.all([
      sb.from('ideas').select('*').order('created_at', { ascending: false }),
      sb.from('tasks').select('*').order('position').order('id'),
      sb.from('people').select('*').order('created_at'),
      sb.from('settings').select('weights').eq('id', 1).maybeSingle()
    ]);

    const err = ideasRes.error || tasksRes.error || peopleRes.error;
    if (err) return NextResponse.json({ error: err.message }, { status: 500 });

    const tasks = (tasksRes.data ?? []) as Task[];
    const byIdea = new Map<string, Task[]>();
    const loose: Task[] = [];
    for (const t of tasks) {
      if (!t.idea_id) { loose.push(t); continue; }
      const arr = byIdea.get(t.idea_id);
      if (arr) arr.push(t); else byIdea.set(t.idea_id, [t]);
    }

    const ideas = ((ideasRes.data ?? []) as Omit<Idea, 'tasks'>[]).map(i => ({
      ...i,
      slots: i.slots ?? [],
      tasks: byIdea.get(i.id) ?? []
    })) as Idea[];

    const weights: Weights = { ...DEFAULT_WEIGHTS, ...(settingsRes.data?.weights ?? {}) };

    return NextResponse.json({
      ideas,
      people: (peopleRes.data ?? []) as Person[],
      looseTasks: loose,
      weights,
      gated: !!configuredPhrase()
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
