import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { $getRoot } from 'lexical'
import React from 'react'

import { $insertHtmlDocument } from '@/html/html-to-lexical/insert-html'
import $convertToHtmlString from '@/html/renderer/convert-to-html-string'
import { debounce } from '@/utils/timing'

export const HtmlOutputPlugin = ({
  html = '',
  setHtml,
  debounceMs = 0,
}: {
  html?: string
  setHtml?: (html: string) => void
  debounceMs?: number
}) => {
  const [editor] = useLexicalComposerContext()
  const isFirstRender = React.useRef(true)

  const exportHtml = React.useCallback(() => {
    editor.read(() => {
      // One serializer for both export paths: the live export runs the same
      // $convertToHtmlString + element transformers the headless
      // LexicalHTMLRenderer runs, here against the mounted editor. With no
      // options bag the render context falls back to the browser's document,
      // and cards receive the same exportDOM dispatch as the headless path.
      // Byte-level identity with the headless output is pinned by
      // test/unit/plugins/HtmlOutputPlugin.export-parity.test.ts.
      const htmlString = $convertToHtmlString(editor)
      const rootText = $getRoot().getTextContent()
      const hasContent = rootText.trim().length > 0
      setHtml?.(hasContent ? htmlString : '')
    })
  }, [editor, setHtml])

  // trailing-edge debounce from the timing module (cancel on unmount),
  // not a hand-rolled timer ref
  const debouncedExportHtml = React.useMemo(() => debounce(exportHtml, debounceMs), [exportHtml, debounceMs])

  React.useEffect(() => {
    return () => {
      debouncedExportHtml.cancel()
    }
  }, [debouncedExportHtml])

  React.useLayoutEffect(() => {
    if (!isFirstRender.current) {
      return
    }

    isFirstRender.current = false

    if (!html) {
      return
    }

    // discrete so the state is committed before we export it below
    editor.update(
      () => {
        const parser = new DOMParser()
        const dom = parser.parseFromString(html, 'text/html')

        // The same import surgery the headless htmlToLexical importer runs —
        // @lexical/clipboard's normalization covers the old #2807 filter.
        $insertHtmlDocument(editor, dom)
      },
      { discrete: true },
    )

    // OnChangePlugin skips updates whose previous state is empty, so the
    // initial parse above never triggers an export - do it explicitly
    exportHtml()
    // We only do this for init
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onChange = React.useCallback(() => {
    if (debounceMs > 0) {
      debouncedExportHtml()
      return
    }
    exportHtml()
  }, [debounceMs, debouncedExportHtml, exportHtml])

  return <OnChangePlugin onChange={onChange} />
}

export default HtmlOutputPlugin
