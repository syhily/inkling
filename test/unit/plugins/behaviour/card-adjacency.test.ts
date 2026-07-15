import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  createEditor,
  type LexicalEditor,
  type LexicalNode,
} from 'lexical'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { $createImageNode, ImageNode } from '@/nodes/ImageNode'
import {
  $getLogicallyAdjacentCard,
  $getVisuallyAdjacentCard,
  $isCaretAtBlockTop,
  editorOwnsFocus,
  type CardAdjacencyGeometry,
} from '@/plugins/behaviour/card-adjacency'
import { $selectDecoratorNode } from '@/utils'

// Minimal node set: one card type is enough to exercise adjacency in jsdom.
const CARD_ADJACENCY_TEST_NODES = [ImageNode]

function createTestEditor(nodes: unknown[] = CARD_ADJACENCY_TEST_NODES) {
  return createEditor({
    namespace: 'test',
    nodes: nodes as [],
    onError: () => {},
  })
}

function updateEditor(editor: LexicalEditor, updateFn: () => void) {
  return new Promise<void>((resolve) => {
    editor.update(updateFn, { onUpdate: () => resolve() })
  })
}

/**
 * Fake geometry whose every member throws unless overridden, so a test fails
 * if the queries read geometry they should not need (e.g. caret rects on the
 * empty-paragraph shortcut path).
 */
function fakeGeometry(overrides: Partial<CardAdjacencyGeometry> = {}): CardAdjacencyGeometry {
  const unexpected = (name: string) => () => {
    throw new Error(`unexpected geometry read: ${name}`)
  }
  return {
    hasNativeSelection: unexpected('hasNativeSelection'),
    getCaretClientRects: unexpected('getCaretClientRects'),
    getTopLevelBlockRect: unexpected('getTopLevelBlockRect'),
    isCaretAtBlockTop: unexpected('isCaretAtBlockTop'),
    isCaretAtBlockEnd: unexpected('isCaretAtBlockEnd'),
    ...overrides,
  }
}

function fakeRect(top: number, bottom: number): DOMRect {
  return {
    bottom,
    height: bottom - top,
    left: 0,
    right: 0,
    top,
    width: 0,
    x: 0,
    y: top,
    toJSON: () => ({}),
  } as DOMRect
}

describe('card-adjacency', () => {
  let editor: LexicalEditor

  beforeEach(() => {
    editor = createTestEditor()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  /** [image] [paragraph("Some content")] with the caret in the text at `offset`. */
  async function buildCardThenParagraph(offset: number) {
    let cardKey = ''
    await updateEditor(editor, () => {
      const root = $getRoot()
      const image = $createImageNode({ src: '/image.png' })
      const paragraph = $createParagraphNode()
      const textNode = $createTextNode('Some content')
      paragraph.append(textNode)
      root.append(image)
      root.append(paragraph)
      cardKey = image.getKey()
      textNode.select(offset, offset)
    })
    return { cardKey }
  }

  /** [paragraph("Some content")] [image] with the caret in the text at `offset`. */
  async function buildParagraphThenCard(offset: number) {
    let cardKey = ''
    await updateEditor(editor, () => {
      const root = $getRoot()
      const paragraph = $createParagraphNode()
      const textNode = $createTextNode('Some content')
      paragraph.append(textNode)
      const image = $createImageNode({ src: '/image.png' })
      root.append(paragraph)
      root.append(image)
      cardKey = image.getKey()
      textNode.select(offset, offset)
    })
    return { cardKey }
  }

  /** [image] [empty paragraph] [image] with the caret in the paragraph. */
  async function buildEmptyParagraphBetweenCards() {
    let previousCardKey = ''
    let nextCardKey = ''
    await updateEditor(editor, () => {
      const root = $getRoot()
      const previousImage = $createImageNode({ src: '/previous.png' })
      const paragraph = $createParagraphNode()
      const nextImage = $createImageNode({ src: '/next.png' })
      root.append(previousImage)
      root.append(paragraph)
      root.append(nextImage)
      previousCardKey = previousImage.getKey()
      nextCardKey = nextImage.getKey()
      paragraph.selectStart()
    })
    return { previousCardKey, nextCardKey }
  }

  function read<T>(readFn: () => T): T {
    return editor.getEditorState().read(readFn)
  }

  describe("$getVisuallyAdjacentCard 'up'", () => {
    it('returns the previous card from the empty-paragraph shortcut without reading geometry', async () => {
      const { previousCardKey } = await buildEmptyParagraphBetweenCards()

      const card = read(() => $getVisuallyAdjacentCard('up', fakeGeometry()))
      expect(card?.getKey()).toBe(previousCardKey)
    })

    it('returns the previous card at offset 0 of a populated paragraph without reading geometry', async () => {
      const { cardKey } = await buildCardThenParagraph(0)

      const card = read(() => $getVisuallyAdjacentCard('up', fakeGeometry()))
      expect(card?.getKey()).toBe(cardKey)
    })

    it('returns the previous card when the caret is on the first visual line', async () => {
      const { cardKey } = await buildCardThenParagraph(5)
      const geometry = fakeGeometry({ isCaretAtBlockTop: () => true })

      const card = read(() => $getVisuallyAdjacentCard('up', geometry))
      expect(card?.getKey()).toBe(cardKey)
    })

    it('returns null when the caret is below the first visual line', async () => {
      await buildCardThenParagraph(5)
      const geometry = fakeGeometry({ isCaretAtBlockTop: () => false })

      const card = read(() => $getVisuallyAdjacentCard('up', geometry))
      expect(card).toBeNull()
    })

    it('returns null when the previous sibling is not a card', async () => {
      await updateEditor(editor, () => {
        const root = $getRoot()
        const first = $createParagraphNode()
        first.append($createTextNode('first'))
        const second = $createParagraphNode()
        const textNode = $createTextNode('second')
        second.append(textNode)
        root.append(first)
        root.append(second)
        textNode.select(0, 0)
      })

      const card = read(() => $getVisuallyAdjacentCard('up', fakeGeometry()))
      expect(card).toBeNull()
    })

    it('returns the previous card without a native selection (arrow up shortcuts run regardless)', async () => {
      const { previousCardKey } = await buildEmptyParagraphBetweenCards()
      const geometry = fakeGeometry({ hasNativeSelection: () => false })

      const card = read(() => $getVisuallyAdjacentCard('up', geometry))
      expect(card?.getKey()).toBe(previousCardKey)
    })

    it('uses the default DOM geometry when none is injected', async () => {
      const { previousCardKey } = await buildEmptyParagraphBetweenCards()

      const card = read(() => $getVisuallyAdjacentCard('up'))
      expect(card?.getKey()).toBe(previousCardKey)
    })
  })

  describe("$getVisuallyAdjacentCard 'down'", () => {
    it('returns the next card from the empty-paragraph shortcut without reading caret rects', async () => {
      const { nextCardKey } = await buildEmptyParagraphBetweenCards()
      const geometry = fakeGeometry({
        hasNativeSelection: () => true,
        isCaretAtBlockEnd: () => false,
      })

      const card = read(() => $getVisuallyAdjacentCard('down', geometry))
      expect(card?.getKey()).toBe(nextCardKey)
    })

    it('returns the next card when the native caret is at the end of its block element', async () => {
      const { cardKey } = await buildParagraphThenCard(5)
      const geometry = fakeGeometry({
        hasNativeSelection: () => true,
        isCaretAtBlockEnd: () => true,
      })

      const card = read(() => $getVisuallyAdjacentCard('down', geometry))
      expect(card?.getKey()).toBe(cardKey)
    })

    it('returns null without a native selection, even on an empty paragraph (arrow down ordering)', async () => {
      await buildEmptyParagraphBetweenCards()
      const geometry = fakeGeometry({ hasNativeSelection: () => false })

      const card = read(() => $getVisuallyAdjacentCard('down', geometry))
      expect(card).toBeNull()
    })

    it('returns the next card when the caret is on the last visual line', async () => {
      const { cardKey } = await buildParagraphThenCard(5)
      const geometry = fakeGeometry({
        hasNativeSelection: () => true,
        isCaretAtBlockEnd: () => false,
        getCaretClientRects: () => [fakeRect(90, 100)],
        getTopLevelBlockRect: () => fakeRect(0, 100),
      })

      const card = read(() => $getVisuallyAdjacentCard('down', geometry))
      expect(card?.getKey()).toBe(cardKey)
    })

    it('returns the next card when the caret is within the threshold of the last line', async () => {
      const { cardKey } = await buildParagraphThenCard(5)
      const geometry = fakeGeometry({
        hasNativeSelection: () => true,
        isCaretAtBlockEnd: () => false,
        getCaretClientRects: () => [fakeRect(81, 95)],
        getTopLevelBlockRect: () => fakeRect(0, 100),
      })

      const card = read(() => $getVisuallyAdjacentCard('down', geometry))
      expect(card?.getKey()).toBe(cardKey)
    })

    it('returns null when the caret is exactly the threshold distance from the last line (strict <)', async () => {
      await buildParagraphThenCard(5)
      const geometry = fakeGeometry({
        hasNativeSelection: () => true,
        isCaretAtBlockEnd: () => false,
        getCaretClientRects: () => [fakeRect(80, 90)],
        getTopLevelBlockRect: () => fakeRect(0, 100),
      })

      const card = read(() => $getVisuallyAdjacentCard('down', geometry))
      expect(card).toBeNull()
    })

    it('uses the second caret rect when the caret reports two rects', async () => {
      const { cardKey } = await buildParagraphThenCard(5)
      const geometry = fakeGeometry({
        hasNativeSelection: () => true,
        isCaretAtBlockEnd: () => false,
        getCaretClientRects: () => [fakeRect(0, 40), fakeRect(90, 100)],
        getTopLevelBlockRect: () => fakeRect(0, 100),
      })

      const card = read(() => $getVisuallyAdjacentCard('down', geometry))
      expect(card?.getKey()).toBe(cardKey)
    })

    it('ignores the first caret rect when the caret reports two rects', async () => {
      await buildParagraphThenCard(5)
      const geometry = fakeGeometry({
        hasNativeSelection: () => true,
        isCaretAtBlockEnd: () => false,
        getCaretClientRects: () => [fakeRect(90, 100), fakeRect(0, 40)],
        getTopLevelBlockRect: () => fakeRect(0, 100),
      })

      const card = read(() => $getVisuallyAdjacentCard('down', geometry))
      expect(card).toBeNull()
    })

    it('returns null when the caret has no client rects', async () => {
      await buildParagraphThenCard(5)
      const geometry = fakeGeometry({
        hasNativeSelection: () => true,
        isCaretAtBlockEnd: () => false,
        getCaretClientRects: () => [],
      })

      const card = read(() => $getVisuallyAdjacentCard('down', geometry))
      expect(card).toBeNull()
    })

    it('returns null when the block rect is unavailable', async () => {
      await buildParagraphThenCard(5)
      const geometry = fakeGeometry({
        hasNativeSelection: () => true,
        isCaretAtBlockEnd: () => false,
        getCaretClientRects: () => [fakeRect(90, 100)],
        getTopLevelBlockRect: () => null,
      })

      const card = read(() => $getVisuallyAdjacentCard('down', geometry))
      expect(card).toBeNull()
    })

    it('returns null when the next sibling is not a card', async () => {
      await updateEditor(editor, () => {
        const root = $getRoot()
        const first = $createParagraphNode()
        const textNode = $createTextNode('first')
        first.append(textNode)
        const second = $createParagraphNode()
        second.append($createTextNode('second'))
        root.append(first)
        root.append(second)
        textNode.select(2, 2)
      })

      const card = read(() => $getVisuallyAdjacentCard('down', fakeGeometry()))
      expect(card).toBeNull()
    })
  })

  describe('$getLogicallyAdjacentCard anchored on the selection', () => {
    it('returns the previous card when the anchor is at the start of its top-level element', async () => {
      const { cardKey } = await buildCardThenParagraph(0)

      const card = read(() => $getLogicallyAdjacentCard('previous'))
      expect(card?.getKey()).toBe(cardKey)
    })

    it('returns the previous card for an element anchor at offset 0', async () => {
      let cardKey = ''
      await updateEditor(editor, () => {
        const root = $getRoot()
        const image = $createImageNode({ src: '/image.png' })
        const paragraph = $createParagraphNode()
        paragraph.append($createTextNode('Some content'))
        root.append(image)
        root.append(paragraph)
        cardKey = image.getKey()
        paragraph.selectStart()
      })

      const card = read(() => $getLogicallyAdjacentCard('previous'))
      expect(card?.getKey()).toBe(cardKey)
    })

    it('returns null when the anchor is past the start of its top-level element', async () => {
      await buildCardThenParagraph(3)

      const card = read(() => $getLogicallyAdjacentCard('previous'))
      expect(card).toBeNull()
    })

    it('returns the next card when the anchor text ends its top-level element', async () => {
      const { cardKey } = await buildParagraphThenCard('Some content'.length)

      const card = read(() => $getLogicallyAdjacentCard('next'))
      expect(card?.getKey()).toBe(cardKey)
    })

    it('returns the next card for an element anchor at the end of its children', async () => {
      let cardKey = ''
      await updateEditor(editor, () => {
        const root = $getRoot()
        const paragraph = $createParagraphNode()
        paragraph.append($createTextNode('Some content'))
        const image = $createImageNode({ src: '/image.png' })
        root.append(paragraph)
        root.append(image)
        cardKey = image.getKey()
        paragraph.selectEnd()
      })

      const card = read(() => $getLogicallyAdjacentCard('next'))
      expect(card?.getKey()).toBe(cardKey)
    })

    it('returns null when the anchor is mid-element', async () => {
      await buildParagraphThenCard(5)

      const card = read(() => $getLogicallyAdjacentCard('next'))
      expect(card).toBeNull()
    })

    it('returns null when the anchor text node is not the last child of its parent', async () => {
      await updateEditor(editor, () => {
        const root = $getRoot()
        const paragraph = $createParagraphNode()
        const firstText = $createTextNode('first')
        paragraph.append(firstText)
        paragraph.append($createTextNode('second'))
        const image = $createImageNode({ src: '/image.png' })
        root.append(paragraph)
        root.append(image)
        firstText.select(5, 5)
      })

      const card = read(() => $getLogicallyAdjacentCard('next'))
      expect(card).toBeNull()
    })

    it('returns null for a node selection', async () => {
      await updateEditor(editor, () => {
        const root = $getRoot()
        const image = $createImageNode({ src: '/image.png' })
        const nextImage = $createImageNode({ src: '/next.png' })
        root.append(image)
        root.append(nextImage)
        root.append($createParagraphNode())
        $selectDecoratorNode(image)
      })

      const card = read(() => $getLogicallyAdjacentCard('next'))
      expect(card).toBeNull()
    })

    it('returns null when the selection is not collapsed', async () => {
      await updateEditor(editor, () => {
        const root = $getRoot()
        const paragraph = $createParagraphNode()
        const textNode = $createTextNode('Some content')
        paragraph.append(textNode)
        root.append(paragraph)
        root.append($createImageNode({ src: '/image.png' }))
        textNode.select(0, 5)
      })

      const card = read(() => $getLogicallyAdjacentCard('next'))
      expect(card).toBeNull()
    })

    it('returns null when the sibling in the direction is not a card', async () => {
      await updateEditor(editor, () => {
        const root = $getRoot()
        const first = $createParagraphNode()
        const textNode = $createTextNode('first')
        first.append(textNode)
        const second = $createParagraphNode()
        second.append($createTextNode('second'))
        root.append(first)
        root.append(second)
        textNode.select(5, 5)
      })

      const card = read(() => $getLogicallyAdjacentCard('next'))
      expect(card).toBeNull()
    })
  })

  describe('$getLogicallyAdjacentCard anchored on a given node', () => {
    it('returns the previous card sibling without selection offset gates', async () => {
      let cardKey = ''
      let paragraphNode: LexicalNode | null = null
      await updateEditor(editor, () => {
        const root = $getRoot()
        const image = $createImageNode({ src: '/image.png' })
        const paragraph = $createParagraphNode()
        const textNode = $createTextNode('Some content')
        paragraph.append(textNode)
        root.append(image)
        root.append(paragraph)
        cardKey = image.getKey()
        paragraphNode = paragraph
        // caret mid-text: the selection-anchored mode stays gated...
        textNode.select(5, 5)
      })

      expect(read(() => $getLogicallyAdjacentCard('previous'))).toBeNull()
      // ...while the same block passed explicitly is an ungated sibling lookup
      const card = read(() => $getLogicallyAdjacentCard('previous', paragraphNode!))
      expect(card?.getKey()).toBe(cardKey)
    })

    it('returns the next card sibling and null for a non-card sibling', async () => {
      let cardKey = ''
      let paragraphNode: LexicalNode | null = null
      let imageNode: LexicalNode | null = null
      await updateEditor(editor, () => {
        const root = $getRoot()
        const paragraph = $createParagraphNode()
        paragraph.append($createTextNode('Some content'))
        const image = $createImageNode({ src: '/image.png' })
        root.append(paragraph)
        root.append(image)
        cardKey = image.getKey()
        paragraphNode = paragraph
        imageNode = image
      })

      const card = read(() => $getLogicallyAdjacentCard('next', paragraphNode!))
      expect(card?.getKey()).toBe(cardKey)
      // the image's next sibling does not exist and its previous sibling is a paragraph
      expect(read(() => $getLogicallyAdjacentCard('next', imageNode!))).toBeNull()
      expect(read(() => $getLogicallyAdjacentCard('previous', imageNode!))).toBeNull()
    })
  })

  describe('$isCaretAtBlockTop', () => {
    it('returns the geometry verdict', () => {
      expect($isCaretAtBlockTop(fakeGeometry({ isCaretAtBlockTop: () => true }))).toBe(true)
      expect($isCaretAtBlockTop(fakeGeometry({ isCaretAtBlockTop: () => false }))).toBe(false)
    })
  })

  describe('editorOwnsFocus', () => {
    it('returns true when the editor root element is the active element', () => {
      const root = document.createElement('div')
      editor.setRootElement(root)
      vi.spyOn(document, 'activeElement', 'get').mockReturnValue(root)

      expect(editorOwnsFocus(editor)).toBe(true)
    })

    it('returns false when another element has focus', () => {
      const root = document.createElement('div')
      editor.setRootElement(root)
      vi.spyOn(document, 'activeElement', 'get').mockReturnValue(document.body)

      expect(editorOwnsFocus(editor)).toBe(false)
    })

    it('returns false when the editor has no root element', () => {
      expect(editorOwnsFocus(editor)).toBe(false)
    })
  })
})
