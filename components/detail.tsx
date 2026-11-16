'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore } from './store';
import { IdeaDetail } from './idea';
import { statusLabel } from '@/lib/types';
import { ago, daysSince, isStale, progress, score } from '@/lib/score';

/** One idea or project, at its own URL. */
export function Detail({ id }: { id: string }) {
  const s = useStore();
  const router = useRouter();
  const idea = s.ideas.find(o => o.id === id);

  if (!idea) {
    return (
      <div className="quiet">
        <b>Not found</b>
        This may have been deleted. <Link href="/">Back to home</Link>
      </div>
    );
  }

  const p = progress(idea);
  const cold = isStale(idea, s.weights);

  return (
    <>
      <div className="crumb">
        <Link href="/">Home</Link> <span>/</span> <span>{idea.title || 'untitled'}</span>
      </div>

      <div className="pagehead">
        <input
          className="titleedit"
          value={idea.title}
          onChange={e => s.patchIdea(idea.id, { title: e.target.value }, { debounce: true })}
          placeholder="untitled"
          aria-label="Title"
        />
        <div className="detmeta">
          <span className={`pill dot s-${idea.status}`}>{statusLabel(idea.status)}</span>
          <span className="prio">{score(idea, s.weights)} priority</span>
          {p && <span className="hint">{p.done} of {p.total} tasks</span>}
          <span className={`hint${cold ? ' warn' : ''}`}>
            {cold ? `untouched ${daysSince(idea.touched_at)} days` : `worked on ${ago(idea.touched_at)}`}
          </span>
        </div>
      </div>

      <IdeaDetail idea={idea} onClose={() => router.push('/')} />
    </>
  );
}
