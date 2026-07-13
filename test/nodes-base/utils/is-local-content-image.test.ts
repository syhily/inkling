import { isLocalContentImage } from '@/nodes/base/utils/is-local-content-image'

describe('Utils: isLocalContentImage', function () {
  it('returns true for local content image paths', function () {
    expect(isLocalContentImage('/content/images/test.jpg')).toBe(true)
    expect(isLocalContentImage('__INKLING_URL__/content/images/test.jpg')).toBe(true)
  })

  it('returns true when image path is under a site url', function () {
    expect(isLocalContentImage('https://example.com/content/images/test.jpg', 'https://example.com')).toBe(true)
  })

  it('returns false for external images', function () {
    expect(isLocalContentImage('https://example.com/photos/test')).toBe(false)
    expect(isLocalContentImage('https://example.com/other/images/test.jpg')).toBe(false)
  })

  it('handles trailing slash on site url', function () {
    expect(isLocalContentImage('https://example.com/content/images/test.jpg', 'https://example.com/')).toBe(true)
  })
})
