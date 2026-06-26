import { createHeadlessEditor } from '@lexical/headless'
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
import { AudioPlugin } from '@/plugins/AudioPlugin'
import { BookmarkPlugin } from '@/plugins/BookmarkPlugin'
import { ButtonPlugin } from '@/plugins/ButtonPlugin'
import { CalloutPlugin } from '@/plugins/CalloutPlugin'
import { FilePlugin } from '@/plugins/FilePlugin'
import { GalleryPlugin } from '@/plugins/GalleryPlugin'
import { INSERT_CARD_COMMAND } from '@/plugins/InklingBehaviourPlugin'
import { TogglePlugin } from '@/plugins/TogglePlugin'
import { VideoPlugin } from '@/plugins/VideoPlugin'

vi.mock('@lexical/react/LexicalComposerContext', () => ({
  useLexicalComposerContext: vi.fn(),
}))

function createTestEditor(nodes: Array<unknown>) {
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

async function setupPluginTest(editor: LexicalEditor, Plugin: () => null) {
  const { useLexicalComposerContext } = await import('@lexical/react/LexicalComposerContext')
  useLexicalComposerContext.mockReturnValue([editor])
  renderHook(() => Plugin())
  // allow React effects to register commands
  await new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
}

describe('Card plugins', () => {
  let editor: LexicalEditor

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('AudioPlugin dispatches INSERT_CARD_COMMAND for an audio dataset', async () => {
    const { AudioNode } = await import('@/nodes/AudioNode')
    editor = createTestEditor([AudioNode])
    await setupPluginTest(editor, AudioPlugin)

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

  it('BookmarkPlugin requires a range selection and dispatches INSERT_CARD_COMMAND', async () => {
    const { BookmarkNode } = await import('@/nodes/BookmarkNode')
    editor = createTestEditor([BookmarkNode])
    await setupPluginTest(editor, BookmarkPlugin)

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

  it('ButtonPlugin rejects non-object payloads', async () => {
    const { ButtonNode } = await import('@/nodes/ButtonNode')
    editor = createTestEditor([ButtonNode])
    await setupPluginTest(editor, ButtonPlugin)

    const dispatched = editor.dispatchCommand(INSERT_BUTTON_COMMAND, null)
    expect(dispatched).toBe(false)
  })

  it('CalloutPlugin dispatches INSERT_CARD_COMMAND for a callout dataset', async () => {
    const { CalloutNode } = await import('@/nodes/CalloutNode')
    editor = createTestEditor([CalloutNode])
    await setupPluginTest(editor, CalloutPlugin)

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

  it('FilePlugin dispatches INSERT_CARD_COMMAND for a file dataset', async () => {
    const { FileNode } = await import('@/nodes/FileNode')
    editor = createTestEditor([FileNode])
    await setupPluginTest(editor, FilePlugin)

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

  it('GalleryPlugin dispatches INSERT_CARD_COMMAND for a gallery dataset', async () => {
    const { GalleryNode } = await import('@/nodes/GalleryNode')
    editor = createTestEditor([GalleryNode])
    await setupPluginTest(editor, GalleryPlugin)

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

  it('TogglePlugin dispatches INSERT_CARD_COMMAND for a toggle dataset', async () => {
    const { ToggleNode } = await import('@/nodes/ToggleNode')
    editor = createTestEditor([ToggleNode])
    await setupPluginTest(editor, TogglePlugin)

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

  it('VideoPlugin dispatches INSERT_CARD_COMMAND for a video dataset', async () => {
    const { VideoNode } = await import('@/nodes/VideoNode')
    editor = createTestEditor([VideoNode])
    await setupPluginTest(editor, VideoPlugin)

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
