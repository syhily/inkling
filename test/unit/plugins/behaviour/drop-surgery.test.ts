import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isNodeSelection,
  createEditor,
  type LexicalEditor,
  type NodeKey,
} from 'lexical'
import { beforeEach, describe, expect, it } from 'vitest'

import { $createImageNode, $isImageNode, ImageNode } from '@/nodes/ImageNode'
import {
  $insertDraggedImage,
  $relocateCard,
  $removeDropSource,
  shouldRemoveDropSource,
} from '@/plugins/behaviour/drop-surgery'

// One card type is enough to exercise the surgeries in jsdom (the same
// approach as the card-adjacency and snippet-insertion tests).
const TEST_NODES = [ImageNode]

function createTestEditor(): LexicalEditor {
  return createEditor({ namespace: 'test', nodes: TEST_NODES, onError: () => {} })
}

/** An editor with a reconciled root element, so $getNearestNodeFromDOMNode / getElementByKey work in jsdom. */
function createDomLinkedEditor(): { editor: LexicalEditor; rootElement: HTMLDivElement } {
  const editor = createTestEditor()
  const rootElement = document.createElement('div')
  document.body.appendChild(rootElement)
  editor.setRootElement(rootElement)
  return { editor, rootElement }
}

function updateEditor(editor: LexicalEditor, updateFn: () => void): Promise<void> {
  return new Promise((resolve) => {
    editor.update(updateFn, { onUpdate: () => resolve() })
  })
}

interface DocumentKeys {
  introKey: NodeKey
  imageAKey: NodeKey
  outroKey: NodeKey
  imageBKey: NodeKey
}

/** [paragraph("intro")] [imageA] [paragraph("outro")] [imageB], with the caret inside "intro". */
async function buildDocument(editor: LexicalEditor): Promise<DocumentKeys> {
  const keys = {} as DocumentKeys
  await updateEditor(editor, () => {
    const root = $getRoot()
    root.clear()
    const intro = $createParagraphNode()
    const introText = $createTextNode('intro')
    intro.append(introText)
    const imageA = $createImageNode({ src: '/a.png' })
    const outro = $createParagraphNode()
    outro.append($createTextNode('outro'))
    const imageB = $createImageNode({ src: '/b.png' })
    root.append(intro, imageA, outro, imageB)
    keys.introKey = intro.getKey()
    keys.imageAKey = imageA.getKey()
    keys.outroKey = outro.getKey()
    keys.imageBKey = imageB.getKey()
    introText.select(1, 3)
  })
  return keys
}

/** Droppable elements in document order — what the reorder geometry's live scan would return. */
function getDroppables(editor: LexicalEditor, keys: NodeKey[]): HTMLElement[] {
  return keys.map((key) => {
    const element = editor.getElementByKey(key)
    if (!element) {
      throw new Error(`expected a reconciled element for ${key}`)
    }
    return element
  })
}

function readTopLevelKeys(editor: LexicalEditor): NodeKey[] {
  return editor.getEditorState().read(() =>
    $getRoot()
      .getChildren()
      .map((node) => node.getKey()),
  )
}

describe('$relocateCard', () => {
  let editor: LexicalEditor
  let rootElement: HTMLDivElement

  beforeEach(() => {
    const domEditor = createDomLinkedEditor()
    editor = domEditor.editor
    rootElement = domEditor.rootElement
    return () => {
      rootElement.remove()
    }
  })

  it('moves the dragged card before the droppable at insertIndex and clears the selection', async () => {
    const keys = await buildDocument(editor)
    const droppables = getDroppables(editor, [keys.introKey, keys.imageAKey, keys.outroKey, keys.imageBKey])

    let relocated = false
    await updateEditor(editor, () => {
      relocated = $relocateCard(keys.imageBKey, droppables, 0)
    })

    expect(relocated).toBe(true)
    expect(readTopLevelKeys(editor)).toEqual([keys.imageBKey, keys.introKey, keys.imageAKey, keys.outroKey])
    editor.getEditorState().read(() => {
      expect($getSelection()).toBeNull()
    })
  })

  it('moves the dragged card after the last droppable when insertIndex runs past the end of the document', async () => {
    const keys = await buildDocument(editor)
    const droppables = getDroppables(editor, [keys.introKey, keys.imageAKey, keys.outroKey, keys.imageBKey])

    let relocated = false
    await updateEditor(editor, () => {
      relocated = $relocateCard(keys.imageAKey, droppables, droppables.length)
    })

    expect(relocated).toBe(true)
    expect(readTopLevelKeys(editor)).toEqual([keys.introKey, keys.outroKey, keys.imageBKey, keys.imageAKey])
  })

  it('returns false and leaves the tree untouched when the node key does not resolve', async () => {
    const keys = await buildDocument(editor)
    const droppables = getDroppables(editor, [keys.introKey, keys.imageAKey, keys.outroKey, keys.imageBKey])
    const before = readTopLevelKeys(editor)

    let relocated = true
    let relocatedWithoutKey = true
    await updateEditor(editor, () => {
      relocated = $relocateCard('missing-key', droppables, 0)
      relocatedWithoutKey = $relocateCard(undefined, droppables, 0)
    })

    expect(relocated).toBe(false)
    expect(relocatedWithoutKey).toBe(false)
    expect(readTopLevelKeys(editor)).toEqual(before)
  })

  it('still reports handled and clears the selection when the target droppable does not resolve to a node', async () => {
    const keys = await buildDocument(editor)
    // an element the reconciler never produced maps to no node — the
    // relocation is a no-op but the drop still counts as handled
    const droppables = [document.createElement('div')]
    const before = readTopLevelKeys(editor)

    let relocated = false
    await updateEditor(editor, () => {
      relocated = $relocateCard(keys.imageAKey, droppables, 0)
    })

    expect(relocated).toBe(true)
    expect(readTopLevelKeys(editor)).toEqual(before)
    editor.getEditorState().read(() => {
      expect($getSelection()).toBeNull()
    })
  })
})

describe('$insertDraggedImage', () => {
  let editor: LexicalEditor
  let rootElement: HTMLDivElement

  beforeEach(() => {
    const domEditor = createDomLinkedEditor()
    editor = domEditor.editor
    rootElement = domEditor.rootElement
    return () => {
      rootElement.remove()
    }
  })

  it('inserts a new image card before the droppable at insertIndex and selects it', async () => {
    const keys = await buildDocument(editor)
    const droppables = getDroppables(editor, [keys.introKey, keys.imageAKey, keys.outroKey, keys.imageBKey])

    let createdKey: NodeKey | undefined
    await updateEditor(editor, () => {
      const created = $insertDraggedImage({ src: '/dragged.png', alt: 'dragged' }, droppables, 2)
      expect(created).not.toBeNull()
      expect($isImageNode(created)).toBe(true)
      expect(created?.getLatest().src).toBe('/dragged.png')
      expect(created?.getLatest().alt).toBe('dragged')
      createdKey = created?.getKey()
    })

    expect(readTopLevelKeys(editor)).toEqual([keys.introKey, keys.imageAKey, createdKey, keys.outroKey, keys.imageBKey])
    editor.getEditorState().read(() => {
      const selection = $getSelection()
      expect($isNodeSelection(selection)).toBe(true)
      if ($isNodeSelection(selection)) {
        expect(selection.getNodes().map((node) => node.getKey())).toEqual([createdKey])
      }
    })
  })

  it('returns null and leaves the tree untouched when the slot does not resolve to a node', async () => {
    const keys = await buildDocument(editor)
    const before = readTopLevelKeys(editor)

    let created: unknown = null
    await updateEditor(editor, () => {
      created = $insertDraggedImage({ src: '/dragged.png' }, [], 0)
    })

    expect(created).toBeNull()
    expect(readTopLevelKeys(editor)).toEqual(before)
    expect(readTopLevelKeys(editor)).toContain(keys.imageAKey)
  })
})

describe('shouldRemoveDropSource', () => {
  it('removes the source only after a successful card drop handled elsewhere', () => {
    // cross-card drop: the target container handled the drop, the source remains
    expect(shouldRemoveDropSource('card', true, false)).toBe(true)
    // same-container reorder reports sourceHandled — the card stays
    expect(shouldRemoveDropSource('card', true, true)).toBe(false)
    // a failed drop removes nothing
    expect(shouldRemoveDropSource('card', false, false)).toBe(false)
    // images are inserted as new nodes; their source is not this plugin's to remove
    expect(shouldRemoveDropSource('image', true, false)).toBe(false)
    expect(shouldRemoveDropSource(undefined, true, false)).toBe(false)
  })
})

describe('$removeDropSource', () => {
  let editor: LexicalEditor
  let rootElement: HTMLDivElement

  beforeEach(() => {
    const domEditor = createDomLinkedEditor()
    editor = domEditor.editor
    rootElement = domEditor.rootElement
    return () => {
      rootElement.remove()
    }
  })

  it('removes the dragged card from the tree', async () => {
    const keys = await buildDocument(editor)

    let removed = false
    await updateEditor(editor, () => {
      removed = $removeDropSource(keys.imageAKey)
    })

    expect(removed).toBe(true)
    expect(readTopLevelKeys(editor)).toEqual([keys.introKey, keys.outroKey, keys.imageBKey])
  })

  it('returns false when the node key does not resolve', async () => {
    const keys = await buildDocument(editor)
    const before = readTopLevelKeys(editor)

    let removed = true
    let removedWithoutKey = true
    await updateEditor(editor, () => {
      removed = $removeDropSource('missing-key')
      removedWithoutKey = $removeDropSource(undefined)
    })

    expect(removed).toBe(false)
    expect(removedWithoutKey).toBe(false)
    expect(readTopLevelKeys(editor)).toEqual(before)
    expect(readTopLevelKeys(editor)).toContain(keys.imageAKey)
  })
})
