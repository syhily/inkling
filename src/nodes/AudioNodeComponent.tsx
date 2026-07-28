import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { type NodeKey } from 'lexical'
import React from 'react'

import type { AudioNode } from '@/nodes/AudioNode'

import { CardActionToolbar } from '@/components/ui/CardActionToolbar'
import { AudioCard } from '@/components/ui/cards/AudioCard'
import { useCardIsEditing } from '@/context/CardSelectionStoreContext'
import InklingHostIntegrationContext from '@/context/InklingHostIntegrationContext'
import { useCardWriter } from '@/hooks/useCardWriter'
import { useMediaCardUpload } from '@/hooks/useMediaCardUpload'
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
  const isEditing = useCardIsEditing(nodeKey)

  const {
    uploader: audioUploader,
    fileInputRef: audioFileInputRef,
    dragHandler: audioDragHandler,
    onFileChange: onAudioFileChange,
  } = useMediaCardUpload({
    kind: 'audio',
    nodeKey,
    guard: $isAudioNode,
    initialFile,
    isReady: (uploader) => !src && !uploader.isLoading,
    triggerFileDialog,
    onFiles: (files, upload) => audioUploadIntent({ editor, nodeKey, upload, files }),
  })

  const {
    uploader: thumbnailUploader,
    fileInputRef: thumbnailFileInputRef,
    dragHandler: thumbnailDragHandler,
    onFileChange: onThumbnailFileChange,
  } = useMediaCardUpload({
    kind: 'mediaThumbnail',
    nodeKey,
    guard: $isAudioNode,
    dragDisabled: !isEditing,
    onFiles: (files, upload) => audioThumbnailUploadIntent({ editor, nodeKey, upload, files }),
  })

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

/**
 * Audio's decorate render — the React-bearing half of its decorate-target,
 * paired with the declaration by `@/nodes/cards/card-decorate`.
 */
export function renderAudioCard(node: AudioNode) {
  return (
    <AudioNodeComponent
      duration={node.duration}
      initialFile={node.__initialFile}
      nodeKey={node.getKey()}
      src={node.src}
      thumbnailSrc={node.thumbnailSrc}
      title={node.title}
      triggerFileDialog={node.__triggerFileDialog}
    />
  )
}
