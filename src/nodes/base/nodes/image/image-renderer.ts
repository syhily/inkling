import type { ExportDOMOptions } from '@/nodes/base/export-dom'

import { addCreateDocumentOption } from '@/nodes/base/utils/add-create-document-option'
import { getAvailableImageWidths } from '@/nodes/base/utils/get-available-image-widths'
import { getResizedImageDimensions } from '@/nodes/base/utils/get-resized-image-dimensions'
import { isLocalContentImage } from '@/nodes/base/utils/is-local-content-image'
import { isSafeUrl } from '@/nodes/base/utils/is-safe-url'
import { renderEmptyContainer } from '@/nodes/base/utils/render-empty-container'
import { getSrcsetAttribute, setSrcsetAttribute } from '@/nodes/base/utils/srcset-attribute'
import { sanitizeHtml } from '@/utils/sanitize-html'

const MODERN_IMAGE_FORMATS = ['avif', 'webp']

function isAnimatedImage(url = '') {
  try {
    const parsedUrl = new URL(url, 'http://localhost')
    return parsedUrl.pathname.toLowerCase().endsWith('.gif')
  } catch {
    return false
  }
}

interface ImageNodeData {
  src: string
  width: number
  height: number
  alt: string
  title: string
  caption: string
  cardWidth: string
  href: string
}

interface ImageRenderOptions extends ExportDOMOptions {
  imageOptimization?: {
    defaultMaxWidth?: number
    contentImageSizes?: Record<string, { width: number }>
    [key: string]: unknown
  }
}

export function renderImageNode(node: ImageNodeData, options: ImageRenderOptions = {}) {
  addCreateDocumentOption(options)

  const document = options.createDocument!()

  if (!node.src || node.src.trim() === '') {
    return renderEmptyContainer(document)
  }

  const figure = document.createElement('figure')

  let figureClasses = 'inkling-card inkling-image-card'
  if (node.cardWidth !== 'regular') {
    figureClasses += ` inkling-width-${node.cardWidth}`
  }
  if (node.caption) {
    figureClasses += ' inkling-card-hascaption'
  }

  figure.setAttribute('class', figureClasses)

  const img = document.createElement('img')
  img.setAttribute('src', node.src)
  img.setAttribute('class', 'inkling-image')
  img.setAttribute('alt', node.alt)
  img.setAttribute('loading', 'lazy')

  if (node.title) {
    img.setAttribute('title', node.title)
  }

  if (node.width && node.height) {
    img.setAttribute('width', String(node.width))
    img.setAttribute('height', String(node.height))
  }

  // images can be resized to max width, if that's the case output
  // the resized width/height attrs to ensure 3rd party gallery plugins
  // aren't affected by differing sizes
  const { canTransformImage } = options
  const { defaultMaxWidth } = options.imageOptimization || {}
  if (
    defaultMaxWidth &&
    node.width > defaultMaxWidth &&
    isLocalContentImage(node.src, options.siteUrl, options.imageBaseUrl) &&
    canTransformImage &&
    canTransformImage(node.src)
  ) {
    const imageDimensions = {
      width: node.width,
      height: node.height,
    }
    const { width, height } = getResizedImageDimensions(imageDimensions, { width: defaultMaxWidth })
    img.setAttribute('width', String(width))
    img.setAttribute('height', String(height))
  }

  let picture: HTMLPictureElement | null = null

  if (options.target !== 'email') {
    const imgAttributes = {
      src: node.src,
      width: node.width,
      height: node.height,
    }
    setSrcsetAttribute(img, imgAttributes, options)

    let sizes: string | undefined
    if (img.getAttribute('srcset') && node.width && node.width >= 720) {
      // standard size
      if (!node.cardWidth || node.cardWidth === 'regular') {
        sizes = '(min-width: 720px) 720px'
      }

      if (node.cardWidth === 'wide' && node.width >= 1200) {
        sizes = '(min-width: 1200px) 1200px'
      }
    }

    if (sizes) {
      img.setAttribute('sizes', sizes)
    }

    const shouldRenderPicture = Boolean(
      options.feature?.pictureImageFormats &&
      img.getAttribute('srcset') &&
      !isAnimatedImage(node.src) &&
      isLocalContentImage(node.src, options.siteUrl, options.imageBaseUrl) &&
      options.canTransformImage?.(node.src) &&
      typeof options.canTransformImageToFormat === 'function',
    )

    if (shouldRenderPicture) {
      picture = document.createElement('picture')
      let sourcesAdded = false

      MODERN_IMAGE_FORMATS.forEach((format) => {
        if (!options.canTransformImageToFormat!(format)) {
          return
        }

        const formattedSrcset = getSrcsetAttribute({
          src: node.src,
          width: node.width,
          options,
          format,
        })

        if (!formattedSrcset) {
          return
        }

        const source = document.createElement('source')
        source.setAttribute('srcset', formattedSrcset)
        source.setAttribute('type', `image/${format}`)

        if (sizes) {
          source.setAttribute('sizes', sizes)
        }

        picture!.appendChild(source)
        sourcesAdded = true
      })

      if (sourcesAdded) {
        picture.appendChild(img)
      } else {
        picture = null
      }
    }
  }

  // Outlook is unable to properly resize images without a width/height
  // so we add that at the expected size in emails (600px) and use a higher
  // resolution image to keep images looking good on retina screens
  if (options.target === 'email' && node.width && node.height) {
    let imageDimensions = {
      width: node.width,
      height: node.height,
    }
    if (node.width >= 600) {
      imageDimensions = getResizedImageDimensions(imageDimensions, { width: 600 })
    }
    img.setAttribute('width', String(imageDimensions.width))
    img.setAttribute('height', String(imageDimensions.height))

    const contentImageSizes = options.imageOptimization?.contentImageSizes
    if (
      contentImageSizes &&
      isLocalContentImage(node.src, options.siteUrl, options.imageBaseUrl) &&
      options.canTransformImage?.(node.src)
    ) {
      // find available image size next up from 2x600 so we can use it for the "retina" src
      const availableImageWidths = getAvailableImageWidths(node, contentImageSizes)
      const srcWidth = availableImageWidths.find((width) => width >= 1200)

      if (!srcWidth || srcWidth === node.width) {
        // do nothing, width is smaller than retina or matches the original node src
      } else {
        const match = node.src.match(/(.*\/content\/images)\/(.*)/)
        if (match) {
          const [, imagesPath, filename] = match
          img.setAttribute('src', `${imagesPath}/size/w${srcWidth}/${filename}`)
        }
      }
    }
  }

  const href = node.href
  if (href && isSafeUrl(href)) {
    const a = document.createElement('a')
    a.setAttribute('href', href)
    a.appendChild(picture || img)
    figure.appendChild(a)
  } else {
    figure.appendChild(picture || img)
  }

  if (node.caption) {
    const caption = document.createElement('figcaption')
    caption.innerHTML = sanitizeHtml(node.caption)
    figure.appendChild(caption)
  }

  return { element: figure, type: 'outer' as const }
}
