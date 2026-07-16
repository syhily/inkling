import type { Klass, LexicalCommand, LexicalEditor, LexicalNode } from 'lexical'

import { createHeadlessEditor } from '@lexical/headless'
import { renderHook } from '@testing-library/react'
import { $createParagraphNode, $createTextNode, $getRoot, COMMAND_PRIORITY_CRITICAL } from 'lexical'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { OpenCardInEditModePayload } from '@/plugins/behaviour/types'

import { AudioNode, INSERT_AUDIO_COMMAND } from '@/nodes/AudioNode'
import { BookmarkNode, INSERT_BOOKMARK_COMMAND } from '@/nodes/BookmarkNode'
import { ButtonNode, INSERT_BUTTON_COMMAND } from '@/nodes/ButtonNode'
import { CalloutNode, INSERT_CALLOUT_COMMAND } from '@/nodes/CalloutNode'
import EMAIL_EDITOR_NODES from '@/nodes/EmailEditorNodes'
import { FileNode, INSERT_FILE_COMMAND } from '@/nodes/FileNode'
import { GalleryNode, INSERT_GALLERY_COMMAND } from '@/nodes/GalleryNode'
import { HeaderNode, INSERT_HEADER_COMMAND } from '@/nodes/HeaderNode'
import { HtmlNode, INSERT_HTML_COMMAND } from '@/nodes/HtmlNode'
import { ImageNode, INSERT_IMAGE_COMMAND } from '@/nodes/ImageNode'
import { ToggleNode, INSERT_TOGGLE_COMMAND } from '@/nodes/ToggleNode'
import { VideoNode, INSERT_VIDEO_COMMAND } from '@/nodes/VideoNode'
import { AudioPlugin } from '@/plugins/AudioPlugin'
import { BookmarkPlugin } from '@/plugins/BookmarkPlugin'
import { ButtonPlugin } from '@/plugins/ButtonPlugin'
import { CalloutPlugin } from '@/plugins/CalloutPlugin'
import { INSERT_MEDIA_COMMAND } from '@/plugins/DragDropPastePlugin'
import { FilePlugin } from '@/plugins/FilePlugin'
import { GalleryPlugin } from '@/plugins/GalleryPlugin'
import { HeaderPlugin } from '@/plugins/HeaderPlugin'
import { HtmlPlugin } from '@/plugins/HtmlPlugin'
import { ImagePlugin } from '@/plugins/ImagePlugin'
import { INSERT_CARD_COMMAND } from '@/plugins/InklingBehaviourPlugin'
import { TogglePlugin } from '@/plugins/TogglePlugin'
import { VideoPlugin } from '@/plugins/VideoPlugin'

/**
 * Characterization pins for the card insert registration matrix (plan 043,
 * Step 1). Every behavior the eleven hand-written insert plugins register
 * today is pinned here against the plugins themselves: the command each card
 * joins, the wrapper class it constructs, the `openInEditMode` key presence,
 * the media re-dispatch, bookmark's selection quirk, the email-side mounting
 * matrix, and header's re-registration churn. Step 2's registrar must keep
 * every pin green; Step 3 flips exactly the churn assertion.
 */

vi.mock('@lexical/react/LexicalComposerContext', () => ({
  useLexicalComposerContext: vi.fn(),
}))

function createTestEditor(nodes: Array<Klass<LexicalNode> | object>) {
  return createHeadlessEditor({
    namespace: 'test',
    nodes: nodes as Array<Klass<LexicalNode>>,
    onError: () => {},
  })
}

function updateEditor(editor: LexicalEditor, updateFn: () => void) {
  return new Promise<void>((resolve) => {
    editor.update(updateFn, { onUpdate: () => resolve() })
  })
}

async function mountPlugin(editor: LexicalEditor, Plugin: () => null) {
  const { useLexicalComposerContext } = await import('@lexical/react/LexicalComposerContext')
  useLexicalComposerContext.mockReturnValue([editor])
  renderHook(() => Plugin())
  // allow React effects to register commands
  await new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
}

/** Registers an INSERT_CARD_COMMAND capture listener; returns the captured
 * payload ref and the unregister function. */
function captureInsertCard(editor: LexicalEditor) {
  const ref: { payload: OpenCardInEditModePayload | undefined } = { payload: undefined }
  const removeListener = editor.registerCommand(
    INSERT_CARD_COMMAND,
    (payload) => {
      ref.payload = payload
      return false
    },
    COMMAND_PRIORITY_CRITICAL,
  )
  return { ref, removeListener }
}

interface MatrixRow {
  card: string
  Plugin: () => null
  node: Klass<LexicalNode>
  command: LexicalCommand<unknown>
  dataset: unknown
  openInEditMode: boolean
  requiresRangeSelection?: boolean
}

const INSERT_MATRIX: MatrixRow[] = [
  {
    card: 'audio',
    Plugin: AudioPlugin,
    node: AudioNode,
    command: INSERT_AUDIO_COMMAND,
    dataset: {},
    openInEditMode: false,
  },
  {
    card: 'bookmark',
    Plugin: BookmarkPlugin,
    node: BookmarkNode,
    command: INSERT_BOOKMARK_COMMAND,
    dataset: { url: 'https://example.com' },
    openInEditMode: false,
    requiresRangeSelection: true,
  },
  {
    card: 'button',
    Plugin: ButtonPlugin,
    node: ButtonNode,
    command: INSERT_BUTTON_COMMAND,
    dataset: {},
    openInEditMode: true,
  },
  {
    card: 'callout',
    Plugin: CalloutPlugin,
    node: CalloutNode,
    command: INSERT_CALLOUT_COMMAND,
    dataset: { calloutText: 'Hello' },
    openInEditMode: true,
  },
  {
    card: 'file',
    Plugin: FilePlugin,
    node: FileNode,
    command: INSERT_FILE_COMMAND,
    dataset: { src: 'file.pdf' },
    openInEditMode: false,
  },
  {
    card: 'gallery',
    Plugin: GalleryPlugin,
    node: GalleryNode,
    command: INSERT_GALLERY_COMMAND,
    dataset: { images: [] },
    openInEditMode: false,
  },
  {
    card: 'header',
    Plugin: HeaderPlugin,
    node: HeaderNode,
    command: INSERT_HEADER_COMMAND,
    dataset: { version: 2 },
    openInEditMode: true,
  },
  {
    card: 'html',
    Plugin: HtmlPlugin,
    node: HtmlNode,
    command: INSERT_HTML_COMMAND,
    dataset: { html: '<p>Hello</p>' },
    openInEditMode: true,
  },
  {
    card: 'image',
    Plugin: ImagePlugin,
    node: ImageNode,
    command: INSERT_IMAGE_COMMAND,
    dataset: { src: 'https://example.com/image.png' },
    openInEditMode: false,
  },
  {
    card: 'toggle',
    Plugin: TogglePlugin,
    node: ToggleNode,
    command: INSERT_TOGGLE_COMMAND,
    dataset: { heading: 'Title' },
    openInEditMode: true,
  },
  {
    card: 'video',
    Plugin: VideoPlugin,
    node: VideoNode,
    command: INSERT_VIDEO_COMMAND,
    dataset: { src: 'video.mp4' },
    openInEditMode: false,
  },
]

describe('Card insert registration matrix', () => {
  let editor: LexicalEditor

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each(INSERT_MATRIX)(
    '$card: a valid dataset returns true and fires INSERT_CARD_COMMAND with the wrapper node and matrix openInEditMode',
    async ({ Plugin, node, command, dataset, openInEditMode, requiresRangeSelection }) => {
      editor = createTestEditor([node])
      await mountPlugin(editor, Plugin)

      if (requiresRangeSelection) {
        await updateEditor(editor, () => {
          const root = $getRoot()
          root.clear()
          const paragraph = $createParagraphNode()
          paragraph.append($createTextNode('https://example.com'))
          root.append(paragraph)
          paragraph.select(0, 23)
        })
      }

      const { ref, removeListener } = captureInsertCard(editor)

      const dispatched = editor.dispatchCommand(command, dataset)
      expect(dispatched).toBe(true)
      expect(ref.payload).toBeDefined()
      expect(ref.payload?.cardNode).toBeInstanceOf(node)
      if (openInEditMode) {
        expect(ref.payload).toHaveProperty('openInEditMode', true)
      } else {
        expect(ref.payload).not.toHaveProperty('openInEditMode')
      }

      removeListener()
    },
  )

  it.each(INSERT_MATRIX.filter(({ card }) => ['header', 'html', 'video'].includes(card)))(
    '$card: non-object payloads return false and never fire INSERT_CARD_COMMAND',
    async ({ Plugin, node, command }) => {
      editor = createTestEditor([node])
      await mountPlugin(editor, Plugin)

      const { ref, removeListener } = captureInsertCard(editor)

      expect(editor.dispatchCommand(command, null)).toBe(false)
      expect(editor.dispatchCommand(command, 'not-an-object')).toBe(false)
      expect(ref.payload).toBeUndefined()

      removeListener()
    },
  )

  it.each(INSERT_MATRIX.filter(({ card }) => ['audio', 'file', 'gallery', 'header', 'toggle', 'video'].includes(card)))(
    '$card: registers nothing under EMAIL_EDITOR_NODES (the card is not on the email surface)',
    async ({ Plugin, command, dataset }) => {
      editor = createTestEditor(EMAIL_EDITOR_NODES)
      await mountPlugin(editor, Plugin)

      const { ref, removeListener } = captureInsertCard(editor)

      expect(editor.dispatchCommand(command, dataset)).toBe(false)
      expect(ref.payload).toBeUndefined()

      removeListener()
    },
  )

  it('bookmark: with no range selection the insert command returns false and never fires INSERT_CARD_COMMAND', async () => {
    editor = createTestEditor([BookmarkNode])
    await mountPlugin(editor, BookmarkPlugin)

    const { ref, removeListener } = captureInsertCard(editor)

    expect(editor.dispatchCommand(INSERT_BOOKMARK_COMMAND, { url: 'https://example.com' })).toBe(false)
    expect(ref.payload).toBeUndefined()

    removeListener()
  })

  it("audio: claims INSERT_MEDIA_COMMAND for the 'audio' type and re-dispatches INSERT_AUDIO_COMMAND", async () => {
    editor = createTestEditor([AudioNode])
    await mountPlugin(editor, AudioPlugin)

    const dispatchSpy = vi.spyOn(editor, 'dispatchCommand')
    const file = new File([], 'test.mp3', { type: 'audio/mpeg' })

    const claimed = editor.dispatchCommand(INSERT_MEDIA_COMMAND, { type: 'audio', file })
    expect(claimed).toBe(true)
    expect(dispatchSpy).toHaveBeenCalledWith(INSERT_AUDIO_COMMAND, { initialFile: file })
  })

  it("video: claims INSERT_MEDIA_COMMAND for the 'video' type and re-dispatches INSERT_VIDEO_COMMAND", async () => {
    editor = createTestEditor([VideoNode])
    await mountPlugin(editor, VideoPlugin)

    const dispatchSpy = vi.spyOn(editor, 'dispatchCommand')
    const file = new File([], 'test.mp4', { type: 'video/mp4' })

    const claimed = editor.dispatchCommand(INSERT_MEDIA_COMMAND, { type: 'video', file })
    expect(claimed).toBe(true)
    expect(dispatchSpy).toHaveBeenCalledWith(INSERT_VIDEO_COMMAND, { initialFile: file })
  })

  it("media: a 'file'-type payload is claimed by no handler (the File gap, pinned as current behavior)", async () => {
    editor = createTestEditor([AudioNode, ImageNode, VideoNode])
    await mountPlugin(editor, AudioPlugin)
    await mountPlugin(editor, ImagePlugin)
    await mountPlugin(editor, VideoPlugin)

    const file = new File([], 'test.pdf', { type: 'application/pdf' })
    expect(editor.dispatchCommand(INSERT_MEDIA_COMMAND, { type: 'file', file })).toBe(false)
  })

  it('header: re-registers its insert command on every render (churn pinned; flipped to constant in Step 3)', async () => {
    editor = createTestEditor([HeaderNode])
    const { useLexicalComposerContext } = await import('@lexical/react/LexicalComposerContext')
    useLexicalComposerContext.mockReturnValue([editor])
    const registerSpy = vi.spyOn(editor, 'registerCommand')

    const headerRegistrations = () =>
      registerSpy.mock.calls.filter(([command]) => command === INSERT_HEADER_COMMAND).length

    const { rerender } = renderHook(() => HeaderPlugin())
    expect(headerRegistrations()).toBe(1)

    rerender()
    rerender()
    // HeaderPlugin's effect has no dependency array: one extra registration
    // per render. Every sibling registers once per mount.
    expect(headerRegistrations()).toBe(3)
  })
})
