import type { Meta, StoryFn } from '@storybook/react'

import { HorizontalRuleCard } from '@/components/ui/cards/HorizontalRuleCard'
import { CardWrapper } from '@/components/ui/CardWrapper'

const displayOptions = {
  Default: { isSelected: false, isEditing: false },
  Selected: { isSelected: true, isEditing: false },
}

// oxlint-disable-next-line typescript/no-explicit-any
const story: Meta<any> = {
  title: 'Primary cards/Divider card',
  component: HorizontalRuleCard,
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
}
export default story

// oxlint-disable-next-line typescript/no-explicit-any
const Template: StoryFn<any> = ({ display, ...args }) => (
  <div className="inkling-prose">
    <div className="my-8 mx-auto max-w-[740px] min-w-[initial]">
      <CardWrapper {...display} {...args}>
        <HorizontalRuleCard {...display} {...args} />
      </CardWrapper>
    </div>
  </div>
)

export const Default = Template.bind({})
Default.args = {
  display: 'Selected',
}
