import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('ctrlOrCmd', () => {
  const originalNavigator = globalThis.navigator

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
    })
  })

  it("returns 'Cmd' on macOS", async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
      configurable: true,
    })
    const { default: ctrlOrCmd } = await import('@/utils/ctrlOrCmd')
    expect(ctrlOrCmd).toBe('Cmd')
  })

  it("returns 'Ctrl' on non-macOS", async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      configurable: true,
    })
    const { default: ctrlOrCmd } = await import('@/utils/ctrlOrCmd')
    expect(ctrlOrCmd).toBe('Ctrl')
  })
})
