# 0021 — The demo moves to har-kun.uz

- **Date:** 2026-10-29
- **Branch:** `master`
- **Status:** done
- **Tools:** Claude Opus 5 in Claude Code, driven by the repository owner; the owner made every DNS
  and GitHub settings change, the agent diagnosed and wrote

## Task

Publish the static demo on the project's own domain, and record what that costs.

The trigger was not taste. Google Safe Browsing had flagged `kazimvakhobov.github.io` — the whole
account subdomain, since `github.io` is on the Public Suffix List and is therefore one site to Safe
Browsing — over a login-page clone in an unrelated repository of the same owner. Every project page
under that account inherits the interstitial, including this one, which has no form, no credential
field and no third-party request anywhere in it. It was flagged by neighbourhood.

## What was done

**The zone was reduced to nine records with one purpose.** It had held the apex and five `dev.*`
names pointing at an unrelated server; the owner wanted the subdomains gone rather than preserved.
What is there now: four `A` at the apex for GitHub's addresses, the `www` `CNAME` to the Pages
host, and nothing else. The `AAAA` records were offered and skipped, which costs only IPv6-only
networks.

**Pages was pointed at `har-kun.uz`** with the source left on GitHub Actions. Worth writing down
because the previous round guessed wrong about it: when a site is published by a workflow, **no
`CNAME` file is needed** — GitHub neither creates nor reads one, and the value lives in the
repository's settings. The suggestion to add `public/CNAME` was withdrawn before anyone acted on
it.

**Links and decisions updated.** Both READMEs point at the domain, say why it is not under
`github.io`, and name the cost. [ADR 0010](../adr/0010-deployment.md) gets the amendment: the
domain it had been holding for the live deployment is now spent on the demo, and Pages gives a
custom domain to one repository at a time.

## Decisions taken

- **The apex rather than a subdomain.** `demo.har-kun.uz` was proposed first and would have left
  the apex free for the Node deployment ADR 0010 describes. The owner chose the apex. What it
  gives up is written in that ADR: the live version will either take it back or settle for a
  subdomain, and the reason it went this way — a Safe Browsing flag on a neighbour — may not
  outlast the month.
- **Delete the `dev.*` records rather than keep them.** They pointed at a server that still exists;
  only the names are gone. The owner asked for a zone that reads at a glance instead of a drawer
  of subdomains.
- **Nothing in the build changed.** `base: './'` was chosen in [ADR 0018](../adr/0018-static-demo-build.md)
  precisely so one artefact works under a project path and under a domain of its own. It did.

## Where the AI got it wrong

- **What it proposed:** adding `public/CNAME` so the custom domain would survive each deployment,
  reasoning from how branch-published Pages sites work.
- **How it was noticed:** reading GitHub's documentation instead of recalling it, one message
  later, while answering the DNS question. For workflow-published sites the file is explicitly
  "ignored and is not required".
- **How it was fixed:** withdrawn in the next message, before the owner had acted on it. Cheap this
  time, and only because the answer was checked against the source rather than written from
  memory — the same lesson as the stale git refs in [0018](0018-demo-mode.md), one layer up.

- **What it proposed:** that the TLS complaint the owner was seeing after the switch might be a
  certificate still being issued — the plausible answer, since GitHub takes up to an hour.
- **How it was noticed:** by checking rather than guessing. From outside, `curl` reported
  `ssl_verify_result = 0`, a certificate with `CN=har-kun.uz` valid into 2027, HTTP/2, and the
  demo's own `<title>`. The site was fine; the browser was not.
- **How it was fixed:** the old server at the previous apex address was asked what certificate it
  presents, and answered `CN=yukmarkaz24.uz` — an unrelated domain. So the browser was still
  resolving the old address out of a cache, getting a certificate for somebody else's site, and
  saying so correctly. Incognito does not clear Chrome's DNS cache, the OS resolver or the socket
  pool, which is why it looked like a server problem. The fix was flushing those.

## What's left

- **The Safe Browsing flag is still on `kazimvakhobov.github.io`** and belongs to a different
  repository. It is being handled there. Until it clears, any link to this project under
  `github.io` shows an interstitial — which is why the README links point at the domain and not at
  the old URL, redirect or no redirect.
- **No `AAAA` records**, by choice. IPv6-only clients cannot reach the site.
- The live deployment still needs rate limiting before it exists at all, and now also needs an
  address decision it did not need before.

## How to check

```bash
dig +short har-kun.uz A          # four 185.199.* addresses
dig +short www.har-kun.uz        # kazimvakhobov.github.io., then the same four
curl -sv https://har-kun.uz/ -o /dev/null 2>&1 | grep -E "subject:|expire date:"
```

Expect `CN=har-kun.uz`. `https://www.har-kun.uz/` answers `301` to the apex, and
`https://kazimvakhobov.github.io/har-kun-ai/` redirects to the domain — though the redirect is no
help to anybody, because Chrome shows the warning before following it.

If a browser disagrees with `curl`, it is the browser: clear the host cache in
`chrome://net-internals/#dns`, flush the socket pools, and on macOS
`sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder`.
