import { createHeadlessEditor } from '@lexical/headless'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { renderHook } from '@testing-library/react'
import { $createParagraphNode, $createTextNode, $getRoot, COMMAND_PRIORITY_CRITICAL, type LexicalEditor } from 'lexical'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { INSERT_AUDIO_COMMAND } from '@/nodes/AudioNode'
import { INSERT_BOOKMARK_COMMAND } from '@/nodes/BookmarkNode'
import { INSERT_BUTTON_COMMAND } from '@/nodes/ButtonNode'
import { INSERT_CALLOUT_COMMAND } from '@/nodes/CalloutNode'
import { INSERT_FILE_COMMAND } from '@/nodes/FileNode'
import { INSERT_GALLERY_COMMAND } from '@/nodes/GalleryNode'
import { INSERT_TOGGLE_COMMAND } from '@/nodes/ToggleNode'
import { INSERT_VIDEO_COMMAND } from '@/nodes/VideoNode'
import { CardInsertPlugin } from '@/plugins/CardInsertPlugin'
import { INSERT_CARD_COMMAND } from '@/plugins/InklingBehaviourPlugin'

vi.mock('@lexical/react/LexicalComposerContext', () => ({
  useLexicalComposerContext: vi.fn(),
}))

function createTestEditor(nodes: NonNullable<Parameters<typeof createHeadlessEditor>[0]>['nodes']) {
  return createHeadlessEditor({
    namespace: 'test',
    nodes,
    onError: () => {},
  })
}

function updateEditor(editor: LexicalEditor, updateFn: () => void) {
  return new Promise<void>((resolve) => {
    editor.update(updateFn, { onUpdate: () => resolve() })
  })
}

async function setupPluginTest(editor: LexicalEditor) {
  vi.mocked(useLexicalComposerContext).mockReturnValue([editor, { getTheme: () => undefined }])
  renderHook(() => CardInsertPlugin())
  // allow React effects to register commands
  await new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
}

describe('Card insert commands (CardInsertPlugin)', () => {
  let editor: LexicalEditor

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('audio insert dispatches INSERT_CARD_COMMAND for an audio dataset', async () => {
    const { AudioNode } = await import('@/nodes/AudioNode')
    editor = createTestEditor([AudioNode])
    await setupPluginTest(editor)

    let dispatchedCardNode
    const removeListener = editor.registerCommand(
      INSERT_CARD_COMMAND,
      (payload) => {
        dispatchedCardNode = payload.cardNode
        return false
      },
      COMMAND_PRIORITY_CRITICAL,
    )

    const dispatched = editor.dispatchCommand(INSERT_AUDIO_COMMAND, { initialFile: undefined })
    expect(dispatched).toBe(true)
    expect(dispatchedCardNode).toBeDefined()

    removeListener()
  })

  it('bookmark insert requires a range selection and dispatches INSERT_CARD_COMMAND', async () => {
    const { BookmarkNode } = await import('@/nodes/BookmarkNode')
    editor = createTestEditor([BookmarkNode])
    await setupPluginTest(editor)

    await updateEditor(editor, () => {
      const root = $getRoot()
      root.clear()
      const paragraph = $createParagraphNode()
      paragraph.append($createTextNode('https://example.com'))
      root.append(paragraph)
      paragraph.select(0, 23)
    })

    let dispatchedCardNode
    const removeListener = editor.registerCommand(
      INSERT_CARD_COMMAND,
      (payload) => {
        dispatchedCardNode = payload.cardNode
        return false
      },
      COMMAND_PRIORITY_CRITICAL,
    )

    const dispatched = editor.dispatchCommand(INSERT_BOOKMARK_COMMAND, { url: 'https://example.com' })
    expect(dispatched).toBe(true)
    expect(dispatchedCardNode).toBeDefined()

    removeListener()
  })

  it('button insert rejects non-object payloads', async () => {
    const { ButtonNode } = await import('@/nodes/ButtonNode')
    editor = createTestEditor([ButtonNode])
    await setupPluginTest(editor)

    const dispatched = Reflect.apply(editor.dispatchCommand, editor, [INSERT_BUTTON_COMMAND, null])
    expect(dispatched).toBe(false)
  })

  it('callout insert dispatches INSERT_CARD_COMMAND for a callout dataset', async () => {
    const { CalloutNode } = await import('@/nodes/CalloutNode')
    editor = createTestEditor([CalloutNode])
    await setupPluginTest(editor)

    let dispatchedCardNode
    const removeListener = editor.registerCommand(
      INSERT_CARD_COMMAND,
      (payload) => {
        dispatchedCardNode = payload.cardNode
        return false
      },
      COMMAND_PRIORITY_CRITICAL,
    )

    const dispatched = editor.dispatchCommand(INSERT_CALLOUT_COMMAND, { calloutText: 'Hello' })
    expect(dispatched).toBe(true)
    expect(dispatchedCardNode).toBeDefined()

    removeListener()
  })

  it('file insert dispatches INSERT_CARD_COMMAND for a file dataset', async () => {
    const { FileNode } = await import('@/nodes/FileNode')
    editor = createTestEditor([FileNode])
    await setupPluginTest(editor)

    let dispatchedCardNode
    const removeListener = editor.registerCommand(
      INSERT_CARD_COMMAND,
      (payload) => {
        dispatchedCardNode = payload.cardNode
        return false
      },
      COMMAND_PRIORITY_CRITICAL,
    )

    const dispatched = editor.dispatchCommand(INSERT_FILE_COMMAND, { src: 'file.pdf' })
    expect(dispatched).toBe(true)
    expect(dispatchedCardNode).toBeDefined()

    removeListener()
  })

  it('gallery insert dispatches INSERT_CARD_COMMAND for a gallery dataset', async () => {
    const { GalleryNode } = await import('@/nodes/GalleryNode')
    editor = createTestEditor([GalleryNode])
    await setupPluginTest(editor)

    let dispatchedCardNode
    const removeListener = editor.registerCommand(
      INSERT_CARD_COMMAND,
      (payload) => {
        dispatchedCardNode = payload.cardNode
        return false
      },
      COMMAND_PRIORITY_CRITICAL,
    )

    const dispatched = editor.dispatchCommand(INSERT_GALLERY_COMMAND, { images: [] })
    expect(dispatched).toBe(true)
    expect(dispatchedCardNode).toBeDefined()

    removeListener()
  })

  it('toggle insert dispatches INSERT_CARD_COMMAND for a toggle dataset', async () => {
    const { ToggleNode } = await import('@/nodes/ToggleNode')
    editor = createTestEditor([ToggleNode])
    await setupPluginTest(editor)

    let dispatchedCardNode
    const removeListener = editor.registerCommand(
      INSERT_CARD_COMMAND,
      (payload) => {
        dispatchedCardNode = payload.cardNode
        return false
      },
      COMMAND_PRIORITY_CRITICAL,
    )

    const dispatched = editor.dispatchCommand(INSERT_TOGGLE_COMMAND, { heading: 'Title' })
    expect(dispatched).toBe(true)
    expect(dispatchedCardNode).toBeDefined()

    removeListener()
  })

  it('video insert dispatches INSERT_CARD_COMMAND for a video dataset', async () => {
    const { VideoNode } = await import('@/nodes/VideoNode')
    editor = createTestEditor([VideoNode])
    await setupPluginTest(editor)

    let dispatchedCardNode
    const removeListener = editor.registerCommand(
      INSERT_CARD_COMMAND,
      (payload) => {
        dispatchedCardNode = payload.cardNode
        return false
      },
      COMMAND_PRIORITY_CRITICAL,
    )

    const dispatched = editor.dispatchCommand(INSERT_VIDEO_COMMAND, { src: 'video.mp4' })
    expect(dispatched).toBe(true)
    expect(dispatchedCardNode).toBeDefined()

    removeListener()
  })
})
