'use client';

import { useState } from 'react';
import { useStore } from './store';
import { Chk, Pills, Prog, Range, scoreColor } from './ui';
import {
  Idea, SCORE_FIELDS, SLOTS, STATUSES, TOOLS, TYPES, Status
} from '@/lib/types';
import { ago, progress, score } from '@/lib/score';

export function Tasks({ idea }: { idea: Idea }) {
  const { addTask, patchTask, deleteTask, touchIdea } = useStore();
  const [draft, setDraft] = useState('');

  function add() {
    const t = draft.trim();
    if (!t) return;
    addTask(idea.id, t);
    setDraft('');
  }

  return (
    <div>
      <label className="lbl">Tasks</label>
      <div style={{ marginTop: 5 }}>
        {idea.tasks.map(t => (
          <div className={`task${t.done ? ' done' : ''}`} key={t.id}>
            <Chk
              on={t.done}
              label={t.done ? 'Mark not done' : 'Mark done'}
              onClick={() => { patchTask(t.id, { done: !t.done }); if (!t.done) touchIdea(idea.id); }}
            />
            <input
              type="text"
              value={t.title}
              onChange={e => patchTask(t.id, { title: e.target.value }, { debounce: true })}
              placeholder="what needs doing"
            />
            <button type="button" className="btn sm" onClick={() => deleteTask(t.id)} aria-label="Remove task">×</button>
          </div>
        ))}
      </div>
      <div className="btnrow" style={{ marginTop: 8 }}>
        <input
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="add a task, press enter"
          style={{ flex: 1, minWidth: 150, fontSize: 13 }}
        />
        <button type="button" className="btn sm" onClick={add} disabled={!draft.trim()}>add</button>
      </div>
    </div>
  );
}

export function IdeaDetail({ idea, onClose }: { idea: Idea; onClose: () => void }) {
  const { patchIdea, deleteIdea, touchIdea, say } = useStore();
  const [armed, setArmed] = useState(false);
  const o = idea;

  const field = (k: keyof Idea) => ({
    value: (o[k] ?? '') as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      patchIdea(o.id, { [k]: e.target.value } as Partial<Idea>, { debounce: true })
  });

  function copyBrief() {
    const open = o.tasks.filter(t => !t.done).map(t => `- ${t.title}`);
    const p = progress(o);
    const L = [
      `# ${o.title || 'untitled'}`, '',
      `**What it is:** ${o.type}${o.tool && o.tool !== '—' ? ` · built with ${o.tool}` : ''}`,
      `**Status:** ${o.status}${p ? ` · ${p.done}/${p.total} tasks done` : ''} · last touched ${ago(o.touched_at)}`,
      o.link ? `**Link:** ${o.link}` : '', ''
    ];
    if (o.why) L.push('## Why I started it', o.why, '');
    if (o.resume) L.push('## Where I stopped', o.resume, '');
    if (o.context) L.push('## Everything I know about it', o.context, '');
    if (open.length) L.push('## Still to do', open.join('\n'), '');
    L.push('## What I want from you now');
    L.push(o.next_action
      ? `Help me do this one thing: ${o.next_action}`
      : 'Help me pick the one smallest next step, then do it with me.');
    L.push('', 'Pick up from here. Ask me only what you cannot infer from the above.');
    const text = L.filter(x => x !== null).join('\n');
    navigator.clipboard?.writeText(text).then(
      () => say('Brief copied — paste it into a new chat'),
      () => say('Could not copy')
    );
  }

  function setStatus(s: Status) {
    patchIdea(o.id, { status: s, touched_at: new Date().toISOString() });
  }

  return (
    <div className="detail">
      <div className="sec grid2">
        <div>
          <div className="field">
            <label className="lbl">The spark</label>
            <textarea {...field('why')} placeholder="why this grabbed you" />
          </div>
          <div className="field">
            <label className="lbl">Next action (15 min)</label>
            <input type="text" {...field('next_action')} placeholder="smallest physical step" />
          </div>
          <div className="field">
            <label className="lbl">Resume note — where you stopped</label>
            <textarea {...field('resume')} placeholder="last thing you did, the next decision, what was annoying you" />
          </div>
        </div>
        <div className="field">
          <label className="lbl">Brain dump</label>
          <textarea {...field('context')} rows={7} />
        </div>
      </div>

      <div className="sec grid4">
        <div className="field">
          <label className="lbl">Status</label>
          <select value={o.status} onChange={e => setStatus(e.target.value as Status)}>
            {STATUSES.map(s => <option key={s.k} value={s.k}>{s.l}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="lbl">Type</label>
          <select value={o.type} onChange={e => patchIdea(o.id, { type: e.target.value })}>
            {TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="lbl">Built with</label>
          <select value={o.tool} onChange={e => patchIdea(o.id, { tool: e.target.value })}>
            {TOOLS.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="lbl">Repo / link</label>
          <input type="text" {...field('link')} placeholder="url" />
        </div>
      </div>

      <div className="sec">
        <label className="lbl">Portfolio slots</label>
        <div className="filters" style={{ marginTop: 6 }}>
          {SLOTS.map(s => {
            const on = o.slots.includes(s.k);
            return (
              <button
                type="button"
                key={s.k}
                className={`chip${on ? ' on' : ''}`}
                onClick={() => patchIdea(o.id, {
                  slots: on ? o.slots.filter(x => x !== s.k) : [...o.slots, s.k]
                })}
              >{s.l}</button>
            );
          })}
        </div>
      </div>

      <div className="sec grid2">
        <div>
          {SCORE_FIELDS.map(f => (
            <Range
              key={f.k}
              label={f.l}
              value={(o[f.k] as number) || 3}
              onChange={n => patchIdea(o.id, { [f.k]: n } as Partial<Idea>)}
            />
          ))}
        </div>
        <Tasks idea={o} />
      </div>

      <div className="sec btnrow" style={{ borderTop: '1px solid var(--line)', paddingTop: 13 }}>
        <button type="button" className="btn go" onClick={() => touchIdea(o.id)}>Touched it today</button>
        <button type="button" className="btn" onClick={copyBrief}>Copy brief for Claude</button>
        {o.status !== 'building' && <button type="button" className="btn" onClick={() => setStatus('building')}>Move to building</button>}
        {o.status !== 'shipped' && <button type="button" className="btn" onClick={() => { setStatus('shipped'); say('On the shelf. Add the link so it counts.'); }}>Mark shipped</button>}
        {o.status !== 'parked' && <button type="button" className="btn warnb" onClick={() => setStatus('parked')}>Park</button>}
        <button type="button" className="btn stopb" onClick={() => setStatus('killed')}>Kill</button>
        <button
          type="button"
          className="btn stopb"
          onClick={() => {
            if (!armed) { setArmed(true); say('Click delete again to confirm'); setTimeout(() => setArmed(false), 4000); return; }
            onClose();
            deleteIdea(o.id);
          }}
        >{armed ? 'Sure?' : 'Delete'}</button>
        <span className="pct" style={{ marginLeft: 'auto' }}>created {ago(o.created_at)}</span>
      </div>
    </div>
  );
}

export function IdeaRow({
  idea, open, onToggle, showNext
}: { idea: Idea; open: boolean; onToggle: () => void; showNext?: boolean }) {
  const { weights } = useStore();
  const sc = score(idea, weights);
  const p = progress(idea);

  return (
    <>
      <div
        className={`row${open ? ' open' : ''}`}
        onClick={onToggle}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
        role="button"
        tabIndex={0}
        aria-expanded={open}
      >
        <div className="score" style={{ color: scoreColor(sc) }}>{sc}<small>SCR</small></div>
        <div className="main">
          <b>{idea.title || 'untitled'}</b>
          <div className="meta"><Pills o={idea} w={weights} /></div>
          {showNext && idea.next_action && (
            <div className="note" style={{ marginTop: 7 }}>→ {idea.next_action}</div>
          )}
        </div>
        <div className="right">
          {p && <><Prog pct={p.pct} /><span className="pct">{p.pct}%</span></>}
          <span className="pct" title="last touched">{ago(idea.touched_at)}</span>
        </div>
      </div>
      {open && <IdeaDetail idea={idea} onClose={onToggle} />}
    </>
  );
}

export function IdeaList({
  items, openId, setOpenId, showNext, empty
}: {
  items: Idea[]; openId: string | null; setOpenId: (id: string | null) => void;
  showNext?: boolean; empty?: React.ReactNode;
}) {
  if (!items.length) return <>{empty ?? <div className="empty"><b>Nothing here</b></div>}</>;
  return (
    <>
      {items.map(o => (
        <IdeaRow
          key={o.id}
          idea={o}
          open={openId === o.id}
          onToggle={() => setOpenId(openId === o.id ? null : o.id)}
          showNext={showNext}
        />
      ))}
    </>
  );
}
