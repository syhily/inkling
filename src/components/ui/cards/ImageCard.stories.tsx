import type { Meta, StoryFn } from '@storybook/react'

import { createEditor } from 'lexical'

import { ImageCard } from '@/components/ui/cards/ImageCard'
import { CardWrapper } from '@/components/ui/CardWrapper'
import { MINIMAL_NODES } from '@/index'
import populateEditor from '@/utils/storybook/populate-storybook-editor'

const displayOptions = {
  Default: { isSelected: false, isEditing: false },
  Selected: { isSelected: true, isEditing: false },
}

// oxlint-disable-next-line typescript/no-explicit-any
const story: Meta<any> = {
  title: 'Primary cards/Image card',
  component: ImageCard,
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
}
export default story

// oxlint-disable-next-line typescript/no-explicit-any
const Template: StoryFn<any> = ({ display, caption, ...args }) => {
  const captionEditor = createEditor({ nodes: MINIMAL_NODES })
  populateEditor({ editor: captionEditor, initialHtml: `${caption}` })

  return (
    <div className="inkling-prose">
      <div className="my-8 mx-auto max-w-[740px] min-w-[initial]">
        <CardWrapper {...display} {...args}>
          <ImageCard {...display} {...args} captionEditor={captionEditor} />
        </CardWrapper>
      </div>
    </div>
  )
}

export const Empty = Template.bind({})
Empty.args = {
  display: 'Selected',
  setAltText: true,
  caption: '',
  altText: '',
  imageUploader: {
    isLoading: false,
    progress: 100,
  },
  imageFileDragHandler: {
    isDraggedOver: false,
  },
}

export const Uploading = Template.bind({})
Uploading.args = {
  display: 'Selected',
  cardWidth: 'regular',
  setAltText: true,
  caption: '',
  altText: '',
  isDraggedOver: false,
  previewSrc: 'https://static.inkling.local/v4.0.0/images/feature-image.jpg',
  imageUploader: {
    progress: 50,
    isLoading: true,
  },
  imageFileDragHandler: {
    isDraggedOver: false,
  },
}

export const Populated = Template.bind({})
Populated.args = {
  display: 'Selected',
  cardWidth: 'regular',
  src: 'https://static.inkling.local/v4.0.0/images/feature-image.jpg',
  setAltText: true,
  caption: 'Welcome to your new Inkling publication',
  altText: 'Feature image',
  imageUploader: {
    isLoading: false,
    progress: 100,
  },
  imageFileDragHandler: {
    isDraggedOver: false,
  },
}

export const Errors = Template.bind({})
Errors.args = {
  display: 'Selected',
  cardWidth: 'regular',
  setAltText: true,
  caption: '',
  altText: '',
  imageUploader: {
    errors: [
      {
        message: 'The file type you uploaded is not supported. Please use .GIF, .JPG, .JPEG, .PNG, .SVG, .SVGZ, .WEBP',
      },
    ],
  },
  imageFileDragHandler: {
    isDraggedOver: false,
  },
}

export const DraggedOver = Template.bind({})
DraggedOver.args = {
  display: 'Selected',
  cardWidth: 'regular',
  setAltText: true,
  caption: '',
  altText: '',
  imageUploader: {
    errors: [
      {
        message: 'The file type you uploaded is not supported. Please use .GIF, .JPG, .JPEG, .PNG, .SVG, .SVGZ, .WEBP',
      },
    ],
  },
  imageFileDragHandler: {
    isDraggedOver: true,
  },
}
