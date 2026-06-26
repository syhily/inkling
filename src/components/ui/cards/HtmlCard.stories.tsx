import type { Meta, StoryFn } from '@storybook/react'

import HtmlIndicatorIcon from '@/assets/icons/inkling-indicator-html.svg?react'
import { HtmlCard } from '@/components/ui/cards/HtmlCard'
import { CardWrapper } from '@/components/ui/CardWrapper'

const displayOptions = {
  Default: { isSelected: false, isEditing: false },
  Selected: { isSelected: true, isEditing: false },
  Editing: { isSelected: true, isEditing: true },
}

// oxlint-disable-next-line typescript/no-explicit-any
const story: Meta<any> = {
  title: 'Primary cards/Html card',
  component: HtmlCard,
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
}
export default story

// oxlint-disable-next-line typescript/no-explicit-any
const Template: StoryFn<any> = ({ display, ...args }) => (
  <div className="inkling-prose">
    <div className="my-8 mx-auto w-[740px] min-w-[initial]">
      <CardWrapper IndicatorIcon={HtmlIndicatorIcon} wrapperStyle="code-card" {...display} {...args}>
        <HtmlCard updateCode={() => {}} {...display} {...args} />
      </CardWrapper>
    </div>
  </div>
)

export const Empty = Template.bind({})
Empty.args = {
  html: '',
  display: 'Editing',
}

export const Progress = Template.bind({})
Progress.args = {
  html: `<h1>Header</h1>\n\r<p>Paragraph</p>\n\r<ul><li>List</li><li>Items</li></ul>\n\r<!-- comment -->`,
  display: 'Editing',
}

export const Populated = Template.bind({})
Populated.args = {
  html: `<h1>Header</h1>\n\r<p>Paragraph</p>\n\r<ul><li>List</li><li>Items</li></ul>\n\r<!-- comment -->`,
  display: 'Selected',
}
