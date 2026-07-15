import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'

import type { ListOptionItem } from '@/hooks/useSearchLinks'

import { KeyboardSelection } from '@/components/ui/KeyboardSelection'
import { KeyboardSelectionWithGroups } from '@/components/ui/KeyboardSelectionWithGroups'

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

describe('KeyboardSelectionWithGroups', () => {
  it('lets Enter fall through when there is no selectable item', () => {
    const onKeyDown = vi.fn()
    const onSelect = vi.fn()

    render(
      <div onKeyDown={onKeyDown}>
        <input aria-label="URL" />
        <KeyboardSelectionWithGroups
          getGroup={() => null}
          getItem={() => null}
          groups={[{ label: 'Results', items: [] }]}
          onSelect={onSelect}
        />
      </div>,
    )

    fireEvent.keyDown(screen.getByRole('textbox', { name: 'URL' }), { key: 'Enter' })

    expect(onSelect).not.toHaveBeenCalled()
    expect(onKeyDown).toHaveBeenCalledOnce()
    expect(onKeyDown.mock.calls[0][0].defaultPrevented).toBe(false)
  })

  it('consumes Enter and calls onEnterWithoutSelection when provided and no item is selectable', () => {
    const onKeyDown = vi.fn()
    const onEnterWithoutSelection = vi.fn()
    const onSelect = vi.fn()

    render(
      <div onKeyDown={onKeyDown}>
        <input aria-label="At-link" />
        <KeyboardSelectionWithGroups
          getGroup={() => null}
          getItem={() => null}
          groups={[{ label: 'No results found', items: [] }]}
          onEnterWithoutSelection={onEnterWithoutSelection}
          onSelect={onSelect}
        />
      </div>,
    )

    fireEvent.keyDown(screen.getByRole('textbox', { name: 'At-link' }), { key: 'Enter' })

    expect(onEnterWithoutSelection).toHaveBeenCalledOnce()
    expect(onSelect).not.toHaveBeenCalled()
    expect(onKeyDown).not.toHaveBeenCalled()
  })

  it('consumes Enter and selects the item when one exists', () => {
    const onSelect = vi.fn()
    const item = { label: 'Enter URL to create link', value: null } as ListOptionItem

    render(
      <div>
        <input aria-label="URL" />
        <KeyboardSelectionWithGroups
          getGroup={() => null}
          getItem={() => null}
          groups={[{ label: 'Results', items: [item] }]}
          onSelect={onSelect}
        />
      </div>,
    )

    fireEvent.keyDown(screen.getByRole('textbox', { name: 'URL' }), { key: 'Enter' })

    expect(onSelect).toHaveBeenCalledWith(item)
  })

  it('still lets Enter fall through a flagged link input before any navigation (inkling behavior)', () => {
    const onKeyDown = vi.fn()
    const onSelect = vi.fn()
    const item = { label: 'Example', value: 'https://example.com' } as ListOptionItem

    render(
      <div onKeyDown={onKeyDown}>
        <input aria-label="URL" data-inkling-link-input="" />
        <KeyboardSelectionWithGroups
          getGroup={() => null}
          getItem={() => null}
          groups={[{ label: 'Results', items: [item] }]}
          onSelect={onSelect}
        />
      </div>,
    )

    fireEvent.keyDown(screen.getByRole('textbox', { name: 'URL' }), { key: 'Enter' })

    expect(onSelect).not.toHaveBeenCalled()
    expect(onKeyDown).toHaveBeenCalledOnce()
  })
})
