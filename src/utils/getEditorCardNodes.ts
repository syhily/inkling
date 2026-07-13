import type { LexicalEditor, LexicalNode } from 'lexical'

import { getRegisteredNodeMap } from '@/utils/lexical-internals'

export function getEditorCardNodes(editor: LexicalEditor): [string, LexicalNode][] {
  const allNodes = getRegisteredNodeMap(editor)
  const cardNodes: [string, LexicalNode][] = []

  for (const [nodeType, { klass }] of allNodes) {
    if (!('cardMenu' in klass)) {
      continue
    }

    // the card klass (with its static cardMenu config) is passed where callers
    // type it as a LexicalNode — see buildCardMenu, which reads the static prop
    cardNodes.push([nodeType, klass as unknown as LexicalNode])
  }

  return cardNodes
}
