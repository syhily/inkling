import { render } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'

import { UnsplashSearchModal } from '@/unsplash/UnsplashSearchModal'

describe('UnsplashSearchModal', () => {
  it('registers and unregisters the same scroll handler reference', () => {
    const addEventListenerSpy = vi.spyOn(EventTarget.prototype, 'addEventListener')
    const removeEventListenerSpy = vi.spyOn(EventTarget.prototype, 'removeEventListener')

    const { unmount } = render(
      <UnsplashSearchModal onClose={() => {}} onImageInsert={() => {}} unsplashProviderConfig={null} />,
    )

    const scrollAdds = addEventListenerSpy.mock.calls.filter(([event]) => event === 'scroll')
    expect(scrollAdds.length).toBeGreaterThanOrEqual(1)
    const registeredHandler = scrollAdds[scrollAdds.length - 1]![1]
    expect(typeof registeredHandler).toBe('function')

    unmount()

    const scrollRemoves = removeEventListenerSpy.mock.calls.filter(([event]) => event === 'scroll')
    expect(scrollRemoves.length).toBeGreaterThanOrEqual(1)
    expect(scrollRemoves[scrollRemoves.length - 1]![1]).toBe(registeredHandler)

    addEventListenerSpy.mockRestore()
    removeEventListenerSpy.mockRestore()
  })
})
