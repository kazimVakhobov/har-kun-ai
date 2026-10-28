# 0017 — The demo producer is selectable beside the live model

- **Status:** accepted
- **Date:** 2026-10-28
- **Relations:** extends [0003](0003-mock-first.md), extends [0010](0010-deployment.md),
  extended by [0018](0018-static-demo-build.md)

## Context

The repository is going public as portfolio work, with a deployment to follow
([0010](0010-deployment.md)). That changes who sends the requests. Until now the only person
running this held the key and spent their own quota; on a public URL every visitor spends the
operator's, and OpenRouter's free tier is small enough that it matters:

| Account | Per minute | Per day |
|---|---|---|
| no credits purchased | 20 | 50 |
| $10+ purchased, all time | 20 | 1000 |

Failed attempts count against the daily figure too. Fifty requests is an afternoon of mild
interest, after which every visitor gets a 429 — and 429 is the one state this project handles
most carefully, which does not help, because a reviewer who sees nothing but the error card has
not seen the thing at all.

The mock already answers this and has from the beginning ([0003](0003-mock-first.md)): it streams
in varying chunks, splits SSE frames mid-event, sometimes writes markdown, and costs nothing
because there is no upstream. It was built as a development tool — the server picks it when there
is no key — and the client was deliberately kept ignorant of it (commit `9ac47e7` removed the only
affordance that knew, the one forwarding `?simulate=`).

So the capability exists and is unreachable in exactly the situation that now needs it: a
configured server whose quota is spent for the day.

## Decision

**The demo profiles become selectable per request, through the model id.**

- `GET /api/models` returns live and demo entries in one list, demo last, each carrying
  `kind: 'live' | 'demo'`. With no key there are no live entries, which is itself the honest
  answer to what that server can do.
- `POST /api/chat` routes on the id: a demo id is served by the local producer even when a key is
  configured. Without a key everything is served locally, as before.
- The client reads `kind` and groups the existing picker in the composer. No new control and
  nothing in the navbar, which stays empty by `docs/ui-structure.md`.
- The 429 card offers the demo as an action, because that is the moment the offer is useful.
- A caption under the composer says what the demo is, so nobody mistakes lorem ipsum for a model's
  answer.

**`?simulate=` is not reopened.** Choosing who generates and ordering a failure are different
powers: the first spends nothing and reveals nothing, the second lets a visitor make the server
report errors it did not have. The fault injection stays gated on `NODE_ENV !== 'production'`.

The live model remains the default where there is a key. A visitor should meet the real thing
first; the demo is what the interface falls back to, not what it opens on.

## Consequences

- A spent quota stops being a dead end. The streaming, Stop, markdown and error handling are all
  demonstrable on a day OpenRouter will not answer, which is most of what the deployment exists to
  show.
- **The mock is now reachable in production**, which it was not before. It costs no quota and talks
  to nothing, so the exposure is CPU and an open socket for the length of one answer — real, and
  bounded by the rate limiting [0010](0010-deployment.md) already requires before shipping. That
  requirement is unchanged by this: demo mode is not a substitute for it, because a visitor can
  still choose a live model.
- **`model` in the contract now carries routing meaning**, not just a name passed upstream. That is
  a wider job for one string, and the compensation is that the client never pattern-matches on it:
  `kind` comes from the server, and which ids are demo stays the server's business.
- Two lists have to agree — what the picker offers and what the router recognises. A model in one
  and not the other is either an option that reaches OpenRouter with an invented id or a profile
  nobody can select. Hence the invariant test in `server/mock.test.ts`.
- The picker is no longer a list of models but a list of two kinds of thing, which is more to read
  in a control that was a plain select. Accepted because the alternative — a mode switch somewhere
  above — is a second control answering the same question, "who answers this".
- A visitor can now put lorem ipsum in their conversation on purpose. The caption and the group
  label are the whole defence, and they are enough: nothing is lost if they do.
