'use client';

import { useStore } from './store';
import { Panel, Range } from './ui';
import { DEFAULT_WEIGHTS, Idea, SLOTS, Weights } from '@/lib/types';
import { daysSince, isLive, isStale, unfinished } from '@/lib/score';

type V = { setOpenId: (id: string | null) => void; go: (v: string) => void };

export function Review({ setOpenId, go }: V) {
  const s = useStore();
  const { ideas, people, weights } = s;
  const live = ideas.filter(isLive);

  const openTasks =
    ideas.reduce((n, o) => n + o.tasks.filter(t => !t.done).length, 0) +
    s.looseTasks.filter(t => !t.done).length;

  const kpis: [string, number, boolean][] = [
    ['in progress', ideas.filter(o => o.status === 'building').length, false],
    ['ideas waiting', live.filter(o => o.status !== 'building').length, false],
    ['finished', ideas.filter(o => o.status === 'shipped').length, false],
    ['going cold', live.filter(o => isStale(o, weights)).length, true],
    ['open tasks', openTasks, false],
    ['people warm', people.filter(p => p.warmth === 'warm' || p.warmth === 'talking').length, false]
  ];

  const unf = live.filter(unfinished);
  const cold = live.filter(o => isStale(o, weights));
  const old = live.filter(o => (daysSince(o.created_at) ?? 0) > 60 && o.status === 'idea');

  const block = (title: string, arr: Idea[], acts: (o: Idea) => React.ReactNode) =>
    arr.length ? (
      <div style={{ marginBottom: 18 }} key={title}>
        <div className="sect" style={{ marginTop: 0 }}>
          <h3 style={{ fontSize: 13.5, color: 'var(--ink2)' }}>{title}</h3>
          <span className="c">{arr.length}</span>
        </div>
        {arr.slice(0, 12).map(o => (
          <div className="ship" key={o.id}>
            <h4 style={{ fontWeight: 400 }}>{o.title}</h4>
            <div className="btnrow">{acts(o)}</div>
          </div>
        ))}
      </div>
    ) : null;

  const W: [keyof Weights, string][] = [
    ['wP', 'Portfolio value'], ['wE', 'How much you want to'], ['wR', 'Who will see it'],
    ['wL', 'What you learn'], ['wEff', 'Effort penalty']
  ];

  return (
    <>
      <div className="pagehead">
        <h2>Review</h2>
        <p>Where things stand, and what to decide this week.</p>
      </div>

      <div className="kpis">
        {kpis.map(([l, n, warn]) => (
          <div className="kpi" key={l}>
            <b style={{ color: warn && n ? 'var(--warn)' : 'var(--ink)' }}>{n}</b>
            <span>{l}</span>
          </div>
        ))}
      </div>

      <div className="sect"><h3>This week&rsquo;s decisions</h3></div>
      <div className="panel">
        <div className="panel-b">
          {(unf.length || cold.length || old.length) ? (
            <>
              {block('Needs a next step', unf, o => (
                <button className="btn sm go" onClick={() => { go('ideas'); setOpenId(o.id); }}>Open</button>
              ))}
              {block('Going cold', cold, o => (
                <>
                  <button className="btn sm go" onClick={() => s.touchIdea(o.id)}>Revive</button>
                  <button className="btn sm warnb" onClick={() => s.patchIdea(o.id, { status: 'parked' })}>Park</button>
                  <button className="btn sm stopb" onClick={() => s.patchIdea(o.id, { status: 'killed' })}>Drop</button>
                </>
              ))}
              {block('Sat as an idea for 60+ days', old, o => (
                <>
                  <button className="btn sm go" onClick={() => s.patchIdea(o.id, { status: 'building', touched_at: new Date().toISOString() })}>Start it</button>
                  <button className="btn sm stopb" onClick={() => s.patchIdea(o.id, { status: 'killed' })}>Drop it</button>
                </>
              ))}
            </>
          ) : (
            <p className="hint" style={{ margin: 0 }}>
              Nothing to decide. Everything live has a next step and has been touched recently.
            </p>
          )}
        </div>
      </div>

      <div className="sect">
        <h3>Portfolio coverage</h3>
        <span className="c">where the shelf is thin</span>
      </div>
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
              <small>{ship} finished · {bld} in progress</small>
            </div>
          );
        })}
      </div>
      <p className="hint" style={{ margin: '12px 0 0' }}>
        Dashed means nothing finished there yet. When two ideas score close, build the one that
        fills a gap.
      </p>

      <div className="sect"><h3>Settings</h3></div>
      <div className="split">
        <Panel label="What counts as important">
          {W.map(([k, l]) => (
            <Range
              key={k}
              label={l}
              value={weights[k]}
              min={0} max={2} step={0.1}
              fmt={n => n.toFixed(1)}
              onChange={n => s.setWeights({ ...weights, [k]: n })}
            />
          ))}
          <Range
            label="Cold after"
            value={weights.staleDays}
            min={5} max={45} step={1}
            fmt={n => `${n} days`}
            onChange={n => s.setWeights({ ...weights, staleDays: n })}
          />
          <div className="btnrow" style={{ marginTop: 10 }}>
            <button className="btn sm" onClick={() => s.setWeights({ ...DEFAULT_WEIGHTS })}>Reset</button>
          </div>
          <p className="hint" style={{ marginTop: 10 }}>
            Turn up <b>how much you want to</b> when nothing gets finished. Turn up{' '}
            <b>who will see it</b> in placement season.
          </p>
        </Panel>

        <Panel label="Data">
          <p className="hint" style={{ marginTop: 0 }}>
            Everything lives in your Supabase project, so Claude can read and write this board from
            a chat. Tell Claude an idea and it is here before you open the site.
            {!s.gated && (
              <> This site is currently <b style={{ color: 'var(--warn)' }}>open to anyone with the
              link</b> — set <code className="mono">SIGNAL_VOICE_PHRASE</code> to lock it.</>
            )}
          </p>
          <div className="btnrow">
            <button className="btn" onClick={() => {
              const text = JSON.stringify({ ideas: s.ideas, people: s.people, weights }, null, 2);
              navigator.clipboard?.writeText(text).then(
                () => s.say('Copied as JSON'), () => s.say('Could not copy'));
            }}>Copy all as JSON</button>
            <button className="btn" onClick={() => s.reload()}>Refresh</button>
            {s.gated && (
              <button className="btn stopb" onClick={async () => {
                await fetch('/api/auth', { method: 'DELETE' });
                window.location.href = '/unlock';
              }}>Lock</button>
            )}
          </div>
        </Panel>
      </div>
    </>
  );
}
