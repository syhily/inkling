import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { type EditorState, type LexicalEditor, type NodeKey } from 'lexical'
import React, { useState } from 'react'

import type { FileChangeEvent } from '@/components/ui/cards/card-ui-types'

import { CardActionToolbar } from '@/components/ui/CardActionToolbar'
import { VideoCard } from '@/components/ui/cards/VideoCard'
import InklingHostIntegrationContext from '@/context/InklingHostIntegrationContext'
import { useCardSelection } from '@/hooks/useCardSelection'
import { useCardWriter } from '@/hooks/useCardWriter'
import useFileDragAndDrop from '@/hooks/useFileDragAndDrop'
import { useInitialFileUpload } from '@/hooks/useInitialFileUpload'
import { usePreviewLease } from '@/hooks/usePreviewLease'
import { useTriggerFileDialog } from '@/hooks/useTriggerFileDialog'
import { $isVideoNode } from '@/nodes/base'
import { isCardWidth } from '@/nodes/base/utils/card-widths'
import extractVideoMetadata, { type VideoMetadata } from '@/utils/extractVideoMetadata'
import { customThumbnailUploadIntent, videoThumbnailUploadIntent, videoUploadIntent } from '@/utils/upload-intent'

interface VideoNodeComponentProps {
  nodeKey: NodeKey
  thumbnail: string
  customThumbnail: string
  captionEditor: LexicalEditor | null
  captionEditorInitialState: EditorState | undefined
  totalDuration: string
  cardWidth: string
  triggerFileDialog: boolean
  isLoopChecked: boolean
  initialFile: File | null
}

interface VideoNodeMetadataError {
  name: string
  message: string
}

export function VideoNodeComponent({
  nodeKey,
  thumbnail,
  customThumbnail,
  captionEditor,
  captionEditorInitialState,
  totalDuration,
  cardWidth,
  triggerFileDialog,
  isLoopChecked,
  initialFile,
}: VideoNodeComponentProps) {
  const [editor] = useLexicalComposerContext()
  const write = useCardWriter(nodeKey, $isVideoNode)
  const { fileUploader } = React.useContext(InklingHostIntegrationContext)
  const isSelected = useCardSelection((state) => state.selectedCardKey === nodeKey)
  const isEditing = useCardSelection((state) => state.selectedCardKey === nodeKey && state.isEditingCard)
  const videoFileInputRef = React.useRef<HTMLInputElement | null>(null)
  const [previewThumbnail, setThumbnailPreview] = usePreviewLease()
  const videoUploader = fileUploader.useFileUpload('video')
  const thumbnailUploader = fileUploader.useFileUpload('mediaThumbnail')
  const customThumbnailUploader = fileUploader.useFileUpload('image')

  const videoDragHandler = useFileDragAndDrop({ handleDrop: handleVideoDrop })
  const thumbnailDragHandler = useFileDragAndDrop({ handleDrop: handleThumbnailDrop })
  const [metadataExtractionErrors, setMetadataExtractionErrors] = useState<VideoNodeMetadataError[]>([])

  const videoMimeTypes: string[] = fileUploader.fileTypes?.video?.mimeTypes || ['video/*']

  useInitialFileUpload({
    initialFile,
    isReady: !videoUploader.isLoading,
    run: (file) => handleVideoUpload([file]),
  })

  const handleVideoUpload = async (files: FileList | File[]) => {
    const file = files[0]
    if (!file) {
      return
    }

    let metadata: VideoMetadata
    try {
      metadata = await extractVideoMetadata(file)
    } catch (error) {
      setMetadataExtractionErrors([
        {
          name: file.name,
          message: `The file type you uploaded is not supported. Please use .${videoMimeTypes.join(', .').toUpperCase()}`,
        },
      ])
      return
    }

    if (metadata.thumbnailBlob) {
      setThumbnailPreview(metadata.thumbnailBlob)
    }

    const videoUrl = await videoUploadIntent({
      editor,
      nodeKey,
      upload: videoUploader.upload,
      files: [file],
      meta: metadata,
      onEmptyPreview: () => setThumbnailPreview(null),
    })

    if (!videoUrl || !metadata.thumbnailBlob) {
      return
    }

    const thumbnailFile = new File([metadata.thumbnailBlob], `${file.name}.jpg`, { type: 'image/jpeg' })
    await videoThumbnailUploadIntent({
      editor,
      nodeKey,
      upload: thumbnailUploader.upload,
      files: [thumbnailFile],
      videoUrl,
    })

    setThumbnailPreview(null)
  }

  const onVideoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      return
    }
    await handleVideoUpload(e.target.files ? Array.from(e.target.files) : [])
  }

  const handleCustomThumbnailChange = async (files: FileList | File[]) => {
    await customThumbnailUploadIntent({ editor, nodeKey, upload: customThumbnailUploader.upload, files })
  }

  const onCustomThumbnailChange = async (e: FileChangeEvent) => {
    await handleCustomThumbnailChange(e.target.files ? Array.from(e.target.files) : [])
  }

  async function handleVideoDrop(files: File[]) {
    await handleVideoUpload(files)
  }

  async function handleThumbnailDrop(files: File[]) {
    await handleCustomThumbnailChange(files)
  }

  const onRemoveCustomThumbnail = () => {
    write((node) => {
      node.customThumbnailSrc = ''
      node.thumbnailHeight = node.height
      node.thumbnailWidth = node.width
    })
  }

  const onLoopChange = (checked: boolean) => {
    write((node) => {
      node.loop = checked
    })
  }

  const onCardWidthChange = (width: unknown) => {
    if (!isCardWidth(width)) {
      return
    }

    write((node) => {
      node.cardWidth = width
    })
  }

  useTriggerFileDialog({
    editor,
    nodeKey,
    guard: $isVideoNode,
    fileInputRef: videoFileInputRef,
    triggerFileDialog,
  })

  const isCardPopulated = customThumbnail || thumbnail

  return (
    <>
      <VideoCard
        captionEditor={captionEditor}
        captionEditorInitialState={captionEditorInitialState}
        cardWidth={cardWidth}
        customThumbnail={customThumbnail}
        customThumbnailUploader={customThumbnailUploader}
        fileInputRef={videoFileInputRef}
        isEditing={isEditing}
        isLoopChecked={isLoopChecked}
        isSelected={isSelected}
        thumbnail={previewThumbnail || thumbnail}
        thumbnailDragHandler={thumbnailDragHandler}
        thumbnailMimeTypes={fileUploader.fileTypes?.image?.mimeTypes ?? []}
        totalDuration={totalDuration}
        videoDragHandler={videoDragHandler}
        videoMimeTypes={videoMimeTypes}
        videoUploader={videoUploader}
        videoUploadErrors={[
          ...(thumbnailUploader.errors ?? []),
          ...metadataExtractionErrors,
          ...(videoUploader.errors ?? []),
        ]}
        onCardWidthChange={onCardWidthChange}
        onCustomThumbnailChange={onCustomThumbnailChange}
        onLoopChange={onLoopChange}
        onRemoveCustomThumbnail={onRemoveCustomThumbnail}
        onVideoFileChange={onVideoFileChange}
      />
      <CardActionToolbar editDataTestId="edit-video-card" nodeKey={nodeKey} visibleWhen={!!isCardPopulated} />
    </>
  )
}
