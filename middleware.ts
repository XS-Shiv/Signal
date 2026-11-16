import { NextRequest, NextResponse } from 'next/server';
import { configuredPhrase, sameToken, tokenFor } from '@/lib/token';

const COOKIE = 'signal_key';

/**
 * The gate is opt-in. With no SIGNAL_VOICE_PHRASE set the site is open to
 * anyone who has the URL; set one and every route needs the unlock cookie.
 */
export async function middleware(req: NextRequest) {
  const phrase = configuredPhrase();
  if (!phrase) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (pathname === '/unlock' || pathname === '/api/auth') return NextResponse.next();

  if (sameToken(req.cookies.get(COOKIE)?.value, await tokenFor(phrase))) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'locked' }, { status: 401 });
  }
  return NextResponse.redirect(new URL('/unlock', req.url));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg).*)']
};
