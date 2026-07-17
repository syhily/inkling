import { fireEvent, render, screen } from '@testing-library/react'
import { createEditor, type LexicalEditor } from 'lexical'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CardActionToolbar, type CardToolbarItem } from '@/components/ui/CardActionToolbar'
import CardContext from '@/context/CardContext'
import InklingHostIntegrationContext from '@/context/InklingHostIntegrationContext'

vi.mock('@lexical/react/LexicalComposerContext', () => ({
  useLexicalComposerContext: vi.fn(),
}))

function createCardContext(overrides: Partial<React.ContextType<typeof CardContext>> = {}) {
  return {
    isSelected: true,
    isEditing: false,
    captionHasFocus: false,
    cardWidth: 'regular',
    nodeKey: 'card-1',
    setCardWidth: vi.fn(),
    setCaptionHasFocus: vi.fn(),
    setEditing: vi.fn(),
    ...overrides,
  }
}

function createComposerContext(cardConfig: Record<string, unknown> = {}) {
  return {
    fileUploader: {
      useFileUpload: () => ({
        isLoading: false,
        upload: vi.fn(() => Promise.resolve(undefined)),
        errors: [],
      }),
      fileTypes: {},
    },
    cardConfig,
    darkMode: false,
    enableMultiplayer: false,
    createWebsocketProvider: vi.fn(),
    onError: vi.fn(),
  }
}

function getToolbars(container: HTMLElement, card = 'test-card') {
  return container.querySelectorAll(`[data-inkling-card-toolbar="${card}"]`)
}

describe('CardActionToolbar', () => {
  let editor: LexicalEditor

  beforeEach(async () => {
    editor = createEditor({ namespace: 'test', onError: () => {} })
    const { useLexicalComposerContext } = await import('@lexical/react/LexicalComposerContext')
    useLexicalComposerContext.mockReturnValue([editor])
  })

  function renderToolbar({
    cardValue = createCardContext(),
    cardConfig = {},
    props = {},
  }: {
    cardValue?: ReturnType<typeof createCardContext>
    cardConfig?: Record<string, unknown>
    props?: Partial<Parameters<typeof CardActionToolbar>[0]>
  } = {}) {
    const composerValue = createComposerContext(cardConfig)
    return render(
      <InklingHostIntegrationContext.Provider value={composerValue}>
        <CardContext.Provider value={cardValue}>
          <CardActionToolbar card="test-card" nodeKey="card-1" {...props} />
        </CardContext.Provider>
      </InklingHostIntegrationContext.Provider>,
    )
  }

  describe('visibility', () => {
    it('renders the menu toolbar with the card attribute when selected', () => {
      const { container } = renderToolbar()

      const toolbars = getToolbars(container)
      expect(toolbars).toHaveLength(1)
      expect(toolbars[0].querySelector('ul')).toBeTruthy()
    })

    it('hides the menu toolbar when the card is not selected', () => {
      const { container } = renderToolbar({ cardValue: createCardContext({ isSelected: false }) })

      expect(getToolbars(container)).toHaveLength(0)
    })

    it('hides the menu toolbar while editing by default', () => {
      const { container } = renderToolbar({ cardValue: createCardContext({ isEditing: true }) })

      expect(getToolbars(container)).toHaveLength(0)
    })

    it('keeps the menu toolbar while editing when hideWhileEditing is false', () => {
      const { container } = renderToolbar({
        cardValue: createCardContext({ isEditing: true }),
        props: { hideWhileEditing: false },
      })

      expect(getToolbars(container)).toHaveLength(1)
    })

    it('hides the menu toolbar when visibleWhen is false', () => {
      const { container } = renderToolbar({ props: { visibleWhen: false } })

      expect(getToolbars(container)).toHaveLength(0)
    })
  })

  describe('default items', () => {
    it('renders edit, separator, and snippet items', () => {
      const { container } = renderToolbar({ cardConfig: { createSnippet: vi.fn() } })

      const toolbar = getToolbars(container)[0]
      expect(toolbar.querySelectorAll('li')).toHaveLength(3)
      const labels = Array.from(toolbar.querySelectorAll('button')).map((button) => button.getAttribute('aria-label'))
      expect(labels).toEqual(['Edit', 'Save as snippet'])
      expect(screen.getByTestId('create-snippet')).toBeTruthy()
    })

    it('hides the snippet item and the default separator without createSnippet', () => {
      const { container } = renderToolbar()

      const toolbar = getToolbars(container)[0]
      expect(toolbar.querySelectorAll('li')).toHaveLength(1)
      expect(screen.queryByTestId('create-snippet')).toBeNull()
    })

    it('passes the edit item dataTestId through', () => {
      renderToolbar({ props: { items: [{ kind: 'edit', dataTestId: 'edit-test-card' }] } })

      expect(screen.getByTestId('edit-test-card')).toBeTruthy()
    })

    it('enters edit mode through the card context when the edit item is clicked', () => {
      const setEditing = vi.fn()
      renderToolbar({ cardValue: createCardContext({ setEditing }) })

      fireEvent.click(screen.getByRole('button', { name: 'Edit' }))

      expect(setEditing).toHaveBeenCalledWith(true)
    })
  })

  describe('snippet flow', () => {
    it('swaps the menu toolbar for the snippet input and back', () => {
      const { container } = renderToolbar({ cardConfig: { createSnippet: vi.fn() } })

      fireEvent.click(screen.getByTestId('create-snippet'))

      let toolbars = getToolbars(container)
      expect(toolbars).toHaveLength(1)
      expect(toolbars[0].querySelector('ul')).toBeNull()
      expect(toolbars[0].querySelector('[data-testid="snippet-name"]')).toBeTruthy()

      // closing the input returns to the menu toolbar
      fireEvent.keyDown(screen.getByTestId('snippet-name'), { key: 'Escape' })

      toolbars = getToolbars(container)
      expect(toolbars).toHaveLength(1)
      expect(toolbars[0].querySelector('ul')).toBeTruthy()
    })
  })

  describe('custom items', () => {
    const addItem: CardToolbarItem = {
      kind: 'custom',
      icon: 'add',
      label: 'Add images',
      dataTestId: 'add-gallery-image',
      onClick: vi.fn(),
    }

    it('renders custom items with their handlers and active state', () => {
      const onClick = vi.fn()
      const { container } = renderToolbar({
        props: {
          items: [
            { kind: 'custom', icon: 'imgWide', label: 'Wide width', isActive: true, onClick },
            { kind: 'separator', hide: false },
            { kind: 'snippet' },
          ],
        },
        cardConfig: { createSnippet: vi.fn() },
      })

      const toolbar = getToolbars(container)[0]
      expect(toolbar.querySelectorAll('li')).toHaveLength(3)

      const wide = screen.getByRole('button', { name: 'Wide width' })
      expect(wide.getAttribute('data-inkling-active')).toBe('true')

      fireEvent.click(wide)
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('hides custom items flagged hide', () => {
      const { container } = renderToolbar({
        props: { items: [{ ...addItem, hide: true }, { kind: 'snippet' }] },
      })

      const toolbar = getToolbars(container)[0]
      expect(screen.queryByTestId('add-gallery-image')).toBeNull()
      expect(toolbar.querySelectorAll('li')).toHaveLength(0)
    })

    it('honors an explicit separator hide over the createSnippet gate', () => {
      const { container } = renderToolbar({
        props: { items: [{ kind: 'custom', ...addItem }, { kind: 'separator', hide: false }, { kind: 'snippet' }] },
      })

      // no createSnippet configured, but the explicit separator stays
      const toolbar = getToolbars(container)[0]
      expect(toolbar.querySelectorAll('li')).toHaveLength(2)
    })
  })

  describe('beforeMenu', () => {
    it('renders extra content inside the menu toolbar before the menu', () => {
      const { container } = renderToolbar({
        props: { beforeMenu: <form data-testid="upload-form" /> },
      })

      const toolbar = getToolbars(container)[0]
      expect(toolbar.firstElementChild?.tagName).toBe('FORM')
      expect(screen.getByTestId('upload-form')).toBeTruthy()
    })
  })
})
