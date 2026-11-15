'use client';

import { useMemo, useState } from 'react';
import { useStore } from './store';
import { Chk, Empty, Panel, Prog, Range } from './ui';
import { IdeaList } from './idea';
import {
  DEFAULT_WEIGHTS, Idea, SLOTS, STATUSES, TOOLS, Weights, slotLabel, statusLabel
} from '@/lib/types';
import {
  ago, daysSince, effortBand, isDue, isLive, isStale, progress, score, scoreBand, unfinished
} from '@/lib/score';

type V = { openId: string | null; setOpenId: (id: string | null) => void; go: (v: string) => void };

/* ───────────────────────── Pick up ───────────────────────── */

export function PickUp({ openId, setOpenId, go }: V) {
  const s = useStore();
  const { ideas, people, looseTasks, weights } = s;
  const [draft, setDraft] = useState('');

  const liveIdeas = ideas.filter(isLive);
  const pick = useMemo(() => {
    const building = liveIdeas.filter(o => o.status === 'building' && o.next_action);
    const next = liveIdeas.filter(o => o.status === 'next');
    const pool = building.length ? building : next.length ? next : liveIdeas;
    return [...pool].sort((a, b) => score(b, weights) - score(a, weights))[0] ?? null;
  }, [ideas, weights]); // eslint-disable-line react-hooks/exhaustive-deps

  const ordered = useMemo(() => {
    const rank: Record<string, number> = { building: 0, next: 1, idea: 2 };
    return [...liveIdeas].sort((a, b) =>
      rank[a.status] !== rank[b.status]
        ? rank[a.status] - rank[b.status]
        : score(b, weights) - score(a, weights));
  }, [ideas, weights]); // eslint-disable-line react-hooks/exhaustive-deps

  const cold = liveIdeas.filter(o => isStale(o, weights))
    .sort((a, b) => (daysSince(b.touched_at) ?? 0) - (daysSince(a.touched_at) ?? 0));

  const duePeople = [
    ...people.filter(isDue),
    ...people.filter(p => !p.next_touch && p.warmth === 'cold')
  ].filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i).slice(0, 6);

  const openTasks = [
    ...looseTasks.filter(t => !t.done).map(t => ({ t, from: null as string | null })),
    ...ideas.filter(o => o.status === 'building' || o.status === 'next')
      .flatMap(o => o.tasks.filter(t => !t.done).map(t => ({ t, from: o.title })))
  ].slice(0, 14);

  return (
    <>
      {pick ? (
        <div className="nowbar">
          <div>
            <span className="lbl">Next 15 minutes</span>
            <div className="t">{pick.title}</div>
            <div className="act">
              {pick.next_action
                ? <><b>→</b> {pick.next_action}</>
                : <span style={{ color: 'var(--warn)' }}>no next action set — open it and write one</span>}
            </div>
            {(pick.resume || pick.why || pick.context) && (
              <div className="ctx">{(pick.resume || pick.why || pick.context).slice(0, 420)}</div>
            )}
          </div>
          <div className="side">
            <button className="btn go" onClick={() => s.touchIdea(pick.id)}>Done — mark touched</button>
            <button className="btn" onClick={() => { go('board'); setOpenId(pick.id); }}>Open it</button>
          </div>
        </div>
      ) : (
        <Empty title="Nothing live yet">Drop your first idea on the Capture tab.</Empty>
      )}

      <div className="split">
        <div>
          <Panel label="Open loops — touch one, move it" right={<span className="lbl">{ordered.length} live</span>}>
            <IdeaList
              items={ordered.slice(0, 10)}
              openId={openId}
              setOpenId={setOpenId}
              showNext
              empty={<Empty title="Capture something first" />}
            />
          </Panel>

          <Panel label="Open tasks — everything, everywhere">
            {openTasks.length ? openTasks.map(({ t, from }) => (
              <div className="task" key={t.id}>
                <Chk on={t.done} label="Mark done" onClick={() => s.patchTask(t.id, { done: true })} />
                <input
                  type="text"
                  value={t.title}
                  onChange={e => s.patchTask(t.id, { title: e.target.value }, { debounce: true })}
                />
                {from && <span className="src">{from}</span>}
                <button className="btn sm" onClick={() => s.deleteTask(t.id)} aria-label="Remove task">×</button>
              </div>
            )) : <div className="note">No open tasks. Add one below or inside a project.</div>}
            <div className="btnrow" style={{ marginTop: 10 }}>
              <input
                type="text"
                value={draft}
                placeholder="add a standalone task, press enter"
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && draft.trim()) {
                    s.addTask(null, draft.trim());
                    setDraft('');
                  }
                }}
                style={{ flex: 1, minWidth: 160 }}
              />
              <button
                className="btn"
                disabled={!draft.trim()}
                onClick={() => { s.addTask(null, draft.trim()); setDraft(''); }}
              >add</button>
            </div>
          </Panel>
        </div>

        <div>
          <Panel label="Going cold">
            {cold.length ? cold.map(o => (
              <div key={o.id} style={{ padding: '8px 0', borderBottom: '1px dashed var(--line)' }}>
                <b style={{ fontSize: 13.5, fontWeight: 500 }}>{o.title}</b>
                <div className="note" style={{ margin: '3px 0 7px' }}>untouched {daysSince(o.touched_at)} days</div>
                <div className="btnrow">
                  <button className="btn sm go" onClick={() => s.touchIdea(o.id)}>revive</button>
                  <button className="btn sm warnb" onClick={() => s.patchIdea(o.id, { status: 'parked' })}>park</button>
                  <button className="btn sm" onClick={() => { go('board'); setOpenId(o.id); }}>open</button>
                </div>
              </div>
            )) : <div className="note">Nothing cold. Good.</div>}
          </Panel>

          <Panel label="People to ping">
            {duePeople.length ? duePeople.map(p => (
              <div key={p.id} style={{ padding: '8px 0', borderBottom: '1px dashed var(--line)' }}>
                <b style={{ fontSize: 13.5, fontWeight: 500 }}>{p.name}</b>
                <div className="note" style={{ margin: '3px 0 6px' }}>
                  {[p.role, p.org].filter(Boolean).join(' · ')}
                  {p.ask && <><br />ask: {p.ask}</>}
                </div>
                <div className="btnrow">
                  <button className="btn sm go" onClick={() => {
                    const d = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
                    s.patchPerson(p.id, {
                      last_contact: new Date().toISOString(),
                      warmth: p.warmth === 'cold' ? 'sent' : p.warmth,
                      next_touch: d
                    });
                    s.say('Logged — follow up set for 5 days');
                  }}>messaged</button>
                  {p.link && <a className="btn sm" href={p.link} target="_blank" rel="noopener noreferrer">profile</a>}
                </div>
              </div>
            )) : <div className="note">Nobody due. Add three people this week on the Network tab.</div>}
          </Panel>

          <Panel label="How to use this">
            <div className="note">
              <b>The rule that fixes lost ideas:</b> an idea is only captured when it has a{' '}
              <b>spark</b> (why it grabbed you) and a <b>15-minute next action</b>. Title alone is how notes die.
              <br /><br />
              <b>When you sit down cold:</b> start on this tab. Read the resume note, do the one action,
              hit touched. That is a session.
              <br /><br />
              <b>Weekly:</b> the Review tab. Kill or park without guilt — a short live list beats a long dead one.
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

/* ───────────────────────── Priority ───────────────────────── */

export function Priority({ openId, setOpenId }: V) {
  const { ideas, weights, setWeights } = useStore();
  const [hideBuilding, setHideBuilding] = useState(false);

  const rows = useMemo(() => ideas
    .filter(isLive)
    .filter(o => (hideBuilding ? o.status !== 'building' : true))
    .sort((a, b) => score(b, weights) - score(a, weights)),
    [ideas, weights, hideBuilding]);

  const W: { k: keyof Weights; l: string }[] = [
    { k: 'wP', l: 'Portfolio' }, { k: 'wE', l: 'Pull' }, { k: 'wR', l: 'Reach' },
    { k: 'wL', l: 'Learning' }, { k: 'wEff', l: 'Effort penalty' }
  ];

  return (
    <>
      <Panel
        label="Scoring weights — tune what “important” means to you right now"
        right={<button className="btn sm" onClick={() => setWeights({ ...DEFAULT_WEIGHTS })}>Reset</button>}
      >
        <div className="grid2">
          <div>
            {W.map(f => (
              <Range
                key={f.k}
                label={f.l}
                value={weights[f.k]}
                min={0} max={2} step={0.1}
                fmt={n => n.toFixed(1)}
                onChange={n => setWeights({ ...weights, [f.k]: n })}
              />
            ))}
            <Range
              label="Cold after"
              value={weights.staleDays}
              min={5} max={45} step={1}
              fmt={n => `${n}d`}
              onChange={n => setWeights({ ...weights, staleDays: n })}
            />
          </div>
          <div className="note">
            <b>score = (portfolio×w + pull×w + reach×w + learning×w) ÷ effort^w</b>, scaled to 100.
            <div className="callout">
              <b>Portfolio</b> — does shipping this make your case-study shelf stronger?<br />
              <b>Pull</b> — will you actually want to open it on a Tuesday night?<br />
              <b>Reach</b> — will anyone outside your laptop see it?<br />
              <b>Learning</b> — do you come out able to do something new?<br />
              <b>Effort</b> — 1 is an evening, 5 is a month of weekends.
            </div>
            Push <b>pull</b> up when you are stalling and nothing gets finished. Push <b>reach</b> up
            in placement season. Push the effort penalty up when you have no time.
          </div>
        </div>
      </Panel>

      <div className="panel-h" style={{ paddingLeft: 0, paddingRight: 0, border: 0 }}>
        <span className="lbl">Ranked — live ideas only</span>
        <button
          className={`chip${hideBuilding ? ' on' : ''}`}
          onClick={() => setHideBuilding(v => !v)}
        >hide what is already building</button>
      </div>
      <IdeaList items={rows} openId={openId} setOpenId={setOpenId} showNext />
    </>
  );
}

/* ───────────────────────── Board ───────────────────────── */

const GROUPS = [
  ['status', 'status'], ['type', 'type'], ['effort', 'effort band'],
  ['slot', 'portfolio slot'], ['tool', 'built with'], ['band', 'score band'], ['none', 'nothing']
];
const SORTS = [
  ['score', 'score'], ['touched', 'last touched'], ['stale', 'most stale'],
  ['effort', 'least effort'], ['excite', 'most pull'], ['created', 'newest'], ['title', 'a–z']
];

export function Board({ openId, setOpenId }: V) {
  const { ideas, weights } = useStore();
  const [q, setQ] = useState('');
  const [group, setGroup] = useState('status');
  const [sort, setSort] = useState('score');
  const [slot, setSlot] = useState('');
  const [tool, setTool] = useState('');
  const [staleOnly, setStaleOnly] = useState(false);
  const [show, setShow] = useState<Record<string, boolean>>({
    idea: true, next: true, building: true, shipped: false, parked: false, killed: false
  });

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = ideas.filter(o => {
      if (!show[o.status]) return false;
      if (slot && !o.slots.includes(slot)) return false;
      if (tool && o.tool !== tool) return false;
      if (staleOnly && !isStale(o, weights)) return false;
      if (needle) {
        const blob = [o.title, o.why, o.context, o.next_action, o.resume, o.type, o.slots.join(' ')]
          .join(' ').toLowerCase();
        if (!blob.includes(needle)) return false;
      }
      return true;
    });

    const sorters: Record<string, (a: Idea, b: Idea) => number> = {
      score: (a, b) => score(b, weights) - score(a, weights),
      touched: (a, b) => +new Date(b.touched_at) - +new Date(a.touched_at),
      stale: (a, b) => +new Date(a.touched_at) - +new Date(b.touched_at),
      effort: (a, b) => a.effort - b.effort,
      excite: (a, b) => b.excite - a.excite,
      created: (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
      title: (a, b) => a.title.localeCompare(b.title)
    };
    return [...filtered].sort(sorters[sort] ?? sorters.score);
  }, [ideas, q, show, slot, tool, staleOnly, sort, weights]);

  const buckets = useMemo(() => {
    const keyOf: Record<string, (o: Idea) => string> = {
      status: o => statusLabel(o.status),
      type: o => o.type,
      effort: effortBand,
      tool: o => o.tool || '—',
      band: o => scoreBand(o, weights),
      slot: o => (o.slots.length ? slotLabel(o.slots[0]) : 'unslotted'),
      none: () => ''
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
    if (group === 'status') {
      const seq: string[] = STATUSES.map(s => String(s.l));
      order.sort((a, b) => seq.indexOf(a) - seq.indexOf(b));
    }
    return order.map(k => ({ k, items: map.get(k)! }));
  }, [rows, group, weights]);

  return (
    <>
      <div className="panel">
        <div className="panel-b">
          <div className="filters" style={{ marginBottom: 11 }}>
            <div className="search">
              <input
                id="board-search"
                type="text"
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="search title, spark, dump, tags"
              />
            </div>
            <div className="selwrap">
              <span className="lbl">group</span>
              <select value={group} onChange={e => setGroup(e.target.value)}>
                {GROUPS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="selwrap">
              <span className="lbl">sort</span>
              <select value={sort} onChange={e => setSort(e.target.value)}>
                {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="filters">
            <span className="lbl" style={{ marginRight: 3 }}>show</span>
            {STATUSES.map(st => (
              <button
                key={st.k}
                className={`chip${show[st.k] ? ' on' : ''}`}
                onClick={() => setShow(p => ({ ...p, [st.k]: !p[st.k] }))}
              >{st.l}</button>
            ))}
          </div>
          <div className="filters" style={{ marginTop: 9 }}>
            <div className="selwrap">
              <span className="lbl">slot</span>
              <select value={slot} onChange={e => setSlot(e.target.value)}>
                <option value="">any</option>
                {SLOTS.map(s => <option key={s.k} value={s.k}>{s.l}</option>)}
              </select>
            </div>
            <div className="selwrap">
              <span className="lbl">tool</span>
              <select value={tool} onChange={e => setTool(e.target.value)}>
                <option value="">any</option>
                {TOOLS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <button className={`chip${staleOnly ? ' on' : ''}`} onClick={() => setStaleOnly(v => !v)}>cold only</button>
          </div>
        </div>
      </div>

      {!rows.length && <Empty title="No matches">Loosen the filters.</Empty>}
      {buckets.map(b => (
        <div className="group" key={b.k || 'all'}>
          {b.k && (
            <div className="group-h"><b>{b.k}</b><span className="n">{b.items.length}</span></div>
          )}
          <IdeaList items={b.items} openId={openId} setOpenId={setOpenId} showNext={group !== 'none'} />
        </div>
      ))}
    </>
  );
}

/* ───────────────────────── In flight ───────────────────────── */

export function Flight({ setOpenId, go }: V) {
  const s = useStore();
  const building = s.ideas.filter(o => o.status === 'building')
    .sort((a, b) => +new Date(b.touched_at) - +new Date(a.touched_at));
  const shipped = s.ideas.filter(o => o.status === 'shipped')
    .sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at));

  return (
    <>
      <Panel
        label="Work in progress — tasks, progress, resume notes"
        right={<span className="lbl">{building.length} in flight{building.length > 4 ? ' — too many' : ''}</span>}
      >
        <div className="note">
          Keep this under <b>four</b> live builds. Everything past four is parked, not in flight —
          that is how five half-finished things happen.
        </div>
      </Panel>

      {building.length ? building.map(o => {
        const p = progress(o);
        return (
          <div className="panel" key={o.id}>
            <div className="panel-h">
              <div>
                <b style={{ fontSize: 15 }}>{o.title}</b>
                <div className="meta" style={{ display: 'flex', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
                  <span className={`pill dot s-${o.status}`}>{statusLabel(o.status)}</span>
                  <span className="tag">{o.tool}</span>
                  {isStale(o, s.weights) && <span className="pill stale">cold {daysSince(o.touched_at)}d</span>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                {p
                  ? <><div className="prog" style={{ width: 110 }}><i style={{ width: `${p.pct}%` }} /></div><span className="pct">{p.done}/{p.total}</span></>
                  : <span className="pct">no tasks yet</span>}
                <button className="btn sm go" onClick={() => s.touchIdea(o.id)}>touched</button>
                <button className="btn sm" onClick={() => { go('board'); setOpenId(o.id); }}>edit</button>
              </div>
            </div>
            <div className="panel-b grid2">
              <div>
                <div className="field">
                  <label className="lbl">Next action</label>
                  <input
                    type="text"
                    value={o.next_action}
                    placeholder="15-minute step"
                    onChange={e => s.patchIdea(o.id, { next_action: e.target.value }, { debounce: true })}
                  />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label className="lbl">Resume note — read this when you sit down</label>
                  <textarea
                    rows={3}
                    value={o.resume}
                    onChange={e => s.patchIdea(o.id, { resume: e.target.value }, { debounce: true })}
                  />
                </div>
              </div>
              <div>
                <FlightTasks ideaId={o.id} />
                <div className="btnrow" style={{ marginTop: 8 }}>
                  <button className="btn sm go" onClick={() => s.patchIdea(o.id, { status: 'shipped' })}>shipped</button>
                  {o.link && <a className="btn sm" href={o.link} target="_blank" rel="noopener noreferrer">open link</a>}
                </div>
              </div>
            </div>
          </div>
        );
      }) : (
        <Empty title="Nothing in flight">Move your top-scoring idea to building on the Priority tab.</Empty>
      )}

      <Panel label="Shipped shelf — this is your portfolio, already written">
        {shipped.length ? shipped.map(o => (
          <div
            key={o.id}
            style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', padding: '9px 0', borderBottom: '1px dashed var(--line)' }}
          >
            <div>
              <b style={{ fontSize: 13.5, fontWeight: 500 }}>{o.title}</b>
              <div className="meta" style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                <span className="tag">{o.type}</span>
                {o.slots.map(x => <span className="tag" key={x}>{slotLabel(x)}</span>)}
              </div>
            </div>
            <div className="btnrow">
              {o.link && <a className="btn sm" href={o.link} target="_blank" rel="noopener noreferrer">open</a>}
              <button className="btn sm" onClick={() => { go('board'); setOpenId(o.id); }}>edit</button>
            </div>
          </div>
        )) : (
          <div className="note">
            Empty for now. Everything you ship lands here with its link — that is the list you paste
            into applications.
          </div>
        )}
      </Panel>
    </>
  );
}

function FlightTasks({ ideaId }: { ideaId: string }) {
  const s = useStore();
  const idea = s.ideas.find(o => o.id === ideaId);
  const [draft, setDraft] = useState('');
  if (!idea) return null;

  return (
    <div>
      <label className="lbl">Tasks</label>
      <div style={{ marginTop: 5 }}>
        {idea.tasks.map(t => (
          <div className={`task${t.done ? ' done' : ''}`} key={t.id}>
            <Chk
              on={t.done}
              label="Toggle task"
              onClick={() => { s.patchTask(t.id, { done: !t.done }); if (!t.done) s.touchIdea(idea.id); }}
            />
            <input
              type="text"
              value={t.title}
              onChange={e => s.patchTask(t.id, { title: e.target.value }, { debounce: true })}
            />
            <button className="btn sm" onClick={() => s.deleteTask(t.id)} aria-label="Remove task">×</button>
          </div>
        ))}
      </div>
      <div className="btnrow" style={{ marginTop: 8 }}>
        <input
          type="text"
          value={draft}
          placeholder="add a task, press enter"
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && draft.trim()) { s.addTask(idea.id, draft.trim()); setDraft(''); }
          }}
          style={{ flex: 1, minWidth: 140, fontSize: 13 }}
        />
        <button className="btn sm" disabled={!draft.trim()} onClick={() => { s.addTask(idea.id, draft.trim()); setDraft(''); }}>add</button>
      </div>
    </div>
  );
}

/* ───────────────────────── Review ───────────────────────── */

export function Review({ setOpenId, go }: V) {
  const s = useStore();
  const { ideas, people, weights } = s;
  const liveIdeas = ideas.filter(isLive);

  const kpis: [string, number][] = [
    ['live', liveIdeas.length],
    ['building', ideas.filter(o => o.status === 'building').length],
    ['shipped', ideas.filter(o => o.status === 'shipped').length],
    ['cold', liveIdeas.filter(o => isStale(o, weights)).length],
    ['unfinished captures', liveIdeas.filter(unfinished).length],
    ['open tasks', ideas.reduce((n, o) => n + o.tasks.filter(t => !t.done).length, 0) + s.looseTasks.filter(t => !t.done).length],
    ['contacts', people.filter(p => p.warmth === 'warm' || p.warmth === 'talking').length]
  ];

  const unf = liveIdeas.filter(unfinished);
  const cold = liveIdeas.filter(o => isStale(o, weights));
  const old = liveIdeas.filter(o => (daysSince(o.created_at) ?? 0) > 60 && o.status === 'idea');

  const block = (title: string, arr: Idea[], acts: (o: Idea) => React.ReactNode) =>
    arr.length ? (
      <div style={{ marginBottom: 15 }} key={title}>
        <div className="group-h"><b>{title}</b><span className="n">{arr.length}</span></div>
        {arr.slice(0, 12).map(o => (
          <div
            key={o.id}
            style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', padding: '7px 0', borderBottom: '1px dashed var(--line)' }}
          >
            <span style={{ fontSize: 13.5 }}>{o.title}</span>
            <div className="btnrow">{acts(o)}</div>
          </div>
        ))}
      </div>
    ) : null;

  return (
    <>
      <Panel label="State of play">
        <div className="kpis">
          {kpis.map(([l, n]) => (
            <div className="kpi" key={l}>
              <b style={{ color: l === 'cold' && n ? 'var(--warn)' : 'var(--ink)' }}>{n}</b>
              <span>{l}</span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel label="Portfolio gap map — where the shelf is thin">
        <div className="slots">
          {SLOTS.map(sl => {
            const m = ideas.filter(o => o.slots.includes(sl.k));
            const ship = m.filter(o => o.status === 'shipped').length;
            const bld = m.filter(o => o.status === 'building').length;
            return (
              <div className={`slot${ship ? '' : ' empty'}`} key={sl.k}>
                <b>{sl.l}</b>
                <div className="bars">
                  {[0, 1, 2, 3, 4].map(i => (
                    <i key={i} className={i < ship ? 'ship' : i < ship + bld ? 'build' : ''} />
                  ))}
                </div>
                <small>{ship} shipped · {bld} building · {m.length} total</small>
              </div>
            );
          })}
        </div>
        <p className="note" style={{ margin: '12px 0 0' }}>
          Dashed = nothing shipped there yet. When two ideas score close, <b>build the one that
          fills a gap</b> — a third fintech case study adds less than a first AI one.
        </p>
      </Panel>

      <div className="split">
        <Panel label="Weekly sweep — decide, do not re-read">
          {(unf.length || cold.length || old.length) ? (
            <>
              {block('Finish the capture', unf, o => (
                <button className="btn sm go" onClick={() => { go('board'); setOpenId(o.id); }}>open</button>
              ))}
              {block('Cold — revive, park or kill', cold, o => (
                <>
                  <button className="btn sm go" onClick={() => s.touchIdea(o.id)}>revive</button>
                  <button className="btn sm warnb" onClick={() => s.patchIdea(o.id, { status: 'parked' })}>park</button>
                  <button className="btn sm stopb" onClick={() => s.patchIdea(o.id, { status: 'killed' })}>kill</button>
                </>
              ))}
              {block('Sat as an idea for 60+ days', old, o => (
                <>
                  <button className="btn sm go" onClick={() => s.patchIdea(o.id, { status: 'building', touched_at: new Date().toISOString() })}>start it</button>
                  <button className="btn sm stopb" onClick={() => s.patchIdea(o.id, { status: 'killed' })}>kill it</button>
                </>
              ))}
            </>
          ) : (
            <div className="note">
              Nothing to sweep. Every live idea has a spark, a next action and a recent touch.
            </div>
          )}
        </Panel>

        <div>
          <Panel label="Data">
            <p className="note" style={{ marginTop: 0 }}>
              Everything lives in your Supabase project, so Claude can read and write it from chat.
              Tell Claude an idea and it is on the board before you open the site.
            </p>
            <div className="btnrow">
              <button className="btn" onClick={() => {
                const text = JSON.stringify({ ideas: s.ideas, people: s.people, weights }, null, 2);
                navigator.clipboard?.writeText(text).then(
                  () => s.say('Copied as JSON'), () => s.say('Could not copy'));
              }}>Copy JSON</button>
              <button className="btn" onClick={() => s.reload()}>Refresh from database</button>
              <button className="btn stopb" onClick={async () => {
                await fetch('/api/auth', { method: 'DELETE' });
                window.location.href = '/unlock';
              }}>Lock</button>
            </div>
          </Panel>
          <Panel label="Shortcuts">
            <div className="note">
              <span className="kbd">n</span> new idea &nbsp; <span className="kbd">/</span> search &nbsp;
              <span className="kbd">1</span>–<span className="kbd">7</span> tabs &nbsp;
              <span className="kbd">esc</span> close
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
