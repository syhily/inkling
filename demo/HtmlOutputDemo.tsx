import type { MouseEvent as ReactMouseEvent } from 'react'

import { $getRoot, $isDecoratorNode } from 'lexical'
import React, { useState } from 'react'

import {
  type CardConfig,
  type ExternalControlAPI,
  HtmlOutputPlugin,
  InklingComposableEditor,
  InklingComposer,
} from '@/'

import FloatingButton from './components/FloatingButton'
import Sidebar from './components/Sidebar'
import Watermark from './components/Watermark'
import { klipyConfig, tenorConfig } from './utils/gifConfig'
import { fileTypes, useFileUpload } from './utils/useFileUpload'
import { useSnippets } from './utils/useSnippets'

const cardConfig: CardConfig = {
  tenor: tenorConfig ?? undefined,
  klipy: klipyConfig ?? undefined,
}

function HtmlOutputDemo() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [html, setHtml] = useState(
    '<p><span>check</span> <a href="https://inkling.local/changelog/markdown/" dir="ltr"><span data-lexical-text="true">inkling.local/changelog/markdown/</span></a></p>',
  )
  const [sidebarView, setSidebarView] = useState<'json' | 'tree'>('json')
  const [editorAPI, setEditorAPI] = useState<ExternalControlAPI | null>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const { snippets, createSnippet, deleteSnippet } = useSnippets()

  const handleRegisterAPI = React.useCallback((api: ExternalControlAPI | null) => {
    setEditorAPI(api)
  }, [])

  function openSidebar(view: 'json' | 'tree' = 'json') {
    if (isSidebarOpen && sidebarView === view) {
      return setIsSidebarOpen(false)
    }
    setSidebarView(view)
    setIsSidebarOpen(true)
  }

  function focusEditor(event: ReactMouseEvent<HTMLDivElement>) {
    if (!(event.target instanceof Element)) {
      return
    }
    const target = event.target
    const clickedOnDecorator =
      target.closest('[data-lexical-decorator]') !== null || target.hasAttribute('data-lexical-decorator')
    const clickedOnSlashMenu =
      target.closest('[data-inkling-slash-menu]') !== null || target.hasAttribute('data-inkling-slash-menu')

    if (editorAPI && !clickedOnDecorator && !clickedOnSlashMenu) {
      const rootElement = editorAPI.editorInstance.getRootElement()

      // if a mousedown and subsequent mouseup occurs below the editor
      // canvas, focus the editor and put the cursor at the end of the document
      if (
        rootElement &&
        event.pageY > rootElement.getBoundingClientRect().bottom &&
        event.clientY > rootElement.getBoundingClientRect().bottom
      ) {
        event.preventDefault()

        // we should always have a visible cursor when focusing
        // at the bottom so create an empty paragraph if last
        // section is a card
        let addLastParagraph = false

        editorAPI.editorInstance.getEditorState().read(() => {
          const nodes = $getRoot().getChildren()
          const lastNode = nodes[nodes.length - 1]

          if (lastNode && $isDecoratorNode(lastNode)) {
            addLastParagraph = true
          }
        })

        if (addLastParagraph) {
          editorAPI.insertParagraphAtBottom()
        }

        // Focus the editor
        editorAPI.focusEditor({ position: 'bottom' })

        // scroll to the bottom of the container
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight
        }
      }
    }
  }

  return (
    <>
      <div data-testid="html-output" hidden>
        {html}
      </div>
      <div className="inkling-lexical top">
        <InklingComposer
          cardConfig={{ ...cardConfig, snippets, createSnippet, deleteSnippet }}
          fileUploader={{ useFileUpload: useFileUpload(), fileTypes }}
        >
          <div className="relative h-full grow">
            <div ref={containerRef} className="h-full overflow-auto" onClick={focusEditor}>
              <div className="mx-auto max-w-[740px] px-6 py-[15vmin] lg:px-0">
                <InklingComposableEditor registerAPI={handleRegisterAPI}>
                  <HtmlOutputPlugin html={html} setHtml={setHtml} />
                </InklingComposableEditor>
              </div>
            </div>
          </div>
          <Watermark />
          <div className="absolute z-20 flex h-full flex-col items-end sm:relative">
            <Sidebar isOpen={isSidebarOpen} view={sidebarView} />
            <FloatingButton isOpen={isSidebarOpen} onClick={openSidebar} />
          </div>
        </InklingComposer>
      </div>
    </>
  )
}

export default HtmlOutputDemo
