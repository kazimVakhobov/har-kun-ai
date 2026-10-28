/**
 * Who answers `/api/*`.
 *
 * By default the network: the app talks to its own origin and the server holds
 * the key (ADR 0002). The static demo build has no origin to talk to, so it
 * replaces this with a local implementation before the first render
 * ([ADR 0018](../../docs/adr/0018-static-demo-build.md)).
 *
 * A seam rather than a service worker: the one thing a service worker buys —
 * intercepting requests the page does not know it is making — is worth nothing
 * here, because every request this app makes goes through `runChatStream`,
 * which already takes `fetchImpl` as an argument for its own tests. The cost
 * would have been a second cache and a first load that races its own
 * installation.
 */

let impl: typeof fetch = (...args) => fetch(...args)

/** Called once, before the app renders. Never while a stream is open. */
export function setTransport(next: typeof fetch): void {
  impl = next
}

export const apiFetch: typeof fetch = (...args) => impl(...args)
