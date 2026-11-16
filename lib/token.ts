/**
 * The cookie holds a hash of the phrase, never the phrase itself.
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

/**
 * Speech recognition returns "Open sesame." where you configured "open sesame",
 * so both sides get flattened to letters, digits and single spaces before they
 * are compared.
 */
export function normalizePhrase(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The configured phrase, or null when the site is deliberately left open. */
export function configuredPhrase(): string | null {
  const v = process.env.SIGNAL_VOICE_PHRASE;
  return v && v.trim() ? v : null;
}
