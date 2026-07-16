import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { $getNodeByKey, $getRoot, createEditor, type LexicalEditor, type NodeKey } from 'lexical'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import CardContext from '@/context/CardContext'
import InklingHostIntegrationContext from '@/context/InklingHostIntegrationContext'
import { FileNode, $createFileNode } from '@/nodes/FileNode'
import FileNodeComponent from '@/nodes/FileNodeComponent'
import { openFileSelection } from '@/utils/openFileSelection'

vi.mock('@lexical/react/LexicalComposerContext', () => ({
  useLexicalComposerContext: vi.fn(),
}))

vi.mock('@/utils/openFileSelection', () => ({
  openFileSelection: vi.fn(),
}))

function createTestEditor(): LexicalEditor {
  return createEditor({ namespace: 'test', nodes: [FileNode], onError: () => {} })
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
    captionHasFocus: null,
    cardWidth: 'regular',
    nodeKey: 'file-1',
    cardContainerRef: { current: null } as React.RefObject<HTMLElement | null>,
    setCardWidth: vi.fn(),
    setCaptionHasFocus: vi.fn(),
    setEditing: vi.fn(),
    ...overrides,
  }
}

function createComposerContext(
  upload: ReturnType<typeof vi.fn> = vi.fn(() => Promise.resolve(undefined)),
  cardConfig: Record<string, unknown> = {},
) {
  return {
    fileUploader: {
      useFileUpload: () => ({
        isLoading: false,
        upload,
        errors: [],
      }),
      fileTypes: { file: { mimeTypes: ['application/pdf'] } },
    },
    cardConfig,
    darkMode: false,
    enableMultiplayer: false,
    editorContainerRef: { current: null } as React.RefObject<HTMLElement | null>,
    createWebsocketProvider: vi.fn(),
    onWordCountChangeRef: { current: null },
    onError: vi.fn(),
  }
}

function addFileNode(editor: LexicalEditor, dataset: { src?: string; triggerFileDialog?: boolean } = {}) {
  return new Promise<NodeKey>((resolve) => {
    editor.update(
      () => {
        const fileNode = $createFileNode(dataset)
        $getRoot().append(fileNode)
      },
      { onUpdate: () => resolve(editor.getEditorState().read(() => $getRoot().getFirstChildOrThrow().getKey())) },
    )
  })
}

function readTriggerFileDialog(editor: LexicalEditor, nodeKey: NodeKey) {
  return editor.getEditorState().read(() => {
    const node = $getNodeByKey(nodeKey) as FileNode | null
    return node?.__triggerFileDialog
  })
}

describe('FileNodeComponent', () => {
  let editor: LexicalEditor

  beforeEach(async () => {
    vi.clearAllMocks()
    editor = createTestEditor()
    const { useLexicalComposerContext } = await import('@lexical/react/LexicalComposerContext')
    useLexicalComposerContext.mockReturnValue([editor])
  })

  interface RenderOptions {
    fileSrc?: string
    triggerFileDialog?: boolean
    initialFile?: File
    upload?: ReturnType<typeof vi.fn>
  }

  function renderComponent(nodeKey: NodeKey, options: RenderOptions = {}) {
    const { fileSrc = '', triggerFileDialog = false, initialFile = undefined, upload } = options
    const composerValue = createComposerContext(upload)
    const cardValue = createCardContext()
    return render(
      <InklingHostIntegrationContext.Provider value={composerValue}>
        <CardContext.Provider value={cardValue}>
          <FileNodeComponent
            fileDesc=""
            fileDescPlaceholder="Add a description"
            fileName=""
            fileSize=""
            fileSrc={fileSrc}
            fileTitle=""
            fileTitlePlaceholder="Add a title"
            initialFile={initialFile}
            nodeKey={nodeKey}
            triggerFileDialog={triggerFileDialog}
          />
        </CardContext.Provider>
      </InklingHostIntegrationContext.Provider>,
    )
  }

  it('renders the empty card when no file is set', async () => {
    const nodeKey = await addFileNode(editor)

    renderComponent(nodeKey)

    expect(screen.getByTestId('media-placeholder')).toBeTruthy()
  })

  it('opens the file dialog once when triggerFileDialog is true', async () => {
    const nodeKey = await addFileNode(editor, { triggerFileDialog: true })

    renderComponent(nodeKey, { triggerFileDialog: true })

    await waitFor(() => {
      expect(openFileSelection).toHaveBeenCalledTimes(1)
    })

    // the flag is cleared on the node so a re-render does not trigger it again
    await waitFor(() => {
      expect(readTriggerFileDialog(editor, nodeKey)).toBe(false)
    })
  })

  it('uploads the initial file when the card has no src', async () => {
    const nodeKey = await addFileNode(editor)
    const upload = vi.fn(() => Promise.resolve(undefined))
    const file = new File(['file-body'], 'report.pdf', { type: 'application/pdf' })

    renderComponent(nodeKey, { initialFile: file, upload })

    await waitFor(() => {
      expect(upload).toHaveBeenCalledWith([file])
    })
  })

  it('does not upload the initial file when the card already has a src', async () => {
    const nodeKey = await addFileNode(editor, { src: '/existing.pdf' })
    const upload = vi.fn(() => Promise.resolve(undefined))
    const file = new File(['file-body'], 'report.pdf', { type: 'application/pdf' })

    renderComponent(nodeKey, { fileSrc: '/existing.pdf', initialFile: file, upload })

    // the mount effect runs synchronously; give any async work a chance to fire
    await flushMacrotask()
    expect(upload).not.toHaveBeenCalled()
  })

  describe('action toolbar', () => {
    const populatedProps = {
      fileName: 'report.pdf',
      fileSize: '12 KB',
      fileSrc: '/report.pdf',
    }

    function renderWithToolbar(
      cardOverrides: Record<string, unknown> = {},
      { populated = true, cardConfig = {} }: { populated?: boolean; cardConfig?: Record<string, unknown> } = {},
    ) {
      const composerValue = createComposerContext(undefined, cardConfig)
      const cardValue = createCardContext(cardOverrides)
      const fileProps = populated ? populatedProps : { fileName: '', fileSize: '', fileSrc: '' }
      return render(
        <InklingHostIntegrationContext.Provider value={composerValue}>
          <CardContext.Provider value={cardValue}>
            <FileNodeComponent
              fileDesc=""
              fileDescPlaceholder="Add a description"
              fileName={fileProps.fileName}
              fileSize={fileProps.fileSize}
              fileSrc={fileProps.fileSrc}
              fileTitle="Report"
              fileTitlePlaceholder="Add a title"
              nodeKey="file-1"
              triggerFileDialog={false}
            />
          </CardContext.Provider>
        </InklingHostIntegrationContext.Provider>,
      )
    }

    function getToolbars(container: HTMLElement) {
      return container.querySelectorAll('[data-inkling-card-toolbar="file-upload"]')
    }

    it('hides the toolbar when the card is not selected', () => {
      const { container } = renderWithToolbar({ isSelected: false, isEditing: false })

      expect(getToolbars(container)).toHaveLength(0)
    })

    it('hides the toolbar while the card is editing', () => {
      const { container } = renderWithToolbar({ isSelected: true, isEditing: true })

      expect(getToolbars(container)).toHaveLength(0)
    })

    it('hides the toolbar until the card is populated', () => {
      const { container } = renderWithToolbar({ isSelected: true, isEditing: false }, { populated: false })

      expect(getToolbars(container)).toHaveLength(0)
    })

    it('renders edit, separator, and snippet items when selected and populated', () => {
      const { container } = renderWithToolbar(
        { isSelected: true, isEditing: false },
        {
          cardConfig: { createSnippet: vi.fn() },
        },
      )

      const toolbars = getToolbars(container)
      expect(toolbars).toHaveLength(1)
      const toolbar = toolbars[0]
      expect(toolbar.querySelectorAll('li')).toHaveLength(3)

      const labels = Array.from(toolbar.querySelectorAll('button')).map((button) => button.getAttribute('aria-label'))
      expect(labels).toEqual(['Edit', 'Save as snippet'])
      expect(toolbar.querySelectorAll('button svg')).toHaveLength(2)
      expect(screen.getByTestId('edit-file-upload-card')).toBeTruthy()
    })

    it('hides the snippet item and its separator when createSnippet is not configured', () => {
      // plan 046 step 4 deliberate change: file was the only card that did
      // not gate the snippet item (or its separator) on
      // cardConfig.createSnippet — the item opened an input whose creation
      // silently no-oped. It now matches the other ten cards
      const { container } = renderWithToolbar({ isSelected: true, isEditing: false })

      const toolbar = getToolbars(container)[0]
      expect(toolbar.querySelectorAll('li')).toHaveLength(1)
      expect(screen.queryByRole('button', { name: 'Save as snippet' })).toBeNull()
      expect(screen.queryByTestId('create-snippet')).toBeNull()
    })

    it('enters edit mode through the card context when the edit item is clicked', () => {
      // plan 046 step 4 deliberate change: file's edit item was wired to an
      // inert no-op (preventDefault/stopPropagation only); it now enters the
      // edit mode FileCard already implements, like every other card
      const setEditing = vi.fn()
      renderWithToolbar({ isSelected: true, isEditing: false, setEditing })

      fireEvent.click(screen.getByTestId('edit-file-upload-card'))

      expect(setEditing).toHaveBeenCalledWith(true)
    })

    it('swaps the menu toolbar for the snippet input when the snippet item is clicked', () => {
      const { container } = renderWithToolbar(
        { isSelected: true, isEditing: false },
        {
          cardConfig: { createSnippet: vi.fn() },
        },
      )

      fireEvent.click(screen.getByTestId('create-snippet'))

      const toolbars = getToolbars(container)
      expect(toolbars).toHaveLength(1)
      expect(toolbars[0].querySelector('ul')).toBeNull()
      expect(toolbars[0].querySelector('[data-testid="snippet-name"]')).toBeTruthy()
    })
  })
})
