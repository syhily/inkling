import type { Meta, StoryObj } from '@storybook/react'

import { createEditor } from 'lexical'
import React from 'react'

import { GalleryCard, type GalleryCardProps } from '@/components/ui/cards/GalleryCard'
import { CardWrapper } from '@/components/ui/CardWrapper'
import CardContext from '@/context/CardContext'
import { MINIMAL_NODES } from '@/index'
import populateEditor from '@/utils/storybook/populate-storybook-editor'

const displayOptions = {
  Default: { isSelected: false, isEditing: false },
  Selected: { isSelected: true, isEditing: false },
} as const

type DisplayKey = keyof typeof displayOptions

interface GalleryCardStoryArgs extends Partial<GalleryCardProps> {
  display?: DisplayKey
  caption?: string
}

function GalleryCardStory({
  display = 'Default',
  caption = '',
  captionEditor: captionEditorProp,
  captionEditorInitialState,
  clearErrorMessage = () => {},
  deleteImage = () => {},
  filesDropper = { isDraggedOver: false, setRef: () => {} },
  errorMessage,
  fileInputRef: fileInputRefProp,
  imageMimeTypes = [],
  images = [],
  isSelected: isSelectedProp,
  onFileChange = () => {},
  uploader,
  reorderHandler = { isDraggedOver: false, setContainerRef: () => {} },
}: GalleryCardStoryArgs) {
  const captionEditor = React.useMemo(() => {
    if (captionEditorProp) {
      return captionEditorProp
    }
    const editor = createEditor({ nodes: MINIMAL_NODES })
    populateEditor({ editor, initialHtml: `${caption}` })
    return editor
  }, [captionEditorProp, caption])

  const fallbackFileInputRef = React.useRef<HTMLInputElement | null>(null)
  const fileInputRef = fileInputRefProp ?? fallbackFileInputRef
  const displayState = displayOptions[display]
  const isSelected = isSelectedProp ?? displayState.isSelected
  const isEditing = displayState.isEditing

  const cardContextValue = React.useMemo(
    () => ({
      captionHasFocus: false,
      nodeKey: undefined,
      setCaptionHasFocus: () => {},
    }),
    [],
  )

  return (
    <div className="inkling-prose">
      <div className="mx-auto my-8 w-[1170px] min-w-[initial]">
        <CardContext.Provider value={cardContextValue}>
          <CardWrapper isSelected={isSelected} isEditing={isEditing}>
            <GalleryCard
              captionEditor={captionEditor}
              captionEditorInitialState={captionEditorInitialState}
              clearErrorMessage={clearErrorMessage}
              deleteImage={deleteImage}
              errorMessage={errorMessage}
              fileInputRef={fileInputRef}
              filesDropper={filesDropper}
              imageMimeTypes={imageMimeTypes}
              images={images}
              isSelected={isSelected}
              onFileChange={onFileChange}
              reorderHandler={reorderHandler}
              uploader={uploader}
            />
          </CardWrapper>
        </CardContext.Provider>
      </div>
    </div>
  )
}

const meta = {
  title: 'Primary cards/Gallery card',
  component: GalleryCardStory,
  subcomponents: { CardWrapper },
  argTypes: {
    display: {
      options: Object.keys(displayOptions),
      mapping: displayOptions,
      control: {
        type: 'radio',
        labels: {
          Default: 'Default',
          Selected: 'Selected',
        },
        defaultValue: displayOptions.Default,
      },
    },
  },
  parameters: {
    status: {
      type: 'Functional',
    },
  },
} satisfies Meta<typeof GalleryCardStory>
export default meta

type Story = StoryObj<typeof meta>

export const Empty: Story = {
  args: {
    display: 'Selected',
    caption: '',
    filesDropper: { isDraggedOver: false, setRef: () => {} },
  },
}
