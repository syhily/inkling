import type { RenderContext } from '@/nodes/base/render-context'

/*
 * The caption/figcaption pairing invariant (CONTEXT.md "render context"):
 * a card with a caption exports the `inkling-card-hascaption` marker class
 * AND a `<figcaption>` whose content is sanitized through the render
 * context's basic-HTML config — one fact, one home, so neither leg can ship
 * without the other and the marker class always lands last on the class
 * list (the pinned export order). The image, gallery, bookmark, and
 * codeblock renderers are the adapters; video stays out deliberately — its
 * caption is escapeText-escaped (the pinned plan-040 divergence), which is
 * the per-card variance this seam does not absorb.
 */
export function appendCardCaption(figure: HTMLElement, caption: string, context: RenderContext): void {
  figure.setAttribute('class', `${figure.getAttribute('class')} inkling-card-hascaption`)
  const figcaption = figure.ownerDocument.createElement('figcaption')
  figcaption.innerHTML = context.sanitizeBasicHtml(caption)
  figure.appendChild(figcaption)
}
