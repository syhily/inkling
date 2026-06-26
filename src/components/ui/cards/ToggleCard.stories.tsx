import type { Meta, StoryFn } from '@storybook/react'

import { createEditor } from 'lexical'

import { ToggleCard } from '@/components/ui/cards/ToggleCard'
import { CardWrapper } from '@/components/ui/CardWrapper'
import { BASIC_NODES, MINIMAL_NODES } from '@/index'
import populateEditor from '@/utils/storybook/populate-storybook-editor'

const displayOptions = {
  Default: { isSelected: false, isEditing: false },
  Selected: { isSelected: true, isEditing: false },
  Editing: { isSelected: true, isEditing: true },
}

// oxlint-disable-next-line typescript/no-explicit-any
const story: Meta<any> = {
  title: 'Primary cards/Toggle card',
  component: ToggleCard,
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
const Template: StoryFn<any> = ({ display, heading, content, ...args }) => {
  const headingEditor = createEditor({ nodes: MINIMAL_NODES })
  populateEditor({ editor: headingEditor, initialHtml: `${heading}` })

  const contentEditor = createEditor({ nodes: BASIC_NODES })
  populateEditor({ editor: contentEditor, initialHtml: `${content}` })

  return (
    <div className="inkling-prose">
      <div className="not-inkling-prose my-8 py-10 mx-auto max-w-[740px] min-w-[initial]">
        <CardWrapper {...display}>
          <ToggleCard {...display} {...args} contentEditor={contentEditor} headingEditor={headingEditor} />
        </CardWrapper>
      </div>
      <div className="bg-black py-10 w-full">
        <div className="not-inkling-prose dark my-8 mx-auto max-w-[740px] min-w-[initial]">
          <CardWrapper {...display}>
            <ToggleCard {...display} {...args} contentEditor={contentEditor} headingEditor={headingEditor} />
          </CardWrapper>
        </div>
      </div>
    </div>
  )
}

export const Empty = Template.bind({})
Empty.args = {
  content: '',
  contentPlaceholder: 'Collapsible content',
  display: 'Editing',
  heading: '',
  headingPlaceholder: 'Toggle header',
}

export const Populated = Template.bind({})
Populated.args = {
  content:
    'Toggles allow you to create collapsible sections of content which is a great way to make your content less overwhelming and easy to navigate. A common example is an FAQ section, like this one.',
  contentPlaceholder: 'Collapsible content',
  display: 'Editing',
  heading: 'When should I use Toggles?',
  headingPlaceholder: 'Toggle header',
}
