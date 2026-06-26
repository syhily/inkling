import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import GifSelector from '@/components/ui/GifSelector'
import { ERROR_TYPE } from '@/utils/services/gif'

function createGif(index: number, overrides: Record<string, unknown> = {}) {
  return {
    id: `gif-${index}`,
    index,
    columnIndex: index % 2,
    columnRowIndex: Math.floor(index / 2),
    media_formats: {
      gif: {
        url: `https://example.com/gif-${index}.gif`,
        dims: [100, 100] as [number, number],
      },
    },
    title: `Gif ${index}`,
    ...overrides,
  }
}

describe('GifSelector', () => {
  const defaultProps = {
    onGifInsert: vi.fn(),
    onClickOutside: vi.fn(),
    updateSearch: vi.fn(),
    columns: [] as unknown[],
    isLoading: false,
    isLazyLoading: false,
    error: null as string | null,
    changeColumnCount: vi.fn(),
    loadNextPage: vi.fn(),
    gifs: [] as unknown[],
    provider: 'tenor',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls updateSearch on mount', () => {
    render(<GifSelector {...defaultProps} />)
    expect(defaultProps.updateSearch).toHaveBeenCalledTimes(1)
  })

  it('renders search input with provider placeholder', () => {
    render(<GifSelector {...defaultProps} provider="klipy" />)
    expect(screen.getByPlaceholderText('Search KLIPY')).toBeInTheDocument()
  })

  it('renders loading state', () => {
    render(<GifSelector {...defaultProps} isLoading={true} />)
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('renders lazy loading state', () => {
    render(<GifSelector {...defaultProps} isLoading={true} isLazyLoading={true} />)
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('renders error state', () => {
    render(<GifSelector {...defaultProps} error={ERROR_TYPE.COMMON} />)
    expect(
      screen.getByText('Uh-oh! Trouble reaching the GIF service, please check your connection'),
    ).toBeInTheDocument()
  })

  it('renders invalid api key error', () => {
    render(<GifSelector {...defaultProps} error={ERROR_TYPE.INVALID_API_KEY} />)
    expect(screen.getByText(/The GIF API key is not valid/)).toBeInTheDocument()
  })

  it('renders custom error message', () => {
    render(<GifSelector {...defaultProps} error="Something went wrong" />)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('handles search input change', () => {
    render(<GifSelector {...defaultProps} />)
    const input = screen.getByPlaceholderText('Search Tenor for GIFs')
    fireEvent.change(input, { target: { value: 'cats' } })
    expect(defaultProps.updateSearch).toHaveBeenLastCalledWith('cats')
  })

  it('calls onGifInsert when gif is clicked', () => {
    const gif = createGif(0)
    render(<GifSelector {...defaultProps} gifs={[gif]} columns={[[gif]]} />)

    fireEvent.click(screen.getByTestId('gif-item'))
    expect(defaultProps.onGifInsert).toHaveBeenCalledWith({
      src: 'https://example.com/gif-0.gif',
      width: 100,
      height: 100,
    })
  })

  it('does not call onGifInsert for gif without url', () => {
    const gif = createGif(0, { media_formats: { gif: { url: undefined, dims: [100, 100] } } })
    render(<GifSelector {...defaultProps} gifs={[gif]} columns={[[gif]]} />)

    fireEvent.click(screen.getByTestId('gif-item'))
    expect(defaultProps.onGifInsert).not.toHaveBeenCalled()
  })

  function setScrollProps(element: HTMLDivElement, scrollTop: number, clientHeight: number, scrollHeight: number) {
    element.scrollTop = scrollTop
    Object.defineProperty(element, 'clientHeight', { value: clientHeight, configurable: true })
    Object.defineProperty(element, 'scrollHeight', { value: scrollHeight, configurable: true })
  }

  it('handles scroll near bottom', () => {
    render(<GifSelector {...defaultProps} />)
    const scrollContainer = document.querySelector('[data-testid="gif-selector"] .overflow-auto') as HTMLDivElement
    setScrollProps(scrollContainer, 1000, 500, 1500)
    fireEvent.scroll(scrollContainer)
    expect(defaultProps.loadNextPage).toHaveBeenCalledTimes(1)
  })

  it('does not load next page when not scrolled near bottom', () => {
    render(<GifSelector {...defaultProps} />)
    const scrollContainer = document.querySelector('[data-testid="gif-selector"] .overflow-auto') as HTMLDivElement
    setScrollProps(scrollContainer, 100, 500, 2000)
    fireEvent.scroll(scrollContainer)
    expect(defaultProps.loadNextPage).not.toHaveBeenCalled()
  })

  it('calls onClickOutside when clicking outside', () => {
    render(
      <>
        <div data-testid="outside">Outside</div>
        <GifSelector {...defaultProps} />
      </>,
    )

    fireEvent.mouseDown(screen.getByTestId('outside'))
    expect(defaultProps.onClickOutside).toHaveBeenCalledTimes(1)
  })

  it('changes column count based on resize observer', () => {
    let callback: ResizeObserverCallback = () => {}
    globalThis.ResizeObserver = class MockResizeObserver {
      constructor(cb: ResizeObserverCallback) {
        callback = cb
      }
      observe = vi.fn()
      unobserve = vi.fn()
      disconnect = vi.fn()
    } as unknown as typeof ResizeObserver

    render(<GifSelector {...defaultProps} />)

    const entry = {
      contentBoxSize: [{ inlineSize: 400 }],
      target: document.createElement('div'),
    } as unknown as ResizeObserverEntry

    callback([entry], {} as ResizeObserver)
    expect(defaultProps.changeColumnCount).toHaveBeenCalledWith(2)

    const entry2 = {
      contentBoxSize: [{ inlineSize: 700 }],
      target: document.createElement('div'),
    } as unknown as ResizeObserverEntry

    callback([entry2], {} as ResizeObserver)
    expect(defaultProps.changeColumnCount).toHaveBeenCalledWith(3)

    const entry3 = {
      contentBoxSize: [{ inlineSize: 1000 }],
      target: document.createElement('div'),
    } as unknown as ResizeObserverEntry

    callback([entry3], {} as ResizeObserver)
    expect(defaultProps.changeColumnCount).toHaveBeenCalledWith(4)
  })

  it('handles keyboard navigation with arrow keys', () => {
    const gif0 = createGif(0)
    const gif1 = createGif(1)
    const gifs = [gif0, gif1]
    render(<GifSelector {...defaultProps} gifs={gifs} columns={[[gif0], [gif1]]} />)

    const input = screen.getByPlaceholderText('Search Tenor for GIFs')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(screen.getAllByTestId('gif-item')[0].className).toContain('border-green')
  })

  it('handles enter to select highlighted gif', () => {
    const gif0 = createGif(0)
    render(<GifSelector {...defaultProps} gifs={[gif0]} columns={[[gif0]]} />)

    const input = screen.getByPlaceholderText('Search Tenor for GIFs')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(document, { key: 'Enter' })

    expect(defaultProps.onGifInsert).toHaveBeenCalledWith({
      src: 'https://example.com/gif-0.gif',
      width: 100,
      height: 100,
    })
  })

  it('handles tab navigation', () => {
    const gif0 = createGif(0)
    render(<GifSelector {...defaultProps} gifs={[gif0]} columns={[[gif0]]} />)

    const input = screen.getByPlaceholderText('Search Tenor for GIFs')
    fireEvent.keyDown(input, { key: 'Tab' })
    expect(screen.getAllByTestId('gif-item')[0].className).toContain('border-green')
  })

  it('handles shift+tab navigation', () => {
    const gif0 = createGif(0)
    const gif1 = createGif(1)
    render(<GifSelector {...defaultProps} gifs={[gif0, gif1]} columns={[[gif0], [gif1]]} />)

    const input = screen.getByPlaceholderText('Search Tenor for GIFs')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(input).toHaveFocus()
  })

  it('handles escape key without error', () => {
    render(<GifSelector {...defaultProps} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    // No assertion needed, just ensures no error is thrown
    expect(screen.getByTestId('gif-selector')).toBeInTheDocument()
  })

  it('moves highlight down and up', () => {
    const gif0 = createGif(0)
    const gif1 = createGif(1, { columnIndex: 0, columnRowIndex: 1 })
    render(<GifSelector {...defaultProps} gifs={[gif0, gif1]} columns={[[gif0, gif1]]} />)

    const input = screen.getByPlaceholderText('Search Tenor for GIFs')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(document, { key: 'ArrowDown' })

    expect(screen.getAllByTestId('gif-item')[1].className).toContain('border-green')
  })

  it('moves highlight left and right without error', () => {
    const gif0 = createGif(0)
    const gif1 = createGif(1, { columnIndex: 1, columnRowIndex: 0 })
    render(<GifSelector {...defaultProps} gifs={[gif0, gif1]} columns={[[gif0], [gif1]]} />)

    const input = screen.getByPlaceholderText('Search Tenor for GIFs')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(document, { key: 'ArrowRight' })

    expect(screen.getByTestId('gif-selector')).toBeInTheDocument()
  })

  it('focuses search when arrow left on first gif', () => {
    const gif0 = createGif(0)
    render(<GifSelector {...defaultProps} gifs={[gif0]} columns={[[gif0]]} />)

    const input = screen.getByPlaceholderText('Search Tenor for GIFs')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(document, { key: 'ArrowLeft' })

    expect(input).toHaveFocus()
  })

  it('does nothing when arrow keys pressed without highlighted gif', () => {
    render(<GifSelector {...defaultProps} />)

    fireEvent.keyDown(document, { key: 'ArrowLeft' })
    fireEvent.keyDown(document, { key: 'ArrowRight' })
    fireEvent.keyDown(document, { key: 'ArrowUp' })
    fireEvent.keyDown(document, { key: 'ArrowDown' })

    expect(screen.getByTestId('gif-selector')).toBeInTheDocument()
  })
})
