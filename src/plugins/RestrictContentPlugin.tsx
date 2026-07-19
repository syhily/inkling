import { $isListItemNode, $isListNode } from '@lexical/list'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  mergeRegister,
  $createParagraphNode,
  $getSelection,
  $isDecoratorNode,
  $isElementNode,
  $isParagraphNode,
  $isRangeSelection,
  COMMAND_PRIORITY_HIGH,
  PASTE_COMMAND,
  RootNode,
} from 'lexical'
import React from 'react'

import { handlePlainTextPaste } from '@/plugins/behaviour/plainTextPaste'
import { isEditorUpdating } from '@/utils/lexical-internals'

export const RestrictContentPlugin = ({ paragraphs, allowBr }: { paragraphs: number; allowBr?: boolean }) => {
  const [editor] = useLexicalComposerContext()

  React.useEffect(() => {
    return mergeRegister(
      editor.registerNodeTransform(RootNode, (rootNode) => {
        // even if this node transform is registered on a nested editor it will
        // still be triggered for root node changes in other editors so we need
        // to make sure we're only operating on the root node for this editor
        if (!isEditorUpdating(editor)) {
          return
        }

        const selection = $getSelection()
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
          return
        }

        const incomingNodes = rootNode.getChildren()

        const incomingIsClean = incomingNodes.length <= paragraphs && incomingNodes.every($isParagraphNode)

        if (!incomingIsClean) {
          // strip out any decorator nodes as we can't convert them to paragraphs
          let cleanedNodes = incomingNodes.filter((node) => {
            return !$isDecoratorNode(node)
          })

          // truncate cleanedNodes to the specified number of paragraphs
          cleanedNodes = cleanedNodes.slice(0, paragraphs)

          // for any list nodes, convert first item of list to a paragraph
          // for other non-paragraph nodes, convert them to a paragraph
          cleanedNodes = cleanedNodes.map((node) => {
            if ($isListNode(node)) {
              const firstListItem = node.getFirstChild()
              if (!$isListItemNode(firstListItem)) {
                return $createParagraphNode()
              }
              return $createParagraphNode().append(...firstListItem.getChildren())
            } else if (!$isParagraphNode(node)) {
              // after the decorator filter the remaining root children are
              // element nodes (Lexical's root invariant) — narrow honestly
              // instead of casting on the strength of the invariant
              if (!$isElementNode(node)) {
                return $createParagraphNode()
              }
              return $createParagraphNode().append(...node.getChildren())
            } else {
              return node
            }
          })

          // remove all existing nodes from state
          incomingNodes.forEach((node) => node.remove())
          // add our new node to the now empty rootNode
          cleanedNodes.forEach((node) => rootNode.append(node))
          // move selection to end of new node
          rootNode.selectEnd()
        }
      }),
      editor.registerCommand(
        PASTE_COMMAND,
        (clipboardEvent) => {
          // PASTE_COMMAND's payload is ClipboardEvent | InputEvent |
          // KeyboardEvent (Lexical dispatches InputEvent from its beforeinput
          // paste path); only ClipboardEvent carries clipboardData
          if (!(clipboardEvent instanceof ClipboardEvent)) {
            return false
          }
          const clipboardData = clipboardEvent.clipboardData
          if (!clipboardData) {
            return false
          }

          return handlePlainTextPaste(editor, clipboardData, clipboardEvent, {
            allowBr: allowBr ?? false,
            skipCardShortcutGuard: true,
          })
        },
        // HIGH so the restriction preempts InklingBehaviourPlugin's general
        // LOW-priority paste handler regardless of mount order — same-priority
        // listeners run in registration order and the composable editor mounts
        // the behaviour plugin first, which would otherwise consume plain
        // text with allowBr: true and leak <br> into restricted editors. The
        // at-link paste guard (also HIGH) registers earlier still, so paste
        // inside at-link nodes keeps winning.
        COMMAND_PRIORITY_HIGH,
      ),
    )
  }, [allowBr, editor, paragraphs])
  return null
}

export default RestrictContentPlugin
