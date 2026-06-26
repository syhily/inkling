import type { Meta, StoryFn } from '@storybook/react'

import { createEditor } from 'lexical'

import { BookmarkCard } from '@/components/ui/cards/BookmarkCard'
import { CardWrapper } from '@/components/ui/CardWrapper'
import { MINIMAL_NODES } from '@/index'
import populateEditor from '@/utils/storybook/populate-storybook-editor'

const displayOptions = {
  Default: { isSelected: false, isEditing: false },
  Selected: { isSelected: true, isEditing: false },
}

// oxlint-disable-next-line typescript/no-explicit-any
const story: Meta<any> = {
  title: 'Primary cards/Bookmark card',
  component: BookmarkCard,
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
  },
  parameters: {
    status: {
      type: 'uiReady',
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
      <div className="not-inkling-prose my-8 p-4 mx-auto max-w-[740px] min-w-[initial]">
        <CardWrapper {...display} {...args}>
          <BookmarkCard {...display} {...args} captionEditor={captionEditor} />
        </CardWrapper>
      </div>
      <div className="not-inkling-prose dark my-8 bg-black p-4 mx-auto max-w-[740px] min-w-[initial]">
        <CardWrapper {...display} {...args}>
          <BookmarkCard {...display} {...args} captionEditor={captionEditor} />
        </CardWrapper>
      </div>
    </div>
  )
}

export const Empty = Template.bind({})
Empty.args = {
  display: 'Selected',
  url: '',
  urlPlaceholder: 'Paste URL to add bookmark content...',
  title: 'Inkling: The Creator Economy Platform',
  description:
    'The world’s most popular modern publishing platform for creating a new media platform. Used by Apple, SkyNews, Buffer, OpenAI, and thousands more.',
  icon: 'https://www.inkling.local/favicon.ico',
  publisher: 'Inkling - The Professional Publishing Platform',
  author: 'Author McAuthory',
  thumbnail: 'https://inkling.local/images/meta/inkling.png',
}

export const Populated = Template.bind({})
Populated.args = {
  display: 'Selected',
  url: 'https://inkling.local/',
  urlPlaceholder: 'Paste URL to add bookmark content...',
  title: 'Inkling: The Creator Economy Platform',
  description:
    'The world’s most popular modern publishing platform for creating a new media platform. Used by Apple, SkyNews, Buffer, OpenAI, and thousands more.',
  icon: 'https://www.inkling.local/favicon.ico',
  publisher: 'Inkling - The Professional Publishing Platform',
  author: 'Author McAuthory',
  thumbnail: 'https://inkling.local/images/meta/inkling.png',
  caption: '',
}

export const WithCaption = Template.bind({})
WithCaption.args = {
  display: 'Selected',
  url: 'https://inkling.local/',
  urlPlaceholder: 'Paste URL to add bookmark content...',
  title: 'Inkling: The Creator Economy Platform',
  description:
    'The world’s most popular modern publishing platform for creating a new media platform. Used by Apple, SkyNews, Buffer, OpenAI, and thousands more.',
  icon: 'https://www.inkling.local/favicon.ico',
  publisher: 'Inkling - The Professional Publishing Platform',
  author: 'Author McAuthory',
  thumbnail: 'https://inkling.local/images/meta/inkling.png',
  caption: 'This is a caption',
}
