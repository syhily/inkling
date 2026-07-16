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

export interface FileNode extends DecoratorNodeValueMap<typeof fileProperties> {}

export class FileNode extends generateDecoratorNode({
  nodeType: 'file',
  properties: fileProperties,
  defaultRenderFn: renderFileNode,
  importSpec: fileImportSpec,
}) {
  /* @override */
  exportJSON() {
    const { src, fileTitle, fileCaption, fileName, fileSize } = this
    const isBlob = src && src.startsWith('data:')

    return {
      type: 'file' as const,
      version: 1,
      src: isBlob ? '<base64String>' : src,
      fileTitle,
      fileCaption,
      fileName,
      fileSize,
    }
  }

  // Editor-side upload behaviour the card spec doesn't cover lives on the
  // base node (plan 039, Batch 5): the registered card class is assembled
  // from the declaration and inherits it; renderer surfaces never invoke it.
  static uploadType = 'file'

  set triggerFileDialog(shouldTrigger: boolean) {
    const writable = this.getWritable()
    writable.__triggerFileDialog = shouldTrigger
  }

  get formattedFileSize() {
    return bytesToSize(this.fileSize)
  }
}

export function $isFileNode(node: unknown): node is FileNode {
  return node instanceof FileNode
}

export const $createFileNode = (dataset: FileData = {}) => {
  return new FileNode(dataset)
}
