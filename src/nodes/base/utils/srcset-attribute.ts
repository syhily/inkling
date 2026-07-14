import type { ExportDOMOptions } from '@/nodes/base/export-dom'

import { getAvailableImageWidths } from '@/nodes/base/utils/get-available-image-widths'
import { isLocalContentImage } from '@/nodes/base/utils/is-local-content-image'

// default content sizes: [600, 1000, 1600, 2400]

export interface ImageRenderOptions extends ExportDOMOptions {
  imageOptimization?: {
    srcsets?: boolean
    contentImageSizes?: Record<string, { width: number }>
  }
}

export const getSrcsetAttribute = function ({
  src,
  width,
  options,
  format,
}: {
  src: string
  width: number
  options: ImageRenderOptions
  format?: string
}) {
  if (
    !options.imageOptimization ||
    options.imageOptimization.srcsets === false ||
    !width ||
    !options.imageOptimization.contentImageSizes
  ) {
    return
  }

  if (
    isLocalContentImage(src, options.siteUrl, options.imageBaseUrl) &&
    options.canTransformImage &&
    !options.canTransformImage(src)
  ) {
    return
  }

  const srcsetWidths = getAvailableImageWidths({ width }, options.imageOptimization.contentImageSizes)

  // apply srcset if this is a relative image that matches Inkling's image url structure
  if (isLocalContentImage(src, options.siteUrl, options.imageBaseUrl)) {
    const match = src.match(/(.*\/content\/images)\/(.*)/)
    if (!match) {
      return
    }

    const [, imagesPath, filename] = match
    const srcs: string[] = []

    srcsetWidths.forEach((srcsetWidth) => {
      if (srcsetWidth === width) {
        // use original image path if width matches exactly (avoids 302s from size->original)
        // unless a specific output format was requested
        if (format) {
          srcs.push(`${imagesPath}/size/w${srcsetWidth}/format/${format}/${filename} ${srcsetWidth}w`)
        } else {
          srcs.push(`${src} ${srcsetWidth}w`)
        }
      } else if (srcsetWidth <= width) {
        // avoid creating srcset sizes larger than intrinsic image width
        if (format) {
          srcs.push(`${imagesPath}/size/w${srcsetWidth}/format/${format}/${filename} ${srcsetWidth}w`)
        } else {
          srcs.push(`${imagesPath}/size/w${srcsetWidth}/${filename} ${srcsetWidth}w`)
        }
      }
    })

    if (srcs.length) {
      return srcs.join(', ')
    }
  }
}

export const setSrcsetAttribute = function (
  elem: Element | null,
  image: { src: string; width: number },
  options: ImageRenderOptions,
) {
  if (!elem || !['IMG', 'SOURCE'].includes(elem.tagName) || !elem.getAttribute('src') || !image) {
    return
  }

  const { src, width } = image
  const srcset = getSrcsetAttribute({ src, width, options })

  if (srcset) {
    elem.setAttribute('srcset', srcset)
  }
}
