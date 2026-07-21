import type { NestedEditorSpec } from '@/nodes/base/generate-decorator-node'

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

export const bookmarkDeclaration = {
  nodeType: 'bookmark',
  baseNode: BaseBookmarkNode,
  nestedEditors,
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
  handWrittenWrapper: true,
  surfaces: {
    default: true,
    emailEditor: true,
    emailRenderer: false,
    markdown: true,
  },
} satisfies CardDeclaration<'bookmark'>
