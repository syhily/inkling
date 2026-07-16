import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { type NodeKey } from 'lexical'
import React from 'react'

import { CardActionToolbar } from '@/components/ui/CardActionToolbar'
import { FileCard } from '@/components/ui/cards/FileCard'
import CardContext from '@/context/CardContext'
import InklingHostIntegrationContext from '@/context/InklingHostIntegrationContext'
import useFileDragAndDrop from '@/hooks/useFileDragAndDrop'
import { useInitialFileUpload } from '@/hooks/useInitialFileUpload'
import { useTriggerFileDialog } from '@/hooks/useTriggerFileDialog'
import { $isFileNode, $updateCardNode } from '@/nodes/base'
import { fileUploadIntent } from '@/utils/upload-intent'

export interface FileNodeComponentProps {
  fileDesc: string
  fileDescPlaceholder: string
  fileName: string
  fileSize: string
  fileTitle: string
  fileTitlePlaceholder: string
  fileSrc: string
  nodeKey: NodeKey
  triggerFileDialog: boolean
  initialFile?: File
}

function FileNodeComponent({
  fileDesc,
  fileDescPlaceholder,
  fileName,
  fileSize,
  fileTitle,
  fileTitlePlaceholder,
  fileSrc,
  nodeKey,
  triggerFileDialog,
  initialFile,
}: FileNodeComponentProps) {
  const [editor] = useLexicalComposerContext()
  const [isPopulated, setIsPopulated] = React.useState<boolean>(false)
  const { fileUploader } = React.useContext(InklingHostIntegrationContext)
  const { isEditing } = React.useContext(CardContext)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  const uploader = fileUploader.useFileUpload('file')

  const uploadFile = (files: FileList | File[] | null, { resetSrc = false } = {}) =>
    fileUploadIntent({
      editor,
      nodeKey,
      upload: uploader.upload,
      files,
      // reset original src so it can be replaced with preview and upload progress
      prePatch: resetSrc
        ? (node) => {
            node.src = ''
          }
        : undefined,
    })

  const handleFileDrop = async (files: File[] | FileList): Promise<void> => {
    await uploadFile(files)
  }

  const fileDragHandler = useFileDragAndDrop({ handleDrop: handleFileDrop })

  useInitialFileUpload({ initialFile, isReady: !fileSrc, run: (file) => uploadFile([file]) })

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const files = e.target.files

    await uploadFile(files, { resetSrc: true })
  }

  React.useEffect(() => {
    if (fileSrc && fileSize && fileName) {
      setIsPopulated(true)
    }
  }, [fileName, fileSize, fileSrc])

  const handleFileTitle = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const title = e.target.value

    editor.update(() => {
      $updateCardNode(nodeKey, $isFileNode, (node) => {
        node.fileTitle = title
      })
    })
  }

  const handleFileDesc = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const desc = e.target.value

    editor.update(() => {
      $updateCardNode(nodeKey, $isFileNode, (node) => {
        node.fileCaption = desc
      })
    })
  }

  useTriggerFileDialog({ editor, nodeKey, guard: $isFileNode, fileInputRef, triggerFileDialog })

  return (
    <>
      <FileCard
        fileDesc={fileDesc}
        fileDescPlaceholder={fileDescPlaceholder}
        fileDragHandler={fileDragHandler}
        fileInputRef={fileInputRef as Parameters<typeof FileCard>[0]['fileInputRef']}
        fileName={fileName}
        fileSize={fileSize}
        fileTitle={fileTitle}
        fileTitlePlaceholder={fileTitlePlaceholder}
        fileUploader={uploader as Parameters<typeof FileCard>[0]['fileUploader']}
        handleFileDesc={handleFileDesc}
        handleFileTitle={handleFileTitle}
        isEditing={isEditing}
        isPopulated={isPopulated}
        onFileChange={onFileChange as Parameters<typeof FileCard>[0]['onFileChange']}
      />
      <CardActionToolbar
        card="file-upload"
        items={[{ kind: 'edit', dataTestId: 'edit-file-upload-card' }, { kind: 'separator' }, { kind: 'snippet' }]}
        nodeKey={nodeKey}
        visibleWhen={isPopulated}
      />
    </>
  )
}

export default FileNodeComponent
