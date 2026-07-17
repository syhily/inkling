import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import GifSelector, { type GifSelectorProps } from '@/components/ui/GifSelector'
import { ERROR_TYPE, type GifData } from '@/utils/services/gif'

function createGif(index: number, overrides: Partial<GifData> = {}): GifData {
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
  const defaultProps: GifSelectorProps = {
    onGifInsert: vi.fn(),
    onClickOutside: vi.fn(),
    updateSearch: vi.fn(),
    columns: [],
    isLoading: false,
    isLazyLoading: false,
    error: null,
    changeColumnCount: vi.fn(),
    loadNextPage: vi.fn(),
    gifs: [],
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

  it('renders every result as a semantic button with accessible name', () => {
    const gif0 = createGif(0)
    const gif1 = createGif(1)
    render(<GifSelector {...defaultProps} gifs={[gif0, gif1]} columns={[[gif0], [gif1]]} />)

    expect(screen.getByRole('button', { name: 'Gif 0' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gif 1' })).toBeInTheDocument()
  })

  it('result buttons have type button', () => {
    const gif0 = createGif(0)
    render(<GifSelector {...defaultProps} gifs={[gif0]} columns={[[gif0]]} />)

    const button = screen.getByRole('button', { name: 'Gif 0' })
    expect(button).toHaveAttribute('type', 'button')
  })

  it('does not render a button for a gif without usable media', () => {
    const gif0 = createGif(0)
    const broken = createGif(1, { media_formats: {} })
    render(<GifSelector {...defaultProps} gifs={[gif0, broken]} columns={[[gif0], [broken]]} />)

    expect(screen.getByRole('button', { name: 'Gif 0' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Gif 1' })).not.toBeInTheDocument()
  })

  it('skips invalid gifs when navigating with ArrowDown', async () => {
    const gif0 = createGif(0)
    const broken = createGif(1, { columnIndex: 0, columnRowIndex: 1, media_formats: {} })
    const gif2 = createGif(2, { columnIndex: 0, columnRowIndex: 2 })
    render(<GifSelector {...defaultProps} gifs={[gif0, broken, gif2]} columns={[[gif0, broken, gif2]]} />)

    const input = screen.getByPlaceholderText('Search Tenor for GIFs')
    await userEvent.click(input)
    await userEvent.keyboard('{ArrowDown}{ArrowDown}')

    const button = screen.getByRole('button', { name: 'Gif 2' })
    expect(button).toHaveFocus()
    expect(button).toHaveClass('border-green')
  })

  it('calls onGifInsert when gif is clicked', async () => {
    const gif = createGif(0)
    render(<GifSelector {...defaultProps} gifs={[gif]} columns={[[gif]]} />)

    await userEvent.click(screen.getByRole('button', { name: 'Gif 0' }))
    expect(defaultProps.onGifInsert).toHaveBeenCalledTimes(1)
    expect(defaultProps.onGifInsert).toHaveBeenCalledWith({
      src: 'https://example.com/gif-0.gif',
      width: 100,
      height: 100,
    })
  })

  it('does not call onGifInsert for gif without url', async () => {
    const gif = createGif(0, { media_formats: { gif: { url: undefined, dims: [100, 100] } } })
    render(<GifSelector {...defaultProps} gifs={[gif]} columns={[[gif]]} />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(defaultProps.onGifInsert).not.toHaveBeenCalled()
  })

  it('focuses and highlights the first gif on ArrowDown from search', async () => {
    const gif0 = createGif(0)
    const gif1 = createGif(1)
    render(<GifSelector {...defaultProps} gifs={[gif0, gif1]} columns={[[gif0], [gif1]]} />)

    const input = screen.getByPlaceholderText('Search Tenor for GIFs')
    await userEvent.click(input)
    await userEvent.keyboard('{ArrowDown}')

    const button = screen.getByRole('button', { name: 'Gif 0' })
    expect(button).toHaveFocus()
    expect(button).toHaveClass('border-green')
  })

  it('focuses and highlights the first gif on Tab from search', async () => {
    const gif0 = createGif(0)
    render(<GifSelector {...defaultProps} gifs={[gif0]} columns={[[gif0]]} />)

    const input = screen.getByPlaceholderText('Search Tenor for GIFs')
    await userEvent.click(input)
    await userEvent.keyboard('{Tab}')

    expect(screen.getByRole('button', { name: 'Gif 0' })).toHaveFocus()
  })

  it('moves highlight and focus down with ArrowDown', async () => {
    const gif0 = createGif(0)
    const gif1 = createGif(1, { columnIndex: 0, columnRowIndex: 1 })
    render(<GifSelector {...defaultProps} gifs={[gif0, gif1]} columns={[[gif0, gif1]]} />)

    const input = screen.getByPlaceholderText('Search Tenor for GIFs')
    await userEvent.click(input)
    await userEvent.keyboard('{ArrowDown}{ArrowDown}')

    const button = screen.getByRole('button', { name: 'Gif 1' })
    expect(button).toHaveFocus()
    expect(button).toHaveClass('border-green')
  })

  it('moves highlight and focus up with ArrowUp', async () => {
    const gif0 = createGif(0)
    const gif1 = createGif(1, { columnIndex: 0, columnRowIndex: 1 })
    render(<GifSelector {...defaultProps} gifs={[gif0, gif1]} columns={[[gif0, gif1]]} />)

    const input = screen.getByPlaceholderText('Search Tenor for GIFs')
    await userEvent.click(input)
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowUp}')

    const button = screen.getByRole('button', { name: 'Gif 0' })
    expect(button).toHaveFocus()
    expect(button).toHaveClass('border-green')
  })

  it('focuses search when arrow up on first gif', async () => {
    const gif0 = createGif(0)
    render(<GifSelector {...defaultProps} gifs={[gif0]} columns={[[gif0]]} />)

    const input = screen.getByPlaceholderText('Search Tenor for GIFs')
    await userEvent.click(input)
    await userEvent.keyboard('{ArrowDown}{ArrowUp}')

    expect(input).toHaveFocus()
  })

  it('moves highlight and focus horizontally without error', async () => {
    const gif0 = createGif(0)
    const gif1 = createGif(1, { columnIndex: 1, columnRowIndex: 0 })
    render(<GifSelector {...defaultProps} gifs={[gif0, gif1]} columns={[[gif0], [gif1]]} />)

    const input = screen.getByPlaceholderText('Search Tenor for GIFs')
    await userEvent.click(input)
    await userEvent.keyboard('{ArrowDown}')

    const button = screen.getByRole('button', { name: 'Gif 1' })
    document.elementFromPoint = () => button as unknown as Element
    await userEvent.keyboard('{ArrowRight}')

    expect(button).toHaveFocus()
    expect(button).toHaveClass('border-green')
  })

  it('selects highlighted gif with Enter on focused button', async () => {
    const gif0 = createGif(0)
    render(<GifSelector {...defaultProps} gifs={[gif0]} columns={[[gif0]]} />)

    const input = screen.getByPlaceholderText('Search Tenor for GIFs')
    await userEvent.click(input)
    await userEvent.keyboard('{ArrowDown}{Enter}')

    expect(defaultProps.onGifInsert).toHaveBeenCalledTimes(1)
    expect(defaultProps.onGifInsert).toHaveBeenCalledWith({
      src: 'https://example.com/gif-0.gif',
      width: 100,
      height: 100,
    })
  })

  it('selects highlighted gif with Space on focused button', async () => {
    const gif0 = createGif(0)
    render(<GifSelector {...defaultProps} gifs={[gif0]} columns={[[gif0]]} />)

    const input = screen.getByPlaceholderText('Search Tenor for GIFs')
    await userEvent.click(input)
    await userEvent.keyboard('{ArrowDown} ')

    expect(defaultProps.onGifInsert).toHaveBeenCalledTimes(1)
    expect(defaultProps.onGifInsert).toHaveBeenCalledWith({
      src: 'https://example.com/gif-0.gif',
      width: 100,
      height: 100,
    })
  })

  it('does not select or prevent default when Enter is pressed outside selector', () => {
    const gif0 = createGif(0)
    render(
      <>
        <input data-testid="outside-input" type="text" />
        <GifSelector {...defaultProps} gifs={[gif0]} columns={[[gif0]]} />
      </>,
    )

    const outsideInput = screen.getByTestId('outside-input')
    outsideInput.focus()
    const event = fireEvent.keyDown(outsideInput, { key: 'Enter' })

    expect(event).toBe(true)
    expect(defaultProps.onGifInsert).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Gif 0' })).not.toHaveClass('border-green')
  })

  it('does not change highlight or prevent default when arrow keys pressed outside selector', () => {
    const gif0 = createGif(0)
    render(
      <>
        <input data-testid="outside-input" type="text" />
        <GifSelector {...defaultProps} gifs={[gif0]} columns={[[gif0]]} />
      </>,
    )

    const outsideInput = screen.getByTestId('outside-input')
    outsideInput.focus()

    const downEvent = fireEvent.keyDown(outsideInput, { key: 'ArrowDown' })
    expect(downEvent).toBe(true)

    const rightEvent = fireEvent.keyDown(outsideInput, { key: 'ArrowRight' })
    expect(rightEvent).toBe(true)

    expect(defaultProps.onGifInsert).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Gif 0' })).not.toHaveClass('border-green')
  })

  it('does nothing when arrow keys pressed without highlighted gif', async () => {
    render(<GifSelector {...defaultProps} />)

    const input = screen.getByPlaceholderText('Search Tenor for GIFs')
    await userEvent.click(input)
    await userEvent.keyboard('{ArrowLeft}{ArrowRight}{ArrowUp}{ArrowDown}')

    expect(screen.getByTestId('gif-selector')).toBeInTheDocument()
    expect(input).toHaveFocus()
  })

  it('handles shift+tab navigation', async () => {
    const gif0 = createGif(0)
    const gif1 = createGif(1)
    render(<GifSelector {...defaultProps} gifs={[gif0, gif1]} columns={[[gif0], [gif1]]} />)

    const input = screen.getByPlaceholderText('Search Tenor for GIFs')
    await userEvent.click(input)
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Shift>}{Tab}{/Shift}')

    expect(input).toHaveFocus()
  })

  it('removes all selector keyboard handling on unmount', () => {
    const gif0 = createGif(0)
    const { unmount } = render(<GifSelector {...defaultProps} gifs={[gif0]} columns={[[gif0]]} />)

    unmount()

    const event = fireEvent.keyDown(document, { key: 'Enter' })
    expect(event).toBe(true)
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
})
