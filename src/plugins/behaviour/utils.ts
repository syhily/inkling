import type { LexicalEditor } from 'lexical'

import {
  $createNodeSelection,
  $createParagraphNode,
  $getNodeByKey,
  $getRoot,
  $isDecoratorNode,
  $setSelection,
} from 'lexical'

import type { CardNode } from '@/types/lexical-internals'

import { $selectDecoratorNode } from '@/utils'

export const RANGE_TO_ELEMENT_BOUNDARY_THRESHOLD_PX = 10

export const SPECIAL_MARKUPS = {
  code: '`',
  superscript: '^',
  subscript: '~',
  strikethrough: '~~',
}

export function $selectCard(editor: LexicalEditor, nodeKey: string) {
  const selection = $createNodeSelection()
  selection.add(nodeKey)
  $setSelection(selection)
  // selecting a decorator node does not change the
  // window selection (there's no caret) so we need
  // to manually move focus to the editor element
  const rootElement = editor.getRootElement()
  if (rootElement && document.activeElement !== rootElement) {
    rootElement.focus({ preventScroll: true })
  }
}

// remove empty cards when they are deselected
export function $deselectCard(editor: LexicalEditor, nodeKey: string) {
  const cardNode = $getNodeByKey(nodeKey) as CardNode | null
  if (cardNode?.isEmpty?.()) {
    $removeOrReplaceNodeWithParagraph(editor, cardNode)
  }
}

export function $removeOrReplaceNodeWithParagraph(editor: LexicalEditor, node: CardNode) {
  if ($getRoot().getLastChild()?.is(node)) {
    const paragraph = $createParagraphNode()
    $getRoot().append(paragraph)
    paragraph.select()
  } else {
    const nextNode = node.getNextSibling()
    if (nextNode && $isDecoratorNode(nextNode)) {
      $selectDecoratorNode(nextNode)
      // selecting a decorator node does not change the
      // window selection (there's no caret) so we need
      // to manually move focus to the editor element
      const rootElement = editor.getRootElement()
      if (rootElement) {
        rootElement.focus()
      }
    } else {
      nextNode?.selectStart()
    }
  }

  node.remove()
}

// Word and other Office apps generate HTML with `white-space: pre-wrap` on
// inline elements. Lexical treats the newline characters inside those elements
// as line breaks, which splits formatting (e.g. italic text ends up in a plain
// node and an empty em node). Stripping `pre-wrap` lets the browser collapse
// the newlines so formatting stays intact.
export function normalizePastedHtml(html: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  doc.querySelectorAll('[style*="white-space"]').forEach((element) => {
    const style = (element as HTMLElement).style
    if (style.whiteSpace === 'pre-wrap' || style.whiteSpace === 'pre') {
      style.whiteSpace = 'normal'
    }
  })

  return doc.body.innerHTML
}
