'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { alternativesOf, friendlyError, recognitionCtor, type Recognition } from '@/lib/speech';

type Phase = 'idle' | 'listening' | 'checking' | 'wrong';

export default function Unlock() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('idle');
  const [heard, setHeard] = useState('');
  const [msg, setMsg] = useState('');
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState('');
  const [supported, setSupported] = useState(true);
  const recRef = useRef<Recognition | null>(null);

  useEffect(() => {
    const ok = !!recognitionCtor();
    setSupported(ok);
    if (!ok) setTyping(true);
    return () => { try { recRef.current?.abort(); } catch { /* already gone */ } };
  }, []);

  const submit = useCallback(async (alternatives: string[]) => {
    setPhase('checking');
    setMsg('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alternatives })
      });
      if (res.ok) {
        router.replace('/');
        router.refresh();
        return;
      }
      const body = await res.json().catch(() => ({}));
      setPhase('wrong');
      setMsg(body.error || 'Not the phrase');
    } catch {
      setPhase('wrong');
      setMsg('Network error');
    }
  }, [router]);

  function listen() {
    const Ctor = recognitionCtor();
    if (!Ctor) { setTyping(true); return; }
    try { recRef.current?.abort(); } catch { /* none running */ }

    const rec = new Ctor();
    recRef.current = rec;
    rec.lang = 'en-IN';
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 3;

    let settled = false;

    rec.onstart = () => { setPhase('listening'); setHeard(''); setMsg(''); };

    rec.onresult = e => {
      // show interim words so it is obvious the mic is live
      const interim = e.results[e.results.length - 1]?.[0]?.transcript ?? '';
      if (interim) setHeard(interim.trim());
      const finals = alternativesOf(e);
      if (finals.length) {
        settled = true;
        setHeard(finals[0]);
        submit(finals);
      }
    };

    rec.onerror = ev => {
      settled = true;
      const m = friendlyError(ev.error);
      setPhase('idle');
      if (m) setMsg(m);
      if (ev.error === 'not-allowed' || ev.error === 'network' || ev.error === 'audio-capture') {
        setTyping(true);
      }
    };

    rec.onend = () => {
      if (!settled) setPhase(p => (p === 'listening' ? 'idle' : p));
    };

    try { rec.start(); } catch { setPhase('idle'); setTyping(true); }
  }

  function stop() {
    try { recRef.current?.stop(); } catch { /* already stopped */ }
    setPhase('idle');
  }

  const label =
    phase === 'listening' ? 'listening…' :
    phase === 'checking' ? 'checking…' :
    'hold on, speak the phrase';

  return (
    <>
      <div className="topline" />
      <div className="gate">
        <div className="box">
          <div className="mark"><i /></div>
          <h1>SIGNAL</h1>
          <p>{supported ? 'Say the phrase to unlock.' : 'Type the phrase to unlock.'}</p>

          {supported && (
            <>
              <button
                type="button"
                className={`mic${phase === 'listening' ? ' live' : ''}`}
                onClick={() => (phase === 'listening' ? stop() : listen())}
                disabled={phase === 'checking'}
                aria-label={phase === 'listening' ? 'Stop listening' : 'Start listening'}
              >
                <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z"
                  />
                  <path
                    fill="currentColor"
                    d="M17.3 11a.9.9 0 0 0-1.8 0 3.5 3.5 0 0 1-7 0 .9.9 0 1 0-1.8 0 5.3 5.3 0 0 0 4.4 5.2V19h-2a.9.9 0 0 0 0 1.8h5.8a.9.9 0 0 0 0-1.8h-2v-2.8a5.3 5.3 0 0 0 4.4-5.2Z"
                  />
                </svg>
              </button>
              <div className="miclabel">{label}</div>
              {heard && <div className="heard">heard: “{heard}”</div>}
            </>
          )}

          <div className="err">{msg}</div>

          {typing ? (
            <form
              onSubmit={e => { e.preventDefault(); if (typed.trim()) submit([typed]); }}
              style={{ marginTop: 4 }}
            >
              <input
                type="password"
                value={typed}
                onChange={e => setTyped(e.target.value)}
                placeholder="type the phrase"
                autoFocus={!supported}
                autoComplete="current-password"
                style={{ fontFamily: 'var(--mono)', textAlign: 'center' }}
              />
              <button
                className="btn go"
                style={{ width: '100%', marginTop: 10 }}
                disabled={phase === 'checking' || !typed.trim()}
              >
                {phase === 'checking' ? 'checking' : 'unlock'}
              </button>
            </form>
          ) : (
            <button className="btn" style={{ width: '100%' }} onClick={() => setTyping(true)}>
              type it instead
            </button>
          )}

          <p className="fineprint">
            This checks what you say, not who says it — it is a spoken password, not a voiceprint.
          </p>
        </div>
      </div>
    </>
  );
}
