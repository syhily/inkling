import { $getSelection, type LexicalEditor } from 'lexical'

import { $getSelectionRangeRect } from '@/utils/$getSelectionRangeRect'

// Selection-anchored popup layout — the one module owning how a fixed-position
// popup (at-link results, link-action toolbar) is placed against its anchor:
// the below-the-anchor default with an above-the-anchor flip when the popup
// would overflow the scroll container, and the max-height budget shared with
// the CSS side. Rects arrive as plain data (the ReorderGeometry pattern from
// @/utils/draggable/reorder-rules), so the flip rules are unit-testable with
// fake rects. The two anchor adapters (node-element rect, selection-range
// rect) live here at the edge; the React adapter that owns measuring, style
// writes, and the resize/scroll/MutationObserver subscription set is
// @/hooks/useSelectionAnchoredPopup.

/** Vertical gap between the anchor rect and the popup placed below it. */
export const POPUP_VERTICAL_GAP = 10

/**
 * Max height of the scrollable results list inside a selection-anchored popup.
 * Single-sourced here: the CSS side reads POPUP_LIST_MAX_HEIGHT (inline style —
 * a tailwind arbitrary value cannot reference a JS constant), and the flip rule
 * reserves the same height through popupMaxHeightBudget, so the two can never
 * drift apart.
 */
export const POPUP_LIST_MAX_HEIGHT_VH = 30
export const POPUP_LIST_MAX_HEIGHT = `${POPUP_LIST_MAX_HEIGHT_VH}vh`

/** Height of the toolbar row rendered above the results list (link input row). */
export const POPUP_TOOLBAR_HEIGHT_PX = 54

/**
 * The popup max-height budget used by the flip rule: the results list
 * (POPUP_LIST_MAX_HEIGHT_VH) plus the toolbar row (POPUP_TOOLBAR_HEIGHT_PX).
 * The flip reserves the full budget rather than the popup's current height so
 * the popup does not jump between above/below placement as the results list
 * changes size.
 */
export function popupMaxHeightBudget(viewportHeight: number): number {
  return (viewportHeight / 100) * POPUP_LIST_MAX_HEIGHT_VH + POPUP_TOOLBAR_HEIGHT_PX
}

/** Plain-data view of a DOMRect — the seam the layout rules are tested through. */
export interface PopupRectLike {
  top: number
  bottom: number
  left: number
  right: number
  width: number
  height: number
}

export interface AnchoredPopupLayoutInput {
  /** Rect the popup is anchored to (node element or selection range). */
  anchorRect: PopupRectLike
  /** Rect the popup spans horizontally (the editor container). */
  containerRect: PopupRectLike
  /** Popup height measured at its final width. */
  popupHeight: number
  scrollTop: number
  scrollHeight: number
  viewportHeight: number
  /** Gap below the anchor; defaults to POPUP_VERTICAL_GAP. */
  gap?: number
  /** Gap above the anchor when flipped; defaults to the below gap. */
  aboveGap?: number
}

export interface AnchoredPopupPlacement {
  top: number
  left: number
  width: number
  /** True when the popup was flipped above the anchor. */
  flipped: boolean
}

/**
 * Resolves the popup's fixed position: below the anchor, spanning the
 * container horizontally, flipping above the anchor when the below position
 * plus the max-height budget would overflow the scroll container.
 */
export function resolveAnchoredPopupPlacement({
  anchorRect,
  containerRect,
  popupHeight,
  scrollTop,
  scrollHeight,
  viewportHeight,
  gap,
  aboveGap,
}: AnchoredPopupLayoutInput): AnchoredPopupPlacement {
  const belowGap = gap ?? POPUP_VERTICAL_GAP
  const belowTop = anchorRect.bottom + belowGap
  const placement: AnchoredPopupPlacement = {
    top: belowTop,
    left: containerRect.left,
    width: containerRect.right - containerRect.left,
    flipped: false,
  }

  const overflowsScrollContainer = scrollTop + belowTop + popupMaxHeightBudget(viewportHeight) > scrollHeight
  if (overflowsScrollContainer) {
    placement.top = anchorRect.top - popupHeight - (aboveGap ?? belowGap)
    placement.flipped = true
  }

  return placement
}

/**
 * Anchor-rect provider for a selection-anchored popup. Resolved inside an
 * editor update (the React adapter owns that), so it may read the selection.
 * Returns null when the popup should not (re)position — including when there
 * is no selection, matching the historical behaviour of both popup call sites.
 */
export type PopupAnchor = () => DOMRect | null

/** Anchor adapter: the bounding rect of a node's element (at-link results popup). */
export function createNodeElementAnchor(editor: LexicalEditor, nodeKey: string): PopupAnchor {
  return () => {
    if (!$getSelection()) {
      return null
    }
    return editor.getElementByKey(nodeKey)?.getBoundingClientRect() ?? null
  }
}

/** Anchor adapter: the bounding rect of the current selection range (link-action toolbar). */
export function createSelectionAnchor(editor: LexicalEditor): PopupAnchor {
  return () => $getSelectionRangeRect({ editor, selection: $getSelection() })
}
