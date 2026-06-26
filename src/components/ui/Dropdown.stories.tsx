import type { Meta, StoryFn } from '@storybook/react'

import { Dropdown } from '@/components/ui/Dropdown'

// oxlint-disable-next-line typescript/no-explicit-any
const story: Meta<any> = {
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
}
export default story

// oxlint-disable-next-line typescript/no-explicit-any
const Template: StoryFn<any> = (args) => (
  <div className="w-[240px]">
    <Dropdown {...args} />
  </div>
)

export const Default = Template.bind({})
Default.args = {
  label: 'Visibility',
  description: 'Visible for this audience when delivered by email. This card is not published on your site.',
  value: 'Free members',
  menu: [
    { label: 'Free members', name: 'Free members' },
    { label: 'Paid members', name: 'Paid members' },
  ],
}
