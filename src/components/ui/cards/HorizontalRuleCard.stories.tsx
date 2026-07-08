import type { Meta, StoryObj } from '@storybook/react'

import React from 'react'

import { HorizontalRuleCard } from '@/components/ui/cards/HorizontalRuleCard'
import { CardWrapper } from '@/components/ui/CardWrapper'

const displayOptions = {
  Default: { isSelected: false, isEditing: false },
  Selected: { isSelected: true, isEditing: false },
} as const

type DisplayKey = keyof typeof displayOptions

type HorizontalRuleCardProps = React.ComponentProps<typeof HorizontalRuleCard>

interface HorizontalRuleCardStoryArgs extends Partial<HorizontalRuleCardProps> {
  display?: DisplayKey
}

function HorizontalRuleCardStory({ display = 'Default' }: HorizontalRuleCardStoryArgs) {
  const displayState = displayOptions[display]

  return (
    <div className="inkling-prose">
      <div className="my-8 mx-auto max-w-[740px] min-w-[initial]">
        <CardWrapper {...displayState}>
          <HorizontalRuleCard />
        </CardWrapper>
      </div>
    </div>
  )
}

const meta = {
  title: 'Primary cards/Divider card',
  component: HorizontalRuleCardStory,
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
      type: 'functional',
    },
  },
} satisfies Meta<typeof HorizontalRuleCardStory>
export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    display: 'Selected',
  },
}
