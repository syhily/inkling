import type { Meta, StoryFn } from '@storybook/react'

import { Button } from '@/components/ui/Button'

// oxlint-disable-next-line typescript/no-explicit-any
const story: Meta<any> = {
  title: 'Generic/Button',
  component: Button,
  argTypes: {
    color: {
      options: ['white', 'grey', 'black', 'accent'],
      control: { type: 'select' },
    },
    size: {
      options: ['small', 'medium', 'large'],
      control: { type: 'select' },
    },
    width: {
      options: ['regular', 'full'],
      control: { type: 'radio' },
    },
  },
  parameters: {
    status: {
      type: 'uiReady',
    },
  },
}
export default story

// oxlint-disable-next-line typescript/no-explicit-any
const Template: StoryFn<any> = (args) => {
  return <Button {...args} />
}

export const Empty = Template.bind({})
Empty.args = {
  color: 'accent',
  size: 'small',
  width: 'regular',
  value: '',
  placeholder: 'Add button text',
}

export const Populated = Template.bind({})
Populated.args = {
  color: 'accent',
  size: 'small',
  width: 'regular',
  value: 'Subscribe',
  placeholder: 'Add button text',
  href: 'https://google.com/',
  target: '__blank',
}
