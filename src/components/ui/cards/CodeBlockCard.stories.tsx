import type { Meta, StoryFn } from '@storybook/react'

import { createEditor } from 'lexical'

import { CodeBlockCard } from '@/components/ui/cards/CodeBlockCard'
import { CardWrapper } from '@/components/ui/CardWrapper'
import { MINIMAL_NODES } from '@/index'
import populateEditor from '@/utils/storybook/populate-storybook-editor'

const displayOptions = {
  Default: { isSelected: false, isEditing: false },
  Selected: { isSelected: true, isEditing: false },
  Editing: { isSelected: true, isEditing: true },
}

// oxlint-disable-next-line typescript/no-explicit-any
const story: Meta<any> = {
  title: 'Primary cards/Code card',
  component: CodeBlockCard,
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
}
export default story

// oxlint-disable-next-line typescript/no-explicit-any
const Template: StoryFn<any> = ({ display, caption, ...args }) => {
  const captionEditor = createEditor({ nodes: MINIMAL_NODES })
  populateEditor({ editor: captionEditor, initialHtml: `${caption}` })

  return (
    <div className="inkling-prose">
      <div className="my-8 mx-auto max-w-[740px] min-w-[initial]">
        <CardWrapper wrapperStyle="code-card" {...display} {...args}>
          <CodeBlockCard captionEditor={captionEditor} updateCode={() => {}} {...display} {...args} />
        </CardWrapper>
      </div>
    </div>
  )
}

export const Empty = Template.bind({})
Empty.args = {
  display: 'Editing',
  code: '',
  language: '',
  caption: '',
}

export const Populated = Template.bind({})
Populated.args = {
  display: 'Editing',
  code: '<script></script>',
  language: 'html',
  caption: 'A code example',
}
