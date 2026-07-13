import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { LexicalNestedComposer } from '@lexical/react/LexicalNestedComposer'
import { render } from '@testing-library/react'
import { $createParagraphNode, $createTextNode, $getRoot, createEditor, $isTextNode } from 'lexical'
import React from 'react'
import { beforeEach, describe, expect, it } from 'vitest'

import CardContext from '@/context/CardContext'
import { TKContext } from '@/context/TKContext'
import { ExtendedTextNode, TKNode, extendedTextNodeReplacement } from '@/nodes/base'
import ReplacementStringsPlugin from '@/plugins/ReplacementStringsPlugin'

const NESTED_NODES = [ExtendedTextNode, extendedTextNodeReplacement, TKNode]

const cardContextValue = {
  isSelected: false,
  isEditing: false,
  captionHasFocus: null,
  cardWidth: 'regular',
  nodeKey: 'card-1',
  cardContainerRef: { current: null },
  setCardWidth: () => {},
  setCaptionHasFocus: () => {},
  setEditing: () => {},
}

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <LexicalComposer
      initialConfig={{
        namespace: 'test',
        nodes: NESTED_NODES as never,
        onError: () => {},
        theme: {},
      }}
    >
      <TKContext>
        <CardContext.Provider value={cardContextValue}>{children}</CardContext.Provider>
      </TKContext>
    </LexicalComposer>
  )
}

describe('ReplacementStringsPlugin in nested editors', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>'
  })

  it('formats {first_name} as code in a nested editor', async () => {
    const parentEditor = createEditor({
      namespace: 'parent',
      nodes: NESTED_NODES as never,
      onError: () => {},
    })

    const nestedEditor = createEditor({
      namespace: 'nested',
      nodes: NESTED_NODES as never,
      parentEditor,
      onError: () => {},
    })

    render(
      <TestWrapper>
        <LexicalNestedComposer initialEditor={nestedEditor}>
          <ReplacementStringsPlugin />
        </LexicalNestedComposer>
      </TestWrapper>,
    )

    // Wait for React effects to run so the transform is registered
    await new Promise((resolve) => {
      setTimeout(resolve, 0)
    })

    await new Promise<void>((resolve) => {
      nestedEditor.update(
        () => {
          const root = $getRoot()
          root.clear()
          const paragraph = $createParagraphNode()
          paragraph.append($createTextNode('Hello {first_name}!'))
          root.append(paragraph)
        },
        { onUpdate: () => resolve() },
      )
    })

    nestedEditor.getEditorState().read(() => {
      const root = $getRoot()
      const paragraph = root.getFirstChild()
      expect(paragraph).not.toBeNull()
      const nodes = paragraph!.getChildren()
      expect(nodes.length).toBeGreaterThanOrEqual(1)

      const codeNode = nodes.find((node) => $isTextNode(node) && node.hasFormat('code'))
      expect(codeNode).toBeDefined()
      expect(codeNode!.getTextContent()).toBe('{first_name}')
    })
  })
})
