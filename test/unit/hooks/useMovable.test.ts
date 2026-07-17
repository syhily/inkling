import { render } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import useMovable from '@/hooks/useMovable'

function MovableComponent() {
  const { ref } = useMovable()
  return React.createElement('div', { ref })
}

describe('useMovable', () => {
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    addEventListenerSpy = vi.spyOn(document.body, 'addEventListener')
    removeEventListenerSpy = vi.spyOn(document.body, 'removeEventListener')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('removes start event listeners from document.body on unmount', () => {
    const { unmount } = render(React.createElement(MovableComponent))

    const touchstartCall = addEventListenerSpy.mock.calls.find(
      (call: [string, EventListenerOrEventListenerObject | null, ...unknown[]]) => call[0] === 'touchstart',
    )
    const mousedownCall = addEventListenerSpy.mock.calls.find(
      (call: [string, EventListenerOrEventListenerObject | null, ...unknown[]]) => call[0] === 'mousedown',
    )
    const addedTouchstart = touchstartCall?.[1]
    const addedMousedown = mousedownCall?.[1]

    expect(addedTouchstart).toBeDefined()
    expect(addedMousedown).toBeDefined()

    if (!addedTouchstart || !addedMousedown) {
      throw new Error('Expected movable to register pointer listeners')
    }

    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('touchstart', addedTouchstart, false)
    expect(removeEventListenerSpy).toHaveBeenCalledWith('mousedown', addedMousedown, false)
  })
})
