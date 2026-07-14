import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { mergeRegister, COMMAND_PRIORITY_LOW } from 'lexical'
import React from 'react'

import { $createHtmlNode, HtmlNode, type HtmlNodeDataset, INSERT_HTML_COMMAND } from '@/nodes/HtmlNode'
import { INSERT_CARD_COMMAND } from '@/plugins/InklingBehaviourPlugin'

// command payloads cross an untyped runtime boundary (menu dispatch, external
// consumers), so narrow before constructing the node
function isHtmlNodeDataset(value: unknown): value is HtmlNodeDataset {
  return typeof value === 'object' && value !== null
}

export const HtmlPlugin = () => {
  const [editor] = useLexicalComposerContext()

  React.useEffect(() => {
    if (!editor.hasNodes([HtmlNode])) {
      return
    }
    return mergeRegister(
      editor.registerCommand(
        INSERT_HTML_COMMAND,
        (dataset) => {
          if (!isHtmlNodeDataset(dataset)) {
            return false
          }
          const cardNode = $createHtmlNode(dataset)
          editor.dispatchCommand(INSERT_CARD_COMMAND, { cardNode, openInEditMode: true })

          return true
        },
        COMMAND_PRIORITY_LOW,
      ),
    )
  }, [editor])

  return null
}

export default HtmlPlugin
