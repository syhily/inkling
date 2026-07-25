import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import React from 'react'

import AtLinkPlugin from '@/plugins/AtLinkPlugin'
import { CardInsertPlugin } from '@/plugins/CardInsertPlugin'
import { CardMenuPlugin } from '@/plugins/CardMenuPlugin'
import EmEnDashPlugin from '@/plugins/EmEnDashPlugin'
import { EmojiPickerPlugin } from '@/plugins/EmojiPickerPlugin'
import HorizontalRulePlugin from '@/plugins/HorizontalRulePlugin'
import InklingSelectorPlugin from '@/plugins/InklingSelectorPlugin'
import { InklingSnippetPlugin } from '@/plugins/InklingSnippetPlugin'

// A feature plugin entry, as data. The explicit key keeps rendering stable
// without leaning on component names (which minification can collapse).
export interface FeaturePluginEntry {
  key: string
  Component: React.ComponentType
}

// The feature plugin entries InklingEditor adds on top of the core plugins
// InklingComposableEditor always mounts (behaviour, toolbar, markdown,
// drag-drop, history), as data and in render order. This is deliberately not
// "all defaults": the core set lives in InklingComposableEditor, and other
// surfaces derive their set from this list via `deriveFeaturePlugins` (see
// EmailEditor) instead of hand-enumerating plugin JSX.
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
]

// A surface's declared difference from the default feature plugin set:
// default entries to drop (by component reference) and extra entries to append.
export interface FeaturePluginDelta {
  exclude?: readonly React.ComponentType[]
  include?: readonly FeaturePluginEntry[]
}

// Derives a surface's feature plugin set: the default entries minus the
// excluded components, with the included entries appended after them.
export function deriveFeaturePlugins({
  exclude = [],
  include = [],
}: FeaturePluginDelta): readonly FeaturePluginEntry[] {
  const excluded = new Set<React.ComponentType>(exclude)
  return [...DEFAULT_FEATURE_PLUGINS.filter((entry) => !excluded.has(entry.Component)), ...include]
}

// Renders a feature plugin set. Surfaces mount their derived set through this
// single place so key assignment stays with the data.
export const FeaturePlugins = ({ plugins }: { plugins: readonly FeaturePluginEntry[] }) => {
  return (
    <>
      {plugins.map(({ key, Component }) => (
        <Component key={key} />
      ))}
    </>
  )
}

export const DefaultFeaturePlugins = () => {
  return <FeaturePlugins plugins={DEFAULT_FEATURE_PLUGINS} />
}

export default DefaultFeaturePlugins
