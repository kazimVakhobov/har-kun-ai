# 0019 — A static build for GitHub Pages, answering from the browser

- **Date:** 2026-10-28
- **Branch:** `feat/pages-demo` (on top of `feat/demo-mode`, not yet merged)
- **Status:** done — the build; blocked on the owner — the publish, which needs Pages switched on
- **Tools:** Claude Opus 5 in Claude Code, driven by the repository owner; Chrome automation for
  the browser checks

## Task

The owner asked whether the project could run on GitHub Pages with a banner saying it is there to
show the mechanics, and that the real thing means cloning and supplying a key. It could not, as
written: Pages serves files and this app's `/api` is a process holding a key. So the question
became what to change, and the answer chosen was the smallest one that keeps the shipped code
honest — replace the transport, not the architecture ([ADR 0018](../adr/0018-static-demo-build.md)).

The owner also chose to expose the failure modes in that build, as a group in the model picker.

## What was done

**`shared/` gained the mock and the producer types.** The mock was always pure — text, timers, an
abort signal — and what kept it on the server was living next to the transport, not needing Node.
`shared/stream.ts` now holds `StreamFailure`, `delay`, `untilAborted` and the `Producer`/`Pump`
types; `shared/sse.ts` holds the frame builders, beside the parser that reads them.
`server/stream.ts` kept everything that is about a socket. No behaviour changed and the test count
did not move.

**A browser transport.** `runChatStream` already takes `fetchImpl` — an argument that exists so its
branches are reachable in a test without a server, and which turned out to be exactly the seam this
needed. `src/demo/transport.ts` serves `/api/models` from a local catalogue and `/api/chat` from a
`ReadableStream` fed by the same mock, including ragged frames, keepalive comments, the two error
forms and a stall guard. The client reads it with `getReader()` and cannot tell.

**Deliberate failures in the picker**, as a third group: 429 with a countdown, a silence, a dropped
connection, an error mid-answer. They live in `src/demo/catalogue.ts` and never in
`shared/mock.ts`, so no server can offer them.

**A banner** across the top of that build only, not dismissible, saying what answers there and how
to run the real thing.

**Two builds.** `npm run build:demo` sets a `__DEMO__` define — not a `VITE_` variable, so nothing
in this project reads `import.meta.env` and the rule about the key stays absolute — and writes
`dist-demo/` with a relative base, so the same output works under a project path or a domain. A
workflow publishes it on a push to `master`, after the test suite.

## Decisions taken

- **A transport seam over a service worker** — the only thing a worker buys is intercepting
  requests the page does not know it makes, and there are none here. Given up: the demo cannot
  intercept anything added later that calls `fetch` directly, which is a rule to remember rather
  than a mechanism that enforces it.
- **`__DEMO__` as a `define`** — keeps `import.meta.env` empty of everything, which makes hard
  rule 1 trivial to check. Given up: a build flag that does not show up in `.env.example` with the
  rest of the configuration.
- **Failure entries in `src/demo/` only** — the reason ADR 0017 refused to reopen `?simulate=` was
  that it lets a visitor make a *server* report errors it never had. On Pages there is no server.
  Given up: they cannot be used to demonstrate anything locally, where `?simulate=` still exists
  and still needs `curl`.
- **`isDemo` removed from `useChat` a day after it was added.** The footnote needed three cases
  rather than two, and `Composer` already had `models` and `model` to derive all three from.
  Threading a derived boolean through the hook was redundant the moment a third case existed.
- **The demo's stall guard is 6 s, against the server's 30.** Nobody waits half a minute on a
  portfolio link to see a timeout card. The keepalive is 2 s rather than 15, which also makes it
  visible that keepalives do not rearm the guard — they keep a connection alive, not a generation.

## Where the AI got it wrong

- **What it proposed:** a service worker, in the first sketch of how any of this could work —
  intercepting `/api/*` so the client stays untouched.
- **How it was noticed:** reading `src/lib/chatStream.ts` before writing anything. It already takes
  `fetchImpl` and `endpoint` as options, with a comment saying why: so every branch is reachable
  in a test without a server. The seam had been there since the streaming phase.
- **How it was fixed:** used it. The worker would have added a cache to reason about and a first
  load that races its own installation, to buy an interception that nothing needs.

- **What it proposed:** `max-width: 52ch` on the composer's demo line — carried over from the round
  before, where the same reflex had already been wrong once.
- **How it was noticed:** it was not, this time; the bound had been removed the previous day and
  the mistake did not recur. Noted here because the pattern is worth naming: the model reaches for
  a width bound on any new line of muted text, and it has been wrong both times.

- **What it proposed:** the banner as a sibling of the shell, rendered before it.
- **How it was noticed:** the shell is `100dvh` with `grid-template-rows: auto minmax(0, 1fr)`, so
  a sibling above it would push the composer off the bottom of the screen — the exact failure the
  `minmax(0, 1fr)` comment in that stylesheet warns about.
- **How it was fixed:** the banner is a row inside the shell, with a modifier class that adds the
  row. The log keeps taking what is left.

## What's left

- **The owner has to switch Pages on**: Settings → Pages → Source: GitHub Actions. Until then the
  workflow builds and fails on its deploy step, and the README's demo link 404s.
- **Two builds can now diverge.** A change that breaks only the static one would not show up in
  `npm run build` or in the suite. The workflow runs the tests before publishing, which is not the
  same as covering the demo transport.
- **No tests for `src/demo/`.** The transport is the one new piece with real logic — the two error
  forms, ragged frames, the stall guard — and it is covered by having been driven by hand in a
  browser. That is the same gap the README lists second in "what's next", one module wider.
- **320px is still unverified**, and the banner is now the tallest thing above the fold.

## How to check

```bash
npm run build && grep -rl "consectetur" dist/assets/   # nothing: no mock in the production bundle
npm run preview:demo                                   # then open the port it prints
```

Grep for the mock's text, the banner's or a fault id — all three are absent from `dist/`. Do not
grep for the group label "Демо — отказы": that string lives in `Composer.tsx`, which always ships,
and the group it names is filtered out when no entry carries the kind. It is in the bundle and
never on the screen. (Written down because the first version of this check used it and reported a
leak that was not one.)

On that page: the banner is the first thing above the navbar; the picker holds two groups, "Демо —
ответы" and "Демо — отказы"; a question streams a lorem answer with markdown in it.

Each failure entry, by selecting it and asking anything:

| Entry | Expected |
|---|---|
| Лимит исчерпан (429) | the `rate_limited` card, counting down from 12, "Перейти на демо" enabled while "Повторить" is not |
| Модель молчит | nothing for six seconds, then the `timeout` card |
| Обрыв связи | half an answer, kept, then `upstream_unavailable` |
| Ошибка посреди ответа | half an answer, kept, then `upstream_error` |

Stop: pick "Lorem — медленный", ask something, press `Esc` mid-answer. The text stops growing and
what arrived stays.
