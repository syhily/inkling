import type { Meta, StoryObj } from '@storybook/react'

import { createEditor } from 'lexical'
import React from 'react'

import { ImageCard, type ImageCardProps } from '@/components/ui/cards/ImageCard'
import { CardWrapper } from '@/components/ui/CardWrapper'
import { MINIMAL_NODES } from '@/index'
import populateEditor from '@/utils/storybook/populate-storybook-editor'

const displayOptions = {
  Default: { isSelected: false, isEditing: false },
  Selected: { isSelected: true, isEditing: false },
} as const

type DisplayKey = keyof typeof displayOptions

interface ImageCardStoryArgs extends Partial<ImageCardProps> {
  display?: DisplayKey
  caption?: string
}

function ImageCardStory({ display = 'Default', caption = '', ...args }: ImageCardStoryArgs) {
  const captionEditor = createEditor({ nodes: MINIMAL_NODES })
  populateEditor({ editor: captionEditor, initialHtml: `${caption}` })
  const displayState = displayOptions[display]
  const componentProps = {
    onFileChange: () => {},
    setAltText: () => {},
    imageUploader: {},
    ...args,
  }

  return (
    <div className="inkling-prose">
      <div className="my-8 mx-auto max-w-[740px] min-w-[initial]">
        <CardWrapper {...displayState} {...componentProps}>
          <ImageCard {...displayState} {...componentProps} captionEditor={captionEditor} />
        </CardWrapper>
      </div>
    </div>
  )
}

const meta = {
  title: 'Primary cards/Image card',
  component: ImageCardStory,
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
        },
        defaultValue: displayOptions.Default,
      },
    },
    cardWidth: {
      options: ['regular', 'wide', 'full'],
      control: { type: 'radio' },
    },
  },
  parameters: {
    status: {
      type: 'functional',
    },
  },
} satisfies Meta<typeof ImageCardStory>
export default meta

type Story = StoryObj<typeof meta>

export const Empty: Story = {
  args: {
    display: 'Selected',
    setAltText: () => {},
    caption: '',
    altText: '',
    imageUploader: {
      isLoading: false,
      progress: 100,
    },
    imageFileDragHandler: {
      isDraggedOver: false,
    },
  },
}

export const Uploading: Story = {
  args: {
    display: 'Selected',
    cardWidth: 'regular',
    setAltText: () => {},
    caption: '',
    altText: '',
    previewSrc: 'https://static.inkling.local/v4.0.0/images/feature-image.jpg',
    imageUploader: {
      progress: 50,
      isLoading: true,
    },
    imageFileDragHandler: {
      isDraggedOver: false,
    },
  },
}

export const Populated: Story = {
  args: {
    display: 'Selected',
    cardWidth: 'regular',
    src: 'https://static.inkling.local/v4.0.0/images/feature-image.jpg',
    setAltText: () => {},
    caption: 'Welcome to your new Inkling publication',
    altText: 'Feature image',
    imageUploader: {
      isLoading: false,
      progress: 100,
    },
    imageFileDragHandler: {
      isDraggedOver: false,
    },
  },
}

export const Errors: Story = {
  args: {
    display: 'Selected',
    cardWidth: 'regular',
    setAltText: () => {},
    caption: '',
    altText: '',
    imageUploader: {
      errors: [
        {
          message:
            'The file type you uploaded is not supported. Please use .GIF, .JPG, .JPEG, .PNG, .SVG, .SVGZ, .WEBP',
        },
      ],
    },
    imageFileDragHandler: {
      isDraggedOver: false,
    },
  },
}

export const DraggedOver: Story = {
  args: {
    display: 'Selected',
    cardWidth: 'regular',
    setAltText: () => {},
    caption: '',
    altText: '',
    imageUploader: {
      errors: [
        {
          message:
            'The file type you uploaded is not supported. Please use .GIF, .JPG, .JPEG, .PNG, .SVG, .SVGZ, .WEBP',
        },
      ],
    },
    imageFileDragHandler: {
      isDraggedOver: true,
    },
  },
}
