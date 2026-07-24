import { $generateNodesFromSerializedNodes, $insertGeneratedNodes } from '@lexical/clipboard'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { mergeRegister, $createParagraphNode, $getSelection, COMMAND_PRIORITY_LOW } from 'lexical'
import React from 'react'

import { $isInklingCard } from '@/nodes/base'
import { INSERT_SNIPPET_COMMAND } from '@/nodes/cards/card-commands'
import { INSERT_CARD_COMMAND } from '@/plugins/InklingBehaviourPlugin'

// command payloads cross an untyped runtime boundary (menu dispatch, external
// consumers), so narrow before parsing the snippet value
function isSnippetDataset(dataset: unknown): dataset is { value: string } {
  return typeof dataset === 'object' && dataset !== null && 'value' in dataset && typeof dataset.value === 'string'
}

export const InklingSnippetPlugin = () => {
  const [editor] = useLexicalComposerContext()

  React.useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        INSERT_SNIPPET_COMMAND,
        (dataset) => {
          if (!isSnippetDataset(dataset)) {
            return false
          }
          editor.update(() => {
            const snippetData = JSON.parse(dataset.value)
            const nodes = $generateNodesFromSerializedNodes(snippetData.nodes)
            const firstNode = nodes.length === 1 && nodes[0]
            const lastNode = !!nodes.length && nodes[nodes.length - 1]

            if (firstNode && $isInklingCard(firstNode)) {
              editor.dispatchCommand(INSERT_CARD_COMMAND, { cardNode: firstNode })

              return true
            }

            const selection = $getSelection()
            if (!selection) {
              return
            }
            $insertGeneratedNodes(editor, nodes, selection)

            if (lastNode && $isInklingCard(lastNode) && !lastNode.getNextSibling()) {
              try {
                const paragraph = $createParagraphNode()
                lastNode.getTopLevelElementOrThrow().insertAfter(paragraph)
              } catch (_e) {
                // ignore insertion errors
              }
            }
          })
          return true
        },
        COMMAND_PRIORITY_LOW,
      ),
    )
  }, [editor])

  return null
}

export default InklingSnippetPlugin
