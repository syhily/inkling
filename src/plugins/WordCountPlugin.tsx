import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import React from 'react'

import { useWordCountHandle } from '@/context/WordCountHandleContext'
import { createWordCounter } from '@/plugins/behaviour/word-counter'
import { isNestedEditor } from '@/utils/lexical-internals'

// `language` selects the Intl.Segmenter word-granularity path in countWords
// (docs/kobato-fit-plan.md C7 §3.4); without Segmenter the counter falls back
// to the regex path. It is published on the composer handle alongside
// onChange so nested composers count with the same language.
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
      wordCountHandle.setState({ onChange, language })
    }

    const counter = createWordCounter({ editor, onChange, language })
    counter.attach()

    return () => {
      counter.detach()

      if (!isNestedEditor(editor)) {
        wordCountHandle.setState({ onChange: null, language: null })
      }
    }
  }, [editor, onChange, language, wordCountHandle])
  return null
}

export default WordCountPlugin
