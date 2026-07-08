import type { Meta, StoryObj } from '@storybook/react'

import React from 'react'

import { ButtonCard } from '@/components/ui/cards/ButtonCard'
import { CardWrapper } from '@/components/ui/CardWrapper'

const displayOptions = {
  Default: { isSelected: false, isEditing: false },
  Selected: { isSelected: true, isEditing: false },
  Editing: { isSelected: true, isEditing: true },
} as const

type DisplayKey = keyof typeof displayOptions

type ButtonCardProps = React.ComponentProps<typeof ButtonCard>

interface ButtonCardStoryArgs extends Partial<ButtonCardProps> {
  display?: DisplayKey
}

function ButtonCardStory({ display = 'Default', ...args }: ButtonCardStoryArgs) {
  const displayState = displayOptions[display]

  return (
    <div className="inkling-prose">
      <div className="my-8 mx-auto max-w-[740px] min-w-[initial]">
        <CardWrapper wrapperStyle="wide" {...displayState} {...args}>
          <ButtonCard {...displayState} {...args} />
        </CardWrapper>
      </div>
    </div>
  )
}

const meta = {
  title: 'Primary cards/Button card',
  component: ButtonCardStory,
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
} satisfies Meta<typeof ButtonCardStory>
export default meta

type Story = StoryObj<typeof meta>

export const Empty: Story = {
  args: {
    display: 'Editing',
    alignment: 'center',
    buttonText: '',
    buttonPlaceholder: 'Add button text',
    buttonUrl: '',
  },
}

export const Populated: Story = {
  args: {
    display: 'Editing',
    alignment: 'center',
    buttonText: 'Subscribe',
    buttonPlaceholder: 'Add button text',
    buttonUrl: 'https://inkling.local/',
  },
}
