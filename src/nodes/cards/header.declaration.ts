import type { NestedEditorSpec } from '@/nodes/base/generate-decorator-node'

import { BaseHeaderNode, headerCardWidth } from '@/nodes/base/nodes/header/HeaderNode'
import MINIMAL_NODES from '@/nodes/MinimalNodes'

import type { CardDeclaration } from './card-declaration'

import { INSERT_HEADER_COMMAND } from './card-commands'

// `as const` keeps the literal `name`s and value types on the declaration's
// type — the `__*` field map derives both from them (CardSpecFieldMap)
export const nestedEditors = [
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
] as const satisfies readonly NestedEditorSpec[]

export const headerDeclaration = {
  nodeType: 'header',
  baseNode: BaseHeaderNode,
  nestedEditors,
  decorateTarget: {
    width: headerCardWidth,
  },
  insert: { command: INSERT_HEADER_COMMAND, openInEditMode: true },
  menu: [
    {
      label: 'Header',
      labelKey: 'header',
      desc: 'Add a header',
      icon: 'header',
      command: INSERT_HEADER_COMMAND,
      matches: ['header', 'heading'],
      priority: 11,
      insertParams: () => ({
        version: 2,
      }),
      shortcut: '/header',
    },
  ],
  toolbarLabel: 'header',
  // Not markdown-eligible: the header card has no markdown representation.
  markdown: false,
} satisfies CardDeclaration<'header'>
