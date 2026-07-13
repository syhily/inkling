import type { Meta, StoryObj } from '@storybook/react'

import React from 'react'

import { FileCard, type FileCardProps } from '@/components/ui/cards/FileCard'
import { CardWrapper } from '@/components/ui/CardWrapper'

const displayOptions = {
  Default: { isSelected: false, isEditing: false },
  Selected: { isSelected: true, isEditing: false },
  Editing: { isSelected: true, isEditing: true },
} as const

type DisplayKey = keyof typeof displayOptions

interface FileCardStoryArgs extends Partial<FileCardProps> {
  display?: DisplayKey
}

function FileCardStory({ display = 'Default', ...args }: FileCardStoryArgs) {
  const displayState = displayOptions[display]
  const componentProps = {
    fileDragHandler: {},
    onFileChange: () => {},
    handleFileTitle: () => {},
    handleFileDesc: () => {},
    ...args,
  }

  return (
    <div className="inkling-prose">
      <div className="not-inkling-prose mx-auto my-8 max-w-[740px] min-w-[initial]">
        <CardWrapper {...displayState} {...componentProps}>
          <FileCard {...displayState} {...componentProps} />
        </CardWrapper>
      </div>
      <div className="dark bg-black py-10">
        <div className="not-inkling-prose mx-auto my-8 max-w-[740px] min-w-[initial]">
          <CardWrapper {...displayState} {...componentProps}>
            <FileCard {...displayState} {...componentProps} />
          </CardWrapper>
        </div>
      </div>
    </div>
  )
}

const meta = {
  title: 'Primary cards/File card',
  component: FileCardStory,
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
} satisfies Meta<typeof FileCardStory>
export default meta

type Story = StoryObj<typeof meta>

export const Empty: Story = {
  args: {
    display: 'Editing',
    isPopulated: false,
    fileTitle: 'Example file',
    fileTitlePlaceholder: 'File title',
    fileDesc: '',
    fileDescPlaceholder: 'Add optional file description',
    fileName: 'Example-file.pdf',
    fileSize: '165 KB',
    fileInputRef: { current: null },
  },
}

export const Populated: Story = {
  args: {
    display: 'Editing',
    isPopulated: true,
    fileTitle: 'Example file',
    fileTitlePlaceholder: 'File title',
    fileDesc: '',
    fileDescPlaceholder: 'Add optional file description',
    fileName: 'Example-file.pdf',
    fileSize: '165 KB',
    fileInputRef: { current: null },
  },
}
