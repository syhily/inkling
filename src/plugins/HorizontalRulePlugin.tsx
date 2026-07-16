import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getSelection, $isParagraphNode, $isRangeSelection, COMMAND_PRIORITY_EDITOR } from 'lexical'
import { useEffect } from 'react'

import { $insertHorizontalRuleForUpdateScanTrigger, DIVIDER_REGEXP } from '@/markdown/card-shortcuts'
import {
  $createHorizontalRuleNode,
  HorizontalRuleNode,
  INSERT_HORIZONTAL_RULE_COMMAND,
} from '@/nodes/HorizontalRuleNode'
import { getSelectedNode } from '@/utils/getSelectedNode'

export const HorizontalRulePlugin = () => {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    if (!editor.hasNodes([HorizontalRuleNode])) {
      return
    }
    return editor.registerCommand(
      INSERT_HORIZONTAL_RULE_COMMAND,
      () => {
        const selection = $getSelection()

        if (!$isRangeSelection(selection)) {
          return false
        }

        const focusNode = selection.focus.getNode()

        if (focusNode !== null) {
          const horizontalRuleNode = $createHorizontalRuleNode()

          // insert a paragraph unless we're already on a blank paragraph
          const selectedNode = selection.focus.getNode()
          if ($isParagraphNode(selectedNode) && selectedNode.getTextContent() !== '') {
            selection.insertParagraph()
          }

          // insert the horizontal rule before the current/inserted paragraph
          // so the cursor stays on the blank paragraph
          selection.focus.getNode().getTopLevelElementOrThrow().insertBefore(horizontalRuleNode)
        }

        return true
      },
      COMMAND_PRIORITY_EDITOR,
    )
  }, [editor])

  // divider card shortcut — per-update scan trigger only; the regex and
  // replace-and-select live in the card-shortcut seam (@/markdown/card-shortcuts)
  useEffect(() => {
    if (!editor.hasNodes([HorizontalRuleNode])) {
      return
    }
    return editor.registerUpdateListener(() => {
      editor.update(() => {
        // don't do anything when using IME input
        if (editor.isComposing()) {
          return
        }

        const selection = $getSelection()
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
          return
        }

        const node = getSelectedNode(selection).getTopLevelElement()
        if (!node || !$isParagraphNode(node) || !node.getTextContent().match(DIVIDER_REGEXP)) {
          return
        }

        const nativeSelection = window.getSelection()
        if (!nativeSelection) {
          return
        }
        const anchorNode = nativeSelection.anchorNode
        const rootElement = editor.getRootElement()

        if (anchorNode?.nodeType !== Node.TEXT_NODE || !rootElement?.contains(anchorNode)) {
          return
        }

        $insertHorizontalRuleForUpdateScanTrigger(node)
      })
    })
  }, [editor])

  return null
}

export default HorizontalRulePlugin
