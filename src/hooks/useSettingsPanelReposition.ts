import type { LexicalEditor, NodeKey } from 'lexical'

import { LexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useCallback, useContext, useLayoutEffect, useRef } from 'react'

import useMovable from '@/hooks/useMovable'
import { debounce } from '@/utils'
import { getScrollParent } from '@/utils/getScrollParent'

const CARD_SPACING = 20 // default distance between card and settings panel
const MIN_RIGHT_SPACING = 20
const MIN_TOP_SPACING = 66 // 66 is publish menu and word count size
const MIN_BOTTOM_SPACING = 20
const MIN_LEFT_SPACING = 20

interface Origin {
  x: number
  y: number
}

interface SpacingOptions {
  topSpacing: number
  bottomSpacing: number
  rightSpacing: number
  leftSpacing: number
}

interface KeepWithinSpacingOptions extends SpacingOptions {
  x: number
  y: number
  lastSpacing?: {
    top: number
    bottom: number
    right: number
    left: number
  } | null
}

function isMobile(): boolean {
  return window.innerWidth < 768 && window.innerHeight > window.innerWidth
}

// Resolves the card's wrapper element from its node key. The wrapper inside the
// Lexical decorator element carries the card-width transform (e.g. wide cards),
// so it — not the decorator element — is the positioning anchor.
function findCardElement(editor: LexicalEditor, cardKey: NodeKey): HTMLElement | null {
  const decoratorElement = editor.getElementByKey(cardKey)
  if (!decoratorElement) {
    return null
  }
  return decoratorElement.querySelector('[data-inkling-card]') ?? decoratorElement
}

// The origin is always derived from the card element: if the card has a
// transform applied (e.g. wide cards) the panel becomes positioned relative to
// the card element rather than the window, and every clamp below must agree on
// the same origin. It used to be an options parameter that was unconditionally
// overwritten here — deriving it in one place keeps that de-facto behaviour
// without the dead parameter.
function getCardOrigin(cardElement: HTMLElement | null): Origin {
  const origin: Origin = { x: 0, y: 0 }
  if (!cardElement) {
    return origin
  }
  if (window.getComputedStyle(cardElement).transform === 'none') {
    return origin
  }
  const containerRect = cardElement.getBoundingClientRect()
  origin.x = containerRect.left
  origin.y = containerRect.top
  return origin
}

function getWindowWidthAdjustment(panelElem: HTMLElement | null): number {
  if (!panelElem) {
    return 0
  }

  return parseInt(window.getComputedStyle(panelElem).getPropertyValue('--inkling-breakout-adjustment') || '0', 10)
}

interface ViewportDimensions {
  width: number
  height: number
}

function getViewportDimensions(panelElem: HTMLElement | null): ViewportDimensions {
  const windowWidthAdjustment = getWindowWidthAdjustment(panelElem)

  return {
    width: window.innerWidth - windowWidthAdjustment,
    height: window.innerHeight,
  }
}

function keepWithinSpacing(
  panelElem: HTMLElement | null,
  options: KeepWithinSpacingOptions,
  cardElement: HTMLElement | null,
): Origin {
  let { x, y, topSpacing, bottomSpacing, rightSpacing, leftSpacing, lastSpacing } = options
  const origin = getCardOrigin(cardElement)

  if (!panelElem) {
    return { x: x + origin.x, y: y + origin.y }
  }

  const windowWidthAdjustment = getWindowWidthAdjustment(panelElem)

  // Take previous position into account, and adjust the spacing to allow negative spacing if the previous position was offscreen
  if (lastSpacing && lastSpacing.top < topSpacing) {
    topSpacing = lastSpacing.top
  }
  if (lastSpacing && lastSpacing.bottom < bottomSpacing) {
    bottomSpacing = lastSpacing.bottom
  }
  if (lastSpacing && lastSpacing.right < rightSpacing) {
    rightSpacing = lastSpacing.right
  }
  if (lastSpacing && lastSpacing.left < leftSpacing) {
    leftSpacing = lastSpacing.left
  }

  const width = panelElem.offsetWidth
  const height = panelElem.offsetHeight

  const right = x + width + origin.x
  const bottom = y + height + origin.y

  const topIsOffscreen = y + origin.y < topSpacing
  const bottomIsOffscreen = window.innerHeight - bottom < bottomSpacing
  const rightIsOffscreen = window.innerWidth - right - windowWidthAdjustment < rightSpacing
  const leftIsOffscreen = x < leftSpacing
  let yAdjustment = 0
  let xAdjustment = 0

  if (topIsOffscreen && !bottomIsOffscreen) {
    yAdjustment = topSpacing - y - origin.y
  }

  if (bottomIsOffscreen && !topIsOffscreen) {
    yAdjustment = -(bottomSpacing - (window.innerHeight - bottom))
  }

  if (rightIsOffscreen) {
    xAdjustment = -(rightSpacing - (window.innerWidth - right - windowWidthAdjustment))
  }

  if (leftIsOffscreen) {
    xAdjustment = leftSpacing - x - origin.x
  }

  return { x: x + xAdjustment, y: y + yAdjustment }
}

function keepWithinSpacingOnDrag(
  panelElem: HTMLElement | null,
  { x, y }: { x: number; y: number },
  cardElement: HTMLElement | null,
): Origin {
  const DISTANCE_FROM_BOUNDARY = 10

  const topSpacing = DISTANCE_FROM_BOUNDARY
  const bottomSpacing = DISTANCE_FROM_BOUNDARY
  const rightSpacing = DISTANCE_FROM_BOUNDARY
  const leftSpacing = DISTANCE_FROM_BOUNDARY

  // Last spacing is ignored
  return keepWithinSpacing(
    panelElem,
    {
      x,
      y,
      topSpacing,
      bottomSpacing,
      rightSpacing,
      leftSpacing,
      lastSpacing: undefined,
    },
    cardElement,
  )
}

function keepWithinSpacingOnResize(
  panelElem: HTMLElement | null,
  { x, y, lastSpacing }: { x: number; y: number; lastSpacing?: KeepWithinSpacingOptions['lastSpacing'] },
  cardElement: HTMLElement | null,
): Origin {
  return keepWithinSpacingOnDrag(
    panelElem,
    keepWithinSpacing(
      panelElem,
      {
        x,
        y,
        topSpacing: MIN_TOP_SPACING,
        bottomSpacing: MIN_BOTTOM_SPACING,
        rightSpacing: MIN_RIGHT_SPACING,
        leftSpacing: MIN_LEFT_SPACING,
        lastSpacing,
      },
      cardElement,
    ),
    cardElement,
  )
}

interface UseSettingsPanelRepositionOptions {
  positionToRef?: React.RefObject<HTMLElement | null>
  cardKey?: NodeKey
  cardWidth: string
}

export default function useSettingsPanelReposition<T extends HTMLElement = HTMLDivElement>({
  positionToRef,
  cardKey,
  cardWidth,
}: UseSettingsPanelRepositionOptions): { ref: React.RefObject<T | null> } {
  // read the raw context (null-safe) so the panel can still render outside a
  // composer (e.g. isolated unit tests) — useLexicalComposerContext would throw
  const composerContext = useContext(LexicalComposerContext)
  const editor = composerContext?.[0] ?? null

  // the card that renders the panel is the positioning anchor — resolve its
  // element from the node key (CardContext) instead of querying global DOM
  // selection attributes
  const resolveCardElement = useCallback((): HTMLElement | null => {
    if (positionToRef?.current) {
      return positionToRef.current
    }
    if (editor && cardKey) {
      return findCardElement(editor, cardKey)
    }
    return null
  }, [positionToRef, editor, cardKey])

  // useMovable captures the adjust callbacks in a mount-only effect, so they
  // must keep a stable identity and read the resolver through a ref
  const resolveCardElementRef = useRef<() => HTMLElement | null>(resolveCardElement)
  useLayoutEffect(() => {
    resolveCardElementRef.current = resolveCardElement
  }, [resolveCardElement])

  const adjustOnResize = useCallback(
    (
      panelElem: HTMLElement | null,
      position: { x: number; y: number; lastSpacing?: KeepWithinSpacingOptions['lastSpacing'] },
    ): Origin => keepWithinSpacingOnResize(panelElem, position, resolveCardElementRef.current()),
    [],
  )
  const adjustOnDrag = useCallback(
    (panelElem: HTMLElement | null, position: { x: number; y: number }): Origin =>
      keepWithinSpacingOnDrag(panelElem, position, resolveCardElementRef.current()),
    [],
  )

  const { ref, getPosition, setPosition } = useMovable<T>({
    adjustOnResize,
    adjustOnDrag,
  })
  const previousViewport = useRef<ViewportDimensions>(getViewportDimensions(ref.current))
  const previousCardWidth = useRef<string>(cardWidth)
  const previousCardOrigin = useRef<Origin>({ x: 0, y: 0 })

  const getInitialPosition = useCallback(
    (panelElem: HTMLElement | null): Origin | undefined => {
      if (!panelElem) {
        return
      }
      const panelHeight = panelElem.offsetHeight
      const cardElement = resolveCardElement()
      if (!cardElement) {
        return
      }
      const containerRect = cardElement.getBoundingClientRect()

      if (isMobile()) {
        // Mobile behaviour: position below card
        const x = window.innerWidth / 2 - panelElem.offsetWidth / 2
        const y = containerRect.bottom + CARD_SPACING
        return keepWithinSpacingOnDrag(panelElem, { x, y }, cardElement)
      }

      // We correct the height of the container to the height of the container that is on screen, then the positioning is better
      const visibleHeight = Math.min(window.innerHeight, containerRect.bottom) - containerRect.top

      // position vertically centered
      // if we already have top set, leave it so that toggling additional settings doesn't cause the panel to jump (unless it would be offscreen)
      const containerMiddle = containerRect.top + visibleHeight / 2

      const y = containerMiddle - panelHeight / 2

      // position to right of panel
      const x = containerRect.right + CARD_SPACING

      return keepWithinSpacingOnResize(panelElem, { x, y }, cardElement)
    },
    [resolveCardElement],
  )

  const onResize = useCallback(
    (panelElem: HTMLElement | null) => {
      let { x, y, lastSpacing } = getPosition()

      const viewport = getViewportDimensions(panelElem)

      // If the viewport size has increased, move the panel towards the initial position instead of keeping it in the same place
      // This increases the UX when the viewport is too small and the user resizes or rotates the screen -> it will move towards the preferred position so that it is fully visible
      if (viewport.height > previousViewport.current.height) {
        const heightIncrease = viewport.height - previousViewport.current.height
        const initialPosition = getInitialPosition(panelElem)
        if (initialPosition) {
          if (initialPosition.y > y) {
            y += Math.min(initialPosition.y - y, heightIncrease)
          }
        }
      }

      if (viewport.width > previousViewport.current.width) {
        const widthIncrease = viewport.width - previousViewport.current.width
        const initialPosition = getInitialPosition(panelElem)
        if (initialPosition) {
          if (initialPosition.x > x) {
            x += Math.min(initialPosition.x - x, widthIncrease)
          }
        }
      }

      setPosition(keepWithinSpacingOnResize(panelElem, { x, y, lastSpacing }, resolveCardElement()))

      previousViewport.current = viewport
    },
    [getInitialPosition, setPosition, getPosition, resolveCardElement],
  )

  // reposition on scroll container resize, covers two cases:
  // 1. window is resized
  // 2. sidebar is opened/closed
  useLayoutEffect(() => {
    if (!ref.current) {
      return
    }

    const container = getScrollParent(ref.current) || document.body
    let prevWidth = 0

    const panelRepositionDebounced = debounce(
      (newWidth: number) => {
        prevWidth = newWidth
        onResize(ref.current)
      },
      100,
      { leading: true, trailing: true },
    )

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const firstSize = entry.contentBoxSize?.[0]
        if (firstSize) {
          const width = firstSize.inlineSize
          if (typeof width === 'number' && width !== prevWidth) {
            panelRepositionDebounced(width)
          }
        }
      }
    })

    resizeObserver.observe(container)

    return () => {
      panelRepositionDebounced.cancel()
      resizeObserver.disconnect()
    }
  }, [onResize, ref])

  // position on first render
  useLayoutEffect(() => {
    if (!ref.current) {
      return
    }
    try {
      const initialPosition = getInitialPosition(ref.current)
      if (initialPosition) {
        setPosition(initialPosition)
      }
    } catch {
      // positioning is best-effort
    }
  }, [getInitialPosition, setPosition, ref])

  // account for wide cards using a transform so we need to adjust the origin position
  // previousCardWidth starts at cardWidth so the first render never shifts the origin
  useLayoutEffect(() => {
    if (cardWidth === 'wide' && previousCardWidth.current !== 'wide') {
      // offset origin to account for wide card (origin = card origin)
      const cardElement = resolveCardElement()
      if (!cardElement) {
        return
      }
      const containerRect = cardElement.getBoundingClientRect()
      const origin: Origin = { x: containerRect.left + 2, y: containerRect.top + 1 } // not sure why 2,1 offsets mild bounce in positioning
      previousCardOrigin.current = origin

      const x = getPosition().x - origin.x
      const y = getPosition().y - origin.y
      setPosition(keepWithinSpacingOnResize(ref.current, { x, y }, cardElement))
    } else if (previousCardWidth.current === 'wide' && cardWidth !== 'wide') {
      // reset origin to window origin
      const x = getPosition().x + previousCardOrigin.current.x
      const y = getPosition().y + previousCardOrigin.current.y
      setPosition(keepWithinSpacingOnResize(ref.current, { x, y }, resolveCardElement()))
    }
    previousCardWidth.current = cardWidth
  }, [cardWidth, getPosition, resolveCardElement, setPosition, ref])

  return { ref }
}
