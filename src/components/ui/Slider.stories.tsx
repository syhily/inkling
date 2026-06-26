import type { Meta, StoryFn } from '@storybook/react'

import { Slider } from '@/components/ui/Slider'

// oxlint-disable-next-line typescript/no-explicit-any
const story: Meta<any> = {
  title: 'Generic/Slider',
  component: Slider,
  parameters: {
    status: {
      type: 'functional',
    },
  },
}
export default story

// oxlint-disable-next-line typescript/no-explicit-any
const Template: StoryFn<any> = (args) => <Slider {...args} />

export const Default = Template.bind({})
Default.args = {
  min: 1,
  max: 10,
  value: 5,
  onChange: () => {},
}
