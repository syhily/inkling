import type { NestedEditorSpec, TransientPropSpec } from '@/nodes/base/generate-decorator-node'

import { BaseBookmarkNode } from '@/nodes/base/nodes/bookmark/BookmarkNode'
import MINIMAL_NODES from '@/nodes/MinimalNodes'

import type { CardDeclaration } from './card-declaration'

import { INSERT_BOOKMARK_COMMAND } from './card-commands'

// `as const` keeps the literal `name`s on the declaration's type — the shim's
// `__*` field map derives its keys from them (CardSpecFieldMap)
const nestedEditors = [
  {
    name: 'captionEditor',
    serializedKey: 'caption',
    nodes: MINIMAL_NODES,
  },
] as const satisfies readonly NestedEditorSpec[]

const transientProps = [
  // true only for a card constructed from a bare url before its metadata was
  // fetched — the component's metadata-fetch effect keys off it. The initial
  // value reads the dataset the base constructor forwards to the generated
  // constructor.
  { name: 'createdWithUrl', initial: (dataset) => !!dataset.url && !dataset.metadata },
] as const satisfies readonly TransientPropSpec[]

export const bookmarkDeclaration = {
  nodeType: 'bookmark',
  baseNode: BaseBookmarkNode,
  nestedEditors,
  transientProps,
  menu: [
    {
      label: 'Bookmark',
      labelKey: 'bookmark',
      desc: 'Embed a link as a visual bookmark',
      icon: 'bookmark',
      command: INSERT_BOOKMARK_COMMAND,
      matches: ['bookmark'],
      queryParams: ['url'],
      priority: 4,
      shortcut: '/bookmark [url]',
    },
  ],
  insert: { command: INSERT_BOOKMARK_COMMAND, requiresRangeSelection: true, insertCommandPriority: 'high' },
  toolbarLabel: 'bookmark',
  markdown: true,
} satisfies CardDeclaration<'bookmark'>
