import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { type EditorState, type LexicalEditor, type NodeKey } from 'lexical'
import React, { useState } from 'react'

import { CardActionToolbar } from '@/components/ui/CardActionToolbar'
import { VideoCard } from '@/components/ui/cards/VideoCard'
import { useCardSelectionState } from '@/context/CardSelectionStoreContext'
import InklingHostIntegrationContext from '@/context/InklingHostIntegrationContext'
import { useCardWriter } from '@/hooks/useCardWriter'
import { useMediaCardUpload } from '@/hooks/useMediaCardUpload'
import { usePreviewLease } from '@/hooks/usePreviewLease'
import { $isVideoNode } from '@/nodes/base'
import { isCardWidth } from '@/nodes/base/utils/card-widths'
import extractVideoMetadata, { type VideoMetadata } from '@/utils/extractVideoMetadata'
import { customThumbnailUploadIntent, videoFlowUploadIntent, type UploadFn } from '@/utils/upload-intent'

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
  const isSelected = useCardSelectionState((state) => state.selectedCardKey === nodeKey)
  const isEditing = useCardSelectionState((state) => state.selectedCardKey === nodeKey && state.isEditingCard)
  const [previewThumbnail, setThumbnailPreview] = usePreviewLease()
  // host-provided hook seam: the composer contract requires useFileUpload to
  // be identity-stable for the editor's lifetime, so this call is the same
  // function every render (the compiler cannot verify context provenance)
  // oxlint-disable-next-line react/react-compiler -- host-provided hook; identity is a composer contract
  const thumbnailUploader = fileUploader.useFileUpload('mediaThumbnail')
  const [metadataExtractionErrors, setMetadataExtractionErrors] = useState<VideoNodeMetadataError[]>([])

  const videoMimeTypes: string[] = fileUploader.fileTypes?.video?.mimeTypes || ['video/*']

  const handleVideoUpload = async (files: FileList | File[] | null, videoUpload: UploadFn) => {
    const file = files?.[0]
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

    // the main → thumbnail composition lives in upload-intent; the
    // component keeps the metadata catch and the preview lease
    await videoFlowUploadIntent({
      editor,
      nodeKey,
      videoUpload,
      thumbnailUpload: thumbnailUploader.upload,
      files: [file],
      meta: metadata,
      onEmptyPreview: () => setThumbnailPreview(null),
    })

    setThumbnailPreview(null)
  }

  const {
    uploader: videoUploader,
    fileInputRef: videoFileInputRef,
    dragHandler: videoDragHandler,
    onFileChange: onVideoFileChange,
  } = useMediaCardUpload({
    kind: 'video',
    nodeKey,
    guard: $isVideoNode,
    initialFile,
    isReady: (uploader) => !uploader.isLoading,
    triggerFileDialog,
    onFiles: (files, upload) => handleVideoUpload(files, upload),
  })

  const {
    uploader: customThumbnailUploader,
    dragHandler: thumbnailDragHandler,
    onFileChange: onCustomThumbnailChange,
  } = useMediaCardUpload({
    kind: 'image',
    nodeKey,
    guard: $isVideoNode,
    onFiles: (files, upload) => customThumbnailUploadIntent({ editor, nodeKey, upload, files }),
  })

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
