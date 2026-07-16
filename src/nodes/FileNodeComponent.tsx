import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { type NodeKey } from 'lexical'
import React from 'react'

import { ActionToolbar } from '@/components/ui/ActionToolbar'
import { FileCard } from '@/components/ui/cards/FileCard'
import { SnippetCreateToolbar } from '@/components/ui/SnippetCreateToolbar'
import { ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator } from '@/components/ui/ToolbarMenu'
import CardContext from '@/context/CardContext'
import InklingComposerContext from '@/context/InklingComposerContext'
import useFileDragAndDrop from '@/hooks/useFileDragAndDrop'
import { $isFileNode, $updateCardNode } from '@/nodes/base'
import { openFileSelection } from '@/utils/openFileSelection'
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
  const { fileUploader } = React.useContext(InklingComposerContext)
  const { isSelected, isEditing } = React.useContext(CardContext)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const [showSnippetToolbar, setShowSnippetToolbar] = React.useState<boolean>(false)

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

  React.useEffect(() => {
    const uploadInitialFile = async (file: File | undefined): Promise<void> => {
      if (file && !fileSrc) {
        await uploadFile([file])
      }
    }

    uploadInitialFile(initialFile)

    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const files = e.target.files

    await uploadFile(files, { resetSrc: true })
  }

  React.useEffect(() => {
    if (fileSrc && fileSize && fileName) {
      setIsPopulated(true)
    }
  }, [fileName, fileSize, fileSrc])

  const enableEditing = (e: React.MouseEvent): void => {
    e.preventDefault()
    e.stopPropagation()
  }

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

  React.useEffect(() => {
    if (!triggerFileDialog) {
      return
    }

    const renderTimeout = setTimeout(() => {
      openFileSelection({ fileInputRef })

      editor.update(() => {
        $updateCardNode(nodeKey, $isFileNode, (node) => {
          node.triggerFileDialog = false
        })
      })
    })

    return () => {
      clearTimeout(renderTimeout)
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [openFileSelection])

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
      <ActionToolbar data-inkling-card-toolbar="file-upload" isVisible={showSnippetToolbar}>
        <SnippetCreateToolbar nodeKey={nodeKey} onClose={() => setShowSnippetToolbar(false)} />
      </ActionToolbar>

      <ActionToolbar
        data-inkling-card-toolbar="file-upload"
        isVisible={isSelected && isPopulated && !isEditing && !showSnippetToolbar}
      >
        <ToolbarMenu>
          <ToolbarMenuItem
            className={undefined}
            dataTestId="edit-file-upload-card"
            icon="edit"
            isActive={false}
            label="Edit"
            onClick={enableEditing}
          />
          <ToolbarMenuSeparator hide={undefined} />
          <ToolbarMenuItem
            className={undefined}
            dataTestId={undefined}
            icon="snippet"
            isActive={false}
            label="Save as snippet"
            onClick={() => setShowSnippetToolbar(true)}
          />
        </ToolbarMenu>
      </ActionToolbar>
    </>
  )
}

export default FileNodeComponent
