import type { LexicalEditor } from 'lexical'

import { $insertFirst, mergeRegister } from '@lexical/utils'
import {
  $createTextNode,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_HIGH,
  CONTROLLED_TEXT_INSERTION_COMMAND,
  DELETE_CHARACTER_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  KEY_ESCAPE_COMMAND,
  PASTE_COMMAND,
} from 'lexical'

import {
  $createAtLinkNode,
  $createAtLinkSearchNode,
  $createZWNJNode,
  $isAtLinkNode,
  $isAtLinkSearchNode,
  $isZWNJNode,
  AtLinkNode,
} from '@/nodes/base'

// Headless half of the at-link plugin: node lifecycle (insertion, shape
// transform, command guards). The React half (search session + popup) lives
// in src/plugins/AtLinkPlugin.tsx and consumes these registrations.

export function $removeAtLink(node: AtLinkNode, { focus = false } = {}) {
  if (!$isAtLinkNode(node)) {
    return
  }

  const searchNode = node.getChildAtIndex(1)
  if (!$isAtLinkSearchNode(searchNode)) {
    return
  }

  const textNode = $createTextNode('@' + searchNode.getTextContent())
  textNode.setFormat(node.getLinkFormat() ?? 0)
  node.replace(textNode)

  if (focus) {
    textNode.selectEnd()
  }
}

export function $shouldConvertAtLink(): boolean {
  const selection = $getSelection()
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return false
  }

  const anchor = selection.anchor

  if (anchor.type === 'element') {
    const anchorNode = anchor.getNode()
    if (!$isElementNode(anchorNode)) {
      return false
    }
    const child = anchorNode.getChildAtIndex(anchor.offset)
    const prevChild = anchor.offset > 0 ? anchorNode.getChildAtIndex(anchor.offset - 1) : null

    let textBeforeAnchor = ''
    let textAfterAnchor = ''

    if ($isTextNode(prevChild)) {
      textBeforeAnchor = prevChild.getTextContent()
    }
    if ($isTextNode(child)) {
      textAfterAnchor = child.getTextContent()
    }

    return (textBeforeAnchor === '' || /\s$/.test(textBeforeAnchor)) && /^($|\s|\.)/.test(textAfterAnchor)
  }

  if (anchor.type !== 'text') {
    return false
  }

  const anchorNode = anchor.getNode()
  if (!anchorNode.isSimpleText()) {
    return false
  }

  const anchorOffset = anchor.offset
  let textBeforeAnchor = anchorNode.getTextContent().slice(0, anchorOffset)
  let textAfterAnchor = anchorNode.getTextContent().slice(anchorOffset)

  // adjust before/after text if we're immediately preceded/followed by a text node
  // because that content needs to be accounted for in our regex match
  const prevSibling = anchorNode.getPreviousSibling()
  const nextSibling = anchorNode.getNextSibling()

  if (anchorOffset === 0 && $isTextNode(prevSibling)) {
    textBeforeAnchor = prevSibling.getTextContent()
  }

  if (anchorOffset === anchorNode.getTextContent().length && $isTextNode(nextSibling)) {
    textAfterAnchor = nextSibling.getTextContent()
  }

  return (textBeforeAnchor === '' || /\s$/.test(textBeforeAnchor)) && /^($|\s|\.)/.test(textAfterAnchor)
}

export function $insertAtLink(): boolean {
  if (!$shouldConvertAtLink()) {
    return false
  }

  const selection = $getSelection()
  if (!$isRangeSelection(selection)) {
    return false
  }

  let linkFormat = 0
  const anchorNode = selection.anchor.getNode()
  if ($isTextNode(anchorNode)) {
    linkFormat = anchorNode.getFormat()
  }

  const atLinkNode = $createAtLinkNode()
  atLinkNode.setLinkFormat(linkFormat)
  atLinkNode.append($createZWNJNode())
  atLinkNode.append($createAtLinkSearchNode(''))

  const anchor = selection.anchor
  if (anchor.type === 'element' && $isElementNode(anchorNode)) {
    const targetChild = anchorNode.getChildAtIndex(anchor.offset)
    if (targetChild) {
      targetChild.insertBefore(atLinkNode)
    } else {
      anchorNode.append(atLinkNode)
    }
  } else {
    selection.insertNodes([atLinkNode])
  }

  atLinkNode.select(1, 1)

  const searchNode = atLinkNode.getChildAtIndex(1)
  const rangeSelection = $getSelection()
  if ($isAtLinkSearchNode(searchNode) && $isRangeSelection(rangeSelection)) {
    rangeSelection.anchor.set(searchNode.getKey(), 0, 'text')
    rangeSelection.focus.set(searchNode.getKey(), 0, 'text')
  }

  return true
}

// Native 'input' fallback for the rare case where Lexical lets the browser
// insert text without dispatching CONTROLLED_TEXT_INSERTION_COMMAND.
function registerNativeAtLinkInsertion(editor: LexicalEditor) {
  const rootElement = editor.getRootElement()
  if (!rootElement) {
    return () => {}
  }

  const handleAtInsert = (event: InputEvent) => {
    if (event.isComposing) {
      return
    }

    if (event.inputType === 'insertText' && event.data === '@') {
      let replaceAt = false

      editor.getEditorState().read(() => {
        // get the current selection
        const selection = $getSelection()
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
          return
        }

        const anchor = selection.anchor
        if (anchor.type !== 'text') {
          return
        }

        const anchorNode = anchor.getNode()
        if (!anchorNode.isSimpleText()) {
          return
        }

        const anchorOffset = anchor.offset
        let textBeforeAnchor = anchorNode.getTextContent().slice(0, anchorOffset)
        let textAfterAnchor = anchorNode.getTextContent().slice(anchorOffset)

        // adjust before/after text if we're immediately preceded/followed by a text node
        // because that content needs to be accounted for in our regex match
        const prevSibling = anchorNode.getPreviousSibling()
        const nextSibling = anchorNode.getNextSibling()

        if (anchorOffset === 0 && $isTextNode(prevSibling)) {
          textBeforeAnchor = prevSibling.getTextContent()
        }

        if (anchorOffset === anchorNode.getTextContent().length && $isTextNode(nextSibling)) {
          textAfterAnchor = nextSibling.getTextContent()
        }

        const textBeforeRegExp = /(^|\s)@$/
        const textAfterRegExp = /^($|\s|\.)/

        if (textBeforeRegExp.test(textBeforeAnchor) && textAfterRegExp.test(textAfterAnchor)) {
          replaceAt = true
        }
      })

      if (replaceAt) {
        editor.update(() => {
          // selection should now be where the '@' character was
          const selection = $getSelection()
          if (!$isRangeSelection(selection)) {
            return
          }

          // store current node's format so it can be re-applied to the eventual link node
          const anchorNode = selection.anchor.getNode()
          if (!$isTextNode(anchorNode)) {
            return
          }
          const linkFormat = anchorNode.getFormat()

          // delete the '@' character
          selection.deleteCharacter(true)

          // prep the at-link node
          const atLinkNode = $createAtLinkNode()
          atLinkNode.setLinkFormat(linkFormat)
          const zwnjNode = $createZWNJNode()
          atLinkNode.append(zwnjNode)
          const atLinkSearchNode = $createAtLinkSearchNode('')
          atLinkNode.append(atLinkSearchNode)

          // insert it
          selection.insertNodes([atLinkNode])

          // ensure we still have a cursor and it's inside the search node
          atLinkNode.select(1, 1)

          const searchNode = atLinkNode.getChildAtIndex(1)
          const rangeSelection = $getSelection()
          if ($isAtLinkSearchNode(searchNode) && $isRangeSelection(rangeSelection)) {
            rangeSelection.anchor.set(searchNode.getKey(), 0, 'text')
            rangeSelection.focus.set(searchNode.getKey(), 0, 'text')
          }
        })
      }
    }
  }

  rootElement.addEventListener('input', handleAtInsert as EventListener)

  return () => {
    rootElement.removeEventListener('input', handleAtInsert as EventListener)
  }
}

// Convert a typed '@' into an at-link node, via Lexical's controlled
// text-insertion command (so the conversion works regardless of whether the
// browser fires a native 'input' event) with the native listener as fallback.
export function registerAtLinkInsertion(editor: LexicalEditor) {
  return mergeRegister(
    editor.registerCommand(
      CONTROLLED_TEXT_INSERTION_COMMAND,
      (eventOrText) => {
        if (editor.isComposing()) {
          return false
        }

        const inputType = typeof eventOrText === 'string' ? 'insertText' : eventOrText.inputType
        const data = typeof eventOrText === 'string' ? eventOrText : eventOrText.data

        if (inputType !== 'insertText' || data !== '@') {
          return false
        }

        return $insertAtLink()
      },
      COMMAND_PRIORITY_HIGH,
    ),
    registerNativeAtLinkInsertion(editor),
  )
}

// Command guards to avoid certain actions happening whilst an
// at-link-search node is focused.
export function registerAtLinkGuards(editor: LexicalEditor) {
  function $skipFormatCommandIfNeeded() {
    const selection = $getSelection()
    if ($isRangeSelection(selection) && $isAtLinkSearchNode(selection.anchor.getNode())) {
      return true
    }
    return false
  }

  return mergeRegister(
    // revert to '@' when pressing escape with a focused at-link node
    editor.registerCommand(
      KEY_ESCAPE_COMMAND,
      () => {
        const selection = $getSelection()
        if ($isRangeSelection(selection)) {
          const anchorNode = selection.anchor.getNode()
          if ($isAtLinkNode(anchorNode)) {
            $removeAtLink(anchorNode, { focus: true })
            return true
          }
          if ($isAtLinkSearchNode(anchorNode) || ($isZWNJNode(anchorNode) && $isAtLinkNode(anchorNode.getParent()))) {
            $removeAtLink(anchorNode.getParent() as AtLinkNode, { focus: true })
            return true
          }
        }
        return false
      },
      COMMAND_PRIORITY_HIGH,
    ),
    // revert to '@' when backspacing or deleting chars at the beginning/end of an at-link node
    editor.registerCommand(
      DELETE_CHARACTER_COMMAND,
      (isBackward) => {
        const selection = $getSelection()
        if ($isRangeSelection(selection)) {
          const anchorNode = selection.anchor.getNode()
          if ($isAtLinkSearchNode(anchorNode) || ($isZWNJNode(anchorNode) && $isAtLinkNode(anchorNode.getParent()))) {
            const anchorOffset = selection.anchor.offset
            if (isBackward && anchorOffset === 0) {
              $removeAtLink(anchorNode.getParent() as AtLinkNode, { focus: true })
              return true
            }
            if (!isBackward && anchorOffset === anchorNode.getTextContentSize()) {
              $removeAtLink(anchorNode.getParent() as AtLinkNode, { focus: true })
              return true
            }
          }
        }
        return false
      },
      COMMAND_PRIORITY_HIGH,
    ),
    // prevent formatting commands when an at-link-search node is focused
    editor.registerCommand(FORMAT_TEXT_COMMAND, $skipFormatCommandIfNeeded, COMMAND_PRIORITY_HIGH),
    editor.registerCommand(FORMAT_ELEMENT_COMMAND, $skipFormatCommandIfNeeded, COMMAND_PRIORITY_HIGH),
    // prevent paste in the search node triggering external paste handlers
    editor.registerCommand(
      PASTE_COMMAND,
      (clipboardEvent) => {
        const selection = $getSelection()

        if (!$isRangeSelection(selection) || document.activeElement !== editor.getRootElement()) {
          return false
        }

        if (!(clipboardEvent instanceof ClipboardEvent)) {
          return false
        }

        const anchorNode = selection.anchor.getNode()
        if ($isAtLinkNode(anchorNode) || $isAtLinkSearchNode(anchorNode)) {
          clipboardEvent.preventDefault()

          const atLinkSearchNode = $isAtLinkSearchNode(anchorNode) ? anchorNode : anchorNode.getChildAtIndex(1)
          const text = clipboardEvent.clipboardData?.getData('text/plain')

          if (text && $isAtLinkSearchNode(atLinkSearchNode)) {
            atLinkSearchNode.setTextContent(atLinkSearchNode.getTextContent() + text)
            atLinkSearchNode.selectEnd()
          }

          return true
        }
        return false
      },
      COMMAND_PRIORITY_HIGH,
    ),
  )
}

// Transform to ensure at-link node trees are valid.
export function registerAtLinkNodeTransform(editor: LexicalEditor) {
  return editor.registerNodeTransform(AtLinkNode, (atLinkNode) => {
    // first child should always be a ZWNJ
    if (!$isZWNJNode(atLinkNode.getFirstChild())) {
      const zwnjNode = $createZWNJNode()
      $insertFirst(atLinkNode, zwnjNode)
    }

    // second child should be a search node
    if (!$isAtLinkSearchNode(atLinkNode.getChildAtIndex(1))) {
      const atLinkSearchNode = $createAtLinkSearchNode('')
      atLinkNode.append(atLinkSearchNode)
    }

    // we only want one search node, remove or replace any non-search nodes
    atLinkNode.getChildren().forEach((child, index) => {
      if (index > 0 && !$isAtLinkSearchNode(child)) {
        const text = child.getTextContent?.()

        if (!text) {
          child.remove()
        } else {
          const atLinkSearchNode = $createAtLinkSearchNode(text)
          child.replace(atLinkSearchNode)
        }
      }
    })

    // consolidate multiple search nodes from previous step into single node
    const searchNode = atLinkNode.getChildAtIndex(1)
    if (!$isAtLinkSearchNode(searchNode)) {
      return
    }
    const currentText = searchNode.getTextContent()
    let consolidatedText = currentText
    atLinkNode.getChildren().forEach((child, index) => {
      if (index > 1) {
        consolidatedText += child.getTextContent()
        child.remove()
      }
    })
    if (consolidatedText !== currentText) {
      searchNode.setTextContent(consolidatedText)
    }
  })
}
