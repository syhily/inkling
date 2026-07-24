import type { EditorState, LexicalEditor } from 'lexical'

import type { BookmarkData } from '@/nodes/base/nodes/bookmark/BookmarkNode'
import type { CaptionEditorDataset } from '@/types/card-node-datasets'

import { assembleCardNodeOnce } from '@/nodes/assemble-card-node'
import { bookmarkDeclaration } from '@/nodes/cards/bookmark.declaration'

export { $isBookmarkNode } from '@/nodes/base/nodes/bookmark/BookmarkNode'
export { INSERT_BOOKMARK_COMMAND } from '@/nodes/cards/card-commands'

export type BookmarkNodeDataset = BookmarkData &
  CaptionEditorDataset & {
    // AtLinkPlugin passes a top-level `title` alongside `url`; the base node
    // constructor only reads `metadata.title`, so this is a tolerated no-op field.
    title?: string
  }

/**
 * Transition shim (plan 039, Batch 5): the hand-written wrapper is gone — the
 * registered class is assembled once from the card declaration
 * (`@/nodes/cards/card-wrappers`), and `$isBookmarkNode` is canonical on the
 * base node. `$createBookmarkNode` keeps constructing the assembled class so
 * the nested-editor and transient-prop specs are initialized.
 */
export const BookmarkNode = assembleCardNodeOnce(bookmarkDeclaration)
export type BookmarkNode = InstanceType<typeof BookmarkNode> & {
  __createdWithUrl: boolean
  // non-null: the constructor's nested-editor setup always assigns an editor
  // (only the video/gallery/callout/toggle editors are ever nulled, by the
  // markdown card transformers)
  __captionEditor: LexicalEditor
  __captionEditorInitialState: EditorState | undefined
}

export const $createBookmarkNode = (dataset: BookmarkNodeDataset): BookmarkNode => {
  // the nested-editor and transient fields are initialized by the constructor from the dataset
  return new BookmarkNode(dataset) as BookmarkNode
}
