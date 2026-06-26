import type { Meta, StoryFn } from '@storybook/react'

import { createEditor } from 'lexical'

import { CalloutCard } from '@/components/ui/cards/CalloutCard'
import { CardWrapper } from '@/components/ui/CardWrapper'
import populateEditor from '@/utils/storybook/populate-storybook-editor'

const displayOptions = {
  Default: { isSelected: false, isEditing: false },
  Selected: { isSelected: true, isEditing: false },
  Editing: { isSelected: true, isEditing: true },
}

// oxlint-disable-next-line typescript/no-explicit-any
const story: Meta<any> = {
  title: 'Primary cards/Callout card',
  component: CalloutCard,
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
}
export default story

// oxlint-disable-next-line typescript/no-explicit-any
const Template: StoryFn<any> = ({ display, value, ...args }) => {
  const textEditor = createEditor()
  populateEditor({ editor: textEditor, initialHtml: `${value}` })

  return (
    <div className="inkling-prose">
      <div className="my-8 mx-auto max-w-[740px] min-w-[initial]">
        <CardWrapper {...display} {...args}>
          <CalloutCard {...display} {...args} textEditor={textEditor} />
        </CardWrapper>
      </div>
    </div>
  )
}

export const Empty = Template.bind({})
Empty.args = {
  display: 'Editing',
  value: '',
  placeholder: 'Callout text...',
  emoji: true,
  color: 'grey',
  setShowEmojiPicker: () => {},
}

export const Populated = Template.bind({})
Populated.args = {
  display: 'Editing',
  value: 'Something to pay attention to.',
  placeholder: 'Callout text...',
  emoji: true,
  color: 'grey',
  setShowEmojiPicker: () => {},
}
