import type { NestedEditorSpec } from '@/nodes/base/generate-decorator-node'

import { nullableNestedEditor } from '@/nodes/base/generate-decorator-node'
import { BaseToggleNode } from '@/nodes/base/nodes/toggle/ToggleNode'
import BASIC_NODES from '@/nodes/BasicNodes'
import MINIMAL_NODES from '@/nodes/MinimalNodes'

import type { CardDeclaration } from './card-declaration'

import { INSERT_TOGGLE_COMMAND } from './card-commands'

// `as const` keeps the literal `name`s and value types on the declaration's
// type — the `__*` field map derives both from them (CardSpecFieldMap). Both
// nested editors ride nullableNestedEditor's carrier: the markdown
// round-trip detaches them
const nestedEditors = [
  nullableNestedEditor({
    name: 'titleEditor',
    serializedKey: 'heading',
    nodes: MINIMAL_NODES,
    cleanBasicHtml: { firstChildInnerContent: true, allowBr: true },
  }),
  nullableNestedEditor({
    name: 'contentEditor',
    serializedKey: 'content',
    nodes: BASIC_NODES,
    cleanBasicHtml: { allowBr: true },
  }),
] as const satisfies readonly NestedEditorSpec[]

export const toggleDeclaration = {
  nodeType: 'toggle',
  baseNode: BaseToggleNode,
  nestedEditors,
  decorateTarget: {
    width: 'regular',
  },
  menu: [
    {
      label: 'Toggle',
      labelKey: 'toggle',
      desc: 'Collapsible content block',
      icon: 'toggle',
      command: INSERT_TOGGLE_COMMAND,
      insertParams: {},
      matches: ['toggle', 'collapsible', 'accordion'],
      priority: 16,
      shortcut: '/toggle',
    },
  ],
  insert: { command: INSERT_TOGGLE_COMMAND, openInEditMode: true },
  toolbarLabel: 'toggle',
  markdown: true,
} satisfies CardDeclaration<'toggle'>
