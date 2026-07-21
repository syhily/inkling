import type { GalleryNode } from '@/nodes/GalleryNode'

import { GalleryNodeComponent } from '@/nodes/GalleryNodeComponent'

/**
 * Gallery's decorate render — the React-bearing half of its decorate-target,
 * paired with the declaration by `@/nodes/cards/card-decorate`.
 */
export function render(node: GalleryNode) {
  return (
    <GalleryNodeComponent
      captionEditor={node.__captionEditor}
      captionEditorInitialState={node.__captionEditorInitialState}
      nodeKey={node.getKey()}
    />
  )
}
