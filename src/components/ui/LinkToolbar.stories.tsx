import type { Meta, StoryFn } from '@storybook/react'

import { LinkToolbar } from '@/components/ui/LinkToolbar'

// oxlint-disable-next-line typescript/no-explicit-any
const story: Meta<any> = {
  title: 'Toolbar/LinkToolbar',
  component: LinkToolbar,
  parameters: {
    status: {
      type: 'functional',
    },
  },
}
export default story

// oxlint-disable-next-line typescript/no-explicit-any
const Template: StoryFn<any> = (args) => {
  return (
    <div className="flex">
      <LinkToolbar {...args} />
    </div>
  )
}

export const Base = Template.bind({})
Base.args = {
  href: 'https://inkling.local/',
}
