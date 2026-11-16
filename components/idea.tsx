'use client';

import { useState } from 'react';
import { useStore } from './store';
import { Range } from './ui';
import { TaskLine, AddTask } from './tasks';
import {
  Idea, SCORE_FIELDS, SLOTS, STATUSES, TOOLS, TYPES, Status, slotLabel, statusLabel
} from '@/lib/types';
import { ago, daysSince, isStale, progress, score } from '@/lib/score';

/**
 * The full editor. Only the two things that matter day to day are visible;
 * everything else sits behind a disclosure so the panel does not shout.
 */
export function IdeaDetail({ idea, onClose }: { idea: Idea; onClose: () => void }) {
  const s = useStore();
  const [armed, setArmed] = useState(false);
  const o = idea;

  const text = (k: keyof Idea) => ({
    value: (o[k] ?? '') as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      s.patchIdea(o.id, { [k]: e.target.value } as Partial<Idea>, { debounce: true })
  });

  function copyBrief() {
    const open = o.tasks.filter(t => !t.done).map(t => `- ${t.title}`);
    const p = progress(o);
    const L = [
      `# ${o.title || 'untitled'}`, '',
      `**What it is:** ${o.type}${o.tool && o.tool !== '—' ? ` · built with ${o.tool}` : ''}`,
      `**Status:** ${statusLabel(o.status)}${p ? ` · ${p.done}/${p.total} tasks done` : ''} · last touched ${ago(o.touched_at)}`
    ];
    if (o.link) L.push(`**Link:** ${o.link}`);
    L.push('');
    if (o.why) L.push('## Why I started it', o.why, '');
    if (o.resume) L.push('## Where I stopped', o.resume, '');
    if (o.context) L.push('## Everything I know about it', o.context, '');
    if (open.length) L.push('## Still to do', open.join('\n'), '');
    L.push('## What I want from you now');
    L.push(o.next_action
      ? `Help me do this one thing: ${o.next_action}`
      : 'Help me pick the one smallest next step, then do it with me.');
    L.push('', 'Pick up from here. Ask me only what you cannot infer from the above.');
    navigator.clipboard?.writeText(L.join('\n')).then(
      () => s.say('Brief copied — paste it into a new chat'),
      () => s.say('Could not copy')
    );
  }

  return (
    <div className="detail">
      <div className="field">
        <label className="lbl">Next action</label>
        <input type="text" {...text('next_action')} placeholder="the smallest step you could take in 15 minutes" />
      </div>

      <div className="field">
        <label className="lbl">Where you stopped</label>
        <textarea {...text('resume')} rows={2} placeholder="last thing you did, the next decision, what was annoying you" />
      </div>

      <div style={{ marginTop: 14 }}>
        {o.tasks.map(t => <TaskLine key={t.id} task={t} />)}
        <AddTask ideaId={o.id} />
      </div>

      <details className="disc">
        <summary>Notes and details</summary>
        <div className="inner">
          <div className="field">
            <label className="lbl">Why this grabbed you</label>
            <textarea {...text('why')} rows={2} />
          </div>
          <div className="field">
            <label className="lbl">Everything else in your head</label>
            <textarea {...text('context')} rows={4} />
          </div>
          <div className="grid3">
            <div className="field">
              <label className="lbl">Type</label>
              <select value={o.type} onChange={e => s.patchIdea(o.id, { type: e.target.value })}>
                {TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="lbl">Built with</label>
              <select value={o.tool} onChange={e => s.patchIdea(o.id, { tool: e.target.value })}>
                {TOOLS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="lbl">Repo or link</label>
              <input type="text" {...text('link')} placeholder="url" />
            </div>
          </div>
          <label className="lbl">Portfolio slots</label>
          <div className="filters" style={{ marginTop: 6 }}>
            {SLOTS.map(sl => {
              const on = o.slots.includes(sl.k);
              return (
                <button
                  type="button"
                  key={sl.k}
                  className={`chip${on ? ' on' : ''}`}
                  onClick={() => s.patchIdea(o.id, {
                    slots: on ? o.slots.filter(x => x !== sl.k) : [...o.slots, sl.k]
                  })}
                >{sl.l}</button>
              );
            })}
          </div>
        </div>
      </details>

      <details className="disc">
        <summary>Priority ({score(o, s.weights)} of 100)</summary>
        <div className="inner">
          {SCORE_FIELDS.map(f => (
            <Range
              key={f.k}
              label={f.l}
              value={(o[f.k] as number) || 3}
              onChange={n => s.patchIdea(o.id, { [f.k]: n } as Partial<Idea>)}
            />
          ))}
          <p className="hint" style={{ marginTop: 8 }}>
            Portfolio value, how much you want to do it, who will see it, what you learn —
            all divided by effort.
          </p>
        </div>
      </details>

      <div className="btnrow" style={{ borderTop: '1px solid var(--line)', paddingTop: 13, marginTop: 14 }}>
        <select
          value={o.status}
          onChange={e => s.patchIdea(o.id, {
            status: e.target.value as Status,
            touched_at: new Date().toISOString()
          })}
          style={{ width: 'auto', fontSize: 12.5, padding: '6px 28px 6px 10px' }}
        >
          {STATUSES.map(st => <option key={st.k} value={st.k}>{st.l}</option>)}
        </select>
        <button className="btn go" onClick={() => s.touchIdea(o.id)}>Worked on it today</button>
        <button className="btn" onClick={copyBrief}>Copy brief for Claude</button>
        <button
          className="btn stopb"
          onClick={() => {
            if (!armed) { setArmed(true); s.say('Click delete again to confirm'); setTimeout(() => setArmed(false), 4000); return; }
            onClose();
            s.deleteIdea(o.id);
          }}
        >{armed ? 'Sure?' : 'Delete'}</button>
        <span className="pct" style={{ marginLeft: 'auto' }}>added {ago(o.created_at)}</span>
      </div>
    </div>
  );
}

/** A compact backlog line. Priority is a quiet number, not a badge. */
export function IdeaLine({
  idea, open, onToggle
}: { idea: Idea; open: boolean; onToggle: () => void }) {
  const { weights } = useStore();
  const cold = isStale(idea, weights);
  const bits = [
    statusLabel(idea.status),
    idea.type,
    ...(idea.slots.length ? [slotLabel(idea.slots[0])] : [])
  ];

  return (
    <>
      <div
        className={`il${open ? ' open' : ''}`}
        onClick={onToggle}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
        role="button"
        tabIndex={0}
        aria-expanded={open}
      >
        <div>
          <h4>{idea.title || 'untitled'}</h4>
          <div className="sub">
            {idea.next_action
              ? <>Next: {idea.next_action}</>
              : <span style={{ color: 'var(--warn)' }}>No next step yet</span>}
          </div>
          <div className="sub" style={{ color: 'var(--ink4)', marginTop: 3 }}>
            {bits.join(' · ')}
            {cold && <span style={{ color: 'var(--warn)' }}> · untouched {daysSince(idea.touched_at)} days</span>}
          </div>
        </div>
        <div className="rank">
          <div className="p">
            <b>{score(idea, weights)}</b>
            <span>priority</span>
          </div>
        </div>
      </div>
      {open && <IdeaDetail idea={idea} onClose={onToggle} />}
    </>
  );
}
