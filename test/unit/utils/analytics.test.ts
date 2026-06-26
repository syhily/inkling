import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import trackEvent from '@/utils/analytics'

describe('trackEvent', () => {
  beforeEach(() => {
    ;(window as { plausible?: unknown }).plausible = undefined
    ;(window as { posthog?: unknown }).posthog = undefined
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls plausible when available', () => {
    const plausible = vi.fn()
    window.plausible = plausible as unknown as typeof window.plausible

    trackEvent('test-event', { foo: 'bar' })

    expect(plausible).toHaveBeenCalledWith('test-event', { props: { foo: 'bar' } })
  })

  it('falls back to a queueing function when plausible is missing', () => {
    trackEvent('test-event', { foo: 'bar' })

    expect(typeof window.plausible).toBe('function')
    expect((window.plausible as { q?: unknown[] }).q).toHaveLength(1)
  })

  it('calls posthog.capture when available', () => {
    const capture = vi.fn()
    window.posthog = { capture } as unknown as typeof window.posthog

    trackEvent('test-event', { foo: 'bar' })

    expect(capture).toHaveBeenCalledWith('test-event', { foo: 'bar' })
  })
})
