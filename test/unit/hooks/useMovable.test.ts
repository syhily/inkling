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

    const addedTouchstart = addEventListenerSpy.mock.calls.find(
      ([event]) => event === 'touchstart',
    )?.[1] as EventListener
    const addedMousedown = addEventListenerSpy.mock.calls.find(
      ([event]) => event === 'mousedown',
    )?.[1] as EventListener

    expect(addedTouchstart).toBeDefined()
    expect(addedMousedown).toBeDefined()

    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'touchstart',
      addedTouchstart,
      false,
    )
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'mousedown',
      addedMousedown,
      false,
    )
  })
})
