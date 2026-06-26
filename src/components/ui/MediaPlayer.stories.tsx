import type { Meta, StoryFn } from '@storybook/react'

import { MediaPlayer } from '@/components/ui/MediaPlayer'

// oxlint-disable-next-line typescript/no-explicit-any
const story: Meta<any> = {
  title: 'Generic/Media player',
  component: MediaPlayer,
  parameters: {
    status: {
      type: 'functional',
    },
  },
}
export default story

// oxlint-disable-next-line typescript/no-explicit-any
const Template: StoryFn<any> = (args) => <MediaPlayer {...args} />

export const Default = Template.bind({})
Default.args = {
  theme: 'dark',
}
