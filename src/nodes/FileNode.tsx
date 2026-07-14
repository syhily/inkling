import { createCommand } from 'lexical'

import FileCardIcon from '@/assets/icons/inkling-card-type-file.svg?react'
import InklingCardWrapper from '@/components/InklingCardWrapper'
import { FileNode as BaseFileNode, type FileData } from '@/nodes/base'
import FileNodeComponent from '@/nodes/FileNodeComponent'

export type FileNodeDataset = FileData & {
  initialFile?: File
  triggerFileDialog?: boolean
}

export const INSERT_FILE_COMMAND = createCommand<FileNodeDataset>()

export class FileNode extends BaseFileNode {
  __triggerFileDialog = false
  __initialFile: File | undefined = undefined

  static cardMenu = [
    {
      label: 'File',
      desc: 'Upload a downloadable file',
      Icon: FileCardIcon,
      insertCommand: INSERT_FILE_COMMAND,
      insertParams: {
        triggerFileDialog: true,
      },
      matches: ['file'],
      priority: 15,
      shortcut: '/file',
    },
  ]

  static uploadType = 'file'

  constructor(dataset: FileNodeDataset = {}, key?: string) {
    super(dataset, key)

    const { triggerFileDialog, initialFile } = dataset

    // don't trigger the file dialog when rendering if we've already been given a url
    this.__triggerFileDialog = (!dataset.src && triggerFileDialog) || false
    this.__initialFile = initialFile
  }

  getIcon() {
    return FileCardIcon
  }

  set triggerFileDialog(shouldTrigger: boolean) {
    const writable = this.getWritable()
    writable.__triggerFileDialog = shouldTrigger
  }

  decorate() {
    return (
      <InklingCardWrapper nodeKey={this.getKey()}>
        <FileNodeComponent
          fileDesc={this.fileCaption}
          fileDescPlaceholder={'Enter a description'}
          fileName={this.fileName}
          fileSize={this.formattedFileSize}
          fileSrc={this.src}
          fileTitle={this.fileTitle}
          fileTitlePlaceholder={'Enter a title'}
          initialFile={this.__initialFile}
          nodeKey={this.getKey()}
          triggerFileDialog={this.__triggerFileDialog}
        />
      </InklingCardWrapper>
    )
  }
}

export const $createFileNode = (dataset: FileNodeDataset) => {
  return new FileNode(dataset)
}

export function $isFileNode(node: unknown): node is FileNode {
  return node instanceof FileNode
}
