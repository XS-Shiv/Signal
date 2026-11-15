import { NextResponse } from 'next/server';
import { db, pick, TASK_FIELDS } from '@/lib/db';
import { Task } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const patch = pick<Task>(await req.json(), TASK_FIELDS);
    const { data, error } = await db().from('tasks').insert(patch).select('*').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
