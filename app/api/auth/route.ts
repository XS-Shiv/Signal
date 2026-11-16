import { NextResponse } from 'next/server';
import { COOKIE } from '@/lib/db';
import { configuredPhrase, normalizePhrase, tokenFor } from '@/lib/token';

/** Speech recognition is fuzzy, so a few alternatives per utterance are allowed. */
const MAX_ALTERNATIVES = 3;

export async function GET() {
  // Lets the unlock page tell "no gate configured" from "say the phrase".
  return NextResponse.json({ gated: !!configuredPhrase() });
}

export async function POST(req: Request) {
  const phrase = configuredPhrase();
  if (!phrase) {
    return NextResponse.json({ error: 'No phrase is configured — the site is open' }, { status: 503 });
  }

  let tries: string[] = [];
  try {
    const body = await req.json();
    if (typeof body?.phrase === 'string') tries = [body.phrase];
    else if (Array.isArray(body?.alternatives)) {
      tries = body.alternatives.filter((x: unknown) => typeof x === 'string');
    }
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  tries = tries.slice(0, MAX_ALTERNATIVES);
  if (!tries.length) return NextResponse.json({ error: 'Nothing heard' }, { status: 400 });

  const want = normalizePhrase(phrase);
  const hit = tries.some(t => normalizePhrase(t) === want);
  if (!hit) {
    return NextResponse.json({ error: 'That is not the phrase' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, await tokenFor(phrase), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}
