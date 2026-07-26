import type { EditorState, LexicalEditor } from 'lexical'

import React from 'react'

import type {
  DragHandlerLike,
  FileChangeEvent,
  FileInputRef,
  FileUploaderLike,
} from '@/components/ui/cards/card-ui-types'

import WandIcon from '@/assets/icons/inkling-wand.svg?react'
import { CardCaptionEditor } from '@/components/ui/CardCaptionEditor'
import { IconButton } from '@/components/ui/IconButton'
import { CardText } from '@/components/ui/MediaPlaceholder'
import { UploadingOverlay, UploadPlaceholder } from '@/components/ui/UploadChrome'
import { useInklingLabels } from '@/hooks/useInklingLabels'
import { isGif } from '@/utils/isGif'

interface PopulatedImageCardProps {
  src: string
  alt?: string
  previewSrc?: string | null
  imageUploader: FileUploaderLike
  imageCardDragHandler?: DragHandlerLike
  imageFileDragHandler?: DragHandlerLike
  isPinturaEnabled?: boolean
  openImageEditor?: (options: { image: string; handleSave: (blob: Blob) => void }) => void
  onFileChange: (e: FileChangeEvent) => void
}

interface EmptyImageCardProps {
  onFileChange: (e: FileChangeEvent) => void
  fileInputRef?: FileInputRef
  imageFileDragHandler?: DragHandlerLike
  errors?: Error[] | { message?: string }[]
}

export interface ImageCardProps {
  isSelected?: boolean
  src?: string
  onFileChange: (e: FileChangeEvent) => void
  captionEditor: LexicalEditor | null
  captionEditorInitialState?: EditorState
  altText?: string
  setAltText: (value: string) => void
  setFigureRef?: (ref: React.RefObject<HTMLElement | null>) => void
  fileInputRef?: FileInputRef
  cardWidth?: string
  previewSrc?: string | null
  imageUploader: FileUploaderLike
  imageCardDragHandler?: DragHandlerLike
  imageFileDragHandler?: DragHandlerLike
  isPinturaEnabled?: boolean
  openImageEditor?: (options: { image: string; handleSave: (blob: Blob) => void }) => void
}

function PopulatedImageCard({
  src,
  alt,
  previewSrc,
  imageUploader,
  imageCardDragHandler,
  imageFileDragHandler,
  isPinturaEnabled,
  openImageEditor,
  onFileChange,
}: PopulatedImageCardProps) {
  const labels = useInklingLabels()
  const progressAlt =
    imageUploader.progress !== undefined && Math.round(imageUploader.progress) < 100
      ? labels['alt.imageUploadProgress'].replace('{progress}', `${imageUploader.progress}`)
      : ''

  const setRef = React.useCallback(
    (element: HTMLElement | null) => {
      imageFileDragHandler?.setRef?.(element)
      imageCardDragHandler?.setRef?.(element)
    },
    // setRef dispatchers are stable and should not trigger re-registration
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return (
    <div ref={setRef} className="not-inkling-prose group/image relative">
      <img
        alt={alt ? alt : progressAlt}
        className={`mx-auto block ${previewSrc ? 'opacity-40' : ''}`}
        data-testid={imageUploader.isLoading ? 'image-card-loading' : 'image-card-populated'}
        src={previewSrc ? previewSrc : src}
      />
      {imageUploader.isLoading ? (
        <UploadingOverlay dataTestId="upload-progress" progress={imageUploader.progress} />
      ) : (
        <></>
      )}
      {imageCardDragHandler?.isDraggedOver ? (
        <div
          className={`absolute inset-0 flex items-center justify-center border border-grey/20 bg-black/80 dark:border-grey/10 dark:bg-grey-950`}
        >
          <CardText text={labels['media.dragText.toGallery']} />
        </div>
      ) : null}
      {imageFileDragHandler?.isDraggedOver ? (
        <div
          className={`absolute inset-0 flex items-center justify-center border border-grey/20 bg-black/80 dark:border-grey/10 dark:bg-grey-950`}
          data-testid="drag-overlay"
        >
          <CardText text={labels['media.dragText.replaceImage']} />
        </div>
      ) : null}
      {isPinturaEnabled && !isGif(src) && (
        <div
          className={`pointer-events-none invisible absolute inset-0 bg-gradient-to-t from-black/0 via-black/5 to-black/30 p-3 opacity-0 transition-all group-hover/image:visible group-hover/image:opacity-100`}
        >
          <div className="flex flex-row-reverse">
            <IconButton
              Icon={WandIcon}
              label={labels['action.edit']}
              onClick={() =>
                openImageEditor?.({
                  image: src,
                  handleSave: (editedImage: Blob) => {
                    const file =
                      editedImage instanceof File
                        ? editedImage
                        : new File([editedImage], 'image', { type: editedImage.type || 'image/png' })
                    onFileChange({
                      target: {
                        files: [file],
                      },
                    })
                  },
                })
              }
            />
          </div>
        </div>
      )}
    </div>
  )
}

function EmptyImageCard({ onFileChange, fileInputRef, imageFileDragHandler, errors }: EmptyImageCardProps) {
  const labels = useInklingLabels()

  return (
    <UploadPlaceholder
      desc={labels['upload.image.desc']}
      dragHandler={imageFileDragHandler}
      errors={errors}
      fileInputRef={fileInputRef}
      icon="image"
      inputName="image-input"
      mimeTypes={['image/*']}
      size="small"
      stopClickPropagation={true}
      onFileChange={onFileChange}
    />
  )
}

export function ImageCard({
  isSelected,
  src,
  onFileChange,
  captionEditor,
  captionEditorInitialState,
  altText,
  setAltText,
  setFigureRef,
  fileInputRef,
  cardWidth,
  previewSrc,
  imageUploader,
  imageCardDragHandler,
  imageFileDragHandler,
  isPinturaEnabled,
  openImageEditor,
}: ImageCardProps) {
  const labels = useInklingLabels()
  const figureRef = React.useRef<HTMLElement | null>(null)

  React.useEffect(() => {
    if (setFigureRef) {
      setFigureRef(figureRef)
    }
  }, [figureRef, setFigureRef])

  return (
    <>
      <figure ref={figureRef} data-inkling-card-width={cardWidth}>
        {previewSrc || src ? (
          <PopulatedImageCard
            alt={altText}
            imageCardDragHandler={imageCardDragHandler}
            imageFileDragHandler={imageFileDragHandler}
            imageUploader={imageUploader}
            isPinturaEnabled={isPinturaEnabled}
            openImageEditor={openImageEditor}
            previewSrc={previewSrc}
            src={src ?? ''}
            onFileChange={onFileChange}
          />
        ) : (
          <EmptyImageCard
            errors={imageUploader.errors}
            fileInputRef={fileInputRef}
            imageFileDragHandler={imageFileDragHandler}
            onFileChange={onFileChange}
          />
        )}
        <CardCaptionEditor
          altText={altText || ''}
          altTextPlaceholder={labels['image.altText.placeholder']}
          captionEditor={captionEditor}
          captionEditorInitialState={captionEditorInitialState}
          captionPlaceholder={labels['caption.image.placeholder']}
          dataTestId="image-caption-editor"
          isSelected={isSelected}
          readOnly={!isSelected}
          setAltText={setAltText}
        />
      </figure>
    </>
  )
}
