/**
 * Build-time constants, replaced by Vite with literals.
 *
 * `__DEMO__` marks the static build published to GitHub Pages, where there is
 * no server and the mock answers in the browser
 * ([ADR 0018](../docs/adr/0018-static-demo-build.md)). It is a `define` rather
 * than a `VITE_` variable on purpose: this project's first rule is that no
 * secret reaches `import.meta.env`, and the rule is easiest to hold when
 * nothing at all is read from there.
 */
declare const __DEMO__: boolean
