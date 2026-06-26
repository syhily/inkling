import type { Meta, StoryFn } from '@storybook/react'

import { createEditor } from 'lexical'

import { HeaderCard } from '@/components/ui/cards/HeaderCard/v2/HeaderCard'
import { CardWrapper } from '@/components/ui/CardWrapper'
import { MINIMAL_NODES } from '@/index'
import populateEditor from '@/utils/storybook/populate-storybook-editor'

import { editorEmptyState } from '../../../../../../.storybook/editorEmptyState'

const displayOptions = {
  Default: { isSelected: false, isEditing: false },
  Selected: { isSelected: true, isEditing: false },
  Editing: { isSelected: true, isEditing: true },
}

// oxlint-disable-next-line typescript/no-explicit-any
const story: Meta<any> = {
  title: 'Primary cards/Header card v2',
  component: HeaderCard,
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
    layout: {
      options: ['regular', 'wide', 'full', 'split'],
      control: { type: 'radio' },
    },
  },
  parameters: {
    status: {
      type: 'Functional',
    },
  },
}
export default story

// oxlint-disable-next-line typescript/no-explicit-any
const Template: StoryFn<any> = ({ display, header, subheader, ...args }) => {
  const headerTextEditor = createEditor({ nodes: MINIMAL_NODES })
  const subheaderTextEditor = createEditor({ nodes: MINIMAL_NODES })

  populateEditor({ editor: headerTextEditor, initialHtml: `${header}` })
  populateEditor({ editor: subheaderTextEditor, initialHtml: `${subheader}` })

  return (
    <div className="inkling-prose">
      <div className="my-8 mx-auto w-full min-w-[initial]">
        <CardWrapper {...display} {...args}>
          <HeaderCard
            {...display}
            {...args}
            header={header}
            headerTextEditor={headerTextEditor}
            subheader={subheader}
            subheaderTextEditor={subheaderTextEditor}
          />
        </CardWrapper>
      </div>
    </div>
  )
}

export const Empty = Template.bind({})
Empty.args = {
  display: 'Editing',
  layout: 'regular',
  alignment: 'center',
  showBackgroundImage: false,
  backgroundImageSrc: 'https://static.inkling.local/v4.0.0/images/andreas-selter-e4yK8QQlZa0-unsplash.jpg',
  header: '',
  subheader: '',
  buttonText: '',
  buttonColor: '#000000',
  buttonTextColor: '#ffffff',
  backgroundColor: '#F3B389',
  textColor: '#000000',
  buttonUrl: '',
  handleBackgroundColor: () => {},
  headerTextEditorInitialState: editorEmptyState,
  subheaderTextEditorInitialState: editorEmptyState,
}

export const Populated = Template.bind({})
Populated.args = {
  display: 'Editing',
  layout: 'split',
  alignment: 'center',
  showBackgroundImage: true,
  backgroundImageSrc: 'https://static.inkling.local/v4.0.0/images/andreas-selter-e4yK8QQlZa0-unsplash.jpg',
  header: 'This is a heading',
  subheader: 'And here is some subheading text.',
  buttonEnabled: true,
  buttonText: 'Click Me',
  buttonColor: '#000000',
  buttonTextColor: '#ffffff',
  backgroundColor: '#F3B389',
  textColor: '#000000',
  buttonUrl: 'https://inkling.local/',
  handleBackgroundColor: () => {},
}
