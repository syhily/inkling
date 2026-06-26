import { isUnsplashImage } from '@/nodes/base/utils/is-unsplash-image'

describe('Utils: isUnsplashImage', function () {
  it('returns true for unsplash image urls', function () {
    isUnsplashImage('https://images.unsplash.com/photo-123').should.be.true()
    isUnsplashImage('http://images.unsplash.com/photo-123').should.be.true()
  })

  it('returns false for non-unsplash urls', function () {
    isUnsplashImage('https://example.com/image.jpg').should.be.false()
    isUnsplashImage('/content/images/test.jpg').should.be.false()
  })
})
