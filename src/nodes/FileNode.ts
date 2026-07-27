import type { CardSpecFieldMap } from '@/nodes/base/generate-decorator-node'
import type { FileData } from '@/nodes/base/nodes/file/FileNode'

import { assembleCardNodeOnce } from '@/nodes/assemble-card-node'
import { fileDeclaration } from '@/nodes/cards/file.declaration'

export { $isFileNode } from '@/nodes/base/nodes/file/FileNode'
export { INSERT_FILE_COMMAND } from '@/nodes/cards/card-commands'

export type FileNodeDataset = FileData & {
  initialFile?: File
  triggerFileDialog?: boolean
}

/**
 * Transition shim (plan 039, Batch 5): the hand-written wrapper is gone — the
 * registered class is assembled from the card declaration, and `$isFileNode`
 * is canonical on the base node. `$createFileNode` keeps constructing the
 * assembled class so the transient-prop spec is initialized.
 */
export const FileNode = assembleCardNodeOnce(fileDeclaration)
// the `__*` field names derive from the declaration's spec — renaming a spec
// entry is a compile error here (CardSpecFieldMap)
export type FileNode = InstanceType<typeof FileNode> &
  CardSpecFieldMap<
    typeof fileDeclaration,
    {
      __triggerFileDialog: boolean
      __initialFile: File | undefined
    }
  >

export const $createFileNode = (dataset: FileNodeDataset): FileNode => {
  // the transient fields are initialized by the constructor from the dataset
  return new FileNode(dataset) as FileNode
}
