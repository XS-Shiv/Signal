/**
 * The cookie holds a hash of the passcode, never the passcode itself.
 * Uses Web Crypto so it runs in both the edge (middleware) and node runtimes.
 */
export async function tokenFor(secret: string): Promise<string> {
  const data = new TextEncoder().encode(`signal:v1:${secret}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Constant-time-ish compare, so a wrong guess leaks no timing signal. */
export function sameToken(a: string | undefined, b: string): boolean {
  if (!a || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
