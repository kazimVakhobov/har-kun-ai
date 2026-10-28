# 0010 — Deployment: an optional last step

- **Status:** accepted
- **Date:** 2026-09-29
- **Relations:** extended by [0017](0017-demo-mode-beside-the-live-model.md),
  [0018](0018-static-demo-build.md)

## Context

The assignment does not ask for a deployment: submission is a public GitHub repository, review
happens locally, and the README is required to explain how to run it in five minutes.

At the same time the author owns **har-kun.uz** ([0001](0001-project-name.md)), and a live link
noticeably lowers the barrier for a reviewer: looking at a working chat is easier than cloning a
repository and obtaining an OpenRouter key.

The assignment's budget is 2–6 hours. Deployment, a domain and HTTPS are not in that budget and
easily eat an hour better spent on edge handling.

## Decision

Deployment happens **last, and only if time is left**. Its priority is below everything else: a
working local run matters more than a live link, because the local run is what the assignment
actually requires.

If the step happens:

- build with `npm run build`, static files served by the same Express server that holds `/api`
  (a separate static host is impossible: the key lives on the server, see
  [0002](0002-api-key-on-server.md));
- `OPENROUTER_API_KEY` comes from the server's environment, not from a file in the repository;
- a public deployment requires rate limiting and a cap on history length: an open proxy to an LLM
  without them is somebody else's free API at the key owner's expense;
- the `?simulate=` fault injection is off — it only works when `NODE_ENV !== 'production'`.

If the step does not happen, the README says so in words, as the assignment permits.

## Consequences

- The main work does not depend on infrastructure: missing the deployment does not hurt the
  submission.
- A live link, if it exists, is a bonus rather than an obligation.
- A public deployment means public quota spending. Rate limiting is therefore not a "what's next"
  item but a precondition for shipping: without it, do not ship.
- Until there is a deployment, the only way to see the project is to run it locally. Mitigated by
  phases 1 and 2 running without a key at all ([0003](0003-mock-first.md)): `npm install &&
  npm run dev` is enough.

## Amendment, 2026-10-29

The domain is no longer waiting: **har-kun.uz serves the static demo**
([0018](0018-static-demo-build.md)), on GitHub Pages, over a certificate GitHub issues and renews.
The apex and `www` both resolve there; the five `dev.*` records that used to point at a different
server were removed, so the zone is nine records with one purpose.

This is not the deployment the decision above describes. That one is a Node process holding a key,
and it still needs what this ADR made a precondition — rate limiting before anything public. What
changed is only which address the demo lives at.

The reason it went to the apex rather than a subdomain is unpleasant and worth recording: Google
Safe Browsing had flagged `kazimvakhobov.github.io` — the whole account subdomain, because
`github.io` sits on the Public Suffix List — over a login-page clone in an unrelated repository of
the same owner. Every project page under that account inherits the warning, including this one,
which contains no form, no credential field and no third-party host. A domain of our own is a
different site to Safe Browsing, so the link works while that is sorted out separately.

**The cost, stated plainly: Pages gives a custom domain to one repository at a time.** The apex is
now spent on a demo that cannot show a model. When the live deployment happens it either takes the
apex back — removing it here, and the demo returns to a URL under a flagged host — or it goes to a
subdomain and the apex keeps pointing at the lesser of the two. Neither is free, and the choice
was made for a reason that may not outlast the week: the flag.
