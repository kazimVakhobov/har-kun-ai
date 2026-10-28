# 0020 — The browser tab: a name and an icon

- **Date:** 2026-10-28
- **Branch:** `feat/pages-demo`
- **Status:** done
- **Tools:** Claude Opus 5 in Claude Code, driven by the repository owner; Chrome for the check

## Task

The owner asked for a favicon and for the tab to be titled "Har Kun AI".

[ADR 0001](../adr/0001-project-name.md) names the browser tab as one of the three places the
project's name appears, so this is a detail inside a decision that already exists rather than a new
one — appended there as an amendment, like the capitalisation change before it.

## What was done

- **`<title>` is now `Har Kun AI`.** It said "Har Kun — помощник на каждый день", which at tab
  width is cut off long before "помощник" — a tagline doing its job badly. The full product name
  is also the repository's and the domain's, and it is the one spelling that says what the thing is
  to somebody reading a list of twenty tabs. The mark on screen stays **Har Kun**.
- **`public/favicon.svg`** — the interface's own motif: an accent spine with three lines of text
  beside it, tapering the way a last line does, which is exactly how the screen draws a model's
  answer. One file, sharp at every size.
- **`theme-color`**, so the platforms that tint their chrome do not frame a dark interface in
  white.
- Both builds verified: Vite rewrites the reference to `./favicon.svg` under the demo's relative
  base and `/favicon.svg` in the normal build, and the file lands in both outputs.

## Decisions taken

- **The answer's spine rather than a monogram or a sun.** "HK" says nothing and reads as noise at
  16px; the day scale, the other candidate from the identity, is a hairline rule that disappears
  at that size. The spine motif survives because it is two shapes and one accent, and it is the
  thing a reader of this app has already been looking at.
- **SVG only, no PNG or ICO fallback.** It appears in exactly one place. A browser that cannot
  read an SVG icon falls back to its own default, which is a plain page glyph — not a broken
  image. The alternative is a second artefact to regenerate whenever the first one changes.
- **Hex in the file, documented as the one place it is allowed.** A favicon never sees the page's
  custom properties, so `var(--color-accent)` there resolves to nothing. It is listed in
  `docs/design-system.md` as an extension and named in `CLAUDE.md`'s rule about values, with the
  duty attached: change a token, change that file in the same commit.
- **Appended to ADR 0001 rather than written as a new ADR.** The tab was already in its context
  section; what changed is what is written there, not whether the project has a name.

## Where the AI got it wrong

- **What it proposed:** an SVG whose comment explained that the three literals are `--color-bg`,
  `--color-accent` and `--color-text`.
- **How it was noticed:** the icon rendered as a broken-image glyph at every size on a test page
  built for exactly this — the file at 16, 24, 32, 64 and 128px, and once on white. `curl` had
  already said `200 image/svg+xml`, which is the trap: the file was served perfectly and was not
  drawable. **A double hyphen is illegal inside an XML comment**, so writing a CSS custom property
  name in one makes the document malformed.
- **How it was fixed:** the comment names the tokens in prose instead, and says why. The check
  that caught it is worth keeping as a habit: render the icon at the sizes it will actually be
  used at, rather than confirming the request succeeded.

## What's left

Nothing in this task. The icon is one file and has no fallback by decision, not by omission.

## How to check

```bash
npm run build && ls dist/favicon.svg
npm run build:demo && grep -o 'rel="icon"[^>]*' dist-demo/index.html   # href="./favicon.svg"
python3 -c "import xml.dom.minidom; xml.dom.minidom.parse('public/favicon.svg')"   # parses
```

In a browser, the tab reads "Har Kun AI" and carries the icon. To judge the artwork rather than
the plumbing, put it on a page at 16px — a favicon that only works at 128 is a favicon that does
not work.

## A second mistake, found while committing this one

`dist-demo/` — 38 files of build output, fonts included — was committed in `b753671`. The order
was wrong: the demo was built, then committed with `git add -A`, and only afterwards did
`.gitignore` learn about the directory. `dist/` had been ignored since the scaffold, so the habit
that should have caught it was "add the ignore rule when you add the output", not "check `git
status` carefully".

Untracked now, in the commit that fixes it. The blobs stay in the branch's history — roughly a
megabyte of fonts and bundles that nothing will ever read — and removing them means rewriting
`b753671` and force-pushing a branch that is published but not yet merged. That is the owner's
call, which is why it is written here rather than done.

**Correction, an hour later.** The owner chose to clean it rather than live with it, so the
paragraph above is now wrong about the outcome and is left standing because it was true when
written. `git filter-branch --index-filter` over the three commits of this branch removed the
directory from every tree in it; the final tree hash is byte-identical to what it was before the
rewrite, which is the check that matters — only history moved, nothing on disk did. The three
commits have new hashes, and `b753671`, named in the paragraph above and in a commit message, is
no longer a commit that exists.

What it cost: a published branch was rewritten and force-pushed. That is safe here for exactly one
reason — nobody else has it checked out — and it is the reason worth remembering, because it is
the thing that stops being true the moment a second person pulls.
