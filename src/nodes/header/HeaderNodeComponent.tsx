import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { type EditorState, type LexicalEditor, type NodeKey } from 'lexical'
import { useContext, useEffect, useRef, useState } from 'react'

import type { FileChangeEvent } from '@/components/ui/cards/card-ui-types'

import { ActionToolbar } from '@/components/ui/ActionToolbar'
import { HeaderCard } from '@/components/ui/cards/HeaderCard/HeaderCard'
import { SnippetCreateToolbar } from '@/components/ui/SnippetCreateToolbar'
import { ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator } from '@/components/ui/ToolbarMenu'
import CardContext from '@/context/CardContext'
import InklingComposerContext from '@/context/InklingComposerContext'
import useFileDragAndDrop from '@/hooks/useFileDragAndDrop'
import usePinturaEditor from '@/hooks/usePinturaEditor'
import { $updateCardNode } from '@/nodes/base'
import { $isHeaderNode } from '@/nodes/HeaderNode'
import { EDIT_CARD_COMMAND } from '@/plugins/InklingBehaviourPlugin'
import { getAccentColor } from '@/utils/getAccentColor'
import { openFileSelection } from '@/utils/openFileSelection'
import { backgroundImageUploadHandler } from '@/utils/upload-intent'

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
  headerTextEditorState?: EditorState | undefined
  layout: string
  subheader?: string
  subheaderTextEditor: LexicalEditor
  subheaderTextEditorInitialState?: EditorState | undefined
  subheaderTextEditorState?: EditorState | undefined
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
  const { cardConfig, fileUploader } = useContext(InklingComposerContext)
  const { isEditing, isSelected } = useContext(CardContext)
  const [showSnippetToolbar, setShowSnippetToolbar] = useState<boolean>(false)
  const [showBackgroundImage, setShowBackgroundImage] = useState<boolean>(Boolean(backgroundImageSrc))
  const [lastBackgroundImage, setLastBackgroundImage] = useState<string>(backgroundImageSrc)

  // this is used to determine if the image was deliberately removed by the user or not, for some UX finesse
  const [imageRemoved, setImageRemoved] = useState<boolean>(false)

  const { isEnabled: isPinturaEnabled, openEditor: openImageEditor } = usePinturaEditor({
    config: cardConfig.pinturaConfig as Parameters<typeof usePinturaEditor>[0] extends { config?: infer C } ? C : never,
  })
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (layout !== 'split') {
      setShowBackgroundImage(Boolean(backgroundImageSrc))
    }

    if (layout === 'split' && !backgroundImageSrc && lastBackgroundImage) {
      handleShowBackgroundImage()
    }
    // We just want to reset the show background image state when the layout changes, not when the image changes
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [layout])

  useEffect(() => {
    const accent = getAccentColor()

    if (accent) {
      editor.update(() => {
        $updateCardNode(nodeKey, $isHeaderNode, (node) => {
          node.accentColor = accent
        })
      })
    }
  }, [editor, nodeKey])

  const handleAlignment = (a: string): void => {
    editor.update(() => {
      $updateCardNode(nodeKey, $isHeaderNode, (node) => {
        node.alignment = a
      })
    })
  }

  const handleBackgroundSize = (a: string): void => {
    editor.update(() => {
      $updateCardNode(nodeKey, $isHeaderNode, (node) => {
        node.backgroundSize = a
      })
    })
  }

  const handleToolbarEdit = (event: React.MouseEvent): void => {
    event.preventDefault()
    event.stopPropagation()
    editor.dispatchCommand(EDIT_CARD_COMMAND, { cardKey: nodeKey, focusEditor: false })
  }

  const imageUploader = fileUploader.useFileUpload('image')

  const handleImageChange = async (files: FileList | File[] | null): Promise<void> => {
    // reset original src so it can be replaced with preview and upload progress
    editor.update(() => {
      $updateCardNode(nodeKey, $isHeaderNode, (node) => {
        node.backgroundImageSrc = ''
      })
    })

    const bgResult = await backgroundImageUploadHandler(files, imageUploader.upload)
    const imageSrc = bgResult?.imageSrc ?? ''
    const width = bgResult?.width ?? 0
    const height = bgResult?.height ?? 0

    editor.update(() => {
      $updateCardNode(nodeKey, $isHeaderNode, (node) => {
        node.backgroundImageSrc = imageSrc ?? ''
        node.backgroundImageWidth = width
        node.backgroundImageHeight = height
      })
    })

    setLastBackgroundImage(imageSrc ?? '')
    setImageRemoved(false)
  }

  const onFileChange = async (e: FileChangeEvent): Promise<void> => {
    await handleImageChange(e.target.files)
  }

  const imageDragHandler = useFileDragAndDrop({ handleDrop: handleImageChange })

  const handleLayout = (l: string): void => {
    editor.update(() => {
      $updateCardNode(nodeKey, $isHeaderNode, (node) => {
        node.layout = l
      })
    })
  }

  const handleButtonText = (event: React.ChangeEvent<HTMLInputElement>): void => {
    editor.update(() => {
      $updateCardNode(nodeKey, $isHeaderNode, (node) => {
        node.buttonText = event.target.value
      })
    })
  }

  const handleButtonTextBlur = (event: React.FocusEvent<HTMLInputElement>): void => {
    if (!event.target.value) {
      editor.update(() => {
        $updateCardNode(nodeKey, $isHeaderNode, (node) => {
          node.buttonText = ''
        })
      })
    }
  }

  const handleClearBackgroundImage = (): void => {
    editor.update(() => {
      $updateCardNode(nodeKey, $isHeaderNode, (node) => {
        node.backgroundImageSrc = ''
      })
    })
    setImageRemoved(true)
  }

  const handleShowBackgroundImage = (): void => {
    setShowBackgroundImage(true)

    if (lastBackgroundImage && !imageRemoved) {
      editor.update(() => {
        $updateCardNode(nodeKey, $isHeaderNode, (node) => {
          node.backgroundImageSrc = lastBackgroundImage
        })
      })
    } else {
      openFileSelection({ fileInputRef })
    }
  }

  const handleHideBackgroundImage = (): void => {
    setShowBackgroundImage(false)
    editor.update(() => {
      $updateCardNode(nodeKey, $isHeaderNode, (node) => {
        node.backgroundImageSrc = ''
      })
    })
  }

  const handleBackgroundColor = (color: string, matchingTextColor: string): void => {
    editor.update(() => {
      $updateCardNode(nodeKey, $isHeaderNode, (node) => {
        node.backgroundColor = color
        node.textColor = matchingTextColor

        if (layout !== 'split') {
          handleHideBackgroundImage()
        }
      })
    })
  }

  const handleTextColor = (color: string): void => {
    editor.update(() => {
      $updateCardNode(nodeKey, $isHeaderNode, (node) => {
        node.textColor = color
      })
    })
  }

  const handleButtonColor = (color: string, matchingTextColor: string): void => {
    editor.update(() => {
      $updateCardNode(nodeKey, $isHeaderNode, (node) => {
        node.buttonColor = color
        node.buttonTextColor = matchingTextColor
      })
    })
  }

  const handleSwapLayout = (): void => {
    editor.update(() => {
      $updateCardNode(nodeKey, $isHeaderNode, (node) => {
        node.swapped = !isSwapped
      })
    })
  }

  const handleButtonEnabled = (): void => {
    editor.update(() => {
      $updateCardNode(nodeKey, $isHeaderNode, (node) => {
        node.buttonEnabled = !buttonEnabled
      })
    })
  }

  const handleButtonUrl = (val: string): void => {
    editor.update(() => {
      $updateCardNode(nodeKey, $isHeaderNode, (node) => {
        node.buttonUrl = val
      })
    })
  }

  const handleButtonUrlBlur = (event: React.FocusEvent<HTMLInputElement>): void => {
    if (!event.target.value) {
      editor.update(() => {
        $updateCardNode(nodeKey, $isHeaderNode, (node) => {
          node.buttonUrl = 'https://'
        })
      })
    }
  }

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
          backgroundSize,
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
          layout,
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
      <ActionToolbar data-inkling-card-toolbar="header" isVisible={showSnippetToolbar}>
        <SnippetCreateToolbar nodeKey={nodeKey} onClose={() => setShowSnippetToolbar(false)} />
      </ActionToolbar>

      <ActionToolbar data-inkling-card-toolbar="header" isVisible={isSelected && !isEditing && !showSnippetToolbar}>
        <ToolbarMenu>
          <ToolbarMenuItem icon="edit" isActive={false} label="Edit" onClick={handleToolbarEdit} />
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

export default HeaderNodeComponent
