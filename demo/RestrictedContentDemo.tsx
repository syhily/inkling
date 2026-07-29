import { ListItemNode, ListNode } from '@lexical/list'
import React, { useState } from 'react'
import { useLocation } from 'react-router-dom'

import {
  type CardConfig,
  type ExternalControlAPI,
  InklingComposableEditor,
  InklingComposer,
  MINIMAL_NODES,
  RestrictContentPlugin,
} from '@/core'

import { DemoChrome, useDemoSidebar } from './components/DemoChrome'
import { klipyConfig, tenorConfig } from './utils/gifConfig'
import { fileTypes, useFileUpload } from './utils/useFileUpload'
import { useFocusBelowCanvas } from './utils/useFocusBelowCanvas'
import { useSnippets } from './utils/useSnippets'

// The core entry requires the host to name its node set. MINIMAL_NODES alone
// would reject pasted list JSON, so the list pair joins explicitly.
const RESTRICTED_DEMO_NODES = [...MINIMAL_NODES, ListNode, ListItemNode]

const cardConfig: CardConfig = {
  tenor: tenorConfig ?? undefined,
  klipy: klipyConfig ?? undefined,
}

function useQuery() {
  const { search } = useLocation()

  return React.useMemo(() => new URLSearchParams(search), [search])
}

interface RestrictedContentDemoProps {
  paragraphs?: number
}

function RestrictedContentDemo({ paragraphs: propParagraphs }: RestrictedContentDemoProps) {
  const query = useQuery()
  const [editorAPI, setEditorAPI] = useState<ExternalControlAPI | null>(null)

  const handleRegisterAPI = React.useCallback((api: ExternalControlAPI | null) => {
    setEditorAPI(api)
  }, [])
  const containerRef = React.useRef<HTMLDivElement>(null)
  const paragraphs = propParagraphs ?? (Number(query.get('paragraphs')) || 1)
  const { snippets, createSnippet, deleteSnippet } = useSnippets()
  const sidebar = useDemoSidebar()
  // the focus-below-canvas choreography and the sidebar/chrome block live in
  // the shared demo chrome (DemoChrome + useFocusBelowCanvas)
  const { onClick } = useFocusBelowCanvas({ editorAPI, containerRef })

  return (
    <div className="inkling-lexical top">
      <InklingComposer
        nodes={RESTRICTED_DEMO_NODES}
        cardConfig={{ ...cardConfig, snippets, createSnippet, deleteSnippet }}
        fileUploader={{ useFileUpload: useFileUpload(), fileTypes }}
      >
        <div className="relative h-full grow">
          <div ref={containerRef} className="h-full overflow-auto" onClick={onClick}>
            <div className="mx-auto max-w-[740px] px-6 py-[15vmin] lg:px-0">
              <InklingComposableEditor registerAPI={handleRegisterAPI}>
                <RestrictContentPlugin paragraphs={paragraphs} />
              </InklingComposableEditor>
            </div>
          </div>
        </div>
        <DemoChrome sidebar={sidebar} />
      </InklingComposer>
    </div>
  )
}

export default RestrictedContentDemo
