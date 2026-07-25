import type { NestedEditorSpec, TransientPropSpec } from '@/nodes/base/generate-decorator-node'

import { BaseBookmarkNode } from '@/nodes/base/nodes/bookmark/BookmarkNode'
import MINIMAL_NODES from '@/nodes/MinimalNodes'

import type { CardDeclaration } from './card-declaration'

import { INSERT_BOOKMARK_COMMAND } from './card-commands'

const nestedEditors: readonly NestedEditorSpec[] = [
  {
    name: 'captionEditor',
    serializedKey: 'caption',
    nodes: MINIMAL_NODES,
  },
]

const transientProps: readonly TransientPropSpec[] = [
  // true only for a card constructed from a bare url before its metadata was
  // fetched — the component's metadata-fetch effect keys off it. The initial
  // value reads the dataset the base constructor forwards to the generated
  // constructor.
  { name: 'createdWithUrl', initial: (dataset) => !!dataset.url && !dataset.metadata },
]

export const bookmarkDeclaration = {
  nodeType: 'bookmark',
  baseNode: BaseBookmarkNode,
  nestedEditors,
  transientProps,
  menu: [
    {
      label: 'Bookmark',
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
  surfaces: {
    default: true,
    emailEditor: true,
    emailRenderer: false,
    markdown: true,
  },
} satisfies CardDeclaration<'bookmark'>
