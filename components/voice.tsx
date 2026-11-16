'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { alternativesOf, friendlyError, recognitionCtor, type Recognition } from '@/lib/speech';
import { blobToBase64, capId, enqueue, flush, pending } from '@/lib/queue';

type Phase = 'idle' | 'listening' | 'recording' | 'saving';

/**
 * One capture control, used on both surfaces.
 *
 * Online it transcribes live. Offline — or where the speech API is missing —
 * it records audio instead and queues it locally, so an idea is never lost to
 * a dead zone. Typing is always available.
 */
export function VoiceCapture({
  onCaptured, big
}: { onCaptured?: () => void; big?: boolean }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [heard, setHeard] = useState('');
  const [msg, setMsg] = useState('');
  const [typed, setTyped] = useState('');
  const [queued, setQueued] = useState(0);
  const [online, setOnline] = useState(true);

  const recRef = useRef<Recognition | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshQueue = useCallback(async () => {
    setQueued((await pending()).length);
  }, []);

  const trySync = useCallback(async () => {
    const sent = await flush();
    await refreshQueue();
    if (sent) { setMsg(`${sent} queued capture${sent > 1 ? 's' : ''} synced`); onCaptured?.(); }
  }, [refreshQueue, onCaptured]);

  useEffect(() => {
    setOnline(navigator.onLine !== false);
    refreshQueue();
    trySync();
    const up = () => { setOnline(true); trySync(); };
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
      if (stopTimer.current) clearTimeout(stopTimer.current);
      try { recRef.current?.abort(); } catch { /* none */ }
      try { mediaRef.current?.stop(); } catch { /* none */ }
    };
  }, [refreshQueue, trySync]);

  const save = useCallback(async (text: string, audio: string | null, source: 'voice' | 'typed' | 'audio') => {
    const id = capId();
    setPhase('saving');
    const item = { id, text, audio_b64: audio, source, created_at: Date.now() };
    try {
      const res = await fetch('/api/captures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      if (!res.ok) throw new Error(String(res.status));
      setMsg('Caught it');
      onCaptured?.();
    } catch {
      await enqueue(item);
      await refreshQueue();
      setMsg('Saved on this device — syncs when you are back online');
    } finally {
      setPhase('idle');
      setHeard('');
      setTimeout(() => setMsg(''), 4000);
    }
  }, [onCaptured, refreshQueue]);

  /** No speech API, or no network: keep the audio instead of losing the idea. */
  async function record() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
        if (!blob.size) { setPhase('idle'); return; }
        const b64 = await blobToBase64(blob);
        await save('', b64, 'audio');
      };
      mr.start();
      setPhase('recording');
      setMsg('');
      stopTimer.current = setTimeout(() => { try { mr.stop(); } catch { /* stopped */ } }, 60000);
    } catch {
      setPhase('idle');
      setMsg('No microphone. Type it instead.');
    }
  }

  function listen() {
    const Ctor = recognitionCtor();
    if (!Ctor || navigator.onLine === false) { record(); return; }
    try { recRef.current?.abort(); } catch { /* none */ }
    const rec = new Ctor();
    recRef.current = rec;
    rec.lang = 'en-IN';
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    let settled = false;

    rec.onstart = () => { setPhase('listening'); setHeard(''); setMsg(''); };
    rec.onresult = e => {
      const interim = e.results[e.results.length - 1]?.[0]?.transcript ?? '';
      if (interim) setHeard(interim.trim());
      const finals = alternativesOf(e);
      if (finals.length) { settled = true; setHeard(finals[0]); save(finals[0], null, 'voice'); }
    };
    rec.onerror = ev => {
      settled = true;
      if (ev.error === 'network' || ev.error === 'service-not-allowed') { record(); return; }
      setPhase('idle');
      const m = friendlyError(ev.error);
      if (m) setMsg(m);
    };
    rec.onend = () => { if (!settled) setPhase(p => (p === 'listening' ? 'idle' : p)); };
    try { rec.start(); } catch { record(); }
  }

  function stop() {
    if (phase === 'recording') { try { mediaRef.current?.stop(); } catch { /* stopped */ } return; }
    try { recRef.current?.stop(); } catch { /* stopped */ }
    setPhase('idle');
  }

  const active = phase === 'listening' || phase === 'recording';
  const label =
    phase === 'listening' ? 'listening — say it' :
    phase === 'recording' ? 'recording — tap to stop' :
    phase === 'saving' ? 'saving…' :
    online ? 'tap and say the idea' : 'offline — it will record audio';

  return (
    <div className={big ? 'cap cap-big' : 'cap'}>
      <button
        type="button"
        className={`mic${active ? ' live' : ''}`}
        onClick={() => (active ? stop() : listen())}
        disabled={phase === 'saving'}
        aria-label={active ? 'Stop' : 'Capture an idea by voice'}
      >
        <svg viewBox="0 0 24 24" width={big ? 42 : 26} height={big ? 42 : 26} aria-hidden="true">
          <path fill="currentColor" d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z" />
          <path fill="currentColor" d="M17.3 11a.9.9 0 0 0-1.8 0 3.5 3.5 0 0 1-7 0 .9.9 0 1 0-1.8 0 5.3 5.3 0 0 0 4.4 5.2V19h-2a.9.9 0 0 0 0 1.8h5.8a.9.9 0 0 0 0-1.8h-2v-2.8a5.3 5.3 0 0 0 4.4-5.2Z" />
        </svg>
      </button>
      <div className="miclabel">{label}</div>
      {heard && <div className="heard">{heard}</div>}
      {msg && <div className="capmsg">{msg}</div>}

      <div className="addtask" style={{ marginTop: 10 }}>
        <input
          type="text"
          value={typed}
          onChange={e => setTyped(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && typed.trim()) { save(typed.trim(), null, 'typed'); setTyped(''); }
          }}
          placeholder="or type it"
        />
        <button
          className="btn sm"
          disabled={!typed.trim() || phase === 'saving'}
          onClick={() => { save(typed.trim(), null, 'typed'); setTyped(''); }}
        >Catch</button>
      </div>

      {queued > 0 && (
        <div className="capqueue">
          {queued} waiting on this device
          <button className="btn sm" style={{ marginLeft: 8 }} onClick={trySync}>Sync now</button>
        </div>
      )}
    </div>
  );
}
