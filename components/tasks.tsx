'use client';

import { useState } from 'react';
import { useStore } from './store';
import { Chk } from './ui';
import { Task } from '@/lib/types';

export function TaskLine({ task, from }: { task: Task; from?: string }) {
  const s = useStore();
  return (
    <div className={`tl${task.done ? ' done' : ''}`}>
      <Chk
        on={task.done}
        label={task.done ? 'Mark not done' : 'Mark done'}
        onClick={() => {
          s.patchTask(task.id, { done: !task.done });
          if (!task.done && task.idea_id) s.touchIdea(task.idea_id, true);
        }}
      />
      <input
        type="text"
        value={task.title}
        onChange={e => s.patchTask(task.id, { title: e.target.value }, { debounce: true })}
        placeholder="what needs doing"
      />
      {from && <span className="from">{from}</span>}
      <button className="btn sm x" onClick={() => s.deleteTask(task.id)} aria-label="Remove task">×</button>
    </div>
  );
}

export function AddTask({ ideaId, placeholder }: { ideaId: string | null; placeholder?: string }) {
  const s = useStore();
  const [draft, setDraft] = useState('');
  const add = () => {
    const t = draft.trim();
    if (!t) return;
    s.addTask(ideaId, t);
    setDraft('');
  };
  return (
    <div className="addtask">
      <input
        type="text"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
        placeholder={placeholder ?? 'Add a task and press enter'}
      />
      <button className="btn sm" onClick={add} disabled={!draft.trim()}>Add</button>
    </div>
  );
}
