import type { Meta, StoryFn } from '@storybook/react'

import { ProgressBar } from '@/components/ui/ProgressBar'

// oxlint-disable-next-line typescript/no-explicit-any
const story: Meta<any> = {
  title: 'Generic/Progress bar',
  component: ProgressBar,
  parameters: {
    status: {
      type: 'functional',
    },
  },
}
export default story

// oxlint-disable-next-line typescript/no-explicit-any
const Template: StoryFn<any> = (args) => <ProgressBar {...args} />

export const Default = Template.bind({})
Default.args = {
  style: { width: 60 + '%' },
  fullWidth: false,
}
