import type { Meta, StoryObj } from '@storybook/react'

import { createEditor } from 'lexical'
import React from 'react'

import { HeaderCard } from '@/components/ui/cards/HeaderCard/v2/HeaderCard'
import { CardWrapper } from '@/components/ui/CardWrapper'
import { MINIMAL_NODES } from '@/index'
import populateEditor from '@/utils/storybook/populate-storybook-editor'

import { editorEmptyState } from '../../../../../../.storybook/editorEmptyState'

const displayOptions = {
  Default: { isSelected: false, isEditing: false },
  Selected: { isSelected: true, isEditing: false },
  Editing: { isSelected: true, isEditing: true },
} as const

type DisplayKey = keyof typeof displayOptions

type HeaderCardProps = React.ComponentProps<typeof HeaderCard>

interface HeaderCardStoryArgs extends Partial<HeaderCardProps> {
  display?: DisplayKey
  header?: string
  subheader?: string
}

function HeaderCardStory({ display = 'Default', header = '', subheader = '', ...args }: HeaderCardStoryArgs) {
  const headerTextEditor = createEditor({ nodes: MINIMAL_NODES })
  const subheaderTextEditor = createEditor({ nodes: MINIMAL_NODES })

  populateEditor({ editor: headerTextEditor, initialHtml: `${header}` })
  populateEditor({ editor: subheaderTextEditor, initialHtml: `${subheader}` })

  const displayState = displayOptions[display]
  const componentProps = {
    handleAlignment: () => {},
    handleButtonText: () => {},
    handleButtonEnabled: () => {},
    handleShowBackgroundImage: () => {},
    handleHideBackgroundImage: () => {},
    handleClearBackgroundImage: () => {},
    handleBackgroundColor: () => {},
    handleButtonColor: () => {},
    handleLayout: () => {},
    handleTextColor: () => {},
    onFileChange: () => {},
    openImageEditor: () => {},
    imageDragHandler: {},
    handleSwapLayout: () => {},
    handleBackgroundSize: () => {},
    handleButtonTextBlur: () => {},
    handleButtonUrlBlur: () => {},
    handleButtonUrl: () => {},
    setFileInputRef: () => {},
    ...args,
    headerTextEditor,
    subheaderTextEditor,
  }

  return (
    <div className="inkling-prose">
      <div className="mx-auto my-8 w-full min-w-[initial]">
        <CardWrapper {...displayState} {...componentProps}>
          <HeaderCard {...displayState} {...componentProps} />
        </CardWrapper>
      </div>
    </div>
  )
}

const meta = {
  title: 'Primary cards/Header card v2',
  component: HeaderCardStory,
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
          Editing: 'Editing',
        },
        defaultValue: displayOptions.Default,
      },
    },
    layout: {
      options: ['regular', 'wide', 'full', 'split'],
      control: { type: 'radio' },
    },
  },
  parameters: {
    status: {
      type: 'Functional',
    },
  },
} satisfies Meta<typeof HeaderCardStory>
export default meta

type Story = StoryObj<typeof meta>

export const Empty: Story = {
  args: {
    display: 'Editing',
    layout: 'regular',
    alignment: 'center',
    showBackgroundImage: false,
    backgroundImageSrc: 'https://static.inkling.local/v4.0.0/images/andreas-selter-e4yK8QQlZa0-unsplash.jpg',
    header: '',
    subheader: '',
    buttonText: '',
    buttonColor: '#000000',
    buttonTextColor: '#ffffff',
    backgroundColor: '#F3B389',
    textColor: '#000000',
    buttonUrl: '',
    headerTextEditorInitialState: editorEmptyState,
    subheaderTextEditorInitialState: editorEmptyState,
  },
}

export const Populated: Story = {
  args: {
    display: 'Editing',
    layout: 'split',
    alignment: 'center',
    showBackgroundImage: true,
    backgroundImageSrc: 'https://static.inkling.local/v4.0.0/images/andreas-selter-e4yK8QQlZa0-unsplash.jpg',
    header: 'This is a heading',
    subheader: 'And here is some subheading text.',
    buttonEnabled: true,
    buttonText: 'Click Me',
    buttonColor: '#000000',
    buttonTextColor: '#ffffff',
    backgroundColor: '#F3B389',
    textColor: '#000000',
    buttonUrl: 'https://inkling.local/',
  },
}
