'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Unlock() {
  const router = useRouter();
  const [passcode, setPasscode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [setup, setSetup] = useState(false);

  // read from the URL on the client, so this page still prerenders as static
  useEffect(() => {
    setSetup(new URLSearchParams(window.location.search).get('setup') === '1');
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode })
      });
      if (res.ok) {
        router.replace('/');
        router.refresh();
        return;
      }
      const body = await res.json().catch(() => ({}));
      setErr(body.error || 'Wrong passcode');
    } catch {
      setErr('Network error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="topline" />
      <div className="gate">
        {setup ? (
          <div className="box">
            <div className="mark"><i /></div>
            <h1>SIGNAL</h1>
            <p style={{ marginBottom: 14 }}>
              Not configured yet. Set <code className="mono">SIGNAL_PASSCODE</code> in the
              environment variables, then redeploy.
            </p>
            <div className="note" style={{ textAlign: 'left' }}>
              Vercel → your project → Settings → Environment Variables. You also need{' '}
              <code className="mono">SUPABASE_URL</code> and{' '}
              <code className="mono">SUPABASE_SERVICE_ROLE_KEY</code>. See{' '}
              <code className="mono">.env.example</code> in the repo.
            </div>
          </div>
        ) : (
          <form className="box" onSubmit={submit}>
            <div className="mark"><i /></div>
            <h1>SIGNAL</h1>
            <p>Enter the passcode.</p>
            <input
              type="password"
              value={passcode}
              onChange={e => setPasscode(e.target.value)}
              placeholder="passcode"
              autoFocus
              autoComplete="current-password"
              style={{ fontFamily: 'var(--mono)', textAlign: 'center', letterSpacing: '.2em' }}
            />
            <button className="btn go" style={{ width: '100%', marginTop: 10 }} disabled={busy || !passcode}>
              {busy ? 'checking' : 'unlock'}
            </button>
            <div className="err">{err}</div>
          </form>
        )}
      </div>
    </>
  );
}
