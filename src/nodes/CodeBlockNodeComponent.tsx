import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { type EditorState, type LexicalEditor, type NodeKey } from 'lexical'
import React from 'react'

import { CardActionToolbar } from '@/components/ui/CardActionToolbar'
import { CodeBlockCard } from '@/components/ui/cards/CodeBlockCard'
import CardContext from '@/context/CardContext'
import InklingUiPrefsContext from '@/context/InklingUiPrefsContext'
import { $updateCardNode } from '@/nodes/base'
import { $isCodeBlockNode } from '@/nodes/CodeBlockNode'

export interface CodeBlockNodeComponentProps {
  nodeKey: NodeKey
  code?: string
  language?: string
  captionEditor?: LexicalEditor | null
  captionEditorInitialState?: EditorState | undefined
}

export function CodeBlockNodeComponent({
  nodeKey,
  code,
  language,
  captionEditor,
  captionEditorInitialState,
}: CodeBlockNodeComponentProps) {
  const [editor] = useLexicalComposerContext()
  const { darkMode } = React.useContext(InklingUiPrefsContext)
  const { isEditing, isSelected } = React.useContext(CardContext)

  const updateCode = React.useCallback(
    (value: string) => {
      editor.update(() => {
        $updateCardNode(nodeKey, $isCodeBlockNode, (node) => {
          node.code = value
        })
      })
    },
    [editor, nodeKey],
  )

  const updateLanguage = React.useCallback(
    (value: string) => {
      editor.update(() => {
        $updateCardNode(nodeKey, $isCodeBlockNode, (node) => {
          node.language = value
        })
      })
    },
    [editor, nodeKey],
  )

  return (
    <>
      <CodeBlockCard
        captionEditor={captionEditor ?? null}
        captionEditorInitialState={captionEditorInitialState}
        code={code}
        darkMode={darkMode}
        isEditing={isEditing}
        isSelected={isSelected}
        language={language}
        updateCode={updateCode}
        updateLanguage={updateLanguage}
      />
      <CardActionToolbar
        card="code-block"
        items={[{ kind: 'edit', dataTestId: 'edit-code-block-card' }, { kind: 'separator' }, { kind: 'snippet' }]}
        nodeKey={nodeKey}
      />
    </>
  )
}
