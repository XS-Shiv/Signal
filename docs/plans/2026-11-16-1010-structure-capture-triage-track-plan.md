---
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-brainstorm
date: 2026-11-16
status: requirements-only
---

# SIGNAL structure: catch → triage → track

## Goal

Make SIGNAL a capture tool with a tracker attached, rather than a tracker with
voice bolted on. The problem it exists to solve is that ideas die between
having them and sitting down to work — not that projects are hard to track.

## Scope

**In scope (this plan):** voice capture on phone and laptop, an inbox for raw
captures, a batch triage step, and the home screen that results.

**Explicitly deferred**, each independently shippable later:

- Progress that reports itself (GitHub commits and Claude sessions updating projects)
- The system rating and ranking ideas instead of the user's sliders
- People, outreach tracking, kanban

## Key decisions

1. **Two first-class surfaces, phone and laptop**
   (session-settled: user-directed — chosen over phone-only and laptop-only,
   with the extra build cost shown: ideas strike in both places and capture
   must not miss either.)

2. **This work owns catch → triage → track only**
   (session-settled: user-directed — chosen over progress-sync, AI rating, and
   people/kanban: voice capture is the stated major usage, and the other three
   get better input once intake is clean.)

3. **Raw captures land in an inbox and are triaged in batches**
   (session-settled: user-directed — chosen over landing straight in the list
   and over asking a question at capture time: capture must stay instant and
   work with no signal, which rules out asking anything in the moment.)

4. **The inbox takes over the home screen whenever anything is untriaged**
   (session-settled: user-directed — chosen over a badge, a Claude nag, and a
   weekly ritual: the named failure of an inbox is that it rots, and only this
   option removes the discipline requirement.)

5. **Offline capture records audio locally and syncs on reconnect**
   (session-settled: user-directed — chosen over a typed fallback and over
   accepting the gap: "capture never misses" has to hold on the metro.)

## Requirements

- Capture is reachable in one action from both surfaces and never blocks on
  network, permissions, or a question.
- A capture with no network is retained locally and uploaded when the
  connection returns; nothing is lost by being offline.
- Nothing a user captures appears in the project or idea lists until it has
  been triaged.
- While any capture is untriaged, the home screen presents triage first.
- Triage turns one capture into exactly one outcome: a new idea, a task on an
  existing project, merged into an existing idea, or dropped.
- Triage surfaces likely duplicates among existing ideas before a new one is
  created.
- Every idea and project is reachable at its own URL.
- Active projects and ideas both show their priority rating on home.

## Assumptions

- Live transcription uses the browser's speech API, which needs a network
  connection and is unavailable in Firefox; typing is always available.
- Offline captures are stored as audio and transcribed by the user at triage.
  Automatic transcription of recorded audio needs a paid speech API and is not
  part of this work.
- Duplicate detection is text similarity against existing titles, not a model
  judgment — model-assisted triage belongs to the deferred rating work.

## Not doing

- Changing how ratings are produced; the sliders stay until the rating work lands.
- Any GitHub or Claude progress integration.
- Native apps. Both surfaces are the same web app.
