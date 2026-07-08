import type { Meta, StoryObj } from '@storybook/react'

import { Slider } from '@/components/ui/Slider'

const meta = {
  title: 'Generic/Slider',
  component: Slider,
  parameters: {
    status: {
      type: 'functional',
    },
  },
} satisfies Meta<typeof Slider>
export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    min: 1,
    max: 10,
    value: 5,
    onChange: () => {},
  },
}
