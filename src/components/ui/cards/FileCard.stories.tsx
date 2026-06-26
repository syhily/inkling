import type { Meta, StoryFn } from '@storybook/react'

import { FileCard } from '@/components/ui/cards/FileCard'
import { CardWrapper } from '@/components/ui/CardWrapper'

const displayOptions = {
  Default: { isSelected: false, isEditing: false },
  Selected: { isSelected: true, isEditing: false },
  Editing: { isSelected: true, isEditing: true },
}

// oxlint-disable-next-line typescript/no-explicit-any
const story: Meta<any> = {
  title: 'Primary cards/File card',
  component: FileCard,
  subcomponents: { CardWrapper },
  argTypes: {
    display: {
      options: Object.keys(displayOptions),
      mapping: displayOptions,
      control: {
        type: 'radio',
        labels: {
          Default: 'Default',
          Selected: 'Selected',
          Editing: 'Editing',
        },
        defaultValue: displayOptions.Default,
      },
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
const Template: StoryFn<any> = ({ display, ...args }) => (
  <div className="inkling-prose">
    <div className="not-inkling-prose my-8 mx-auto max-w-[740px] min-w-[initial]">
      <CardWrapper {...display} {...args}>
        <FileCard {...display} {...args} />
      </CardWrapper>
    </div>
    <div className="dark bg-black py-10">
      <div className="not-inkling-prose my-8 mx-auto max-w-[740px] min-w-[initial]">
        <CardWrapper {...display} {...args}>
          <FileCard {...display} {...args} />
        </CardWrapper>
      </div>
    </div>
  </div>
)

export const Empty = Template.bind({})
Empty.args = {
  display: 'Editing',
  isPopulated: false,
  fileTitle: 'Example file',
  fileTitlePlaceholder: 'File title',
  fileDesc: '',
  fileDescPlaceholder: 'Add optional file description',
  fileName: 'Example-file.pdf',
  fileSize: '165 KB',
  fileInputRef: {},
  fileDragHandler: {},
}

export const Populated = Template.bind({})
Populated.args = {
  display: 'Editing',
  isPopulated: true,
  fileTitle: 'Example file',
  fileTitlePlaceholder: 'File title',
  fileDesc: '',
  fileDescPlaceholder: 'Add optional file description',
  fileName: 'Example-file.pdf',
  fileSize: '165 KB',
  fileInputRef: {},
  fileDragHandler: {},
}
