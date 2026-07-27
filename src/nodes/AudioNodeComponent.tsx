import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { type NodeKey } from 'lexical'
import React from 'react'

import { CardActionToolbar } from '@/components/ui/CardActionToolbar'
import { AudioCard } from '@/components/ui/cards/AudioCard'
import { useCardSelectionState } from '@/context/CardSelectionStoreContext'
import InklingHostIntegrationContext from '@/context/InklingHostIntegrationContext'
import { useCardWriter } from '@/hooks/useCardWriter'
import useFileDragAndDrop from '@/hooks/useFileDragAndDrop'
import { useInitialFileUpload } from '@/hooks/useInitialFileUpload'
import { useTriggerFileDialog } from '@/hooks/useTriggerFileDialog'
import { $isAudioNode } from '@/nodes/base'
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
  const write = useCardWriter(nodeKey, $isAudioNode)
  const { fileUploader } = React.useContext(InklingHostIntegrationContext)
  const isEditing = useCardSelectionState((state) => state.selectedCardKey === nodeKey && state.isEditingCard)
  const audioFileInputRef = React.useRef<HTMLInputElement>(null)
  const thumbnailFileInputRef = React.useRef<HTMLInputElement>(null)

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
    write((node) => {
      node.title = newTitle
    })
  }

  const removeThumbnail = () => {
    write((node) => {
      node.thumbnailSrc = ''
    })
  }

  async function handleAudioDrop(files: File[]) {
    await uploadAudio(files)
  }

  async function handleThumbnailDrop(files: File[]) {
    await uploadThumbnail(files)
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
        isEditing={isEditing}
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
      <CardActionToolbar nodeKey={nodeKey} visibleWhen={!!src} />
    </>
  )
}
