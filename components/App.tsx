'use client';

import { useEffect, useState } from 'react';
import { StoreProvider, useStore } from './store';
import { Board, Flight, PickUp, Priority, Review } from './views';
import { Capture } from './capture';
import { Network } from './network';
import { isLive, isStale } from '@/lib/score';

const TABS = [
  ['now', 'Pick up'],
  ['capture', 'Capture'],
  ['priority', 'Priority'],
  ['board', 'Board'],
  ['flight', 'In flight'],
  ['network', 'Network'],
  ['review', 'Review']
] as const;

function Shell() {
  const s = useStore();
  const [view, setView] = useState<string>('now');
  const [openId, setOpenId] = useState<string | null>(null);

  // remember the tab between visits
  useEffect(() => {
    try {
      const v = localStorage.getItem('signal.view');
      if (v && TABS.some(t => t[0] === v)) setView(v);
    } catch { /* private mode */ }
  }, []);

  const go = (v: string) => {
    setView(v);
    try { localStorage.setItem('signal.view', v); } catch { /* private mode */ }
  };

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      const typing = !!el && ['input', 'textarea', 'select'].includes(el.tagName.toLowerCase());
      if (e.key === 'Escape') {
        if (typing) el?.blur();
        else if (openId) setOpenId(null);
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'n') {
        e.preventDefault();
        go('capture');
        setTimeout(() => document.getElementById('capture-title')?.focus(), 40);
        return;
      }
      if (e.key === '/') {
        e.preventDefault();
        go('board');
        setTimeout(() => document.getElementById('board-search')?.focus(), 40);
        return;
      }
      const i = Number(e.key);
      if (i >= 1 && i <= TABS.length) go(TABS[i - 1][0]);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openId]); // eslint-disable-line react-hooks/exhaustive-deps

  const live = s.ideas.filter(isLive);
  const stats: [string, number][] = [
    ['live', live.length],
    ['building', s.ideas.filter(o => o.status === 'building').length],
    ['shipped', s.ideas.filter(o => o.status === 'shipped').length],
    ['cold', live.filter(o => isStale(o, s.weights)).length]
  ];
  const counts: Record<string, number> = {
    priority: live.length,
    board: s.ideas.length,
    flight: s.ideas.filter(o => o.status === 'building').length,
    network: s.people.length
  };

  const props = { openId, setOpenId, go };

  return (
    <>
      <div className="topline" />
      <div className="wrap">
        <header>
          <div className="brand">
            <div className="mark"><i /></div>
            <div>
              <h1>SIGNAL</h1>
              <p>idea capture → priority → ship. one place, no lost notes.</p>
            </div>
          </div>
          <div className="hstat">
            {stats.map(([l, n]) => (
              <div key={l}>
                <b style={{ color: l === 'cold' && n ? 'var(--warn)' : 'var(--ink)' }}>{n}</b>
                <span>{l}</span>
              </div>
            ))}
          </div>
        </header>

        {s.error && (
          <div className="banner">
            {s.error.includes('SUPABASE')
              ? 'Database not configured — set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, then redeploy.'
              : `Could not reach the database: ${s.error}`}
          </div>
        )}

        <nav role="tablist">
          {TABS.map(([v, l]) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              onClick={() => go(v)}
            >
              {l}
              {counts[v] !== undefined && <span className="n">{counts[v]}</span>}
            </button>
          ))}
        </nav>

        {s.loading ? (
          <div className="empty"><b>Loading</b>Reading the board.</div>
        ) : (
          <>
            {view === 'now' && <PickUp {...props} />}
            {view === 'capture' && <Capture setOpenId={setOpenId} go={go} />}
            {view === 'priority' && <Priority {...props} />}
            {view === 'board' && <Board {...props} />}
            {view === 'flight' && <Flight {...props} />}
            {view === 'network' && <Network />}
            {view === 'review' && <Review {...props} />}
          </>
        )}
      </div>
      {s.toast && <div className="toast">{s.toast}</div>}
    </>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
