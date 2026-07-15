import { createCommand, type LexicalEditor } from 'lexical'

import type { CaptionEditorDataset } from '@/types/card-node-datasets'

import BookmarkCardIcon from '@/assets/icons/inkling-card-type-bookmark.svg?react'
import InklingCardWrapper from '@/components/InklingCardWrapper'
import { BookmarkNode as BaseBookmarkNode, type BookmarkData } from '@/nodes/base'
import { BookmarkNodeComponent } from '@/nodes/BookmarkNodeComponent'
import { bookmarkDeclaration } from '@/nodes/cards/bookmark.declaration'

export type BookmarkNodeDataset = BookmarkData &
  CaptionEditorDataset & {
    // AtLinkPlugin passes a top-level `title` alongside `url`; the base node
    // constructor only reads `metadata.title`, so this is a tolerated no-op field.
    title?: string
  }

export const INSERT_BOOKMARK_COMMAND = createCommand<BookmarkNodeDataset>()

export class BookmarkNode extends BaseBookmarkNode {
  // nested editors live on the generated base class (static `nestedEditors`);
  // `declare` keeps these type-only so the field initializers don't clobber
  // the instances the base constructor sets up
  declare __captionEditor: LexicalEditor | null
  declare __captionEditorInitialState: import('lexical').EditorState | undefined
  __createdWithUrl

  // adopt the card declaration's nested-editor spec
  static nestedEditors = bookmarkDeclaration.nestedEditors

  static cardMenu = [
    {
      label: 'Bookmark',
      desc: 'Embed a link as a visual bookmark',
      Icon: BookmarkCardIcon,
      insertCommand: INSERT_BOOKMARK_COMMAND,
      matches: ['bookmark'],
      queryParams: ['url'],
      priority: 4,
      shortcut: '/bookmark [url]',
    },
  ]

  getIcon() {
    return BookmarkCardIcon
  }

  constructor(dataset: BookmarkNodeDataset = {}, key?: string) {
    super(dataset, key)

    this.__createdWithUrl = !!dataset.url && !dataset.metadata
  }

  decorate() {
    return (
      <InklingCardWrapper nodeKey={this.getKey()}>
        <BookmarkNodeComponent
          author={this.author}
          captionEditor={this.__captionEditor}
          captionEditorInitialState={this.__captionEditorInitialState}
          createdWithUrl={this.__createdWithUrl}
          description={this.description}
          icon={this.icon}
          nodeKey={this.getKey()}
          publisher={this.publisher}
          thumbnail={this.thumbnail}
          title={this.title}
          url={this.url}
        />
      </InklingCardWrapper>
    )
  }
}

export const $createBookmarkNode = (dataset: BookmarkNodeDataset) => {
  return new BookmarkNode(dataset)
}

export function $isBookmarkNode(node: unknown): node is BookmarkNode {
  return node instanceof BookmarkNode
}
