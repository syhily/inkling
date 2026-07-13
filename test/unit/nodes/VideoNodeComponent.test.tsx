import { CollaborationContext } from '@lexical/react/LexicalCollaborationContext'
import { LexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { $getNodeByKey, $getRoot, createEditor, type LexicalEditor, type NodeKey } from 'lexical'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import CardContext from '@/context/CardContext'
import InklingComposerContext from '@/context/InklingComposerContext'
import MINIMAL_NODES from '@/nodes/MinimalNodes'
import { VideoNode, $createVideoNode } from '@/nodes/VideoNode'
import { VideoNodeComponent } from '@/nodes/VideoNodeComponent'

function createTestEditor(): LexicalEditor {
  const editor = createEditor({ namespace: 'test', nodes: [VideoNode], onError: () => {} })
  const rootElement = document.createElement('div')
  editor.setRootElement(rootElement)
  return editor
}

function createCardContext(overrides: Partial<React.ContextType<typeof CardContext>> = {}) {
  return {
    isSelected: true,
    isEditing: true,
    captionHasFocus: null,
    cardWidth: 'regular' as const,
    nodeKey: 'video-1',
    cardContainerRef: { current: null } as React.RefObject<HTMLElement | null>,
    setCardWidth: vi.fn(),
    setCaptionHasFocus: vi.fn(),
    setEditing: vi.fn(),
    ...overrides,
  }
}

function createCollaborationContext() {
  return { isCollabActive: false, yjsDocMap: new Map() }
}

function createLexicalComposerContext(editor: LexicalEditor): [LexicalEditor, { getTheme: () => undefined }] {
  return [editor, { getTheme: () => undefined }]
}

function createComposerContext() {
  return {
    fileUploader: {
      useFileUpload: () => ({
        isLoading: false,
        upload: vi.fn(() => Promise.resolve(undefined)),
        errors: [],
      }),
      fileTypes: { image: { mimeTypes: ['image/png'] }, video: { mimeTypes: ['video/mp4'] } },
    },
    cardConfig: {},
    darkMode: false,
    enableMultiplayer: false,
    editorContainerRef: { current: null } as React.RefObject<HTMLElement | null>,
    createWebsocketProvider: vi.fn(),
    onWordCountChangeRef: { current: null },
    onError: vi.fn(),
  }
}

function addVideoNode(editor: LexicalEditor, loop: boolean) {
  return new Promise<NodeKey>((resolve) => {
    editor.update(
      () => {
        const videoNode = $createVideoNode({
          src: 'https://example.com/video.mp4',
          thumbnailSrc: 'https://example.com/thumb.jpg',
          loop,
        })
        $getRoot().append(videoNode)
      },
      { onUpdate: () => resolve(editor.getEditorState().read(() => $getRoot().getFirstChildOrThrow().getKey())) },
    )
  })
}

function readLoop(editor: LexicalEditor, nodeKey: NodeKey) {
  return editor.getEditorState().read(() => ($getNodeByKey(nodeKey) as VideoNode | null)?.loop)
}

describe('VideoNodeComponent', () => {
  let editor: LexicalEditor
  let captionEditor: LexicalEditor

  beforeEach(() => {
    editor = createTestEditor()
    captionEditor = createEditor({ namespace: 'caption', nodes: MINIMAL_NODES, onError: () => {} })
  })

  function renderComponent(nodeKey: NodeKey, isLoopChecked: boolean) {
    const collaborationValue = createCollaborationContext()
    const composerValue = createLexicalComposerContext(editor)
    const inklingComposerValue = createComposerContext()
    const cardValue = createCardContext({ nodeKey })

    return render(
      <CollaborationContext.Provider value={collaborationValue}>
        <LexicalComposerContext.Provider value={composerValue}>
          <InklingComposerContext.Provider value={inklingComposerValue}>
            <CardContext.Provider value={cardValue}>
              <VideoNodeComponent
                captionEditor={captionEditor}
                captionEditorInitialState={undefined}
                cardWidth="regular"
                customThumbnail=""
                initialFile={null}
                isLoopChecked={isLoopChecked}
                nodeKey={nodeKey}
                thumbnail="https://example.com/thumb.jpg"
                totalDuration="1:23"
                triggerFileDialog={false}
              />
            </CardContext.Provider>
          </InklingComposerContext.Provider>
        </LexicalComposerContext.Provider>
      </CollaborationContext.Provider>,
    )
  }

  it('disables loop on the node when the loop toggle is switched off', async () => {
    const nodeKey = await addVideoNode(editor, true)

    renderComponent(nodeKey, true)
    fireEvent.click(screen.getByTestId('loop-video'))

    await waitFor(() => {
      expect(readLoop(editor, nodeKey)).toBe(false)
    })
  })

  it('enables loop on the node when the loop toggle is switched on', async () => {
    const nodeKey = await addVideoNode(editor, false)

    renderComponent(nodeKey, false)
    fireEvent.click(screen.getByTestId('loop-video'))

    await waitFor(() => {
      expect(readLoop(editor, nodeKey)).toBe(true)
    })
  })
})
