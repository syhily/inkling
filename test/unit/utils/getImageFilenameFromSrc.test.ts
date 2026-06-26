import { describe, expect, it } from 'vitest'

import { getImageFilenameFromSrc } from '@/utils/getImageFilenameFromSrc'

describe('getImageFilenameFromSrc', () => {
  it('extracts filename from URL pathname', () => {
    expect(getImageFilenameFromSrc('https://example.com/images/photo.jpg')).toBe('photo.jpg')
  })

  it('ignores query string and hash', () => {
    expect(getImageFilenameFromSrc('https://example.com/images/photo.png?w=800#top')).toBe('photo.png')
  })

  it('returns empty string when pathname has no filename', () => {
    expect(getImageFilenameFromSrc('https://example.com/images/')).toBe('')
  })
})
