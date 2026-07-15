import { type LexicalEditor, type LexicalNode, type NodeKey } from 'lexical'
import React from 'react'

import type { CaptionEditorDataset } from '@/types/card-node-datasets'

import { ImageNode as BaseImageNode, type ImageData } from '@/nodes/base'
import { CARD_MENUS } from '@/nodes/cards/card-menus'
import { imageDeclaration } from '@/nodes/cards/image.declaration'
import { decorateCard } from '@/nodes/decorate-card'

export { INSERT_IMAGE_COMMAND } from '@/nodes/cards/card-menus'

export type ImageNodeDataset = ImageData &
  CaptionEditorDataset & {
    previewSrc?: string
    triggerFileDialog?: boolean
    initialFile?: File
    selector?: React.ComponentType<{ nodeKey: NodeKey }>
    isImageHidden?: boolean
    // image datasets also flow through drag-and-drop payloads that carry
    // extra keys; keep the record open for those transient fields
    [key: string]: unknown
  }

export class ImageNode extends BaseImageNode {
  // transient props live on the generated base class (static `transientProps`);
  // `declare` keeps these type-only so no field initializer clobbers the
  // values the base constructor computes from the dataset
  declare __triggerFileDialog: boolean
  declare __previewSrc: string | null
  // nested editors live on the generated base class (static `nestedEditors`);
  // `declare` keeps these type-only so the field initializers don't clobber
  // the instances the base constructor sets up
  declare __captionEditor: LexicalEditor | undefined
  declare __captionEditorInitialState: import('lexical').EditorState | undefined
  declare __initialFile: File | undefined
  declare __selector: React.ComponentType<{ nodeKey: NodeKey }> | undefined
  declare __isImageHidden: boolean | undefined

  // adopt the card declaration's nested-editor and transient-prop specs
  static nestedEditors = imageDeclaration.nestedEditors
  static transientProps = imageDeclaration.transientProps

  static cardMenu = CARD_MENUS.image

  static uploadType = 'image'

  get previewSrc() {
    const self = this.getLatest()
    return self.__previewSrc
  }

  set previewSrc(previewSrc: string | null) {
    const writable = this.getWritable()
    writable.__previewSrc = previewSrc
  }

  set triggerFileDialog(shouldTrigger: boolean) {
    const writable = this.getWritable()
    writable.__triggerFileDialog = shouldTrigger
  }

  createDOM() {
    return document.createElement('div')
  }

  decorate() {
    return decorateCard(this)
  }
}

export const $createImageNode = (dataset: ImageNodeDataset = {}, key?: NodeKey): ImageNode => {
  return new ImageNode(dataset, key)
}

export function $isImageNode(node: LexicalNode | null | undefined): node is ImageNode {
  return node instanceof ImageNode
}
