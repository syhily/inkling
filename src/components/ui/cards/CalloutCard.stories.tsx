import type { Meta, StoryObj } from '@storybook/react'

import { createEditor } from 'lexical'
import React from 'react'

import { CalloutCard } from '@/components/ui/cards/CalloutCard'
import { CardWrapper } from '@/components/ui/CardWrapper'
import populateEditor from '@/utils/storybook/populate-storybook-editor'

const displayOptions = {
  Default: { isSelected: false, isEditing: false },
  Selected: { isSelected: true, isEditing: false },
  Editing: { isSelected: true, isEditing: true },
} as const

type DisplayKey = keyof typeof displayOptions

type CalloutCardProps = React.ComponentProps<typeof CalloutCard>

interface CalloutCardStoryArgs extends Partial<CalloutCardProps> {
  display?: DisplayKey
  value?: string
  placeholder?: string
}

function CalloutCardStory({ display = 'Default', value = '', placeholder, ...args }: CalloutCardStoryArgs) {
  const textEditor = createEditor()
  populateEditor({ editor: textEditor, initialHtml: value })
  const displayState = displayOptions[display]

  return (
    <div className="inkling-prose">
      <div className="mx-auto my-8 max-w-[740px] min-w-[initial]">
        <CardWrapper {...displayState} {...args}>
          <CalloutCard
            {...displayState}
            {...args}
            changeEmoji={() => {}}
            textEditor={textEditor}
            toggleEmoji={() => {}}
          />
        </CardWrapper>
      </div>
    </div>
  )
}

const meta = {
  title: 'Primary cards/Callout card',
  component: CalloutCardStory,
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
  },
  parameters: {
    status: {
      type: 'uiReady',
    },
  },
} satisfies Meta<typeof CalloutCardStory>
export default meta

type Story = StoryObj<typeof meta>

export const Empty: Story = {
  args: {
    display: 'Editing',
    value: '',
    placeholder: 'Callout text...',
    hasEmoji: true,
    color: 'grey',
    setShowEmojiPicker: () => {},
  },
}

export const Populated: Story = {
  args: {
    display: 'Editing',
    value: 'Something to pay attention to.',
    placeholder: 'Callout text...',
    hasEmoji: true,
    color: 'grey',
    setShowEmojiPicker: () => {},
  },
}
