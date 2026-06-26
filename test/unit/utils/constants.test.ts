import { describe, expect, it } from 'vitest'

import { IMAGE_EXTENSIONS } from '@/utils/constants'

describe('constants', () => {
  it('exports the expected image extensions', () => {
    expect(IMAGE_EXTENSIONS).toEqual(['gif', 'jpg', 'jpeg', 'png', 'svg', 'svgz', 'webp'])
  })
})
