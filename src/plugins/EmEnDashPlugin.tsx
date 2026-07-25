import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getNodeByKey, $getSelection, $isRangeSelection, $isTextNode } from 'lexical'
import { useEffect } from 'react'

import { registerUpdateScan } from '@/plugins/behaviour/update-scan'
import { getRegisteredNodeMap } from '@/utils/lexical-internals'

const DASH = '-'
const EM_DASH = '—'
const EN_DASH = '–'

function $replaceDashes(dirtyLeaves: Set<string>, supportsHrShortcut: boolean) {
  const selection = $getSelection()
  const isCollapsedRange = $isRangeSelection(selection) && selection.isCollapsed()
  const anchorNode = isCollapsedRange ? selection.anchor.getNode() : null
  const originalAnchorOffset = isCollapsedRange ? selection.anchor.offset : null

  let totalOffsetAdjustment = 0

  dirtyLeaves.forEach((key) => {
    const node = $getNodeByKey(key)
    if (!$isTextNode(node)) {
      return
    }

    let text = node.getTextContent()

    // '---' as the sole content of a paragraph is the horizontal-rule
    // card shortcut - leave it alone so the seam's HR trigger can fire
    // (@/markdown/card-shortcuts)
    if (supportsHrShortcut && text === '---' && node.getParent()?.getTextContent() === '---') {
      return
    }

    let replaced = false
    let i = text.length

    while (i >= 3) {
      // em dash: three consecutive dashes, not preceded or followed by a dash
      if (
        text.slice(i - 3, i) === '---' &&
        (i - 4 < 0 || text[i - 4] !== DASH) &&
        (i === text.length || text[i] !== DASH)
      ) {
        if (isCollapsedRange && anchorNode === node && originalAnchorOffset !== null && originalAnchorOffset >= i) {
          totalOffsetAdjustment += 2
        }

        text = text.slice(0, i - 3) + EM_DASH + text.slice(i)
        node.setTextContent(text)
        replaced = true
        i -= 3
        continue
      }

      // en dash: non-dash char + '--' + whitespace ending at i
      if (
        i >= 3 &&
        text.slice(i - 3, i - 1) === '--' &&
        /^\s$/.test(text[i - 1]) &&
        i - 4 >= 0 &&
        text[i - 4] !== DASH
      ) {
        if (isCollapsedRange && anchorNode === node && originalAnchorOffset !== null && originalAnchorOffset >= i) {
          totalOffsetAdjustment += 1
        }

        text = text.slice(0, i - 3) + EN_DASH + text.slice(i - 1)
        node.setTextContent(text)
        replaced = true
        i -= 3
        continue
      }

      i -= 1
    }

    if (replaced && isCollapsedRange && anchorNode === node && originalAnchorOffset !== null) {
      const newOffset = originalAnchorOffset - totalOffsetAdjustment
      selection.anchor.offset = newOffset
      selection.focus.offset = newOffset
    }
  })
}

export const EmEnDashPlugin = () => {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    // '---' as the sole content of a paragraph is the horizontal-rule card
    // shortcut - leave it alone so the seam's HR trigger can fire
    // (@/markdown/card-shortcuts). Only relevant when a horizontalrule node
    // is actually registered.
    const supportsHrShortcut = [...getRegisteredNodeMap(editor).values()].some(
      ({ klass }) => klass.getType() === 'horizontalrule',
    )

    // Registration policy (history-tag / composing / empty-dirty skips,
    // nested scan commit) lives in the update-scan seam
    // (@/plugins/behaviour/update-scan). The 'history-push' tag keeps the
    // replacement a separate history entry from the keystroke that
    // triggered it, so undo restores the raw typed dashes.
    return registerUpdateScan(editor, {
      dirty: 'leaves',
      tag: 'history-push',
      scan: (dirtyLeaves) => $replaceDashes(dirtyLeaves, supportsHrShortcut),
    })
  }, [editor])

  return null
}

export default EmEnDashPlugin
