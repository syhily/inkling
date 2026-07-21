// Floating panel — the one headless module owning the settings panel's layout
// decisions: the clamp math (keepWithinSpacing*), the card-origin resolution,
// the initial placement, and the drag session (start threshold → move → end
// with declared side effects). Everything DOM-shaped arrives as plain data or
// behind injected ports (position get/set, effect activate/deactivate), so the
// rules are unit-testable without layout or pointer events. The React adapter
// owning the DOM ports (body-level pointer listeners, the user-select
// stylesheet, click suppression, ResizeObservers) is
// @/hooks/useFloatingPanel; SettingsPanel is the sole consumer above that.

export interface PanelPosition {
  x: number
  y: number
}

export interface PanelSpacing {
  top: number
  bottom: number
  right: number
  left: number
}

export interface PanelSize {
  width: number
  height: number
}

export interface PanelViewport {
  width: number
  height: number
}

/** Default distance between the card and its settings panel. */
export const CARD_SPACING = 20

/** Minimum spacing between the panel and the viewport edges when settling (initial position, resize). */
export const MIN_PANEL_SPACING: PanelSpacing = { top: 66, bottom: 20, right: 20, left: 20 } // top: 66 is publish menu and word count size

/** Hard boundary spacing applied while dragging. */
export const DRAG_BOUNDARY_SPACING = 10

/** Distance in px the pointer must travel before a press becomes a drag. */
export const DRAG_MOVE_THRESHOLD = 3

export function isMobileViewport(viewport: PanelViewport): boolean {
  return viewport.width < 768 && viewport.height > viewport.width
}

/**
 * The origin every clamp agrees on. When the card has a transform applied
 * (e.g. wide cards) the panel is positioned relative to the card element
 * rather than the window, so the card's rect becomes the origin. DOM edge —
 * takes the card element, returns plain data.
 */
export function resolveCardOrigin(cardElement: HTMLElement | null): PanelPosition {
  if (!cardElement || window.getComputedStyle(cardElement).transform === 'none') {
    return { x: 0, y: 0 }
  }
  const rect = cardElement.getBoundingClientRect()
  return { x: rect.left, y: rect.top }
}

export interface ClampInput {
  x: number
  y: number
  /** Null when the panel element is missing — the position passes through (origin-adjusted) unclamped. */
  panelSize: PanelSize | null
  /** Viewport with any host chrome adjustment already subtracted from the width. */
  viewport: PanelViewport
  origin: PanelPosition
  spacing: PanelSpacing
  lastSpacing?: PanelSpacing | null
}

/**
 * Clamps a panel position so the panel keeps the given spacing from the
 * viewport edges. A previous spacing tighter than the requested one is kept
 * (negative spacing allowed) so a panel the user deliberately pushed offscreen
 * is not dragged back.
 */
export function clampWithinSpacing({
  x,
  y,
  panelSize,
  viewport,
  origin,
  spacing,
  lastSpacing,
}: ClampInput): PanelPosition {
  if (!panelSize) {
    return { x: x + origin.x, y: y + origin.y }
  }

  let { top, bottom, right, left } = spacing
  if (lastSpacing && lastSpacing.top < top) {
    top = lastSpacing.top
  }
  if (lastSpacing && lastSpacing.bottom < bottom) {
    bottom = lastSpacing.bottom
  }
  if (lastSpacing && lastSpacing.right < right) {
    right = lastSpacing.right
  }
  if (lastSpacing && lastSpacing.left < left) {
    left = lastSpacing.left
  }

  const panelRight = x + panelSize.width + origin.x
  const panelBottom = y + panelSize.height + origin.y

  const topIsOffscreen = y + origin.y < top
  const bottomIsOffscreen = viewport.height - panelBottom < bottom
  const rightIsOffscreen = viewport.width - panelRight < right
  const leftIsOffscreen = x < left

  let yAdjustment = 0
  let xAdjustment = 0

  if (topIsOffscreen && !bottomIsOffscreen) {
    yAdjustment = top - y - origin.y
  }
  if (bottomIsOffscreen && !topIsOffscreen) {
    yAdjustment = -(bottom - (viewport.height - panelBottom))
  }
  if (rightIsOffscreen) {
    xAdjustment = -(right - (viewport.width - panelRight))
  }
  if (leftIsOffscreen) {
    xAdjustment = left - x - origin.x
  }

  return { x: x + xAdjustment, y: y + yAdjustment }
}

type ClampRest = Omit<ClampInput, 'spacing' | 'lastSpacing'>

/** Drag clamp: hard boundary spacing on every edge, previous spacing ignored. */
export function clampOnDrag(input: ClampRest): PanelPosition {
  return clampWithinSpacing({
    ...input,
    spacing: {
      top: DRAG_BOUNDARY_SPACING,
      bottom: DRAG_BOUNDARY_SPACING,
      right: DRAG_BOUNDARY_SPACING,
      left: DRAG_BOUNDARY_SPACING,
    },
  })
}

/** Settle clamp: minimum spacing ( honouring previous spacing), then the drag boundary. */
export function clampOnResize(input: ClampRest & { lastSpacing?: PanelSpacing | null }): PanelPosition {
  const { lastSpacing, ...rest } = input
  const settled = clampWithinSpacing({ ...rest, spacing: MIN_PANEL_SPACING, lastSpacing })
  // the boundary pass ignores previous spacing, matching the drag clamp
  return clampOnDrag({ ...rest, x: settled.x, y: settled.y })
}

export interface InitialPanelPositionInput {
  cardRect: { top: number; bottom: number; right: number }
  panelSize: PanelSize
  viewport: PanelViewport
  origin: PanelPosition
  mobile: boolean
}

/**
 * The panel's preferred position: below the card (centered) on mobile;
 * vertically centered against the card's visible height, to the card's right,
 * on desktop. Clamped like a settle (desktop) or a drag (mobile).
 */
export function resolveInitialPanelPosition({
  cardRect,
  panelSize,
  viewport,
  origin,
  mobile,
}: InitialPanelPositionInput): PanelPosition {
  if (mobile) {
    const x = viewport.width / 2 - panelSize.width / 2
    const y = cardRect.bottom + CARD_SPACING
    return clampOnDrag({ x, y, panelSize, viewport, origin })
  }

  // correct the card height to what is actually on screen so the vertical
  // centering tracks the visible part of the card
  const visibleHeight = Math.min(viewport.height, cardRect.bottom) - cardRect.top
  const y = cardRect.top + visibleHeight / 2 - panelSize.height / 2
  const x = cardRect.right + CARD_SPACING
  return clampOnResize({ x, y, panelSize, viewport, origin })
}

/**
 * Viewport-resize drift: when the viewport grows, pull the panel back towards
 * its preferred position by at most the grown amount, so a panel pushed
 * offscreen by a small viewport becomes fully visible again on resize/rotate.
 */
export function driftTowardsInitial(
  position: PanelPosition,
  initial: PanelPosition | undefined,
  previousViewport: PanelViewport,
  viewport: PanelViewport,
): PanelPosition {
  let { x, y } = position
  if (!initial) {
    return { x, y }
  }
  if (viewport.height > previousViewport.height) {
    const heightIncrease = viewport.height - previousViewport.height
    if (initial.y > y) {
      y += Math.min(initial.y - y, heightIncrease)
    }
  }
  if (viewport.width > previousViewport.width) {
    const widthIncrease = viewport.width - previousViewport.width
    if (initial.x > x) {
      x += Math.min(initial.x - x, widthIncrease)
    }
  }
  return { x, y }
}

export interface DragSessionPorts {
  /** Current committed panel position. */
  getPosition: () => PanelPosition
  /** Commit a position (writes the transform, updates spacing). */
  setPosition: (position: PanelPosition) => void
  /** Clamp/policy applied to every drag position. */
  adjustOnDrag?: (position: PanelPosition) => PanelPosition
  /** Declared drag side effects (scroll/selection/pointer suppression) — begin. */
  activateEffects: () => void
  /** Declared drag side effects — end. */
  deactivateEffects: () => void
}

export interface DragSession {
  /** Pointer went down at point; records the grab offset. */
  start: (point: PanelPosition) => void
  /** Pointer moved; crosses the threshold once, then drags. */
  move: (point: PanelPosition) => void
  /** Pointer released; ends the session and its side effects. */
  end: () => void
  isDragging: () => boolean
  /** Shift the grab offset (panel re-clamped mid-drag after a resize — prevents position jumps). */
  adjustOffset: (deltaX: number, deltaY: number) => void
}

/**
 * Headless drag session: start threshold → move → end, with the side effects
 * declared behind ports. The React adapter feeds it pointer coordinates and
 * owns every DOM consequence.
 */
export function createDragSession({
  getPosition,
  setPosition,
  adjustOnDrag,
  activateEffects,
  deactivateEffects,
}: DragSessionPorts): DragSession {
  let dragging = false
  let offsetX = 0
  let offsetY = 0

  return {
    start(point) {
      dragging = false
      const current = getPosition()
      offsetX = point.x - current.x
      offsetY = point.y - current.y
    },

    move(point) {
      if (!dragging) {
        const current = getPosition()
        const movedX = Math.abs(point.x - offsetX - current.x) > DRAG_MOVE_THRESHOLD
        const movedY = Math.abs(point.y - offsetY - current.y) > DRAG_MOVE_THRESHOLD
        if (movedX || movedY) {
          activateEffects()
          dragging = true
        }
      }

      if (dragging) {
        let position: PanelPosition = { x: point.x - offsetX, y: point.y - offsetY }
        if (adjustOnDrag) {
          position = adjustOnDrag(position)
        }
        setPosition(position)
      }
    },

    end() {
      dragging = false
      deactivateEffects()
    },

    isDragging: () => dragging,

    adjustOffset(deltaX, deltaY) {
      offsetX -= deltaX
      offsetY -= deltaY
    },
  }
}
