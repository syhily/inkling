import type { Meta, StoryFn } from '@storybook/react'

import { LinkInputWithSearch } from '@/components/ui/LinkInputWithSearch'

// oxlint-disable-next-line typescript/no-explicit-any
const story: Meta<any> = {
  title: 'Toolbar/LinkInputWithSearch',
  component: LinkInputWithSearch,
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
      <LinkInputWithSearch {...args} />
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
