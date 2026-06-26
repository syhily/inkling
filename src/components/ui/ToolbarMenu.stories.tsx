/* oxlint-disable react/jsx-key */

import { ToolbarMenu, ToolbarMenuSeparator } from '@/components/ui/ToolbarMenu'
import {
  Add,
  Bold,
  Edit,
  HeadingThree,
  HeadingTwo,
  ImgFull,
  ImgRegular,
  ImgReplace,
  ImgWide,
  Italic,
  Link,
  Quote,
  Snippet,
} from '@/components/ui/ToolbarMenuItem.stories'

const story = {
  title: 'Toolbar/Toolbar',
  component: ToolbarMenu,
  subcomponents: { ToolbarMenuSeparator },
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
  return (
    <div className="flex">
      <ToolbarMenu {...(args as React.ComponentProps<typeof ToolbarMenu>)} />
    </div>
  )
}) as StoryTemplate

export const Text: StoryTemplate = Template.bind({})
Text.args = {
  children: [
    <Bold {...Bold.args} />,
    <Italic {...Italic.args} />,
    <HeadingTwo {...HeadingTwo.args} />,
    <HeadingThree {...HeadingThree.args} />,
    <ToolbarMenuSeparator />,
    <Quote {...Quote.args} />,
    <Link {...Link.args} />,
    <ToolbarMenuSeparator />,
    <Snippet {...Snippet.args} />,
  ],
}

export const Image: StoryTemplate = Template.bind({})
Image.args = {
  children: [
    <ImgRegular {...ImgRegular.args} />,
    <ImgWide {...ImgWide.args} />,
    <ImgFull {...ImgFull.args} />,
    <ToolbarMenuSeparator />,
    <Link {...Link.args} />,
    <ImgReplace {...ImgReplace.args} />,
    <ToolbarMenuSeparator />,
    <Snippet {...Snippet.args} />,
  ],
}

export const Gallery: StoryTemplate = Template.bind({})
Gallery.args = {
  children: [<Add {...Add.args} />, <ToolbarMenuSeparator />, <Snippet {...Snippet.args} />],
}

export const EditableCards: StoryTemplate = Template.bind({})
EditableCards.args = {
  children: [<Edit {...Edit.args} />, <ToolbarMenuSeparator />, <Snippet {...Snippet.args} />],
}

export const NonEditableCards: StoryTemplate = Template.bind({})
NonEditableCards.args = {
  children: [<Snippet {...Snippet.args} />],
}
