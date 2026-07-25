import { createRenderContext } from '@/nodes/base/render-context'
import { applyEmailImageAttributes } from '@/nodes/base/utils/render-helpers/email-image'

const options = {
  imageOptimization: {
    contentImageSizes: {
      w600: { width: 600 },
      w1000: { width: 1000 },
      w1600: { width: 1600 },
      w2400: { width: 2400 },
    },
  },
  canTransformImage: () => true,
}

const context = createRenderContext(options)

function createImg(src: string) {
  const img = document.createElement('img')
  img.setAttribute('src', src)
  return img
}

describe('applyEmailImageAttributes', function () {
  it('does not clamp an image exactly at the 600px template width', function () {
    const src = '/content/images/2024/04/example.jpg'
    const img = createImg(src)

    applyEmailImageAttributes(img, { src, width: 600, height: 400 }, context)

    // boundary pin: width === 600 already fits the template column, so the
    // dimensions pass through unclamped (the `>` reading, not `>=`)
    expect(img.getAttribute('width')).toBe('600')
    expect(img.getAttribute('height')).toBe('400')
    expect(img.getAttribute('src')).toBe(src)
  })

  it('clamps wider images to the template width and rewrites to a retina src', function () {
    const src = '/content/images/2024/04/example.jpg'
    const img = createImg(src)

    applyEmailImageAttributes(img, { src, width: 2000, height: 1600 }, context)

    expect(img.getAttribute('width')).toBe('600')
    expect(img.getAttribute('height')).toBe('480')
    // next available size at or above 2x600 is w1600
    expect(img.getAttribute('src')).toBe('/content/images/size/w1600/2024/04/example.jpg')
  })

  it('keeps smaller images at their original dimensions and src', function () {
    const src = '/content/images/2024/04/example.jpg'
    const img = createImg(src)

    applyEmailImageAttributes(img, { src, width: 300, height: 800 }, context)

    expect(img.getAttribute('width')).toBe('300')
    expect(img.getAttribute('height')).toBe('800')
    expect(img.getAttribute('src')).toBe(src)
  })

  it('clamps without a src rewrite when the next retina size is the original width', function () {
    const src = '/content/images/2024/04/example.jpg'
    const img = createImg(src)

    applyEmailImageAttributes(img, { src, width: 1200, height: 600 }, context)

    expect(img.getAttribute('width')).toBe('600')
    expect(img.getAttribute('height')).toBe('300')
    expect(img.getAttribute('src')).toBe(src)
  })

  it('clamps without a src rewrite when the image cannot be transformed', function () {
    const src = '/content/images/2024/04/example.jpg'
    const img = createImg(src)
    const noTransformContext = createRenderContext({ ...options, canTransformImage: () => false })

    applyEmailImageAttributes(img, { src, width: 2000, height: 1600 }, noTransformContext)

    expect(img.getAttribute('width')).toBe('600')
    expect(img.getAttribute('height')).toBe('480')
    expect(img.getAttribute('src')).toBe(src)
  })

  it('clamps without a src rewrite for non-local images', function () {
    const src = 'https://example.com/external.jpg'
    const img = createImg(src)

    applyEmailImageAttributes(img, { src, width: 2000, height: 1600 }, context)

    expect(img.getAttribute('width')).toBe('600')
    expect(img.getAttribute('height')).toBe('480')
    expect(img.getAttribute('src')).toBe(src)
  })

  it('clamps without a src rewrite when no contentImageSizes are configured', function () {
    const src = '/content/images/2024/04/example.jpg'
    const img = createImg(src)
    const noSizesContext = createRenderContext({ canTransformImage: () => true })

    applyEmailImageAttributes(img, { src, width: 2000, height: 1600 }, noSizesContext)

    expect(img.getAttribute('width')).toBe('600')
    expect(img.getAttribute('height')).toBe('480')
    expect(img.getAttribute('src')).toBe(src)
  })
})
