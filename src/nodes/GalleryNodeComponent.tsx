import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getNodeByKey, type EditorState, type LexicalEditor, type NodeKey } from 'lexical'
import React from 'react'

import type { GalleryImage } from '@/types/gallery'

import { CardActionToolbar } from '@/components/ui/CardActionToolbar'
import { GalleryCard } from '@/components/ui/cards/GalleryCard'
import CardContext from '@/context/CardContext'
import InklingHostIntegrationContext from '@/context/InklingHostIntegrationContext'
import useFileDragAndDrop from '@/hooks/useFileDragAndDrop'
import useGalleryReorder from '@/hooks/useGalleryReorder'
import { $isGalleryNode, $updateCardNode } from '@/nodes/base'
import { recalculateImageRows } from '@/nodes/GalleryNode'
import { createPreviewLeasePool, galleryUploadIntent } from '@/utils/upload-intent'

export interface GalleryNodeComponentProps {
  nodeKey: NodeKey
  captionEditor: LexicalEditor | null
  captionEditorInitialState: EditorState | undefined
}

export function GalleryNodeComponent({ nodeKey, captionEditor, captionEditorInitialState }: GalleryNodeComponentProps) {
  const [editor] = useLexicalComposerContext()
  const { fileUploader } = React.useContext(InklingHostIntegrationContext)
  const { isSelected } = React.useContext(CardContext)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [images, setImages] = React.useState<GalleryImage[]>(() => {
    const existingImages = editor.getEditorState().read(() => {
      const node = $getNodeByKey(nodeKey)
      // `images` is `unknown[]` on the node type; narrowed locally to GalleryImage[]
      return $isGalleryNode(node) ? (node.images as GalleryImage[] | undefined) : undefined
    })
    return existingImages ?? []
  })
  const [previewPool] = React.useState(() => createPreviewLeasePool())

  const galleryReorder = useGalleryReorder({ images, updateImages: reorderImages, isSelected })
  const imageUploader = fileUploader.useFileUpload('image')

  const handleImageFilesDrop = async (files: File[] | FileList): Promise<void> => {
    await handleImageUploads(files)
  }

  const imageFilesDropper = useFileDragAndDrop({ handleDrop: handleImageFilesDrop })

  function reorderImages(newImages: GalleryImage[]): void {
    recalculateImageRows(newImages)
    setImages(newImages)
    setNodeImages(newImages)
  }

  function setNodeImages(newImages: GalleryImage[]): void {
    editor.update(() => {
      $updateCardNode(nodeKey, $isGalleryNode, (node) => node.setImages(newImages))
    })
  }

  const deleteImage = (imageToDelete: GalleryImage): void => {
    previewPool.release(imageToDelete.previewSrc)

    const newImages = images.filter((image) => image.fileName !== imageToDelete.fileName)
    recalculateImageRows(newImages)
    setImages(newImages)
    setNodeImages(newImages)
  }

  React.useEffect(() => {
    return () => {
      previewPool.releaseAll()
    }
  }, [previewPool])

  const handleImageUploads = async (files: FileList | File[]): Promise<void> => {
    await galleryUploadIntent({
      editor,
      nodeKey,
      upload: imageUploader.upload,
      files,
      images,
      previews: previewPool,
      setImages,
      setErrorMessage,
    })
  }

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const files = e.target.files

    if (!files || !files.length) {
      return
    }

    return await handleImageUploads(files)
  }

  function handleToolbarAdd(event: React.MouseEvent): void {
    event.preventDefault()
    fileInputRef.current?.click()
  }

  const clearErrorMessage = (): void => {
    setErrorMessage(null)
  }

  return (
    <>
      <GalleryCard
        captionEditor={captionEditor}
        captionEditorInitialState={captionEditorInitialState}
        clearErrorMessage={clearErrorMessage}
        deleteImage={deleteImage}
        errorMessage={errorMessage ?? undefined}
        fileInputRef={fileInputRef}
        filesDropper={imageFilesDropper}
        imageMimeTypes={fileUploader.fileTypes?.image?.mimeTypes}
        images={images}
        isSelected={isSelected}
        reorderHandler={galleryReorder}
        uploader={imageUploader}
        onFileChange={onFileChange}
      />

      <CardActionToolbar
        card="gallery"
        hideWhileEditing={false}
        items={[
          {
            kind: 'custom',
            dataTestId: 'add-gallery-image',
            icon: 'add',
            label: 'Add images',
            onClick: handleToolbarAdd,
          },
          { kind: 'separator' },
          { kind: 'snippet' },
        ]}
        nodeKey={nodeKey}
        visibleWhen={!imageFilesDropper.isDraggedOver && !galleryReorder.isDraggedOver && images.length > 0}
      />
    </>
  )
}
