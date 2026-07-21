import type { FileNode } from '@/nodes/FileNode'

import FileNodeComponent from '@/nodes/FileNodeComponent'

/**
 * File's decorate render — the React-bearing half of its decorate-target,
 * paired with the declaration by `@/nodes/cards/card-decorate`.
 */
export function render(node: FileNode) {
  return (
    <FileNodeComponent
      fileDesc={node.fileCaption}
      fileDescPlaceholder={'Enter a description'}
      fileName={node.fileName}
      fileSize={node.formattedFileSize}
      fileSrc={node.src}
      fileTitle={node.fileTitle}
      fileTitlePlaceholder={'Enter a title'}
      initialFile={node.__initialFile}
      nodeKey={node.getKey()}
      triggerFileDialog={node.__triggerFileDialog}
    />
  )
}
