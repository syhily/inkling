import type { LexicalEditor, NodeKey } from 'lexical'

import { LexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useCallback, useContext, useLayoutEffect, useRef, type RefObject } from 'react'

import { debounce } from '@/utils'
import {
  clampOnDrag,
  clampOnResize,
  createDragSession,
  driftTowardsInitial,
  isMobileViewport,
  resolveCardOrigin,
  resolveInitialPanelPosition,
  type PanelPosition,
  type PanelSpacing,
  type PanelViewport,
  type DragSession,
} from '@/utils/floating-panel'
import { getScrollParent } from '@/utils/getScrollParent'

// React adapter over @/utils/floating-panel (the deep module): owns the DOM
// ports — body-level pointer listeners, the user-select stylesheet, click
// suppression, the ResizeObservers — and the settings-panel layout effects
// (initial placement, viewport-resize drift, wide-card origin shift). Position
// and constraints go in, the committed position comes out as the element's
// transform. Replaces the former useMovable/useSettingsPanelReposition stack:
// both were single-consumer seams over this behaviour, and the drag session no
// longer captures its adjust callbacks mount-only, so the resolveCardElementRef
// dance is gone — every callback reads the latest resolver through latestRef.

interface UseFloatingPanelOptions {
  positionToRef?: RefObject<HTMLElement | null>
  cardKey?: NodeKey
  cardWidth: string
}

// Stylesheet ids come from a module counter — the panel only needs uniqueness
// within the document, not a UUID (this replaces the ember-port guidFor shim).
let stylesheetSeq = 0

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

function eventPoint(e: Event): PanelPosition | null {
  if (e instanceof TouchEvent) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  if (e instanceof MouseEvent) {
    return { x: e.clientX, y: e.clientY }
  }
  return null
}

export default function useFloatingPanel<T extends HTMLElement = HTMLDivElement>({
  positionToRef,
  cardKey,
  cardWidth,
}: UseFloatingPanelOptions): { ref: RefObject<T | null> } {
  // read the raw context (null-safe) so the panel can still render outside a
  // composer (e.g. isolated unit tests) — useLexicalComposerContext would throw
  const composerContext = useContext(LexicalComposerContext)
  const editor = composerContext?.[0] ?? null

  const ref = useRef<T | null>(null)

  // currentX/Y start undefined (not 0) so the panel resize observer can
  // distinguish "never positioned" from a legitimate position on the (0,0) axes
  const currentX = useRef<number | undefined>(undefined)
  const currentY = useRef<number | undefined>(undefined)
  // spacing between the panel and the viewport at the last committed position,
  // so clamps can keep negative spacing when the user placed the panel offscreen
  const lastSpacing = useRef<PanelSpacing | null>(null)

  const originalOverflow = useRef<string>('')
  const stylesheetIdRef = useRef<string | null>(null)
  if (stylesheetIdRef.current === null) {
    stylesheetSeq += 1
    stylesheetIdRef.current = `inkling-floating-panel-drag-${stylesheetSeq}`
  }
  const stylesheetId = stylesheetIdRef.current

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

  const getViewport = useCallback((): PanelViewport => {
    const adjustment = ref.current
      ? parseInt(window.getComputedStyle(ref.current).getPropertyValue('--inkling-breakout-adjustment') || '0', 10)
      : 0
    return { width: window.innerWidth - adjustment, height: window.innerHeight }
  }, [])

  const setPosition = useCallback(({ x, y }: PanelPosition) => {
    currentX.current = x
    currentY.current = y

    const elem = ref.current
    if (!elem) {
      return
    }

    lastSpacing.current = {
      top: y,
      left: x,
      right: window.innerWidth - x - elem.offsetWidth,
      bottom: window.innerHeight - y - elem.offsetHeight,
    }

    elem.style.transform = `translate(${x}px, ${y}px)`
  }, [])

  const getPosition = useCallback((): PanelPosition & { lastSpacing: PanelSpacing | null } => {
    return {
      x: currentX.current ?? 0,
      y: currentY.current ?? 0,
      lastSpacing: lastSpacing.current,
    }
  }, [])

  // --- declared drag side effects (the drag session's effect ports) ---

  const cancelClick = useCallback((e: Event) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const disableScroll = useCallback(() => {
    if (!ref.current) {
      return
    }
    originalOverflow.current = ref.current.style.overflow
    ref.current.style.overflow = 'hidden'
  }, [])

  const enableScroll = useCallback(() => {
    if (ref.current) {
      ref.current.style.overflow = originalOverflow.current
    }
  }, [])

  const disableSelection = useCallback(() => {
    window.getSelection()?.removeAllRanges()

    const stylesheet = document.createElement('style')
    stylesheet.id = stylesheetId
    document.head.appendChild(stylesheet)
    stylesheet.sheet?.insertRule('* { user-select: none !important; }', 0)
  }, [stylesheetId])

  const enableSelection = useCallback(() => {
    document.getElementById(stylesheetId)?.remove()
  }, [stylesheetId])

  // disabling pointer events prevents inputs being activated when drag finishes,
  // preventing clicks stops any event handlers that may otherwise result in the
  // panel being closed when the drag finishes
  const disablePointerEvents = useCallback(() => {
    if (ref.current) {
      ref.current.style.pointerEvents = 'none'
    }
    window.addEventListener('click', cancelClick, { capture: true, passive: false })
  }, [cancelClick])

  const enablePointerEvents = useCallback(() => {
    if (ref.current) {
      ref.current.style.pointerEvents = ''
    }
    window.removeEventListener('click', cancelClick, { capture: true })
  }, [cancelClick])

  const activateEffects = useCallback(() => {
    disableScroll()
    disableSelection()
    disablePointerEvents()
  }, [disableScroll, disableSelection, disablePointerEvents])

  const deactivateEffects = useCallback(() => {
    // Removing click suppression immediately re-enables the click behind in the
    // same event loop, losing the suppression when dragging out of the canvas.
    // The next tick stops the immediate click event firing when finishing drag.
    setTimeout(() => {
      window.removeEventListener('click', cancelClick, { capture: true })
    }, 1)

    enableScroll()
    enableSelection()

    // timeout required so immediate events stay blocked until the drag end has fully realised
    setTimeout(() => {
      enablePointerEvents()
    }, 5)
  }, [cancelClick, enableScroll, enableSelection, enablePointerEvents])

  // --- drag session (headless core) + its DOM pointer wiring ---

  // the session is created once and reads every changing input through refs, so
  // no callback is captured mount-only and no resolver dance is needed
  const latest = useRef({ resolveCardElement, getViewport })
  useLayoutEffect(() => {
    latest.current = { resolveCardElement, getViewport }
  }, [resolveCardElement, getViewport])

  const sessionRef = useRef<DragSession | null>(null)
  if (!sessionRef.current) {
    sessionRef.current = createDragSession({
      getPosition,
      setPosition,
      adjustOnDrag: (position) => {
        const elem = ref.current
        const cardElement = latest.current.resolveCardElement()
        return clampOnDrag({
          ...position,
          panelSize: elem ? { width: elem.offsetWidth, height: elem.offsetHeight } : null,
          viewport: latest.current.getViewport(),
          origin: resolveCardOrigin(cardElement),
        })
      },
      activateEffects,
      deactivateEffects,
    })
  }

  useLayoutEffect(() => {
    const elem = ref.current
    if (!elem) {
      return
    }
    elem.setAttribute('draggable', 'true')
    elem.classList.add('inkling-card-movable')

    const session = sessionRef.current!

    const onMove = (e: Event) => {
      const point = eventPoint(e)
      if (point) {
        session.move(point)
      }
    }
    const onEnd = () => {
      removeActiveEventListeners()
      session.end()
    }
    const addActiveEventListeners = () => {
      window.addEventListener('touchend', onEnd, { capture: true, passive: true })
      window.addEventListener('touchmove', onMove, { capture: true, passive: true })
      window.addEventListener('mouseup', onEnd, { capture: true, passive: true })
      window.addEventListener('mousemove', onMove, { capture: true, passive: true })
    }
    function removeActiveEventListeners() {
      window.removeEventListener('touchend', onEnd, { capture: true })
      window.removeEventListener('touchmove', onMove, { capture: true })
      window.removeEventListener('mouseup', onEnd, { capture: true })
      window.removeEventListener('mousemove', onMove, { capture: true })

      // deferred for the same reason as the drag-end click suppression
      setTimeout(() => {
        window.removeEventListener('click', cancelClick, { capture: true })
      }, 1)
    }

    const dragStart = (e: TouchEvent | MouseEvent) => {
      e.stopPropagation()

      if (e.type !== 'touchstart' && !(e instanceof MouseEvent && e.button === 0)) {
        return
      }

      const point = eventPoint(e)
      if (!point) {
        return
      }
      session.start(point)

      const path = e.composedPath?.() ?? []
      for (const element of path) {
        if (!(element instanceof Element)) {
          continue
        }
        if (element.matches('input, .ember-basic-dropdown-trigger')) {
          break
        }
        if (element === elem) {
          addActiveEventListeners()
          break
        }
      }
    }

    // React event handlers get added to the root element, so listeners added to
    // the panel directly would stopPropagation any React events on child nodes.
    // Instead the listeners live on the body and check the event target.
    const startListener = (e: Event) => {
      const target = e.target
      if (target instanceof Node && ref.current?.contains(target)) {
        dragStart(e as TouchEvent | MouseEvent)
      }
    }

    document.body.addEventListener('touchstart', startListener, false)
    document.body.addEventListener('mousedown', startListener, false)

    // panel resize: re-clamp the settled position and shift the session's grab
    // offset so a resize mid-drag (e.g. a collapsible section toggled from a
    // panel button) doesn't jump the drag position
    const panelResizeObserver = new ResizeObserver(() => {
      const x = currentX.current
      const y = currentY.current
      if (x === undefined || y === undefined) {
        return
      }

      const cardElement = latest.current.resolveCardElement()
      const position = clampOnResize({
        x,
        y,
        panelSize: { width: elem.offsetWidth, height: elem.offsetHeight },
        viewport: latest.current.getViewport(),
        origin: resolveCardOrigin(cardElement),
        lastSpacing: lastSpacing.current,
      })

      if (position.x !== x || position.y !== y) {
        session.adjustOffset(position.x - x, position.y - y)
        setPosition(position)
      }
    })
    panelResizeObserver.observe(elem)

    return () => {
      document.body.removeEventListener('touchstart', startListener, false)
      document.body.removeEventListener('mousedown', startListener, false)
      removeActiveEventListeners()
      panelResizeObserver.disconnect()
      enableSelection()
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --- settings-panel layout effects ---

  const getInitialPosition = useCallback(
    (panelElem: HTMLElement): PanelPosition | undefined => {
      const cardElement = resolveCardElement()
      if (!cardElement) {
        return
      }
      const cardRect = cardElement.getBoundingClientRect()
      const viewport = getViewport()
      const panelSize = { width: panelElem.offsetWidth, height: panelElem.offsetHeight }
      return resolveInitialPanelPosition({
        cardRect,
        panelSize,
        viewport,
        origin: resolveCardOrigin(cardElement),
        mobile: isMobileViewport({ width: window.innerWidth, height: window.innerHeight }),
      })
    },
    [resolveCardElement, getViewport],
  )

  const previousViewport = useRef<PanelViewport>(getViewport())
  const previousCardWidth = useRef<string>(cardWidth)
  const previousCardOrigin = useRef<PanelPosition>({ x: 0, y: 0 })

  const onResize = useCallback(
    (panelElem: HTMLElement | null) => {
      const { x, y, lastSpacing: spacing } = getPosition()

      const viewport = getViewport()
      const drifted = driftTowardsInitial(
        { x, y },
        panelElem ? getInitialPosition(panelElem) : undefined,
        previousViewport.current,
        viewport,
      )

      setPosition(
        clampOnResize({
          x: drifted.x,
          y: drifted.y,
          panelSize: panelElem ? { width: panelElem.offsetWidth, height: panelElem.offsetHeight } : null,
          viewport,
          origin: resolveCardOrigin(resolveCardElement()),
          lastSpacing: spacing,
        }),
      )

      previousViewport.current = viewport
    },
    [getPosition, getViewport, getInitialPosition, setPosition, resolveCardElement],
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
  }, [onResize])

  // position on first render (and re-position if the card anchor changes)
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
    previousViewport.current = getViewport()
  }, [getInitialPosition, setPosition, getViewport])

  // account for wide cards using a transform so we need to adjust the origin position
  // previousCardWidth starts at cardWidth so the first render never shifts the origin
  useLayoutEffect(() => {
    const cardElement = resolveCardElement()
    if (cardWidth === 'wide' && previousCardWidth.current !== 'wide') {
      // offset origin to account for wide card (origin = card origin)
      if (!cardElement) {
        return
      }
      const containerRect = cardElement.getBoundingClientRect()
      const origin: PanelPosition = { x: containerRect.left + 2, y: containerRect.top + 1 } // not sure why 2,1 offsets mild bounce in positioning
      previousCardOrigin.current = origin

      const x = getPosition().x - origin.x
      const y = getPosition().y - origin.y
      if (ref.current) {
        setPosition(
          clampOnResize({
            x,
            y,
            panelSize: { width: ref.current.offsetWidth, height: ref.current.offsetHeight },
            viewport: getViewport(),
            origin: resolveCardOrigin(cardElement),
          }),
        )
      }
    } else if (previousCardWidth.current === 'wide' && cardWidth !== 'wide') {
      // reset origin to window origin
      const x = getPosition().x + previousCardOrigin.current.x
      const y = getPosition().y + previousCardOrigin.current.y
      if (ref.current) {
        setPosition(
          clampOnResize({
            x,
            y,
            panelSize: { width: ref.current.offsetWidth, height: ref.current.offsetHeight },
            viewport: getViewport(),
            origin: resolveCardOrigin(cardElement),
          }),
        )
      }
    }
    previousCardWidth.current = cardWidth
  }, [cardWidth, getPosition, resolveCardElement, setPosition, getViewport])

  return { ref }
}
