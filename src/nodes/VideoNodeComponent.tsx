import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { type EditorState, type LexicalEditor, type NodeKey } from 'lexical'
import React, { useState } from 'react'

import type { FileChangeEvent } from '@/components/ui/cards/card-ui-types'

import { ActionToolbar } from '@/components/ui/ActionToolbar'
import { VideoCard } from '@/components/ui/cards/VideoCard'
import { SnippetCreateToolbar } from '@/components/ui/SnippetCreateToolbar'
import { ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator } from '@/components/ui/ToolbarMenu'
import CardContext from '@/context/CardContext'
import InklingComposerContext from '@/context/InklingComposerContext'
import useFileDragAndDrop from '@/hooks/useFileDragAndDrop'
import { usePreviewLease } from '@/hooks/usePreviewLease'
import { $isVideoNode, $updateCardNode } from '@/nodes/base'
import { isCardWidth } from '@/nodes/base/utils/card-widths'
import extractVideoMetadata, { type VideoMetadata } from '@/utils/extractVideoMetadata'
import { openFileSelection } from '@/utils/openFileSelection'
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
  const { fileUploader, cardConfig } = React.useContext(InklingComposerContext)
  const cardContext = React.useContext(CardContext)
  const videoFileInputRef = React.useRef<HTMLInputElement | null>(null)
  const [previewThumbnail, setThumbnailPreview] = usePreviewLease()
  const videoUploader = fileUploader.useFileUpload('video')
  const thumbnailUploader = fileUploader.useFileUpload('mediaThumbnail')
  const customThumbnailUploader = fileUploader.useFileUpload('image')

  const videoDragHandler = useFileDragAndDrop({ handleDrop: handleVideoDrop })
  const thumbnailDragHandler = useFileDragAndDrop({ handleDrop: handleThumbnailDrop })
  const [metadataExtractionErrors, setMetadataExtractionErrors] = useState<VideoNodeMetadataError[]>([])
  const [showSnippetToolbar, setShowSnippetToolbar] = useState<boolean>(false)

  const videoMimeTypes: string[] = fileUploader.fileTypes?.video?.mimeTypes || ['video/*']

  React.useEffect(() => {
    const uploadInitialFiles = async (file: File | null) => {
      if (file && !videoUploader.isLoading) {
        await handleVideoUpload([file])
      }
    }
    uploadInitialFiles(initialFile)

    // We only do this for init
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    editor.update(() => {
      $updateCardNode(nodeKey, $isVideoNode, (node) => {
        node.customThumbnailSrc = ''
        node.thumbnailHeight = node.height
        node.thumbnailWidth = node.width
      })
    })
  }

  const onLoopChange = (checked: boolean) => {
    editor.update(() => {
      $updateCardNode(nodeKey, $isVideoNode, (node) => {
        node.loop = checked
      })
    })
  }

  const onCardWidthChange = (width: unknown) => {
    if (!isCardWidth(width)) {
      return
    }

    editor.update(() => {
      $updateCardNode(nodeKey, $isVideoNode, (node) => {
        node.cardWidth = width
      })
      cardContext.setCardWidth(width)
    })
  }

  const handleToolbarEdit = (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    cardContext.setEditing(true)
  }

  // when card is inserted from the card menu or slash command we want to show the file picker immediately
  // uses a setTimeout to avoid issues with React rendering the component twice in dev mode 🙈
  React.useEffect(() => {
    if (!triggerFileDialog) {
      return
    }

    const renderTimeout = setTimeout(() => {
      // trigger dialog
      openFileSelection({ fileInputRef: videoFileInputRef })

      // clear the property on the node so we don't accidentally trigger anything with a re-render
      editor.update(() => {
        $updateCardNode(nodeKey, $isVideoNode, (node) => {
          node.triggerFileDialog = false
        })
      })
    })

    return () => {
      clearTimeout(renderTimeout)
    }
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
        isEditing={cardContext.isEditing}
        isLoopChecked={isLoopChecked}
        isSelected={cardContext.isSelected}
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
      <ActionToolbar data-inkling-card-toolbar="video" isVisible={showSnippetToolbar}>
        <SnippetCreateToolbar nodeKey={nodeKey} onClose={() => setShowSnippetToolbar(false)} />
      </ActionToolbar>

      <ActionToolbar
        data-inkling-card-toolbar="video"
        isVisible={!!isCardPopulated && cardContext.isSelected && !cardContext.isEditing && !showSnippetToolbar}
      >
        <ToolbarMenu>
          <ToolbarMenuItem
            dataTestId="edit-video-card"
            icon="edit"
            isActive={false}
            label="Edit"
            onClick={handleToolbarEdit}
          />
          <ToolbarMenuSeparator hide={!cardConfig.createSnippet} />
          <ToolbarMenuItem
            dataTestId="create-snippet"
            hide={!cardConfig.createSnippet}
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
