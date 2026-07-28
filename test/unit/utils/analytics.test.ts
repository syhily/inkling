import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import trackEvent, { setTelemetryHandler } from '@/utils/analytics'

describe('the telemetry channel', () => {
  let restore: () => void

  beforeEach(() => {
    ;(window as { plausible?: unknown }).plausible = undefined
    ;(window as { posthog?: unknown }).posthog = undefined
    restore = setTelemetryHandler(undefined)
  })

  afterEach(() => {
    restore()
    vi.restoreAllMocks()
  })

  describe('the default adapter', () => {
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

  describe('the host port', () => {
    it('routes events to the host handler instead of the vendors', () => {
      const hostHandler = vi.fn()
      const plausible = vi.fn()
      window.plausible = plausible as unknown as typeof window.plausible
      restore()
      restore = setTelemetryHandler(hostHandler)

      trackEvent('test-event', { foo: 'bar' })

      expect(hostHandler).toHaveBeenCalledWith('test-event', { foo: 'bar' })
      expect(plausible).not.toHaveBeenCalled()
    })

    it('restores the default adapter on teardown', () => {
      const hostHandler = vi.fn()
      const plausible = vi.fn()
      window.plausible = plausible as unknown as typeof window.plausible
      const restoreHost = setTelemetryHandler(hostHandler)

      restoreHost()
      trackEvent('test-event', { foo: 'bar' })

      expect(plausible).toHaveBeenCalled()
    })
  })
})
