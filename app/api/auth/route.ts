import { NextResponse } from 'next/server';
import { COOKIE } from '@/lib/db';
import { tokenFor } from '@/lib/token';

export async function POST(req: Request) {
  const expected = process.env.SIGNAL_PASSCODE;
  if (!expected) {
    return NextResponse.json({ error: 'SIGNAL_PASSCODE is not set on the server' }, { status: 503 });
  }
  let passcode = '';
  try {
    const body = await req.json();
    passcode = typeof body?.passcode === 'string' ? body.passcode : '';
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }
  if (passcode !== expected) {
    return NextResponse.json({ error: 'Wrong passcode' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, await tokenFor(expected), {
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
