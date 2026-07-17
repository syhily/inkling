import { act, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { MovablePosition, MovablePositionWithSpacing, UseMovableResult } from '@/hooks/useMovable'

import useSettingsPanelReposition from '@/hooks/useSettingsPanelReposition'

const mockMovable = vi.hoisted(() => {
  type Instance = {
    ref: React.MutableRefObject<HTMLElement | null>
    getPosition: ReturnType<typeof vi.fn<[], MovablePositionWithSpacing>>
    setPosition: ReturnType<typeof vi.fn<[MovablePosition], void>>
  }
  const instances: Instance[] = []
  const reset = () => {
    instances.length = 0
  }
  const fn = vi.fn<[], UseMovableResult>(() => {
    let pos: MovablePosition = { x: 100, y: 100 }
    const getPosition = vi.fn<[], MovablePositionWithSpacing>(() => ({ ...pos, lastSpacing: null }))
    const setPosition = vi.fn<[MovablePosition], void>((next) => {
      pos = { ...next }
    })
    const ref: React.MutableRefObject<HTMLElement | null> = { current: null }
    const instance: Instance = { ref, getPosition, setPosition }
    instances.push(instance)
    return instance as unknown as UseMovableResult
  })
  return { fn, instances, reset }
})

vi.mock('@/hooks/useMovable', () => ({
  default: mockMovable.fn,
}))

class MockResizeObserver {
  static instances: MockResizeObserver[] = []

  callback: ResizeObserverCallback
  targets: Element[] = []
  disconnectCount = 0

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
    MockResizeObserver.instances.push(this)
  }

  observe(target: Element) {
    this.targets.push(target)
  }

  unobserve(target: Element) {
    this.targets = this.targets.filter((t) => t !== target)
  }

  disconnect() {
    this.disconnectCount += 1
    this.targets = []
  }

  emit(width: number) {
    const entry = {
      target: this.targets[0],
      contentBoxSize: [{ inlineSize: width, blockSize: 0 }],
    } as unknown as ResizeObserverEntry
    this.callback([entry], this)
  }
}

const originalResizeObserver = globalThis.ResizeObserver

let originalInnerWidthDescriptor: PropertyDescriptor | undefined
let originalInnerHeightDescriptor: PropertyDescriptor | undefined

function setWindowSize(width: number, height: number) {
  if (originalInnerWidthDescriptor === undefined) {
    originalInnerWidthDescriptor = Object.getOwnPropertyDescriptor(window, 'innerWidth') ?? undefined
  }
  if (originalInnerHeightDescriptor === undefined) {
    originalInnerHeightDescriptor = Object.getOwnPropertyDescriptor(window, 'innerHeight') ?? undefined
  }
  Object.defineProperty(window, 'innerWidth', { value: width, configurable: true, writable: true })
  Object.defineProperty(window, 'innerHeight', { value: height, configurable: true, writable: true })
}

function restoreWindowSize() {
  if (originalInnerWidthDescriptor) {
    Object.defineProperty(window, 'innerWidth', originalInnerWidthDescriptor)
  }
  if (originalInnerHeightDescriptor) {
    Object.defineProperty(window, 'innerHeight', originalInnerHeightDescriptor)
  }
  originalInnerWidthDescriptor = undefined
  originalInnerHeightDescriptor = undefined
}

function setElementSize(element: HTMLElement, size: { offsetWidth: number; offsetHeight: number }) {
  Object.defineProperty(element, 'offsetWidth', {
    value: size.offsetWidth,
    configurable: true,
  })
  Object.defineProperty(element, 'offsetHeight', {
    value: size.offsetHeight,
    configurable: true,
  })
}

interface HarnessProps {
  positionToRef?: React.RefObject<HTMLElement | null>
  cardWidth?: string
}

function Harness({ positionToRef, cardWidth = 'regular' }: HarnessProps) {
  const { ref } = useSettingsPanelReposition({ positionToRef, cardWidth })
  return (
    <div data-testid="scroll-container" style={{ overflowY: 'auto', width: 800, height: 600 }}>
      <div data-inkling-card-editing="true" style={{ width: 200, height: 100 }} />
      <div ref={ref} data-testid="settings-panel" style={{ width: 100, height: 100 }} />
    </div>
  )
}

function findContainerObserver(container: Element) {
  return MockResizeObserver.instances.find((instance) => instance.targets.includes(container))
}

describe('useSettingsPanelReposition', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setWindowSize(1024, 768)
    globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver
    mockMovable.reset()
    MockResizeObserver.instances.length = 0
  })

  afterEach(() => {
    vi.useRealTimers()
    restoreWindowSize()
    globalThis.ResizeObserver = originalResizeObserver
    MockResizeObserver.instances.length = 0
  })

  it('invokes the leading resize callback immediately and the trailing callback after the burst settles', async () => {
    render(<Harness />)
    const panel = screen.getByTestId('settings-panel')
    const scrollContainer = screen.getByTestId('scroll-container')
    setElementSize(panel, { offsetWidth: 100, offsetHeight: 100 })

    const observer = findContainerObserver(scrollContainer)
    expect(observer).toBeDefined()

    const movable = mockMovable.instances[0]
    const baseline = movable.setPosition.mock.calls.length

    observer!.emit(800)
    expect(movable.setPosition).toHaveBeenCalledTimes(baseline + 1)

    observer!.emit(900)
    expect(movable.setPosition).toHaveBeenCalledTimes(baseline + 1)

    await act(async () => {
      vi.advanceTimersByTime(150)
    })
    expect(movable.setPosition).toHaveBeenCalledTimes(baseline + 2)
  })

  it('ignores resize entries whose width has not changed', async () => {
    render(<Harness />)
    const panel = screen.getByTestId('settings-panel')
    const scrollContainer = screen.getByTestId('scroll-container')
    setElementSize(panel, { offsetWidth: 100, offsetHeight: 100 })

    const observer = findContainerObserver(scrollContainer)
    expect(observer).toBeDefined()

    const movable = mockMovable.instances[0]
    const baseline = movable.setPosition.mock.calls.length

    observer!.emit(800)
    expect(movable.setPosition).toHaveBeenCalledTimes(baseline + 1)

    observer!.emit(800)
    observer!.emit(800)

    await act(async () => {
      vi.advanceTimersByTime(150)
    })
    expect(movable.setPosition).toHaveBeenCalledTimes(baseline + 1)
  })

  it('cancels pending trailing resize work on unmount', async () => {
    const { unmount } = render(<Harness />)
    const panel = screen.getByTestId('settings-panel')
    const scrollContainer = screen.getByTestId('scroll-container')
    setElementSize(panel, { offsetWidth: 100, offsetHeight: 100 })

    const observer = findContainerObserver(scrollContainer)
    expect(observer).toBeDefined()

    const movable = mockMovable.instances[0]

    observer!.emit(800)
    const setPositionCountAfterLeading = movable.setPosition.mock.calls.length
    const getPositionCountAfterLeading = movable.getPosition.mock.calls.length

    observer!.emit(900)
    expect(observer!.disconnectCount).toBe(0)

    unmount()
    expect(observer!.disconnectCount).toBe(1)

    await act(async () => {
      vi.advanceTimersByTime(150)
    })

    expect(movable.setPosition).toHaveBeenCalledTimes(setPositionCountAfterLeading)
    expect(movable.getPosition).toHaveBeenCalledTimes(getPositionCountAfterLeading)
  })

  it('does not let a stale debounced callback update a new panel instance after rerender', async () => {
    const { rerender } = render(<Harness cardWidth="regular" />)
    const panel = screen.getByTestId('settings-panel')
    const scrollContainer = screen.getByTestId('scroll-container')
    setElementSize(panel, { offsetWidth: 100, offsetHeight: 100 })

    const observer = findContainerObserver(scrollContainer)
    expect(observer).toBeDefined()

    const firstMovable = mockMovable.instances[0]

    observer!.emit(800)
    observer!.emit(900)

    const nextPositionToRef: React.RefObject<HTMLElement | null> = { current: document.createElement('div') }
    rerender(<Harness cardWidth="regular" positionToRef={nextPositionToRef} />)

    const nextScrollContainer = screen.getByTestId('scroll-container')
    const nextObserver = MockResizeObserver.instances.find(
      (instance) => instance.targets.includes(nextScrollContainer) && instance !== observer,
    )
    expect(nextObserver).toBeDefined()
    const nextMovable = mockMovable.instances[1]
    expect(nextMovable).toBeDefined()

    const staleSetPositionCount = firstMovable.setPosition.mock.calls.length
    const staleGetPositionCount = firstMovable.getPosition.mock.calls.length

    await act(async () => {
      vi.advanceTimersByTime(150)
    })
    expect(firstMovable.setPosition).toHaveBeenCalledTimes(staleSetPositionCount)
    expect(firstMovable.getPosition).toHaveBeenCalledTimes(staleGetPositionCount)

    nextObserver!.emit(700)
    expect(nextMovable.setPosition.mock.calls.length).toBeGreaterThan(0)
  })
})
