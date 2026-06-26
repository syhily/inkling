import type { EditorState } from 'lexical'

import { $getRoot } from 'lexical'

import type { InklingCard } from '@/nodes/base'

import { $isInklingCard } from '@/nodes/base'

export default function getDynamicDataNodes(editorState: EditorState): InklingCard[] {
  const dynamicNodes: InklingCard[] = []

  editorState.read(() => {
    const root = $getRoot()
    const nodes = root.getChildren()

    nodes.forEach((node) => {
      if ($isInklingCard(node) && node.hasDynamicData()) {
        dynamicNodes.push(node)
      }
    })
  })

  return dynamicNodes
}
