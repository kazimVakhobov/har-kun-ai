# 0018 — A static build that answers from the browser

- **Status:** accepted
- **Date:** 2026-10-28
- **Relations:** extends [0017](0017-demo-mode-beside-the-live-model.md), extends
  [0010](0010-deployment.md)

## Context

The project needs a link. It is portfolio work now, and a repository is a worse first impression
than a working page — [0010](0010-deployment.md) said as much a month before any of this.

GitHub Pages is free, instant and already attached to the repository. It also runs nothing: it
serves files. This project's architecture is the opposite of that by design — `/api/chat` is a
process holding a key ([0002](0002-api-key-on-server.md)), and the browser talks only to its own
origin. Put `dist/` on Pages unchanged and the result is a page that renders beautifully, fails
`GET /api/models` into a 404 HTML document, disables its own picker and turns the first question
into an error card.

The alternative is a host that runs Node. Current free tiers make that a worse deal than it
sounds: the one that is genuinely free sleeps after fifteen minutes and wakes in thirty to sixty
seconds, which on a portfolio link means a recruiter staring at nothing — for an app whose whole
argument is that no state is ever a dead wait.

Meanwhile [0017](0017-demo-mode-beside-the-live-model.md) had just established that the mock is a
product surface and not only a development tool. And the mock needs no server at all. It is text,
timers and an abort signal.

## Decision

**The static build replaces the transport, not the architecture.**

- `runChatStream` already takes `fetchImpl` — an argument that exists so its branches are testable
  without a server. The demo build passes a `fetch`-shaped function that serves `/api/models` from
  a local catalogue and streams `/api/chat` out of the same mock, into a `ReadableStream`.
- Everything downstream is unchanged and unaware: a real `Response` with a real body, read with
  `getReader()`, parsed by `shared/sse.ts` out of frames that arrive cut in half, cancelled on
  Stop. The code demonstrated is the code that ships.
- `shared/` gains the mock and the producer types; `server/stream.ts` keeps the transport. The line
  is whether a thing needs a socket: keepalive against proxies, backpressure, a status that cannot
  change after headers — those stay on the server.
- A banner across the top says what the page is and how to run the real thing. It is not
  dismissible.
- `__DEMO__` is a Vite `define`, not a `VITE_` variable. The project's first rule is that no secret
  reaches `import.meta.env`, and the rule is easiest to hold when nothing at all is read from
  there.
- `base: './'`, so one output works under `user.github.io/har-kun-ai/` and under a domain of its
  own without rebuilding.

**The picker gains a third group: deliberate failures.** A 429, a silence, a dropped connection, an
error mid-answer. They live in `src/demo/`, never in `shared/mock.ts`, and therefore never in
anything the server serves — offered by a real process they would be `?simulate=` with extra steps,
which [0017](0017-demo-mode-beside-the-live-model.md) refused. Here the producer runs in the
browser of whoever selected it, so the worst an entry can do is show its chooser an error card.
Edge handling is the assignment's first grading criterion; without this it is the one thing a link
cannot show.

**Not a service worker.** The only thing one buys is intercepting requests the page does not know
it is making, and there are none — every request goes through that one argument. The cost would
have been a second cache to reason about and a first load that races its own installation.

## Consequences

- There is a link, it is free, it never sleeps, and it cannot run out of quota. For the mechanics
  the assignment grades first — streaming, Stop, the failure states, markdown — it shows all of
  them.
- **It cannot show a model.** Not a limitation of the build but its premise: no key is involved, so
  nothing can answer except the mock. Whoever wants the real thing clones and runs it, which the
  banner and the README say in as many words. If a live link is ever wanted too, that is a Node
  host and this decision does not block it.
- **The contract gained `fault`, a kind the server never emits.** A build-only concept in a shared
  file is a smell, and the defence is that the failure *modes* were already there —
  `SIMULATE_MODES` has been in `shared/contract.ts` since the mock existed. What is new is naming
  them in the catalogue.
- **The mock is now shipped to browsers**, which means its text, its timings and its fault logic
  are public. They always were — the repository is public — but it is worth saying that the demo
  bundle is 8 kB larger for it, and that the production build contains none of it, which is
  checked by grep rather than assumed.
- **Two builds to keep working.** `npm run build` and `npm run build:demo` can now diverge: a
  change that only breaks the demo would not show up in the normal build or in the tests. The
  workflow runs the suite before publishing, which is not the same as covering it.
- A visitor can put lorem ipsum, and now also a deliberate error, into their own conversation. The
  banner and the group label are the whole defence, and they are enough.
