import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { type NodeKey } from 'lexical'
import React from 'react'

import { ActionToolbar } from '@/components/ui/ActionToolbar'
import { AudioCard } from '@/components/ui/cards/AudioCard'
import { SnippetCreateToolbar } from '@/components/ui/SnippetCreateToolbar'
import { ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator } from '@/components/ui/ToolbarMenu'
import CardContext from '@/context/CardContext'
import InklingComposerContext from '@/context/InklingComposerContext'
import useFileDragAndDrop from '@/hooks/useFileDragAndDrop'
import { useInitialFileUpload } from '@/hooks/useInitialFileUpload'
import { useTriggerFileDialog } from '@/hooks/useTriggerFileDialog'
import { $isAudioNode, $updateCardNode } from '@/nodes/base'
import { audioThumbnailUploadIntent, audioUploadIntent } from '@/utils/upload-intent'

interface AudioNodeComponentProps {
  duration: number
  initialFile: File | undefined
  nodeKey: NodeKey
  src: string
  thumbnailSrc: string
  title: string
  triggerFileDialog: boolean
}

export function AudioNodeComponent({
  duration,
  initialFile,
  nodeKey,
  src,
  thumbnailSrc,
  title,
  triggerFileDialog,
}: AudioNodeComponentProps) {
  const [editor] = useLexicalComposerContext()
  const { fileUploader, cardConfig } = React.useContext(InklingComposerContext)
  const { isSelected, isEditing, setEditing } = React.useContext(CardContext)
  const audioFileInputRef = React.useRef<HTMLInputElement>(null)
  const thumbnailFileInputRef = React.useRef<HTMLInputElement>(null)
  const cardContext = React.useContext(CardContext)
  const [showSnippetToolbar, setShowSnippetToolbar] = React.useState(false)

  const audioUploader = fileUploader.useFileUpload('audio')
  const thumbnailUploader = fileUploader.useFileUpload('mediaThumbnail')
  const audioDragHandler = useFileDragAndDrop({ handleDrop: handleAudioDrop })
  const thumbnailDragHandler = useFileDragAndDrop({ handleDrop: handleThumbnailDrop, disabled: !isEditing })

  const uploadAudio = (files: FileList | File[] | null) =>
    audioUploadIntent({ editor, nodeKey, upload: audioUploader.upload, files })
  const uploadThumbnail = (files: FileList | File[] | null) =>
    audioThumbnailUploadIntent({ editor, nodeKey, upload: thumbnailUploader.upload, files })

  useInitialFileUpload({
    initialFile,
    isReady: !src && !audioUploader.isLoading,
    run: (file) => uploadAudio([file]),
  })

  const onAudioFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fls = e.target.files
    return await uploadAudio(fls)
  }

  const onThumbnailFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fls = e.target.files
    return await uploadThumbnail(fls)
  }

  const setTitle = (newTitle: string) => {
    editor.update(() => {
      $updateCardNode(nodeKey, $isAudioNode, (node) => {
        node.title = newTitle
      })
    })
  }

  const removeThumbnail = () => {
    editor.update(() => {
      $updateCardNode(nodeKey, $isAudioNode, (node) => {
        node.thumbnailSrc = ''
      })
    })
  }

  async function handleAudioDrop(files: File[]) {
    await uploadAudio(files)
  }

  async function handleThumbnailDrop(files: File[]) {
    await uploadThumbnail(files)
  }

  const handleToolbarEdit = (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setEditing(true)
  }

  useTriggerFileDialog({
    editor,
    nodeKey,
    guard: $isAudioNode,
    fileInputRef: audioFileInputRef,
    triggerFileDialog,
  })

  return (
    <>
      <AudioCard
        audioDragHandler={audioDragHandler}
        audioFileInputRef={audioFileInputRef}
        audioMimeTypes={fileUploader.fileTypes?.audio?.mimeTypes}
        audioUploader={audioUploader}
        duration={duration}
        isEditing={cardContext.isEditing}
        removeThumbnail={removeThumbnail}
        src={src}
        thumbnailDragHandler={thumbnailDragHandler}
        thumbnailFileInputRef={thumbnailFileInputRef}
        thumbnailMimeTypes={fileUploader.fileTypes?.image?.mimeTypes}
        thumbnailSrc={thumbnailSrc}
        thumbnailUploader={thumbnailUploader}
        title={title}
        updateTitle={setTitle}
        onAudioFileChange={onAudioFileChange}
        onThumbnailFileChange={onThumbnailFileChange}
      />
      <ActionToolbar data-inkling-card-toolbar="audio" isVisible={showSnippetToolbar}>
        <SnippetCreateToolbar nodeKey={nodeKey} onClose={() => setShowSnippetToolbar(false)} />
      </ActionToolbar>

      <ActionToolbar
        data-inkling-card-toolbar="audio"
        isVisible={!!src && isSelected && !isEditing && !showSnippetToolbar}
      >
        <ToolbarMenu>
          <ToolbarMenuItem icon="edit" isActive={false} label="Edit" onClick={handleToolbarEdit} />
          <ToolbarMenuSeparator hide={!cardConfig.createSnippet} />
          <ToolbarMenuItem
            dataTestId="create-snippet"
            hide={!cardConfig.createSnippet}
            icon="snippet"
            isActive={false}
            label="Snippet"
            onClick={() => setShowSnippetToolbar(true)}
          />
        </ToolbarMenu>
      </ActionToolbar>
    </>
  )
}
