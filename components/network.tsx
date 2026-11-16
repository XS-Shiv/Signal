'use client';

import { useState } from 'react';
import { useStore } from './store';
import { Empty, Panel } from './ui';
import { Person, WARMTH, Warmth, warmthLabel } from '@/lib/types';
import { ago, isDue } from '@/lib/score';

const FRESH = {
  name: '', role: '', org: '', hook: '', ask: '',
  warmth: 'cold' as Warmth, next_touch: '', proof_idea_id: '', link: ''
};

export function Network() {
  const s = useStore();
  const [f, setF] = useState({ ...FRESH });
  const [dueOnly, setDueOnly] = useState(false);
  const [busy, setBusy] = useState(false);

  const proofs = s.ideas.filter(o => o.status === 'shipped' || o.status === 'building');

  const rows = s.people
    .filter(p => (dueOnly ? isDue(p) : true))
    .sort((a, b) => {
      const ad = isDue(a) ? 0 : 1;
      const bd = isDue(b) ? 0 : 1;
      if (ad !== bd) return ad - bd;
      return (a.next_touch ?? '9999').localeCompare(b.next_touch ?? '9999');
    });

  async function add() {
    if (!f.name.trim()) { s.say('Name, even a placeholder'); return; }
    setBusy(true);
    const ok = await s.createPerson({
      ...f,
      next_touch: f.next_touch || null,
      proof_idea_id: f.proof_idea_id || null
    });
    setBusy(false);
    if (ok) { setF({ ...FRESH }); s.say('Added to pipeline'); }
  }

  function logContact(p: Person) {
    const d = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
    s.patchPerson(p.id, {
      last_contact: new Date().toISOString(),
      warmth: p.warmth === 'cold' ? 'sent' : p.warmth,
      next_touch: d
    });
    s.say('Logged — follow up set for 5 days');
  }

  function copyOpener(p: Person) {
    const proof = s.ideas.find(o => o.id === p.proof_idea_id);
    const L = [`Hi ${p.name || 'there'},`, ''];
    if (p.hook) L.push(`${p.hook}.`);
    L.push('I am a PGP student at Masters’ Union, with about three years building product in AI and fintech before this.');
    if (proof) L.push(`Recently I built ${proof.title}${proof.link ? ` (${proof.link})` : ''} — happy to send it over.`);
    L.push('');
    L.push(`${p.ask || 'Would you be open to 15 minutes'} — any time in the next couple of weeks works, and I will come with specific questions.`);
    L.push('', 'Thanks either way,', 'Shivanand');
    navigator.clipboard?.writeText(L.join('\n')).then(
      () => s.say('Opener copied — edit before sending'),
      () => s.say('Could not copy'));
  }

  return (
    <>
      <div className="pagehead">
        <h2>People</h2>
        <p>Who to reach out to, and what to show them.</p>
      </div>
      <div className="split">
      <Panel
        label="Pipeline"
        right={
          <button className={`chip${dueOnly ? ' on' : ''}`} onClick={() => setDueOnly(v => !v)}>due only</button>
        }
      >
        {rows.length ? rows.map(p => {
          const proof = s.ideas.find(o => o.id === p.proof_idea_id);
          return (
            <div className="pcard" key={p.id}>
              <div className="ph">
                <div>
                  <b>{p.name}</b>
                  <p>{[p.role, p.org].filter(Boolean).join(' · ')}</p>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {isDue(p) && <span className="pill due">due</span>}
                  <span className={`pill w-${p.warmth}`}>{warmthLabel(p.warmth)}</span>
                </div>
              </div>
              {p.hook && <div className="note" style={{ marginBottom: 7 }}><b>hook:</b> {p.hook}</div>}
              {p.ask && <div className="note" style={{ marginBottom: 7 }}><b>ask:</b> {p.ask}</div>}
              {proof && <div className="note" style={{ marginBottom: 7 }}><b>show:</b> {proof.title}</div>}
              <div className="grid2" style={{ margin: '9px 0 7px' }}>
                <div className="field" style={{ margin: 0 }}>
                  <label className="lbl">Stage</label>
                  <select value={p.warmth} onChange={e => s.patchPerson(p.id, { warmth: e.target.value as Warmth })}>
                    {WARMTH.map(w => <option key={w.k} value={w.k}>{w.l}</option>)}
                  </select>
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label className="lbl">Next touch</label>
                  <input
                    type="date"
                    value={p.next_touch ?? ''}
                    onChange={e => s.patchPerson(p.id, { next_touch: e.target.value || null })}
                  />
                </div>
              </div>
              <div className="field" style={{ margin: '0 0 9px' }}>
                <label className="lbl">Notes</label>
                <textarea
                  rows={2}
                  value={p.notes}
                  onChange={e => s.patchPerson(p.id, { notes: e.target.value }, { debounce: true })}
                />
              </div>
              <div className="btnrow">
                <button className="btn sm go" onClick={() => logContact(p)}>messaged today</button>
                {p.link && <a className="btn sm" href={p.link} target="_blank" rel="noopener noreferrer">profile</a>}
                <button className="btn sm" onClick={() => copyOpener(p)}>copy opener</button>
                <button className="btn sm stopb" onClick={() => s.deletePerson(p.id)}>remove</button>
                <span className="pct" style={{ marginLeft: 'auto' }}>
                  last {p.last_contact ? ago(p.last_contact) : 'never'}
                </span>
              </div>
            </div>
          );
        }) : (
          <Empty title="Pipeline empty">
            Add three people. Role-based is fine — “PM at a fintech I admire” — fill the name when you find them.
          </Empty>
        )}
      </Panel>

      <div>
        <Panel label="Add a person">
          <div className="field">
            <label className="lbl">Name</label>
            <input type="text" value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))} autoComplete="off" />
          </div>
          <div className="grid2">
            <div className="field">
              <label className="lbl">Role</label>
              <input type="text" value={f.role} placeholder="PM, founder, alum" onChange={e => setF(p => ({ ...p, role: e.target.value }))} autoComplete="off" />
            </div>
            <div className="field">
              <label className="lbl">Where</label>
              <input type="text" value={f.org} placeholder="company / college" onChange={e => setF(p => ({ ...p, org: e.target.value }))} autoComplete="off" />
            </div>
          </div>
          <div className="field">
            <label className="lbl">Hook — why them, why now</label>
            <textarea value={f.hook} placeholder="Read their post on X. Built something in their space. Alum of MU." onChange={e => setF(p => ({ ...p, hook: e.target.value }))} />
          </div>
          <div className="field">
            <label className="lbl">The ask (one, specific, small)</label>
            <input type="text" value={f.ask} placeholder="15 min on how they scoped v1" onChange={e => setF(p => ({ ...p, ask: e.target.value }))} autoComplete="off" />
          </div>
          <div className="grid2">
            <div className="field">
              <label className="lbl">Stage</label>
              <select value={f.warmth} onChange={e => setF(p => ({ ...p, warmth: e.target.value as Warmth }))}>
                {WARMTH.map(w => <option key={w.k} value={w.k}>{w.l}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="lbl">Next touch</label>
              <input type="date" value={f.next_touch} onChange={e => setF(p => ({ ...p, next_touch: e.target.value }))} />
            </div>
          </div>
          <div className="field">
            <label className="lbl">Show them this (your proof of work)</label>
            <select value={f.proof_idea_id} onChange={e => setF(p => ({ ...p, proof_idea_id: e.target.value }))}>
              <option value="">— nothing yet —</option>
              {proofs.map(o => <option key={o.id} value={o.id}>{o.title}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="lbl">Link</label>
            <input type="text" value={f.link} placeholder="linkedin / x profile" onChange={e => setF(p => ({ ...p, link: e.target.value }))} autoComplete="off" />
          </div>
          <button className="btn go" onClick={add} disabled={busy || !f.name.trim()}>Add to pipeline</button>
        </Panel>

        <Panel label="How to work this">
          <div className="hint">
            Outreach with <b>“I built this in your space, one question”</b> beats a cold hello,
            so every row links to something you shipped.
            <hr />
            day 0 — first message, one specific ask<br />
            day 5 — one follow-up with something new<br />
            day 20 — no reply? one value ping, then stop<br />
            after a good chat — come back in 3 weeks with what you did about their advice
            <hr />
            Three new people a week beats twenty in one burst you never follow up on.
          </div>
        </Panel>
      </div>
      </div>
    </>
  );
}
