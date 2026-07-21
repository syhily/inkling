import { ListPlugin } from '@lexical/react/LexicalListPlugin'

import AtLinkPlugin from '@/plugins/AtLinkPlugin'
import { CardInsertPlugin } from '@/plugins/CardInsertPlugin'
import { CardMenuPlugin } from '@/plugins/CardMenuPlugin'
import EmEnDashPlugin from '@/plugins/EmEnDashPlugin'
import { EmojiPickerPlugin } from '@/plugins/EmojiPickerPlugin'
import HorizontalRulePlugin from '@/plugins/HorizontalRulePlugin'
import InklingSelectorPlugin from '@/plugins/InklingSelectorPlugin'
import { InklingSnippetPlugin } from '@/plugins/InklingSnippetPlugin'

// The feature plugin bundle InklingEditor adds on top of the core plugins
// InklingComposableEditor always mounts (behaviour, toolbar, markdown,
// drag-drop, history). This is deliberately not "all defaults": the core set
// lives in InklingComposableEditor, and EmailEditor composes its own subset
// instead of using this bundle.
export const DefaultFeaturePlugins = () => {
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

export default DefaultFeaturePlugins
