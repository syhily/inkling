import type { Meta, StoryFn } from '@storybook/react'

import { SubscribeForm } from '@/components/ui/SubscribeForm'

// oxlint-disable-next-line typescript/no-explicit-any
const story: Meta<any> = {
  title: 'Generic/Subscribe form',
  component: SubscribeForm,
  parameters: {
    status: {
      type: 'uiReady',
    },
  },
}
export default story

// oxlint-disable-next-line typescript/no-explicit-any
const Template: StoryFn<any> = (args) => (
  <div className="w-[560px]">
    <SubscribeForm {...args} />
  </div>
)

export const Default = Template.bind({})
