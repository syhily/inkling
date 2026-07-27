import type { NestedEditorSpec } from '@/nodes/base/generate-decorator-node'

import { BaseToggleNode } from '@/nodes/base/nodes/toggle/ToggleNode'
import BASIC_NODES from '@/nodes/BasicNodes'
import MINIMAL_NODES from '@/nodes/MinimalNodes'

import type { CardDeclaration } from './card-declaration'

import { INSERT_TOGGLE_COMMAND } from './card-commands'

// `as const` keeps the literal `name`s on the declaration's type — the shim's
// `__*` field map derives its keys from them (CardSpecFieldMap)
const nestedEditors = [
  {
    name: 'titleEditor',
    serializedKey: 'heading',
    nodes: MINIMAL_NODES,
    cleanBasicHtml: { firstChildInnerContent: true, allowBr: true },
  },
  {
    name: 'contentEditor',
    serializedKey: 'content',
    nodes: BASIC_NODES,
    cleanBasicHtml: { allowBr: true },
  },
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
