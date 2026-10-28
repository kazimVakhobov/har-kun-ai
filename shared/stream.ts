import type { ApiError, DoneReason } from './contract.js'

/**
 * What a producer of text is, and the two waits it needs — neither of which
 * knows anything about HTTP.
 *
 * This lives in `shared/` because the mock runs in two places: behind Express
 * on the server, and inside the browser in the static demo build, where there
 * is no server at all (ADR 0018). What stayed on the server is the transport —
 * keepalive, backpressure, the single-settlement rule — because that part is
 * about a socket and only exists where there is one.
 */

/** A failure carrying the contract's error. Where it is caught decides its form. */
export class StreamFailure extends Error {
  constructor(readonly apiError: ApiError) {
    super(apiError.message)
    this.name = 'StreamFailure'
  }
}

export interface StreamContext {
  /** Send one increment and rearm the idle guard. Empty text is ignored. */
  emit(text: string): Promise<void>
  signal: AbortSignal
  /**
   * Cut the connection without a `done`. Only the mock's `drop` mode wants
   * this — it is what a dropped network looks like from the browser. Return
   * `null` afterwards: the response is already settled.
   */
  sever(): void
}

/** Reads the generation. Returns why it ended, or `null` if it settled itself. */
export type Pump = (ctx: StreamContext) => Promise<DoneReason | null>

/** Runs before the stream opens, so it may fail with a status. */
export type Producer = (signal: AbortSignal) => Promise<Pump>

/** Resolves when the request is cancelled or a guard fires. Never on its own. */
export function untilAborted(signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.resolve()

  return new Promise((resolve) => {
    signal.addEventListener('abort', () => resolve(), { once: true })
  })
}

export function delay(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.resolve()

  return new Promise((resolve) => {
    const done = (): void => {
      clearTimeout(timer)
      signal.removeEventListener('abort', done)
      resolve()
    }
    const timer = setTimeout(done, ms)
    signal.addEventListener('abort', done, { once: true })
  })
}
