import { act, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'

import {
  ButtonGroupSetting,
  ColorOptionSetting,
  ColorPickerSetting,
  DropdownSetting,
  InputListSetting,
  InputSetting,
  InputUrlSetting,
  MediaUploadSetting,
  MultiSelectDropdownSetting,
  SettingsPanel,
  SliderSetting,
  ToggleSetting,
} from '@/components/ui/SettingsPanel'

import type { CardConfig } from '../../../src/context/InklingHostIntegrationContext'

const mocks = vi.hoisted(() => ({
  contextValue: { cardConfig: {} as CardConfig },
}))

// Mock the host-integration context used by InputUrlSetting
vi.mock('../../../src/context/InklingHostIntegrationContext', async () => {
  const React = await import('react')
  return { default: React.createContext(mocks.contextValue) }
})

describe('SettingsPanel', function () {
  it('renders children in the default (non-tab) layout', function () {
    render(
      <SettingsPanel>
        <div data-testid="child-content">Hello settings</div>
      </SettingsPanel>,
    )

    expect(screen.getByTestId('settings-panel')).toBeInTheDocument()
    expect(screen.getByTestId('child-content')).toHaveTextContent('Hello settings')
  })

  it('applies a dark mode class when requested', function () {
    render(
      <SettingsPanel darkMode>
        <div>content</div>
      </SettingsPanel>,
    )

    expect(screen.getByTestId('settings-panel').parentElement).toHaveClass('dark')
  })

  it('renders tabs from a record of children', function () {
    render(
      <SettingsPanel tabs defaultTab="general">
        {{
          general: <div data-testid="general-tab">General</div>,
          advanced: <div data-testid="advanced-tab">Advanced</div>,
        }}
      </SettingsPanel>,
    )

    expect(screen.getByTestId('tab-general')).toHaveTextContent('General')
    expect(screen.getByTestId('tab-advanced')).toHaveTextContent('Advanced')
  })

  describe('setting helpers', function () {
    it('renders ToggleSetting', function () {
      render(<ToggleSetting isChecked={false} label="Enable feature" onChange={() => {}} />)
      expect(screen.getByText('Enable feature')).toBeInTheDocument()
    })

    it('renders SliderSetting with the current value', function () {
      render(<SliderSetting dataTestId="volume" label="Volume" max={100} min={0} value={42} onChange={() => {}} />)
      expect(screen.getByTestId('volume-value')).toHaveTextContent('42')
    })

    it('renders InputSetting', function () {
      render(<InputSetting label="Name" value="Inkling" onChange={() => {}} />)
      expect(screen.getByDisplayValue('Inkling')).toBeInTheDocument()
    })

    it('renders DropdownSetting', function () {
      render(
        <DropdownSetting label="Size" menu={[{ label: 'Small', name: 'small' }]} value="small" onChange={() => {}} />,
      )
      expect(screen.getByText('Size')).toBeInTheDocument()
    })

    it('renders ButtonGroupSetting', function () {
      render(<ButtonGroupSetting buttons={[{ name: 'left' }]} label="Alignment" onClick={() => {}} />)
      expect(screen.getByText('Alignment')).toBeInTheDocument()
    })

    it('renders ColorOptionSetting', function () {
      render(<ColorOptionSetting buttons={[{ name: 'red', color: '#f00' }]} label="Color" onClick={() => {}} />)
      expect(screen.getByText('Color')).toBeInTheDocument()
    })

    it('renders ColorPickerSetting', function () {
      render(<ColorPickerSetting label="Picker" value="#000000" />)
      expect(screen.getByText('Picker')).toBeInTheDocument()
    })

    it('renders InputListSetting', function () {
      render(
        <InputListSetting
          label="URL"
          listOptions={[{ value: 'https://example.com', label: 'Example' }]}
          placeholder="https://..."
          value=""
          onChange={() => {}}
        />,
      )
      expect(screen.getByText('URL')).toBeInTheDocument()
    })

    it('renders MultiSelectDropdownSetting', function () {
      render(<MultiSelectDropdownSetting availableItems={['a', 'b']} items={['a']} label="Tags" onChange={() => {}} />)
      expect(screen.getByText('Tags')).toBeInTheDocument()
    })

    it('renders MediaUploadSetting', function () {
      render(<MediaUploadSetting label="Cover" onFileChange={() => {}} onRemoveMedia={() => {}} />)
      expect(screen.getByText('Cover')).toBeInTheDocument()
      expect(screen.getByTestId('media-upload-setting')).toBeInTheDocument()
    })
  })

  describe('InputUrlSetting', function () {
    it('shows autocomplete suggestions once links resolve', async function () {
      const fetchAutocompleteLinks = vi.fn(async () => [{ value: 'https://example.com', label: 'Example' }])
      mocks.contextValue.cardConfig = { fetchAutocompleteLinks }

      render(<InputUrlSetting dataTestId="url" label="URL" value="" onChange={() => {}} />)

      fireEvent.focus(screen.getByRole('textbox'))

      expect(await screen.findByTestId('url-listOption-Example')).toBeInTheDocument()
    })

    it('ignores autocomplete results that resolve after unmount', async function () {
      let resolveLinks!: (links: { value: string; label: string }[]) => void
      const fetchAutocompleteLinks = vi.fn(
        () =>
          new Promise<{ value: string; label: string }[]>((resolve) => {
            resolveLinks = resolve
          }),
      )
      mocks.contextValue.cardConfig = { fetchAutocompleteLinks }

      const { unmount } = render(<InputUrlSetting dataTestId="url" label="URL" value="" onChange={() => {}} />)

      expect(fetchAutocompleteLinks).toHaveBeenCalled()

      unmount()
      resolveLinks([{ value: 'https://example.com', label: 'Example' }])
      // the late resolution must not trigger a state update on the unmounted
      // component — act() flushes the microtask without errors or warnings
      await act(async () => {})
    })
  })
})
