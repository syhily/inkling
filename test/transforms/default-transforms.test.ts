import { describe, expect, it } from 'vitest'

import { registerDefaultTransforms } from '@/transforms/default-transforms'

describe('default-transforms', () => {
  it('exports a registerDefaultTransforms function', () => {
    expect(typeof registerDefaultTransforms).toBe('function')
  })
})
