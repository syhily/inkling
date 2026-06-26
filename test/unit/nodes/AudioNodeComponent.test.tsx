import { render, screen } from '@testing-library/react'
import { createEditor, $getRoot, type LexicalEditor, type NodeKey } from 'lexical'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import CardContext from '@/context/CardContext'
import InklingComposerContext from '@/context/InklingComposerContext'
import { AudioNode } from '@/nodes/AudioNode'
import { AudioNodeComponent } from '@/nodes/AudioNodeComponent'

vi.mock('@lexical/react/LexicalComposerContext', () => ({
  useLexicalComposerContext: vi.fn(),
}))

function createTestEditor(): LexicalEditor {
  return createEditor({ namespace: 'test', nodes: [AudioNode], onError: () => {} })
}

function createCardContext(overrides: Partial<React.ContextType<typeof CardContext>> = {}) {
  return {
    isSelected: true,
    isEditing: false,
    captionHasFocus: null,
    cardWidth: 'regular',
    nodeKey: 'audio-1',
    cardContainerRef: { current: null } as React.RefObject<HTMLElement | null>,
    setCardWidth: vi.fn(),
    setCaptionHasFocus: vi.fn(),
    setEditing: vi.fn(),
    ...overrides,
  }
}

function createComposerContext() {
  return {
    fileUploader: {
      useFileUpload: () => ({
        isLoading: false,
        upload: vi.fn(() => Promise.resolve(undefined)),
        errors: [],
      }),
      fileTypes: { audio: { mimeTypes: ['audio/mpeg'] }, image: { mimeTypes: ['image/png'] } },
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

describe('AudioNodeComponent', () => {
  let editor: LexicalEditor

  beforeEach(async () => {
    editor = createTestEditor()
    const { useLexicalComposerContext } = await import('@lexical/react/LexicalComposerContext')
    useLexicalComposerContext.mockReturnValue([editor])
  })

  it('renders with typed audio card props', async () => {
    const nodeKey = await addAudioNode(editor)

    const composerValue = createComposerContext()
    const cardValue = createCardContext()
    render(
      <InklingComposerContext.Provider value={composerValue}>
        <CardContext.Provider value={cardValue}>
          <AudioNodeComponent
            duration={125}
            initialFile={undefined}
            nodeKey={nodeKey}
            src="/audio.mp3"
            thumbnailSrc=""
            title="Episode 1"
            triggerFileDialog={false}
          />
        </CardContext.Provider>
      </InklingComposerContext.Provider>,
    )

    expect(screen.getByTestId('audio-card-populated')).toBeTruthy()
    expect((screen.getByTestId('audio-title') as HTMLInputElement).value).toBe('Episode 1')
  })
})
