import { ListPlugin } from '@lexical/react/LexicalListPlugin'

import AtLinkPlugin from '@/plugins/AtLinkPlugin'
import { CardInsertPlugin } from '@/plugins/CardInsertPlugin'
import { CardMenuPlugin } from '@/plugins/CardMenuPlugin'
import EmEnDashPlugin from '@/plugins/EmEnDashPlugin'
import { EmojiPickerPlugin } from '@/plugins/EmojiPickerPlugin'
import HorizontalRulePlugin from '@/plugins/HorizontalRulePlugin'
import InklingSelectorPlugin from '@/plugins/InklingSelectorPlugin'
import { InklingSnippetPlugin } from '@/plugins/InklingSnippetPlugin'

export const AllDefaultPlugins = () => {
  return (
    <>
      {/* Lexical Plugins */}
      <ListPlugin /> {/* adds indent/outdent/remove etc support */}
      {/* <TabIndentationPlugin /> tab/shift+tab triggers indent/outdent */}
      {/* Inkling Plugins */}
      <CardMenuPlugin />
      <InklingSnippetPlugin />
      <InklingSelectorPlugin /> {/* Gif selector */}
      <EmojiPickerPlugin />
      <AtLinkPlugin />
      <EmEnDashPlugin />
      {/* Card Plugins */}
      <CardInsertPlugin />
      <HorizontalRulePlugin />
    </>
  )
}

export default AllDefaultPlugins
