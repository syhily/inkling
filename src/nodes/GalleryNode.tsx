import { type LexicalEditor } from 'lexical'

import type { CaptionEditorDataset } from '@/types/card-node-datasets'
import type { GalleryImage } from '@/types/gallery'

import { GalleryNode as BaseGalleryNode, type GalleryData } from '@/nodes/base'
import { CARD_MENUS } from '@/nodes/cards/card-menus'
import { galleryDeclaration } from '@/nodes/cards/gallery.declaration'
import { decorateCard } from '@/nodes/decorate-card'
import { pick } from '@/utils'

export { INSERT_GALLERY_COMMAND } from '@/nodes/cards/card-menus'

export type GalleryNodeDataset = GalleryData & CaptionEditorDataset

export const MAX_IMAGES = 9
export const MAX_PER_ROW = 3

// ensure we don't save client-side only properties such as preview blob urls to the server
export const ALLOWED_IMAGE_PROPS = ['row', 'src', 'width', 'height', 'alt', 'caption', 'fileName']

export function recalculateImageRows(images: GalleryImage[]) {
  images.forEach((image: GalleryImage, idx: number) => {
    image.row = Math.ceil((idx + 1) / MAX_PER_ROW) - 1
  })
}

export class GalleryNode extends BaseGalleryNode {
  // nested editors live on the generated base class (static `nestedEditors`);
  // `declare` keeps these type-only so the field initializers don't clobber
  // the instances the base constructor sets up
  declare __captionEditor: LexicalEditor | null
  declare __captionEditorInitialState: import('lexical').EditorState | undefined

  // adopt the card declaration's nested-editor spec
  static nestedEditors = galleryDeclaration.nestedEditors

  static cardMenu = CARD_MENUS.gallery

  decorate() {
    return decorateCard(this)
  }

  // TODO: move to inkling-default-nodes?
  setImages(images: GalleryImage[]) {
    const datasetImages = images.slice(0, MAX_IMAGES).map((image) => pick(image, ALLOWED_IMAGE_PROPS))

    recalculateImageRows(datasetImages)
    this.images = datasetImages
  }

  addImages(images: GalleryImage[]) {
    const datasetImages = [...this.images, ...images]
      .slice(0, MAX_IMAGES)
      .map((image) => pick(image, ALLOWED_IMAGE_PROPS))

    recalculateImageRows(datasetImages)
    this.images = datasetImages
  }
}

export const $createGalleryNode = (dataset: GalleryNodeDataset) => {
  return new GalleryNode(dataset)
}

export function $isGalleryNode(node: unknown): node is GalleryNode {
  return node instanceof GalleryNode
}
