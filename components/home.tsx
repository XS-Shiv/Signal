'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useStore } from './store';
import { Inbox } from './inbox';
import { VoiceCapture } from './voice';
import { TaskLine, AddTask } from './tasks';
import { Idea, statusLabel } from '@/lib/types';
import { ago, daysSince, isStale, progress, score } from '@/lib/score';

function ProjectCard({ idea }: { idea: Idea }) {
  const s = useStore();
  const p = progress(idea);
  const cold = isStale(idea, s.weights);
  const open = idea.tasks.filter(t => !t.done);

  return (
    <div className={`pj${cold ? ' cold' : ''}`}>
      <div className="pj-top">
        <div className="pj-title">
          <h4><Link href={`/i/${idea.id}`}>{idea.title}</Link></h4>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="prio" title="priority">{score(idea, s.weights)}</span>
            <span className={`pill dot s-${idea.status}`}>{statusLabel(idea.status)}</span>
          </div>
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
          {open.slice(0, 4).map(t => <TaskLine key={t.id} task={t} />)}
          {!open.length && <p className="hint" style={{ margin: '6px 0 0' }}>No open tasks.</p>}
        </div>
        <AddTask ideaId={idea.id} />
      </div>
      <div className="pj-foot">
        <span className={`when${cold ? ' warn' : ''}`}>
          {cold ? `untouched ${daysSince(idea.touched_at)} days` : `worked on ${ago(idea.touched_at)}`}
        </span>
        <div className="btnrow">
          <button className="btn sm go" onClick={() => s.touchIdea(idea.id)}>Worked on it</button>
          <Link className="btn sm" href={`/i/${idea.id}`}>Open</Link>
        </div>
      </div>
    </div>
  );
}

export function Home() {
  const s = useStore();
  const [showAnyway, setShowAnyway] = useState(false);

  const building = s.ideas.filter(o => o.status === 'building')
    .sort((a, b) => +new Date(b.touched_at) - +new Date(a.touched_at));
  const toWorkOn = s.ideas.filter(o => o.status === 'next' || o.status === 'idea')
    .sort((a, b) => score(b, s.weights) - score(a, s.weights))
    .slice(0, 8);

  // The inbox owns this screen while anything is untriaged.
  if (s.captures.length && !showAnyway) {
    return (
      <>
        <Inbox />
        <button className="btn" style={{ marginTop: 22 }} onClick={() => setShowAnyway(true)}>
          Show my projects anyway
        </button>
      </>
    );
  }

  return (
    <>
      {showAnyway && !!s.captures.length && (
        <div className="banner" style={{ borderColor: 'var(--goLine)', background: 'var(--goDim)', color: 'var(--go)' }}>
          {s.captures.length} still waiting in the inbox —{' '}
          <button className="btn sm" onClick={() => setShowAnyway(false)}>sort them</button>
        </div>
      )}

      <div className="homecap">
        <VoiceCapture onCaptured={() => s.reload()} />
      </div>

      <div className="sect"><h3>In progress</h3><span className="c">{building.length}</span></div>
      {building.length
        ? building.map(o => <ProjectCard key={o.id} idea={o} />)
        : <div className="quiet"><b>Nothing in progress</b>Promote an idea below, or catch a new one.</div>}

      <div className="sect"><h3>Ideas to work on</h3><span className="c">ranked by priority</span></div>
      {toWorkOn.length ? toWorkOn.map(o => (
        <Link href={`/i/${o.id}`} className="il" key={o.id}>
          <div>
            <h4>{o.title}</h4>
            <div className="sub">
              {o.next_action || <span style={{ color: 'var(--warn)' }}>no next step yet</span>}
            </div>
          </div>
          <div className="rank">
            <div className="p"><b>{score(o, s.weights)}</b><span>priority</span></div>
          </div>
        </Link>
      )) : <div className="quiet"><b>No ideas waiting</b>Catch one above.</div>}
    </>
  );
}
