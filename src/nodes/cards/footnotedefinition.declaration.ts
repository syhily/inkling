import type { NestedEditorSpec } from '@/nodes/base/generate-decorator-node'

import { BaseFootnoteDefinitionNode } from '@/nodes/base/nodes/footnotedefinition/FootnoteDefinitionNode'
import BASIC_NODES from '@/nodes/BasicNodes'

import type { CardDeclaration } from './card-declaration'

// `as const` keeps the literal `name`s on the declaration's type — the shim's
// `__*` field map derives its keys from them (CardSpecFieldMap)
const nestedEditors = [
  {
    name: 'contentEditor',
    serializedKey: 'content',
    nodes: BASIC_NODES,
    cleanBasicHtml: { allowBr: true },
  },
] as const satisfies readonly NestedEditorSpec[]

export const footnoteDefinitionDeclaration = {
  nodeType: 'footnotedefinition',
  baseNode: BaseFootnoteDefinitionNode,
  nestedEditors,
  decorateTarget: {
    width: 'regular',
  },
  // No menu, no insert — the footnote behaviour module
  // (`@/plugins/behaviour/footnotes`) creates and orders definitions; the
  // writer never inserts one from the slash menu (CodeBlock's menu-less
  // precedent).
  toolbarLabel: 'footnote',
  // Not in the markdown round-trip (docs/kobato-fit-plan.md C4 §3.2(g)) —
  // kobato interop goes through the wire dialect, not public markdown.
  markdown: false,
} satisfies CardDeclaration<'footnotedefinition'>
