import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import usePinturaEditor from '@/hooks/usePinturaEditor'

vi.mock('@/utils/analytics', () => ({
  default: vi.fn(),
}))

describe('usePinturaEditor', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
    delete (window as { pintura?: unknown }).pintura
    vi.clearAllMocks()
  })

  it('returns isEnabled false and no error by default', () => {
    const { result } = renderHook(() => usePinturaEditor())

    expect(result.current.isEnabled).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('sets error when the script URL is invalid', async () => {
    const { result } = renderHook(() => usePinturaEditor({ config: { jsUrl: 'not a valid url' } }))

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error)
    })

    expect(result.current.error?.message).toBe('Invalid URL')
  })

  it('sets error when the script import fails', async () => {
    const { result } = renderHook(() => usePinturaEditor({ config: { jsUrl: 'https://example.com/pintura.js' } }))

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error)
    })

    expect(result.current.error?.message).toBe('Failed to load Pintura script from https://example.com/pintura.js')
  })

  it('sets error when the stylesheet fails to load', async () => {
    const { result } = renderHook(() => usePinturaEditor({ config: { cssUrl: 'https://example.com/pintura.css' } }))

    const link = document.querySelector('link[href="https://example.com/pintura.css"]')
    expect(link).not.toBeNull()

    act(() => {
      ;(link as HTMLLinkElement).onerror?.(new Event('error'))
    })

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error)
    })

    expect(result.current.error?.message).toBe('Failed to load Pintura stylesheet from https://example.com/pintura.css')
  })

  it('sets error when the editor emits a loaderror', async () => {
    const loaderrorHandlers: Array<(err: Error) => void> = []
    const mockEditor = {
      on: vi.fn((event: string, handler: (err: Error) => void) => {
        if (event === 'loaderror') {
          loaderrorHandlers.push(handler)
        }
      }),
    }

    window.pintura = {
      openDefaultEditor: vi.fn(() => mockEditor),
    }

    const { result } = renderHook(() =>
      usePinturaEditor({
        config: {
          jsUrl: 'https://example.com/pintura.js',
          cssUrl: 'https://example.com/pintura.css',
        },
      }),
    )

    const link = document.querySelector('link[href="https://example.com/pintura.css"]')
    act(() => {
      ;(link as HTMLLinkElement).onload?.(new Event('load'))
    })

    await waitFor(() => {
      expect(result.current.isEnabled).toBe(true)
    })

    const loadError = new Error('Pintura failed to load image')
    act(() => {
      result.current.openEditor({
        image: 'https://example.com/image.jpg',
        handleSave: vi.fn(),
      })
    })

    act(() => {
      loaderrorHandlers.forEach((handler) => handler(loadError))
    })

    await waitFor(() => {
      expect(result.current.error).toBe(loadError)
    })
  })

  it('removes the capture-phase click listener on unmount', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

    const { unmount } = renderHook(() => usePinturaEditor())

    const clickAddCalls = addEventListenerSpy.mock.calls.filter(
      (call) => call[0] === 'click' && (call[2] as AddEventListenerOptions)?.capture === true,
    )
    expect(clickAddCalls.length).toBe(1)

    unmount()

    const clickRemoveCalls = removeEventListenerSpy.mock.calls.filter(
      (call) => call[0] === 'click' && (call[1] as EventListener) === (clickAddCalls[0][1] as EventListener),
    )
    expect(clickRemoveCalls.length).toBe(1)
    expect((clickRemoveCalls[0][2] as AddEventListenerOptions)?.capture).toBe(true)

    addEventListenerSpy.mockRestore()
    removeEventListenerSpy.mockRestore()
  })
})
