import { NextResponse } from 'next/server';
import { db, IDEA_FIELDS, newId, pick } from '@/lib/db';
import { Idea } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const patch = pick<Idea>(body, IDEA_FIELDS);
    if (!String(patch.title ?? '').trim()) {
      return NextResponse.json({ error: 'A title is required' }, { status: 400 });
    }
    const row = { id: newId('idea'), ...patch };
    const { data, error } = await db().from('ideas').insert(row).select('*').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ...data, tasks: [] });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
