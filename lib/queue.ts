'use client';

/**
 * Offline capture queue.
 *
 * A capture must never be lost because there was no signal, so anything that
 * cannot be posted immediately is written to IndexedDB and flushed when the
 * connection returns. Each item carries the id it will have on the server, so
 * a flush that runs twice upserts rather than duplicating.
 */

export type Queued = {
  id: string;
  text: string;
  audio_b64: string | null;
  source: 'voice' | 'typed' | 'audio';
  created_at: number;
};

const DB_NAME = 'signal-capture';
const STORE = 'queue';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('no indexedDB')); return; }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('indexedDB open failed'));
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(db => new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('indexedDB request failed'));
    t.oncomplete = () => db.close();
  }));
}

export async function enqueue(item: Queued): Promise<void> {
  try { await tx('readwrite', s => s.put(item)); } catch { /* queue unavailable */ }
}

export async function pending(): Promise<Queued[]> {
  try {
    const all = await tx<Queued[]>('readonly', s => s.getAll() as IDBRequest<Queued[]>);
    return Array.isArray(all) ? all : [];
  } catch { return []; }
}

async function remove(id: string): Promise<void> {
  try { await tx('readwrite', s => s.delete(id) as unknown as IDBRequest<undefined>); } catch { /* ignore */ }
}

/** Returns how many made it to the server. Failures stay queued. */
export async function flush(): Promise<number> {
  const items = await pending();
  let sent = 0;
  for (const item of items) {
    try {
      const res = await fetch('/api/captures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id, text: item.text, audio_b64: item.audio_b64, source: item.source
        })
      });
      if (res.ok) { await remove(item.id); sent++; }
      else if (res.status === 400) { await remove(item.id); }  // empty: never going to succeed
      else break;                                              // server trouble: keep the rest queued
    } catch {
      break;                                                   // still offline
    }
  }
  return sent;
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result ?? '');
      resolve(s.includes(',') ? s.slice(s.indexOf(',') + 1) : s);
    };
    r.onerror = () => reject(r.error ?? new Error('could not read audio'));
    r.readAsDataURL(blob);
  });
}

export function capId(): string {
  return `cap_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
