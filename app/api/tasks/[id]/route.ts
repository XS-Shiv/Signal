import { NextResponse } from 'next/server';
import { db, pick, TASK_FIELDS } from '@/lib/db';
import { Task } from '@/lib/types';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const n = Number(id);
    if (!Number.isFinite(n)) return NextResponse.json({ error: 'bad id' }, { status: 400 });
    const patch = pick<Task>(await req.json(), TASK_FIELDS);
    const { data, error } = await db()
      .from('tasks').update(patch).eq('id', n).select('*').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const n = Number(id);
    if (!Number.isFinite(n)) return NextResponse.json({ error: 'bad id' }, { status: 400 });
    const { error } = await db().from('tasks').delete().eq('id', n);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
