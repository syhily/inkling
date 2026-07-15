import { type FileData, FileNode as BaseFileNode } from '@/nodes/base'
import { CARD_MENUS } from '@/nodes/cards/card-menus'
import { fileDeclaration } from '@/nodes/cards/file.declaration'
import { decorateCard } from '@/nodes/decorate-card'

export { INSERT_FILE_COMMAND } from '@/nodes/cards/card-menus'

export type FileNodeDataset = FileData & {
  initialFile?: File
  triggerFileDialog?: boolean
}

export class FileNode extends BaseFileNode {
  // transient props live on the generated base class (static `transientProps`);
  // `declare` keeps these type-only so no field initializer clobbers the
  // values the base constructor computes from the dataset
  declare __triggerFileDialog: boolean
  declare __initialFile: File | undefined

  // adopt the card declaration's transient-prop spec
  static transientProps = fileDeclaration.transientProps

  static cardMenu = CARD_MENUS.file

  static uploadType = 'file'

  set triggerFileDialog(shouldTrigger: boolean) {
    const writable = this.getWritable()
    writable.__triggerFileDialog = shouldTrigger
  }

  decorate() {
    return decorateCard(this)
  }
}

export const $createFileNode = (dataset: FileNodeDataset) => {
  return new FileNode(dataset)
}

export function $isFileNode(node: unknown): node is FileNode {
  return node instanceof FileNode
}
