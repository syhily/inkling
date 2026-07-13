import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { $getRoot, $insertNodes } from 'lexical'
import React from 'react'

export const HtmlOutputPlugin = ({ html = '', setHtml }: { html?: string; setHtml?: (html: string) => void }) => {
  const [editor] = useLexicalComposerContext()
  const isFirstRender = React.useRef(true)

  const exportHtml = React.useCallback(() => {
    editor.update(() => {
      const htmlString = $generateHtmlFromNodes(editor, null)
      const rootText = editor.getEditorState().read(() => $getRoot().getTextContent())
      const hasContent = rootText.trim().length > 0
      setHtml?.(hasContent ? htmlString : '')
    })
  }, [editor, setHtml])

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

        const nodes = $generateNodesFromDOM(editor, dom)

        // There are few recent issues related to $generateNodesFromDOM
        // https://github.com/facebook/lexical/issues/2807
        // As a temporary fix, checking node content to remove additional spaces and br
        const filteredNodes = nodes.filter((n) => n.getTextContent().trim())

        // Select the root
        $getRoot().select()
        $getRoot().clear()

        // Insert them at a selection.
        $insertNodes(filteredNodes)
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
    exportHtml()
  }, [exportHtml])

  return <OnChangePlugin onChange={onChange} />
}

export default HtmlOutputPlugin
