import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'

import { KeyboardSelection } from '@/components/ui/KeyboardSelection'

describe('KeyboardSelection', () => {
  it('lets Enter fall through when there is no selectable item', () => {
    const onKeyDown = vi.fn()
    const onSelect = vi.fn()

    render(
      <div onKeyDown={onKeyDown}>
        <input aria-label="URL" />
        <KeyboardSelection getItem={() => null} items={[]} onSelect={onSelect} />
      </div>,
    )

    fireEvent.keyDown(screen.getByRole('textbox', { name: 'URL' }), { key: 'Enter' })

    expect(onSelect).not.toHaveBeenCalled()
    expect(onKeyDown).toHaveBeenCalledOnce()
    expect(onKeyDown.mock.calls[0][0].defaultPrevented).toBe(false)
  })

  it('selects the current item on Enter when one exists', () => {
    const onSelect = vi.fn()
    const item = { value: 'https://example.com', label: 'Example' }

    render(
      <div>
        <input aria-label="URL" />
        <KeyboardSelection getItem={() => null} items={[item]} onSelect={onSelect} />
      </div>,
    )

    fireEvent.keyDown(screen.getByRole('textbox', { name: 'URL' }), { key: 'Enter' })

    expect(onSelect).toHaveBeenCalledWith(item)
  })
})
