import type { Meta, StoryFn } from '@storybook/react'

import { Toggle } from '@/components/ui/Toggle'

// oxlint-disable-next-line typescript/no-explicit-any
const story: Meta<any> = {
  title: 'Generic/Toggle',
  component: Toggle,
  parameters: {
    status: {
      type: 'functional',
    },
  },
}
export default story

// oxlint-disable-next-line typescript/no-explicit-any
const Template: StoryFn<any> = (args) => <Toggle {...args} />

export const Default = Template.bind({})
Default.args = {
  isChecked: true,
}
