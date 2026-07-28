import { type EditorState, type LexicalEditor, type NodeKey } from 'lexical'
import React from 'react'

import { CardActionToolbar } from '@/components/ui/CardActionToolbar'
import { CodeBlockCard } from '@/components/ui/cards/CodeBlockCard'
import { useCardIsEditing, useCardIsSelected } from '@/context/CardSelectionStoreContext'
import InklingUiPrefsContext from '@/context/InklingUiPrefsContext'
import { useCardWriter } from '@/hooks/useCardWriter'
import { useReselectOnEscape } from '@/hooks/useReselectOnEscape'
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
  const write = useCardWriter(nodeKey, $isCodeBlockNode)
  const { darkMode } = React.useContext(InklingUiPrefsContext)
  const isSelected = useCardIsSelected(nodeKey)
  const isEditing = useCardIsEditing(nodeKey)
  const exitEditMode = useReselectOnEscape(nodeKey)

  const updateCode = React.useCallback(
    (value: string) => {
      write((node) => {
        node.code = value
      })
    },
    [write],
  )

  const updateLanguage = React.useCallback(
    (value: string) => {
      write((node) => {
        node.language = value
      })
    },
    [write],
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
        onEscape={exitEditMode}
      />
      <CardActionToolbar editDataTestId="edit-code-block-card" nodeKey={nodeKey} />
    </>
  )
}
