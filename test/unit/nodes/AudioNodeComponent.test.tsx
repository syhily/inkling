import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { $getNodeByKey, $getRoot, createEditor, type LexicalEditor, type NodeKey } from 'lexical'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import CardContext from '@/context/CardContext'
import InklingHostIntegrationContext from '@/context/InklingHostIntegrationContext'
import { AudioNode, $createAudioNode } from '@/nodes/AudioNode'
import { AudioNodeComponent } from '@/nodes/AudioNodeComponent'
import { openFileSelection } from '@/utils/openFileSelection'

vi.mock('@lexical/react/LexicalComposerContext', () => ({
  useLexicalComposerContext: vi.fn(),
}))

vi.mock('@/utils/openFileSelection', () => ({
  openFileSelection: vi.fn(),
}))

function createTestEditor(): LexicalEditor {
  return createEditor({ namespace: 'test', nodes: [AudioNode], onError: () => {} })
}

function flushMacrotask(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
}

function createCardContext(overrides: Partial<React.ContextType<typeof CardContext>> = {}) {
  return {
    isSelected: true,
    isEditing: false,
    captionHasFocus: false,
    cardWidth: 'regular',
    nodeKey: 'audio-1',
    setCardWidth: vi.fn(),
    setCaptionHasFocus: vi.fn(),
    setEditing: vi.fn(),
    ...overrides,
  }
}

function createComposerContext({
  upload = vi.fn(() => Promise.resolve(undefined)),
  isLoading = false,
  cardConfig = {},
}: {
  upload?: ReturnType<typeof vi.fn>
  isLoading?: boolean
  cardConfig?: Record<string, unknown>
} = {}) {
  return {
    fileUploader: {
      useFileUpload: () => ({
        isLoading,
        upload,
        errors: [],
      }),
      fileTypes: { audio: { mimeTypes: ['audio/mpeg'] }, image: { mimeTypes: ['image/png'] } },
    },
    cardConfig,
    darkMode: false,
    enableMultiplayer: false,
    createWebsocketProvider: vi.fn(),
    onError: vi.fn(),
  }
}

function addAudioNode(editor: LexicalEditor) {
  return new Promise<NodeKey>((resolve) => {
    editor.update(
      () => {
        const audioNode = new AudioNode({ src: '/audio.mp3', title: 'Episode 1', duration: 125 })
        $getRoot().append(audioNode)
      },
      { onUpdate: () => resolve(editor.getEditorState().read(() => $getRoot().getFirstChildOrThrow().getKey())) },
    )
  })
}

function addTriggerAudioNode(editor: LexicalEditor) {
  return new Promise<NodeKey>((resolve) => {
    editor.update(
      () => {
        const audioNode = $createAudioNode({ triggerFileDialog: true })
        $getRoot().append(audioNode)
      },
      { onUpdate: () => resolve(editor.getEditorState().read(() => $getRoot().getFirstChildOrThrow().getKey())) },
    )
  })
}

function readTriggerFileDialog(editor: LexicalEditor, nodeKey: NodeKey) {
  return editor.getEditorState().read(() => {
    const node = $getNodeByKey(nodeKey) as AudioNode | null
    return node?.__triggerFileDialog
  })
}

describe('AudioNodeComponent', () => {
  let editor: LexicalEditor
  let createObjectURLSpy: ReturnType<typeof vi.spyOn>
  let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>

  beforeEach(async () => {
    vi.clearAllMocks()
    editor = createTestEditor()
    const { useLexicalComposerContext } = await import('@lexical/react/LexicalComposerContext')
    useLexicalComposerContext.mockReturnValue([editor])
    createObjectURLSpy = vi.spyOn(globalThis.URL, 'createObjectURL').mockReturnValue('blob:audio-preview')
    revokeObjectURLSpy = vi.spyOn(globalThis.URL, 'revokeObjectURL').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  interface RenderOptions {
    src?: string
    triggerFileDialog?: boolean
    initialFile?: File
    upload?: ReturnType<typeof vi.fn>
    isLoading?: boolean
  }

  function renderComponent(nodeKey: NodeKey, options: RenderOptions = {}) {
    const {
      src = '/audio.mp3',
      triggerFileDialog = false,
      initialFile = undefined,
      upload = vi.fn(() => Promise.resolve(undefined)),
      isLoading = false,
    } = options
    const composerValue = createComposerContext({ upload, isLoading })
    const cardValue = createCardContext()
    return render(
      <InklingHostIntegrationContext.Provider value={composerValue}>
        <CardContext.Provider value={cardValue}>
          <AudioNodeComponent
            duration={125}
            initialFile={initialFile}
            nodeKey={nodeKey}
            src={src}
            thumbnailSrc=""
            title="Episode 1"
            triggerFileDialog={triggerFileDialog}
          />
        </CardContext.Provider>
      </InklingHostIntegrationContext.Provider>,
    )
  }

  it('renders with typed audio card props', async () => {
    const nodeKey = await addAudioNode(editor)

    renderComponent(nodeKey)

    expect(screen.getByTestId('audio-card-populated')).toBeTruthy()
    expect((screen.getByTestId('audio-title') as HTMLInputElement).value).toBe('Episode 1')
  })

  it('opens the file dialog once when triggerFileDialog is true', async () => {
    const nodeKey = await addTriggerAudioNode(editor)

    renderComponent(nodeKey, { src: '', triggerFileDialog: true })

    await waitFor(() => {
      expect(openFileSelection).toHaveBeenCalledTimes(1)
    })

    // the flag is cleared on the node so a re-render does not trigger it again
    await waitFor(() => {
      expect(readTriggerFileDialog(editor, nodeKey)).toBe(false)
    })
  })

  it('uploads the initial file when the card has no src', async () => {
    const nodeKey = await addTriggerAudioNode(editor)
    const upload = vi.fn(() => Promise.resolve(undefined))
    const file = new File(['audio'], 'episode.mp3', { type: 'audio/mpeg' })

    renderComponent(nodeKey, { src: '', initialFile: file, upload })

    await waitFor(() => {
      expect(upload).toHaveBeenCalledWith([file])
    })

    // the object URL is leased for metadata and released when the flow ends
    expect(createObjectURLSpy).toHaveBeenCalledExactlyOnceWith(file)
    expect(revokeObjectURLSpy).toHaveBeenCalledExactlyOnceWith('blob:audio-preview')
  })

  it('does not upload the initial file when the card already has a src', async () => {
    const nodeKey = await addAudioNode(editor)
    const upload = vi.fn(() => Promise.resolve(undefined))
    const file = new File(['audio'], 'episode.mp3', { type: 'audio/mpeg' })

    renderComponent(nodeKey, { src: '/audio.mp3', initialFile: file, upload })

    // the mount effect runs synchronously; give any async work a chance to fire
    await flushMacrotask()
    expect(upload).not.toHaveBeenCalled()
  })

  it('does not upload the initial file while the uploader is loading', async () => {
    const nodeKey = await addTriggerAudioNode(editor)
    const upload = vi.fn(() => Promise.resolve(undefined))
    const file = new File(['audio'], 'episode.mp3', { type: 'audio/mpeg' })

    renderComponent(nodeKey, { src: '', initialFile: file, upload, isLoading: true })

    // the mount effect runs synchronously; give any async work a chance to fire
    await flushMacrotask()
    expect(upload).not.toHaveBeenCalled()
  })

  describe('action toolbar', () => {
    function renderWithToolbar(
      cardOverrides: Record<string, unknown> = {},
      { src = '/audio.mp3', cardConfig = {} } = {},
    ) {
      const composerValue = createComposerContext({ cardConfig })
      const cardValue = createCardContext(cardOverrides)
      return render(
        <InklingHostIntegrationContext.Provider value={composerValue}>
          <CardContext.Provider value={cardValue}>
            <AudioNodeComponent
              duration={125}
              initialFile={undefined}
              nodeKey="audio-1"
              src={src}
              thumbnailSrc=""
              title="Episode 1"
              triggerFileDialog={false}
            />
          </CardContext.Provider>
        </InklingHostIntegrationContext.Provider>,
      )
    }

    function getToolbars(container: HTMLElement) {
      return container.querySelectorAll('[data-inkling-card-toolbar="audio"]')
    }

    it('hides the toolbar when the card is not selected', () => {
      const { container } = renderWithToolbar({ isSelected: false, isEditing: false })

      expect(getToolbars(container)).toHaveLength(0)
    })

    it('hides the toolbar while the card is editing', () => {
      const { container } = renderWithToolbar({ isSelected: true, isEditing: true })

      expect(getToolbars(container)).toHaveLength(0)
    })

    it('hides the toolbar when the card has no src', () => {
      const { container } = renderWithToolbar({ isSelected: true, isEditing: false }, { src: '' })

      expect(getToolbars(container)).toHaveLength(0)
    })

    it('renders edit, separator, and snippet items when selected and populated', () => {
      const { container } = renderWithToolbar(
        { isSelected: true, isEditing: false },
        { cardConfig: { createSnippet: vi.fn() } },
      )

      const toolbars = getToolbars(container)
      expect(toolbars).toHaveLength(1)
      const toolbar = toolbars[0]
      expect(toolbar.querySelectorAll('li')).toHaveLength(3)

      // plan 046 step 3 deliberate change: audio's snippet item read
      // "Snippet" before the migration; it now reads "Save as snippet"
      // like the other ten cards
      const labels = Array.from(toolbar.querySelectorAll('button')).map((button) => button.getAttribute('aria-label'))
      expect(labels).toEqual(['Edit', 'Save as snippet'])
      expect(toolbar.querySelectorAll('button svg')).toHaveLength(2)
      expect(screen.getByTestId('create-snippet')).toBeTruthy()
    })

    it('hides the snippet item and its separator when createSnippet is not configured', () => {
      const { container } = renderWithToolbar({ isSelected: true, isEditing: false })

      const toolbar = getToolbars(container)[0]
      expect(toolbar.querySelectorAll('li')).toHaveLength(1)
      expect(screen.queryByTestId('create-snippet')).toBeNull()
    })

    it('enters edit mode through the card context when the edit item is clicked', () => {
      const setEditing = vi.fn()
      renderWithToolbar({ isSelected: true, isEditing: false, setEditing })

      fireEvent.click(screen.getByRole('button', { name: 'Edit' }))

      expect(setEditing).toHaveBeenCalledWith(true)
    })

    it('swaps the menu toolbar for the snippet input when the snippet item is clicked', () => {
      const { container } = renderWithToolbar(
        { isSelected: true, isEditing: false },
        { cardConfig: { createSnippet: vi.fn() } },
      )

      fireEvent.click(screen.getByTestId('create-snippet'))

      const toolbars = getToolbars(container)
      expect(toolbars).toHaveLength(1)
      expect(toolbars[0].querySelector('ul')).toBeNull()
      expect(toolbars[0].querySelector('[data-testid="snippet-name"]')).toBeTruthy()
    })
  })
})
