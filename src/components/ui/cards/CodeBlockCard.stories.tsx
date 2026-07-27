import type { Meta, StoryObj } from '@storybook/react'

import { createEditor } from 'lexical'
import React from 'react'

import { CodeBlockCard } from '@/components/ui/cards/CodeBlockCard'
import { CardWrapper } from '@/components/ui/CardWrapper'
import { MINIMAL_NODES } from '@/index'
import populateEditor from '@/utils/storybook/populate-storybook-editor'

const displayOptions = {
  Default: { isSelected: false, isEditing: false },
  Selected: { isSelected: true, isEditing: false },
  Editing: { isSelected: true, isEditing: true },
} as const

type DisplayKey = keyof typeof displayOptions

type CodeBlockCardProps = React.ComponentProps<typeof CodeBlockCard>

interface CodeBlockCardStoryArgs extends Partial<CodeBlockCardProps> {
  display?: DisplayKey
  caption?: string
}

function CodeBlockCardStory({ display = 'Default', caption = '', ...args }: CodeBlockCardStoryArgs) {
  const captionEditor = createEditor({ nodes: MINIMAL_NODES })
  populateEditor({ editor: captionEditor, initialHtml: caption })
  const displayState = displayOptions[display]

  return (
    <div className="inkling-prose">
      <div className="mx-auto my-8 max-w-[740px] min-w-[initial]">
        <CardWrapper wrapperStyle="code-card" {...displayState} {...args}>
          <CodeBlockCard captionEditor={captionEditor} updateCode={() => {}} {...displayState} {...args} />
        </CardWrapper>
      </div>
    </div>
  )
}

const meta = {
  title: 'Primary cards/Code card',
  component: CodeBlockCardStory,
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
} satisfies Meta<typeof CodeBlockCardStory>
export default meta

type Story = StoryObj<typeof meta>

export const Empty: Story = {
  args: {
    display: 'Editing',
    code: '',
    language: '',
    caption: '',
  },
}

export const Populated: Story = {
  args: {
    display: 'Editing',
    code: '<script></script>',
    language: 'html',
    caption: 'A code example',
  },
}
