import type { Meta, StoryFn } from '@storybook/react'

import ImgFullIcon from '@/assets/icons/inkling-img-full.svg?react'
import ImgRegularIcon from '@/assets/icons/inkling-img-regular.svg?react'
import ImgWideIcon from '@/assets/icons/inkling-img-wide.svg?react'
import { ButtonGroup, ButtonGroupIconButton } from '@/components/ui/ButtonGroup'

// oxlint-disable-next-line typescript/no-explicit-any
const story: Meta<any> = {
  title: 'Generic/Button group (beta)',
  component: ButtonGroup,
  subcomponents: { ButtonGroupIconButton },
  parameters: {
    status: {
      type: 'functional',
    },
  },
  argTypes: {
    selectedName: { control: 'select', options: ['regular', 'wide', 'full'] },
  },
}
export default story

// oxlint-disable-next-line typescript/no-explicit-any
const Template: StoryFn<any> = (args) => {
  return <ButtonGroup {...args} />
}

export const CardWidth = Template.bind({})
CardWidth.args = {
  selectedName: 'regular',
  buttons: [
    {
      label: 'Regular',
      name: 'regular',
      Icon: ImgRegularIcon,
    },
    {
      label: 'Wide',
      name: 'wide',
      Icon: ImgWideIcon,
    },
    {
      label: 'Full',
      name: 'full',
      Icon: ImgFullIcon,
    },
  ],
}
