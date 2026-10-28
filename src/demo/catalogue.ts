import type { ModelInfo, ModelsResponse, SimulateMode } from '../../shared/contract.js'
import { DEFAULT_MODEL, MOCK_MODELS } from '../../shared/mock.js'

/**
 * What the picker offers in the static build, and what each entry does.
 *
 * The failure entries live here and **only** here — not in `shared/mock.ts`,
 * which the server imports. Offering them through the catalogue the server
 * serves would be `?simulate=` with extra steps: a visitor able to order a 429
 * from a real process. Here there is no process. Everything below runs in the
 * browser of whoever selected it, so the worst they can do is show themselves
 * an error card ([ADR 0018](../../docs/adr/0018-static-demo-build.md)).
 */

export interface FaultEntry {
  model: ModelInfo
  /** The base profile it runs, before the fault is applied. */
  base: string
  /** `undefined` means the fault happens before the stream opens. */
  simulate: SimulateMode | undefined
}

const FAULTS: FaultEntry[] = [
  {
    model: {
      id: 'demo/rate-limited',
      name: 'Отказ: лимит исчерпан (429)',
      contextLength: 8192,
      kind: 'fault',
    },
    base: DEFAULT_MODEL,
    // Before the stream: a status and a body, which is the only moment HTTP
    // still allows one. The card that follows counts down from Retry-After.
    simulate: undefined,
  },
  {
    model: {
      id: 'demo/no-answer',
      name: 'Отказ: модель молчит',
      contextLength: 8192,
      kind: 'fault',
    },
    base: DEFAULT_MODEL,
    simulate: 'timeout',
  },
  {
    model: {
      id: 'demo/dropped',
      name: 'Отказ: обрыв связи',
      contextLength: 8192,
      kind: 'fault',
    },
    base: DEFAULT_MODEL,
    simulate: 'drop',
  },
  {
    model: {
      id: 'demo/mid-error',
      name: 'Отказ: ошибка посреди ответа',
      contextLength: 8192,
      kind: 'fault',
    },
    base: DEFAULT_MODEL,
    simulate: 'mid-error',
  },
]

const BY_ID = new Map(FAULTS.map((entry) => [entry.model.id, entry]))

export function faultFor(id: string): FaultEntry | undefined {
  return BY_ID.get(id)
}

export function demoCatalogue(): ModelsResponse {
  return {
    models: [...MOCK_MODELS, ...FAULTS.map((entry) => entry.model)],
    default: DEFAULT_MODEL,
  }
}
