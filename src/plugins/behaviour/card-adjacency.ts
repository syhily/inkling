import type { DecoratorNode, LexicalEditor, LexicalNode } from 'lexical'

import {
  $createNodeSelection,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isDecoratorNode,
  $isElementNode,
  $isRangeSelection,
  $setSelection,
} from 'lexical'

import type { CardNode } from '@/types/lexical-internals'

import { $isAtTopOfNode, getTopLevelNativeElement } from '@/utils'
import { $ensureParagraphAfterCard } from '@/utils/$ensureParagraphAfterCard'

import type { CardSelectionStore } from './cardSelectionStore'

import { DELETE_CARD_COMMAND } from './commands'

export const RANGE_TO_ELEMENT_BOUNDARY_THRESHOLD_PX = 10

// Card adjacency (see CONTEXT.md) comes in two notions: visual adjacency — the
// caret's rendered position, derived from geometry, which arrow keys use — and
// logical adjacency — the selection anchor's offset, which backspace and delete
// use. Each notion has one named query below; they deliberately do not share a
// derivation.

/**
 * Geometry seam for the adjacency queries. The default implementation performs
 * the real DOM reads; tests inject a fake so no layout stubbing is needed.
 * Exported for tests only — production call sites pass nothing.
 */
export interface CardAdjacencyGeometry {
  /** Whether a native window selection exists at all (arrow down bails out before its shortcuts when it doesn't). */
  hasNativeSelection(): boolean
  /** Client rects of the caret's native range; empty when the caret has no rendered rect (e.g. empty paragraphs). */
  getCaretClientRects(): ArrayLike<DOMRect>
  /** Bounding rect of the top-level block element containing the caret. */
  getTopLevelBlockRect(): DOMRect | null
  /** Whether the caret sits on the first visual line of its block (delegates to $isAtTopOfNode). */
  isCaretAtBlockTop(): boolean
  /** Whether the native caret sits at the end of its top-level block element. */
  isCaretAtBlockEnd(): boolean
}

const defaultCardAdjacencyGeometry: CardAdjacencyGeometry = {
  hasNativeSelection() {
    return window.getSelection() !== null
  },
  getCaretClientRects() {
    const nativeSelection = window.getSelection()
    if (!nativeSelection || nativeSelection.rangeCount === 0) {
      return []
    }
    return nativeSelection.getRangeAt(0).cloneRange().getClientRects()
  },
  getTopLevelBlockRect() {
    const nativeTopLevelElement = getTopLevelNativeElement(window.getSelection()?.anchorNode ?? null)
    return nativeTopLevelElement ? nativeTopLevelElement.getBoundingClientRect() : null
  },
  isCaretAtBlockTop() {
    const nativeSelection = window.getSelection()
    if (!nativeSelection) {
      return false
    }
    return $isAtTopOfNode(nativeSelection, RANGE_TO_ELEMENT_BOUNDARY_THRESHOLD_PX) ?? false
  },
  isCaretAtBlockEnd() {
    const nativeSelection = window.getSelection()
    if (!nativeSelection || nativeSelection.rangeCount === 0) {
      return false
    }
    const nativeTopLevelElement = getTopLevelNativeElement(nativeSelection.anchorNode)
    return (
      nativeTopLevelElement !== null &&
      nativeSelection.anchorNode === nativeTopLevelElement &&
      nativeSelection.anchorOffset === nativeTopLevelElement.children.length - 1 &&
      nativeSelection.focusOffset === nativeTopLevelElement.children.length - 1
    )
  },
}

/**
 * Visual adjacency: the card rendered immediately above ('up') or below
 * ('down') the caret, when the caret is visually at the boundary of its
 * top-level block. Mirrors the arrow-key derivations, including their
 * empty-paragraph/offset shortcuts (an empty paragraph has no caret rect).
 */
export function $getVisuallyAdjacentCard(
  direction: 'up' | 'down',
  geometry: CardAdjacencyGeometry = defaultCardAdjacencyGeometry,
): DecoratorNode<unknown> | null {
  const selection = $getSelection()
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return null
  }
  const topLevelElement = selection.anchor.getNode().getTopLevelElement()
  if (!topLevelElement) {
    return null
  }
  const sibling = direction === 'up' ? topLevelElement.getPreviousSibling() : topLevelElement.getNextSibling()
  if (!$isDecoratorNode(sibling)) {
    return null
  }

  // empty paragraphs are odd because the native range won't have a rect to compare positioning
  const onEmptyNode = topLevelElement.getTextContent().trim() === '' && selection.anchor.offset === 0

  if (direction === 'up') {
    const atStartOfElement = selection.anchor.offset === 0 && selection.focus.offset === 0
    if (onEmptyNode || atStartOfElement) {
      return sibling
    }
    return geometry.isCaretAtBlockTop() ? sibling : null
  }

  // arrow down returns early when there is no native selection, before its shortcuts
  if (!geometry.hasNativeSelection()) {
    return null
  }
  const atEndOfElement = geometry.isCaretAtBlockEnd()
  if (onEmptyNode || atEndOfElement) {
    return sibling
  }
  const rects = geometry.getCaretClientRects()
  if (rects.length === 0) {
    return null
  }
  // rects.length will be 2 if at the start/end of a line and we should default to the new/second line for
  // determining if a card is below the cursor
  const rangeRect = rects.length > 1 ? rects[1] : rects[0]
  const elemRect = geometry.getTopLevelBlockRect()
  if (!elemRect) {
    return null
  }
  return Math.abs(rangeRect.bottom - elemRect.bottom) < RANGE_TO_ELEMENT_BOUNDARY_THRESHOLD_PX ? sibling : null
}

/**
 * Logical adjacency: the card immediately before ('previous') or after ('next')
 * a reference point in document order.
 *
 * With `from` omitted, the reference point is the current collapsed range
 * selection, gated on the anchor sitting at the boundary of its top-level
 * element (start for 'previous', end for 'next') — the derivation backspace
 * and delete use. With `from`, the reference point is that node and the
 * sibling lookup is ungated — for callers that resolve their own reference (a
 * selected node, a command payload node, the caret's top-level element).
 */
export function $getLogicallyAdjacentCard(
  direction: 'previous' | 'next',
  from?: LexicalNode,
): DecoratorNode<unknown> | null {
  if (from) {
    return getCardSibling(from, direction)
  }
  const selection = $getSelection()
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return null
  }
  const anchor = selection.anchor
  const anchorNode = anchor.getNode()
  const topLevelElement = anchorNode.getTopLevelElement()
  if (!topLevelElement) {
    return null
  }

  const atBoundary =
    direction === 'previous'
      ? anchor.offset === 0 && selection.focus.offset === 0
      : (anchor.type === 'element' && $isElementNode(anchorNode) && anchor.offset === anchorNode.getChildrenSize()) ||
        (anchor.type === 'text' &&
          anchor.offset === anchorNode.getTextContentSize() &&
          anchorNode.getParent()?.getLastChild()?.is(anchorNode))
  if (!atBoundary) {
    return null
  }
  return getCardSibling(topLevelElement, direction)
}

function getCardSibling(node: LexicalNode, direction: 'previous' | 'next'): DecoratorNode<unknown> | null {
  const sibling = direction === 'previous' ? node.getPreviousSibling() : node.getNextSibling()
  return $isDecoratorNode(sibling) ? sibling : null
}

/** First-visual-line verdict through the geometry seam (delete-line's isFirstLine check). */
export function $isCaretAtBlockTop(geometry: CardAdjacencyGeometry = defaultCardAdjacencyGeometry): boolean {
  return geometry.isCaretAtBlockTop()
}

/** Single home for the "editor root has focus" guard copied across the behaviour handlers. */
export function editorOwnsFocus(editor: LexicalEditor): boolean {
  return document.activeElement === editor.getRootElement()
}

/**
 * The "selected card eats the destructive key" gate — the one home of the
 * policy the backspace/delete/delete-line handlers share: while the editor
 * owns focus and a top-level (non-nested) card is selected, the key deletes
 * the card with the handler's direction instead of touching text. Returns
 * true when the key was claimed. Each handler keeps its own focus-swallow
 * policy (backspace/delete swallow early; delete-line falls through to its
 * caret-adjacent branches); this gate owns only the selected-card branch.
 */
export function dispatchSelectedCardDeletion(
  editor: LexicalEditor,
  store: CardSelectionStore,
  isNested: boolean | undefined,
  direction: 'backward' | 'forward',
  event?: KeyboardEvent | null,
): boolean {
  const { selectedCardKey } = store.getState()
  if (isNested || !selectedCardKey || !editorOwnsFocus(editor)) {
    return false
  }
  event?.preventDefault()
  editor.dispatchCommand(DELETE_CARD_COMMAND, { cardKey: selectedCardKey, direction })
  return true
}

// Card selection operations — the commands half of the module; the queries above find the cards these act on.

/**
 * The focus repair after selecting a card: a decorator selection has no
 * caret, so it does not move the window selection — focus must go to the
 * editor element by hand, and never scrolling (focus repair must not yank
 * the viewport).
 *
 * - 'if-blurred' (default): focus only when the editor is not already the
 *   active element — pointer-driven selection (click, menu insert).
 * - 'always': focus unconditionally — the caller just removed the focused
 *   card's chrome, or a headless host asked for focus (removal,
 *   external-control).
 * - 'never': no focus repair — keyboard navigation already owns focus
 *   (its callers use the bare `$selectDecoratorNode` primitive), or the
 *   caller already repaired focus itself (root-first removal).
 */
export type CardSelectionFocus = 'if-blurred' | 'always' | 'never'

export function $selectCard(
  editor: LexicalEditor,
  nodeOrKey: LexicalNode | string,
  { focus = 'if-blurred' }: { focus?: CardSelectionFocus } = {},
) {
  const selection = $createNodeSelection()
  selection.add(typeof nodeOrKey === 'string' ? nodeOrKey : nodeOrKey.getKey())
  $setSelection(selection)
  const rootElement = editor.getRootElement()
  if (rootElement && (focus === 'always' || (focus === 'if-blurred' && document.activeElement !== rootElement))) {
    rootElement.focus({ preventScroll: true })
  }
}

// remove empty cards when they are deselected
// (cards without an isEmpty method are never auto-removed)
export function $deselectCard(editor: LexicalEditor, nodeKey: string) {
  const cardNode = $getNodeByKey(nodeKey) as CardNode | null
  if (cardNode?.isEmpty?.()) {
    $removeOrReplaceNodeWithParagraph(editor, cardNode)
  }
}

/**
 * The focus choreography of `$removeOrReplaceNodeWithParagraph`:
 * - `'decorator-next'` (default, deselect-driven removal): focus moves to the
 *   root element only when the next sibling is a decorator, because selecting
 *   one leaves no caret to carry focus.
 * - `'root-first'` (ctrl/cmd+Enter leaving edit mode): focus returns to the
 *   editor BEFORE the card's chrome unmounts — otherwise it stays on removed
 *   elements and swallows further key events.
 */
export type CardRemovalFocus = 'decorator-next' | 'root-first'

export function $removeOrReplaceNodeWithParagraph(
  editor: LexicalEditor,
  node: LexicalNode,
  { focus = 'decorator-next' }: { focus?: CardRemovalFocus } = {},
) {
  if (focus === 'root-first') {
    editor.getRootElement()?.focus({ preventScroll: true })
  }

  if ($getRoot().getLastChild()?.is(node)) {
    $ensureParagraphAfterCard(node, { select: true })
  } else {
    const nextNode = node.getNextSibling()
    if (nextNode && $isDecoratorNode(nextNode)) {
      $selectCard(editor, nextNode, { focus: focus === 'decorator-next' ? 'always' : 'never' })
    } else {
      nextNode?.selectStart()
    }
  }

  node.remove()
}
