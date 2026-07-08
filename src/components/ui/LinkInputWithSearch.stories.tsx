import type { Meta, StoryObj } from '@storybook/react'

import { LinkInputWithSearch } from '@/components/ui/LinkInputWithSearch'

const meta = {
  title: 'Toolbar/LinkInputWithSearch',
  component: LinkInputWithSearch,
  parameters: {
    status: {
      type: 'functional',
    },
  },
} satisfies Meta<typeof LinkInputWithSearch>
export default meta

type Story = StoryObj<typeof meta>

export const Empty: Story = {
  args: {
    href: '',
    update: () => {},
    cancel: () => {},
  },
  render: (args) => (
    <div className="flex">
      <LinkInputWithSearch {...args} />
    </div>
  ),
}

export const Populated: Story = {
  args: {
    href: 'https://inkling.local',
    update: () => {},
    cancel: () => {},
  },
  render: (args) => (
    <div className="flex">
      <LinkInputWithSearch {...args} />
    </div>
  ),
}
