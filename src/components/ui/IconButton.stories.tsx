import type { Meta, StoryFn } from '@storybook/react'

import DeleteIcon from '@/assets/icons/inkling-trash.svg?react'
import { IconButton } from '@/components/ui/IconButton'

// oxlint-disable-next-line typescript/no-explicit-any
const story: Meta<any> = {
  title: 'Generic/Icon button',
  component: IconButton,
  parameters: {
    status: {
      type: 'functional',
    },
  },
}
export default story

// oxlint-disable-next-line typescript/no-explicit-any
const Template: StoryFn<any> = (args) => {
  return <IconButton {...args} />
}

export const Default = Template.bind({})
Default.args = {
  Icon: DeleteIcon,
}
