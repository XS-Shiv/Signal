'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useStore } from './store';
import { VoiceCapture } from './voice';

/**
 * The phone surface. Deliberately one thing: a microphone. No navigation to
 * read, nothing to decide — whatever you say is sorted out later.
 */
export function CaptureScreen() {
  const s = useStore();
  const [caught, setCaught] = useState(0);

  return (
    <>
      <div className="topline" />
      <div className="capscreen">
        <div className="capscreen-in">
          <div className="brand" style={{ justifyContent: 'center', marginBottom: 28 }}>
            <div className="mark"><i /></div>
            <h1>SIGNAL</h1>
          </div>

          <VoiceCapture big onCaptured={() => { setCaught(n => n + 1); s.reload(); }} />

          <p className="hint" style={{ textAlign: 'center', marginTop: 26 }}>
            Say it and forget it. Nothing here asks you to decide anything —
            you sort it out next time you open the board.
          </p>

          <div className="btnrow" style={{ justifyContent: 'center', marginTop: 24 }}>
            <Link href="/" className="btn">
              {s.captures.length ? `${s.captures.length} waiting to sort` : 'Open the board'}
            </Link>
          </div>

          {caught > 0 && (
            <p className="hint" style={{ textAlign: 'center', marginTop: 14 }}>
              {caught} caught this session.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
