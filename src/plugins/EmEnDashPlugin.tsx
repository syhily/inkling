import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getNodeByKey, $getSelection, $isRangeSelection, $isTextNode } from 'lexical'
import { useEffect, useRef } from 'react'

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
    // markdown shortcut - leave it alone so the HR transform can fire
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
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    // '---' as the sole content of a paragraph is the horizontal-rule markdown
    // shortcut - leave it alone so the HR transform can fire. Only relevant
    // when a horizontalrule node is actually registered.
    const supportsHrShortcut = [...editor._nodes.values()].some(({ klass }) => klass.getType() === 'horizontalrule')

    return editor.registerUpdateListener(({ dirtyLeaves, tags }) => {
      if (!mountedRef.current || editor.isComposing()) {
        return
      }

      // Skip historic/undo updates and our own replacement updates so we don't
      // re-trigger while undoing or replace immediately after a replacement.
      if (tags.has('historic') || tags.has('history-push') || tags.has('history-merge')) {
        return
      }

      if (!dirtyLeaves || dirtyLeaves.size === 0) {
        return
      }

      // Perform the replacement synchronously in a tagged update so it becomes a
      // separate history entry from the keystroke that triggered it. This keeps
      // undo able to restore the raw typed dashes.
      editor.update(() => $replaceDashes(dirtyLeaves, supportsHrShortcut), { tag: 'history-push' })
    })
  }, [editor])

  return null
}

export default EmEnDashPlugin
