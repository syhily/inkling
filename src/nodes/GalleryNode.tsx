import { createCommand, type LexicalEditor } from 'lexical'

import type { CaptionEditorDataset } from '@/types/card-node-datasets'
import type { GalleryImage } from '@/types/gallery'

import GalleryCardIcon from '@/assets/icons/inkling-card-type-gallery.svg?react'
import InklingCardWrapper from '@/components/InklingCardWrapper'
import { GalleryNode as BaseGalleryNode, type GalleryData } from '@/nodes/base'
import { galleryDeclaration } from '@/nodes/cards/gallery.declaration'
import { GalleryNodeComponent } from '@/nodes/GalleryNodeComponent'
import { pick } from '@/utils'

export type GalleryNodeDataset = GalleryData & CaptionEditorDataset

export const INSERT_GALLERY_COMMAND = createCommand<GalleryNodeDataset>()

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

  static cardMenu = [
    {
      label: 'Gallery',
      desc: 'Create an image gallery',
      Icon: GalleryCardIcon,
      insertCommand: INSERT_GALLERY_COMMAND,
      insertParams: {
        triggerFileDialog: true,
      },
      matches: ['gallery'],
      priority: 5,
      shortcut: '/gallery',
    },
  ]

  getIcon() {
    return GalleryCardIcon
  }

  decorate() {
    return (
      <InklingCardWrapper nodeKey={this.getKey()} width={'wide'}>
        <GalleryNodeComponent
          captionEditor={this.__captionEditor}
          captionEditorInitialState={this.__captionEditorInitialState}
          nodeKey={this.getKey()}
        />
      </InklingCardWrapper>
    )
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
