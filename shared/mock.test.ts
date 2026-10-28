import { describe, expect, it } from 'vitest'
import { MOCK_MODELS, isDemoModel, profileFor } from './mock.js'

/**
 * The demo profiles are offered next to the live catalogue and routed away from
 * the upstream by their id alone (ADR 0017). That makes two lists — what the
 * picker shows and what the router recognises — and a model in one but not the
 * other is the failure this guards: either an option that reaches OpenRouter
 * with an id it has never heard of, or a local profile nobody can select.
 */

describe('the demo catalogue', () => {
  it('offers exactly the profiles the router recognises', () => {
    for (const model of MOCK_MODELS) {
      expect(isDemoModel(model.id), model.id).toBe(true)
    }
  })

  it('answers every offered id with its own profile rather than the default', () => {
    // Four entries that behaved identically would be a picker that lies about
    // having a choice. Each one has to differ from the plain profile.
    const plain = profileFor('mock/lorem:free')
    const others = MOCK_MODELS.filter((model) => model.id !== 'mock/lorem:free')

    for (const model of others) {
      expect(profileFor(model.id), model.id).not.toEqual(plain)
    }
  })

  it('marks them all as demo, which is what the picker groups on', () => {
    expect(MOCK_MODELS.every((model) => model.kind === 'demo')).toBe(true)
  })

  it('does not claim a live model', () => {
    expect(isDemoModel('google/gemma-4-31b-it:free')).toBe(false)
    expect(isDemoModel('mock/lorem')).toBe(false)
    expect(isDemoModel('')).toBe(false)
  })
})
