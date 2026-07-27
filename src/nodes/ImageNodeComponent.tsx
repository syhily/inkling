import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $createNodeSelection,
  $getNodeByKey,
  $setSelection,
  type EditorState,
  type LexicalEditor,
  type NodeKey,
} from 'lexical'
import React from 'react'

import type { DraggableInfo } from '@/utils/draggable/DragDropContainer'

import { ActionToolbar } from '@/components/ui/ActionToolbar'
import { CardActionToolbar, useCardToolbarLabel } from '@/components/ui/CardActionToolbar'
import { ImageCard } from '@/components/ui/cards/ImageCard'
import { LinkInput } from '@/components/ui/LinkInput'
import { UploadFileInput } from '@/components/ui/UploadChrome'
import { useCardSelectionState } from '@/context/CardSelectionStoreContext'
import InklingHostIntegrationContext from '@/context/InklingHostIntegrationContext'
import { useCardWriter } from '@/hooks/useCardWriter'
import useDropTarget from '@/hooks/useDropTarget'
import { useMediaCardUpload } from '@/hooks/useMediaCardUpload'
import usePinturaEditor from '@/hooks/usePinturaEditor'
import { isCardWidth, type CardWidth } from '@/nodes/base/utils/card-widths'
import { $isImageNode } from '@/nodes/ImageNode'
import { $mergeImagesIntoGallery } from '@/plugins/behaviour/drop-surgery'
import { dataSrcToFile } from '@/utils/dataSrcToFile'
import { getImageDimensions } from '@/utils/getImageDimensions'
import { getAllowedImageCardWidths, getDefaultImageCardWidth } from '@/utils/image-card-widths'
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
  const isSelected = useCardSelectionState((state) => state.selectedCardKey === nodeKey)
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

  const onDropImageCard = React.useCallback(
    (draggable: DraggableInfo): boolean | undefined => {
      const { type, cardName, dataset } = draggable
      const draggedNodeKey = draggable.nodeKey

      if (type === 'card' && cardName === 'image' && draggedNodeKey && dataset) {
        editor.update(() => {
          $mergeImagesIntoGallery(nodeKey, draggedNodeKey, dataset)
        })
      }

      return undefined
    },
    [editor, nodeKey],
  )

  const canDropImageCard = React.useCallback(
    (draggable: DraggableInfo): boolean => {
      const draggedNodeKey = draggable.nodeKey
      return draggable.type === 'card' && draggable.cardName === 'image' && draggedNodeKey !== nodeKey
    },
    [nodeKey],
  )

  const imageCardDragHandler = useDropTarget({
    canDrop: canDropImageCard,
    // the container ref is the image wrapper itself, so :scope makes the
    // whole image card draggable/droppable for creating galleries
    draggableSelector: ':scope',
    droppableSelector: ':scope',
    onDrop: onDropImageCard,
  })

  const { isEnabled: isPinturaEnabled, openEditor: openImageEditor } = usePinturaEditor({
    config: cardConfig.pinturaConfig,
  })

  const allowedImageCardWidths = React.useMemo(() => {
    return getAllowedImageCardWidths(cardConfig.image?.allowedWidths)
  }, [cardConfig.image?.allowedWidths])
  const defaultImageCardWidth = React.useMemo(() => {
    return getDefaultImageCardWidth(allowedImageCardWidths)
  }, [allowedImageCardWidths])
  const hasMultipleImageCardWidths = allowedImageCardWidths.length > 1

  React.useEffect(() => {
    if (!src?.startsWith('data:') || imageUploader.isLoading) {
      return undefined
    }

    let isMounted = true

    // When copy/pasting from Google Docs it's possible for images to be transferred with data: URLs.
    // Convert `data:` URL to File and upload it
    const uploadFile = async () => {
      try {
        const file = await dataSrcToFile(src)
        if (isMounted && file) {
          runFiles([file], 'initial')
        }
      } catch (error) {
        onError(error, {})
      }
    }

    void uploadFile()

    return () => {
      isMounted = false
    }
  }, [imageUploader.isLoading, onError, src, runFiles])

  React.useEffect(() => {
    // Populate missing image dimensions, occurs when images are
    // pasted/dragged/inserted as external or when loaded from serialized
    // state that has missing images
    const populateImageDimensions = async () => {
      if (src && !initialFile && !triggerFileDialog) {
        const { width, height } = await getImageDimensions(src)
        write((node) => {
          node.width = width
          node.height = height
        })
      }
    }

    const hasMissingDimensions = editor.getEditorState().read(() => {
      const node = $getNodeByKey(nodeKey)
      if ($isImageNode(node) && (!node.width || !node.height)) {
        return true
      }
      return false
    })

    if (hasMissingDimensions) {
      // a broken/unloadable src rejects here; the dimensions simply stay unset
      populateImageDimensions().catch((error: unknown) => {
        onError(error, {})
      })
    }

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
    if (!allowedImageCardWidths.includes(cardWidth)) {
      handleImageCardResize(defaultImageCardWidth)
    }
  }, [allowedImageCardWidths, cardWidth, defaultImageCardWidth, handleImageCardResize])

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
