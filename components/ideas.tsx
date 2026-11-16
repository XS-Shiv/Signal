'use client';

import { useMemo, useState } from 'react';
import { useStore } from './store';
import { IdeaLine } from './idea';
import { Idea, SLOTS, STATUSES, Status, slotLabel, statusLabel } from '@/lib/types';
import { effortBand, isLive, isStale, score, unfinished } from '@/lib/score';

type V = { openId: string | null; setOpenId: (id: string | null) => void };

const GROUPS: [string, string][] = [
  ['none', 'no grouping'], ['status', 'status'], ['type', 'type'],
  ['effort', 'effort'], ['slot', 'portfolio slot']
];
const SORTS: [string, string][] = [
  ['score', 'priority'], ['touched', 'recently worked on'], ['stale', 'longest untouched'],
  ['effort', 'quickest first'], ['created', 'newest']
];

export function Ideas({ openId, setOpenId }: V) {
  const s = useStore();
  const [title, setTitle] = useState('');
  const [why, setWhy] = useState('');
  const [next, setNext] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);

  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'live' | 'all' | Status>('live');
  const [group, setGroup] = useState('none');
  const [sort, setSort] = useState('score');

  async function capture() {
    const t = title.trim();
    if (!t) return;
    setBusy(true);
    const made = await s.createIdea({ title: t, why: why.trim(), next_action: next.trim() });
    setBusy(false);
    if (made) {
      setTitle(''); setWhy(''); setNext(''); setExpanded(false);
      s.say(next.trim() ? 'Captured, with a next step' : 'Captured — add a next step when you can');
    }
  }

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = s.ideas.filter(o => {
      if (tab === 'live' && !isLive(o)) return false;
      if (tab !== 'live' && tab !== 'all' && o.status !== tab) return false;
      if (needle) {
        const blob = [o.title, o.why, o.context, o.next_action, o.resume, o.type].join(' ').toLowerCase();
        if (!blob.includes(needle)) return false;
      }
      return true;
    });
    const sorters: Record<string, (a: Idea, b: Idea) => number> = {
      score: (a, b) => score(b, s.weights) - score(a, s.weights),
      touched: (a, b) => +new Date(b.touched_at) - +new Date(a.touched_at),
      stale: (a, b) => +new Date(a.touched_at) - +new Date(b.touched_at),
      effort: (a, b) => a.effort - b.effort,
      created: (a, b) => +new Date(b.created_at) - +new Date(a.created_at)
    };
    return [...filtered].sort(sorters[sort] ?? sorters.score);
  }, [s.ideas, s.weights, q, tab, sort]);

  const buckets = useMemo(() => {
    if (group === 'none') return [{ k: '', items: rows }];
    const keyOf: Record<string, (o: Idea) => string> = {
      status: o => statusLabel(o.status),
      type: o => o.type,
      effort: effortBand,
      slot: o => (o.slots.length ? slotLabel(o.slots[0]) : 'no slot')
    };
    const fn = keyOf[group] ?? keyOf.status;
    const order: string[] = [];
    const map = new Map<string, Idea[]>();
    for (const o of rows) {
      const k = fn(o);
      const arr = map.get(k);
      if (arr) arr.push(o);
      else { map.set(k, [o]); order.push(k); }
    }
    return order.map(k => ({ k, items: map.get(k)! }));
  }, [rows, group]);

  const needsStep = s.ideas.filter(o => isLive(o) && unfinished(o)).length;

  return (
    <>
      <div className="pagehead">
        <h2>Ideas</h2>
        <p>Everything you have thought of, ranked by what is worth doing next.</p>
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-b">
          <div className="addbar" style={{ marginBottom: expanded ? 14 : 0, border: 0, padding: 0, background: 'none' }}>
            <input
              id="capture-title"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onFocus={() => setExpanded(true)}
              onKeyDown={e => { if (e.key === 'Enter' && !expanded) capture(); }}
              placeholder="What is the idea?"
              autoComplete="off"
            />
            {!expanded && (
              <button className="btn go" onClick={capture} disabled={busy || !title.trim()}>Add</button>
            )}
          </div>

          {expanded && (
            <>
              <div className="field">
                <label className="lbl">Why it grabbed you</label>
                <input
                  type="text"
                  value={why}
                  onChange={e => setWhy(e.target.value)}
                  placeholder="the annoyance, the gap, the thing you noticed"
                />
              </div>
              <div className="field">
                <label className="lbl">First small step</label>
                <input
                  type="text"
                  value={next}
                  onChange={e => setNext(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') capture(); }}
                  placeholder="something you could do in 15 minutes"
                />
                <div className="hint">
                  These two are what stop an idea going cold. You can skip them and fill them in later.
                </div>
              </div>
              <div className="btnrow">
                <button className="btn go" onClick={capture} disabled={busy || !title.trim()}>
                  {busy ? 'Saving…' : 'Capture'}
                </button>
                <button className="btn" onClick={() => { setExpanded(false); setWhy(''); setNext(''); }}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="filters" style={{ marginBottom: 12 }}>
        <button className={`chip${tab === 'live' ? ' on' : ''}`} onClick={() => setTab('live')}>Active</button>
        {STATUSES.map(st => (
          <button
            key={st.k}
            className={`chip${tab === st.k ? ' on' : ''}`}
            onClick={() => setTab(st.k as Status)}
          >{st.l}</button>
        ))}
        <button className={`chip${tab === 'all' ? ' on' : ''}`} onClick={() => setTab('all')}>Everything</button>
      </div>

      <div className="filters" style={{ marginBottom: 16 }}>
        <div className="search">
          <input
            id="board-search"
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="search"
          />
        </div>
        <div className="selwrap">
          <span className="lbl">sort</span>
          <select value={sort} onChange={e => setSort(e.target.value)}>
            {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="selwrap">
          <span className="lbl">group</span>
          <select value={group} onChange={e => setGroup(e.target.value)}>
            {GROUPS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>

      {!!needsStep && tab === 'live' && (
        <p className="hint" style={{ marginBottom: 12 }}>
          {needsStep} {needsStep === 1 ? 'idea has' : 'ideas have'} no next step yet — those are the
          ones that quietly die.
        </p>
      )}

      {!rows.length && <div className="quiet"><b>Nothing here</b>Try a different filter.</div>}

      {buckets.map(b => (
        <div key={b.k || 'all'} style={{ marginBottom: b.k ? 18 : 0 }}>
          {b.k && (
            <div className="sect" style={{ marginTop: 14 }}>
              <h3 style={{ fontSize: 13.5, color: 'var(--ink2)' }}>{b.k}</h3>
              <span className="c">{b.items.length}</span>
            </div>
          )}
          {b.items.map(o => (
            <IdeaLine
              key={o.id}
              idea={o}
              open={openId === o.id}
              onToggle={() => setOpenId(openId === o.id ? null : o.id)}
            />
          ))}
        </div>
      ))}
    </>
  );
}
