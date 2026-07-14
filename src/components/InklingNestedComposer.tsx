import type { InitialEditorStateType } from '@lexical/react/LexicalComposer'

import { useCollaborationContext } from '@lexical/react/LexicalCollaborationContext'
import { CollaborationPlugin } from '@lexical/react/LexicalCollaborationPlugin'
import { LexicalNestedComposer, type LexicalNestedComposerProps } from '@lexical/react/LexicalNestedComposer'
import React from 'react'

import InklingComposerContext from '@/context/InklingComposerContext'
import ReplacementStringsPlugin from '@/plugins/ReplacementStringsPlugin'
import TKPlugin from '@/plugins/TKPlugin'
import WordCountPlugin from '@/plugins/WordCountPlugin'

// mirrors LexicalNestedComposer; initialEditorState is only used to bootstrap
// the collaboration plugin when collab is active
export interface InklingNestedComposerProps extends Pick<
  LexicalNestedComposerProps,
  'initialEditor' | 'initialNodes' | 'initialTheme' | 'skipCollabChecks' | 'skipEditableListener' | 'children'
> {
  initialEditorState?: InitialEditorStateType
}

const InklingNestedComposer = ({
  initialEditor,
  initialEditorState,
  initialNodes,
  initialTheme,
  skipCollabChecks,
  skipEditableListener,
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
      skipEditableListener={skipEditableListener}
    >
      {isCollabActive ? (
        <CollaborationPlugin
          id={initialEditor.getKey()}
          initialEditorState={initialEditorState}
          providerFactory={createWebsocketProvider}
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
