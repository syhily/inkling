import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $createNodeSelection, $setSelection, type EditorState, type LexicalEditor, type NodeKey } from 'lexical'
import React from 'react'

import { ActionToolbar } from '@/components/ui/ActionToolbar'
import { CardActionToolbar, useCardToolbarLabel } from '@/components/ui/CardActionToolbar'
import { ImageCard } from '@/components/ui/cards/ImageCard'
import { LinkInput } from '@/components/ui/LinkInput'
import { UploadFileInput } from '@/components/ui/UploadChrome'
import { useCardIsSelected } from '@/context/CardSelectionStoreContext'
import InklingHostIntegrationContext from '@/context/InklingHostIntegrationContext'
import { useCardWriter } from '@/hooks/useCardWriter'
import useDropTarget from '@/hooks/useDropTarget'
import { useMediaCardUpload } from '@/hooks/useMediaCardUpload'
import usePinturaEditor from '@/hooks/usePinturaEditor'
import { isCardWidth, type CardWidth } from '@/nodes/base/utils/card-widths'
import { $isImageNode } from '@/nodes/ImageNode'
import { applyImageCardDrop, isImageCardDropAllowed } from '@/plugins/behaviour/drop-surgery'
import { backfillImageDimensions, clampImageCardWidth, migrateImageDataUrl } from '@/plugins/behaviour/image-lifecycle'
import { getAllowedImageCardWidths } from '@/utils/image-card-widths'
import { isGif } from '@/utils/isGif'
import { imageUploadIntent } from '@/utils/upload-intent'

export interface ImageNodeComponentProps {
  nodeKey: NodeKey
  initialFile?: File
  src: string
  altText?: string
  captionEditor?: LexicalEditor
  captionEditorInitialState?: EditorState
  triggerFileDialog?: boolean
  previewSrc?: string | null
  href?: string
  // resolved from the node's cardWidth by the declaration's decorateTarget
  // width mapper, so undo/redo and collab changes arrive as a new prop
  cardWidth: CardWidth
}

export function ImageNodeComponent({
  nodeKey,
  initialFile,
  src,
  altText,
  captionEditor,
  captionEditorInitialState,
  triggerFileDialog,
  previewSrc,
  href,
  cardWidth,
}: ImageNodeComponentProps) {
  const [editor] = useLexicalComposerContext()
  const write = useCardWriter(nodeKey, $isImageNode)
  const [showLink, setShowLink] = React.useState(false)
  const { fileUploader, cardConfig, onError } = React.useContext(InklingHostIntegrationContext)
  const isSelected = useCardIsSelected(nodeKey)
  const toolbarFileInputRef = React.useRef<HTMLInputElement | null>(null)

  const {
    uploader: imageUploader,
    fileInputRef,
    dragHandler: imageFileDragHandler,
    onFileChange,
    runFiles,
  } = useMediaCardUpload({
    kind: 'image',
    nodeKey,
    guard: $isImageNode,
    initialFile,
    isReady: () => !src,
    triggerFileDialog,
    onFiles: (files, upload, source) =>
      imageUploadIntent({
        editor,
        nodeKey,
        upload,
        files,
        // reset original src on picker change so it can be replaced with
        // preview and upload progress (drops/initial/data-URL files keep it)
        prePatch:
          source === 'input'
            ? (node) => {
                node.src = ''
              }
            : undefined,
      }),
  })

  const imageCardDragHandler = useDropTarget({
    canDrop: (draggable) => isImageCardDropAllowed(draggable, nodeKey),
    // the container ref is the image wrapper itself, so :scope makes the
    // whole image card draggable/droppable for creating galleries
    draggableSelector: ':scope',
    droppableSelector: ':scope',
    onDrop: (draggable) => {
      applyImageCardDrop(editor, nodeKey, draggable)
      return undefined
    },
  })

  const { isEnabled: isPinturaEnabled, openEditor: openImageEditor } = usePinturaEditor({
    config: cardConfig.pinturaConfig,
  })

  const allowedImageCardWidths = React.useMemo(() => {
    return getAllowedImageCardWidths(cardConfig.image?.allowedWidths)
  }, [cardConfig.image?.allowedWidths])
  const hasMultipleImageCardWidths = allowedImageCardWidths.length > 1

  // the mount-time document migrations (data:-URL upload, dimension
  // backfill, width clamp) live in @/plugins/behaviour/image-lifecycle
  React.useEffect(() => {
    let isMounted = true
    void migrateImageDataUrl(
      { src: src ?? '', isLoading: imageUploader.isLoading, isCancelled: () => !isMounted },
      { runUpload: (file) => runFiles([file], 'initial'), onError: (error) => onError(error, {}) },
    )
    return () => {
      isMounted = false
    }
  }, [imageUploader.isLoading, onError, src, runFiles])

  React.useEffect(() => {
    void backfillImageDimensions(
      editor,
      nodeKey,
      { src, initialFile, triggerFileDialog },
      { write, onError: (error) => onError(error, {}) },
    )

    // We only do this for init
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setHref = (newHref: string) => {
    write((node) => {
      node.href = newHref
    })
  }

  const setAltText = (newAltText: string) => {
    write((node) => {
      node.alt = newAltText
    })
  }

  const handleImageCardResize = React.useCallback(
    (newWidth: unknown) => {
      if (!isCardWidth(newWidth) || !allowedImageCardWidths.includes(newWidth)) {
        return
      }

      // the node write is enough: decorate() re-reads cardWidth on the commit
      // and the new width arrives as the cardWidth prop
      write((node) => {
        node.cardWidth = newWidth // this is a property on the node, not the card
      })
    },
    [allowedImageCardWidths, write],
  )

  React.useEffect(() => {
    clampImageCardWidth(cardWidth, allowedImageCardWidths, { write })
  }, [allowedImageCardWidths, cardWidth, write])

  const cancelLinkAndReselect = () => {
    setShowLink(false)
    reselectImageCard()
  }

  const reselectImageCard = () => {
    editor.update(() => {
      const nodeSelection = $createNodeSelection()
      nodeSelection.add(nodeKey)
      $setSelection(nodeSelection)
    })
  }

  // the link-input toolbar is a raw ActionToolbar (not a CardActionToolbar),
  // so it resolves the declaration's toolbar label itself
  const toolbarLabel = useCardToolbarLabel(nodeKey)

  return (
    <>
      <ImageCard
        altText={altText}
        captionEditor={captionEditor ?? null}
        captionEditorInitialState={captionEditorInitialState}
        cardWidth={cardWidth}
        fileInputRef={fileInputRef}
        imageCardDragHandler={imageCardDragHandler}
        imageFileDragHandler={imageFileDragHandler}
        imageUploader={imageUploader}
        isPinturaEnabled={isPinturaEnabled}
        isSelected={isSelected}
        openImageEditor={openImageEditor}
        previewSrc={previewSrc}
        setAltText={setAltText}
        src={src}
        onFileChange={onFileChange}
      />

      <ActionToolbar data-inkling-card-toolbar={toolbarLabel} isVisible={showLink}>
        <LinkInput
          cancel={cancelLinkAndReselect}
          href={href}
          update={(_href: string) => {
            setHref(_href)
            cancelLinkAndReselect()
          }}
        />
      </ActionToolbar>

      <CardActionToolbar
        beforeMenu={
          <UploadFileInput
            fileInputRef={toolbarFileInputRef}
            mimeTypes={fileUploader.fileTypes?.image?.mimeTypes ?? []}
            name="image-input"
            stopClickPropagation={true}
            onFileChange={onFileChange}
          />
        }
        hideWhileEditing={false}
        items={[
          {
            kind: 'custom',
            hide: isGif(src) || !hasMultipleImageCardWidths || !allowedImageCardWidths.includes('regular'),
            icon: 'imgRegular',
            isActive: cardWidth === 'regular',
            label: 'Regular width',
            onClick: () => handleImageCardResize('regular'),
          },
          {
            kind: 'custom',
            hide: isGif(src) || !hasMultipleImageCardWidths || !allowedImageCardWidths.includes('wide'),
            icon: 'imgWide',
            isActive: cardWidth === 'wide',
            label: 'Wide width',
            onClick: () => handleImageCardResize('wide'),
          },
          {
            kind: 'custom',
            hide: isGif(src) || !hasMultipleImageCardWidths || !allowedImageCardWidths.includes('full'),
            icon: 'imgFull',
            isActive: cardWidth === 'full',
            label: 'Full width',
            onClick: () => handleImageCardResize('full'),
          },
          { kind: 'separator', hide: isGif(src) || !hasMultipleImageCardWidths },
          {
            kind: 'custom',
            icon: 'link',
            isActive: !!href,
            label: 'Link',
            onClick: () => {
              setShowLink(true)
            },
          },
          { kind: 'separator' },
          { kind: 'snippet' },
        ]}
        nodeKey={nodeKey}
        visibleWhen={!!src && !showLink}
      />
    </>
  )
}
