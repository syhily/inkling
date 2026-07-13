import type { Meta, StoryObj } from '@storybook/react'

import React from 'react'

import HtmlIndicatorIcon from '@/assets/icons/inkling-indicator-html.svg?react'
import { HtmlCard } from '@/components/ui/cards/HtmlCard'
import { CardWrapper } from '@/components/ui/CardWrapper'

const displayOptions = {
  Default: { isSelected: false, isEditing: false },
  Selected: { isSelected: true, isEditing: false },
  Editing: { isSelected: true, isEditing: true },
} as const

type DisplayKey = keyof typeof displayOptions

type HtmlCardProps = React.ComponentProps<typeof HtmlCard>

interface HtmlCardStoryArgs extends Partial<HtmlCardProps> {
  display?: DisplayKey
}

function HtmlCardStory({ display = 'Default', ...args }: HtmlCardStoryArgs) {
  const displayState = displayOptions[display]
  const componentProps = {
    updateHtml: () => {},
    ...args,
  }

  return (
    <div className="inkling-prose">
      <div className="mx-auto my-8 w-[740px] min-w-[initial]">
        <CardWrapper IndicatorIcon={HtmlIndicatorIcon} wrapperStyle="code-card" {...displayState} {...componentProps}>
          <HtmlCard {...displayState} {...componentProps} />
        </CardWrapper>
      </div>
    </div>
  )
}

const meta = {
  title: 'Primary cards/Html card',
  component: HtmlCardStory,
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
      },
    },
  },
  parameters: {
    status: {
      type: 'functional',
    },
  },
} satisfies Meta<typeof HtmlCardStory>
export default meta

type Story = StoryObj<typeof meta>

export const Empty: Story = {
  args: {
    html: '',
    display: 'Editing',
  },
}

export const Progress: Story = {
  args: {
    html: `<h1>Header</h1>\n\r<p>Paragraph</p>\n\r<ul><li>List</li><li>Items</li></ul>\n\r<!-- comment -->`,
    display: 'Editing',
  },
}

export const Populated: Story = {
  args: {
    html: `<h1>Header</h1>\n\r<p>Paragraph</p>\n\r<ul><li>List</li><li>Items</li></ul>\n\r<!-- comment -->`,
    display: 'Selected',
  },
}
