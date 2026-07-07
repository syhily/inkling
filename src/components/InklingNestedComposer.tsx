import { useCollaborationContext } from '@lexical/react/LexicalCollaborationContext'
import { CollaborationPlugin } from '@lexical/react/LexicalCollaborationPlugin'
import { LexicalNestedComposer } from '@lexical/react/LexicalNestedComposer'
import React from 'react'

import InklingComposerContext from '@/context/InklingComposerContext'
import ReplacementStringsPlugin from '@/plugins/ReplacementStringsPlugin'
import TKPlugin from '@/plugins/TKPlugin'
import WordCountPlugin from '@/plugins/WordCountPlugin'

interface InklingNestedComposerProps {
  initialEditor: import('lexical').LexicalEditor
  // oxlint-disable-next-line typescript/no-explicit-any
  initialEditorState?: any
  // oxlint-disable-next-line typescript/no-explicit-any
  initialNodes?: ReadonlyArray<any>
  // oxlint-disable-next-line typescript/no-explicit-any
  initialTheme?: any
  skipCollabChecks?: true
  children?: React.ReactNode
}

const InklingNestedComposer = ({
  initialEditor,
  initialEditorState,
  initialNodes,
  initialTheme,
  skipCollabChecks,
  children,
}: InklingNestedComposerProps) => {
  const { isCollabActive } = useCollaborationContext()
  const { createWebsocketProvider, onWordCountChangeRef } = React.useContext(InklingComposerContext)

  return (
    <LexicalNestedComposer
      initialEditor={initialEditor}
      initialNodes={initialNodes}
      initialTheme={initialTheme}
      skipCollabChecks={skipCollabChecks}
    >
      {isCollabActive ? (
        <CollaborationPlugin
          id={initialEditor.getKey()}
          initialEditorState={initialEditorState}
          // oxlint-disable-next-line typescript/no-explicit-any
          providerFactory={createWebsocketProvider as any}
          shouldBootstrap={true}
        />
      ) : null}
      {onWordCountChangeRef?.current ? (
        <WordCountPlugin onChange={onWordCountChangeRef.current as (count: number) => void} />
      ) : null}
      <TKPlugin />
      <ReplacementStringsPlugin />
      {children}
    </LexicalNestedComposer>
  )
}

export default InklingNestedComposer
