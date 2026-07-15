import type { ExportDOMOptions } from '@/nodes/base/export-dom'
import type { RenderContext } from '@/nodes/base/render-context'

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
  context,
}: {
  src: string
  width: number
  options: ImageRenderOptions
  format?: string
  context?: RenderContext
}) {
  if (
    !options.imageOptimization ||
    options.imageOptimization.srcsets === false ||
    !width ||
    !options.imageOptimization.contentImageSizes
  ) {
    return
  }

  // Renderers pass the render context so the local-content check reads
  // siteUrl/imageBaseUrl from the context; direct callers without a context
  // keep the legacy options forwarding (pinned by srcset-attribute.test.ts).
  const isLocalImage = (url: string) =>
    context ? context.isLocalContentImage(url) : isLocalContentImage(url, options.siteUrl, options.imageBaseUrl)

  if (isLocalImage(src) && options.canTransformImage && !options.canTransformImage(src)) {
    return
  }

  const srcsetWidths = getAvailableImageWidths({ width }, options.imageOptimization.contentImageSizes)

  // apply srcset if this is a relative image that matches Inkling's image url structure
  if (isLocalImage(src)) {
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
  context?: RenderContext,
) {
  if (!elem || !['IMG', 'SOURCE'].includes(elem.tagName) || !elem.getAttribute('src') || !image) {
    return
  }

  const { src, width } = image
  const srcset = getSrcsetAttribute({ src, width, options, context })

  if (srcset) {
    elem.setAttribute('srcset', srcset)
  }
}
