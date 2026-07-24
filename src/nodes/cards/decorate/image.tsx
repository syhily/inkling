import type { ImageNode } from '@/nodes/ImageNode'

import { normalizeCardWidth } from '@/nodes/base/utils/card-widths'
import { ImageNodeComponent } from '@/nodes/ImageNodeComponent'

/**
 * Image's decorate render — the React-bearing half of its decorate-target,
 * paired with the declaration by `@/nodes/cards/card-decorate`.
 */
export function render(node: ImageNode) {
  const Selector = node.__selector
  const cardWidth = normalizeCardWidth(node.cardWidth) ?? 'regular'

  return (
    <>
      {Selector && <Selector nodeKey={node.getKey()} />}

      {!node.__isImageHidden && (
        <ImageNodeComponent
          altText={node.alt}
          captionEditor={node.__captionEditor}
          captionEditorInitialState={node.__captionEditorInitialState}
          cardWidth={cardWidth}
          href={node.href}
          initialFile={node.__initialFile}
          nodeKey={node.getKey()}
          previewSrc={node.previewSrc ?? undefined}
          src={node.src}
          triggerFileDialog={node.__triggerFileDialog}
        />
      )}
    </>
  )
}
