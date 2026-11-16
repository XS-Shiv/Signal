import { NextResponse } from 'next/server';
import { db, IDEA_FIELDS, newId, pick } from '@/lib/db';
import { Capture, Idea } from '@/lib/types';

type Ctx = { params: Promise<{ id: string }> };

/** Edit the transcript while it still sits in the inbox. */
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const patch = pick<Capture>(await req.json(), ['text']);
    const { data, error } = await db()
      .from('captures').update(patch).eq('id', id).select('*').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/**
 * Triage. One capture leaves the inbox as exactly one outcome:
 * a new idea, a task on an existing idea, merged into one, or dropped.
 */
export async function POST(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = await req.json();
    const outcome = body?.outcome as string;
    const sb = db();

    if (outcome === 'dropped') {
      const { error } = await sb.from('captures')
        .update({ status: 'dropped', outcome: 'dropped', triaged_at: new Date().toISOString() })
        .eq('id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, outcome });
    }

    if (outcome === 'task') {
      const ideaId = String(body?.idea_id ?? '');
      const title = String(body?.title ?? '').trim();
      if (!ideaId || !title) {
        return NextResponse.json({ error: 'A project and a task title are required' }, { status: 400 });
      }
      const { error: tErr } = await sb.from('tasks').insert({ idea_id: ideaId, title });
      if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });
      await sb.from('ideas').update({ touched_at: new Date().toISOString() }).eq('id', ideaId);
      const { error } = await sb.from('captures')
        .update({ status: 'triaged', outcome: 'task', idea_id: ideaId, triaged_at: new Date().toISOString() })
        .eq('id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, outcome, idea_id: ideaId });
    }

    if (outcome === 'merged') {
      const ideaId = String(body?.idea_id ?? '');
      const note = String(body?.text ?? '').trim();
      if (!ideaId) return NextResponse.json({ error: 'An idea to merge into is required' }, { status: 400 });
      const { data: existing, error: gErr } = await sb
        .from('ideas').select('context').eq('id', ideaId).single();
      if (gErr) return NextResponse.json({ error: gErr.message }, { status: 500 });
      const merged = [existing?.context ?? '', note].filter(Boolean).join('\n\n');
      const { error: uErr } = await sb.from('ideas')
        .update({ context: merged, touched_at: new Date().toISOString() }).eq('id', ideaId);
      if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });
      const { error } = await sb.from('captures')
        .update({ status: 'triaged', outcome: 'merged', idea_id: ideaId, triaged_at: new Date().toISOString() })
        .eq('id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, outcome, idea_id: ideaId });
    }

    // default: becomes a new idea
    const fields = pick<Idea>(body, IDEA_FIELDS);
    if (!String(fields.title ?? '').trim()) {
      return NextResponse.json({ error: 'A title is required' }, { status: 400 });
    }
    const ideaId = newId('idea');
    const { data: idea, error: iErr } = await sb
      .from('ideas').insert({ id: ideaId, ...fields }).select('*').single();
    if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 });
    const { error } = await sb.from('captures')
      .update({ status: 'triaged', outcome: 'new_idea', idea_id: ideaId, triaged_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, outcome: 'new_idea', idea: { ...idea, tasks: [] } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
