import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import React from 'react'

import { useWordCountHandle } from '@/context/WordCountHandleContext'
import { createWordCounter } from '@/plugins/behaviour/word-counter'
import { isNestedEditor } from '@/utils/lexical-internals'

// TODO: language is not currently used but in future we should switch to using
// Intl.Segmenter to get more accurate word counts for non-latin languages. For
// now we're using Inkling's existing countWords util which is regex based
export const WordCountPlugin = ({
  onChange,
  language = 'en',
}: { onChange?: (count: number) => void; language?: string } = {}) => {
  const [editor] = useLexicalComposerContext()
  const wordCountHandle = useWordCountHandle()

  React.useLayoutEffect(() => {
    if (!onChange) {
      return
    }

    // publish onChange on the composer handle so that InklingNestedComposer
    // can mount a nested <WordCountPlugin /> with it reactively, without
    // needing to pass onChange down
    if (!isNestedEditor(editor)) {
      wordCountHandle.setState({ onChange })
    }

    const counter = createWordCounter({ editor, onChange })
    counter.attach()

    return () => {
      counter.detach()

      if (!isNestedEditor(editor)) {
        wordCountHandle.setState({ onChange: null })
      }
    }
  }, [editor, onChange, wordCountHandle])
  return null
}

export default WordCountPlugin
