import type { BookmarkNode } from '@/nodes/BookmarkNode'

import { BookmarkNodeComponent } from '@/nodes/BookmarkNodeComponent'

/**
 * Bookmark's decorate render — the React-bearing half of its decorate-target,
 * paired with the declaration by `@/nodes/cards/card-decorate`.
 */
export function render(node: BookmarkNode) {
  return (
    <BookmarkNodeComponent
      author={node.author}
      captionEditor={node.__captionEditor}
      captionEditorInitialState={node.__captionEditorInitialState}
      createdWithUrl={node.__createdWithUrl}
      description={node.description}
      icon={node.icon}
      nodeKey={node.getKey()}
      publisher={node.publisher}
      thumbnail={node.thumbnail}
      title={node.title}
      url={node.url}
    />
  )
}
