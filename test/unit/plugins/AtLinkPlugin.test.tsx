import { act, renderHook } from '@testing-library/react'
import { createEditor, type LexicalEditor } from 'lexical'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { mockComposerContext } from '#/utils/composer-context'
import InklingHostIntegrationContext from '@/context/InklingHostIntegrationContext'
import { $createAtLinkNode, $createAtLinkSearchNode, $createZWNJNode, AtLinkNode, AtLinkSearchNode } from '@/nodes/base'
import { AtLinkPlugin, InklingAtLinkPlugin } from '@/plugins/AtLinkPlugin'

vi.mock('@lexical/react/LexicalComposerContext', () => ({
  useLexicalComposerContext: vi.fn(),
}))

function createTestEditor() {
  return createEditor({
    namespace: 'test',
    nodes: [AtLinkNode, AtLinkSearchNode],
    onError: () => {},
  })
}

function updateEditor(editor: LexicalEditor, updateFn: () => void) {
  return new Promise<void>((resolve) => {
    editor.update(updateFn, { onUpdate: () => resolve() })
  })
}

const atLinkContextValue = {
  fileUploader: { useFileUpload: () => ({ upload: vi.fn() }) },
  cardConfig: {},
  darkMode: false,
  enableMultiplayer: false,
  createWebsocketProvider: vi.fn(),
  onError: vi.fn(),
}

describe('AtLinkPlugin', () => {
  let editor: LexicalEditor

  beforeEach(() => {
    vi.clearAllMocks()
    editor = createTestEditor()
  })

  it('renders null when searchLinks is not provided', async () => {
    mockComposerContext(editor)

    const { result } = renderHook(() => AtLinkPlugin(), {
      wrapper: ({ children }) => (
        <InklingHostIntegrationContext.Provider value={atLinkContextValue}>
          {children}
        </InklingHostIntegrationContext.Provider>
      ),
    })
    expect(result.current).toBeNull()
  })

  it('narrowing searchNode to AtLinkSearchNode allows setTextContent', async () => {
    await updateEditor(editor, () => {
      const atLinkNode = $createAtLinkNode()
      atLinkNode.append($createZWNJNode())
      atLinkNode.append($createAtLinkSearchNode('hello'))

      const searchNode = atLinkNode.getChildAtIndex(1)
      expect(searchNode).toBeInstanceOf(AtLinkSearchNode)

      if (searchNode instanceof AtLinkSearchNode) {
        searchNode.setTextContent('world')
        expect(searchNode.getTextContent()).toBe('world')
      }
    })
  })

  it('InklingAtLinkPlugin accepts searchLinks and siteUrl props', async () => {
    mockComposerContext(editor)

    const searchLinks = vi.fn().mockResolvedValue([])
    const { result } = renderHook(() => InklingAtLinkPlugin({ searchLinks, siteUrl: 'https://example.com' }))
    await act(async () => {})
    expect(result.current).toBeNull()
  })
})
