import type { Meta, StoryFn } from '@storybook/react'

import { PlusButton } from '@/components/ui/PlusMenu'

// oxlint-disable-next-line typescript/no-explicit-any
const story: Meta<any> = {
  title: 'Card menu/Plus button',
  component: PlusButton,
  parameters: {
    status: {
      type: 'functional',
    },
  },
}
export default story

// oxlint-disable-next-line typescript/no-explicit-any
const Template: StoryFn<any> = (args) => (
  <div className="relative mt-[2px] ml-[66px]">
    <PlusButton {...args} />
  </div>
)

export const Default = Template.bind({})
