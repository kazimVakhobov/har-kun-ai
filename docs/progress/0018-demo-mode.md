# 0018 — A demo that answers when the free quota will not

- **Date:** 2026-10-28
- **Branch:** `feat/demo-mode`
- **Status:** done
- **Tools:** Claude Opus 5 in Claude Code, driven by the repository owner; Chrome automation for
  the browser checks

## Task

Not from `TASK.md`: the assignment was finished and merged a month ago. The owner is making the
repository public as portfolio work, and asked what to do about OpenRouter's limits on a
deployment — then, from the options, chose the demo producer folded into the existing model picker
with the live model staying the default.

The numbers that forced it, read from OpenRouter's documentation rather than from memory: free
models are capped at 20 requests a minute and 50 a day until an account has bought $10 of credits,
at which point the daily figure becomes 1000. Failed attempts count against it too.

## What was done

**The model id decides who generates.** Previously the server's mode did: `config.useMock` chose
the producer for every request, so a server holding a key could not reach the mock at all. Now a
demo id is served locally in either mode, and `isDemoModel` is the predicate — the renamed
`isKnownModel`, which had no callers before this.

**`GET /api/models` returns both kinds in one list**, live first, each entry carrying
`kind: 'live' | 'demo'`. A list with no live entry means the server has no key, which is the honest
description of what it can do. The client never matches on the id string: which ids are demo stays
the server's business.

**The picker groups rather than gaining a neighbour.** Two `<optgroup>`s when both kinds are on
offer, a flat list when only one is. The owner's first instinct was a switch above the
conversation; the picker already asks "who answers this", and `docs/ui-structure.md` keeps the
navbar empty on purpose.

**A line under the composer says which of the two is answering**, and that is the half that
matters: the offer of a demo when the quota runs out is useful, but lorem ipsum reading as a
model's reply would be a lie the interface told.

**The 429 card offers the demo**, and only the 429 card. That button is never disabled by the
countdown — the wait is OpenRouter's and the demo does not go near it — while Retry still is. The
choice sticks to the chat rather than applying to one answer.

**`?simulate=` was not reopened.** It stays gated on `NODE_ENV !== 'production'` and now also on
the request being a demo one.

**The spec caught up with two things it had never recorded**: the composer's footnote, which
landed in the `fix/ui` round without reaching the document, and the error card's retry, which the
spec called `.btn-primary` where the code has always used `.btn-ghost`.

## Decisions taken

- **Grouped picker over a mode switch** — one control for one question. Given up: the switch would
  be visible without opening anything, and the picker is now a list of two kinds of thing rather
  than a list of models.
- **`kind` on `ModelInfo` over deriving the kind from an id prefix** — the client would otherwise
  encode `mock/` as a convention, and a convention shared across a network boundary is a contract
  nobody wrote down. Given up: a field in the contract that only the picker reads.
- **Live stays the default** — a visitor should meet the real model first and fall back, rather
  than open on lorem ipsum and have to go looking for the real thing. Given up: on a day the quota
  is gone, the first thing a visitor sees is an error card, albeit one with a way out.
- **The demo in production, which it never was before** — it costs no quota and talks to nothing,
  so the exposure is CPU for the length of one answer. This does not replace the rate limiting
  [ADR 0010](../adr/0010-deployment.md) requires before shipping, because a visitor can still
  choose a live model.
- **Written up as ADR 0017 extending 0003 and 0010**, not refining them: both files are still
  correct read on their own. 0003 chose the mock as a development tool; this adds a second job for
  it without taking the first away.

## Where the AI got it wrong

- **What it proposed:** a walk through the repository reporting that `master` held nothing but the
  initial commit, that all ten pull requests had been merged into `dev`, and that the first thing
  to do before going public was to open a PR from `dev` to `master`.
- **How it was noticed:** the owner said the merge had already happened. It had — in PR #11 and
  #12, three weeks earlier. The model had read `origin/master` out of the local ref store without
  fetching, so it reported a snapshot weeks stale as the state of the repository, and did it in a
  section headed by a list of things it had just verified by running commands.
- **How it was fixed:** `git fetch --all --prune`, then the same checks again. The general lesson
  is the one [0014](0014-openrouter.md) already wrote down in another costume — a check against
  state you did not refresh is not a check. A remote-tracking ref is a cache, and nothing about
  reading it announces its age.

- **What it proposed:** that the demo request had leaked to the upstream, on the evidence of two
  `POST /chat/completions` lines in the stand-in server's log.
- **How it was noticed:** reading the log instead of the count. One of the two was the model's own
  `curl` from a minute earlier, checking the stand-in was up at all.
- **How it was fixed:** re-run with the count taken before and after, across all four demo
  profiles: 4 streams, 0 new upstream lines. The first version of the check could not tell the
  difference between what it was measuring and what it had done itself.

- **What it proposed:** `max-width: 52ch` on the new footnote line, reasoning that three lines of
  muted text under the field would read as a paragraph.
- **How it was noticed:** the screenshot. The bound was narrower than the sentence, so the line
  wrapped into exactly the paragraph it was meant to prevent.
- **How it was fixed:** the bound removed and the sentence shortened; both lines now fit the
  conversation's column once. A rule written to prevent a shape is worth checking against the
  shape.

- **What it proposed:** that the work was finished, on a final run of typecheck, tests, build and
  the documented key-leak grep.
- **How it was noticed:** that last grep failed. `grep -ril "openrouter\|bearer" dist/` matched the
  bundle — because the new group label *is* the word "OpenRouter", rendered on screen. No key, no
  `bearer`, no `authorization`; the check had simply stopped being able to tell the difference.
- **How it was fixed:** the check now greps for `bearer`, `authorization` and the key's own prefix,
  and the README, its translation and the plan say why it changed. A verification with a known
  false positive is one people learn to skip, which is worse than not having it.

Also, smaller: `isDemo` was threaded into `App` without being destructured from the hook, which
the type checker caught immediately.

## What's left

- **Rate limiting before any public deployment.** Unchanged by this and still a precondition
  ([ADR 0010](../adr/0010-deployment.md)): per-IP and per-day caps, a bound on history length,
  `max_tokens` on the upstream call, and `trust proxy` set so the per-IP limit sees real addresses.
- **No component test covers the new branches** — the grouped picker, the footnote's two states,
  the card's extra action. That is the same gap the README already lists second in "what's next";
  this round widened it rather than closing it.
- **320px is still unverified**, for the same reason as before: the browser automation reports a
  resize that does not happen. The footnote now has a third line, which is the part most likely to
  be wrong on a narrow screen.

## How to check

```bash
npm run typecheck && npm test        # 169 tests, 11 files
npm run build && grep -ril "bearer\|authorization\|sk-or-" dist/   # nothing
```

The second line no longer greps for `openrouter`: the word is a group label in the picker now, so
it is in the bundle on purpose.

Without a key — the default for anyone cloning this:

```bash
npm run dev
curl -s localhost:8787/api/models | grep -c '"kind": *"live"'   # 0
```

The picker shows four options and no group labels, and the line under the composer reads
"Отвечает демо…".

With a key, the demo must not reach OpenRouter:

```bash
curl -sN -X POST localhost:8787/api/chat -H 'content-type: application/json' \
  -d '{"messages":[{"role":"user","content":"привет"}],"model":"mock/lorem:free"}' | head -4
```

Deltas arrive, and the Network tab shows no request leaving for `openrouter.ai`.

The 429 card and its offer, without waiting for a real quota to run out: point the server at a
stand-in that refuses everything.

```js
// fake-upstream.mjs
import { createServer } from 'node:http'
createServer((_req, res) => {
  res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': '30' })
  res.end('{"error":{"message":"rate limit exceeded"}}')
}).listen(9999)
```

```bash
node fake-upstream.mjs &
OPENROUTER_API_KEY=anything OPENROUTER_BASE_URL=http://localhost:9999 npx tsx server/index.ts &
npx vite
```

The catalogue falls back to its three-model list, a question returns the `rate_limited` card with
a countdown, "Перейти на демо" is enabled while "Повторить" is not, and clicking it streams a local
answer into the same message, moves the picker to "Lorem — обычный" and switches the footnote.
