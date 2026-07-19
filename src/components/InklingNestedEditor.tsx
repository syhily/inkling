import InklingComposableEditor from '@/components/InklingComposableEditor'
import InklingNestedComposer from '@/components/InklingNestedComposer'
import { BASIC_TRANSFORMERS, MINIMAL_TRANSFORMERS } from '@/markdown/transformers'
import BASIC_NODES from '@/nodes/BasicNodes'
import MINIMAL_NODES from '@/nodes/MinimalNodes'
import { EmojiPickerPlugin } from '@/plugins/EmojiPickerPlugin'
import InklingNestedEditorPlugin, { type FocusNextTarget } from '@/plugins/InklingNestedEditorPlugin'
import RestrictContentPlugin from '@/plugins/RestrictContentPlugin'

const Placeholder = ({ text = 'Type here', className = '' }) => {
  // Note: we use line-clamp-1, instead of truncate because truncate adds 'white-space: nowrap', which often breaks overflows of parents in some cards
  return (
    <div className={`placeholder not-inkling-prose pointer-events-none h-0 cursor-text overflow-visible`}>
      <div className={`line-clamp-1 translate-y-[-100%] xs:overflow-visible ${className}`}>{text}</div>
    </div>
  )
}

import type { InitialEditorStateType } from '@lexical/react/LexicalComposer'
import type { EditorThemeClasses, LexicalEditor } from 'lexical'

import React from 'react'

interface InklingNestedEditorProps {
  initialEditor: LexicalEditor
  initialEditorState?: InitialEditorStateType
  initialTheme?: EditorThemeClasses
  nodes?: 'basic' | 'minimal'
  placeholderText?: string
  textClassName?: string
  placeholderClassName?: string
  autoFocus?: boolean
  focusNext?: FocusNextTarget | null
  singleParagraph?: boolean
  hasSettingsPanel?: boolean
  defaultInklingEnterBehaviour?: boolean
  hiddenFormats?: string[]
  useDefaultClasses?: boolean
  dataTestId?: string
  children?: React.ReactNode
}

const InklingNestedEditor = ({
  initialEditor,
  initialEditorState,
  initialTheme,
  nodes = 'basic',
  placeholderText = '',
  textClassName = '',
  placeholderClassName = '',
  autoFocus = false,
  focusNext = null,
  singleParagraph = false,
  hasSettingsPanel = false,
  defaultInklingEnterBehaviour = false,
  hiddenFormats = [],
  useDefaultClasses = true,
  dataTestId,
  children,
}: InklingNestedEditorProps) => {
  const initialNodes = nodes === 'minimal' ? MINIMAL_NODES : BASIC_NODES
  const markdownTransformers = nodes === 'minimal' ? MINIMAL_TRANSFORMERS : BASIC_TRANSFORMERS

  return (
    <InklingNestedComposer
      initialEditor={initialEditor}
      initialEditorState={initialEditorState}
      initialNodes={initialNodes}
      initialTheme={initialTheme}
    >
      <InklingComposableEditor
        className={textClassName}
        dataTestId={dataTestId}
        hiddenFormats={hiddenFormats}
        inheritStyles={true}
        isDragEnabled={false}
        markdownTransformers={markdownTransformers}
        placeholder={<Placeholder className={placeholderClassName} text={placeholderText} />}
        useDefaultClasses={useDefaultClasses}
      >
        {singleParagraph && <RestrictContentPlugin paragraphs={1} />}

        {children}

        <InklingNestedEditorPlugin
          autoFocus={autoFocus}
          defaultInklingEnterBehaviour={defaultInklingEnterBehaviour}
          focusNext={focusNext}
          hasSettingsPanel={hasSettingsPanel}
        />

        <EmojiPickerPlugin />
      </InklingComposableEditor>
    </InklingNestedComposer>
  )
}

export default InklingNestedEditor
