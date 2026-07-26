import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import React from 'react'

import AtLinkPlugin from '@/plugins/AtLinkPlugin'
import { CardInsertPlugin } from '@/plugins/CardInsertPlugin'
import { CardMenuPlugin } from '@/plugins/CardMenuPlugin'
import EmEnDashPlugin from '@/plugins/EmEnDashPlugin'
import { EmojiPickerPlugin } from '@/plugins/EmojiPickerPlugin'
import FootnotePlugin from '@/plugins/FootnotePlugin'
import HorizontalRulePlugin from '@/plugins/HorizontalRulePlugin'
import InklingSelectorPlugin from '@/plugins/InklingSelectorPlugin'
import { InklingSnippetPlugin } from '@/plugins/InklingSnippetPlugin'
import { InklingTablePlugin } from '@/plugins/InklingTablePlugin'
import MathInlinePlugin from '@/plugins/MathInlinePlugin'

// A feature plugin entry, as data. The explicit key keeps rendering stable
// without leaning on component names (which minification can collapse).
export interface FeaturePluginEntry {
  key: string
  Component: React.ComponentType
}

// The feature plugin entries InklingEditor adds on top of the core plugins
// InklingComposableEditor always mounts (behaviour, toolbar, markdown,
// drag-drop, history), as data and in render order. This is deliberately not
// "all defaults": the core set lives in InklingComposableEditor.
export const DEFAULT_FEATURE_PLUGINS: readonly FeaturePluginEntry[] = [
  // Lexical
  { key: 'list', Component: ListPlugin }, // adds indent/outdent/remove etc support
  // <TabIndentationPlugin /> — tab/shift+tab triggers indent/outdent
  // Inkling
  { key: 'card-menu', Component: CardMenuPlugin },
  { key: 'snippet', Component: InklingSnippetPlugin },
  { key: 'selector', Component: InklingSelectorPlugin }, // Gif selector
  { key: 'emoji-picker', Component: EmojiPickerPlugin },
  { key: 'at-link', Component: AtLinkPlugin },
  { key: 'em-en-dash', Component: EmEnDashPlugin },
  // Cards
  { key: 'card-insert', Component: CardInsertPlugin },
  { key: 'horizontal-rule', Component: HorizontalRulePlugin },
  { key: 'math-inline', Component: MathInlinePlugin },
  { key: 'table', Component: InklingTablePlugin },
  { key: 'footnote', Component: FootnotePlugin },
]

export const DefaultFeaturePlugins = () => {
  return (
    <>
      {DEFAULT_FEATURE_PLUGINS.map(({ key, Component }) => (
        <Component key={key} />
      ))}
    </>
  )
}

export default DefaultFeaturePlugins
