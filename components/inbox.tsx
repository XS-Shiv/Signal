'use client';

import { useMemo, useState } from 'react';
import { useStore } from './store';
import { Capture, LIVE, SLOTS, Status } from '@/lib/types';
import { likelyDuplicates } from '@/lib/similar';
import { ago } from '@/lib/score';

/**
 * Triage. The inbox owns the home screen while anything sits in it, because
 * an inbox nobody is forced to look at is just a slower Notion page.
 */
function TriageCard({ capture }: { capture: Capture }) {
  const s = useStore();
  const [title, setTitle] = useState(capture.text);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'idea' | 'task'>('idea');
  const [target, setTarget] = useState('');
  const [slots, setSlots] = useState<string[]>([]);

  const dupes = useMemo(
    () => likelyDuplicates(title, s.ideas.filter(o => LIVE.includes(o.status as Status))),
    [title, s.ideas]
  );
  const projects = s.ideas.filter(o => o.status === 'building' || o.status === 'next');
  const isAudio = !!capture.audio_b64 && !capture.text.trim();

  async function run(body: Record<string, unknown>) {
    setBusy(true);
    const ok = await s.triage(capture.id, body);
    setBusy(false);
    if (!ok) s.say('Could not file that one');
  }

  return (
    <div className="tri">
      <div className="tri-head">
        <span className="lbl">{capture.source === 'typed' ? 'typed' : 'voice'} · {ago(capture.created_at)}</span>
        <button className="btn sm stopb" disabled={busy} onClick={() => run({ outcome: 'dropped' })}>
          Not worth it
        </button>
      </div>

      {isAudio && (
        <div className="tri-audio">
          <p className="hint" style={{ margin: '0 0 8px' }}>
            Captured with no signal, so this is the recording. Listen and write what you said.
          </p>
          <audio controls src={`data:audio/webm;base64,${capture.audio_b64}`} style={{ width: '100%' }} />
        </div>
      )}

      <div className="field" style={{ marginTop: 12 }}>
        <label className="lbl">What it is</label>
        <input
          type="text"
          value={title}
          autoFocus={!isAudio}
          onChange={e => { setTitle(e.target.value); s.patchCapture(capture.id, e.target.value); }}
          placeholder={isAudio ? 'type what you hear' : 'tidy up the wording'}
        />
      </div>

      {!!dupes.length && (
        <div className="dupes">
          <span className="lbl">You may already have this</span>
          {dupes.map(d => (
            <div className="dupe" key={d.idea.id}>
              <span>{d.idea.title}</span>
              <button
                className="btn sm"
                disabled={busy}
                onClick={() => run({ outcome: 'merged', idea_id: d.idea.id, text: title })}
              >Add to it</button>
            </div>
          ))}
        </div>
      )}

      <div className="filters" style={{ margin: '12px 0' }}>
        <button className={`chip${mode === 'idea' ? ' on' : ''}`} onClick={() => setMode('idea')}>New idea</button>
        <button className={`chip${mode === 'task' ? ' on' : ''}`} onClick={() => setMode('task')}>Task on a project</button>
      </div>

      {mode === 'idea' ? (
        <>
          <div className="filters" style={{ marginBottom: 12 }}>
            {SLOTS.map(sl => {
              const on = slots.includes(sl.k);
              return (
                <button
                  key={sl.k}
                  className={`chip${on ? ' on' : ''}`}
                  onClick={() => setSlots(on ? slots.filter(x => x !== sl.k) : [...slots, sl.k])}
                >{sl.l}</button>
              );
            })}
          </div>
          <button
            className="btn go"
            disabled={busy || !title.trim()}
            onClick={() => run({ outcome: 'new_idea', title: title.trim(), why: capture.text, slots })}
          >{busy ? 'Filing…' : 'Keep as an idea'}</button>
        </>
      ) : (
        <>
          <div className="field">
            <label className="lbl">Which project</label>
            <select value={target} onChange={e => setTarget(e.target.value)}>
              <option value="">choose one…</option>
              {projects.map(o => <option key={o.id} value={o.id}>{o.title}</option>)}
            </select>
          </div>
          <button
            className="btn go"
            disabled={busy || !target || !title.trim()}
            onClick={() => run({ outcome: 'task', idea_id: target, title: title.trim() })}
          >{busy ? 'Filing…' : 'Add as a task'}</button>
        </>
      )}
    </div>
  );
}

export function Inbox() {
  const s = useStore();
  const [i, setI] = useState(0);
  const list = s.captures;
  const current = list[Math.min(i, list.length - 1)];
  if (!current) return null;

  return (
    <>
      <div className="pagehead">
        <h2>{list.length} to sort out</h2>
        <p>Everything you caught is here. Each one leaves as an idea, a task, or nothing.</p>
      </div>
      <TriageCard key={current.id} capture={current} />
      {list.length > 1 && (
        <div className="btnrow" style={{ marginTop: 12, justifyContent: 'space-between' }}>
          <span className="hint">{Math.min(i + 1, list.length)} of {list.length}</span>
          <button className="btn sm" onClick={() => setI(n => (n + 1) % list.length)}>
            Skip for now
          </button>
        </div>
      )}
    </>
  );
}
