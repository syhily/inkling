import type { Meta, StoryObj } from '@storybook/react'

import { createEditor } from 'lexical'
import React from 'react'

import { HeaderCard } from '@/components/ui/cards/HeaderCard/HeaderCard'
import { CardWrapper } from '@/components/ui/CardWrapper'
import { MINIMAL_NODES } from '@/index'
import populateEditor from '@/utils/storybook/populate-storybook-editor'

import { editorEmptyState } from '../../../../../.storybook/editorEmptyState'

const displayOptions = {
  Default: { isSelected: false, isEditing: false },
  Selected: { isSelected: true, isEditing: false },
  Editing: { isSelected: true, isEditing: true },
} as const

type DisplayKey = keyof typeof displayOptions

type HeaderCardProps = React.ComponentProps<typeof HeaderCard>

// story args stay flat (storybook controls are per-field); groupProps maps
// them onto the card's grouped seam
type HeaderCardStoryArgs = Partial<HeaderCardProps['view']> &
  Partial<Pick<HeaderCardProps['editors'], 'headerTextEditorInitialState' | 'subheaderTextEditorInitialState'>> & {
    display?: DisplayKey
    header?: string
    subheader?: string
  }

function groupProps(args: HeaderCardStoryArgs, editors: HeaderCardProps['editors']): HeaderCardProps {
  const {
    display: _display,
    header: _header,
    subheader: _subheader,
    headerTextEditorInitialState,
    subheaderTextEditorInitialState,
    ...view
  } = args
  return {
    view,
    handlers: {
      handleAlignment: () => {},
      handleBackgroundColor: () => {},
      handleBackgroundSize: () => {},
      handleButtonColor: () => {},
      handleButtonEnabled: () => {},
      handleButtonText: () => {},
      handleButtonTextBlur: () => {},
      handleButtonUrl: () => {},
      handleButtonUrlBlur: () => {},
      handleClearBackgroundImage: () => {},
      handleHideBackgroundImage: () => {},
      handleLayout: () => {},
      handleShowBackgroundImage: () => {},
      handleSwapLayout: () => {},
      handleTextColor: () => {},
    },
    upload: {
      imageDragHandler: { isDraggedOver: false, setRef: () => {} },
      openImageEditor: () => {},
      setFileInputRef: () => {},
      onFileChange: () => {},
    },
    editors: {
      ...editors,
      headerTextEditorInitialState,
      subheaderTextEditorInitialState,
    },
  }
}

function HeaderCardStory({ display = 'Default', header = '', subheader = '', ...args }: HeaderCardStoryArgs) {
  const headerTextEditor = createEditor({ nodes: MINIMAL_NODES })
  const subheaderTextEditor = createEditor({ nodes: MINIMAL_NODES })

  populateEditor({ editor: headerTextEditor, initialHtml: header })
  populateEditor({ editor: subheaderTextEditor, initialHtml: subheader })

  const displayState = displayOptions[display]
  const componentProps = groupProps(args, { headerTextEditor, subheaderTextEditor })

  return (
    <div className="inkling-prose">
      <div className="mx-auto my-8 w-full min-w-[initial]">
        <CardWrapper {...displayState}>
          <HeaderCard {...componentProps} />
        </CardWrapper>
      </div>
    </div>
  )
}

const meta = {
  title: 'Primary cards/Header card',
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
