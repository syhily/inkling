import type { EditorState, LexicalEditor, NodeKey } from 'lexical'
import type React from 'react'

import type { ImageData } from '@/nodes/base/nodes/image/ImageNode'
import type { CaptionEditorDataset } from '@/types/card-node-datasets'

import { assembleCardNodeOnce } from '@/nodes/assemble-card-node'
import { imageDeclaration } from '@/nodes/cards/image.declaration'

export { $isImageNode } from '@/nodes/base/nodes/image/ImageNode'
export { INSERT_IMAGE_COMMAND } from '@/nodes/cards/card-commands'

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

/**
 * Transition shim (plan 039, Batch 5): the hand-written wrapper is gone — the
 * registered class is assembled from the card declaration, and `$isImageNode`
 * and the upload accessors are canonical on the base node. `$createImageNode`
 * keeps constructing the assembled class so the nested-editor and
 * transient-prop specs are initialized.
 */
export const ImageNode = assembleCardNodeOnce(imageDeclaration)
export type ImageNode = InstanceType<typeof ImageNode> & {
  __triggerFileDialog: boolean
  __previewSrc: string | null
  // non-null: the constructor's nested-editor setup always assigns an editor
  // (only the video/gallery/callout/toggle editors are ever nulled, by the
  // markdown card transformers)
  __captionEditor: LexicalEditor
  __captionEditorInitialState: EditorState | undefined
  __initialFile: File | undefined
  __selector: React.ComponentType<{ nodeKey: NodeKey }> | undefined
  __isImageHidden: boolean | undefined
}

export const $createImageNode = (dataset: ImageNodeDataset = {}, key?: NodeKey): ImageNode => {
  // the nested-editor and transient fields are initialized by the constructor from the dataset
  return new ImageNode(dataset, key) as ImageNode
}
