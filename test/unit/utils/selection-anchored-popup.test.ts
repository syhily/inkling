import { describe, expect, it } from 'vitest'

import {
  POPUP_LIST_MAX_HEIGHT,
  POPUP_LIST_MAX_HEIGHT_VH,
  POPUP_TOOLBAR_HEIGHT_PX,
  popupMaxHeightBudget,
  resolveAnchoredPopupPlacement,
  type PopupRectLike,
} from '@/utils/selection-anchored-popup'

function rect(top: number, left: number, width: number, height: number): PopupRectLike {
  return { top, left, width, height, bottom: top + height, right: left + width }
}

const containerRect = rect(0, 20, 460, 800)

function layout(overrides: Partial<Parameters<typeof resolveAnchoredPopupPlacement>[0]> = {}) {
  return resolveAnchoredPopupPlacement({
    anchorRect: rect(700, 20, 100, 20),
    containerRect,
    popupHeight: 200,
    scrollTop: 0,
    scrollHeight: 2000,
    viewportHeight: 1000,
    ...overrides,
  })
}

describe('popupMaxHeightBudget', () => {
  it('reserves the results list height plus the toolbar row', () => {
    expect(popupMaxHeightBudget(1000)).toBe((1000 / 100) * POPUP_LIST_MAX_HEIGHT_VH + POPUP_TOOLBAR_HEIGHT_PX)
    expect(popupMaxHeightBudget(1000)).toBe(354)
  })

  it('single-sources the CSS-side max height', () => {
    expect(POPUP_LIST_MAX_HEIGHT).toBe('30vh')
  })
})

describe('resolveAnchoredPopupPlacement', () => {
  it('places the popup below the anchor, spanning the container', () => {
    const placement = layout()

    expect(placement).toEqual({ top: 730, left: 20, width: 460, flipped: false })
  })

  it('flips above the anchor when the below position plus the budget overflows the scroll container', () => {
    // belowTop 730 + budget 354 = 1084 > scrollHeight 800
    const placement = layout({ scrollHeight: 800 })

    expect(placement.top).toBe(700 - 200 - 10)
    expect(placement.flipped).toBe(true)
  })

  it('accounts for the scroll position when checking overflow', () => {
    // scrolled to the bottom: document-coordinate overflow even though scrollHeight is large
    const placement = layout({ scrollTop: 1500, scrollHeight: 2000 })

    expect(placement.flipped).toBe(true)
  })

  it('stays below when the budget fits exactly', () => {
    const placement = layout({ scrollHeight: 1084 })

    expect(placement.flipped).toBe(false)
  })

  it('honours a custom below gap', () => {
    const placement = layout({ gap: 4, scrollHeight: 2000 })

    expect(placement.top).toBe(724)
  })

  it('honours a custom above gap when flipped', () => {
    const placement = layout({ scrollHeight: 800, aboveGap: 55 })

    expect(placement.top).toBe(700 - 200 - 55)
  })
})
