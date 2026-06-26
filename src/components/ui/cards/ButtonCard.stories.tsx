import type { Meta, StoryFn } from '@storybook/react'

import { ButtonCard } from '@/components/ui/cards/ButtonCard'
import { CardWrapper } from '@/components/ui/CardWrapper'

const displayOptions = {
  Default: { isSelected: false, isEditing: false },
  Selected: { isSelected: true, isEditing: false },
  Editing: { isSelected: true, isEditing: true },
}

// oxlint-disable-next-line typescript/no-explicit-any
const story: Meta<any> = {
  title: 'Primary cards/Button card',
  component: ButtonCard,
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
    alignment: {
      options: ['left', 'center'],
      control: { type: 'radio' },
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
const Template: StoryFn<any> = ({ display, ...args }) => (
  <div className="inkling-prose">
    <div className="my-8 mx-auto max-w-[740px] min-w-[initial]">
      <CardWrapper wrapperStyle="wide" {...display} {...args}>
        <ButtonCard {...display} {...args} />
      </CardWrapper>
    </div>
  </div>
)

export const Empty = Template.bind({})
Empty.args = {
  display: 'Editing',
  alignment: 'center',
  buttonText: '',
  buttonPlaceholder: 'Add button text',
  buttonUrl: '',
}

export const Populated = Template.bind({})
Populated.args = {
  display: 'Editing',
  alignment: 'center',
  buttonText: 'Subscribe',
  buttonPlaceholder: 'Add button text',
  buttonUrl: 'https://inkling.local/',
}
