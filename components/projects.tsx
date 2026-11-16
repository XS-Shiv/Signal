'use client';

import { useMemo, useState } from 'react';
import { useStore } from './store';
import { TaskLine, AddTask } from './tasks';
import { Idea, Status, slotLabel, statusLabel } from '@/lib/types';
import { ago, daysSince, isLive, isStale, progress, score } from '@/lib/score';

type Nav = { setOpenId: (id: string | null) => void; go: (v: string) => void };

/** The one thing to do next, picked from whatever is live and has a next step. */
function UpNext({ go, setOpenId }: Nav) {
  const s = useStore();
  const pick = useMemo(() => {
    const live = s.ideas.filter(isLive);
    const building = live.filter(o => o.status === 'building' && o.next_action);
    const next = live.filter(o => o.status === 'next' && o.next_action);
    const pool = building.length ? building : next.length ? next : live;
    return [...pool].sort((a, b) => score(b, s.weights) - score(a, s.weights))[0] ?? null;
  }, [s.ideas, s.weights]);

  if (!pick) return null;
  const where = pick.resume || pick.why;

  return (
    <div className="upnext">
      <div className="eyebrow">Start here</div>
      <h3>{pick.title}</h3>
      <div className="what">
        {pick.next_action || <span style={{ color: 'var(--warn)' }}>No next step written — open it and add one.</span>}
      </div>
      {where && <div className="where">{where.slice(0, 320)}</div>}
      <div className="acts">
        <button className="btn go" onClick={() => s.touchIdea(pick.id)}>Did it</button>
        <button className="btn" onClick={() => { go('ideas'); setOpenId(pick.id); }}>Open project</button>
      </div>
    </div>
  );
}

function ProjectCard({ idea, go, setOpenId }: { idea: Idea } & Nav) {
  const s = useStore();
  const p = progress(idea);
  const cold = isStale(idea, s.weights);
  const open = idea.tasks.filter(t => !t.done);
  const done = idea.tasks.filter(t => t.done);
  const [showDone, setShowDone] = useState(false);

  return (
    <div className={`pj${cold ? ' cold' : ''}`}>
      <div className="pj-top">
        <div className="pj-title">
          <h4>{idea.title}</h4>
          <span className={`pill dot s-${idea.status}`}>{statusLabel(idea.status)}</span>
        </div>

        {p && (
          <div className="pj-bar">
            <div className="track"><i style={{ width: `${p.pct}%` }} /></div>
            <span className="count">{p.done} of {p.total}</span>
          </div>
        )}

        <div className="pj-next">
          <span className="k">Next</span>
          <input
            type="text"
            value={idea.next_action}
            placeholder="what is the next small step?"
            onChange={e => s.patchIdea(idea.id, { next_action: e.target.value }, { debounce: true })}
          />
        </div>
      </div>

      <div className="pj-body">
        <div style={{ marginTop: 10 }}>
          {open.map(t => <TaskLine key={t.id} task={t} />)}
          {showDone && done.map(t => <TaskLine key={t.id} task={t} />)}
          {!open.length && !showDone && (
            <p className="hint" style={{ margin: '6px 0 0' }}>
              {done.length ? 'All tasks done.' : 'No tasks yet — break it into a few small ones.'}
            </p>
          )}
        </div>
        <AddTask ideaId={idea.id} />
        {!!done.length && (
          <button
            className="btn sm"
            style={{ marginTop: 8 }}
            onClick={() => setShowDone(v => !v)}
          >{showDone ? 'Hide' : `Show ${done.length} done`}</button>
        )}
      </div>

      <div className="pj-foot">
        <span className={`when${cold ? ' warn' : ''}`}>
          {cold ? `untouched ${daysSince(idea.touched_at)} days` : `worked on ${ago(idea.touched_at)}`}
        </span>
        <div className="btnrow">
          <button className="btn sm go" onClick={() => s.touchIdea(idea.id)}>Worked on it</button>
          {idea.link && <a className="btn sm" href={idea.link} target="_blank" rel="noopener noreferrer">Open</a>}
          <button className="btn sm" onClick={() => { go('ideas'); setOpenId(idea.id); }}>Edit</button>
          <button className="btn sm" onClick={() => s.patchIdea(idea.id, { status: 'shipped' })}>Done</button>
        </div>
      </div>
    </div>
  );
}

export function Projects({ setOpenId, go }: Nav) {
  const s = useStore();
  const [draft, setDraft] = useState('');

  const building = s.ideas.filter(o => o.status === 'building')
    .sort((a, b) => +new Date(b.touched_at) - +new Date(a.touched_at));
  const queued = s.ideas.filter(o => o.status === 'next')
    .sort((a, b) => score(b, s.weights) - score(a, s.weights));
  const shipped = s.ideas.filter(o => o.status === 'shipped')
    .sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at));
  const loose = s.looseTasks.filter(t => !t.done);

  async function addProject() {
    const t = draft.trim();
    if (!t) return;
    setDraft('');
    const made = await s.createIdea({ title: t, status: 'building' });
    if (made) s.say('Project added');
  }

  return (
    <>
      <div className="pagehead">
        <h2>Projects</h2>
        <p>What you are building, and the next step on each.</p>
      </div>

      <div className="addbar">
        <input
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addProject(); }}
          placeholder="Start a new project…"
        />
        <button className="btn go" onClick={addProject} disabled={!draft.trim()}>Add</button>
      </div>

      <UpNext go={go} setOpenId={setOpenId} />

      <div className="sect">
        <h3>In progress</h3>
        <span className="c">{building.length}{building.length > 4 ? ' — more than four is a lot' : ''}</span>
      </div>
      {building.length
        ? building.map(o => <ProjectCard key={o.id} idea={o} go={go} setOpenId={setOpenId} />)
        : (
          <div className="quiet">
            <b>Nothing in progress</b>
            Add one above, or promote an idea from the Ideas tab.
          </div>
        )}

      {!!queued.length && (
        <>
          <div className="sect"><h3>Up next</h3><span className="c">{queued.length}</span></div>
          {queued.map(o => (
            <div className="pj" key={o.id}>
              <div className="pj-top" style={{ paddingBottom: 14 }}>
                <div className="pj-title">
                  <h4>{o.title}</h4>
                  <div className="btnrow">
                    <button className="btn sm go" onClick={() => s.patchIdea(o.id, { status: 'building', touched_at: new Date().toISOString() })}>Start</button>
                    <button className="btn sm" onClick={() => { go('ideas'); setOpenId(o.id); }}>Edit</button>
                  </div>
                </div>
                {o.next_action && <div className="sub" style={{ marginTop: 7, fontSize: 13, color: 'var(--ink3)' }}>Next: {o.next_action}</div>}
              </div>
            </div>
          ))}
        </>
      )}

      <div className="sect">
        <h3>Loose tasks</h3>
        <span className="c">{loose.length}</span>
      </div>
      <div className="panel">
        <div className="panel-b">
          {loose.length
            ? loose.map(t => <TaskLine key={t.id} task={t} />)
            : <p className="hint" style={{ margin: 0 }}>Anything that is not part of a project goes here.</p>}
          <AddTask ideaId={null} placeholder="Add a one-off task…" />
        </div>
      </div>

      <div className="sect">
        <h3>Finished</h3>
        <span className="c">{shipped.length}</span>
      </div>
      <div className="panel">
        <div className="panel-b">
          {shipped.length ? shipped.map(o => (
            <div className="ship" key={o.id}>
              <div>
                <h4>{o.title}</h4>
                <div className="m">{[o.type, ...o.slots.map(slotLabel)].join(' · ')}</div>
              </div>
              <div className="btnrow">
                {o.link && <a className="btn sm" href={o.link} target="_blank" rel="noopener noreferrer">Open</a>}
                <button className="btn sm" onClick={() => { go('ideas'); setOpenId(o.id); }}>Edit</button>
              </div>
            </div>
          )) : (
            <p className="hint" style={{ margin: 0 }}>
              Everything you finish lands here with its link — the list you paste into applications.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
