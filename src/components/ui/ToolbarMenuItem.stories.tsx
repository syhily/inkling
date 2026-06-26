import React from 'react'

import { ToolbarMenuItem } from '@/components/ui/ToolbarMenu'

const story = {
  title: 'Toolbar/Toolbar buttons',
  component: ToolbarMenuItem,
  parameters: {
    status: {
      type: 'functional',
    },
  },
}
export default story

interface StoryTemplate {
  (args: Record<string, unknown>): React.ReactElement
  bind: (thisArg: unknown) => StoryTemplate
  args?: Record<string, unknown>
}

const Template = ((args: Record<string, unknown>) => {
  const [isActive, setActive] = React.useState(false)
  const itemArgs = args as Omit<React.ComponentProps<typeof ToolbarMenuItem>, 'isActive' | 'onClick'>
  return (
    <div className="flex">
      <div className="rounded bg-black">
        <ToolbarMenuItem {...itemArgs} isActive={isActive} onClick={() => setActive(!isActive)} />
      </div>
    </div>
  )
}) as StoryTemplate

export const Bold: StoryTemplate = Template.bind({})
Bold.args = {
  icon: 'bold',
}

export const Italic: StoryTemplate = Template.bind({})
Italic.args = {
  icon: 'italic',
}

export const HeadingTwo: StoryTemplate = Template.bind({})
HeadingTwo.args = {
  icon: 'headingTwo',
}

export const HeadingThree: StoryTemplate = Template.bind({})
HeadingThree.args = {
  icon: 'headingThree',
}

export const Quote: StoryTemplate = Template.bind({})
Quote.args = {
  icon: 'quote',
}

export const QuoteOne: StoryTemplate = Template.bind({})
QuoteOne.args = {
  icon: 'quoteOne',
}

export const QuoteTwo: StoryTemplate = Template.bind({})
QuoteTwo.args = {
  icon: 'quoteTwo',
}

export const Link: StoryTemplate = Template.bind({})
Link.args = {
  icon: 'link',
}

export const ImgRegular: StoryTemplate = Template.bind({})
ImgRegular.args = {
  icon: 'imgRegular',
}

export const ImgWide: StoryTemplate = Template.bind({})
ImgWide.args = {
  icon: 'imgWide',
}

export const ImgFull: StoryTemplate = Template.bind({})
ImgFull.args = {
  icon: 'imgFull',
}

export const ImgReplace: StoryTemplate = Template.bind({})
ImgReplace.args = {
  icon: 'imgReplace',
}

export const Add: StoryTemplate = Template.bind({})
Add.args = {
  icon: 'add',
}

export const Edit: StoryTemplate = Template.bind({})
Edit.args = {
  icon: 'edit',
}

export const Snippet: StoryTemplate = Template.bind({})
Snippet.args = {
  icon: 'snippet',
}
