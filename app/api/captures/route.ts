import { NextResponse } from 'next/server';
import { db, newId, pick } from '@/lib/db';
import { Capture } from '@/lib/types';

const FIELDS = ['text', 'audio_b64', 'source'] as const;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const patch = pick<Capture>(body, FIELDS);
    const hasText = String(patch.text ?? '').trim().length > 0;
    const hasAudio = String(patch.audio_b64 ?? '').length > 0;
    if (!hasText && !hasAudio) {
      return NextResponse.json({ error: 'Nothing captured' }, { status: 400 });
    }
    // a client-supplied id makes the offline queue flush idempotent
    const id = typeof body?.id === 'string' && body.id.startsWith('cap_') ? body.id : newId('cap');
    const { data, error } = await db()
      .from('captures')
      .upsert({ id, ...patch }, { onConflict: 'id' })
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
