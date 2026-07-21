import { type LexicalEditor } from 'lexical'
import React from 'react'

import { getScrollParent } from '@/utils/getScrollParent'
import { resolveAnchoredPopupPlacement, type PopupAnchor, type PopupRectLike } from '@/utils/selection-anchored-popup'

interface UseSelectionAnchoredPopupOptions {
  editor: LexicalEditor
  popupRef: React.RefObject<HTMLElement | null>
  /** Anchor-rect adapter (node element or selection range); resolved inside an editor update. */
  anchor: PopupAnchor
  /** Rect the popup spans horizontally. */
  containerRect: () => PopupRectLike | null
  /** Gap above the anchor when the popup flips; defaults to the below gap. */
  aboveGap?: number
}

/**
 * React adapter over @/utils/selection-anchored-popup: positions popupRef
 * against its anchor, then keeps it positioned across window resize, container
 * scroll, and popup content mutations. Returns the reposition callback so a
 * consumer can request an extra pass (e.g. after loading content).
 */
export function useSelectionAnchoredPopup({
  editor,
  popupRef,
  anchor,
  containerRect,
  aboveGap,
}: UseSelectionAnchoredPopupOptions) {
  const scrollContainer = React.useMemo(() => getScrollParent(editor.getRootElement()), [editor])

  const updatePopupPosition = React.useCallback(() => {
    editor.update(() => {
      const popupElement = popupRef.current
      if (!popupElement) {
        return
      }

      const anchorRect = anchor()
      const container = containerRect()
      if (!anchorRect || !container) {
        return
      }

      // Span the container first so the popup height is measured at its final
      // width (wrapping changes with width), then resolve below/flip.
      popupElement.style.left = `${container.left}px`
      popupElement.style.width = `${container.right - container.left}px`

      const placement = resolveAnchoredPopupPlacement({
        anchorRect,
        containerRect: container,
        popupHeight: popupElement.getBoundingClientRect().height,
        scrollTop: scrollContainer.scrollTop,
        scrollHeight: scrollContainer.scrollHeight,
        viewportHeight: window.innerHeight,
        aboveGap,
      })

      popupElement.style.top = `${placement.top}px`
      popupElement.style.left = `${placement.left}px`
      popupElement.style.width = `${placement.width}px`
    })
  }, [editor, popupRef, anchor, containerRect, scrollContainer, aboveGap])

  React.useEffect(() => {
    updatePopupPosition()
  }, [updatePopupPosition])

  usePopupRepositionSubscriptions(updatePopupPosition, scrollContainer, popupRef)

  return updatePopupPosition
}

/**
 * The reposition subscription set: window resize, container scroll, and — when
 * observeRef is given — popup content mutations (results arriving/leaving
 * change the popup height, which matters when it is flipped above its anchor).
 */
export function usePopupRepositionSubscriptions(
  update: () => void,
  scrollElement: HTMLElement,
  observeRef?: React.RefObject<HTMLElement | null>,
) {
  React.useEffect(() => {
    const onReposition = () => update()
    window.addEventListener('resize', onReposition)
    scrollElement.addEventListener('scroll', onReposition)

    const observedElement = observeRef?.current
    const observer = observeRef ? new MutationObserver(onReposition) : null
    if (observedElement) {
      observer?.observe(observedElement, { childList: true, subtree: true })
    }

    return () => {
      window.removeEventListener('resize', onReposition)
      scrollElement.removeEventListener('scroll', onReposition)
      observer?.disconnect()
    }
  }, [update, scrollElement, observeRef])
}
