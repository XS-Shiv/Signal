export const STATUSES = [
  { k: 'idea', l: 'Idea' },
  { k: 'next', l: 'Up next' },
  { k: 'building', l: 'Building' },
  { k: 'shipped', l: 'Shipped' },
  { k: 'parked', l: 'Parked' },
  { k: 'killed', l: 'Killed' }
] as const;

export type Status = (typeof STATUSES)[number]['k'];
export const LIVE: Status[] = ['idea', 'next', 'building'];

export const TYPES = [
  'App', 'Website', 'Case study', 'Deck / Comp', 'Brand / Product',
  'Automation', 'Claude skill', 'Content', 'Venture', 'Other'
];

export const TOOLS = [
  'Claude', 'Claude Code', 'Lovable', 'Google AI Studio',
  'Framer', 'Figma', 'Notion', 'Hand-rolled', 'Other', '—'
];

export const SLOTS = [
  { k: 'consumer', l: 'Consumer 0→1' },
  { k: 'ai', l: 'AI / agents' },
  { k: 'fintech', l: 'Fintech / Web3' },
  { k: 'b2b', l: 'B2B / tools' },
  { k: 'growth', l: 'Growth / GTM' },
  { k: 'design', l: 'Design craft' },
  { k: 'data', l: 'Data / analytics' },
  { k: 'hardware', l: 'Hardware / deep tech' }
];

export const WARMTH = [
  { k: 'cold', l: 'Not reached' },
  { k: 'sent', l: 'Reached out' },
  { k: 'talking', l: 'Talking' },
  { k: 'warm', l: 'Real contact' }
] as const;

export type Warmth = (typeof WARMTH)[number]['k'];

export const SCORE_FIELDS = [
  { k: 'portfolio', l: 'Portfolio' },
  { k: 'excite', l: 'Pull' },
  { k: 'reach', l: 'Reach' },
  { k: 'learn', l: 'Learning' },
  { k: 'effort', l: 'Effort' }
] as const;

export type Task = {
  id: number;
  idea_id: string | null;
  title: string;
  done: boolean;
  due: string | null;
  position: number;
  created_at: string;
  done_at: string | null;
};

export type Idea = {
  id: string;
  title: string;
  type: string;
  status: Status;
  tool: string;
  why: string;
  next_action: string;
  context: string;
  resume: string;
  portfolio: number;
  excite: number;
  reach: number;
  learn: number;
  effort: number;
  slots: string[];
  link: string;
  created_at: string;
  touched_at: string;
  updated_at: string;
  tasks: Task[];
};

export type Person = {
  id: string;
  name: string;
  role: string;
  org: string;
  hook: string;
  ask: string;
  warmth: Warmth;
  next_touch: string | null;
  last_contact: string | null;
  proof_idea_id: string | null;
  link: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type Weights = {
  wP: number; wE: number; wR: number; wL: number; wEff: number; staleDays: number;
};

export const DEFAULT_WEIGHTS: Weights = {
  wP: 1.4, wE: 1.5, wR: 1.1, wL: 0.7, wEff: 0.7, staleDays: 14
};

export type Payload = { ideas: Idea[]; people: Person[]; weights: Weights };

export const statusLabel = (k: string) => STATUSES.find(s => s.k === k)?.l ?? k;
export const slotLabel = (k: string) => SLOTS.find(s => s.k === k)?.l ?? k;
export const warmthLabel = (k: string) => WARMTH.find(w => w.k === k)?.l ?? k;
