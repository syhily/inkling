import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createEditor, type LexicalEditor } from 'lexical'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createCardSelectionStoreWrapper } from '#/utils/card-selection-store'
import { mockComposerContext } from '#/utils/composer-context'
import InklingHostIntegrationContext, {
  type CardConfig,
  type FileUploader,
  type InklingHostIntegrationContextValue,
} from '@/context/InklingHostIntegrationContext'
import { ImageNodeComponent } from '@/nodes/ImageNodeComponent'
import { getImageDimensions } from '@/utils/getImageDimensions'
import { openFileSelection } from '@/utils/openFileSelection'

vi.mock('@lexical/react/LexicalComposerContext', () => ({
  useLexicalComposerContext: vi.fn(),
}))

vi.mock('@/utils/openFileSelection', () => ({
  openFileSelection: vi.fn(),
}))

vi.mock('@/utils/getImageDimensions', () => ({
  getImageDimensions: vi.fn(),
}))

vi.mock('../../../src/components/ui/CardCaptionEditor', () => ({
  CardCaptionEditor: () => null,
}))

function createTestEditor(): LexicalEditor {
  return createEditor({ namespace: 'test', onError: () => {} })
}

function flushMacrotask(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
}

// the store equivalent of the old per-test CardContext factory: the card is
// selected (its toolbar renders) and not editing unless a test says otherwise
function createSelection({ selected = true, editing = false }: { selected?: boolean; editing?: boolean } = {}) {
  return createCardSelectionStoreWrapper({
    initialState: { selectedCardKey: selected ? 'img-1' : null, isEditingCard: editing },
  })
}

function createComposerContext(
  fileTypes: NonNullable<FileUploader['fileTypes']> = {},
  upload: ReturnType<FileUploader['useFileUpload']>['upload'] = vi.fn(() => Promise.resolve(undefined)),
  cardConfig: CardConfig = {},
): InklingHostIntegrationContextValue {
  return {
    fileUploader: {
      useFileUpload: () => ({
        isLoading: false,
        upload,
        progress: 0,
        errors: [],
      }),
      fileTypes,
    },
    cardConfig,
    onError: vi.fn(),
  }
}

describe('ImageNodeComponent', () => {
  let editor: LexicalEditor
  let createObjectURLSpy: ReturnType<typeof vi.spyOn>
  let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>

  beforeEach(async () => {
    vi.clearAllMocks()
    editor = createTestEditor()
    mockComposerContext(editor)
    vi.mocked(getImageDimensions).mockResolvedValue({ width: 100, height: 200 })
    createObjectURLSpy = vi.spyOn(globalThis.URL, 'createObjectURL').mockReturnValue('blob:image-preview')
    revokeObjectURLSpy = vi.spyOn(globalThis.URL, 'revokeObjectURL').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders with typed refs when fileTypes is empty', () => {
    const composerValue = createComposerContext({})
    const { wrapper: CardSelectionStoreProvider } = createSelection()
    render(
      <InklingHostIntegrationContext.Provider value={composerValue}>
        <CardSelectionStoreProvider>
          <ImageNodeComponent cardWidth="regular" nodeKey="img-1" src="/image.png" />
        </CardSelectionStoreProvider>
      </InklingHostIntegrationContext.Provider>,
    )

    expect(screen.getByTestId('image-card-populated')).toBeTruthy()
  })

  it('renders when image mimeTypes are provided', () => {
    const composerValue = createComposerContext({ image: { mimeTypes: ['image/png', 'image/jpeg'] } })
    const { wrapper: CardSelectionStoreProvider } = createSelection()
    render(
      <InklingHostIntegrationContext.Provider value={composerValue}>
        <CardSelectionStoreProvider>
          <ImageNodeComponent cardWidth="regular" nodeKey="img-1" src="/image.png" altText="Alt text" />
        </CardSelectionStoreProvider>
      </InklingHostIntegrationContext.Provider>,
    )

    expect(screen.getByTestId('image-card-populated')).toBeTruthy()
  })

  it('opens the file dialog once when triggerFileDialog is true', async () => {
    const composerValue = createComposerContext({ image: { mimeTypes: ['image/png'] } })
    const { wrapper: CardSelectionStoreProvider } = createSelection()
    render(
      <InklingHostIntegrationContext.Provider value={composerValue}>
        <CardSelectionStoreProvider>
          <ImageNodeComponent cardWidth="regular" nodeKey="img-1" src="/image.png" triggerFileDialog />
        </CardSelectionStoreProvider>
      </InklingHostIntegrationContext.Provider>,
    )

    await waitFor(() => expect(openFileSelection).toHaveBeenCalledTimes(1))
  })

  it('uploads the initial file when the card has no src', async () => {
    const upload = vi.fn(() => Promise.resolve(undefined))
    const composerValue = createComposerContext({ image: { mimeTypes: ['image/png'] } }, upload)
    const { wrapper: CardSelectionStoreProvider } = createSelection()
    const file = new File(['image'], 'photo.png', { type: 'image/png' })

    render(
      <InklingHostIntegrationContext.Provider value={composerValue}>
        <CardSelectionStoreProvider>
          <ImageNodeComponent cardWidth="regular" nodeKey="img-1" src="" initialFile={file} />
        </CardSelectionStoreProvider>
      </InklingHostIntegrationContext.Provider>,
    )

    await waitFor(() => expect(upload).toHaveBeenCalledWith([file]))

    // the preview object URL is leased, then released when the flow ends
    expect(createObjectURLSpy).toHaveBeenCalledExactlyOnceWith(file)
    expect(revokeObjectURLSpy).toHaveBeenCalledExactlyOnceWith('blob:image-preview')
  })

  it('does not upload the initial file when the card already has a src', async () => {
    const upload = vi.fn(() => Promise.resolve(undefined))
    const composerValue = createComposerContext({ image: { mimeTypes: ['image/png'] } }, upload)
    const { wrapper: CardSelectionStoreProvider } = createSelection()
    const file = new File(['image'], 'photo.png', { type: 'image/png' })

    render(
      <InklingHostIntegrationContext.Provider value={composerValue}>
        <CardSelectionStoreProvider>
          <ImageNodeComponent cardWidth="regular" nodeKey="img-1" src="/image.png" initialFile={file} />
        </CardSelectionStoreProvider>
      </InklingHostIntegrationContext.Provider>,
    )

    // the mount effect runs synchronously; give any async work a chance to fire
    await flushMacrotask()
    expect(upload).not.toHaveBeenCalled()
  })

  describe('action toolbar', () => {
    function renderWithToolbar(
      selection: { selected?: boolean; editing?: boolean } = {},
      {
        src = '/image.png',
        href = undefined,
        cardConfig = {},
      }: { src?: string; href?: string; cardConfig?: Record<string, unknown> } = {},
    ) {
      const composerValue = createComposerContext({ image: { mimeTypes: ['image/png'] } }, undefined, cardConfig)
      const { wrapper: CardSelectionStoreProvider } = createSelection(selection)
      return render(
        <InklingHostIntegrationContext.Provider value={composerValue}>
          <CardSelectionStoreProvider>
            <ImageNodeComponent cardWidth="regular" href={href} nodeKey="img-1" src={src} />
          </CardSelectionStoreProvider>
        </InklingHostIntegrationContext.Provider>,
      )
    }

    function getToolbars(container: HTMLElement) {
      return container.querySelectorAll('[data-inkling-card-toolbar="image"]')
    }

    it('hides the toolbar when the card is not selected', () => {
      const { container } = renderWithToolbar({ selected: false })

      expect(getToolbars(container)).toHaveLength(0)
    })

    it('hides the toolbar when the card has no src', () => {
      const { container } = renderWithToolbar({ selected: true }, { src: '' })

      expect(getToolbars(container)).toHaveLength(0)
    })

    it('keeps the toolbar visible while the card is editing', () => {
      // image's menu toolbar has no !isEditing factor — unlike the other
      // edit-mode cards it stays up while editing
      const { container } = renderWithToolbar({ selected: true, editing: true })

      expect(getToolbars(container)).toHaveLength(1)
    })

    it('renders width, link, and snippet items with the upload form before the menu', () => {
      const { container } = renderWithToolbar({ selected: true }, { cardConfig: { createSnippet: vi.fn() } })

      const toolbars = getToolbars(container)
      expect(toolbars).toHaveLength(1)
      const toolbar = toolbars[0]

      // the ImageUploadForm renders inside the toolbar before the menu
      expect(toolbar.firstElementChild?.tagName).toBe('FORM')
      expect(toolbar.querySelector('form input[type="file"]')).toBeTruthy()

      expect(toolbar.querySelectorAll('li')).toHaveLength(7)
      const labels = Array.from(toolbar.querySelectorAll('button')).map((button) => button.getAttribute('aria-label'))
      expect(labels).toEqual(['Regular width', 'Wide width', 'Full width', 'Link', 'Save as snippet'])
      expect(toolbar.querySelectorAll('button svg')).toHaveLength(5)

      const activeByLabel = Array.from(toolbar.querySelectorAll('button')).map((button) => [
        button.getAttribute('aria-label'),
        button.getAttribute('data-inkling-active'),
      ])
      expect(activeByLabel).toEqual([
        ['Regular width', 'true'],
        ['Wide width', 'false'],
        ['Full width', 'false'],
        ['Link', 'false'],
        ['Save as snippet', 'false'],
      ])
      expect(screen.getByTestId('create-snippet')).toBeTruthy()
    })

    it('marks the link item active when the image has an href', () => {
      renderWithToolbar({ selected: true }, { href: 'https://example.com' })

      expect(screen.getByRole('button', { name: 'Link' }).getAttribute('data-inkling-active')).toBe('true')
    })

    it('hides the width items and their separator for gif images', () => {
      const { container } = renderWithToolbar({ selected: true }, { src: '/image.gif' })

      const toolbar = getToolbars(container)[0]
      expect(toolbar.querySelectorAll('li')).toHaveLength(1)
      const labels = Array.from(toolbar.querySelectorAll('button')).map((button) => button.getAttribute('aria-label'))
      expect(labels).toEqual(['Link'])
    })

    it('hides the snippet item and its separator when createSnippet is not configured', () => {
      const { container } = renderWithToolbar({ selected: true })

      const toolbar = getToolbars(container)[0]
      expect(toolbar.querySelectorAll('li')).toHaveLength(5)
      expect(screen.queryByTestId('create-snippet')).toBeNull()
    })

    it('swaps the menu toolbar for the link input when the link item is clicked', () => {
      const { container } = renderWithToolbar({ selected: true })

      fireEvent.click(screen.getByRole('button', { name: 'Link' }))

      const toolbars = getToolbars(container)
      expect(toolbars).toHaveLength(1)
      expect(toolbars[0].querySelector('ul')).toBeNull()
      expect(toolbars[0].querySelector('[data-testid="link-input"]')).toBeTruthy()
    })

    it('swaps the menu toolbar for the snippet input when the snippet item is clicked', () => {
      const { container } = renderWithToolbar({ selected: true }, { cardConfig: { createSnippet: vi.fn() } })

      fireEvent.click(screen.getByTestId('create-snippet'))

      const toolbars = getToolbars(container)
      expect(toolbars).toHaveLength(1)
      expect(toolbars[0].querySelector('ul')).toBeNull()
      expect(toolbars[0].querySelector('[data-testid="snippet-name"]')).toBeTruthy()
    })
  })
})
