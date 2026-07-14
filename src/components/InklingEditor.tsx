import '@/styles/index.css'
import type { SerializedEditorState } from 'lexical'

import React from 'react'

import type { InklingComposableEditorProps } from '@/components/InklingComposableEditor'

import InklingComposableEditor from '@/components/InklingComposableEditor'
import { SharedHistoryContext } from '@/context/SharedHistoryContext'
import { SharedOnChangeContext } from '@/context/SharedOnChangeContext'
import { AllDefaultPlugins } from '@/plugins/AllDefaultPlugins'

export interface InklingEditorProps extends InklingComposableEditorProps {
  onChange?: (editorState: SerializedEditorState) => void
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
