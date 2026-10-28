import {
  ERROR_STATUS,
  type ApiError,
  type ChatRequest,
  type ErrorResponse,
} from '../../shared/contract.js'
import { deltaFrame, doneFrame, errorFrame } from '../../shared/sse.js'
import { mockProducer } from '../../shared/mock.js'
import type { StreamContext } from '../../shared/stream.js'
import { demoCatalogue, faultFor } from './catalogue.js'

/**
 * `/api` without an api: the same mock that built this interface, running in
 * the visitor's browser and writing the same SSE frames into a `ReadableStream`
 * ([ADR 0018](../../docs/adr/0018-static-demo-build.md)).
 *
 * Nothing downstream can tell the difference, and that is the point: the client
 * gets a real `Response` with a real body, so `runChatStream` does its real
 * work — reads with `getReader()`, parses frames that arrive cut in half,
 * cancels the reader on Stop, counts its own stall guards.
 *
 * This is **not** a second copy of `server/stream.ts`. Most of that file exists
 * to survive HTTP — keepalive against proxies that cut idle connections,
 * backpressure on a socket, a status that cannot be changed once headers are
 * sent. Here there is no socket and no proxy. What is reproduced is what a
 * client can observe: the two error forms, ragged frames, and a stall guard,
 * because the silent model has to end in something.
 */

/** Shorter than the server's 30 s: nobody waits half a minute to see a state. */
const STALL_MS = 6_000

/** The server writes one every 15 s. Here it is proof the parser ignores them. */
const KEEPALIVE_MS = 2_000

const KEEPALIVE = ':\n\n'

const RATE_LIMITED: ApiError = {
  code: 'rate_limited',
  message: 'Бесплатная модель сейчас занята. Попробуйте позже или смените модель.',
  retryAfter: 12,
}

export function createDemoFetch(): typeof fetch {
  return (input, init) => {
    const url = urlOf(input)

    if (url.pathname.endsWith('/api/models')) return Promise.resolve(json(demoCatalogue()))
    if (url.pathname.endsWith('/api/chat')) return Promise.resolve(chat(init))

    return Promise.resolve(new Response(null, { status: 404 }))
  }
}

function chat(init: RequestInit | undefined): Response {
  const request = readRequest(init)
  const fault = request.model === undefined ? undefined : faultFor(request.model)

  // A failure before the first byte is the only one that can still be a status.
  if (fault !== undefined && fault.simulate === undefined) {
    return errorResponse(RATE_LIMITED)
  }

  const model = fault?.base ?? request.model ?? ''
  const produce = mockProducer(model, fault?.simulate)

  const abort = new AbortController()
  init?.signal?.addEventListener('abort', () => abort.abort(), { once: true })

  const stream = new ReadableStream<Uint8Array>({
    start: (controller) => {
      void run(controller, model, produce, abort)
    },
    // The reader was cancelled — Stop, or the client's own guard. Either way
    // the generation has no one left to write to.
    cancel: () => abort.abort(),
  })

  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
  })
}

async function run(
  controller: ReadableStreamDefaultController<Uint8Array>,
  model: string,
  produce: ReturnType<typeof mockProducer>,
  abort: AbortController,
): Promise<void> {
  const encoder = new TextEncoder()
  const { signal } = abort

  let settled = false
  let sawFirstToken = false
  let chars = 0
  let stallTimer: ReturnType<typeof setTimeout> | undefined

  const push = (frame: string): void => {
    if (settled) return
    try {
      controller.enqueue(encoder.encode(frame))
    } catch {
      // The reader is gone. Nothing to report it to.
      settled = true
    }
  }

  const keepalive = setInterval(() => push(KEEPALIVE), KEEPALIVE_MS)

  const cleanup = (): void => {
    settled = true
    clearInterval(keepalive)
    clearTimeout(stallTimer)
    abort.abort()
  }

  const settle = (frame: string): void => {
    if (settled) return
    const encoded = encoder.encode(frame)
    cleanup()
    try {
      controller.enqueue(encoded)
      controller.close()
    } catch {
      // Already closed by a cancelled reader.
    }
  }

  /**
   * Only a delta rearms it. A keepalive keeps a connection alive, not a
   * generation — the same rule the client applies to our own stream.
   */
  const armStall = (): void => {
    clearTimeout(stallTimer)
    stallTimer = setTimeout(() => {
      settle(
        errorFrame({
          code: 'timeout',
          message: sawFirstToken
            ? 'Модель перестала отвечать на середине ответа.'
            : 'Модель не ответила за отведённое время.',
        }),
      )
    }, STALL_MS)
  }

  armStall()

  const ctx: StreamContext = {
    signal,
    emit: (text: string) => {
      if (settled || signal.aborted || text === '') return Promise.resolve()

      pushRagged(push, deltaFrame({ text }))
      chars += text.length
      sawFirstToken = true
      armStall()
      return Promise.resolve()
    },
    // What a dropped network looks like: the body ends with no `done`. The
    // client reports a lost connection and keeps the text it already has.
    sever: () => {
      if (settled) return
      cleanup()
      try {
        controller.error(new Error('connection lost'))
      } catch {
        // Already gone.
      }
    },
  }

  try {
    const pump = await produce(signal)
    const reason = await pump(ctx)
    if (reason !== null) settle(doneFrame({ reason, model, chars }))
  } catch (error) {
    settle(errorFrame(toApiError(error)))
  }
}

/**
 * Cut some frames in half before enqueueing. TCP boundaries do not line up with
 * event boundaries, and a parser that assumes they do breaks only in
 * production — so the demo splits them on purpose, exactly as the mock server
 * does.
 */
function pushRagged(push: (frame: string) => void, frame: string): void {
  if (frame.length < 8 || Math.random() > 0.3) {
    push(frame)
    return
  }

  const cut = 1 + Math.floor(Math.random() * (frame.length - 2))
  push(frame.slice(0, cut))
  push(frame.slice(cut))
}

function toApiError(error: unknown): ApiError {
  const failure = error as { apiError?: ApiError }
  if (failure.apiError !== undefined) return failure.apiError
  return { code: 'internal', message: 'Не удалось получить ответ модели.' }
}

function readRequest(init: RequestInit | undefined): Partial<ChatRequest> {
  if (typeof init?.body !== 'string') return {}
  try {
    return JSON.parse(init.body) as Partial<ChatRequest>
  } catch {
    return {}
  }
}

function urlOf(input: RequestInfo | URL): URL {
  const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  return new URL(raw, window.location.href)
}

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

function errorResponse(error: ApiError): Response {
  const body: ErrorResponse = { error }
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (error.retryAfter !== undefined) headers['Retry-After'] = String(error.retryAfter)

  return new Response(JSON.stringify(body), { status: ERROR_STATUS[error.code], headers })
}
