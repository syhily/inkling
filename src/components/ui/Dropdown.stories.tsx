import type { Meta, StoryObj } from '@storybook/react'

import { Dropdown } from '@/components/ui/Dropdown'

const meta = {
  title: 'Generic/Dropdown',
  component: Dropdown,
  argTypes: {
    value: { control: 'radio', options: ['Free members', 'Paid members'] },
  },
  parameters: {
    status: {
      type: 'uiReady',
    },
  },
} satisfies Meta<typeof Dropdown>
export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    value: 'Free members',
    menu: [
      { label: 'Free members', name: 'Free members' },
      { label: 'Paid members', name: 'Paid members' },
    ],
  },
  render: (args) => (
    <div className="w-[240px]">
      <Dropdown {...args} />
    </div>
  ),
}
