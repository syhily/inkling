import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  mergeRegister,
  $getNodeByKey,
  $getRoot,
  $isElementNode,
  $isRootNode,
  type LexicalEditor,
  type LexicalNode,
} from 'lexical'
import React from 'react'

import InklingComposerContext from '@/context/InklingComposerContext'
import { countWords, throttle } from '@/utils'
import { getTopLevelEditor, isNestedEditor } from '@/utils/lexical-internals'

interface WordCountState {
  nodeWordCounts: Map<string, number>
  lastWordCount: number
}

const editorWordCountStates = new WeakMap<LexicalEditor, WordCountState>()

function getWordCountState(topLevelEditor: LexicalEditor): WordCountState {
  let state = editorWordCountStates.get(topLevelEditor)
  if (!state) {
    state = { nodeWordCounts: new Map<string, number>(), lastWordCount: 0 }
    editorWordCountStates.set(topLevelEditor, state)
  }
  return state
}

function getNodeWordCount(node: LexicalNode): number {
  if ($isElementNode(node)) {
    let textContent = ''
    const children = node.getChildren()
    const childrenLength = children.length
    for (let i = 0; i < childrenLength; i++) {
      const child = children[i]
      textContent += child.getTextContent()
      if ($isElementNode(child) && i !== childrenLength - 1 && !child.isInline()) {
        textContent += '\n\n'
      }
    }
    return countWords(textContent)
  }

  return countWords(node.getTextContent())
}

function findRootChild(node: LexicalNode): LexicalNode | null {
  let current: LexicalNode | null = node
  while (current && !$isRootNode(current.getParent())) {
    current = current.getParent()
  }
  return current
}

// TODO: language is not currently used but in future we should switch to using
// Intl.Segmenter to get more accurate word counts for non-latin languages. For
// now we're using Inkling's existing countWords util which is regex based
export const WordCountPlugin = ({
  onChange,
  language = 'en',
}: { onChange?: (count: number) => void; language?: string } = {}) => {
  const [editor] = useLexicalComposerContext()
  const { onWordCountChangeRef } = React.useContext(InklingComposerContext)

  React.useLayoutEffect(() => {
    if (!onChange) {
      return
    }

    // store onChange in context so that we can use it in the InklingNestedComposer
    // to render nested <WordCountPlugin /> without needing to pass onChange down
    if (!isNestedEditor(editor)) {
      onWordCountChangeRef.current = onChange
    }

    let pendingDirtyKeys = new Set<string>()

    const emitCount = (count: number) => {
      const topLevelEditor = getTopLevelEditor(editor)
      const state = getWordCountState(topLevelEditor)
      if (count !== state.lastWordCount) {
        state.lastWordCount = count
        onChange(count)
      }
    }

    const countEditorWords = () => {
      const topLevelEditor = getTopLevelEditor(editor)
      const state = getWordCountState(topLevelEditor)

      topLevelEditor.getEditorState().read(() => {
        // NOTE: we can't use RootNode.getTextContent() here because it will
        // return cached text content when there are no dirty nodes which is
        // the case for changes in nested editors

        const rootNode = $getRoot()
        const children = rootNode.getChildren()
        let wordCount = 0

        state.nodeWordCounts.clear()
        for (const child of children) {
          const childCount = getNodeWordCount(child)
          state.nodeWordCounts.set(child.getKey(), childCount)
          wordCount += childCount
        }

        state.lastWordCount = wordCount
        onChange(wordCount)
      })
    }

    const flushIncrementalCount = () => {
      if (pendingDirtyKeys.size === 0) {
        return
      }

      const topLevelEditor = getTopLevelEditor(editor)
      const state = getWordCountState(topLevelEditor)
      const keysToRecompute = new Set<string>()

      topLevelEditor.getEditorState().read(() => {
        for (const key of pendingDirtyKeys) {
          const node = $getNodeByKey(key)
          if (!node) {
            continue
          }
          const rootChild = findRootChild(node)
          if (rootChild) {
            keysToRecompute.add(rootChild.getKey())
          }
        }
        pendingDirtyKeys.clear()

        const rootNode = $getRoot()
        const children = rootNode.getChildren()
        const currentKeys = new Set(children.map((child) => child.getKey()))

        let wordCount = state.lastWordCount

        for (const [key, count] of state.nodeWordCounts) {
          if (!currentKeys.has(key)) {
            wordCount -= count
            state.nodeWordCounts.delete(key)
          }
        }

        for (const child of children) {
          const key = child.getKey()
          if (keysToRecompute.has(key) || !state.nodeWordCounts.has(key)) {
            wordCount -= state.nodeWordCounts.get(key) ?? 0
            const childCount = getNodeWordCount(child)
            state.nodeWordCounts.set(key, childCount)
            wordCount += childCount
          }
        }

        emitCount(wordCount)
      })
    }

    const throttledCount = throttle(countEditorWords, 200)
    const throttledIncrementalCount = throttle(flushIncrementalCount, 200)

    countEditorWords()

    const cleanupRegister = mergeRegister(
      editor.registerUpdateListener(({ dirtyElements, dirtyLeaves, prevEditorState, tags }) => {
        if (
          (dirtyElements.size === 0 && dirtyLeaves.size === 0) ||
          tags.has('history-merge') ||
          prevEditorState.isEmpty()
        ) {
          return
        }

        // Nested editors don't receive top-level dirty maps, so fall back to a
        // full recompute. The shared node count cache keeps subsequent top-level
        // updates incremental.
        if (isNestedEditor(editor)) {
          pendingDirtyKeys.clear()
          throttledCount()
          return
        }

        for (const key of dirtyLeaves) {
          pendingDirtyKeys.add(key)
        }
        for (const key of dirtyElements.keys()) {
          pendingDirtyKeys.add(key)
        }

        throttledIncrementalCount()
      }),
    )

    return () => {
      throttledCount.cancel()
      throttledIncrementalCount.cancel()
      cleanupRegister()

      if (!isNestedEditor(editor)) {
        onWordCountChangeRef.current = null
      }
    }
  }, [editor, onChange, onWordCountChangeRef])
  return null
}

export default WordCountPlugin
