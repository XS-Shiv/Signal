import { NextResponse } from 'next/server';
import { db, newId, PERSON_FIELDS, pick } from '@/lib/db';
import { Person } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const patch = pick<Person>(await req.json(), PERSON_FIELDS);
    if (!String(patch.name ?? '').trim()) {
      return NextResponse.json({ error: 'A name is required' }, { status: 400 });
    }
    const { data, error } = await db()
      .from('people').insert({ id: newId('p'), ...patch }).select('*').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
