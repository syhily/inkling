import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ColorIndicator, ColorPicker } from '@/components/ui/ColorPicker'

vi.mock('../../../../src/hooks/useClickOutside', () => ({
  useClickOutside: vi.fn(),
}))

describe('ColorPicker', () => {
  const onChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders color picker and input', () => {
    render(<ColorPicker value="#ff0000" onChange={onChange} />)

    expect(document.querySelector('.react-colorful')).toBeInTheDocument()
    expect(screen.getByLabelText('Color value')).toBeInTheDocument()
  })

  it('calls onChange when hex input changes', () => {
    render(<ColorPicker value="#ff0000" onChange={onChange} />)

    const input = screen.getByLabelText('Color value') as HTMLInputElement
    fireEvent.change(input, { target: { value: '00ff00' } })

    expect(onChange).toHaveBeenCalledWith('#00ff00')
  })

  it('renders eyedropper button when enabled and EyeDropper is available', async () => {
    const eyeDropperMock = vi.fn().mockResolvedValue({ sRGBHex: '#123456' })
    ;(window as unknown as { EyeDropper: new () => { open: typeof eyeDropperMock } }).EyeDropper = class {
      open = eyeDropperMock
    }

    render(<ColorPicker value="#ff0000" eyedropper={true} onChange={onChange} />)

    const button = document.querySelector('button[type="button"]')
    expect(button).toBeInTheDocument()

    fireEvent.click(button!)
    await vi.waitFor(() => expect(onChange).toHaveBeenCalledWith('#123456'))
  })

  it('handles EyeDropper cancellation gracefully', async () => {
    const eyeDropperMock = vi.fn().mockRejectedValue(new Error('canceled'))
    ;(window as unknown as { EyeDropper: new () => { open: typeof eyeDropperMock } }).EyeDropper = class {
      open = eyeDropperMock
    }

    render(<ColorPicker value="#ff0000" eyedropper={true} onChange={onChange} />)

    const button = document.querySelector('button[type="button"]')
    fireEvent.click(button!)

    await vi.waitFor(() => expect(eyeDropperMock).toHaveBeenCalled())
    expect(onChange).not.toHaveBeenCalled()
  })

  it('renders transparent option', () => {
    render(<ColorPicker value="#ff0000" hasTransparentOption={true} onChange={onChange} />)

    expect(screen.getByText('Clear')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Clear'))
    expect(onChange).toHaveBeenCalledWith('transparent')
  })

  it('focuses hex input on mount', () => {
    render(<ColorPicker value="#ff0000" onChange={onChange} />)

    const input = screen.getByLabelText('Color value')
    expect(document.activeElement).toBe(input)
  })

  it('does not render eyedropper button when EyeDropper is unavailable', () => {
    ;(window as unknown as { EyeDropper?: unknown }).EyeDropper = undefined

    render(<ColorPicker value="#ff0000" eyedropper={true} onChange={onChange} />)

    const button = document.querySelector('button[type="button"]')
    expect(button).not.toBeInTheDocument()
  })

  it('handles accent color value', () => {
    render(<ColorPicker value="accent" onChange={onChange} />)
    expect(document.querySelector('.react-colorful')).toBeInTheDocument()
  })

  it('handles transparent color value', () => {
    render(<ColorPicker value="transparent" onChange={onChange} />)
    expect(document.querySelector('.react-colorful')).toBeInTheDocument()
  })

  it('handles mouse down and mouse up on color picker', () => {
    render(<ColorPicker value="#ff0000" onChange={onChange} />)

    const picker = document.querySelector('.react-colorful') as HTMLElement
    fireEvent.mouseDown(picker)
    fireEvent.mouseUp(picker)

    expect(document.querySelector('.react-colorful')).toBeInTheDocument()
  })

  it('handles touch start and touch end on color picker', () => {
    render(<ColorPicker value="#ff0000" onChange={onChange} />)

    const picker = document.querySelector('.react-colorful') as HTMLElement
    fireEvent.touchStart(picker)
    fireEvent.touchEnd(picker)

    expect(document.querySelector('.react-colorful')).toBeInTheDocument()
  })
})

describe('ColorIndicator', () => {
  const onSwatchChange = vi.fn()
  const onTogglePicker = vi.fn()
  const onChange = vi.fn()

  const swatches = [
    { title: 'Red', hex: '#ff0000' },
    { title: 'Accent', accent: true },
    { title: 'Transparent', transparent: true },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders color selector button', () => {
    render(
      <ColorIndicator
        value="#ff0000"
        swatches={swatches}
        onSwatchChange={onSwatchChange}
        onTogglePicker={onTogglePicker}
        onChange={onChange}
      />,
    )

    expect(screen.getByTestId('color-selector-button')).toBeInTheDocument()
  })

  it('opens popover on click', () => {
    render(
      <ColorIndicator
        value="#ff0000"
        swatches={swatches}
        onSwatchChange={onSwatchChange}
        onTogglePicker={onTogglePicker}
        onChange={onChange}
      />,
    )

    fireEvent.click(screen.getByTestId('color-selector-button').querySelector('button')!)
    expect(screen.getByTestId('color-picker-toggle')).toBeInTheDocument()
  })

  it('renders expanded picker', () => {
    render(
      <ColorIndicator
        value="#ff0000"
        swatches={swatches}
        isExpanded={true}
        onSwatchChange={onSwatchChange}
        onTogglePicker={onTogglePicker}
        onChange={onChange}
      />,
    )

    fireEvent.click(screen.getByTestId('color-selector-button').querySelector('button')!)
    expect(document.querySelector('.react-colorful')).toBeInTheDocument()
  })

  it('calls onSwatchChange when swatch is selected', () => {
    render(
      <ColorIndicator
        value="#ff0000"
        swatches={swatches}
        onSwatchChange={onSwatchChange}
        onTogglePicker={onTogglePicker}
        onChange={onChange}
      />,
    )

    fireEvent.click(screen.getByTestId('color-selector-button').querySelector('button')!)
    const swatch = screen.getByTitle('Red')
    fireEvent.click(swatch)

    expect(onSwatchChange).toHaveBeenCalledWith('#ff0000')
  })

  it('handles accent swatch selection', () => {
    render(
      <ColorIndicator
        value="#ff0000"
        swatches={swatches}
        onSwatchChange={onSwatchChange}
        onTogglePicker={onTogglePicker}
        onChange={onChange}
      />,
    )

    fireEvent.click(screen.getByTestId('color-selector-button').querySelector('button')!)
    const swatch = screen.getByTitle('Accent')
    fireEvent.click(swatch)

    expect(onSwatchChange).toHaveBeenCalledWith('accent')
  })

  it('handles transparent swatch selection', () => {
    render(
      <ColorIndicator
        value="#ff0000"
        swatches={swatches}
        onSwatchChange={onSwatchChange}
        onTogglePicker={onTogglePicker}
        onChange={onChange}
      />,
    )

    fireEvent.click(screen.getByTestId('color-selector-button').querySelector('button')!)
    const swatch = screen.getByTitle('Transparent')
    fireEvent.click(swatch)

    expect(onSwatchChange).toHaveBeenCalledWith('transparent')
  })
})
