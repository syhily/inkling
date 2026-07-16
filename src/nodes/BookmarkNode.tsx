import { type LexicalEditor } from 'lexical'

import type { CaptionEditorDataset } from '@/types/card-node-datasets'

import { BookmarkNode as BaseBookmarkNode, type BookmarkData } from '@/nodes/base'
import { bookmarkDeclaration } from '@/nodes/cards/bookmark.declaration'
import { CARD_MENUS } from '@/nodes/cards/card-menus'
import { decorateCard } from '@/nodes/decorate-card'

export { INSERT_BOOKMARK_COMMAND } from '@/nodes/cards/card-menus'

export type BookmarkNodeDataset = BookmarkData &
  CaptionEditorDataset & {
    // AtLinkPlugin passes a top-level `title` alongside `url`; the base node
    // constructor only reads `metadata.title`, so this is a tolerated no-op field.
    title?: string
  }

export class BookmarkNode extends BaseBookmarkNode {
  // nested editors live on the generated base class (static `nestedEditors`);
  // `declare` keeps these type-only so the field initializers don't clobber
  // the instances the base constructor sets up. Non-null: the constructor's
  // nested-editor setup always assigns an editor (only the video/gallery/
  // callout/toggle editors are ever nulled, by the markdown card transformers).
  declare __captionEditor: LexicalEditor
  declare __captionEditorInitialState: import('lexical').EditorState | undefined
  __createdWithUrl

  // adopt the card declaration's nested-editor spec
  static nestedEditors = bookmarkDeclaration.nestedEditors

  static cardMenu = CARD_MENUS.bookmark

  constructor(dataset: BookmarkNodeDataset = {}, key?: string) {
    super(dataset, key)

    this.__createdWithUrl = !!dataset.url && !dataset.metadata
  }

  decorate() {
    return decorateCard(this)
  }
}

export const $createBookmarkNode = (dataset: BookmarkNodeDataset) => {
  return new BookmarkNode(dataset)
}

export function $isBookmarkNode(node: unknown): node is BookmarkNode {
  return node instanceof BookmarkNode
}
