'use client';

import { useEffect, useState } from 'react';
import { StoreProvider, useStore } from './store';
import { Projects } from './projects';
import { Ideas } from './ideas';
import { Review } from './review';
import { Network } from './network';
import { isLive, isStale } from '@/lib/score';

const TABS = [
  ['projects', 'Projects'],
  ['ideas', 'Ideas'],
  ['people', 'People'],
  ['review', 'Review']
] as const;

function Shell() {
  const s = useStore();
  const [view, setView] = useState<string>('projects');
  const [openId, setOpenId] = useState<string | null>(null);

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
        go('ideas');
        setTimeout(() => document.getElementById('capture-title')?.focus(), 40);
        return;
      }
      if (e.key === '/') {
        e.preventDefault();
        go('ideas');
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
  const cold = live.filter(o => isStale(o, s.weights)).length;
  const counts: Record<string, number> = {
    projects: s.ideas.filter(o => o.status === 'building').length,
    ideas: live.length,
    people: s.people.length
  };

  return (
    <>
      <div className="topline" />
      <div className="wrap">
        <header>
          <div className="brand">
            <div className="mark"><i /></div>
            <div>
              <h1>SIGNAL</h1>
              <p>capture it, rank it, ship it.</p>
            </div>
          </div>
          {!s.loading && (
            <div className="hstat">
              <div>
                <b>{counts.projects}</b>
                <span>in progress</span>
              </div>
              <div>
                <b style={{ color: cold ? 'var(--warn)' : 'var(--ink)' }}>{cold}</b>
                <span>going cold</span>
              </div>
            </div>
          )}
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
            <button key={v} role="tab" aria-selected={view === v} onClick={() => go(v)}>
              {l}
              {counts[v] !== undefined && counts[v] > 0 && <span className="n">{counts[v]}</span>}
            </button>
          ))}
        </nav>

        {s.loading ? (
          <div className="quiet"><b>Loading</b>Reading your board.</div>
        ) : (
          <>
            {view === 'projects' && <Projects setOpenId={setOpenId} go={go} />}
            {view === 'ideas' && <Ideas openId={openId} setOpenId={setOpenId} />}
            {view === 'people' && <Network />}
            {view === 'review' && <Review setOpenId={setOpenId} go={go} />}
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
