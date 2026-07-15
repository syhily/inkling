import type { LexicalEditor } from 'lexical'

import type { CardMenuNodeClass } from '@/utils/inkling-node-class'

import { getCardNodeClass, hasCardMenu } from '@/utils/inkling-node-class'
import { getRegisteredNodeMap } from '@/utils/lexical-internals'

export function getEditorCardNodes(editor: LexicalEditor): [string, CardMenuNodeClass][] {
  const allNodes = getRegisteredNodeMap(editor)
  const cardNodes: [string, CardMenuNodeClass][] = []

  for (const [nodeType, { klass }] of allNodes) {
    const nodeClass = getCardNodeClass(klass)
    if (!hasCardMenu(nodeClass)) {
      continue
    }

    cardNodes.push([nodeType, nodeClass])
  }

  return cardNodes
}
