# SIGNAL

Idea capture, prioritisation and build tracking — one place, so nothing gets
noted and then lost.

The problem it solves: ideas land in a notes app with just a title, and by the
time there's free time to work on them the thought is gone. So an idea here is
only "captured" when it has a **spark** (why it grabbed you) and a **15-minute
next action**. Projects in flight also carry a **resume note** — where you
stopped and what the next decision is — which is what gives you your thoughts
back when you sit down cold.

## Tabs

| Tab | What it's for |
| --- | --- |
| **Pick up** | Opens on the single next 15-minute action, plus every open task and anything going cold. Start here. |
| **Capture** | Full capture form, plus a quick drop for when there's no time. Incomplete captures show up as an inbox. |
| **Priority** | Ranked by a weighted score you can tune. Push *pull* up when nothing gets finished; push *reach* up in placement season. |
| **Board** | Everything, grouped by status / type / effort / portfolio slot / tool / score band, sorted six ways, with search. |
| **In flight** | Active builds with tasks, progress bars and resume notes. Keep it under four. |
| **Network** | Outreach pipeline. Every row links to something you shipped, plus a copy-ready opener and a follow-up cadence. |
| **Review** | Weekly sweep (finish / revive / park / kill), a portfolio gap map, and the shipped shelf. |

Scoring: `(portfolio×w + pull×w + reach×w + learning×w) ÷ effort^w`, scaled to 100.

## Stack

- **Next.js 16** (App Router) on Vercel
- **Supabase Postgres** for data — project `signal`, region `ap-south-1`
- No client-side database access: every read and write goes through
  `/api/*` route handlers on the server
- Row Level Security is **on with no policies**, so the publishable/anon key
  can reach nothing. Only the service-role key (server-side) or the Supabase
  dashboard can touch the data.
- A single passcode gates the whole site. The cookie stores a SHA-256 hash of
  the passcode, never the passcode itself.

## Environment variables

Copy `.env.example` to `.env.local` for local work, and set the same three in
Vercel → Settings → Environment Variables.

| Variable | Where it comes from |
| --- | --- |
| `SUPABASE_URL` | `https://kmpkckqkkneaeingyxho.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard → Project Settings → API Keys → `service_role`. Secret. |
| `SIGNAL_PASSCODE` | Anything you'll remember. This is the site's password. |

If a variable is missing the app says so on screen rather than failing silently.

## Deploying

1. vercel.com → Add New → Project → import `XS-Shiv/signal`.
2. Add the three environment variables above (all three environments).
3. Deploy. Nothing else to configure — framework, build command and output are
   detected automatically.

Pushing to `main` redeploys.

## Local development

```bash
npm install
cp .env.example .env.local   # then fill in the two blanks
npm run dev                  # http://localhost:3000
npm run typecheck
npm run build
```

## Editing from Claude

The data lives in Supabase rather than in the browser, which means Claude can
read and write the board directly through its Supabase tools — project ref
`kmpkckqkkneaeingyxho`. "Add this idea", "mark the hero task done", "what's
gone cold?" all work from a chat, and the site shows it on next load.

## Schema

- `ideas` — one row per idea or project: status, type, tool, the spark, next
  action, brain dump, resume note, the five 1–5 ratings, portfolio slots
- `tasks` — belongs to an idea, or standalone when `idea_id` is null. Progress
  per project is just done/total.
- `people` — outreach pipeline, with `proof_idea_id` pointing at the thing to
  show them
- `settings` — the scoring weights and the "cold after N days" threshold

Triggers keep `updated_at` current and stamp `done_at` when a task flips, no
matter whether the write came from the app, Claude or the SQL editor.
