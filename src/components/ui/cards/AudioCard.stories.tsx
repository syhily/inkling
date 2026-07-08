import type { Meta, StoryObj } from '@storybook/react'

import React from 'react'

import { AudioCard, type AudioCardProps } from '@/components/ui/cards/AudioCard'
import { CardWrapper } from '@/components/ui/CardWrapper'

const displayOptions = {
  Default: { isSelected: false, isEditing: false },
  Selected: { isSelected: true, isEditing: false },
  Editing: { isSelected: true, isEditing: true },
} as const

type DisplayKey = keyof typeof displayOptions

interface AudioCardStoryArgs extends Partial<AudioCardProps> {
  display?: DisplayKey
  titlePlaceholder?: string
}

function AudioCardStory({ display = 'Default', titlePlaceholder, ...args }: AudioCardStoryArgs) {
  const displayState = displayOptions[display]
  const componentProps = {
    updateTitle: () => {},
    onAudioFileChange: () => {},
    onThumbnailFileChange: () => {},
    audioUploader: {},
    thumbnailUploader: {},
    ...args,
  }

  return (
    <div className="inkling-prose">
      <div className="not-inkling-prose my-8 mx-auto max-w-[740px] min-w-[initial]">
        <CardWrapper {...displayState} {...componentProps}>
          <AudioCard {...displayState} {...componentProps} />
        </CardWrapper>
      </div>
    </div>
  )
}

const meta = {
  title: 'Primary cards/Audio card',
  component: AudioCardStory,
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
      type: 'functional',
    },
  },
} satisfies Meta<typeof AudioCardStory>
export default meta

type Story = StoryObj<typeof meta>

export const Empty: Story = {
  args: {
    display: 'Editing',
    src: '',
    duration: 0,
    title: '',
    titlePlaceholder: 'Add a title...',
    audioUploader: {},
    thumbnailUploader: {},
  },
}

export const Uploading: Story = {
  args: {
    display: 'Editing',
    src: '',
    duration: 0,
    title: '',
    titlePlaceholder: 'Add a title...',
    audioUploader: { progress: 50, isLoading: true },
    thumbnailUploader: {},
  },
}

export const DraggedOver: Story = {
  args: {
    display: 'Editing',
    src: '',
    duration: 0,
    title: '',
    audioUploader: {},
    thumbnailUploader: {},
    audioDragHandler: {
      isDraggedOver: true,
    },
  },
}

export const Populated: Story = {
  args: {
    display: 'Editing',
    thumbnailSrc: '',
    src: 'audio.mp3',
    duration: 19,
    title: 'The Inkling Podcast',
    titlePlaceholder: 'Add a title...',
    audioUploader: {},
    thumbnailUploader: {},
  },
}

export const Error: Story = {
  args: {
    display: 'Editing',
    src: '',
    duration: 0,
    title: '',
    titlePlaceholder: 'Add a title...',
    audioUploader: {
      errors: [
        {
          message: 'The file type you uploaded is not supported. Please use .MP3, .WAV, .OGG, .M4A',
        },
      ],
    },
    thumbnailUploader: {},
  },
}

export const ThumbnailUploading: Story = {
  args: {
    display: 'Editing',
    src: 'audio.mp3',
    duration: 19,
    title: 'The Inkling Podcast',
    titlePlaceholder: 'Add a title...',
    thumbnailUploader: { progress: 50, isLoading: true },
  },
}

export const ThumbnailDraggedOver: Story = {
  args: {
    display: 'Editing',
    src: 'audio.mp3',
    duration: 19,
    title: 'The Inkling Podcast',
    titlePlaceholder: 'Add a title...',
    thumbnailDragHandler: {
      isDraggedOver: true,
    },
    audioUploader: {},
    thumbnailUploader: {},
  },
}

export const ThumbnailPopulated: Story = {
  args: {
    display: 'Editing',
    thumbnailSrc: 'https://static.inkling.local/Orb4b.gif',
    src: 'audio.mp3',
    duration: 19,
    title: 'The Inkling Podcast',
    titlePlaceholder: 'Add a title...',
    audioUploader: {},
    thumbnailUploader: {},
  },
}

export const ThumbnailError: Story = {
  args: {
    display: 'Editing',
    src: 'audio.mp3',
    duration: 19,
    title: 'The Inkling Podcast',
    titlePlaceholder: 'Add a title...',
    thumbnailUploader: {
      progress: 100,
      isLoading: false,
      errors: [{ message: 'File not supported' }],
    },
  },
}
