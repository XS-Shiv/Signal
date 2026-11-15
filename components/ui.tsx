'use client';

import { Idea, Weights, slotLabel, statusLabel } from '@/lib/types';
import { daysSince, isStale, unfinished } from '@/lib/score';

export function Pills({ o, w }: { o: Idea; w: Weights }) {
  return (
    <>
      <span className={`pill dot s-${o.status}`}>{statusLabel(o.status)}</span>
      <span className="tag">{o.type}</span>
      {o.tool && o.tool !== '—' && <span className="tag">{o.tool}</span>}
      {o.slots.map(s => <span className="tag" key={s}>{slotLabel(s)}</span>)}
      {isStale(o, w) && <span className="pill stale">cold {daysSince(o.touched_at)}d</span>}
      {unfinished(o) && <span className="pill stale">needs a next step</span>}
    </>
  );
}

export function Prog({ pct }: { pct: number }) {
  return <div className="prog"><i style={{ width: `${pct}%` }} /></div>;
}

export function Chk({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      className={`chk${on ? ' on' : ''}`}
      onClick={onClick}
      aria-pressed={on}
      aria-label={label}
    />
  );
}

export function Range({
  label, value, min = 1, max = 5, step = 1, fmt, onChange
}: {
  label: string; value: number; min?: number; max?: number; step?: number;
  fmt?: (n: number) => string; onChange: (n: number) => void;
}) {
  return (
    <div className="rng">
      <label>{label}</label>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        aria-label={label}
      />
      <output>{fmt ? fmt(value) : value}</output>
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return <div className="empty"><b>{title}</b>{children}</div>;
}

export function Panel({
  label, right, children, body = true
}: {
  label?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; body?: boolean;
}) {
  return (
    <div className="panel">
      {(label || right) && (
        <div className="panel-h">
          {typeof label === 'string' ? <span className="lbl">{label}</span> : label}
          {right}
        </div>
      )}
      {body ? <div className="panel-b">{children}</div> : children}
    </div>
  );
}

export function scoreColor(n: number): string {
  if (n >= 70) return 'var(--go)';
  if (n >= 45) return 'var(--ink)';
  return 'var(--ink3)';
}
