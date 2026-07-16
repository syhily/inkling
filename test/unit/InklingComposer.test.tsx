import { CollaborationPlugin } from '@lexical/react/LexicalCollaborationPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { render } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import InklingComposer from '@/components/InklingComposer'
import InklingErrorBoundary from '@/components/InklingErrorBoundary'
import InklingCollaborationContext, { type LexicalProviderFactory } from '@/context/InklingCollaborationContext'
import InklingHostIntegrationContext from '@/context/InklingHostIntegrationContext'
import { normalizeInitialEditorState } from '@/utils/normalizeInitialEditorState'

vi.mock('@lexical/react/LexicalCollaborationPlugin', () => ({
  CollaborationPlugin: vi.fn(() => null),
}))

function EditorTree() {
  return (
    <RichTextPlugin contentEditable={<ContentEditable />} ErrorBoundary={InklingErrorBoundary} placeholder={null} />
  )
}

const stateWithText = JSON.stringify({
  root: {
    children: [
      {
        children: [{ detail: 0, format: 0, mode: 'normal', style: '', text: 'hello', type: 'text', version: 1 }],
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'paragraph',
        version: 1,
      },
    ],
    direction: 'ltr',
    format: '',
    indent: 0,
    type: 'root',
    version: 1,
  },
})

const emptyRootState = JSON.stringify({
  root: { children: [], direction: null, format: '', indent: 0, type: 'root', version: 1 },
})

describe('InklingComposer', function () {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders', () => {
    const { container } = render(
      <InklingComposer>
        <EditorTree />
      </InklingComposer>,
    )

    expect(container.querySelector('[contenteditable]')).toBeInTheDocument()
  })

  it('accepts initialEditorState prop', () => {
    const { container } = render(
      <InklingComposer initialEditorState={stateWithText}>
        <EditorTree />
      </InklingComposer>,
    )

    expect(container.querySelector('[contenteditable]')).toHaveTextContent('hello')
  })

  it('injects an empty paragraph when initialEditorState has no root children', () => {
    const { container } = render(
      <InklingComposer initialEditorState={emptyRootState}>
        <EditorTree />
      </InklingComposer>,
    )

    const editable = container.querySelector('[contenteditable]')
    expect(editable).toBeInTheDocument()
    expect(editable!.querySelector('p')).toBeInTheDocument()
  })

  it('logs a warning and installs a no-op uploader when fileUploader.useFileUpload is missing', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    let upload: ((files: FileList | File[]) => Promise<unknown>) | undefined

    function FileUploadConsumer() {
      const { fileUploader } = React.useContext(InklingHostIntegrationContext)
      const uploader = fileUploader.useFileUpload('image')
      upload = uploader.upload
      return null
    }

    render(
      <InklingComposer>
        <FileUploadConsumer />
      </InklingComposer>,
    )

    expect(consoleError).toHaveBeenCalledTimes(1)
    expect(consoleError).toHaveBeenCalledWith(
      '<InklingComposer> requires a `fileUploader` prop object to be passed containing a `useFileUpload` custom hook',
    )
    await expect(upload!([])).resolves.toBeUndefined()
  })

  it('does not mutate the fileUploader prop object', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const fileUploader = Object.freeze({ fileTypes: { image: { mimeTypes: ['image/png'] } } })

    expect(() =>
      render(
        <InklingComposer fileUploader={fileUploader}>
          <EditorTree />
        </InklingComposer>,
      ),
    ).not.toThrow()
    expect(fileUploader).toEqual({ fileTypes: { image: { mimeTypes: ['image/png'] } } })
    expect('useFileUpload' in fileUploader).toBe(false)
  })

  it('passes the normalized bootstrap state to the collaboration plugin in multiplayer', () => {
    render(
      <InklingComposer
        enableMultiplayer
        initialEditorState={emptyRootState}
        multiplayerDocId="doc"
        multiplayerEndpoint="ws://localhost:1234"
      >
        <EditorTree />
      </InklingComposer>,
    )

    expect(CollaborationPlugin).toHaveBeenCalled()
    const pluginProps = vi.mocked(CollaborationPlugin).mock.calls[0][0]
    expect(typeof pluginProps.initialEditorState).toBe('string')
    const bootstrapState = JSON.parse(pluginProps.initialEditorState as string)
    expect(bootstrapState.root.children).toHaveLength(1)
    expect(bootstrapState.root.children[0].type).toBe('paragraph')
  })

  it('exposes a websocket provider factory returning the methods Lexical requires', () => {
    let factory: LexicalProviderFactory | undefined

    function FactoryConsumer() {
      const { createWebsocketProvider } = React.useContext(InklingCollaborationContext)
      factory = createWebsocketProvider
      return null
    }

    render(
      <InklingComposer multiplayerDebug={false} multiplayerDocId="doc" multiplayerEndpoint="ws://localhost:1234">
        <FactoryConsumer />
      </InklingComposer>,
    )

    const provider = factory!('card-1', new Map()) as unknown as Record<string, unknown>
    for (const method of ['awareness', 'connect', 'disconnect', 'on', 'off']) {
      expect(provider[method]).toBeDefined()
    }
    ;(provider.disconnect as () => void)()
  })
})

describe('normalizeInitialEditorState', () => {
  it('returns null and undefined unchanged', () => {
    expect(normalizeInitialEditorState(null)).toBeNull()
    expect(normalizeInitialEditorState(undefined)).toBeUndefined()
  })

  it('returns a non-empty JSON string unchanged', () => {
    expect(normalizeInitialEditorState(stateWithText)).toBe(stateWithText)
  })

  it('repairs an empty-root JSON string with a fallback paragraph', () => {
    const result = normalizeInitialEditorState(emptyRootState) as string

    expect(result).not.toBe(emptyRootState)
    const parsed = JSON.parse(result)
    expect(parsed.root.children).toHaveLength(1)
    expect(parsed.root.children[0].type).toBe('paragraph')
  })

  it('converts a serialized object to a JSON string without mutating it', () => {
    const serialized = JSON.parse(stateWithText)
    const result = normalizeInitialEditorState(serialized)

    expect(typeof result).toBe('string')
    expect(JSON.parse(result as string)).toEqual(serialized)
    expect(serialized).toEqual(JSON.parse(stateWithText))
  })

  it('repairs an empty-root serialized object without mutating it', () => {
    const serialized = JSON.parse(emptyRootState)
    const result = normalizeInitialEditorState(serialized) as string

    expect(serialized.root.children).toHaveLength(0)
    expect(JSON.parse(result).root.children[0].type).toBe('paragraph')
  })

  it('throws on malformed JSON', () => {
    expect(() => normalizeInitialEditorState('{not json')).toThrow()
  })
})
