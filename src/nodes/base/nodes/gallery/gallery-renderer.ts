import type { RenderContext } from '@/nodes/base/render-context'
import type { GalleryImage } from '@/types/gallery'

import { MAX_PER_ROW } from '@/nodes/base/nodes/gallery/GalleryNode'
import { getAvailableImageWidths } from '@/nodes/base/utils/get-available-image-widths'
import { getResizedImageDimensions } from '@/nodes/base/utils/get-resized-image-dimensions'
import { renderEmptyContainer } from '@/nodes/base/utils/render-empty-container'
import { setSrcsetAttribute } from '@/nodes/base/utils/srcset-attribute'

// the renderer can only lay out images that carry these fields; isValidImage
// narrows the canonical (all-optional) GalleryImage to this stricter view
interface ValidGalleryImage extends GalleryImage {
  fileName: string
  src: string
  width: number
  height: number
  row: number
}

interface GalleryNodeData {
  images: GalleryImage[]
  caption: string
}

function isValidImage(image: unknown, context: RenderContext): image is ValidGalleryImage {
  if (typeof image !== 'object' || image === null) {
    return false
  }

  const candidate = image as Partial<ValidGalleryImage>
  const width = candidate.width
  const height = candidate.height
  const row = candidate.row

  // the predicate vouches for the whole ValidGalleryImage shape, so the
  // optional string fields must be string-or-absent too, not just present-or-not
  const optionalStringsValid = (['alt', 'title', 'href', 'caption', 'previewSrc'] as const).every(
    (key) => candidate[key] === undefined || typeof candidate[key] === 'string',
  )

  return (
    optionalStringsValid &&
    typeof candidate.fileName === 'string' &&
    candidate.fileName.trim() !== '' &&
    typeof candidate.src === 'string' &&
    context.safeUrl('media', candidate.src) !== '' &&
    typeof width === 'number' &&
    Number.isFinite(width) &&
    width > 0 &&
    typeof height === 'number' &&
    Number.isFinite(height) &&
    height > 0 &&
    typeof row === 'number' &&
    Number.isInteger(row) &&
    row >= 0
  )
}

function buildStructure(images: ValidGalleryImage[]) {
  const rows: ValidGalleryImage[][] = []
  const noOfImages = images.length

  images.forEach((image: ValidGalleryImage, idx: number) => {
    let row = image.row

    if (noOfImages > 1 && noOfImages % MAX_PER_ROW === 1 && idx === noOfImages - 2) {
      row = row + 1
    }
    if (!rows[row]) {
      rows[row] = []
    }

    rows[row].push(image)
  })

  return rows
}

export function renderGalleryNode(node: GalleryNodeData, context: RenderContext) {
  const document = context.createDocument()

  const validImages = node.images.filter((image): image is ValidGalleryImage => isValidImage(image, context))
  if (!validImages.length) {
    return renderEmptyContainer(document)
  }

  const figure = document.createElement('figure')
  figure.setAttribute('class', 'inkling-card inkling-gallery-card inkling-width-wide')

  const container = document.createElement('div')
  container.setAttribute('class', 'inkling-gallery-container')
  figure.appendChild(container)

  const rows = buildStructure(validImages)

  rows.forEach((row) => {
    const rowDiv = document.createElement('div')
    rowDiv.setAttribute('class', 'inkling-gallery-row')

    row.forEach((image: ValidGalleryImage) => {
      const imgDiv = document.createElement('div')
      imgDiv.setAttribute('class', 'inkling-gallery-image')

      const img = document.createElement('img')
      img.setAttribute('src', image.src)
      img.setAttribute('width', String(image.width))
      img.setAttribute('height', String(image.height))
      img.setAttribute('loading', 'lazy')
      img.setAttribute('alt', image.alt || '')
      if (image.title) {
        img.setAttribute('title', image.title)
      }

      // images can be resized to max width, if that's the case output
      // the resized width/height attrs to ensure 3rd party gallery plugins
      // aren't affected by differing sizes
      const { canTransformImage } = context
      const { defaultMaxWidth } = context.imageOptimization || {}
      if (
        defaultMaxWidth &&
        image.width > defaultMaxWidth &&
        context.isLocalContentImage(image.src) &&
        canTransformImage &&
        canTransformImage(image.src)
      ) {
        const { width, height } = getResizedImageDimensions(image, { width: defaultMaxWidth })
        img.setAttribute('width', String(width))
        img.setAttribute('height', String(height))
      }

      // add srcset+sizes except for email clients which do not have good support for either
      if (context.variant({ web: true, email: false })) {
        setSrcsetAttribute(img, image, context)

        if (img.getAttribute('srcset') && image.width >= 720) {
          if (rows.length === 1 && row.length === 1 && image.width >= 1200) {
            img.setAttribute('sizes', '(min-width: 1200px) 1200px')
          } else {
            img.setAttribute('sizes', '(min-width: 720px) 720px')
          }
        }
      }

      // Outlook is unable to properly resize images without a width/height
      // so we modify those to fit max width (600px) and use appropriately
      // resized images if available
      if (context.variant({ web: false, email: true })) {
        // only resize if needed, width/height always exists for gallery image unline image cards
        if (image.width > 600) {
          const newImageDimensions = getResizedImageDimensions(image, { width: 600 })!
          img.setAttribute('width', String(newImageDimensions.width))
          img.setAttribute('height', String(newImageDimensions.height))
        }

        const contentImageSizes = context.imageOptimization?.contentImageSizes
        if (contentImageSizes && context.isLocalContentImage(image.src) && context.canTransformImage?.(image.src)) {
          // find available image size next up from 2x600 so we can use it for the "retina" src
          const availableImageWidths = getAvailableImageWidths(image, contentImageSizes)
          const srcWidth = availableImageWidths.find((width) => width >= 1200)

          if (!srcWidth || srcWidth === image.width) {
            // do nothing, width is smaller than retina or matches the original payload src
          } else {
            const match = image.src.match(/(.*\/content\/images)\/(.*)/)
            if (match) {
              const [, imagesPath, filename] = match
              img.setAttribute('src', `${imagesPath}/size/w${srcWidth}/${filename}`)
            }
          }
        }
      }

      const safeHref = context.safeUrl('navigation', image.href || '')
      if (safeHref) {
        const a = document.createElement('a')
        a.setAttribute('href', safeHref)
        a.appendChild(img)
        imgDiv.appendChild(a)
      } else {
        imgDiv.appendChild(img)
      }
      rowDiv.appendChild(imgDiv)
    })

    container.appendChild(rowDiv)
  })

  if (node.caption) {
    const figcaption = document.createElement('figcaption')
    figcaption.innerHTML = context.sanitizeCaption(node.caption)
    figure.appendChild(figcaption)
    figure.setAttribute('class', `${figure.getAttribute('class')} inkling-card-hascaption`)
  }

  return { element: figure, type: 'outer' as const }
}
