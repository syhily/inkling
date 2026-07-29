import React, { useState } from 'react'

import {
  type CardConfig,
  type ExternalControlAPI,
  HtmlOutputPlugin,
  InklingComposableEditor,
  InklingComposer,
} from '@/'

import { DemoChrome, useDemoSidebar } from './components/DemoChrome'
import { klipyConfig, tenorConfig } from './utils/gifConfig'
import { fileTypes, useFileUpload } from './utils/useFileUpload'
import { useFocusBelowCanvas } from './utils/useFocusBelowCanvas'
import { useSnippets } from './utils/useSnippets'

const cardConfig: CardConfig = {
  tenor: tenorConfig ?? undefined,
  klipy: klipyConfig ?? undefined,
}

function HtmlOutputDemo() {
  const [html, setHtml] = useState(
    '<p><span>check</span> <a href="https://inkling.local/changelog/markdown/" dir="ltr"><span data-lexical-text="true">inkling.local/changelog/markdown/</span></a></p>',
  )
  const [editorAPI, setEditorAPI] = useState<ExternalControlAPI | null>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const { snippets, createSnippet, deleteSnippet } = useSnippets()
  const sidebar = useDemoSidebar()
  // the focus-below-canvas choreography and the sidebar/chrome block live in
  // the shared demo chrome (DemoChrome + useFocusBelowCanvas)
  const { onClick } = useFocusBelowCanvas({ editorAPI, containerRef })

  const handleRegisterAPI = React.useCallback((api: ExternalControlAPI | null) => {
    setEditorAPI(api)
  }, [])

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
            <div ref={containerRef} className="h-full overflow-auto" onClick={onClick}>
              <div className="mx-auto max-w-[740px] px-6 py-[15vmin] lg:px-0">
                <InklingComposableEditor registerAPI={handleRegisterAPI}>
                  <HtmlOutputPlugin html={html} setHtml={setHtml} />
                </InklingComposableEditor>
              </div>
            </div>
          </div>
          <DemoChrome sidebar={sidebar} />
        </InklingComposer>
      </div>
    </>
  )
}

export default HtmlOutputDemo
