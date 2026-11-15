import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

/**
 * Service-role client. Server-only — the key must never reach the browser,
 * so never import this from a file carrying "use client".
 */
export function db(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set. See .env.example.'
    );
  }
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

export const COOKIE = 'signal_key';

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Only these columns can be written from the client. */
export const IDEA_FIELDS = [
  'title', 'type', 'status', 'tool', 'why', 'next_action', 'context', 'resume',
  'portfolio', 'excite', 'reach', 'learn', 'effort', 'slots', 'link', 'touched_at'
] as const;

export const PERSON_FIELDS = [
  'name', 'role', 'org', 'hook', 'ask', 'warmth', 'next_touch',
  'last_contact', 'proof_idea_id', 'link', 'notes'
] as const;

export const TASK_FIELDS = ['title', 'done', 'due', 'position', 'idea_id'] as const;

export function pick<T extends object>(body: unknown, fields: readonly string[]): Partial<T> {
  const out: Record<string, unknown> = {};
  if (!body || typeof body !== 'object') return out as Partial<T>;
  for (const f of fields) {
    if (f in (body as Record<string, unknown>)) {
      out[f] = (body as Record<string, unknown>)[f];
    }
  }
  return out as Partial<T>;
}
