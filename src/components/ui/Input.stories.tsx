import type { Meta, StoryFn } from '@storybook/react'

import { Input } from '@/components/ui/Input'

// oxlint-disable-next-line typescript/no-explicit-any
const story: Meta<any> = {
  title: 'Generic/Input',
  component: Input,
  parameters: {
    status: {
      type: 'uiReady',
    },
  },
}
export default story

// oxlint-disable-next-line typescript/no-explicit-any
const Template: StoryFn<any> = (args) => (
  <div className="w-[240px]">
    <Input {...args} />
  </div>
)

export const Default = Template.bind({})
