import type { NestedEditorSpec } from '@/nodes/base/generate-decorator-node'

import { BaseCalloutNode } from '@/nodes/base/nodes/callout/CalloutNode'
import MINIMAL_NODES from '@/nodes/MinimalNodes'

import type { CardDeclaration } from './card-declaration'

import { INSERT_CALLOUT_COMMAND } from './card-commands'

// `as const` keeps the literal `name`s on the declaration's type — the shim's
// `__*` field map derives its keys from them (CardSpecFieldMap)
const nestedEditors = [
  {
    name: 'calloutTextEditor',
    serializedKey: 'calloutText',
    nodes: MINIMAL_NODES,
    cleanBasicHtml: { allowBr: true },
  },
] as const satisfies readonly NestedEditorSpec[]

export const calloutDeclaration = {
  nodeType: 'callout',
  baseNode: BaseCalloutNode,
  nestedEditors,
  menu: [
    {
      label: 'Callout',
      labelKey: 'callout',
      desc: 'Info boxes that stand out',
      icon: 'callout',
      command: INSERT_CALLOUT_COMMAND,
      matches: ['callout'],
      priority: 9,
      shortcut: '/callout',
    },
  ],
  insert: { command: INSERT_CALLOUT_COMMAND, openInEditMode: true },
  toolbarLabel: 'callout',
  markdown: true,
} satisfies CardDeclaration<'callout'>
