import type { LexicalNode } from 'lexical'

import type { NestedEditorSpec } from '@/nodes/base/generate-decorator-node'

import { HeaderNode } from '@/nodes/base/nodes/header/HeaderNode'
import { normalizeCardWidth, type CardWidth } from '@/nodes/base/utils/card-widths'
import MINIMAL_NODES from '@/nodes/MinimalNodes'

import type { CardDeclaration } from './card-declaration'

const nestedEditors: readonly NestedEditorSpec[] = [
  {
    name: 'headerTextEditor',
    serializedKey: 'header',
    nodes: MINIMAL_NODES,
    cleanBasicHtml: { firstChildInnerContent: true, allowBr: true },
    // Header's dataset exposes the editors but not their initial states.
    exposeInitialStateInDataset: false,
  },
  {
    name: 'subheaderTextEditor',
    serializedKey: 'subheader',
    nodes: MINIMAL_NODES,
    cleanBasicHtml: { firstChildInnerContent: true, allowBr: true },
    exposeInitialStateInDataset: false,
  },
]

/**
 * Header's layout→width mapping: a `split` layout renders at `full` width,
 * every other layout is itself the card width (or undefined when the layout
 * is not a valid width). Kept as a named export so the wrapper's
 * `getCardWidth()` delegates to the spec mapper instead of duplicating it.
 */
export const headerCardWidth = (node: LexicalNode): CardWidth | undefined => {
  const layout = (node as HeaderNode).layout
  return normalizeCardWidth(layout === 'split' ? 'full' : layout)
}

export const headerDeclaration = {
  nodeType: 'header',
  baseNode: HeaderNode,
  nestedEditors,
  decorateTarget: {
    width: headerCardWidth,
  },
  insert: { openInEditMode: true },
  surfaces: {
    default: true,
    emailEditor: false,
    emailRenderer: false,
    // Not markdown-eligible: the header card has no markdown representation.
    markdown: false,
  },
} satisfies CardDeclaration<'header'>
