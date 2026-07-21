import type { EditorState, LexicalEditor } from 'lexical'

import type { GalleryData } from '@/nodes/base/nodes/gallery/GalleryNode'
import type { CaptionEditorDataset } from '@/types/card-node-datasets'

import { assembleCardNode } from '@/nodes/assemble-card-node'
import { galleryDeclaration } from '@/nodes/cards/gallery.declaration'

export {
  ALLOWED_IMAGE_PROPS,
  $isGalleryNode,
  MAX_IMAGES,
  MAX_PER_ROW,
  recalculateImageRows,
} from '@/nodes/base/nodes/gallery/GalleryNode'
export { INSERT_GALLERY_COMMAND } from '@/nodes/cards/card-commands'

export type GalleryNodeDataset = GalleryData & CaptionEditorDataset

/**
 * Transition shim (plan 039, Batch 5): the hand-written wrapper is gone — the
 * registered class is assembled from the card declaration, and `$isGalleryNode`
 * and the image-list helpers are canonical on the base node.
 * `$createGalleryNode` keeps constructing the assembled class so the
 * nested-editor spec is set up.
 */
export const GalleryNode = assembleCardNode(galleryDeclaration)
export type GalleryNode = InstanceType<typeof GalleryNode> & {
  __captionEditor: LexicalEditor | null
  __captionEditorInitialState: EditorState | undefined
}

export const $createGalleryNode = (dataset: GalleryNodeDataset): GalleryNode => {
  // the nested-editor fields are set up by the constructor from the dataset
  return new GalleryNode(dataset) as GalleryNode
}
