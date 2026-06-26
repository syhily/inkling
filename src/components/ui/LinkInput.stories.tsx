import type { Meta, StoryFn } from '@storybook/react'

import { LinkInput } from '@/components/ui/LinkInput'

// oxlint-disable-next-line typescript/no-explicit-any
const story: Meta<any> = {
  title: 'Toolbar/LinkInput',
  component: LinkInput,
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
      <LinkInput {...args} />
    </div>
  )
}

export const Empty = Template.bind({})
Empty.args = {
  href: '',
}

export const Populated = Template.bind({})
Populated.args = {
  href: 'https://inkling.local',
}
