import { describe, expect, it, vi } from 'vitest'

import { openFileSelection } from '@/utils/openFileSelection'

describe('openFileSelection', () => {
  it('clicks the file input when a ref is present', () => {
    const input = document.createElement('input')
    input.click = vi.fn()

    openFileSelection({ fileInputRef: { current: input } })

    expect(input.click).toHaveBeenCalledTimes(1)
  })

  it('does nothing when the ref is empty', () => {
    expect(() => openFileSelection({ fileInputRef: { current: null } })).not.toThrow()
  })
})
