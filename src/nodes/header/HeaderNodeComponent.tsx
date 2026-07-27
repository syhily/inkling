import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { type EditorState, type LexicalEditor, type NodeKey } from 'lexical'
import { useContext, useEffect } from 'react'

import { CardActionToolbar } from '@/components/ui/CardActionToolbar'
import { HeaderCard } from '@/components/ui/cards/HeaderCard/HeaderCard'
import { useCardSelectionState } from '@/context/CardSelectionStoreContext'
import InklingHostIntegrationContext from '@/context/InklingHostIntegrationContext'
import { useCardWriter } from '@/hooks/useCardWriter'
import { useHeaderBackgroundImage } from '@/hooks/useHeaderBackgroundImage'
import { useMediaCardUpload } from '@/hooks/useMediaCardUpload'
import usePinturaEditor from '@/hooks/usePinturaEditor'
import { headerFieldWriter } from '@/nodes/header/header-field-writer'
import { $isHeaderNode } from '@/nodes/HeaderNode'
import { openFileSelection } from '@/utils/openFileSelection'
import { headerBackgroundUploadIntent } from '@/utils/upload-intent'

interface HeaderNodeComponentProps {
  alignment: string
  backgroundColor: string
  backgroundImageSrc: string
  backgroundImageWidth: number | null
  backgroundImageHeight: number | null
  backgroundSize: string
  buttonColor: string
  buttonText: string
  buttonTextColor: string
  buttonUrl: string
  buttonEnabled: boolean
  nodeKey: NodeKey
  header?: string
  headerTextEditor: LexicalEditor
  headerTextEditorInitialState?: EditorState | undefined
  layout: string
  subheader?: string
  subheaderTextEditor: LexicalEditor
  subheaderTextEditorInitialState?: EditorState | undefined
  textColor: string
  isSwapped: boolean
  accentColor?: string
}

function HeaderNodeComponent({
  alignment,
  backgroundColor,
  backgroundImageSrc,
  backgroundImageWidth,
  backgroundImageHeight,
  backgroundSize,
  buttonColor,
  buttonText,
  buttonTextColor,
  buttonUrl,
  buttonEnabled,
  nodeKey,
  header,
  headerTextEditor,
  headerTextEditorInitialState,
  layout,
  subheader,
  subheaderTextEditor,
  subheaderTextEditorInitialState,
  textColor,
  isSwapped,
  accentColor,
}: HeaderNodeComponentProps) {
  const [editor] = useLexicalComposerContext()
  const write = useCardWriter(nodeKey, $isHeaderNode)
  const { cardConfig } = useContext(InklingHostIntegrationContext)
  const isEditing = useCardSelectionState((state) => state.selectedCardKey === nodeKey && state.isEditingCard)

  const { isEnabled: isPinturaEnabled, openEditor: openImageEditor } = usePinturaEditor({
    config: cardConfig.pinturaConfig,
  })

  // the background-image show/hide/remove policy lives in the hook; the
  // component only supplies the node src, the write seam, and the file dialog
  const {
    showBackgroundImage,
    showImage: handleShowBackgroundImage,
    hideImage: handleHideBackgroundImage,
    clearImage: handleClearBackgroundImage,
    imageApplied,
  } = useHeaderBackgroundImage({
    layout,
    backgroundImageSrc,
    write,
    openFileDialog: () => openFileSelection({ fileInputRef }),
  })

  // field-name-as-data write handlers (src/nodes/header/header-field-writer.ts)
  const field = headerFieldWriter(write)

  const handleAlignment = field.set('alignment')
  const handleBackgroundSize = field.set('backgroundSize')
  const handleLayout = field.set('layout')
  const handleTextColor = field.set('textColor')
  const handleButtonUrl = field.set('buttonUrl')
  const writeButtonText = field.set('buttonText')

  const handleButtonText = (event: React.ChangeEvent<HTMLInputElement>): void => {
    writeButtonText(event.target.value)
  }

  const handleButtonTextBlur = field.blurFallback('buttonText', '')
  const handleButtonUrlBlur = field.blurFallback('buttonUrl', 'https://')

  const handleButtonColor = field.setColorPair('buttonColor', 'buttonTextColor')
  const writeBackgroundColor = field.setColorPair('backgroundColor', 'textColor')

  const handleBackgroundColor = (color: string, matchingTextColor: string): void => {
    writeBackgroundColor(color, matchingTextColor)

    if (layout !== 'split') {
      handleHideBackgroundImage()
    }
  }

  const handleSwapLayout = field.toggle('swapped', isSwapped)
  const handleButtonEnabled = field.toggle('buttonEnabled', buttonEnabled)

  const {
    uploader: imageUploader,
    fileInputRef,
    dragHandler: imageDragHandler,
    onFileChange,
  } = useMediaCardUpload({
    kind: 'image',
    nodeKey,
    guard: $isHeaderNode,
    onFiles: async (files, upload) => {
      const imageSrc = await headerBackgroundUploadIntent({ editor, nodeKey, upload, files })
      imageApplied(imageSrc ?? '')
    },
  })

  useEffect(() => {
    headerTextEditor?.setEditable(isEditing)
    subheaderTextEditor?.setEditable(isEditing)
  }, [isEditing, headerTextEditor, subheaderTextEditor])

  return (
    <>
      <HeaderCard
        {...{
          alignment,
          backgroundColor,
          backgroundImageSrc,
          // the dataset admits arbitrary strings from older documents; the
          // card UI speaks fixed vocabularies, so narrow at the render
          // boundary with the node's own defaults (the callout color idiom)
          backgroundSize: backgroundSize === 'contain' ? 'contain' : 'cover',
          buttonColor,
          buttonEnabled,
          buttonText,
          buttonTextColor,
          buttonUrl,
          fileUploader: imageUploader,
          handleAlignment,
          handleBackgroundColor,
          handleBackgroundSize,
          handleButtonColor,
          handleButtonEnabled,
          handleButtonText,
          handleButtonTextBlur,
          handleButtonUrl,
          handleButtonUrlBlur,
          handleClearBackgroundImage,
          handleHideBackgroundImage,
          handleLayout,
          handleShowBackgroundImage,
          handleSwapLayout,
          handleTextColor,
          headerTextEditor,
          headerTextEditorInitialState,
          imageDragHandler,
          isEditing,
          isPinturaEnabled,
          isSwapped,
          layout: layout === 'regular' || layout === 'wide' || layout === 'split' ? layout : 'full',
          openImageEditor,
          setFileInputRef: (ref: { current?: HTMLInputElement | null }) => {
            fileInputRef.current = ref?.current ?? null
          },
          showBackgroundImage,
          subheaderTextEditor,
          subheaderTextEditorInitialState,
          textColor,
          onFileChange,
        }}
      />
      <CardActionToolbar nodeKey={nodeKey} />
    </>
  )
}

export default HeaderNodeComponent
