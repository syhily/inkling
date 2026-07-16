import '@/styles/index.css'
import React from 'react'

import type { InklingComposableEditorProps } from '@/components/InklingComposableEditor'

import InklingComposableEditor from '@/components/InklingComposableEditor'
import { SharedEditorStateContext } from '@/context/SharedEditorStateContext'
import { AllDefaultPlugins } from '@/plugins/AllDefaultPlugins'

export type InklingEditorProps = InklingComposableEditorProps

const InklingEditor = ({ onChange, children, ...props }: InklingEditorProps) => {
  return (
    <SharedEditorStateContext onChange={onChange}>
      <InklingComposableEditor {...props}>
        <AllDefaultPlugins />
        {children}
      </InklingComposableEditor>
    </SharedEditorStateContext>
  )
}

export default InklingEditor
