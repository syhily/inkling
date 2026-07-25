import type { RenderContext } from '@/nodes/base/render-context'

import { getAvailableImageWidths } from '@/nodes/base/utils/get-available-image-widths'
import { getResizedImageDimensions } from '@/nodes/base/utils/get-resized-image-dimensions'
import { CONTENT_IMAGE_PATH_REGEX } from '@/nodes/base/utils/srcset-attribute'

/**
 * The email template's content-column width. Outlook cannot resize images
 * itself, so email output clamps image width/height attributes to this column
 * and swaps in a 2x "retina" src from the CDN sizes; the video email template
 * sizes its preview table to the same column.
 */
export const EMAIL_TEMPLATE_MAX_WIDTH = 600

// The retina src targets 2x the clamped template column.
const EMAIL_RETINA_WIDTH = EMAIL_TEMPLATE_MAX_WIDTH * 2

interface EmailImageSource {
  src: string
  width: number
  height: number
}

/**
 * The one email image-sizing pipeline, shared by the image and gallery
 * renderers (previously near-verbatim copies that had drifted on the clamp
 * boundary):
 *
 * - clamps the `width`/`height` attributes to the template column, preserving
 *   aspect ratio — Outlook ignores CSS and reads only the attributes;
 * - rewrites a transformable local content-image `src` to the next available
 *   CDN size at or above 2x the column width, keeping retina screens sharp.
 *
 * Boundary: the clamp applies only when the image EXCEEDS the column width
 * (`>`, not `>=`). At exactly 600px the image already fits the column and
 * clamping would be the identity, so the historical `>=` (image renderer) and
 * `>` (gallery renderer) never produced different output — `>` is pinned here
 * as the intended "only resize if needed" reading.
 *
 * Callers gate on the email render target; the helper always applies.
 */
export function applyEmailImageAttributes(img: HTMLImageElement, image: EmailImageSource, context: RenderContext) {
  const { src, width, height } = image

  if (width > EMAIL_TEMPLATE_MAX_WIDTH) {
    const resized = getResizedImageDimensions({ width, height }, { width: EMAIL_TEMPLATE_MAX_WIDTH })
    img.setAttribute('width', String(resized.width))
    img.setAttribute('height', String(resized.height))
  } else {
    img.setAttribute('width', String(width))
    img.setAttribute('height', String(height))
  }

  const contentImageSizes = context.imageOptimization?.contentImageSizes
  if (!contentImageSizes || !context.isLocalContentImage(src) || !context.canTransformImage?.(src)) {
    return
  }

  // find the available image size next up from 2x the column width so we can
  // use it for the "retina" src
  const availableImageWidths = getAvailableImageWidths({ width }, contentImageSizes)
  const srcWidth = availableImageWidths.find((availableWidth) => availableWidth >= EMAIL_RETINA_WIDTH)

  if (!srcWidth || srcWidth === width) {
    // do nothing: no available size reaches retina, or it matches the original src
    return
  }

  const match = src.match(CONTENT_IMAGE_PATH_REGEX)
  if (match) {
    const [, imagesPath, filename] = match
    img.setAttribute('src', `${imagesPath}/size/w${srcWidth}/${filename}`)
  }
}
