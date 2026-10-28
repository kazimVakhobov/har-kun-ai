import type { Response } from 'express'

/**
 * Writing SSE onto an Express response. The frames themselves are built in
 * `shared/sse.ts`, beside the parser that reads them — they are the same
 * grammar seen from two ends, and the browser demo builds them too (ADR 0018).
 */

/** A keepalive comment. The client parser must ignore such lines. */
export const KEEPALIVE = ':\n\n'

export function openStream(res: Response): void {
  res.status(200)
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()
}

/**
 * A write that respects backpressure: while the socket buffer is full, wait for
 * `drain`. It also resolves on `close` — otherwise on a broken connection the
 * promise would hang forever, and the generation loop with it.
 */
export function write(res: Response, chunk: string): Promise<void> {
  if (res.writableEnded || res.destroyed) return Promise.resolve()

  return new Promise((resolve) => {
    if (res.write(chunk)) {
      resolve()
      return
    }

    const finish = (): void => {
      res.off('drain', finish)
      res.off('close', finish)
      resolve()
    }

    res.once('drain', finish)
    res.once('close', finish)
  })
}
