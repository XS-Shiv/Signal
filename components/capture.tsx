'use client';

import { useState } from 'react';
import { useStore } from './store';
import { Empty, Panel, Range } from './ui';
import { Idea, SCORE_FIELDS, SLOTS, STATUSES, TOOLS, TYPES, LIVE, Status } from '@/lib/types';
import { isLive, unfinished } from '@/lib/score';

const FRESH = {
  title: '', why: '', next_action: '', context: '',
  type: 'App', status: 'idea' as Status, tool: 'Claude',
  slots: [] as string[], portfolio: 3, excite: 3, reach: 3, learn: 3, effort: 3
};

export function Capture({ setOpenId, go }: { setOpenId: (id: string | null) => void; go: (v: string) => void }) {
  const s = useStore();
  const [f, setF] = useState({ ...FRESH });
  const [quick, setQuick] = useState({ title: '', why: '' });
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof typeof FRESH>(k: K, v: (typeof FRESH)[K]) =>
    setF(p => ({ ...p, [k]: v }));

  async function save() {
    if (!f.title.trim()) { s.say('Give it a name first'); return; }
    setBusy(true);
    const made = await s.createIdea(f);
    setBusy(false);
    if (made) {
      setF({ ...FRESH });
      s.say(f.next_action.trim()
        ? 'Captured — and it has a next step'
        : 'Captured — add a next action when you can');
    }
  }

  async function dropQuick() {
    if (!quick.title.trim()) return;
    setBusy(true);
    const made = await s.createIdea({ ...FRESH, title: quick.title, why: quick.why });
    setBusy(false);
    if (made) { setQuick({ title: '', why: '' }); s.say('Dropped in the inbox'); }
  }

  const inbox = s.ideas.filter(o => isLive(o) && unfinished(o))
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));

  return (
    <div className="split">
      <Panel label="New idea">
        <div className="field">
          <label className="lbl">What is it</label>
          <input
            id="capture-title"
            type="text"
            value={f.title}
            onChange={e => set('title', e.target.value)}
            placeholder="Name it like you would say it out loud"
            autoComplete="off"
          />
        </div>
        <div className="field">
          <label className="lbl">The spark — why did this grab you</label>
          <textarea
            value={f.why}
            onChange={e => set('why', e.target.value)}
            placeholder="The thing you noticed, the annoyance, the gap. Future-you needs the feeling back, not just the noun."
          />
        </div>
        <div className="field">
          <label className="lbl">Smallest next action (15 min, physical)</label>
          <input
            type="text"
            value={f.next_action}
            onChange={e => set('next_action', e.target.value)}
            placeholder="sketch the one screen that matters / write a 5-line README / dm one person"
          />
          <div className="hint">
            If you cannot name a 15-minute action, the idea is not ready — it is a wish.
            Write one anyway and make it small.
          </div>
        </div>
        <div className="field">
          <label className="lbl">Brain dump — everything in your head right now</label>
          <textarea
            rows={4}
            value={f.context}
            onChange={e => set('context', e.target.value)}
            placeholder="References, the tech, the angle, who it is for, what you are worried about. This is what gives you thoughts back when you return."
          />
        </div>
        <div className="grid3">
          <div className="field">
            <label className="lbl">Type</label>
            <select value={f.type} onChange={e => set('type', e.target.value)}>
              {TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="lbl">Status</label>
            <select value={f.status} onChange={e => set('status', e.target.value as Status)}>
              {STATUSES.filter(x => LIVE.includes(x.k)).map(x => (
                <option key={x.k} value={x.k}>{x.l}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="lbl">Built with</label>
            <select value={f.tool} onChange={e => set('tool', e.target.value)}>
              {TOOLS.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="field">
          <label className="lbl">Portfolio slot(s)</label>
          <div className="filters" style={{ marginTop: 6 }}>
            {SLOTS.map(sl => {
              const on = f.slots.includes(sl.k);
              return (
                <button
                  key={sl.k}
                  className={`chip${on ? ' on' : ''}`}
                  onClick={() => set('slots', on ? f.slots.filter(x => x !== sl.k) : [...f.slots, sl.k])}
                >{sl.l}</button>
              );
            })}
          </div>
        </div>
        <div className="grid4">
          {SCORE_FIELDS.map(sf => (
            <Range
              key={sf.k}
              label={sf.l}
              value={f[sf.k as keyof typeof FRESH] as number}
              onChange={n => set(sf.k as keyof typeof FRESH, n as never)}
            />
          ))}
        </div>
        <div className="btnrow" style={{ marginTop: 14 }}>
          <button className="btn go" onClick={save} disabled={busy || !f.title.trim()}>
            {busy ? 'saving' : 'Capture idea'}
          </button>
          <button className="btn" onClick={() => setF({ ...FRESH })}>Clear</button>
        </div>
      </Panel>

      <div>
        <Panel label="Quick drop">
          <p className="note" style={{ marginTop: 0 }}>
            No time? Drop the title and the spark only. It lands in the inbox below and Review will
            nag you to finish it.
          </p>
          <div className="field">
            <input
              type="text"
              value={quick.title}
              onChange={e => setQuick(p => ({ ...p, title: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') dropQuick(); }}
              placeholder="Idea, one line"
              autoComplete="off"
            />
          </div>
          <div className="field">
            <input
              type="text"
              value={quick.why}
              onChange={e => setQuick(p => ({ ...p, why: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') dropQuick(); }}
              placeholder="Why it grabbed you (optional)"
              autoComplete="off"
            />
          </div>
          <button className="btn" onClick={dropQuick} disabled={busy || !quick.title.trim()}>Drop it</button>
        </Panel>

        <Panel
          label="Unfinished captures"
          right={<span className="lbl">{inbox.length ? `${inbox.length} to finish` : ''}</span>}
        >
          {inbox.length ? inbox.map(o => (
            <div key={o.id} style={{ padding: '9px 0', borderBottom: '1px dashed var(--line)' }}>
              <b style={{ fontSize: 13.5, fontWeight: 500 }}>{o.title}</b>
              <div className="note" style={{ margin: '3px 0 7px' }}>
                missing {[!o.why.trim() ? 'the spark' : '', !o.next_action.trim() ? 'a next action' : '']
                  .filter(Boolean).join(' and ')}
              </div>
              <button className="btn sm go" onClick={() => { go('board'); setOpenId(o.id); }}>finish it</button>
            </div>
          )) : (
            <div className="note">All captures are complete. That is the whole trick.</div>
          )}
        </Panel>
      </div>
    </div>
  );
}
