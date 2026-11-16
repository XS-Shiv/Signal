'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useStore } from './store';
import { isLive, isStale } from '@/lib/score';

const TABS = [
  ['/', 'Home'],
  ['/ideas', 'Ideas'],
  ['/people', 'People'],
  ['/review', 'Review']
] as const;

export function Shell({ children }: { children: React.ReactNode }) {
  const s = useStore();
  const path = usePathname();
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      const typing = !!el && ['input', 'textarea', 'select'].includes(el.tagName.toLowerCase());
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'c') { e.preventDefault(); router.push('/capture'); return; }
      const i = Number(e.key);
      if (i >= 1 && i <= TABS.length) router.push(TABS[i - 1][0]);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router]);

  const live = s.ideas.filter(isLive);
  const cold = live.filter(o => isStale(o, s.weights)).length;
  const counts: Record<string, number> = {
    '/': s.captures.length,
    '/ideas': live.length,
    '/people': s.people.length
  };

  return (
    <>
      <div className="topline" />
      <div className="wrap">
        <header>
          <div className="brand">
            <Link href="/" className="mark" aria-label="Home"><i /></Link>
            <div>
              <h1>SIGNAL</h1>
              <p>catch it, sort it, ship it.</p>
            </div>
          </div>
          <div className="hstat">
            <Link href="/capture" className="btn go" style={{ padding: '9px 14px' }}>+ Catch an idea</Link>
          </div>
        </header>

        {s.error && (
          <div className="banner">
            {s.error.includes('SUPABASE')
              ? 'Database not configured — set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, then redeploy.'
              : `Could not reach the database: ${s.error}`}
          </div>
        )}

        <nav>
          {TABS.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              aria-selected={path === href || (href !== '/' && path.startsWith(href))}
              role="tab"
            >
              {label}
              {!!counts[href] && (
                <span className={`n${href === '/' && s.captures.length ? ' hot' : ''}`}>{counts[href]}</span>
              )}
            </Link>
          ))}
          {!!cold && <span className="navnote">{cold} going cold</span>}
        </nav>

        {s.loading ? <div className="quiet"><b>Loading</b>Reading your board.</div> : children}
      </div>
      {s.toast && <div className="toast">{s.toast}</div>}
    </>
  );
}
