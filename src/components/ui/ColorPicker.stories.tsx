import type { Meta, StoryFn } from '@storybook/react'

import { ColorPicker } from '@/components/ui/ColorPicker'

// oxlint-disable-next-line typescript/no-explicit-any
const story: Meta<any> = {
  title: 'Generic/Color picker (New)',
  component: ColorPicker,
  parameters: {
    status: {
      type: 'uiReady',
    },
  },
  argTypes: {
    selectedName: { control: 'select', options: ['grey', 'blue', 'green', 'yellow', 'red', 'pink', 'purple'] },
  },
}
export default story

// oxlint-disable-next-line typescript/no-explicit-any
const Template: StoryFn<any> = (args) => {
  return (
    <div className="w-[240px]">
      <ColorPicker {...args} />
    </div>
  )
}

export const Default = Template.bind({})
Default.args = {
  swatches: [
    { title: 'Brand color', accent: true },
    { title: 'Black', hex: '#000000' },
    { title: 'Transparent', transparent: true },
  ],
}
