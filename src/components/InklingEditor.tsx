import '@/styles/index.css'
import React from 'react'

import InklingComposableEditor from '@/components/InklingComposableEditor'
import { SharedHistoryContext } from '@/context/SharedHistoryContext'
import { SharedOnChangeContext } from '@/context/SharedOnChangeContext'
import { AllDefaultPlugins } from '@/plugins/AllDefaultPlugins'

interface InklingEditorProps {
  onChange?: (editorState: unknown) => void
  children?: React.ReactNode
  [key: string]: unknown
}

const InklingEditor = ({ onChange, children, ...props }: InklingEditorProps) => {
  return (
    <SharedHistoryContext>
      <SharedOnChangeContext onChange={onChange}>
        <InklingComposableEditor {...props}>
          <AllDefaultPlugins />
          {children}
        </InklingComposableEditor>
      </SharedOnChangeContext>
    </SharedHistoryContext>
  )
}

export default InklingEditor
