import type { NestedEditorSpec } from '@/nodes/base/generate-decorator-node'

import { BaseCalloutNode } from '@/nodes/base/nodes/callout/CalloutNode'
import MINIMAL_NODES from '@/nodes/MinimalNodes'

import type { CardDeclaration } from './card-declaration'

import { INSERT_CALLOUT_COMMAND } from './card-commands'

const nestedEditors: readonly NestedEditorSpec[] = [
  {
    name: 'calloutTextEditor',
    serializedKey: 'calloutText',
    nodes: MINIMAL_NODES,
    cleanBasicHtml: { allowBr: true },
  },
]

export const calloutDeclaration = {
  nodeType: 'callout',
  baseNode: BaseCalloutNode,
  nestedEditors,
  menu: [
    {
      label: 'Callout',
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
  surfaces: {
    default: true,
    emailEditor: true,
    emailRenderer: false,
    markdown: true,
  },
} satisfies CardDeclaration<'callout'>
