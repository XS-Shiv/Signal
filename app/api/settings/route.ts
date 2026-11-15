import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { DEFAULT_WEIGHTS } from '@/lib/types';

const KEYS = Object.keys(DEFAULT_WEIGHTS) as (keyof typeof DEFAULT_WEIGHTS)[];

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const weights: Record<string, number> = { ...DEFAULT_WEIGHTS };
    for (const k of KEYS) {
      const v = Number(body?.[k]);
      if (Number.isFinite(v)) weights[k] = v;
    }
    const { data, error } = await db()
      .from('settings').update({ weights }).eq('id', 1).select('weights').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data.weights);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
