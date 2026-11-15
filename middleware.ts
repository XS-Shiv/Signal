import { NextRequest, NextResponse } from 'next/server';
import { sameToken, tokenFor } from '@/lib/token';

const COOKIE = 'signal_key';

/**
 * Everything is behind the passcode except the unlock page itself and the
 * endpoint that checks the passcode.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === '/unlock' || pathname === '/api/auth') return NextResponse.next();

  const expected = process.env.SIGNAL_PASSCODE;
  // Not configured yet: let the unlock page explain rather than hard-failing.
  if (!expected) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'SIGNAL_PASSCODE is not set' }, { status: 503 });
    }
    return NextResponse.redirect(new URL('/unlock?setup=1', req.url));
  }

  if (sameToken(req.cookies.get(COOKIE)?.value, await tokenFor(expected))) {
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
