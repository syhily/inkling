import { $toggleLink, LinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link'
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  $nodesOfType,
  COMMAND_PRIORITY_NORMAL,
  createEditor,
  type LexicalEditor,
} from 'lexical'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  $applyLinkToSelection,
  $getLinkHrefAtSelection,
  $selectLinkText,
  createToolbarSession,
} from '@/plugins/behaviour/link-editing'

function createTestEditor(): LexicalEditor {
  const editor = createEditor({ namespace: 'test', nodes: [LinkNode], onError: () => {} })
  // the production TOGGLE_LINK_COMMAND handler lives in LinkPlugin; the
  // headless editor registers the same $toggleLink behaviour directly
  editor.registerCommand(
    TOGGLE_LINK_COMMAND,
    (payload) => {
      $toggleLink(typeof payload === 'string' ? payload : null)
      return true
    },
    COMMAND_PRIORITY_NORMAL,
  )
  return editor
}

function update(editor: LexicalEditor, fn: () => void): Promise<void> {
  // Lexical defers the commit of non-discrete updates; await the commit so
  // the following read sees the new state
  return new Promise((resolve) => {
    editor.update(fn, { onUpdate: () => resolve() })
  })
}

function selectText(editor: LexicalEditor, text: string): Promise<void> {
  return update(editor, () => {
    const root = $getRoot()
    root.clear()
    const paragraph = $createParagraphNode()
    const textNode = $createTextNode(text)
    paragraph.append(textNode)
    root.append(paragraph)
    textNode.select(0, text.length)
  })
}

function linkSelection(editor: LexicalEditor, url: string): Promise<void> {
  return update(editor, () => {
    $applyLinkToSelection(editor, url)
  })
}

describe('$applyLinkToSelection', () => {
  let editor: LexicalEditor

  beforeEach(() => {
    editor = createTestEditor()
  })

  it('links the selected text and collapses the selection to the end of the focus node', async () => {
    await selectText(editor, 'hello')
    await linkSelection(editor, 'https://example.com')

    editor.getEditorState().read(() => {
      const links = $nodesOfType(LinkNode)
      expect(links).toHaveLength(1)
      expect(links[0].getURL()).toBe('https://example.com')
      expect(links[0].getTextContent()).toBe('hello')

      const selection = $getSelection()
      expect($isRangeSelection(selection)).toBe(true)
      if ($isRangeSelection(selection)) {
        expect(selection.isCollapsed()).toBe(true)
        expect(selection.anchor.offset).toBe(5)
      }
    })
  })

  it('removes the link when the url is empty', async () => {
    await selectText(editor, 'hello')
    await linkSelection(editor, 'https://example.com')

    // re-select the linked text and apply an empty url
    await update(editor, () => {
      const link = $nodesOfType(LinkNode)[0]
      const text = link.getFirstChild()
      if (!$isTextNode(text)) {
        throw new Error('expected link text')
      }
      text.select(0, 5)
      $applyLinkToSelection(editor, '')
    })

    editor.getEditorState().read(() => {
      expect($nodesOfType(LinkNode)).toHaveLength(0)
    })
  })
})

describe('$getLinkHrefAtSelection', () => {
  let editor: LexicalEditor

  beforeEach(async () => {
    editor = createTestEditor()
    await selectText(editor, 'hello')
    await linkSelection(editor, 'https://example.com')
  })

  it('returns the href when the selection is on a link', () => {
    editor.getEditorState().read(() => {
      expect($getLinkHrefAtSelection()).toBe('https://example.com')
    })
  })

  it('returns an empty string when the selection is not on a link', async () => {
    await update(editor, () => {
      const paragraph = $createParagraphNode()
      paragraph.append($createTextNode('plain'))
      $getRoot().append(paragraph)
      paragraph.select(1, 1)
    })

    editor.getEditorState().read(() => {
      expect($getLinkHrefAtSelection()).toBe('')
    })
  })
})

describe('$selectLinkText', () => {
  it('selects the link text from end to end', async () => {
    const editor = createTestEditor()
    await selectText(editor, 'hello')
    await linkSelection(editor, 'https://example.com')

    await update(editor, () => {
      const link = $nodesOfType(LinkNode)[0]
      expect($selectLinkText(link)).toBe(true)
    })

    editor.getEditorState().read(() => {
      const selection = $getSelection()
      expect($isRangeSelection(selection)).toBe(true)
      if ($isRangeSelection(selection)) {
        expect(selection.isCollapsed()).toBe(false)
        expect(selection.anchor.offset).toBe(0)
        expect(selection.focus.offset).toBe(5)
        expect(selection.getTextContent()).toBe('hello')
      }
    })
  })
})

describe('createToolbarSession', () => {
  it('starts hidden and shows the text toolbar for a text selection', () => {
    const session = createToolbarSession()
    expect(session.handle.getState()).toEqual({ type: 'hidden', href: '' })

    session.syncSelection({ textSelected: true, href: '' })
    expect(session.handle.getState()).toEqual({ type: 'text', href: '' })
  })

  it('notifies subscribers on transitions', () => {
    const session = createToolbarSession()
    const listener = vi.fn()
    session.handle.subscribe(listener)

    session.syncSelection({ textSelected: true, href: 'https://example.com' })
    expect(listener).toHaveBeenCalledWith({ type: 'text', href: 'https://example.com' })
  })

  it('hides the text toolbar when the selection is lost or collapses, keeping the href', () => {
    const session = createToolbarSession()
    session.syncSelection({ textSelected: true, href: 'https://example.com' })

    session.syncSelection({ textSelected: false, href: 'https://example.com' })
    expect(session.handle.getState()).toEqual({ type: 'hidden', href: 'https://example.com' })

    session.syncSelection({ textSelected: true, href: '' })
    session.syncSelection(null)
    expect(session.handle.getState().type).toBe('hidden')
  })

  it('ignores selection sync while a link toolbar is open', () => {
    const session = createToolbarSession()
    session.syncSelection({ textSelected: true, href: '' })
    session.openLink()

    session.syncSelection(null)
    session.syncSelection({ textSelected: false, href: 'https://example.com' })
    expect(session.handle.getState().type).toBe('link')
    expect(session.handle.getState().href).toBe('')
  })

  it('ignores selection sync while a snippet toolbar is open', () => {
    const session = createToolbarSession()
    session.openSnippet()
    session.syncSelection({ textSelected: true, href: '' })
    expect(session.handle.getState().type).toBe('snippet')
  })

  it('opens the link toolbar with an explicit href (edit-link) and closes back to hidden', () => {
    const session = createToolbarSession()
    session.openLink('https://example.com')
    expect(session.handle.getState()).toEqual({ type: 'link', href: 'https://example.com' })

    session.close()
    expect(session.handle.getState()).toEqual({ type: 'hidden', href: 'https://example.com' })
  })

  it('opens the link toolbar without touching the synced href (cmd-K)', () => {
    const session = createToolbarSession()
    session.syncSelection({ textSelected: true, href: 'https://example.com' })
    session.openLink()
    expect(session.handle.getState()).toEqual({ type: 'link', href: 'https://example.com' })
  })
})
