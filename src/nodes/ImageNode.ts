import type { NodeKey } from 'lexical'
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
 * The registered class is assembled from the card declaration, and
 * `$isImageNode` and the upload accessors are canonical on the base node.
 * The instance type carries the spec-derived `__*` field map (names and
 * value types from the declaration's spec via CardSpecFieldMap), so
 * `$createImageNode` constructs the assembled class — which initializes the
 * nested-editor and transient-prop specs — with no cast.
 */
export const ImageNode = assembleCardNodeOnce(imageDeclaration)
export type ImageNode = InstanceType<typeof ImageNode>

export const $createImageNode = (dataset: ImageNodeDataset = {}, key?: NodeKey): ImageNode => {
  // the nested-editor and transient fields are initialized by the constructor from the dataset
  return new ImageNode(dataset, key)
}
