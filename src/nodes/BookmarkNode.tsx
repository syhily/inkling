import { $generateHtmlFromNodes } from '@lexical/html'
import { createCommand } from 'lexical'

import type { CaptionEditorDataset } from '@/types/card-node-datasets'

import BookmarkCardIcon from '@/assets/icons/inkling-card-type-bookmark.svg?react'
import InklingCardWrapper from '@/components/InklingCardWrapper'
import { cleanBasicHtml } from '@/html/clean-basic-html'
import { BookmarkNode as BaseBookmarkNode, type BookmarkData } from '@/nodes/base'
import { BookmarkNodeComponent } from '@/nodes/BookmarkNodeComponent'
import MINIMAL_NODES from '@/nodes/MinimalNodes'
import { populateNestedEditor, setupNestedEditor } from '@/utils/nested-editors'

export type BookmarkNodeDataset = BookmarkData &
  CaptionEditorDataset & {
    // AtLinkPlugin passes a top-level `title` alongside `url`; the base node
    // constructor only reads `metadata.title`, so this is a tolerated no-op field.
    title?: string
  }

export const INSERT_BOOKMARK_COMMAND = createCommand<BookmarkNodeDataset>()

export class BookmarkNode extends BaseBookmarkNode {
  __captionEditor!: import('lexical').LexicalEditor | null
  __captionEditorInitialState!: import('lexical').EditorState | undefined
  __createdWithUrl

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

    // set up nested editor instances
    setupNestedEditor(this, '__captionEditor', { editor: dataset.captionEditor, nodes: MINIMAL_NODES })

    // populate nested editors on initial construction
    if (!dataset.captionEditor && dataset.caption) {
      populateNestedEditor(this, '__captionEditor', `${dataset.caption}`) // we serialize with no wrapper
    }
  }

  getDataset() {
    const dataset = super.getDataset()

    // client-side only data properties such as nested editors
    const self = this.getLatest()
    dataset.captionEditor = self.__captionEditor
    dataset.captionEditorInitialState = self.__captionEditorInitialState

    return dataset
  }

  exportJSON() {
    const json = super.exportJSON()

    // convert nested editor instances back into HTML because their content may not
    // be automatically updated when the nested editor changes
    if (this.__captionEditor) {
      this.__captionEditor.getEditorState().read(() => {
        const html = $generateHtmlFromNodes(this.__captionEditor!, null)
        const cleanedHtml = cleanBasicHtml(html)
        json.caption = cleanedHtml
      })
    }

    return json
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
