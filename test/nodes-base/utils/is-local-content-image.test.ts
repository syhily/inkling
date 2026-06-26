import { isLocalContentImage } from '@/nodes/base/utils/is-local-content-image'

describe('Utils: isLocalContentImage', function () {
  it('returns true for local content image paths', function () {
    isLocalContentImage('/content/images/test.jpg').should.be.true()
    isLocalContentImage('__INKLING_URL__/content/images/test.jpg').should.be.true()
  })

  it('returns true when image path is under a site url', function () {
    isLocalContentImage('https://example.com/content/images/test.jpg', 'https://example.com').should.be.true()
  })

  it('returns false for external images', function () {
    isLocalContentImage('https://unsplash.com/photos/test').should.be.false()
    isLocalContentImage('https://example.com/other/images/test.jpg').should.be.false()
  })

  it('handles trailing slash on site url', function () {
    isLocalContentImage('https://example.com/content/images/test.jpg', 'https://example.com/').should.be.true()
  })
})
