import type { CardImportSpec } from '@/nodes/base/import-spec'

import {
  generateDecoratorNode,
  type DecoratorNodeData,
  type DecoratorNodeProperty,
  type DecoratorNodeValueMap,
} from '@/nodes/base/generate-decorator-node'
import { renderFileNode } from '@/nodes/base/nodes/file/file-renderer'
import { bytesToSize, sizeToBytes } from '@/nodes/base/utils/size-byte-converter'

const fileProperties = [
  { name: 'src', default: '', urlType: 'url' },
  { name: 'fileTitle', default: '', wordCount: true },
  { name: 'fileCaption', default: '', wordCount: true },
  { name: 'fileName', default: '' },
  { name: 'fileSize', default: 0 },
] as const satisfies readonly DecoratorNodeProperty[]

export const fileImportSpec = {
  conversions: [
    {
      tag: 'div',
      priority: 1,
      guardClass: 'inkling-file-card',
      reads: [
        { name: 'src', kind: 'attribute', attribute: 'href', selector: 'a', fallback: '' },
        { name: 'fileTitle', kind: 'text', selector: '.inkling-file-card-title', fallback: '' },
        { name: 'fileCaption', kind: 'text', selector: '.inkling-file-card-caption', fallback: '' },
        { name: 'fileName', kind: 'text', selector: '.inkling-file-card-filename', fallback: '' },
        // sizeToBytes('') is 0 — the property default — so a missing size
        // element still writes the key
        { name: 'fileSize', kind: 'text', selector: '.inkling-file-card-filesize', fallback: '', parse: sizeToBytes },
      ],
    },
  ],
} satisfies CardImportSpec

export type FileData = DecoratorNodeData<typeof fileProperties>

export interface BaseFileNode extends DecoratorNodeValueMap<typeof fileProperties> {}

export class BaseFileNode extends generateDecoratorNode({
  nodeType: 'file',
  properties: fileProperties,
  defaultRenderFn: renderFileNode,
  importSpec: fileImportSpec,
}) {
  /* @override */
  exportJSON() {
    // the generated exportJSON already serializes every declared property in
    // `fileProperties` order; the only card-specific logic is the blob guard —
    // an upload-in-progress data-string src must not be persisted
    const json = super.exportJSON()
    if (typeof json.src === 'string' && json.src.startsWith('data:')) {
      json.src = '<base64String>'
    }
    return json
  }

  // The transient-prop spec (file.declaration.ts) initializes this only on
  // spec-adopting assembled classes; a raw `new BaseFileNode()` leaves it
  // unset, so `undefined` is part of the honest type for spec-less instances
  declare __triggerFileDialog: boolean | undefined

  set triggerFileDialog(shouldTrigger: boolean) {
    const writable = this.getWritable()
    writable.__triggerFileDialog = shouldTrigger
  }

  get formattedFileSize() {
    return bytesToSize(this.fileSize)
  }
}

export function $isFileNode(node: unknown): node is BaseFileNode {
  return node instanceof BaseFileNode
}

export const $createBaseFileNode = (dataset: FileData = {}) => {
  return new BaseFileNode(dataset)
}
